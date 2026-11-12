/**
 * Rent-a-Room relief (Ireland), section 216A TCA. Rules from Revenue's Tax and Duty Manual Part 07-01-32 (updated
 * 6 January 2026) and revenue.ie "Rent-a-Room Relief: qualifying conditions", read 8 November 2026; the 2027 limit
 * from gov.ie "Budget 2027 taxation measures" (read 7 November 2026):
 *  - Gross income from letting rooms in your sole or main residence, including meals, cleaning, laundry and similar
 *    services, is exempt from income tax, PRSI and USC up to €14,000 a year (€16,000 from 1 January 2027).
 *  - The test is on GROSS income: no expenses are deducted. Over the limit, ALL of it is taxed in the normal way
 *    (less allowable expenses), not just the amount over (TDM 6.1; Example 2: €14,500 is fully taxable).
 *  - Where more than one individual is entitled to the income, the limit is divided equally between them (TDM 5.1).
 *  - Not available for rent from your child (or your spouse's or civil partner's child), from your employer, or for
 *    letting periods of 28 consecutive days or less (short-term guests, online booking platforms), except students,
 *    respite care and four-day-a-week digs (TDM 3).
 *  - Exempt income must still be entered on your tax return (Exempt Income panel); you can elect out for a year.
 * Tax when over the limit: ./ie-landlord.ts (Case V profit at your marginal rate, USC, PRSI on unearned income);
 * a room in your own home is not an RTB tenancy, so no mortgage interest or RPRIR applies here.
 */
import { computeLandlord, type LandlordStatus } from './ie-landlord';
import type { Year } from './ie-budget-2027';

export const RAR_LIMIT: Record<Year, number> = { 2026: 14000, 2027: 16000 };

export type Exclusion = 'none' | 'child' | 'employer' | 'short-term';

export interface RarInput {
  year: Year;
  status: LandlordStatus;
  /** Your gross pay from employment a year, EUR (for your tax rate when the relief is lost). */
  pay: number;
  spousePay?: number;
  /** Rent a month for the room(s), EUR. */
  rentMonthly: number;
  /** Meals, laundry, cleaning and similar charged a month, EUR. */
  extrasMonthly?: number;
  /** Months let in the year. */
  months: number;
  /** People entitled to the income (joint owners): the limit is split equally. */
  owners?: number;
  /** Your share of expenses (repairs, insurance, extra utilities), EUR a year: only count when the income is taxed. */
  expenses?: number;
  /** Cost of furniture for the let room bought in the last 8 years, EUR (12.5% a year when taxed). */
  furnishings?: number;
  over66?: boolean;
  exclusion?: Exclusion;
}

export interface RarResult {
  gross: number;
  share: number;
  limit: number;
  qualifies: boolean;
  reason: 'under-limit' | 'over-limit' | Exclusion;
  /** Tax on your share if it is taxed (over the limit or excluded), EUR. */
  taxIfTaxed: number;
  /** Tax you actually pay, EUR. */
  tax: number;
  /** Your share less expenses and tax, EUR. */
  keep: number;
  /** Room left under the limit for you, EUR a year (negative = over). */
  headroom: number;
  /** Highest rent a month (with the same extras and months) that stays exempt for every owner. */
  maxRentMonthly: number;
  /** Over the limit: the gross share at which you keep as much as at the limit itself. */
  breakEven: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

export function rentARoom(i: RarInput): RarResult {
  const months = Math.min(12, n(i.months));
  const owners = Math.max(1, Math.round(n(i.owners) || 1));
  const gross = (n(i.rentMonthly) + n(i.extrasMonthly)) * months;
  const share = gross / owners;
  const limit = RAR_LIMIT[i.year] / owners;
  const exclusion = i.exclusion ?? 'none';
  const expenses = n(i.expenses);
  const taxOn = (rent: number) => computeLandlord({ year: i.year, status: i.status, pay: n(i.pay), spousePay: n(i.spousePay), rent, mortgageInterest: 0, rtbRegistered: false, otherExpenses: expenses, furnishings: n(i.furnishings), over66: !!i.over66 }).totalTax;
  const taxIfTaxed = taxOn(share);
  const qualifies = exclusion === 'none' && share <= limit;
  const reason: RarResult['reason'] = exclusion !== 'none' ? exclusion : qualifies ? 'under-limit' : 'over-limit';
  const tax = qualifies ? 0 : taxIfTaxed;
  // Keep at the limit = limit - expenses; above it, find the share where share - expenses - tax equals that.
  let breakEven = 0;
  if (exclusion === 'none') {
    let lo = limit, hi = limit * 3;
    for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (mid - taxOn(mid) < limit) lo = mid; else hi = mid; }
    breakEven = Math.round(hi);
  }
  return {
    gross, share, limit, qualifies, reason, taxIfTaxed, tax,
    keep: share - expenses - tax,
    headroom: limit - share,
    maxRentMonthly: months > 0 ? Math.max(0, RAR_LIMIT[i.year] / months - n(i.extrasMonthly)) : 0,
    breakEven,
  };
}
