import { describe, it, expect } from 'vitest';
import { computeCollegeCost, type CollegeInputs } from './college-cost';

const base: CollegeInputs = {
  years: 4, annualTuition: 11260, annualGrants: 3000, roomBoard: 12000,
  booksSupplies: 1200, transportation: 1500, annualLoans: 6000,
  loanRate: 6.5, opportunityWage: 30000,
};

describe('computeCollegeCost', () => {
  it('nets grants off tuition and multiplies by years', () => {
    const r = computeCollegeCost(base);
    expect(r.totalTuition).toBe((11260 - 3000) * 4);
    expect(r.totalRoomBoard).toBe(12000 * 4);
  });

  it('total includes opportunity cost; directCost excludes it', () => {
    const r = computeCollegeCost(base);
    expect(r.total).toBeCloseTo(r.directCost + r.totalInterest + r.totalOpportunityCost, 6);
    expect(r.directCost).toBeLessThan(r.total);
  });

  it('amortizes the loan with positive interest', () => {
    const r = computeCollegeCost(base);
    expect(r.monthlyPayment).toBeGreaterThan(0);
    expect(r.totalInterest).toBeGreaterThan(0);
    expect(r.loanAtGrad).toBeGreaterThan(r.totalLoanBalance);
  });

  it('zero loan rate does not divide-by-zero', () => {
    const r = computeCollegeCost({ ...base, loanRate: 0 });
    expect(Number.isFinite(r.monthlyPayment)).toBe(true);
    expect(r.totalInterest).toBeCloseTo(0, 6);
  });

  it('opportunity share is 0..100', () => {
    const r = computeCollegeCost(base);
    expect(r.oppShare).toBeGreaterThanOrEqual(0);
    expect(r.oppShare).toBeLessThanOrEqual(100);
  });

  it('debt-to-salary uses loan balance ÷ wage; Infinity when wage 0', () => {
    expect(computeCollegeCost(base).debtToSalary).toBeCloseTo((6000 * 4) / 30000, 6);
    expect(computeCollegeCost({ ...base, opportunityWage: 0 }).debtToSalary).toBe(Infinity);
  });

  it('living at home (roomBoard 0) lowers the total', () => {
    const away = computeCollegeCost(base);
    const home = computeCollegeCost({ ...base, roomBoard: 0 });
    expect(home.total).toBeLessThan(away.total);
    expect(home.totalRoomBoard).toBe(0);
  });

  it('all-zero is safe', () => {
    const r = computeCollegeCost({
      years: 0, annualTuition: 0, annualGrants: 0, roomBoard: 0, booksSupplies: 0,
      transportation: 0, annualLoans: 0, loanRate: 0, opportunityWage: 0,
    });
    expect(r.total).toBe(0);
    expect(r.oppShare).toBe(0);
  });
});
