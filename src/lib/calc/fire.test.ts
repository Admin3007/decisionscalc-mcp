import { describe, it, expect } from 'vitest';
import {computeFire, yearsToReach, projectPortfolio, type FireInputs, portfolioSeries } from './fire';

const base: FireInputs = {
  currentAge: 32,
  targetAge: 50,
  annualSpend: 60000,
  currentSavings: 85000,
  annualSavings: 24000,
  returnRate: 7,
  ssMonthly: 1800,
  ssStartAge: 67,
  withdrawalRate: 4,
  inflationRate: 3,
};

describe('FIRE number', () => {
  it('is annual spend ÷ withdrawal rate (4% rule = 25x)', () => {
    expect(computeFire(base).fireNumber).toBe(1_500_000); // 60000 / 0.04
  });

  it('reduces the target by capitalizing Social Security income', () => {
    const r = computeFire(base);
    // (60000 - 1800*12) / 0.04 = (60000 - 21600) / 0.04 = 960000
    expect(r.fireNumberWithSS).toBe(960_000);
    expect(r.fireNumberWithSS).toBeLessThan(r.fireNumber);
  });

  it('never goes negative when SS exceeds spend', () => {
    const r = computeFire({ ...base, ssMonthly: 9000 });
    expect(r.fireNumberWithSS).toBe(0);
  });
});

describe('yearsToReach', () => {
  it('returns 0 when already at target', () => {
    expect(yearsToReach(100, 10, 0.07, 50)).toBe(0);
  });

  it('grows the portfolio by return + contribution each year', () => {
    // 1000 * 1.1 + 100 = 1200 after year 1
    expect(yearsToReach(1000, 100, 0.1, 1200)).toBe(1);
    expect(yearsToReach(1000, 100, 0.1, 1201)).toBe(2);
  });

  it('returns Infinity when the target is unreachable in the horizon', () => {
    expect(yearsToReach(0, 0, 0.07, 1_000_000)).toBe(Infinity);
  });
});

describe('projectPortfolio', () => {
  it('compounds with contributions', () => {
    expect(projectPortfolio(1000, 100, 0.1, 1)).toBeCloseTo(1200, 6);
    expect(projectPortfolio(1000, 100, 0.1, 2)).toBeCloseTo(1420, 6);
  });

  it('treats negative/zero years as no growth', () => {
    expect(projectPortfolio(1000, 100, 0.1, 0)).toBe(1000);
    expect(projectPortfolio(1000, 100, 0.1, -5)).toBe(1000);
  });
});

describe('computeFire integration', () => {
  it('flags on-track status and progress consistently', () => {
    const r = computeFire(base);
    expect(r.progressPct).toBeGreaterThanOrEqual(0);
    expect(r.progressPct).toBeLessThanOrEqual(100);
    expect(r.onTrack).toBe(r.fireAge <= base.targetAge);
  });

  it('a higher savings rate never increases years to FIRE', () => {
    const slow = computeFire({ ...base, annualSavings: 10000 }).yearsToFire;
    const fast = computeFire({ ...base, annualSavings: 40000 }).yearsToFire;
    expect(fast).toBeLessThanOrEqual(slow);
  });
});

describe('portfolioSeries', () => {
  it('starts at the start balance and has years+1 points', () => {
    const s = portfolioSeries(1000, 100, 0.05, 10);
    expect(s[0]).toBe(1000);
    expect(s).toHaveLength(11);
  });
  it('last point matches projectPortfolio', () => {
    const s = portfolioSeries(50000, 12000, 0.07, 20);
    expect(s[20]).toBeCloseTo(projectPortfolio(50000, 12000, 0.07, 20), 6);
  });
  it('is monotonically increasing with positive inputs', () => {
    const s = portfolioSeries(1000, 100, 0.05, 5);
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeGreaterThan(s[i-1]);
  });
});
