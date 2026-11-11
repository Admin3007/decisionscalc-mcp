import { describe, it, expect } from 'vitest';
import { computePetCost, CARE, type PetInputs, type PetData } from './pet-cost';

const dogData: PetData = { lifespan: 12, foodB: 400, foodS: 600, foodP: 900, vetAnn: 500, groomAnn: 300, setupOT: 500 };
const base: PetInputs = {
  type: 'dog_medium', petAge: 1, careKey: 'standard', acqCost: 800,
  walkerAnnual: 0, boarding: 300, insurance: 480, petData: dogData,
};

describe('computePetCost', () => {
  it('standard care multiplier is 1.0', () => expect(CARE.standard).toBe(1.0));

  it('year-one includes acquisition, setup, and training', () => {
    const r = computePetCost(base);
    expect(r.yearOne).toBeCloseTo(r.annualRecur + base.acqCost + dogData.setupOT + r.training, 6);
  });

  it('puppy (<2yr dog) incurs training; older dog does not', () => {
    expect(computePetCost(base).training).toBe(400);
    expect(computePetCost({ ...base, petAge: 5 }).training).toBe(0);
  });

  it('premium care raises food and grooming above standard', () => {
    const std = computePetCost(base);
    const prem = computePetCost({ ...base, careKey: 'premium' });
    expect(prem.food).toBeGreaterThan(std.food);
    expect(prem.grooming).toBeGreaterThan(std.grooming);
  });

  it('lifetime = yearOne + annualRecur × (yearsLeft - 1)', () => {
    const r = computePetCost(base);
    expect(r.lifetime).toBeCloseTo(r.yearOne + r.annualRecur * (r.yearsLeft - 1), 6);
  });

  it('years left is at least 1 even past lifespan', () => {
    const r = computePetCost({ ...base, petAge: 20 });
    expect(r.yearsLeft).toBe(1);
  });

  it('cat has lower toys/misc and emergency than dog', () => {
    const cat = computePetCost({ ...base, type: 'cat' });
    const dog = computePetCost(base);
    expect(cat.toysMisc).toBeLessThan(dog.toysMisc);
    expect(cat.emergency).toBeLessThan(dog.emergency);
  });

  it('unknown care level falls back to multiplier 1.0', () => {
    const r = computePetCost({ ...base, careKey: 'mystery' });
    expect(r.food).toBeCloseTo(dogData.foodS * 1.0, 6);
  });
});
