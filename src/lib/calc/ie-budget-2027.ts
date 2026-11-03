/**
 * Budget 2027 (Ireland): take-home pay in 2026 vs 2027 for employees and the self-employed.
 * Official figures (read 2026-11-03):
 *  - 2026 bands, credits: revenue.ie "Tax rates, bands and reliefs" (published 1 Jan 2026);
 *  - 2026 USC: revenue.ie "Standard rates and thresholds of USC";
 *  - Budget 2027 changes: gov.ie "Your guide to Budget 2027" (6 Oct 2026, updated 19 Oct 2026):
 *    +€2,500 standard rate band, +€125 main credits (+€100 home carer), 2% USC ceiling €28,700 → €30,300,
 *    rent credit €1,000 → €1,150 (single) and €2,000 → €2,300 (couple);
 *  - PRSI Class A: gov.ie "PRSI Class A Rates" (updated 10 Jun 2026): 4.2% to 30 Sep 2026, 4.35% from 1 Oct 2026;
 *    4.5% from 1 Oct 2027 under the PRSI roadmap (Social Welfare (Miscellaneous Provisions) Act 2024).
 * Married personal credit is twice the single credit (€4,000 → €4,250), as in every year since 2022.
 */
export type Status = 'single' | 'single-parent' | 'married-one' | 'married-two';
export type Year = 2026 | 2027;

export const RULES = {
  2026: {
    band: { single: 44000, 'single-parent': 48000, married: 53000, secondMax: 35000 },
    personal: 2000, employee: 2000, earned: 2000, spcc: 1900, homeCarer: 1950,
    rent: { single: 1000, couple: 2000 },
    usc: [[12012, 0.005], [28700, 0.02], [70044, 0.03], [Infinity, 0.08]] as [number, number][],
    prsi: [[9, 0.042], [3, 0.0435]] as [number, number][], // [months, rate]
  },
  2027: {
    band: { single: 46500, 'single-parent': 50500, married: 55500, secondMax: 37500 },
    personal: 2125, employee: 2125, earned: 2125, spcc: 1900, homeCarer: 2050,
    rent: { single: 1150, couple: 2300 },
    usc: [[12012, 0.005], [30300, 0.02], [70044, 0.03], [Infinity, 0.08]] as [number, number][],
    prsi: [[9, 0.0435], [3, 0.045]] as [number, number][],
  },
} as const;
export const USC_EXEMPT = 13000;
const PRSI_FREE_WEEK = 352;
const PRSI_TAPER_TOP = 424;

export interface BudgetInput {
  status: Status;
  pay1: number;           // gross pay a year, earner 1
  pay2?: number;          // earner 2 (married-two only)
  selfEmployed?: boolean; // earner 1 self-employed (earned income credit instead of employee credit)
  renter?: boolean;       // qualifies for the rent tax credit (full amount assumed)
  homeCarer?: boolean;    // married-one: home carer credit
}

export interface YearResult { year: Year; incomeTax: number; usc: number; prsi: number; takeHome: number; gross: number }

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

export function uscFor(pay: number, year: Year): number {
  if (pay <= USC_EXEMPT) return 0;
  let prev = 0, due = 0;
  for (const [top, rate] of RULES[year].usc) {
    if (pay > prev) due += (Math.min(pay, top) - prev) * rate;
    prev = top;
  }
  return r2(due);
}

/** Employee PRSI over the year, by the weekly bands, including the tapered €12 credit (52 weeks). */
export function prsiFor(pay: number, year: Year, selfEmployed = false): number {
  const week = pay / 52;
  let due = 0;
  for (const [months, rate] of RULES[year].prsi) {
    const share = months / 12;
    if (selfEmployed) { due += pay >= 5000 ? pay * rate * share : 0; continue; }
    if (week <= PRSI_FREE_WEEK) continue;
    let w = week * rate;
    if (week <= PRSI_TAPER_TOP) w = Math.max(0, w - Math.max(0, 12 - (week - 352.01) / 6));
    due += w * 52 * share;
  }
  return r2(due);
}

export function computeYear(i: BudgetInput, year: Year): YearResult {
  const R = RULES[year];
  const p1 = n(i.pay1);
  const p2 = i.status === 'married-two' ? n(i.pay2) : 0;
  const married = i.status === 'married-one' || i.status === 'married-two';
  const gross = p1 + p2;

  let band: number;
  if (i.status === 'married-two') band = R.band.married + Math.min(R.band.secondMax, Math.min(p1, p2));
  else if (married) band = R.band.married;
  else band = R.band[i.status];

  let credits = married ? R.personal * 2 : R.personal;
  credits += Math.min(i.selfEmployed ? R.earned : R.employee, p1 * 0.2);
  if (i.status === 'married-two') credits += Math.min(R.employee, p2 * 0.2);
  if (i.status === 'single-parent') credits += R.spcc;
  if (i.status === 'married-one' && i.homeCarer) credits += R.homeCarer;
  if (i.renter) credits += married ? R.rent.couple : R.rent.single;

  const taxable = gross;
  const gross20 = Math.min(taxable, band) * 0.2 + Math.max(0, taxable - band) * 0.4;
  const incomeTax = r2(Math.max(0, gross20 - credits));
  const usc = r2(uscFor(p1, year) + uscFor(p2, year));
  const prsi = r2(prsiFor(p1, year, !!i.selfEmployed) + prsiFor(p2, year));
  return { year, incomeTax, usc, prsi, gross, takeHome: r2(gross - incomeTax - usc - prsi) };
}

export function compareBudget(i: BudgetInput) {
  const y26 = computeYear(i, 2026);
  const y27 = computeYear(i, 2027);
  return {
    y26, y27,
    gain: r2(y27.takeHome - y26.takeHome),
    lines: [
      { label: 'Income tax', change: r2(y26.incomeTax - y27.incomeTax) },
      { label: 'USC', change: r2(y26.usc - y27.usc) },
      { label: 'PRSI', change: r2(y26.prsi - y27.prsi) },
    ],
  };
}
