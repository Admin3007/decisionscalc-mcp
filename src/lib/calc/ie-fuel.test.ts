import { describe, it, expect } from 'vitest';
import { FUEL_RATE, SEASON_2026_27, LIMITS, fuelCapitalMeans, computeFuel } from './ie-fuel';

const base = { period: '2026' as const, aged66: true, couple: false, partner66: false, qualifyingPayment: false, householdOk: true, incomeWeekly: 299.3, capital: 0 };

describe('Fuel Allowance (Citizens Information, read 2026-11-03)', () => {
  it('pins the official rates and limits', () => {
    expect(FUEL_RATE).toEqual({ '2026': 38, '2027': 43 });
    expect(SEASON_2026_27).toBe(1134); // €532 + €602 lump sums
    expect(LIMITS['2026']).toEqual({ over66Single: 534, over66Couple: 1068, under66Single: 499.3, under66CoupleYoung: 698.7, under66CoupleOld: 767.7 });
    expect(LIMITS['2027'].over66Single).toBe(640.8);
    expect(LIMITS['2027'].under66Single).toBe(509.3); // rule: State Pension (Contributory) €309.30 + €200
  });

  it('capital: first €20,000 ignored under 66, €50,000 at 66+, then €1/€2/€4 per €1,000', () => {
    expect(fuelCapitalMeans(20000, false)).toBe(0);
    expect(fuelCapitalMeans(30000, false)).toBe(10);
    expect(fuelCapitalMeans(45000, false)).toBe(10 + 20 + 20);
    expect(fuelCapitalMeans(50000, true)).toBe(0);
    expect(fuelCapitalMeans(72500, true)).toBe(38);
  });

  it('a single pensioner on the full State Pension qualifies: €38 a week, €1,134 for the 2026/27 season', () => {
    const r = computeFuel(base);
    expect(r.qualifies).toBe(true);
    expect(r.weekly).toBe(38);
    expect(r.season).toBe(1134);
  });

  it('the January 2027 limit (€640.80) lets in a pensioner who is just over €534', () => {
    expect(computeFuel({ ...base, incomeWeekly: 600 }).qualifies).toBe(false);
    expect(computeFuel({ ...base, incomeWeekly: 600, period: '2027' }).qualifies).toBe(true);
    expect(computeFuel({ ...base, incomeWeekly: 600, period: '2027' }).weekly).toBe(43);
  });

  it('under 66 needs a qualifying payment; then the €499.30 limit applies', () => {
    const r = computeFuel({ ...base, aged66: false, incomeWeekly: 250 });
    expect(r.qualifies).toBe(false);
    expect(computeFuel({ ...base, aged66: false, qualifyingPayment: true, incomeWeekly: 250 }).qualifies).toBe(true);
    expect(computeFuel({ ...base, aged66: false, qualifyingPayment: true, incomeWeekly: 500 }).qualifies).toBe(false);
  });

  it('household condition and savings can rule you out', () => {
    expect(computeFuel({ ...base, householdOk: false }).qualifies).toBe(false);
    expect(computeFuel({ ...base, incomeWeekly: 500, capital: 70000 }).means).toBe(530);
    expect(computeFuel({ ...base, incomeWeekly: 500, capital: 72000 }).qualifies).toBe(false);
  });

  it('survives bad input', () => {
    const r = computeFuel({ ...base, period: 'x' as any, incomeWeekly: NaN as any, capital: -5 as any });
    expect(Number.isFinite(r.means)).toBe(true);
  });
});
