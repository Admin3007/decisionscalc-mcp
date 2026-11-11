import { describe, it, expect } from 'vitest';
import { BANDS_LONG, BANDS_SHORT, MIN_RATE, JB_RATES, JA_MAX, firstMonday, earningsWindow, jprbRate, jbRate, jbRedundancyWeeks, computeJprb } from './ie-jobseekers-pay-related';

const base = { lastDayOfWork: '2026-10-30', earnings: 1000, earningsPeriod: 'week' as const, totalPaidContributions: 400, dateOfBirth: '1985-06-01' };

describe("Jobseeker's Pay-Related Benefit (gov.ie DSP + Citizens Information, read 2026-11-04)", () => {
  it('pins the official rates, caps and minimum', () => {
    expect(BANDS_LONG.map((b) => [b.from, b.to, b.pct, b.cap])).toEqual([[1, 13, 0.6, 450], [14, 26, 0.55, 375], [27, 39, 0.5, 300]]);
    expect(BANDS_SHORT.map((b) => [b.from, b.to, b.pct, b.cap])).toEqual([[1, 26, 0.5, 300]]);
    expect(MIN_RATE).toBe(125);
    expect(JB_RATES[2026].map((b) => b.rate)).toEqual([254, 198.9, 163.7, 114]);
    expect(JB_RATES[2027][0].rate).toBe(264);
    expect(JA_MAX[2027]).toEqual({ under25: 173.7, over25: 264 });
  });

  it("gov.ie example: job lost Monday 7 April 2025 → earnings 10 February 2024 to 10 February 2025", () => {
    expect(earningsWindow('2025-04-07')).toEqual({ start: '2024-02-10', end: '2025-02-10' });
  });

  it('Citizens Information example: job lost 15 December 2025 → earnings 20 October 2024 to 20 October 2025', () => {
    expect(earningsWindow('2025-12-15')).toEqual({ start: '2024-10-20', end: '2025-10-20' });
  });

  it('paid from the first Monday of unemployment (DSP: unemployed on a Wednesday → the following Monday)', () => {
    expect(firstMonday('2026-11-04')).toBe('2026-11-09'); // Wednesday
    expect(firstMonday('2025-03-28')).toBe('2025-03-31'); // Friday 28 March 2025 → scheme start, Monday 31 March
    expect(firstMonday('2026-11-08')).toBe('2026-11-09'); // Sunday
    expect(firstMonday('2026-11-09')).toBe('2026-11-16'); // a Monday worked → the next Monday
  });

  it('weekly rate by band, cap and minimum', () => {
    expect([1, 13, 14, 26, 27, 39].map((w) => jprbRate(1000, w, true))).toEqual([450, 450, 375, 375, 300, 300]);
    expect([1, 14, 27].map((w) => jprbRate(500, w, true))).toEqual([300, 275, 250]);
    expect(jprbRate(500, 1, false)).toBe(250);
    expect(jprbRate(180, 1, true)).toBe(125); // 60% = €108 → minimum €125
    expect(jprbRate(750, 1, true)).toBe(450); // exactly at the cap
  });

  it('260+ contributions: 39 weeks, €14,625 at €1,000 a week, a credit each week', () => {
    const r = computeJprb(base);
    expect(r.eligible).toBe(true);
    expect(r.firstMonday).toBe('2026-11-02');
    expect(r.paidWeeks).toBe(39);
    expect(r.total).toBe(450 * 13 + 375 * 13 + 300 * 13);
    expect(r.phases.map((p) => p.total)).toEqual([5850, 4875, 3900]);
    expect(r.credits).toBe(39);
    expect(r.cappedWeeks).toBe(39);
    expect(r.capEarnings).toEqual([750, 681.82, 600]);
  });

  it('104–259 contributions: 26 weeks at 50% up to €300', () => {
    const r = computeJprb({ ...base, earnings: 26000, earningsPeriod: 'year', totalPaidContributions: 150 });
    expect(r.avgWeekly).toBe(500);
    expect(r.paidWeeks).toBe(26);
    expect(r.total).toBe(250 * 26);
  });

  it('yearly earnings are divided by the weeks of PRSI paid in that year', () => {
    expect(computeJprb({ ...base, earnings: 30000, earningsPeriod: 'year', weeksPaid: 40 }).avgWeekly).toBe(750);
  });

  it('not payable: under 104 contributions, under 26 recent weeks, or applying after 6 weeks', () => {
    expect(computeJprb({ ...base, totalPaidContributions: 103 }).eligible).toBe(false);
    expect(computeJprb({ ...base, earningsPeriod: 'year', earnings: 20000, weeksPaid: 25 }).eligible).toBe(false);
    expect(computeJprb({ ...base, applyAfterWeeks: 6 }).eligible).toBe(true);
    const late = computeJprb({ ...base, applyAfterWeeks: 7 });
    expect(late.eligible).toBe(false);
    expect(late.total).toBe(0);
    expect(computeJprb({ ...base, lastDayOfWork: '2025-03-27' }).eligible).toBe(false);
  });

  it('redundancy: no effect on JPRB; the old JB table for under-55s', () => {
    const r = computeJprb({ ...base, redundancyLumpSum: 72000 });
    expect(r.total).toBe(computeJprb(base).total);
    expect(r.redundancy.oldJbDisqualificationWeeks).toBe(5);
    expect(jbRedundancyWeeks(50000, 40)).toBe(0);
    expect(jbRedundancyWeeks(50000.01, 40)).toBe(1);
    expect(jbRedundancyWeeks(95000, 40)).toBe(9);
    expect(jbRedundancyWeeks(95000, 55)).toBe(0);
  });

  it('part-time days: Jobseeker’s Benefit for the other days, 1/5 off per day worked, weeks count towards the 39', () => {
    const r = computeJprb({ ...base, partTimeDays: 2, partTimeFromWeek: 5 });
    expect(r.weeks[3].scheme).toBe('JPRB');
    expect(r.weeks[4]).toMatchObject({ scheme: 'JB', rate: 152.4 }); // €254 × 3/5 (November 2026)
    expect(r.weeks.find((w) => w.start >= '2027-01-04')!.rate).toBe(158.4); // €264 × 3/5
    expect(r.paidWeeks).toBe(39);
    expect(jbRate(299.99, 2026)).toBe(198.9);
    expect(jbRate(149, 2026)).toBe(114);
  });

  it('age: stops the day before 66; 65 with 156+ contributions runs on to 66; 66+ only when deferring, with no credits', () => {
    const at65 = computeJprb({ ...base, dateOfBirth: '1961-02-01', totalPaidContributions: 300 });
    // 66 on 1 Feb 2027: only the full weeks before then are paid.
    expect(at65.weeks.at(-1)!.start <= '2027-01-25').toBe(true);
    expect(at65.paidWeeks).toBe(13);
    const long65 = computeJprb({ ...base, dateOfBirth: '1961-12-01', totalPaidContributions: 300 }); // 66 on 1 Dec 2027
    expect(long65.extended).toBe(true);
    expect(long65.paidWeeks).toBeGreaterThan(39);
    expect(long65.weeks.at(-1)!.rate).toBe(300);
    expect(computeJprb({ ...base, dateOfBirth: '1960-01-01' }).eligible).toBe(false);
    const deferring = computeJprb({ ...base, dateOfBirth: '1960-01-01', deferringStatePension: true });
    expect(deferring.eligible).toBe(true);
    expect(deferring.credits).toBe(0);
  });

  it('compares the old flat-rate JB (3 waiting days) and the JA maximum', () => {
    const r = computeJprb({ ...base, earnings: 400 });
    expect(r.oldJb.weekly).toBe(254);
    expect(r.total).toBe(240 * 13 + 220 * 13 + 200 * 13);
    expect(r.jaWeeksHigher).toBe(39); // €254/€264 beats every week at €400 pay, if the means test is passed
    expect(r.oldJb.total).toBeGreaterThan(r.total);
  });

  it('survives bad input', () => {
    const r = computeJprb({ lastDayOfWork: 'nope', earnings: NaN as any, earningsPeriod: 'year', totalPaidContributions: -5 as any, weeksPaid: 0 });
    expect(Number.isFinite(r.total)).toBe(true);
    expect(r.eligible).toBe(false);
  });
});
