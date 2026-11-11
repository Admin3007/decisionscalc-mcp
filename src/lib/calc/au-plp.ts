/**
 * Australian Parental Leave Pay for a couple (overhaul C7). Pure + tested.
 * Services Australia (read 8 Nov 2026): children born or adopted from 1 July 2026 get 130 days (26 weeks of 5 days)
 * per family, paid at the National Minimum Wage rate: $200.94 a day ($1,004.70 for a 5-day week; checked 29 Oct 2026,
 * src/data/packs/au.ts). It is taxable. For births and adoptions from 1 July 2025 the ATO pays superannuation at the
 * Superannuation Guarantee rate (12%) on it, after the end of the financial year.
 * Not modelled: the days reserved for each parent (not confirmed on an official page when read), the income test,
 * and flexible days taken part-time.
 */
export const PLP_DAILY = 200.94;
export const PLP_DAYS = 130;
export const SUPER_RATE = 0.12;

export interface PlpParent { weeklyPay: number; plpWeeks: number; employerFullWeeks?: number; }
export interface PlpInput { parents: PlpParent[]; }
export interface PlpParentResult { plp: number; superOnPlp: number; employer: number; normalPay: number; gap: number; weeks: number; }
export interface PlpResult { parents: PlpParentResult[]; daysUsed: number; daysLeft: number; over: boolean; totalPlp: number; totalGap: number; }

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computePlp(input: PlpInput): PlpResult {
  const parents = input.parents.map((p) => {
    const weeks = Math.max(0, p.plpWeeks || 0);
    const plp = weeks * 5 * PLP_DAILY;
    // Employer full pay usually runs alongside or before PLP; here it covers the gap for its weeks.
    const fullWeeks = Math.min(weeks, Math.max(0, p.employerFullWeeks || 0));
    const pay = Math.max(0, p.weeklyPay || 0);
    const employer = fullWeeks * Math.max(0, pay - 5 * PLP_DAILY);
    const normalPay = weeks * pay;
    return { plp: r2(plp), superOnPlp: r2(plp * SUPER_RATE), employer: r2(employer), normalPay: r2(normalPay), gap: r2(Math.max(0, normalPay - plp - employer)), weeks };
  });
  const daysUsed = parents.reduce((a, p) => a + p.weeks * 5, 0);
  return {
    parents,
    daysUsed,
    daysLeft: Math.max(0, PLP_DAYS - daysUsed),
    over: daysUsed > PLP_DAYS,
    totalPlp: r2(parents.reduce((a, p) => a + p.plp, 0)),
    totalGap: r2(parents.reduce((a, p) => a + p.gap, 0)),
  };
}
