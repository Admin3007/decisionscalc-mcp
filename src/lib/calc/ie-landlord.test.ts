import { describe, it, expect } from 'vitest';
import { computeLandlord, unearnedPrsiRate } from './ie-landlord';

const base = { year: 2026 as const, status: 'single' as const, pay: 0, rent: 0, mortgageInterest: 0, rtbRegistered: true, otherExpenses: 0, furnishings: 0 };

describe('ie-landlord: Revenue rules (read 2026-11-03)', () => {
  it("Revenue's Denise example: €15,600 rent, €5,790 expenses (interest at 100%) → €9,810 profit", () => {
    const r = computeLandlord({ ...base, rent: 15600, mortgageInterest: 2100, otherExpenses: 850 + 950 + 90 + 1800 });
    expect(r.expenses).toBe(5790);
    expect(r.profit).toBe(9810);
    // No other income: 20% × 9,810 = 1,962, less the €2,000 personal credit (2026) → no income tax.
    expect(r.incomeTax).toBe(0);
    expect(r.usc).toBe(0); // total income under €13,000
  });

  it('employee on €60,000 with €20,000 rental profit (2026): 40% tax less €1,000 relief, USC, PRSI', () => {
    const r = computeLandlord({ ...base, pay: 60000, rent: 20000 });
    expect(r.incomeTax).toBe(8000);                       // all of it in the 40% band
    expect(r.rprir).toBe(1000);
    expect(r.usc).toBeCloseTo((70044 - 60000) * 0.03 + (80000 - 70044) * 0.08, 2);
    expect(unearnedPrsiRate(2026)).toBeCloseTo(0.75 * 0.042 + 0.25 * 0.0435, 10);
    expect(r.prsi).toBeCloseTo(20000 * (0.75 * 0.042 + 0.25 * 0.0435), 2);
    expect(r.totalTax).toBeCloseTo(8000 - 1000 + r.usc + r.prsi, 2);
  });

  it('RTB: interest and the relief only for registered tenancies', () => {
    const on = computeLandlord({ ...base, pay: 60000, rent: 20000, mortgageInterest: 6000 });
    const off = computeLandlord({ ...base, pay: 60000, rent: 20000, mortgageInterest: 6000, rtbRegistered: false });
    expect(on.profit).toBe(14000);
    expect(off.profit).toBe(20000);
    expect(off.rprir).toBe(0);
  });

  it('relief capped at 20% of profit; wear and tear 12.5%; losses carried forward', () => {
    const r = computeLandlord({ ...base, pay: 60000, rent: 8000, furnishings: 28000, lossesForward: 2500 });
    expect(r.wearAndTear).toBe(3500);
    expect(r.profit).toBe(2000);               // Revenue's RPRIR example shape: 8,000 − 3,500 − 2,500
    expect(r.rprir).toBe(400);
    expect(r.prsi).toBe(0);                    // unearned income €5,000 or less
  });

  it('USC surcharge of 3% on non-PAYE income above €100,000; no PRSI at 66+', () => {
    const r = computeLandlord({ ...base, pay: 0, rent: 120000, over66: true });
    expect(r.prsi).toBe(0);
    const plain = computeLandlord({ ...base, pay: 0, rent: 100000, over66: true });
    expect(r.usc - plain.usc).toBeCloseTo(20000 * 0.11, 2);
  });

  it('2027 (Budget 2027 bands): marginal rate for a higher-rate employee is 40% + 8% USC + PRSI', () => {
    const r = computeLandlord({ ...base, year: 2027, pay: 80000, rent: 20000 });
    expect(r.marginalRate).toBeCloseTo(40 + 8 + 100 * (0.75 * 0.0435 + 0.25 * 0.045), 1);
  });
});
