/**
 * Irish ETF exit tax across several purchases (overhaul B5): every 8-year deemed disposal, the tax due at each,
 * and what is due or refunded when you sell. Pure + tested; the same rules as the Irish ETF Exit Tax Tracker
 * spreadsheet (scripts/gen-etf-tracker.mjs, tests/contracts/etf-tracker.test.ts).
 *
 * Revenue Tax and Duty Manual Part 27-01a-02 (read 2 Nov 2026):
 *  - each holding is deemed sold and reacquired every 8 years; tax on value less cost at that year's rate (4.3.1, 4.4);
 *  - tax already paid on a deemed disposal is credited against later events and the final sale, any excess repaid (4.4.5);
 *  - a loss on an 8-year date gives no tax and no loss relief.
 * Rates: 41% to 2025, 38% in 2026, 35% from 2027 (Budget 2027). Treated per calendar year of the event.
 * Simplifications (stated on the page): values between purchase and event follow one growth rate unless a value
 * is given; tax is paid from other money (units are not sold to pay it); distributions are not modelled.
 */

export const RATES: Record<number, number> = { 2015: 0.41, 2026: 0.38, 2027: 0.35 };
export const DEEMED_YEARS = 8;

/** Exit tax rate for an event in `year` (the latest rate that started on or before it). */
export function exitTaxRate(year: number): number {
  const from = Object.keys(RATES).map(Number).filter((y) => y <= year).sort((a, b) => b - a)[0];
  return RATES[from ?? 2015];
}

export interface Lot {
  bought: string;        // YYYY-MM-DD
  cost: number;          // what you paid, including fees
  /** Optional known values at the 1st, 2nd, ... 8-year dates; otherwise grown at `growth`. */
  values?: number[];
  sold?: { date: string; value: number };
}

export interface EtfInput {
  lots: Lot[];
  growth: number;        // % a year, used where no value is given
  until: string;         // YYYY-MM-DD: show events up to this date for lots not sold
}

export interface EtfEvent {
  lot: number;           // index into lots
  date: string;
  kind: 'deemed' | 'sale';
  value: number;
  gain: number;          // value less cost (negative = loss)
  rate: number;
  due: number;           // tax payable now
  refund: number;        // credit repaid (sale only)
}

export interface EtfResult {
  events: EtfEvent[];
  totalDue: number;
  totalRefund: number;
  next: EtfEvent | null; // first event on or after `today`
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const addYears = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  // 29 February rolls to 28 February in a non-leap year (the anniversary that exists).
  const leap = (yy: number) => (yy % 4 === 0 && yy % 100 !== 0) || yy % 400 === 0;
  const day = m === 2 && d === 29 && !leap(y + n) ? 28 : d;
  return `${y + n}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const yearsBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / (365.25 * 86400000);

export function computeEtfLots(input: EtfInput, today = new Date().toISOString().slice(0, 10)): EtfResult {
  const g = (input.growth || 0) / 100;
  const events: EtfEvent[] = [];
  input.lots.forEach((lot, i) => {
    if (!lot.bought || !(lot.cost > 0)) return;
    const end = lot.sold?.date ?? input.until;
    let paid = 0;
    for (let k = 1; ; k++) {
      const date = addYears(lot.bought, DEEMED_YEARS * k);
      if (date > end || (lot.sold && date >= lot.sold.date)) break;
      const value = lot.values?.[k - 1] ?? lot.cost * Math.pow(1 + g, yearsBetween(lot.bought, date));
      const gain = value - lot.cost;
      const rate = exitTaxRate(Number(date.slice(0, 4)));
      const due = Math.max(0, Math.max(0, gain) * rate - paid);
      paid += due;
      events.push({ lot: i, date, kind: 'deemed', value: r2(value), gain: r2(gain), rate, due: r2(due), refund: 0 });
    }
    if (lot.sold) {
      const value = lot.sold.value;
      const gain = value - lot.cost;
      const rate = exitTaxRate(Number(lot.sold.date.slice(0, 4)));
      const total = Math.max(0, gain) * rate;
      events.push({ lot: i, date: lot.sold.date, kind: 'sale', value: r2(value), gain: r2(gain), rate, due: r2(Math.max(0, total - paid)), refund: r2(Math.max(0, paid - total)) });
    }
  });
  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.lot - b.lot));
  return {
    events,
    totalDue: r2(events.reduce((s, e) => s + e.due, 0)),
    totalRefund: r2(events.reduce((s, e) => s + e.refund, 0)),
    next: events.find((e) => e.date >= today) ?? null,
  };
}
