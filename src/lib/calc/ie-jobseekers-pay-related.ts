/**
 * Ireland: Jobseeker's Pay-Related Benefit (JPRB), week by week, with the part-time (Jobseeker's Benefit) days,
 * the old flat-rate Jobseeker's Benefit and Jobseeker's Allowance for comparison.
 * Official sources (read 2026-11-04):
 *  - gov.ie (DSP) "Operational Guidelines: Jobseeker's Pay-Related Benefit" (last updated 21 August 2026):
 *    fully unemployed on or after 31 March 2025 (last day of work on or after Friday 28 March 2025); PRSI:
 *    104 paid A/H/P since starting work, 4 paid A/H in the 10 contribution weeks before the week you apply,
 *    26 paid A/H in the 52 weeks before unemployment; paid from the first Monday of unemployment (unemployed on a
 *    Wednesday → paid from the following Monday); 260+ paid contributions: weeks 1–13 60% of gross average
 *    earnings up to €450, weeks 14–26 55% up to €375, weeks 27–39 50% up to €300; 104–259: 26 weeks at 50% up to
 *    €300; minimum €125; reckonable weekly earnings = gross earnings in the 52 weeks ending 8 weeks before
 *    unemployment ÷ Class A/H contributions paid in that period; break up to 13 weeks and resume; late claims:
 *    backdated up to 6 weeks, after that only with good cause (6 months at most), and not payable without the
 *    4-in-10 condition; aged 65–66 not retired with 156+ paid contributions: paid beyond 39/26 weeks up to 66;
 *    66–70 (born on/after 1 January 1958) only while State Pension (Contributory) is deferred, with no credits and
 *    no Optional Jobseeker's Allowance; a credit for each week paid; redundancy payment: no disqualification;
 *    part-time or casual work up to 3 days a week → Jobseeker's Benefit at the rate set by the JPRB earnings, and
 *    time on Jobseeker's Benefit or Allowance counts as JPRB paid.
 *  - gov.ie (DSP) "Jobseeker's Pay-Related Benefit" (last updated 25 March 2026): the same rates and durations;
 *    worked example: job lost Monday 7 April 2025 → look back to 10 February 2025 → earnings 10 February 2024 to
 *    10 February 2025; apply within 6 weeks of losing your job.
 *  - citizensinformation.ie "Jobseeker's Pay-Related Benefit" (edited 16 October 2026): "In 2026" rates as above;
 *    example: job lost 15 December 2025 → 20 October 2025 → earnings 20 October 2024 to 20 October 2025.
 *    No Budget 2027 change to JPRB is listed there or on "Social welfare rates 2027" (edited 7 October 2026).
 *  - citizensinformation.ie "Jobseeker's Benefit" (edited 27 October 2026): 2026 rates by average weekly earnings
 *    €300+ €254, €220–€299.99 €198.90, €150–€219.99 €163.70, under €150 €114; Budget 2027: maximum +€10 from
 *    January 2027 (€264) with proportional increases for reduced rates (amounts not yet published); 5-day payment
 *    week, 1/5 deducted for each day worked; 3 waiting days; 234 days (260+ paid contributions) or 156 days;
 *    under 55 with a redundancy payment over €50,000: up to 9 weeks' disqualification (table below).
 *  - citizensinformation.ie "Social welfare rates 2027": Jobseeker's Allowance €254 → €264 (25 and over),
 *    €163.70 → €173.70 (under 25).
 */

export const SCHEME_START = '2025-03-28'; // last day of work on or after this date
export const MIN_RATE = 125;
export const BANDS_LONG = [ // 260+ paid contributions
  { from: 1, to: 13, pct: 0.6, cap: 450 },
  { from: 14, to: 26, pct: 0.55, cap: 375 },
  { from: 27, to: 39, pct: 0.5, cap: 300 },
] as const;
export const BANDS_SHORT = [{ from: 1, to: 26, pct: 0.5, cap: 300 }] as const; // 104–259
export const LOOKBACK_DAYS = 56; // 8 weeks before the job ended
export const APPLY_WITHIN_WEEKS = 6;
export const BREAK_RESUME_WEEKS = 13;

/** Jobseeker's Benefit personal rate by average weekly earnings. 2027 reduced rates are not yet published. */
export const JB_RATES: Record<2026 | 2027, { min: number; rate: number }[]> = {
  2026: [{ min: 300, rate: 254 }, { min: 220, rate: 198.9 }, { min: 150, rate: 163.7 }, { min: 0, rate: 114 }],
  2027: [{ min: 300, rate: 264 }, { min: 220, rate: 198.9 }, { min: 150, rate: 163.7 }, { min: 0, rate: 114 }],
};
export const JA_MAX: Record<2026 | 2027, { under25: number; over25: number }> = {
  2026: { under25: 163.7, over25: 254 },
  2027: { under25: 173.7, over25: 264 },
};
/** Old Jobseeker's Benefit, under 55: recommended disqualification by redundancy payment (weeks). */
export const JB_REDUNDANCY_WEEKS: { over: number; weeks: number }[] = [
  { over: 90000, weeks: 9 }, { over: 85000, weeks: 8 }, { over: 80000, weeks: 7 }, { over: 75000, weeks: 6 },
  { over: 70000, weeks: 5 }, { over: 65000, weeks: 4 }, { over: 60000, weeks: 3 }, { over: 55000, weeks: 2 }, { over: 50000, weeks: 1 },
];

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;
const DAY = 86400000;

/** Dates are plain YYYY-MM-DD strings, handled in UTC so time zones never shift a day. */
const parse = (s: string) => { const t = Date.parse(`${s}T00:00:00Z`); return Number.isFinite(t) ? t : NaN; };
export const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (s: string, d: number) => iso(parse(s) + d * DAY);
export function addYears(s: string, y: number): string {
  const d = new Date(parse(s));
  d.setUTCFullYear(d.getUTCFullYear() + y);
  return iso(d.getTime());
}
/** First Monday strictly after the last day of work (gov.ie: unemployed Wednesday → paid from the next Monday). */
export function firstMonday(lastDay: string): string {
  const t = parse(lastDay);
  const dow = new Date(t).getUTCDay(); // 0 Sun … 1 Mon
  const ahead = ((8 - dow) % 7) || 7;
  return iso(t + ahead * DAY);
}
/** The 12 months of earnings the Department averages: they end 8 weeks before the job ended. */
export function earningsWindow(lastDay: string) {
  const end = addDays(lastDay, -LOOKBACK_DAYS);
  return { start: addYears(end, -1), end };
}
/** Age in whole years on a date. */
export function ageOn(dob: string, on: string): number {
  const a = new Date(parse(dob)), b = new Date(parse(on));
  let age = b.getUTCFullYear() - a.getUTCFullYear();
  if (b.getUTCMonth() < a.getUTCMonth() || (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate())) age--;
  return age;
}

/** JPRB weekly rate for benefit week `week` (1-based). Weeks past 39/26 (the 65–66 extension) keep the last band. */
export function jprbRate(avgWeekly: number, week: number, long: boolean): number {
  const bands = long ? BANDS_LONG : BANDS_SHORT;
  const b = bands.find((x) => week >= x.from && week <= x.to) ?? bands[bands.length - 1];
  return r2(Math.max(MIN_RATE, Math.min(b.cap, n(avgWeekly) * b.pct)));
}
const yearOf = (d: string): 2026 | 2027 => (d >= '2027-01-01' ? 2027 : 2026);
export function jbRate(avgWeekly: number, year: 2026 | 2027): number {
  return JB_RATES[year].find((b) => n(avgWeekly) >= b.min)!.rate;
}
export function jbRedundancyWeeks(lumpSum: number, age: number): number {
  if (age >= 55) return 0;
  return JB_REDUNDANCY_WEEKS.find((b) => n(lumpSum) > b.over)?.weeks ?? 0;
}

export interface JprbInput {
  /** Last day you worked (YYYY-MM-DD). */
  lastDayOfWork: string;
  /** Gross earnings before tax, per week or per year. */
  earnings: number;
  earningsPeriod: 'week' | 'year';
  /** Weeks of PRSI paid in the 12 months the Department looks at (yearly earnings are divided by this). */
  weeksPaid?: number;
  /** Class A/H/P contributions paid since you started work (MyWelfare contribution statement). */
  totalPaidContributions: number;
  dateOfBirth?: string;
  /** Aged 66–70 only: you have not drawn your State Pension (Contributory). */
  deferringStatePension?: boolean;
  /** How many weeks after your last day of work you apply. */
  applyAfterWeeks?: number;
  redundancyLumpSum?: number;
  /** Part-time or casual work, days a week (0–3), from this benefit week on: paid as Jobseeker's Benefit. */
  partTimeDays?: number;
  partTimeFromWeek?: number;
}

export interface JprbWeek {
  week: number;
  start: string;            // Monday the week starts
  scheme: 'JPRB' | 'JB';
  rate: number;             // paid that week
  fullRate: number;         // JPRB rate for that week if fully unemployed
  ja: number;               // Jobseeker's Allowance maximum that week (means-tested, for comparison)
  credit: boolean;          // PRSI credit awarded
  cumulative: number;
}

export function computeJprb(i: JprbInput) {
  const lastDay = Number.isFinite(parse(i.lastDayOfWork)) ? i.lastDayOfWork : '2026-10-30';
  const weeksPaid = Math.min(52, Math.max(1, Math.round(n(i.weeksPaid ?? 52)) || 52));
  const avgWeekly = r2(i.earningsPeriod === 'year' ? n(i.earnings) / weeksPaid : n(i.earnings));
  const total = Math.round(n(i.totalPaidContributions));
  const start = firstMonday(lastDay);
  const window = earningsWindow(lastDay);
  const applyBy = addDays(lastDay, APPLY_WITHIN_WEEKS * 7);
  const dob = i.dateOfBirth && Number.isFinite(parse(i.dateOfBirth)) ? i.dateOfBirth : null;
  const age = dob ? ageOn(dob, start) : 40;
  const delay = n(i.applyAfterWeeks);
  const long = total >= 260;
  const entitlement = long ? 39 : 26;
  const redundancy = n(i.redundancyLumpSum);

  const reasons: string[] = [];
  if (lastDay < SCHEME_START) reasons.push('Your job ended before 28 March 2025, so the old Jobseeker’s Benefit applies, not the pay-related one.');
  if (total < 104) reasons.push(`You need at least 104 paid PRSI contributions since you started work; you have ${total}.`);
  if (weeksPaid < 26) reasons.push(`You need at least 26 weeks of PRSI paid in the 52 weeks before you became unemployed; you entered ${weeksPaid}.`);
  if (delay > APPLY_WITHIN_WEEKS) reasons.push(`Applying ${delay} weeks after your job ended is too late: you need 4 weeks of PRSI paid in the 10 weeks before you apply, so apply within ${APPLY_WITHIN_WEEKS} weeks.`);
  if (age >= 70) reasons.push('Jobseeker’s Pay-Related Benefit is for people under 70.');
  else if (age >= 66 && !i.deferringStatePension) reasons.push('At 66 or over you can only get it while you defer your State Pension (Contributory).');
  const eligible = reasons.length === 0;

  // The last day it can be paid: the day before 66 (or 70 when the State Pension is deferred).
  const limitAge = age >= 66 ? 70 : 66;
  const cutoff = dob ? addDays(addYears(dob, limitAge), -1) : '9999-12-31';
  // Aged 65–66, not retired, with 156+ paid contributions: payable on to 66 after the 39/26 weeks run out.
  const extendTo66 = dob && age < 66 && total >= 156 ? addDays(addYears(dob, 66), -1) : null;

  const ptDays = Math.min(3, Math.round(n(i.partTimeDays)));
  const ptFrom = Math.max(1, Math.round(n(i.partTimeFromWeek) || 1));

  const weeks: JprbWeek[] = [];
  let cumulative = 0;
  if (eligible) {
    for (let w = 1; w <= 200; w++) {
      const ws = addDays(start, (w - 1) * 7);
      if (addDays(ws, 6) > cutoff) break; // only full weeks before the age limit
      if (w > entitlement && !(extendTo66 && ageOn(dob!, ws) >= 65 && addDays(ws, 6) <= extendTo66)) break;
      const y = yearOf(ws);
      const fullRate = jprbRate(avgWeekly, w, long);
      const onJb = ptDays > 0 && w >= ptFrom;
      const rate = onJb ? r2((jbRate(avgWeekly, y) * (5 - ptDays)) / 5) : fullRate;
      cumulative = r2(cumulative + rate);
      const ja = ageOn(dob ?? '1986-01-01', ws) < 25 ? JA_MAX[y].under25 : JA_MAX[y].over25;
      weeks.push({ week: w, start: ws, scheme: onJb ? 'JB' : 'JPRB', rate, fullRate, ja, credit: age < 66, cumulative });
    }
  }

  // Old flat-rate Jobseeker's Benefit for the same person (fully unemployed, before 28 March 2025 rules, today's rates).
  const oldWeeks = long ? 39 : 26; // 234 or 156 days of a 6-day week
  const oldDisq = jbRedundancyWeeks(redundancy, age);
  let oldTotal = 0;
  for (let w = 1; w <= oldWeeks - oldDisq; w++) oldTotal += jbRate(avgWeekly, yearOf(addDays(start, (w - 1) * 7)));
  oldTotal = r2(oldTotal - jbRate(avgWeekly, yearOf(start)) / 2); // 3 waiting days unpaid

  const bands: readonly { from: number; to: number; pct: number; cap: number }[] = long ? BANDS_LONG : BANDS_SHORT;
  const bandOf = (week: number) => bands.find((x) => week <= x.to) ?? bands[bands.length - 1];
  const phases = bands.map((b, k) => {
    const ws = weeks.filter((x) => x.week >= b.from && (x.week <= b.to || k === bands.length - 1));
    return { from: b.from, to: b.to, pct: b.pct, cap: b.cap, weekly: jprbRate(avgWeekly, b.from, long), weeks: ws.length, total: r2(ws.reduce((s, x) => s + x.rate, 0)) };
  });

  return {
    eligible, reasons,
    avgWeekly, weeksPaid, long, entitlementWeeks: entitlement,
    firstMonday: start, earningsWindow: window, applyBy,
    age,
    /** JPRB weeks where the cap, or the €125 minimum, sets the rate. */
    cappedWeeks: weeks.filter((w) => w.scheme === 'JPRB' && avgWeekly * bandOf(w.week).pct > bandOf(w.week).cap).length,
    minimumWeeks: weeks.filter((w) => w.scheme === 'JPRB' && avgWeekly * bandOf(w.week).pct < MIN_RATE).length,
    /** Gross weekly pay above which each band's cap applies (€750, €681.82, €600). */
    capEarnings: bands.map((b) => r2(b.cap / b.pct)),
    weeks, total: r2(cumulative), paidWeeks: weeks.length,
    credits: weeks.filter((w) => w.credit).length,
    partTime: { days: ptDays, fromWeek: ptFrom, weeks: weeks.filter((w) => w.scheme === 'JB').length },
    phases,
    extended: weeks.length > entitlement,
    redundancy: { lumpSum: redundancy, jprbEffect: 0, oldJbDisqualificationWeeks: oldDisq },
    oldJb: { weekly: jbRate(avgWeekly, yearOf(start)), weeks: oldWeeks - oldDisq, total: eligible ? oldTotal : 0 },
    jaWeeksHigher: weeks.filter((w) => w.ja > w.rate).length,
  };
}
