import { describe, it, expect } from 'vitest';
import { BENEFIT_WEEKLY, MATERNITY_WEEKS, PATERNITY_WEEKS, PARENTS_WEEKS, MATERNITY_UNPAID_MAX, parentLeave, householdLeave } from './ie-parental-leave';

describe('Ireland parental leave pay (Citizens Information + Revenue, read 2026-11-03)', () => {
  it('pins the official rates and weeks', () => {
    expect(BENEFIT_WEEKLY).toEqual({ 2026: 299, 2027: 309 });
    expect([MATERNITY_WEEKS, PATERNITY_WEEKS, PARENTS_WEEKS, MATERNITY_UNPAID_MAX]).toEqual([26, 2, 9, 16]);
  });

  it('mother on €50,000, 26 weeks Maternity Benefit, no top-up, 2026 (hand-worked: gap €10,808.43)', () => {
    // Leave year: wages 25,000 + benefit 7,774 (299 x 26). Income tax 20% x 32,774 - 4,000 credits = 2,554.80.
    // USC and PRSI on wages only (benefit exempt): USC 319.82, PRSI 1,059.38. Take-home 28,840.00.
    const m = parentLeave({ salary: 50000, benefitWeeks: 26, unpaidWeeks: 0, topUpWeeks: 0 }, 2026);
    expect(m.normalTakeHome).toBe(39648.43);
    expect(m.benefitTotal).toBe(7774);
    expect(m.leaveYearTakeHome).toBe(28840);
    expect(m.gap).toBe(10808.43);
  });

  it('benefit is not charged USC or PRSI: a benefit-only year pays income tax only', () => {
    const m = parentLeave({ salary: 0, benefitWeeks: 26, unpaidWeeks: 0, topUpWeeks: 0 }, 2026);
    expect(m.leaveYearTakeHome).toBe(7774); // income tax 1,554.80 is fully covered by the personal + employee credits
  });

  it('full employer top-up for all 26 weeks means no gap', () => {
    const m = parentLeave({ salary: 50000, benefitWeeks: 26, unpaidWeeks: 0, topUpWeeks: 26 }, 2026);
    expect(m.gap).toBe(0);
    expect(m.benefitTotal).toBe(0);
  });

  it('unpaid weeks widen the gap by roughly the lost net pay', () => {
    const a = parentLeave({ salary: 50000, benefitWeeks: 26, unpaidWeeks: 0, topUpWeeks: 0 }, 2026);
    const b = parentLeave({ salary: 50000, benefitWeeks: 26, unpaidWeeks: 16, topUpWeeks: 0 }, 2026);
    expect(b.gap).toBeGreaterThan(a.gap + 16 * 500);
  });

  it('2027 uses €309 a week and the 2027 tax rules', () => {
    const m = parentLeave({ salary: 0, benefitWeeks: 2, unpaidWeeks: 0, topUpWeeks: 0 }, 2027);
    expect(m.benefitTotal).toBe(618);
    expect(m.weeklyBenefit).toBe(309);
  });

  it('household adds both gaps and the monthly saving target', () => {
    const h = householdLeave({ year: 2026, mother: { salary: 50000, unpaidWeeks: 0, topUpWeeks: 0, parents: false }, partner: { salary: 45000, topUpWeeks: 0, parents: false } });
    expect(h.mother.gap).toBe(10808.43);
    expect(h.partner!.gap).toBeGreaterThan(0);
    expect(h.gap).toBeCloseTo(h.mother.gap + h.partner!.gap, 2);
    expect(h.monthlySaving).toBeCloseTo(h.gap / 12, 1);
  });

  it('caps weeks and survives bad input', () => {
    const h = householdLeave({ year: 2026, mother: { salary: NaN as any, unpaidWeeks: 99, topUpWeeks: -3, parents: true }, partner: null });
    expect(Number.isFinite(h.gap)).toBe(true);
    expect(h.partner).toBeNull();
  });
});
