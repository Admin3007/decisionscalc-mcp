import { describe, it, expect } from 'vitest';
import { computeCaEi, eiWeekly, EI_2026 } from './ca-ei-benefit';

describe('Canada EI maternity & parental benefits (2026)', () => {
  it('high earner is capped at the 55% maximum ($729/wk)', () => {
    const r = computeCaEi({ annualIncome: 120000, standardParentalWeeks: 35, extendedParentalWeeks: 61, includeMaternity: true });
    expect(r.standardParental.weeklyAmount).toBe(729);
    expect(r.standardParental.capped).toBe(true);
    expect(r.extendedParental.weeklyAmount).toBe(437); // 33% cap
    expect(r.extendedParental.capped).toBe(true);
  });

  it('income exactly at the MIE hits both caps', () => {
    const r = computeCaEi({ annualIncome: EI_2026.mie, standardParentalWeeks: 0, extendedParentalWeeks: 0, includeMaternity: false });
    expect(r.standardParental.weeklyAmount).toBe(729);
    expect(r.extendedParental.weeklyAmount).toBe(437);
  });

  it('below-cap earner gets 55% / 33% of weekly insurable (not capped)', () => {
    // $40,000/yr → weekly insurable ≈ $769.23; 55% ≈ $423, 33% ≈ $254.
    const r = computeCaEi({ annualIncome: 40000, standardParentalWeeks: 10, extendedParentalWeeks: 10, includeMaternity: false });
    expect(r.weeklyInsurable).toBe(769);
    expect(r.standardParental.weeklyAmount).toBe(Math.round((40000 / 52) * 0.55)); // 423
    expect(r.standardParental.capped).toBe(false);
    expect(r.extendedParental.weeklyAmount).toBe(Math.round((40000 / 52) * 0.33)); // 254
  });

  it('maternity is 15 weeks when included, 0 when not', () => {
    const withMat = computeCaEi({ annualIncome: 120000, standardParentalWeeks: 0, extendedParentalWeeks: 0, includeMaternity: true });
    expect(withMat.maternity.weeks).toBe(15);
    expect(withMat.maternity.total).toBe(729 * 15);
    const noMat = computeCaEi({ annualIncome: 120000, standardParentalWeeks: 0, extendedParentalWeeks: 0, includeMaternity: false });
    expect(noMat.maternity.weeks).toBe(0);
    expect(noMat.maternity.total).toBe(0);
  });

  it('parental weeks are clamped to the per-parent maximums', () => {
    const r = computeCaEi({ annualIncome: 120000, standardParentalWeeks: 99, extendedParentalWeeks: 99, includeMaternity: false });
    expect(r.standardParental.weeks).toBe(EI_2026.standardParentalPerParent); // 35
    expect(r.extendedParental.weeks).toBe(EI_2026.extendedParentalPerParent); // 61
  });

  it('zero / invalid income yields no benefit, no NaN', () => {
    const r = computeCaEi({ annualIncome: 0, standardParentalWeeks: 35, extendedParentalWeeks: 61, includeMaternity: true });
    expect(r.standardParental.weeklyAmount).toBe(0);
    expect(r.maternity.total).toBe(0);
    expect(Number.isFinite(r.weeklyInsurable)).toBe(true);
  });

  it('eiWeekly caps correctly at the boundary', () => {
    expect(eiWeekly(1325, 0.55, 729).amount).toBe(729); // MIE/52 * .55 = 728.75 → 729 cap
    expect(eiWeekly(1000, 0.55, 729)).toEqual({ amount: 550, capped: false });
  });
});
