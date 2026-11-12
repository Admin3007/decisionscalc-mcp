/** Rent-a-Room relief against Revenue's Tax and Duty Manual Part 07-01-32 examples (read 8 Nov 2026). */
import { describe, it, expect } from 'vitest';
import { rentARoom, RAR_LIMIT } from './ie-rent-a-room';
import { computeLandlord } from './ie-landlord';

const base = { year: 2026 as const, status: 'single' as const, pay: 50000, months: 12 };

describe('Rent-a-Room relief (TDM 07-01-32)', () => {
  it('limits: €14,000 in 2026, €16,000 from 2027 (Budget 2027)', () => {
    expect(RAR_LIMIT).toEqual({ 2026: 14000, 2027: 16000 });
  });

  it('Example 1: €13,000 gross is exempt; the €1,500 of expenses does not count', () => {
    const r = rentARoom({ ...base, rentMonthly: 13000 / 12, expenses: 1500 });
    expect(r.qualifies).toBe(true);
    expect(r.tax).toBe(0);
    expect(r.gross).toBeCloseTo(13000, 6);
  });

  it('Example 2: €13,000 rent + €1,500 meals = €14,500 is over the limit, so all of it is taxed less expenses', () => {
    const r = rentARoom({ ...base, rentMonthly: 13000 / 12, extrasMonthly: 1500 / 12, expenses: 500 });
    expect(r.gross).toBeCloseTo(14500, 6);
    expect(r.qualifies).toBe(false);
    expect(r.reason).toBe('over-limit');
    const t = computeLandlord({ year: 2026, status: 'single', pay: 50000, rent: 14500, mortgageInterest: 0, rtbRegistered: false, otherExpenses: 500, furnishings: 0 });
    expect(t.profit).toBe(14000);                      // the whole €14,500 less expenses, not the €500 excess
    expect(r.tax).toBeCloseTo(t.totalTax, 6);
    expect(r.keep).toBeLessThan(14000 - 500);          // worse off than staying at the limit
  });

  it('the same €14,500 is exempt in 2027 (limit €16,000)', () => {
    const r = rentARoom({ ...base, year: 2027, rentMonthly: 13000 / 12, extrasMonthly: 1500 / 12 });
    expect(r.qualifies).toBe(true);
    expect(r.headroom).toBeCloseTo(1500, 6);
  });

  it('joint owners split the limit equally', () => {
    const r = rentARoom({ ...base, rentMonthly: 1000, owners: 2 });
    expect(r.limit).toBe(7000);
    expect(r.share).toBe(6000);
    expect(r.qualifies).toBe(true);
    expect(rentARoom({ ...base, rentMonthly: 1250, owners: 2 }).qualifies).toBe(false);
  });

  it('no relief for rent from your child, your employer, or short lets of 28 days or less', () => {
    for (const exclusion of ['child', 'employer', 'short-term'] as const) {
      const r = rentARoom({ ...base, rentMonthly: 500, exclusion });
      expect(r.qualifies).toBe(false);
      expect(r.reason).toBe(exclusion);
      expect(r.tax).toBeGreaterThan(0);
    }
  });

  it('break-even: above the limit you need this much gross to keep what the limit gives you', () => {
    const r = rentARoom({ ...base, rentMonthly: 1300 });
    const at = rentARoom({ ...base, rentMonthly: r.breakEven / 12 });
    expect(r.breakEven).toBeGreaterThan(14000 * 1.5);  // 40% + USC + PRSI on all of it
    expect(at.share - at.tax).toBeCloseTo(14000, -1);
    expect(r.maxRentMonthly).toBeCloseTo(14000 / 12, 6);
  });
});
