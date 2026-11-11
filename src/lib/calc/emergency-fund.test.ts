import { describe, it, expect } from 'vitest';
import {
  computeEmergencyFund,
  recommendedMonths,
  baseBufferMonths,
  monthsToClose,
  type EmergencyFundInputs,
} from './emergency-fund';

const base: EmergencyFundInputs = {
  housing: 1500, food: 600, transport: 400, utilities: 300,
  insurance: 200, minDebt: 200, other: 300,
  currentSaved: 0, monthlySavingsCapacity: 0,
  jobStability: 'high', incomeStreams: 'dual', healthRisk: 'low',
};
// monthlyExpenses = 3500

describe('baseBufferMonths', () => {
  it('maps each stability tier', () => {
    expect(baseBufferMonths('high')).toBe(3);
    expect(baseBufferMonths('good')).toBe(3.5);
    expect(baseBufferMonths('moderate')).toBe(4.5);
    expect(baseBufferMonths('variable')).toBe(5.5);
    expect(baseBufferMonths('freelance')).toBe(7);
  });
  it('defaults unknown to 3', () => {
    expect(baseBufferMonths('???')).toBe(3);
  });
});

describe('recommendedMonths', () => {
  it('high stability, dual income, low health = 3', () => {
    expect(recommendedMonths('high', 'dual', 'low')).toBe(3);
  });
  it('adds risk weights and ceils', () => {
    // freelance 7 + singleParent 1.5 + high health 1.5 = 10 -> capped 9
    expect(recommendedMonths('freelance', 'singleParent', 'high')).toBe(9);
  });
  it('ceils fractional sums', () => {
    // good 3.5 + single 0.5 + moderate health 0.5 = 4.5 -> ceil 5
    expect(recommendedMonths('good', 'single', 'moderate')).toBe(5);
  });
  it('caps at 9', () => {
    expect(recommendedMonths('freelance', 'singleParent', 'high')).toBeLessThanOrEqual(9);
  });
});

describe('monthsToClose', () => {
  it('zero gap -> 0', () => expect(monthsToClose(0, 100)).toBe(0));
  it('negative gap -> 0', () => expect(monthsToClose(-50, 100)).toBe(0));
  it('zero rate -> Infinity', () => expect(monthsToClose(1000, 0)).toBe(Infinity));
  it('ceils partial months', () => expect(monthsToClose(1000, 300)).toBe(4));
});

describe('computeEmergencyFund', () => {
  it('computes target from expenses × months', () => {
    const r = computeEmergencyFund(base);
    expect(r.monthlyExpenses).toBe(3500);
    expect(r.targetMonths).toBe(3);
    expect(r.target).toBe(10500);
    expect(r.gap).toBe(10500);
    expect(r.pct).toBe(0);
    expect(r.funded).toBe(false);
    expect(r.plans).toEqual([]); // no capacity
  });

  it('progress and funded when fully saved', () => {
    const r = computeEmergencyFund({ ...base, currentSaved: 10500 });
    expect(r.gap).toBe(0);
    expect(r.pct).toBe(100);
    expect(r.funded).toBe(true);
  });

  it('caps progress at 100 when over-saved', () => {
    const r = computeEmergencyFund({ ...base, currentSaved: 999999 });
    expect(r.pct).toBe(100);
  });

  it('builds three savings plans at capacity / 1.5× / 2×', () => {
    const r = computeEmergencyFund({ ...base, monthlySavingsCapacity: 500 });
    expect(r.plans).toHaveLength(3);
    expect(r.plans[0]).toEqual({ rate: 500, months: monthsToClose(r.gap, 500) });
    expect(r.plans[1].rate).toBe(750);
    expect(r.plans[2].rate).toBe(1000);
    // faster rate never takes more months
    expect(r.plans[2].months).toBeLessThanOrEqual(r.plans[0].months);
  });

  it('all-zero inputs are safe', () => {
    const r = computeEmergencyFund({
      housing: 0, food: 0, transport: 0, utilities: 0, insurance: 0, minDebt: 0, other: 0,
      currentSaved: 0, monthlySavingsCapacity: 0,
      jobStability: 'high', incomeStreams: 'dual', healthRisk: 'low',
    });
    expect(r.monthlyExpenses).toBe(0);
    expect(r.target).toBe(0);
    expect(r.gap).toBe(0);
    expect(r.pct).toBe(0);
    expect(r.funded).toBe(true);
  });
});
