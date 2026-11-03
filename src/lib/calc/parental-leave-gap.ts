/**
 * Parental leave income gap for one parent (the free calculator on /parental-leave-planner/).
 * Same rules as the paid workbook (scripts/gen-leave-planner.mjs), read 3 November 2026:
 *  - gb: SMP 90% of average weekly earnings for 6 weeks, then £194.32 or 90% (lower) to week 39;
 *    average at least £129 a week to qualify (gov.uk).
 *  - au: Parental Leave Pay $1,004.70 per 5-day week (2026-27), up to 22 weeks for a partnered
 *    birth parent (26 for the family, 4 reserved for the partner) (Services Australia).
 *  - ie: Maternity Benefit €299 a week (2026), €309 from January 2027, 26 weeks (citizensinformation.ie).
 *  - ca: EI 1 unpaid waiting week, 15 weeks maternity + up to 35 standard parental at 55% up to
 *    $729 (2026) (canada.ca).
 *  - qc: QPIP basic plan 18 weeks at 70% + 32 shareable (7 at 70%, 25 at 55%), earnings up to
 *    $103,000 (2026), no waiting week (quebec.ca).
 * The free version uses one flat rate per country (the rate in force for most of a 2027 leave);
 * the workbook applies each week's dated rate.
 */
export type LeaveCountry = 'gb' | 'au' | 'ie' | 'ca' | 'qc';

export const LEAVE_RULES = {
  gb: { flat: 194.32, lel: 129, weeks: 39, high: 6, pct: 0.9 },
  au: { weekly: 1004.70, weeks: 22 },
  ie: { weekly: 309, weeks: 26 },
  ca: { wait: 1, mat: 15, parental: 35, pct: 0.55, max: 729 },
  qc: { mie: 103000, mat: 18, share: 32, hiWeeks: 7, hi: 0.7, lo: 0.55 },
} as const;

export interface LeaveInput {
  country: LeaveCountry;
  /** Gross annual pay before leave. */
  salary: number;
  /** Weeks of leave. */
  weeks: number;
  /** Employer top-up: pay made up to this share of normal pay (0..1). */
  topUp?: number;
  /** Weeks the top-up lasts. */
  topUpWeeks?: number;
}

export interface LeaveResult {
  /** Statutory pay for each week of leave. */
  weekly: number[];
  statutory: number;
  topUp: number;
  normal: number;
  /** Normal pay minus leave pay over the leave (gross). */
  gap: number;
  paidWeeks: number;
}

/** Statutory pay in leave week k (1-based). */
export function statutoryWeek(country: LeaveCountry, salary: number, k: number): number {
  const wk = salary / 52;
  switch (country) {
    case 'gb': {
      const R = LEAVE_RULES.gb;
      if (wk < R.lel || k > R.weeks) return 0;
      return k <= R.high ? R.pct * wk : Math.min(R.flat, R.pct * wk);
    }
    case 'au': return k <= LEAVE_RULES.au.weeks ? LEAVE_RULES.au.weekly : 0;
    case 'ie': return k <= LEAVE_RULES.ie.weeks ? LEAVE_RULES.ie.weekly : 0;
    case 'ca': {
      const R = LEAVE_RULES.ca;
      if (k <= R.wait || k > R.wait + R.mat + R.parental) return 0;
      return Math.min(R.pct * wk, R.max);
    }
    case 'qc': {
      const R = LEAVE_RULES.qc;
      const ins = Math.min(salary, R.mie) / 52;
      if (k <= R.mat) return 0.7 * ins;
      const j = k - R.mat;
      if (j > R.share) return 0;
      return (j <= R.hiWeeks ? R.hi : R.lo) * ins;
    }
  }
}

export function leaveGap(input: LeaveInput): LeaveResult {
  const salary = Math.max(0, input.salary || 0);
  const weeks = Math.max(0, Math.min(104, Math.round(input.weeks || 0)));
  const wk = salary / 52;
  const top = Math.max(0, input.topUp || 0);
  const topWeeks = Math.max(0, input.topUpWeeks || 0);
  const weekly: number[] = [];
  let statutory = 0, topUp = 0, paidWeeks = 0;
  for (let k = 1; k <= weeks; k++) {
    const s = statutoryWeek(input.country, salary, k);
    const t = k <= topWeeks ? Math.max(0, top * wk - s) : 0;
    weekly.push(s);
    statutory += s;
    topUp += t;
    if (s > 0) paidWeeks++;
  }
  const normal = wk * weeks;
  return { weekly, statutory, topUp, normal, gap: normal - statutory - topUp, paidWeeks };
}
