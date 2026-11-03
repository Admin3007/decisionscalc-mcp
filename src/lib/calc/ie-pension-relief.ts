/**
 * Ireland: income tax relief on personal pension contributions (occupational scheme, AVC, PRSA, RAC, PEPP).
 * Rules read on revenue.ie on 2026-11-03 ("Tax relief on pension contributions", published 15 Oct 2026):
 *  - relief at your marginal income tax rate; no relief from USC or PRSI for employee contributions;
 *  - age-related limit on earnings from the job the contributions relate to: under 30 15%, 30-39 20%,
 *    40-49 25%, 50-54 30%, 55-59 35%, 60 or over 40% (Revenue: age 42 on €40,000 → €10,000);
 *  - earnings counted up to €115,000; employer contributions do not count towards the limit.
 * Bands and credits for 2026 and 2027 (Budget 2027): ./ie-budget-2027.ts via ./ie-income-tax.ts.
 */
import { incomeTaxFor, type TaxStatus } from './ie-income-tax';
import type { Year } from './ie-budget-2027';

export const EARNINGS_CAP = 115000;
export const AGE_LIMITS: [number, number][] = [[30, 0.15], [40, 0.2], [50, 0.25], [55, 0.3], [60, 0.35], [Infinity, 0.4]];

export function ageLimit(age: number): number {
  return AGE_LIMITS.find(([below]) => age < below)![1];
}

export interface PensionReliefInput {
  year: Year;
  status: TaxStatus;
  age: number;
  /** Gross earnings from the job the contributions relate to, EUR a year. */
  pay: number;
  spousePay?: number;
  /** Your own contributions this year: scheme contributions plus AVCs/PRSA, EUR. */
  contributions: number;
}

export interface PensionReliefResult {
  limitPct: number;
  maxRelievable: number;
  relieved: number;
  /** Contributions above the limit this year (no relief now). */
  excess: number;
  taxSaved: number;
  netCost: number;
  /** More you could pay this year and still get relief. */
  headroom: number;
  /** Income tax saved on the next €1,000 you pay (up to the limit). */
  savedPer1000: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

export function computePensionRelief(i: PensionReliefInput): PensionReliefResult {
  const pay = n(i.pay), spouse = n(i.spousePay), contributions = n(i.contributions);
  const limitPct = ageLimit(n(i.age));
  const maxRelievable = r2(limitPct * Math.min(pay, EARNINGS_CAP));
  const relieved = Math.min(contributions, maxRelievable);
  const tax = (relief: number) => incomeTaxFor(i.year, i.status, pay, spouse, -relief);
  const base = tax(0);
  const taxSaved = r2(base - tax(relieved));
  const extra = Math.min(1000, Math.max(0, maxRelievable - relieved));
  return {
    limitPct, maxRelievable, relieved: r2(relieved), excess: r2(contributions - relieved),
    taxSaved, netCost: r2(contributions - taxSaved),
    headroom: r2(Math.max(0, maxRelievable - relieved)),
    savedPer1000: r2(tax(relieved) - tax(relieved + extra)),
  };
}
