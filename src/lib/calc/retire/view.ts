/**
 * The retirement calculator's charts and table as HTML strings, built from numbers only (no user text), so the
 * page renders the same markup on the server (first paint, no layout shift) and in the browser after each change.
 */
import type { PlanResult, YearRow } from './types';

/** Money formatting for one currency (the Irish page uses the euro default below). */
export interface Fmt { money: (v: number) => string; short: (v: number) => string }
export function fmtFor(locale: string, currency: string, sym: string): Fmt {
  const nf = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 });
  return {
    money: (v: number) => nf.format(Math.round(v) || 0),
    short: (v: number) => (Math.abs(v) >= 1e6 ? `${sym}${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}m` : Math.abs(v) >= 1000 ? `${sym}${Math.round(v / 1000)}k` : `${sym}${Math.round(v)}`),
  };
}
const EUR = fmtFor('en-IE', 'EUR', '€');
export const money = EUR.money;

/** How each retirement year's spending is paid for, after tax, in today's money (or nominal). */
export interface Paid { age: number; sp: number; sp2: number; ben: number; uk: number; db: number; pay: number; arf: number; savings: number; gap: number; spending: number; left: number }

export function paidFor(r: YearRow, today: boolean): Paid {
  const k = today ? 1 / r.deflator : 1;
  const tax = r.incomeTax + r.usc + r.prsi;
  const pay = Math.max(0, r.salary - r.contributions);
  const arf = r.arfMin + r.arfExtra;
  const sp2 = r.statePension2 ?? 0, ben = r.benefit ?? 0;
  const taxable = pay + r.db + arf + r.statePension + r.ukPension + sp2 + ben;
  const share = (x: number) => (taxable > 0 ? x - (tax * x) / taxable : 0);
  return {
    age: r.age1, sp: share(r.statePension) * k, sp2: share(sp2) * k, ben: share(ben) * k, uk: share(r.ukPension) * k, db: share(r.db) * k, pay: share(pay) * k, arf: share(arf) * k,
    savings: r.fromSavings * k, gap: r.shortfall * k, spending: r.spending * k, left: (r.savingsEnd + r.arfEnd + r.potEnd) * k,
  };
}

export const SERIES = [
  { key: 'sp', label: 'State Pension' },
  { key: 'uk', label: 'UK State Pension' },
  { key: 'db', label: 'Work (DB) pension' },
  { key: 'pay', label: 'Pay (still working)' },
  { key: 'arf', label: 'ARF drawdown' },
  { key: 'savings', label: 'Savings' },
  { key: 'gap', label: 'Not covered' },
] as const;
export type Series = readonly { key: 'sp' | 'sp2' | 'ben' | 'uk' | 'db' | 'pay' | 'arf' | 'savings' | 'gap'; label: string }[];

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => x * p >= v)!;
  return m * p;
}

/** Stacked bars (sources after tax) with the spending target as a line, one bar per year of retirement. */
export function incomeChart(rows: YearRow[], today: boolean, series: Series = SERIES, F: Fmt = EUR): string {
  const { money, short } = F;
  const data = rows.filter((r) => r.retired).map((r) => paidFor(r, today));
  if (!data.length) return '';
  const W = 720, H = 300, L = 52, R = 10, T = 14, B = 30;
  const pw = W - L - R, ph = H - T - B;
  const top = niceMax(Math.max(...data.map((d) => Math.max(d.spending, d.sp + d.sp2 + d.ben + d.uk + d.db + d.pay + d.arf + d.savings + d.gap))) * 1.05);
  const y = (v: number) => T + ph - (v / top) * ph;
  const step = pw / data.length;
  const bw = Math.max(2, step * 0.72);
  let out = `<svg viewBox="0 0 ${W} ${H}" class="rc-svg" preserveAspectRatio="none" aria-hidden="true">`;
  for (let i = 0; i <= 4; i++) {
    const v = (top * i) / 4;
    out += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="rc-grid"/><text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" class="rc-tick" text-anchor="end">${short(v)}</text>`;
  }
  data.forEach((d, i) => {
    const x = L + i * step + (step - bw) / 2;
    let base = 0;
    let tip = `Age ${d.age}: spending ${money(d.spending)}`;
    for (const s of series) {
      const v = d[s.key];
      if (v <= 0.5) continue;
      out += `<rect x="${x.toFixed(1)}" y="${y(base + v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(base) - y(base + v)).toFixed(1)}" class="rc-${s.key}"/>`;
      base += v;
      tip += `; ${s.label} ${money(v)}`;
    }
    out += `<rect x="${(L + i * step).toFixed(1)}" y="${T}" width="${step.toFixed(1)}" height="${ph}" class="rc-hit"><title>${tip}</title></rect>`;
    if (d.age % 5 === 0 || i === 0) out += `<text x="${(L + i * step + step / 2).toFixed(1)}" y="${H - 10}" class="rc-tick" text-anchor="middle">${d.age}</text>`;
  });
  const pts = data.flatMap((d, i) => [`${(L + i * step).toFixed(1)},${y(d.spending).toFixed(1)}`, `${(L + (i + 1) * step).toFixed(1)},${y(d.spending).toFixed(1)}`]);
  out += `<polyline points="${pts.join(' ')}" class="rc-line"/></svg>`;
  return out;
}

/** Money left (savings + ARF + pots not yet drawn) at the end of each year, from now to the end age. */
export function wealthChart(rows: YearRow[], today: boolean, retireAge: number, F: Fmt = EUR): string {
  const { short } = F;
  const data = rows.map((r) => ({ age: r.age1, v: (r.savingsEnd + r.arfEnd + r.potEnd) / (today ? r.deflator : 1) }));
  const W = 720, H = 180, L = 52, R = 10, T = 12, B = 28;
  const pw = W - L - R, ph = H - T - B;
  const top = niceMax(Math.max(1, ...data.map((d) => d.v)) * 1.05);
  const x = (i: number) => L + (data.length === 1 ? 0 : (i / (data.length - 1)) * pw);
  const y = (v: number) => T + ph - (Math.max(0, v) / top) * ph;
  let out = `<svg viewBox="0 0 ${W} ${H}" class="rc-svg" preserveAspectRatio="none" aria-hidden="true">`;
  for (let i = 0; i <= 2; i++) {
    const v = (top * i) / 2;
    out += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="rc-grid"/><text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" class="rc-tick" text-anchor="end">${short(v)}</text>`;
  }
  const line = data.map((d, i) => `${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(' ');
  out += `<polygon points="${x(0).toFixed(1)},${y(0).toFixed(1)} ${line} ${x(data.length - 1).toFixed(1)},${y(0).toFixed(1)}" class="rc-area"/><polyline points="${line}" class="rc-wline"/>`;
  const ri = data.findIndex((d) => d.age === retireAge);
  if (ri >= 0) out += `<line x1="${x(ri).toFixed(1)}" x2="${x(ri).toFixed(1)}" y1="${T}" y2="${T + ph}" class="rc-mark"/><text x="${(x(ri) + 4).toFixed(1)}" y="${T + 10}" class="rc-tick">retire</text>`;
  data.forEach((d, i) => { if (d.age % 5 === 0) out += `<text x="${x(i).toFixed(1)}" y="${H - 8}" class="rc-tick" text-anchor="middle">${d.age}</text>`; });
  return out + '</svg>';
}

/** Year-by-year table rows (tbody inner HTML). */
export function tableRows(rows: YearRow[], today: boolean, couple: boolean): string {
  return rows.map((r) => {
    const k = today ? 1 / r.deflator : 1;
    const m = (v: number) => money(v * k);
    const tax = r.incomeTax + r.usc + r.prsi;
    const cls = r.shortfall > 1 ? ' class="rc-short"' : !r.retired ? ' class="rc-work"' : '';
    return `<tr${cls}><th scope="row">${r.age1}${couple && r.age2 != null ? ` / ${r.age2}` : ''}<span class="rc-yr">${r.year}</span></th>` +
      `<td>${m(r.salary)}</td><td>${m(r.db)}</td><td>${m(r.statePension)}</td><td>${m(r.ukPension)}</td><td>${m(r.arfMin + r.arfExtra)}</td>` +
      `<td>${m(tax)}</td><td>${m(r.netIncome)}</td><td>${r.retired ? m(r.spending) : '–'}</td><td>${m(r.fromSavings)}</td>` +
      `<td>${r.shortfall > 1 ? m(r.shortfall) : '–'}</td><td>${m(r.savingsEnd)}</td><td>${m(r.arfEnd + r.potEnd)}</td></tr>`;
  }).join('');
}

/** The headline answer. */
export function headline(res: PlanResult, endAge: number, retireAge: number) {
  if (res.runOutAge == null) return { lead: 'Your money lasts', big: `past ${endAge}`, ok: true };
  if (res.runOutAge <= retireAge) return { lead: 'Your money falls short', big: `from ${retireAge}`, ok: false };
  return { lead: 'Your money lasts to', big: `${res.runOutAge - 1}`, ok: false };
}

/** Year-by-year rows for any country: one cell per column getter (nominal amounts; today's money divides by the deflator). */
export function tableRowsBy(rows: YearRow[], today: boolean, couple: boolean, cols: readonly ((r: YearRow) => number | null)[], F: Fmt): string {
  return rows.map((r) => {
    const k = today ? 1 / r.deflator : 1;
    const cls = r.shortfall > 1 ? ' class="rc-short"' : !r.retired ? ' class="rc-work"' : '';
    const cells = cols.map((get) => { const v = get(r); return `<td>${v == null ? '–' : F.money(v * k)}</td>`; }).join('');
    return `<tr${cls}><th scope="row">${r.age1}${couple && r.age2 != null ? ` / ${r.age2}` : ''}<span class="rc-yr">${r.year}</span></th>${cells}</tr>`;
  }).join('');
}
