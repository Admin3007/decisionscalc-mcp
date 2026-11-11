import { describe, it, expect } from 'vitest';
import { computeCompoundInterest } from './compound-interest';

describe('computeCompoundInterest', () => {
  it('returns principal unchanged at 0% with no contributions', () => {
    const r = computeCompoundInterest({ principal: 1000, monthly: 0, ratePct: 0, years: 5 });
    expect(r.futureValue).toBeCloseTo(1000, 6);
    expect(r.totalInterest).toBeCloseTo(0, 6);
    expect(r.totalContributed).toBeCloseTo(1000, 6);
  });

  it('compounds a lump sum monthly correctly (10% / 1yr ≈ 1104.71)', () => {
    const r = computeCompoundInterest({ principal: 1000, monthly: 0, ratePct: 10, years: 1, compounding: 12 });
    expect(r.futureValue).toBeCloseTo(1104.71, 1);
    expect(r.totalContributed).toBeCloseTo(1000, 6);
  });

  it('sums contributions with 0% growth', () => {
    const r = computeCompoundInterest({ principal: 0, monthly: 100, ratePct: 0, years: 1 });
    expect(r.totalContributed).toBeCloseTo(1200, 6);
    expect(r.futureValue).toBeCloseTo(1200, 6);
    expect(r.totalInterest).toBeCloseTo(0, 6);
  });

  it('growth exceeds contributions over a long horizon', () => {
    const r = computeCompoundInterest({ principal: 10000, monthly: 200, ratePct: 7, years: 30 });
    expect(r.futureValue).toBeGreaterThan(r.totalContributed);
    expect(r.totalInterest).toBeGreaterThan(0);
    // 10k + 200*12*30 = 82,000 contributed; FV should comfortably clear 200k.
    expect(r.totalContributed).toBeCloseTo(82000, 0);
    expect(r.futureValue).toBeGreaterThan(200000);
  });

  it('produces a yearly series from year 0 to the horizon', () => {
    const r = computeCompoundInterest({ principal: 1000, monthly: 0, ratePct: 5, years: 10 });
    expect(r.series[0]).toMatchObject({ year: 0, balance: 1000 });
    expect(r.series[r.series.length - 1].year).toBe(10);
    expect(r.series.length).toBe(11);
  });

  it('handles a zero-year horizon gracefully', () => {
    const r = computeCompoundInterest({ principal: 5000, monthly: 100, ratePct: 7, years: 0 });
    expect(r.futureValue).toBeCloseTo(5000, 6);
    expect(r.series.length).toBe(1);
  });
});
