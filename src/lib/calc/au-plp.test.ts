import { describe, it, expect } from 'vitest';
import { computePlp, PLP_DAILY, PLP_DAYS } from './au-plp';
import pack from '../../data/packs/au';

describe('Australian Parental Leave Pay (130 days from 1 July 2026)', () => {
  it('the daily rate matches the checked figure in the AU pack', () => {
    expect((pack as any)['baby-cost-planner'].data.leaveNote).toContain(`$${PLP_DAILY}`);
  });
  it('22 + 4 weeks between two parents: all 130 days, $26,122.20 in total', () => {
    const r = computePlp({ parents: [{ weeklyPay: 1600, plpWeeks: 22 }, { weeklyPay: 2000, plpWeeks: 4 }] });
    expect(r.daysUsed).toBe(130);
    expect(r.over).toBe(false);
    expect(r.totalPlp).toBe(Math.round(130 * PLP_DAILY * 100) / 100);
    expect(r.parents[0].superOnPlp).toBe(Math.round(22 * 5 * PLP_DAILY * 0.12 * 100) / 100);
    expect(r.parents[0].gap).toBe(Math.round((22 * 1600 - 22 * 5 * PLP_DAILY) * 100) / 100);
  });
  it('more than 130 days between the parents is flagged', () => {
    expect(computePlp({ parents: [{ weeklyPay: 1500, plpWeeks: 26 }, { weeklyPay: 1500, plpWeeks: 2 }] }).over).toBe(true);
  });
  it('an employer paying full pay closes the gap for those weeks', () => {
    const r = computePlp({ parents: [{ weeklyPay: 2000, plpWeeks: 10, employerFullWeeks: 10 }] });
    expect(r.parents[0].gap).toBe(0);
  });
});

// Overhaul D2: Services Australia "How much Parental Leave Pay you can get" (read 8 Nov 2026): 2026-27 rate
// "$200.94 a day before tax, or $1,004.70 per 5 day week"; 130 days for births from 1 July 2026.
describe('Services Australia published rate', () => {
  it('Services Australia: $200.94 a day = $1,004.70 per 5-day week; 130 days', () => {
    expect(PLP_DAILY).toBe(200.94);
    expect(Math.round(PLP_DAILY * 5 * 100) / 100).toBe(1004.7);
    expect(PLP_DAYS).toBe(130);
  });
});
