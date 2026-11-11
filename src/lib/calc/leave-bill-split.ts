/**
 * Who pays what while one parent is on leave (market gap 4, MARKET-GAPS-FORUMS-2026-11.md): the parent on leave's
 * statutory pay week by week (src/lib/calc/parental-leave-gap.ts: SMP, Maternity Benefit, Parental Leave Pay, EI,
 * QPIP, US state paid leave) plus any employer top-up, the partner's pay, and the shared bills, split three ways:
 *  - half: each pays 50% of the bills (the "50/50 trap" when leave pay falls below half the bills);
 *  - proportional: each pays the same share of their income during the leave;
 *  - equal: both are left with the same money after bills.
 * Plus the pension the parent on leave misses (contribution rate x lost pay), which the partner can make up.
 * All amounts are before tax, averaged per month over the leave.
 */
import { leaveGap, type LeaveCountry } from './parental-leave-gap';

export interface SplitInput {
  country: LeaveCountry;
  /** Yearly pay before tax of the parent taking leave. */
  leaveSalary: number;
  /** Weeks of leave. */
  weeks: number;
  /** Employer top-up: pay made up to this share of normal pay (0..1). */
  topUp?: number;
  topUpWeeks?: number;
  /** Partner's yearly pay before tax. */
  partnerSalary: number;
  /** Shared bills a month. */
  billsMonthly: number;
  /** Pension contributions (employee + employer) as a share of pay, 0..1. */
  pensionRate?: number;
}

export interface SplitShare { leavePays: number; partnerPays: number; leaveLeft: number; partnerLeft: number; }

export interface SplitResult {
  months: number;
  /** Monthly income during the leave (statutory + top-up for the parent on leave). */
  leaveIncome: number;
  partnerIncome: number;
  /** The parent on leave's normal monthly pay. */
  leaveNormal: number;
  bills: number;
  half: SplitShare;
  proportional: SplitShare;
  equal: SplitShare;
  /** Share of the bills the parent on leave paid before the leave, if split by income. */
  shareBefore: number;
  /** Share during the leave, by income. */
  shareDuring: number;
  /** Savings the parent on leave draws over the whole leave under a 50/50 split (0 if none). */
  halfShortfall: number;
  /** Pension contributions missed over the leave. */
  pensionGap: number;
  /** Household money left after bills over the whole leave (negative = shortfall). */
  householdLeft: number;
}

const share = (leaveIncome: number, partnerIncome: number, leavePays: number, bills: number): SplitShare => ({
  leavePays, partnerPays: bills - leavePays, leaveLeft: leaveIncome - leavePays, partnerLeft: partnerIncome - (bills - leavePays),
});

export function billSplit(i: SplitInput): SplitResult {
  const weeks = Math.max(1, Math.min(104, Math.round(i.weeks || 0)));
  const months = (weeks * 12) / 52;
  const g = leaveGap({ country: i.country, salary: i.leaveSalary, weeks, topUp: i.topUp, topUpWeeks: i.topUpWeeks });
  const leaveIncome = (g.statutory + g.topUp) / months;
  const partnerIncome = Math.max(0, i.partnerSalary || 0) / 12;
  const leaveNormal = Math.max(0, i.leaveSalary || 0) / 12;
  const bills = Math.max(0, i.billsMonthly || 0);
  const total = leaveIncome + partnerIncome;
  const shareDuring = total > 0 ? leaveIncome / total : 0.5;
  const before = leaveNormal + partnerIncome;
  const shareBefore = before > 0 ? leaveNormal / before : 0.5;
  const pooledLeft = total - bills;
  const half = share(leaveIncome, partnerIncome, bills / 2, bills);
  return {
    months, leaveIncome, partnerIncome, leaveNormal, bills,
    half,
    proportional: share(leaveIncome, partnerIncome, bills * shareDuring, bills),
    equal: share(leaveIncome, partnerIncome, leaveIncome - pooledLeft / 2, bills),
    shareBefore, shareDuring,
    halfShortfall: Math.max(0, -half.leaveLeft) * months,
    pensionGap: Math.max(0, i.pensionRate || 0) * Math.max(0, g.gap),
    householdLeft: pooledLeft * months,
  };
}
