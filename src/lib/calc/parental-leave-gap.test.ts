import { describe, it, expect } from 'vitest';
import { leaveGap, statutoryWeek } from './parental-leave-gap';

describe('parental leave gap (free calculator)', () => {
  it('UK: 6 weeks at 90%, then £194.32 to week 39, nothing after', () => {
    const r = leaveGap({ country: 'gb', salary: 52000, weeks: 52 });
    expect(r.statutory).toBeCloseTo(6 * 900 + 33 * 194.32, 6);
    expect(r.paidWeeks).toBe(39);
    expect(r.gap).toBeCloseTo(52000 - (6 * 900 + 33 * 194.32), 6);
  });

  it('UK: below £129 a week, no SMP; low earners get 90% when that is lower than £194.32', () => {
    expect(leaveGap({ country: 'gb', salary: 6000, weeks: 39 }).statutory).toBe(0);
    expect(statutoryWeek('gb', 10400, 10)).toBeCloseTo(180, 6);
  });

  it('Australia: 22 weeks at $1,004.70', () => {
    expect(leaveGap({ country: 'au', salary: 90000, weeks: 26 }).statutory).toBeCloseTo(22 * 1004.70, 6);
  });

  it('Ireland: 26 weeks at €309 (2027 rate)', () => {
    expect(leaveGap({ country: 'ie', salary: 52000, weeks: 42 }).statutory).toBe(26 * 309);
  });

  it('Canada EI: waiting week, then 50 weeks at 55% up to $729', () => {
    const r = leaveGap({ country: 'ca', salary: 80000, weeks: 52 });
    expect(r.weekly[0]).toBe(0);
    expect(r.statutory).toBe(50 * 729);
    expect(leaveGap({ country: 'ca', salary: 52000, weeks: 10 }).statutory).toBeCloseTo(9 * 550, 6);
  });

  it('Quebec QPIP basic: 18 + 7 weeks at 70%, 25 at 55%, earnings capped at $103,000', () => {
    const i = 103000 / 52;
    expect(leaveGap({ country: 'qc', salary: 150000, weeks: 50 }).statutory).toBeCloseTo(25 * 0.7 * i + 25 * 0.55 * i, 6);
  });

  it('employer top-up fills the gap to the chosen share for its weeks', () => {
    const r = leaveGap({ country: 'gb', salary: 52000, weeks: 26, topUp: 1, topUpWeeks: 26 });
    expect(r.gap).toBeCloseTo(0, 6);
  });
});
