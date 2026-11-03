import { describe, it, expect } from 'vitest';
import {
  computeKiwiSaver, esctRate, suggestedPir, governmentContribution, minimumRate,
  ESCT_BANDS, GOV_MAX, GOV_RATE, GOV_INCOME_LIMIT, EMPLOYEE_RATES, PIR_RATES, type KsInput,
} from './nz-kiwisaver';

const base: KsInput = {
  age: 30, balance: 0, salary: 70000, payGrowth: 0, employeeRate: 'default', employerRate: 'minimum',
  pir: 0.28, grossReturn: 0, feePct: 0, feeDollars: 0, inflation: 0,
};

describe('KiwiSaver (ird.govt.nz, read 2026-11-03)', () => {
  it('pins the official figures', () => {
    expect(EMPLOYEE_RATES).toEqual([0.035, 0.04, 0.06, 0.08, 0.1]);
    expect(GOV_RATE).toBe(0.25);
    expect(GOV_MAX).toBe(260.72);
    expect(GOV_INCOME_LIMIT).toBe(180000);
    expect(PIR_RATES).toEqual([0.105, 0.175, 0.28]);
    expect(ESCT_BANDS.map((b) => [b.upTo, b.rate])).toEqual([
      [18720, 0.105], [64200, 0.175], [93720, 0.3], [216000, 0.33], [Infinity, 0.39],
    ]);
  });

  it('default and employer minimum: 3.5% from April 2026, 4% from April 2028', () => {
    expect(minimumRate(2026)).toBe(0.035);
    expect(minimumRate(2027)).toBe(0.035);
    expect(minimumRate(2028)).toBe(0.04);
  });

  it('ESCT band edges (IR340 April 2026)', () => {
    expect(esctRate(18720)).toBe(0.105);
    expect(esctRate(18721)).toBe(0.175);
    expect(esctRate(64200)).toBe(0.175);
    expect(esctRate(64201)).toBe(0.3);
    expect(esctRate(93721)).toBe(0.33);
    expect(esctRate(216001)).toBe(0.39);
    // IR335 Sept 2026 example: $72,450 salary plus employer contribution is in the 30% band.
    expect(esctRate(72450)).toBe(0.3);
  });

  it('government contribution: 25c per $1, $1,042.86 earns the $260.72 maximum, none above $180,000 or from 65', () => {
    expect(governmentContribution(400, 50000, 30)).toBe(100);
    expect(governmentContribution(1042.86, 50000, 30)).toBeCloseTo(260.715, 2);
    expect(governmentContribution(5000, 50000, 30)).toBe(260.72);
    expect(governmentContribution(5000, 180001, 30)).toBe(0);
    expect(governmentContribution(5000, 180000, 30)).toBe(260.72);
    expect(governmentContribution(5000, 50000, 65)).toBe(0);
    expect(governmentContribution(5000, 50000, 16)).toBe(260.72);
  });

  it('PIR from salary (IR861)', () => {
    expect(suggestedPir(15000)).toBe(0.105);
    expect(suggestedPir(40000)).toBe(0.175);
    expect(suggestedPir(53500)).toBe(0.175);
    expect(suggestedPir(53501)).toBe(0.28);
    expect(suggestedPir(50000, 30000)).toBe(0.28);
  });

  it('first year at $70,000: 3.5% each, ESCT 30% on the employer share', () => {
    const r = computeKiwiSaver(base);
    const y = r.years[0];
    expect(y.taxYear).toBe(2026);
    expect(y.employee).toBe(2450);
    expect(y.employerGross).toBe(2450);
    expect(y.esct).toBe(735); // $72,450 → 30%
    expect(y.employerNet).toBe(1715);
    expect(y.government).toBe(260.72);
    expect(r.years[2].employee).toBe(2800); // 2028/29 at 4%
  });

  it('runs to 65 and, with no growth, the balance is exactly what went in', () => {
    const r = computeKiwiSaver({ ...base, balance: 10000 });
    expect(r.years.length).toBe(35);
    expect(r.years[r.years.length - 1].age).toBe(64);
    expect(r.returns).toBeLessThanOrEqual(1);
    expect(Math.abs(r.atRetirement - (10000 + r.paidByYou + r.employerNet + r.government))).toBeLessThanOrEqual(1);
  });

  it('a chosen rate below the minimum is lifted to the minimum; higher rates are kept', () => {
    expect(computeKiwiSaver({ ...base, employeeRate: 0.03 }).years[0].employee).toBe(2450);
    expect(computeKiwiSaver({ ...base, employeeRate: 0.1 }).years[0].employee).toBe(7000);
    expect(computeKiwiSaver({ ...base, employerRate: 0.06 }).years[0].employerGross).toBe(4200);
  });

  it('PIE tax and fees cut growth: 6% gross at 28% PIR less 0.5% fee is 3.82% net', () => {
    const r = computeKiwiSaver({ ...base, grossReturn: 6, feePct: 0.5 });
    expect(r.netReturn).toBeCloseTo(3.82, 6);
    const lower = computeKiwiSaver({ ...base, grossReturn: 6, feePct: 0.5, pir: 0.105 });
    expect(lower.atRetirement).toBeGreaterThan(r.atRetirement);
  });

  it('today’s dollars deflate by inflation over the years to 65', () => {
    const r = computeKiwiSaver({ ...base, grossReturn: 5, inflation: 2 });
    expect(r.todaysDollars).toBe(Math.round(r.atRetirement / Math.pow(1.02, 35)));
  });

  it('bad input never produces NaN', () => {
    const r = computeKiwiSaver({ ...base, age: NaN, salary: NaN, grossReturn: NaN, feePct: NaN, pir: NaN, balance: NaN, inflation: NaN, payGrowth: NaN, feeDollars: NaN });
    expect(Number.isFinite(r.atRetirement)).toBe(true);
    expect(Number.isFinite(r.todaysDollars)).toBe(true);
  });
});
