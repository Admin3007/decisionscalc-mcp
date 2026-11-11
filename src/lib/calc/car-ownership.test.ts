import { describe, it, expect } from 'vitest';
import { computeCarOwnership, DEPR, type CarInputs } from './car-ownership';

const base: CarInputs = {
  vehicleType: 'new_gas', price: 35000, down: 5000, loanRate: 7, loanMonths: 60,
  milesPerYear: 12000, mpg: 30, fuelPrice: 3.5, annualInsurance: 1600,
  annualMaint: 1000, salesTaxRate: 7,
};

describe('computeCarOwnership', () => {
  it('sales tax = price × rate', () => {
    expect(computeCarOwnership(base).salesTax).toBeCloseTo(35000 * 0.07, 6);
  });

  it('5-year total sums all components + down + sales tax', () => {
    const r = computeCarOwnership(base);
    const expected = r.salesTax + base.down + r.totalInterest + r.totalDepr + r.fuelCost5 + r.insur5 + r.maint5;
    expect(r.totalCost).toBeCloseTo(expected, 6);
    expect(r.monthlyEff).toBeCloseTo(r.totalCost / 60, 6);
  });

  it('financing interest is positive with a loan', () => {
    expect(computeCarOwnership(base).totalInterest).toBeGreaterThan(0);
  });

  it('zero loan rate yields no interest', () => {
    const r = computeCarOwnership({ ...base, loanRate: 0 });
    expect(r.totalInterest).toBe(0);
  });

  it('new cars depreciate more than used (same price)', () => {
    const neu = computeCarOwnership(base);
    const used = computeCarOwnership({ ...base, vehicleType: 'used_gas' });
    expect(neu.totalDepr).toBeGreaterThan(used.totalDepr);
  });

  it('depreciation percent is reasonable (0..100)', () => {
    const r = computeCarOwnership(base);
    expect(r.deprPct).toBeGreaterThan(0);
    expect(r.deprPct).toBeLessThan(100);
  });

  it('unknown type falls back to new_gas schedule', () => {
    const fallback = computeCarOwnership({ ...base, vehicleType: 'spaceship' });
    const explicit = computeCarOwnership({ ...base, vehicleType: 'new_gas' });
    expect(fallback.totalDepr).toBeCloseTo(explicit.totalDepr, 6);
  });

  it('every DEPR schedule has 5 years', () => {
    for (const k of Object.keys(DEPR)) expect(DEPR[k]).toHaveLength(5);
  });

  it('zero mpg does not produce Infinity fuel', () => {
    const r = computeCarOwnership({ ...base, mpg: 0 });
    expect(Number.isFinite(r.fuelCost5)).toBe(true);
  });

  it('metric branch uses L/100km × km × price/litre', () => {
    // 15,000 km/yr, 7 L/100km, €1.80/L over 5 yr = (15000/100)*7*1.80*5 = 9450
    const r = computeCarOwnership({ ...base, metric: true, milesPerYear: 15000, mpg: 7, fuelPrice: 1.8 });
    expect(Math.round(r.fuelCost5)).toBe(9450);
  });

  it('UK branch: miles and imperial MPG with the price per litre', () => {
    // 7,000 mi/yr at 40 mpg = 175 imperial gallons, x 4.54609 L x £1.74 x 5 yr
    const r = computeCarOwnership({ ...base, milesPerYear: 7000, mpg: 40, fuelPrice: 1.74, pricePerLitre: true });
    expect(r.fuelCost5).toBeCloseTo(175 * 4.54609 * 1.74 * 5, 2);
  });
});
