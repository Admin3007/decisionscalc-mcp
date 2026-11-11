import { describe, it, expect } from 'vitest';
import { computeChronicIllness, type ChronicIllnessInputs } from './chronic-illness';

const base: ChronicIllnessInputs = {
  monthlyPremium: 200, specialistVisits: 6, specialistCopay: 50, labTests: 4, labCost: 120,
  rxMonthly: 80, suppliesAnnual: 300, otcMonthly: 40, annualSalary: 65000,
  sickDays: 8, productivityLoss: 10, mentalHealth: 12, mhCopay: 30, transport: 200, dietExtra: 50,
};

describe('computeChronicIllness', () => {
  it('annualizes monthly inputs', () => {
    const r = computeChronicIllness(base);
    expect(r.premiums).toBe(200 * 12);
    expect(r.rx).toBe(80 * 12);
    expect(r.otc).toBe(40 * 12);
    expect(r.diet).toBe(50 * 12);
  });

  it('multiplies per-unit costs', () => {
    const r = computeChronicIllness(base);
    expect(r.specialists).toBe(6 * 50);
    expect(r.labs).toBe(4 * 120);
    expect(r.mhCost).toBe(12 * 30);
  });

  it('work impact = absenteeism + presenteeism', () => {
    const r = computeChronicIllness(base);
    expect(r.absenteeism).toBeCloseTo(8 * (65000 / 260), 6);
    expect(r.presenteeism).toBeCloseTo(65000 * 0.10 * 0.5, 6);
    expect(r.workImpact).toBeCloseTo(r.absenteeism + r.presenteeism, 6);
  });

  it('total sums every component', () => {
    const r = computeChronicIllness(base);
    const sum = r.premiums + r.specialists + r.labs + r.rx + r.supplies + r.otc + r.workImpact + r.mhCost + r.transport + r.diet;
    expect(r.total).toBeCloseTo(sum, 6);
  });

  it('NHS scenario (zero direct medical) still captures indirect cost', () => {
    const nhs = computeChronicIllness({
      ...base, monthlyPremium: 0, specialistCopay: 0, labCost: 0,
    });
    expect(nhs.premiums).toBe(0);
    expect(nhs.specialists).toBe(0);
    expect(nhs.workImpact).toBeGreaterThan(0); // lost productivity remains
    expect(nhs.total).toBeGreaterThan(0);
  });

  it('all-zero is safe and maxVal floors at 1', () => {
    const r = computeChronicIllness({
      monthlyPremium: 0, specialistVisits: 0, specialistCopay: 0, labTests: 0, labCost: 0,
      rxMonthly: 0, suppliesAnnual: 0, otcMonthly: 0, annualSalary: 0, sickDays: 0,
      productivityLoss: 0, mentalHealth: 0, mhCopay: 0, transport: 0, dietExtra: 0,
    });
    expect(r.total).toBe(0);
    expect(r.maxVal).toBe(1);
  });
});
