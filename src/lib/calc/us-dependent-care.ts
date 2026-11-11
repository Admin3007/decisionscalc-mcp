/**
 * Dependent Care FSA or the Child and Dependent Care Credit, 2026: which saves more, and the best mix.
 *
 * Law (read 9 Nov 2026 on law.cornell.edu, both as amended by Pub. L. 119-21 for tax years after 31 Dec 2025):
 *  - 26 U.S.C. 129: up to $7,500 a year of dependent care assistance (FSA, employer contributions included) is
 *    excluded from income, and never more than the earned income of the employee or, if married, the lower earner.
 *  - 26 U.S.C. 21: credit = applicable % x care expenses up to $3,000 (one child) or $6,000 (two or more), that limit
 *    reduced by every dollar excluded under section 129 and capped at the lower earner's earned income. Applicable %:
 *    50%, less 1 point for each $2,000 (or part) of AGI over $15,000, not below 35%; then less 1 point for each $2,000
 *    (or part) over $75,000 ($4,000 over $150,000 on a joint return), not below 20%. Non-refundable: the credit cannot
 *    exceed the federal income tax (it comes before the Child Tax Credit on the return). Married couples must file jointly.
 * The FSA also saves payroll tax (FICA) and, in most states, state income tax on the amount put in.
 * Federal tax: src/lib/calc/us-federal-tax.ts (2026 tables, standard deduction).
 */
import { federalTaxOnAgi, ficaSaved, marginalRate, type FilingStatus } from './us-federal-tax';

export const FSA_LIMIT = 7500;
export const CREDIT_CAP = { one: 3000, two: 6000 } as const;
export const DC_SOURCES = {
  credit: 'https://www.law.cornell.edu/uscode/text/26/21',
  fsa: 'https://www.law.cornell.edu/uscode/text/26/129',
  irs: 'https://www.irs.gov/newsroom/one-big-beautiful-bill-provisions',
};

export interface DcInput {
  status: FilingStatus;
  /** Household income before any dependent care FSA (wages and other income, before pre-tax deductions for the FSA). */
  income: number;
  /** Children (or other qualifying people) in paid care: 1, or 2 for two or more. */
  kids: 1 | 2;
  /** Care costs you pay in the year (daycare, preschool, before/after school care, day camp, nanny). */
  expenses: number;
  /** Your employer plan's limit for your own contributions (many plans still say $5,000 in 2026). */
  planLimit?: number;
  /** Employer contributions to the FSA (count toward the $7,500 and cut the credit the same way). */
  employer?: number;
  /** Wages of the person whose employer offers the FSA (for the payroll tax saving). Defaults to income. */
  fsaWages?: number;
  /** Lower earner's earned income (married) or your earned income (single): caps both benefits. Defaults to income. */
  lowerEarned?: number;
  /** State income tax rate on the last dollars, % (0 if no state tax or your state taxes FSA money). */
  stateRate?: number;
}

export interface DcOption {
  /** Your own FSA election. */
  fsa: number;
  /** Total excluded (yours + employer, capped). */
  excluded: number;
  fedTaxSaved: number;
  ficaSaved: number;
  stateSaved: number;
  creditRate: number;
  creditExpenses: number;
  credit: number;
  /** Credit lost because it exceeds the tax owed (non-refundable). */
  creditLost: number;
  total: number;
}

export interface DcResult {
  creditOnly: DcOption;
  fsaMax: DcOption;
  best: DcOption;
  /** Largest election the plan, the law and your costs allow. */
  maxElection: number;
  marginal: number;
  /** Extra saved by the best mix over the credit alone. */
  gainOverCredit: number;
  /** One-line verdict. */
  verdict: 'fsa' | 'credit' | 'mix' | 'none';
}

/** Applicable percentage under 26 U.S.C. 21(a)(2). */
export function creditRate(agi: number, status: FilingStatus): number {
  const a = Math.max(0, agi);
  let pct = 50;
  if (a > 15000) pct = Math.max(35, pct - Math.ceil((a - 15000) / 2000));
  const start = status === 'mfj' ? 150000 : 75000, step = status === 'mfj' ? 4000 : 2000;
  if (a > start) pct = Math.max(20, pct - Math.ceil((a - start) / step));
  return pct / 100;
}

function option(i: DcInput, x: number): DcOption {
  const employer = Math.max(0, i.employer ?? 0);
  const lowerEarned = Math.max(0, i.lowerEarned ?? i.income);
  const excluded = Math.min(FSA_LIMIT, employer + x, lowerEarned);
  const agi0 = Math.max(0, i.income);
  const agi = Math.max(0, agi0 - x);
  const fedTaxSaved = federalTaxOnAgi(agi0, i.status) - federalTaxOnAgi(agi, i.status);
  const fica = ficaSaved(i.fsaWages ?? i.income, x);
  const stateSaved = x * Math.max(0, i.stateRate ?? 0) / 100;
  const cap = i.kids >= 2 ? CREDIT_CAP.two : CREDIT_CAP.one;
  const creditExpenses = Math.max(0, Math.min(i.expenses - (employer + x), cap - excluded, lowerEarned));
  const rate = creditRate(agi, i.status);
  const full = rate * creditExpenses;
  const taxOwed = federalTaxOnAgi(agi, i.status);
  const credit = Math.min(full, taxOwed);
  return { fsa: x, excluded, fedTaxSaved, ficaSaved: fica, stateSaved, creditRate: rate, creditExpenses, credit, creditLost: full - credit, total: fedTaxSaved + fica + stateSaved + credit };
}

/** Every election from 0 to the maximum in $50 steps (and the maximum itself); the best one wins, ties go to less money in the FSA. */
export function compareDependentCare(i: DcInput): DcResult {
  const employer = Math.max(0, i.employer ?? 0);
  const plan = Math.max(0, Math.min(i.planLimit ?? FSA_LIMIT, FSA_LIMIT));
  const lowerEarned = Math.max(0, i.lowerEarned ?? i.income);
  const maxElection = Math.max(0, Math.min(plan, FSA_LIMIT - employer, Math.max(0, i.expenses) - employer, lowerEarned - employer));
  const creditOnly = option(i, 0);
  const fsaMax = option(i, maxElection);
  let best = creditOnly;
  for (let x = 50; x < maxElection; x += 50) { const o = option(i, x); if (o.total > best.total + 0.005) best = o; }
  if (fsaMax.total > best.total + 0.005) best = fsaMax;
  const verdict: DcResult['verdict'] = best.total <= 0.005 ? 'none' : best.fsa === 0 ? 'credit' : best.fsa >= maxElection ? 'fsa' : 'mix';
  return { creditOnly, fsaMax, best, maxElection, marginal: marginalRate(Math.max(0, i.income - best.fsa), i.status), gainOverCredit: best.total - creditOnly.total, verdict };
}
