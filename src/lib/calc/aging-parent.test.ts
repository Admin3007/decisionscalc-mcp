import { describe, it, expect } from 'vitest';
import { computeAgingParent, type AgingParentInputs } from './aging-parent';

const base: AgingParentInputs = {
  baseCare: 60000, coveragePct: 0, medMonthly: 200, doctorVisits: 12, visitCopay: 40,
  adaptationsTotal: 9000, years: 3, caregiverSalary: 60000, workReduction: 10,
};

describe('computeAgingParent', () => {
  it('net care reduces with coverage', () => {
    expect(computeAgingParent(base).netCare).toBe(60000);
    expect(computeAgingParent({ ...base, coveragePct: 50 }).netCare).toBe(30000);
  });

  it('medical = monthly×12 + visits×copay', () => {
    expect(computeAgingParent(base).medical).toBe(200 * 12 + 12 * 40);
  });

  it('adaptations are amortized over years', () => {
    expect(computeAgingParent(base).adaptations).toBeCloseTo(9000 / 3, 6);
  });

  it('years floored at 1 to avoid divide-by-zero', () => {
    expect(computeAgingParent({ ...base, years: 0 }).adaptations).toBe(9000);
  });

  it('career impact = (reduction/40) × salary', () => {
    expect(computeAgingParent(base).careerImpact).toBeCloseTo((10 / 40) * 60000, 6);
  });

  it('no career impact when caregiver salary is 0', () => {
    expect(computeAgingParent({ ...base, caregiverSalary: 0 }).careerImpact).toBe(0);
  });

  it('total sums all four components', () => {
    const r = computeAgingParent(base);
    expect(r.total).toBeCloseTo(r.netCare + r.medical + r.adaptations + r.careerImpact, 6);
  });

  it('family care (baseCare 0) still counts indirect costs', () => {
    const r = computeAgingParent({ ...base, baseCare: 0 });
    expect(r.netCare).toBe(0);
    expect(r.total).toBeGreaterThan(0);
  });

  it('full coverage zeroes the facility cost', () => {
    expect(computeAgingParent({ ...base, coveragePct: 100 }).netCare).toBe(0);
  });
});
