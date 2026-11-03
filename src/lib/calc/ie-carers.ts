/**
 * Ireland: Carer's Allowance means test and weekly rate.
 * Official sources (read 2026-11-03):
 *  - citizensinformation.ie "Carer's Allowance": income disregard €1,000 a week (single) / €2,000 (couple)
 *    from 2 July 2026; Budget 2027: €1,150 / €2,300 from July 2027 and maximum rate +€10 from January 2027;
 *    a couple's means = half of (combined means − disregard); employment income counts after PRSI, pension
 *    contributions and trade union subscriptions; capital: first €50,000 nil, next €10,000 €1 per €1,000,
 *    next €10,000 €2 per €1,000, balance €4 per €1,000 (a couple's combined capital is halved first and the
 *    result doubled); child maintenance not counted; caring for 2 or more people: rate +50%.
 *  - DSP Rates of Payment 2026 (SW19), Carer's Allowance tables: full rate for means up to €7.60, then the
 *    rate falls €2.50 for each €2.50 band of means (bands end at x.10 / x.60); nil when it reaches zero.
 *    2026 maximum rates: under 66 €270 (2+ people €405); 66 or over €308 (€462).
 */
import { prsiFor } from './ie-budget-2027';

export type Period = 'h2-2026' | 'h1-2027' | 'h2-2027';
export const PERIODS: Record<Period, { label: string; rateUnder66: number; rate66: number; disregardSingle: number; disregardCouple: number; prsiYear: 2026 | 2027 }> = {
  'h2-2026': { label: 'July–December 2026', rateUnder66: 270, rate66: 308, disregardSingle: 1000, disregardCouple: 2000, prsiYear: 2026 },
  'h1-2027': { label: 'January–June 2027', rateUnder66: 280, rate66: 318, disregardSingle: 1000, disregardCouple: 2000, prsiYear: 2027 },
  'h2-2027': { label: 'From July 2027', rateUnder66: 280, rate66: 318, disregardSingle: 1150, disregardCouple: 2300, prsiYear: 2027 },
};
export const FULL_RATE_MEANS = 7.6;
export const STEP = 2.5;
export const TWO_OR_MORE = 1.5;

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Weekly means from capital for one person's share (SW: per complete €1,000 within each band). */
export function capitalMeans(share: number): number {
  const k = Math.floor(n(share) / 1000); // complete thousands
  const band1 = Math.max(0, Math.min(k, 60) - 50);       // €50k–60k: €1 per €1,000
  const band2 = Math.max(0, Math.min(k, 70) - 60);       // €60k–70k: €2 per €1,000
  const band3 = Math.max(0, k - 70);                      // over €70k: €4 per €1,000
  return band1 * 1 + band2 * 2 + band3 * 4;
}

/** Weekly rate for given weekly means (SW19 table rule). */
export function rateFor(means: number, maxRate: number): number {
  const m = n(means);
  if (m <= FULL_RATE_MEANS) return maxRate;
  const cents = Math.round(m * 100) - Math.round(FULL_RATE_MEANS * 100);
  const steps = Math.ceil(cents / Math.round(STEP * 100)); // work in cents: bands end exactly at x.10 / x.60
  return Math.max(0, r2(maxRate - steps * STEP));
}

export interface CarerInput {
  period: Period;
  aged66: boolean;
  caringForTwoOrMore: boolean;
  couple: boolean;
  /** Weekly gross earnings (you, partner). PRSI is estimated; pension and union are your inputs. */
  earn1: number; earn2?: number;
  pensionWeekly?: number;   // pension contributions a week (both)
  unionWeekly?: number;     // trade union subscriptions a week (both)
  otherWeekly?: number;     // other assessable cash income a week
  capital: number;          // savings, investments, property other than your home (combined for a couple)
}

export function computeCarer(i: CarerInput) {
  const P = PERIODS[i.period] ?? PERIODS['h2-2026'];
  const earn1 = n(i.earn1), earn2 = i.couple ? n(i.earn2) : 0;
  const prsi = (prsiFor(earn1 * 52, P.prsiYear) + prsiFor(earn2 * 52, P.prsiYear)) / 52;
  const cash = Math.max(0, earn1 + earn2 - prsi - n(i.pensionWeekly) - n(i.unionWeekly) + n(i.otherWeekly));
  const capital = i.couple ? capitalMeans(n(i.capital) / 2) * 2 : capitalMeans(n(i.capital));
  const disregard = i.couple ? P.disregardCouple : P.disregardSingle;
  const over = Math.max(0, cash + capital - disregard);
  const means = r2(i.couple ? over / 2 : over);
  const base = i.aged66 ? P.rate66 : P.rateUnder66;
  const maxRate = i.caringForTwoOrMore ? base * TWO_OR_MORE : base;
  const weekly = rateFor(means, maxRate);
  return { period: P.label, cashWeekly: r2(cash), capitalWeekly: capital, disregard, means, maxRate, weekly, yearly: r2(weekly * 52) };
}
