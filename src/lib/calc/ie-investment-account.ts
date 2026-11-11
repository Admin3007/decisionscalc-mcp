/**
 * Irish Individual Investment Account (IIA) vs an ETF vs direct shares vs a pension: what is left after tax.
 *
 * IIA rules: Finance (No. 2) Bill 2026 AS PUBLISHED ON 19 OCTOBER 2026 (Bill 98 of 2026, section 26 inserting Part 27A,
 * ss. 747H-747AA, into the TCA 1997; read 10 Nov 2026 at
 * https://data.oireachtas.ie/ie/oireachtas/bill/2026/98/eng/initiated/b9826d.pdf). NOT YET LAW: Dáil Committee Stage
 * 3-5 Nov 2026; the account needs a ministerial commencement order (Budget 2027 says 1 July 2027).
 *  - one account per Irish-resident individual aged 18+ with a PPS number (747H "qualifying individual", 747L(2)(a));
 *  - contributions are money only (747H "contribution") and capped at €12,000 per year of assessment, counted
 *    "without regard to any amounts withdrawn" (747L(2)(d)), so withdrawing does not give the allowance back and
 *    there is no carry-forward of an unused allowance;
 *  - income, profits and gains inside are exempt; no loss relief (747P);
 *  - investment account tax (IAT) = 1% of (average investment account value - €50,000), floored at 0 (747Q(4), (7));
 *    the average is the sum of each day's close-of-business value (investments + cash) divided by the days the account
 *    was open in the year (747Q(5), "daily market value"); the provider deducts it from the account (747Q(6)(b));
 *  - excess contributions: 1% a month on the excess until withdrawn (747R). This engine never over-contributes:
 *    money above €12,000 a year goes to the ETF instead, and the result says how much.
 * ETF: exit tax 38% (2026) / 35% (from 2027) with the 8-year deemed disposal and credit, as ./ie-money-homes.ts
 * (Revenue TDM 27-01a-02): each purchase is its own lot; deemed-disposal tax is paid by selling units.
 * Shares: CGT 31% above the €1,270 annual exemption, once, on the final sale (growth only, no dividends).
 * Pension: relief at the marginal rate within the age-related limit (./ie-pension-relief.ts); 25% lump sum, the first
 * €200,000 tax-free and up to €500,000 at 20% (./retire/ie.ts LUMP), the rest taxed at the retirement rate.
 *
 * Simplifications (stated on the page): one growth rate (after fund charges) for every option; year 1 is the first
 * 12 months of the account; monthly values stand in for daily values in the average; IAT is taken at each year end
 * (the Bill has the provider pay it by 14 April); pension money counted as if drawn at the end of the horizon.
 */
import { CGT, CGT_EXEMPTION, exitTaxFor } from './ie-money-homes';
import { DEEMED_YEARS } from './ie-etf-lots';
import { ageLimit, EARNINGS_CAP } from './ie-pension-relief';
import { LUMP } from './retire/ie';

export const IIA = {
  limit: 12000,        // contribution limit per year of assessment (747H)
  threshold: 50000,    // B in 747Q(4)
  rate: 0.01,          // Z in 747Q(7)
  opens: '2027-07-01', // Budget 2027 / Bill commentary; needs a commencement order
  billPublished: '2026-10-19',
} as const;
export const PENSION_ACCESS_AGE = 60; // PRSA / personal pension normal earliest age; some company schemes allow 50

export type OptionId = 'iia' | 'etf' | 'shares' | 'pension';

export interface IiaInput {
  /** Regular contribution, EUR per `frequency`. */
  contribution: number;
  frequency?: 'month' | 'year';
  /** Starting lump sum invested at the start, EUR. Counts towards year 1's €12,000 IIA limit. */
  lumpSum?: number;
  years: number;
  /** Growth % a year after fund charges (an assumption). */
  growth: number;
  /** Income tax rate now, 20 or 40. */
  marginalRate: number;
  /** Income tax rate on pension income in retirement, 20 or 40 (default = marginalRate). */
  retirementRate?: number;
  /** Age now (pension relief limit and access). */
  age: number;
  /** Gross earnings for the pension relief limit, EUR (default 60,000; counted up to €115,000). */
  pay?: number;
  /** Calendar year of year 1 (default 2027, when the IIA opens). */
  startYear?: number;
}

export interface Option {
  id: OptionId;
  label: string;
  /** Your own money in (the same for every option). */
  yourMoney: number;
  /** Money that could not go in the wrapper (IIA limit / pension relief limit) and was put in the ETF instead. */
  overflow: number;
  /** What it would be worth with no tax at all (pension: includes the relief). */
  gross: number;
  tax: number;
  net: number;
  note: string;
  access: string;
}

export interface YearRow {
  year: number;      // 1..N
  calYear: number;
  /** After-tax value if everything were cashed out at the end of that year, each option. */
  iia: number; etf: number; shares: number; pension: number;
  /** IIA: average value that year and the 1% tax charged. */
  iiaAverage: number; iat: number;
  /** ETF: deemed-disposal tax paid that year (all lots, ETF-only option). */
  etfDeemed: number;
}

export interface IiaResult {
  options: Option[];
  ranked: OptionId[];
  best: OptionId;
  yourMoney: number;
  iiaOverflow: number;
  pensionOverflow: number;
  /** Total IAT paid over the horizon. */
  iatTotal: number;
  /** First year the IIA pays any IAT (null if never within the horizon). */
  firstIatYear: number | null;
  /** First year in which cashing out the ETF would leave more than cashing out the IIA (null: the IIA stays ahead). */
  crossoverYear: number | null;
  /** First year the IAT, as % of the average balance, exceeds the ETF's yearly tax drag (exit rate × growth). */
  dragOvertakeYear: number | null;
  /** Final-year IAT as % of the average IIA balance that year. */
  iatDragPct: number;
  /** The ETF's yearly tax drag if every year's growth were taxed at the exit rate: rate × growth, %. */
  etfDragPct: number;
  endAge: number;
  pensionLocked: boolean;
  /** True when, on these inputs, pension > IIA > ETF by money left. */
  pensionThenIiaThenEtf: boolean;
  order: string;
  years: YearRow[];
}

const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r0 = (v: number) => Math.round(v);
const r2 = (v: number) => Math.round(v * 100) / 100;

/** IAT for one year from the average value (747Q(4) and (7)). */
export function iatFor(averageValue: number): number {
  return Math.max(0, averageValue - IIA.threshold) * IIA.rate;
}

/** The 1% charge as a share of the balance: 1% × (balance - €50,000) / balance, in %. */
export function iatDragAt(balance: number): number {
  return balance > 0 ? (100 * iatFor(balance)) / balance : 0;
}

/** Pension pot drawn: 25% lump sum (first €200,000 free, to €500,000 at 20%, above at `rate`), the rest at `rate`. */
export function pensionNet(pot: number, rate: number): { net: number; tax: number; lump: number } {
  const lump = Math.max(0, pot) * LUMP.maxPct;
  const lumpTax = Math.max(0, Math.min(lump, LUMP.standardTop) - LUMP.free) * LUMP.standardRate + Math.max(0, lump - LUMP.standardTop) * rate;
  const restTax = (Math.max(0, pot) - lump) * rate;
  return { net: pot - lumpTax - restTax, tax: lumpTax + restTax, lump };
}

const monthly = (g: number) => (1 + g) ** (1 / 12) - 1;

/** ETF lots: `flows[t]` invested at the start of month t. Deemed disposal every 8 years per lot, tax paid by selling
 *  units, credit on the final sale (same formula as ./ie-money-homes.ts). Returns the cash-out value at each year end. */
export function simulateEtf(flows: number[], growth: number, startYear: number) {
  const T = flows.length, gm = monthly(growth);
  const cost: number[] = [], value: number[] = [], paid: number[] = [], t0: number[] = [];
  const cash: number[] = [], deemedByYear: number[] = Array.from({ length: Math.ceil(T / 12) }, () => 0);
  let gross = 0;
  for (let t = 0; t < T; t++) {
    for (let i = 0; i < cost.length; i++) {
      const age = t - t0[i];
      if (age > 0 && age % (DEEMED_YEARS * 12) === 0) {
        const due = Math.max(0, (value[i] + paid[i] - cost[i]) * exitTaxFor(startYear + Math.floor(t / 12)) - paid[i]);
        value[i] -= due; paid[i] += due; deemedByYear[Math.ceil(t / 12) - 1] += due; // on the anniversary: end of year 8, 16…
      }
    }
    if (flows[t] > 0) { cost.push(flows[t]); value.push(flows[t]); paid.push(0); t0.push(t); }
    gross += flows[t];
    for (let i = 0; i < value.length; i++) value[i] *= 1 + gm;
    gross *= 1 + gm;
    if ((t + 1) % 12 === 0) {
      const rate = exitTaxFor(startYear + (t + 1) / 12 - 1);
      let net = 0;
      for (let i = 0; i < value.length; i++) net += value[i] - Math.max(0, value[i] + paid[i] - cost[i]) * rate + paid[i];
      cash.push(net);
    }
  }
  return { cash, net: cash[cash.length - 1] ?? 0, gross, deemedByYear };
}

/** IIA: monthly values stand in for the daily average; IAT deducted at each year end. */
export function simulateIia(flows: number[], growth: number) {
  const T = flows.length, gm = monthly(growth);
  let v = 0, sum = 0, gross = 0;
  const cash: number[] = [], averages: number[] = [], iat: number[] = [];
  for (let t = 0; t < T; t++) {
    v += flows[t]; gross += flows[t];
    const start = v;
    v *= 1 + gm; gross *= 1 + gm;
    sum += (start + v) / 2;
    if ((t + 1) % 12 === 0) {
      const avg = sum / 12, tax = iatFor(avg);
      v -= tax; sum = 0;
      averages.push(avg); iat.push(tax); cash.push(v);
    }
  }
  return { cash, net: cash[cash.length - 1] ?? 0, gross, averages, iat };
}

/** Direct shares: CGT on the gain above the annual exemption when sold. */
export function simulateShares(flows: number[], growth: number) {
  const gm = monthly(growth);
  let v = 0, cost = 0;
  const cash: number[] = [];
  flows.forEach((f, t) => {
    v += f; cost += f; v *= 1 + gm;
    if ((t + 1) % 12 === 0) cash.push(v - Math.max(0, v - cost - CGT_EXEMPTION) * CGT);
  });
  return { cash, net: cash[cash.length - 1] ?? 0, gross: v };
}

/** Pension: `flows` are gross contributions (your money plus relief). */
export function simulatePension(flows: number[], growth: number, retirementRate: number) {
  const gm = monthly(growth);
  let v = 0;
  const cash: number[] = [];
  flows.forEach((f, t) => {
    v += f; v *= 1 + gm;
    if ((t + 1) % 12 === 0) cash.push(pensionNet(v, retirementRate).net);
  });
  return { cash, net: cash[cash.length - 1] ?? 0, gross: v };
}

const LABEL: Record<OptionId, string> = {
  iia: 'Investment Account (IIA)', etf: 'ETF outside the IIA', shares: 'Direct shares', pension: 'Pension (PRSA/AVC)',
};

export function computeIia(i: IiaInput): IiaResult {
  const N = clamp(Math.floor(num(i.years, 10)), 1, 40);
  const T = N * 12;
  const g = clamp(num(i.growth, 5), -10, 20) / 100;
  const m = num(i.marginalRate, 20) >= 40 ? 0.4 : 0.2;
  const mr = num(i.retirementRate, m * 100) >= 40 ? 0.4 : 0.2;
  const age = clamp(Math.floor(num(i.age, 35)), 18, 80);
  const pay = Math.max(0, num(i.pay, 60000));
  const y0 = clamp(Math.floor(num(i.startYear, 2027)), 2026, 2100);
  const lump = Math.max(0, num(i.lumpSum));
  const c = Math.max(0, num(i.contribution));
  const perMonth = i.frequency === 'year' ? 0 : c;
  const perYear = i.frequency === 'year' ? c : 0;

  // Your money, month by month: lump sum and annual contributions at the start of month 0, 12, 24…; monthly ones every month.
  const flows = Array.from({ length: T }, (_, t) => (t === 0 ? lump : 0) + perMonth + (t % 12 === 0 ? perYear : 0));
  const yourMoney = flows.reduce((s, f) => s + f, 0);

  // IIA: up to €12,000 per year; the rest to the ETF.
  const iiaIn: number[] = [], iiaOver: number[] = [];
  // Pension: your money up to the relief limit × (1 - rate) per year, grossed up by the relief; the rest to the ETF.
  const penGross: number[] = [], penOver: number[] = [];
  let iiaLeft = 0, penLeft = 0;
  for (let t = 0; t < T; t++) {
    if (t % 12 === 0) {
      iiaLeft = IIA.limit;
      penLeft = ageLimit(age + t / 12) * Math.min(pay, EARNINGS_CAP) * (1 - m);
    }
    const a = Math.min(flows[t], iiaLeft); iiaLeft -= a; iiaIn.push(a); iiaOver.push(flows[t] - a);
    const p = Math.min(flows[t], penLeft); penLeft -= p; penGross.push(p / (1 - m)); penOver.push(flows[t] - p);
  }
  const iiaOverflow = iiaOver.reduce((s, f) => s + f, 0);
  const pensionOverflow = penOver.reduce((s, f) => s + f, 0);

  const iia = simulateIia(iiaIn, g);
  const iiaEtf = simulateEtf(iiaOver, g, y0);
  const etf = simulateEtf(flows, g, y0);
  const shares = simulateShares(flows, g);
  const pen = simulatePension(penGross, g, mr);
  const penEtf = simulateEtf(penOver, g, y0);

  const endAge = age + N;
  const pensionLocked = endAge < PENSION_ACCESS_AGE;
  const nf = (v: number) => `€${r0(v).toLocaleString('en-IE')}`;
  const iatTotal = iia.iat.reduce((s, x) => s + x, 0);

  const opt = (id: OptionId, gross: number, net: number, overflow: number, note: string, access: string): Option =>
    ({ id, label: LABEL[id], yourMoney: r0(yourMoney), overflow: r0(overflow), gross: r0(gross), tax: r0(gross - net), net: r0(net), note, access });
  const options: Option[] = [
    opt('iia', iia.gross + iiaEtf.gross, iia.net + iiaEtf.net, iiaOverflow,
      `1% a year on the average value above €50,000 (${nf(iatTotal)} in total), no tax on withdrawal${iiaOverflow > 0 ? `; ${nf(iiaOverflow)} above the €12,000-a-year limit went into the ETF and pays exit tax` : ''}`,
      'Withdraw any time, tax-free; opens July 2027 (not yet law)'),
    opt('etf', etf.gross, etf.net, 0,
      `Exit tax 35% (38% in 2026)${N > DEEMED_YEARS ? ' with the 8-year deemed disposal paid by selling units' : ''}; credit for deemed tax on the final sale`,
      'Sell any day; value can fall'),
    opt('shares', shares.gross, shares.net, 0,
      '31% CGT on the gain above €1,270, on the final sale; growth only, no dividends; one share, no spread',
      'Sell any day; value can fall'),
    opt('pension', pen.gross + penEtf.gross, pen.net + penEtf.net, pensionOverflow,
      `Relief at ${m * 100}% within your age limit (${r0(ageLimit(age) * 100)}% of pay now); 25% lump sum, first €200,000 tax-free; the rest taxed at ${mr * 100}% (USC not counted)${pensionOverflow > 0 ? `; ${nf(pensionOverflow)} above your relief limit went into the ETF` : ''}`,
      pensionLocked ? `Locked until ${PENSION_ACCESS_AGE} (you would be ${endAge})` : `Locked until ${PENSION_ACCESS_AGE} (50 in some company schemes)`),
  ];
  const ranked = [...options].sort((a, b) => b.net - a.net).map((o) => o.id);
  const net = (id: OptionId) => options.find((o) => o.id === id)!.net;

  const years: YearRow[] = Array.from({ length: N }, (_, k) => ({
    year: k + 1, calYear: y0 + k,
    iia: r0(iia.cash[k] + iiaEtf.cash[k]), etf: r0(etf.cash[k]), shares: r0(shares.cash[k]), pension: r0(pen.cash[k] + penEtf.cash[k]),
    iiaAverage: r0(iia.averages[k]), iat: r2(iia.iat[k]), etfDeemed: r2(etf.deemedByYear[k]),
  }));
  const etfDragPct = r2(exitTaxFor(y0 + N - 1) * g * 100);
  const crossover = years.find((y) => y.etf > y.iia);
  const firstIat = years.find((y) => y.iat > 0);
  const dragOvertake = years.find((y) => y.iiaAverage > 0 && (100 * y.iat) / y.iiaAverage > etfDragPct);
  const last = years[N - 1];
  const iatDragPct = last.iiaAverage > 0 ? r2((100 * last.iat) / last.iiaAverage) : 0;

  const pensionThenIiaThenEtf = net('pension') > net('iia') && net('iia') > net('etf');
  const names = ranked.map((id) => LABEL[id]);
  const order = pensionThenIiaThenEtf
    ? `On these assumptions the pension leaves the most, then the IIA, then the ETF: the "pension first, then IIA, then ETF" order holds for these inputs.${pensionLocked ? ` But the pension money is locked until ${PENSION_ACCESS_AGE}.` : ''}`
    : `On these assumptions the order is ${names.slice(0, -1).join(', ')} and then ${names[names.length - 1]}, so the "pension first, then IIA, then ETF" order does not hold for these inputs.`;

  return {
    options, ranked, best: ranked[0], yourMoney: r0(yourMoney), iiaOverflow: r0(iiaOverflow), pensionOverflow: r0(pensionOverflow),
    iatTotal: r0(iatTotal), firstIatYear: firstIat ? firstIat.year : null, crossoverYear: crossover ? crossover.year : null,
    dragOvertakeYear: dragOvertake ? dragOvertake.year : null, iatDragPct, etfDragPct, endAge, pensionLocked,
    pensionThenIiaThenEtf, order, years,
  };
}
