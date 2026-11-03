import { describe, it, expect } from 'vitest';
import { WFP_LIMITS_2026, WFP_2027_INCREASE, WFP_RATE, WFP_MIN, MIN_HOURS_FORTNIGHT, limitFor, computeWfp } from './ie-wfp';

const base = { year: 2026 as const, children: 1, couple: false, pay1: 30000, hoursFortnight: 78 };

describe('Working Family Payment (Citizens Information, read 2026-11-03)', () => {
  it('pins the official limits and rules', () => {
    expect([...WFP_LIMITS_2026]).toEqual([765, 866, 967, 1058, 1184, 1300, 1436, 1532]);
    expect([WFP_2027_INCREASE, WFP_RATE, WFP_MIN, MIN_HOURS_FORTNIGHT]).toEqual([30, 0.6, 20, 38]);
    expect(limitFor(1, 2027)).toBe(795);
    expect(limitFor(12, 2026)).toBe(1532);
    expect(limitFor(0, 2026)).toBe(765);
  });

  it('single parent on €30,000 with 1 child, 2026 (hand-worked: net €542.23/wk, WFP €133.66/wk)', () => {
    // Tax 6,000 − (2,000 + 2,000 + 1,900) = 100; USC 432.82; PRSI 1,271.25; take-home 28,195.93 = 542.23/wk.
    const r = computeWfp(base);
    expect(r.netPayWeekly).toBe(542.23);
    expect(r.weekly).toBe(133.66);
    expect(r.yearly).toBe(6950.44); // 60% x (765 - 542.2294) = 133.6623 a week x 52
  });

  it('pension contributions reduce assessable income and raise WFP', () => {
    const a = computeWfp(base);
    const b = computeWfp({ ...base, pension: 1040 });
    expect(b.assessableWeekly).toBeCloseTo(a.assessableWeekly - 20, 2);
    expect(b.weekly).toBeCloseTo(a.weekly + 12, 1);
  });

  it('pays the €20 minimum just under the limit, and nothing at or over it', () => {
    const near = computeWfp({ ...base, pay1: 0, otherWeekly: 760 });
    expect(near.weekly).toBe(20);
    const over = computeWfp({ ...base, pay1: 0, otherWeekly: 765 });
    expect(over.weekly).toBe(0);
  });

  it('needs 38 hours a fortnight', () => {
    expect(computeWfp({ ...base, hoursFortnight: 37 }).weekly).toBe(0);
    expect(computeWfp({ ...base, hoursFortnight: 37 }).eligibleHours).toBe(false);
  });

  it('2027: limits +€30, so the same family gets about €18 a week more (60% of €30, less any tax change)', () => {
    const a = computeWfp(base);
    const b = computeWfp({ ...base, year: 2027 });
    expect(b.limit - a.limit).toBe(30);
    expect(b.weekly).toBeGreaterThan(a.weekly + 10);
  });

  it('a couple’s pay is combined', () => {
    const one = computeWfp({ ...base, couple: true, pay1: 30000, pay2: 0, children: 2 });
    const two = computeWfp({ ...base, couple: true, pay1: 30000, pay2: 15000, children: 2 });
    expect(two.assessableWeekly).toBeGreaterThan(one.assessableWeekly);
    expect(two.weekly).toBeLessThan(one.weekly);
  });

  it('survives bad input', () => {
    const r = computeWfp({ year: 2026, children: NaN as any, couple: true, pay1: -5 as any, hoursFortnight: NaN as any });
    expect(Number.isFinite(r.weekly)).toBe(true);
  });
});
