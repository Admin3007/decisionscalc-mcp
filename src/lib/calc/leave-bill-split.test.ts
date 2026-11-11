import { describe, it, expect } from 'vitest';
import { billSplit } from './leave-bill-split';

describe('bill split during parental leave', () => {
  // UK: £40,000 salary, 39 weeks of SMP (6 weeks at 90% of £769.23, then £194.32 for 33 weeks), partner £50,000, £2,000 bills.
  const r = billSplit({ country: 'gb', leaveSalary: 40000, weeks: 39, partnerSalary: 50000, billsMonthly: 2000, pensionRate: 0.08 });
  const smp = 6 * 0.9 * (40000 / 52) + 33 * 194.32; // £10,566.40
  const months = 9;

  it('leave income is statutory pay averaged per month', () => {
    expect(r.months).toBeCloseTo(months, 9);
    expect(r.leaveIncome * months).toBeCloseTo(smp, 2);
    expect(r.partnerIncome).toBeCloseTo(50000 / 12, 6);
  });

  it('50/50: covered at £2,000 of bills; the parent on leave draws savings at £3,000', () => {
    expect(r.half.leavePays).toBe(1000);
    expect(r.half.leaveLeft).toBeCloseTo(smp / months - 1000, 6);
    expect(r.halfShortfall).toBe(0);
    const h = billSplit({ country: 'gb', leaveSalary: 40000, weeks: 39, partnerSalary: 50000, billsMonthly: 3000 });
    expect(h.halfShortfall).toBeCloseTo(9 * 1500 - smp, 2); // £2,933.60
  });

  it('proportional: shares by income during leave, and both pay the same share of income', () => {
    const t = r.leaveIncome + r.partnerIncome;
    expect(r.proportional.leavePays).toBeCloseTo(2000 * r.leaveIncome / t, 6);
    expect(r.proportional.leavePays / r.leaveIncome).toBeCloseTo(r.proportional.partnerPays / r.partnerIncome, 9);
    expect(r.shareBefore).toBeCloseTo(40 / 90, 9);
  });

  it('equal: both left with the same money, bills fully paid', () => {
    expect(r.equal.leaveLeft).toBeCloseTo(r.equal.partnerLeft, 6);
    expect(r.equal.leavePays + r.equal.partnerPays).toBeCloseTo(2000, 9);
    expect(r.householdLeft).toBeCloseTo((r.leaveIncome + r.partnerIncome - 2000) * months, 4);
  });

  it('pension gap is the contribution rate on the pay lost', () => {
    expect(r.pensionGap).toBeCloseTo(0.08 * (40000 / 52 * 39 - smp), 2);
  });

  it('no shortfall when leave pay covers half the bills; top-up counts as income', () => {
    const t = billSplit({ country: 'gb', leaveSalary: 40000, weeks: 26, topUp: 1, topUpWeeks: 26, partnerSalary: 50000, billsMonthly: 2000 });
    expect(t.leaveIncome).toBeCloseTo(40000 / 12, 6);
    expect(t.halfShortfall).toBe(0);
  });

  it('works for every country module and a zero-income edge', () => {
    for (const c of ['ie', 'au', 'ca', 'qc', 'us-CA', 'us-XX'] as const) {
      const x = billSplit({ country: c, leaveSalary: 60000, weeks: 26, partnerSalary: 60000, billsMonthly: 3000 });
      expect(Number.isFinite(x.equal.leaveLeft)).toBe(true);
    }
    const z = billSplit({ country: 'us-XX', leaveSalary: 0, weeks: 12, partnerSalary: 0, billsMonthly: 1000 });
    expect(z.shareDuring).toBe(0.5);
  });
});
