import { describe, it, expect } from 'vitest';
import { computeHomeBuying, ieStampDuty, type HomeBuyingInputs } from './home-buying';

const base: HomeBuyingInputs = {
  purchasePrice: 400000, downPct: 20, interestRate: 6.5, loanTermYears: 30,
  closingPct: 3, inspectionCost: 500, propTaxRate: 1.1, hoiAnnual: 1800,
  pmiRate: 0.5, hoaMonthly: 0, maintPct: 1, movingCost: 2000, isGB: false,
};

describe('computeHomeBuying', () => {
  it('computes down payment and loan amount', () => {
    const r = computeHomeBuying(base);
    expect(r.downPayment).toBe(80000);
    expect(r.loanAmount).toBe(320000);
  });

  it('monthly P&I is finite and positive', () => {
    const r = computeHomeBuying(base);
    expect(r.monthlyPI).toBeGreaterThan(0);
    expect(Number.isFinite(r.monthlyPI)).toBe(true);
  });

  it('year-1 interest is the bulk of early payments', () => {
    const r = computeHomeBuying(base);
    expect(r.interestYr1).toBeGreaterThan(0);
    expect(r.interestYr1).toBeLessThan(r.monthlyPI * 12);
  });

  it('no PMI at 20% down', () => {
    const r = computeHomeBuying(base);
    expect(r.pmiAnnual).toBe(0);
    expect(r.rows.find((x) => x.key === 'pmi')).toBeUndefined();
  });

  it('PMI applies below 20% down (US)', () => {
    const r = computeHomeBuying({ ...base, downPct: 10 });
    expect(r.pmiAnnual).toBeGreaterThan(0);
    expect(r.rows.find((x) => x.key === 'pmi')).toBeDefined();
  });

  it('totals equal the sum of rows', () => {
    const r = computeHomeBuying(base);
    const sum = r.rows.reduce((s, x) => s + x.value, 0);
    expect(r.totalYr1).toBeCloseTo(sum, 6);
    expect(r.monthlyAvg).toBeCloseTo(r.totalYr1 / 12, 6);
    expect(r.recurringAnnual + r.oneTimeTotal).toBeCloseTo(r.totalYr1, 6);
  });

  it('GB mode uses stamp duty, council tax, and no PMI', () => {
    const r = computeHomeBuying({ ...base, isGB: true, propTaxRate: 2170 });
    expect(r.rows.find((x) => x.key === 'stampDuty')).toBeDefined();
    expect(r.rows.find((x) => x.key === 'councilTax')?.value).toBe(2170);
    expect(r.rows.find((x) => x.key === 'pmi')).toBeUndefined();
    expect(r.pmiAnnual).toBe(0);
  });

  it('zero interest rate does not divide-by-zero', () => {
    const r = computeHomeBuying({ ...base, interestRate: 0 });
    expect(Number.isFinite(r.monthlyPI)).toBe(true);
    expect(r.monthlyPI).toBeGreaterThan(0);
  });

  it('5-year projection numbers are coherent', () => {
    const r = computeHomeBuying(base);
    expect(r.proj5).toBeCloseTo(r.recurringAnnual * 5 + r.oneTimeTotal, 6);
    expect(r.totalPaid5).toBeCloseTo(r.monthlyPI * 60, 6);
    expect(r.principal5).toBeGreaterThan(0);
    expect(r.principal5).toBeLessThan(r.loanAmount);
  });
});

describe('ieStampDuty (Irish residential stamp duty)', () => {
  it('1% up to €1m', () => {
    expect(ieStampDuty(400000)).toBe(4000);
    expect(ieStampDuty(1_000_000)).toBe(10000);
  });
  it('2% from €1m to €1.5m, 6% above (Citizens Information €2m example = €50,000)', () => {
    expect(ieStampDuty(1_500_000)).toBe(20000);
    expect(ieStampDuty(2_000_000)).toBe(50000);
  });
  it('appears as a one-time row only when passed', () => {
    const ie = computeHomeBuying({ ...base, transferTax: ieStampDuty(400000) });
    expect(ie.rows.find((x) => x.key === 'stampDuty')).toEqual({ key: 'stampDuty', value: 4000, oneTime: true });
    expect(computeHomeBuying(base).rows.find((x) => x.key === 'stampDuty')).toBeUndefined();
  });
});
