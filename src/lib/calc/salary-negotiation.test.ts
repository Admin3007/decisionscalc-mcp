import { describe, it, expect } from 'vitest';
import { computeSalaryNegotiation, lifetimeSalary, type SalaryInputs } from './salary-negotiation';

const base: SalaryInputs = {
  offer: 80000, target: 90000, years: 20, annualRaise: 3,
  retirement401k: 6, investReturn: 7, marketLow: 70000, marketHigh: 120000,
};

describe('lifetimeSalary', () => {
  it('zero growth = start × n', () => expect(lifetimeSalary(50000, 0, 10)).toBe(500000));
  it('positive growth exceeds flat sum', () => {
    expect(lifetimeSalary(50000, 0.03, 10)).toBeGreaterThan(500000);
  });
});

describe('computeSalaryNegotiation', () => {
  it('immediate diff = target - offer', () => {
    expect(computeSalaryNegotiation(base).diff).toBe(10000);
  });

  it('lifetime + retirement total exceeds the raw diff', () => {
    const r = computeSalaryNegotiation(base);
    expect(r.total).toBeGreaterThan(r.diff);
    expect(r.total).toBeCloseTo(r.lifeDiff + r.k401, 6);
  });

  it('avg per year = total / years', () => {
    const r = computeSalaryNegotiation(base);
    expect(r.avgPerYr).toBeCloseTo(r.total / 20, 6);
  });

  it('market position is 0..100 within the range', () => {
    const r = computeSalaryNegotiation(base);
    // target 90k in 70k–120k band = 40%
    expect(r.mktPos).toBeCloseTo(40, 6);
  });

  it('clamps market position to [0,100]', () => {
    expect(computeSalaryNegotiation({ ...base, target: 200000 }).mktPos).toBe(100);
    expect(computeSalaryNegotiation({ ...base, target: 10000 }).mktPos).toBe(0);
  });

  it('degenerate market range falls back to 50', () => {
    expect(computeSalaryNegotiation({ ...base, marketLow: 90000, marketHigh: 90000 }).mktPos).toBe(50);
  });

  it('zero years yields zero average and total', () => {
    const r = computeSalaryNegotiation({ ...base, years: 0 });
    expect(r.avgPerYr).toBe(0);
    expect(r.total).toBeCloseTo(0, 6);
  });

  it('no difference (target = offer) gives zero gains', () => {
    const r = computeSalaryNegotiation({ ...base, target: 80000 });
    expect(r.diff).toBe(0);
    expect(r.total).toBeCloseTo(0, 6);
  });
});
