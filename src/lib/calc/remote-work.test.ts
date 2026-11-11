import { describe, it, expect } from 'vitest';
import { computeRemoteWork, officeDayCost, type RemoteWorkInputs } from './remote-work';

const base: RemoteWorkInputs = {
  commuteDays: 5, commuteMiles: 15, mode: 'car', transitCost: 0, lunchCost: 12,
  clothing: 500, utilities: 600, internet: 240, equipment: 900, homeCoffee: 2,
  salary: 80000, payCut: 0, irsRate: 0.67,
};

describe('computeRemoteWork', () => {
  it('amortizes equipment over 3 years', () => {
    expect(computeRemoteWork(base).equipment).toBeCloseTo(300, 6);
  });

  it('net = savings - costs + salaryImpact', () => {
    const r = computeRemoteWork(base);
    expect(r.net).toBeCloseTo(r.totalSavings - r.totalCosts + r.salaryImpact, 6);
  });

  it('car mode with no parking entered has no transport saving', () => {
    const r = computeRemoteWork(base);
    expect(r.transitSavings).toBe(0);
    expect(r.carSavings).toBeGreaterThan(0);
  });

  it('car mode counts parking entered in the transport / parking field', () => {
    const r = computeRemoteWork({ ...base, transitCost: 120 });
    expect(r.transitSavings).toBe(120 * 12);
    expect(r.carSavings).toBeGreaterThan(0);
  });

  it('transit mode excludes car savings', () => {
    const r = computeRemoteWork({ ...base, mode: 'transit', transitCost: 150 });
    expect(r.carSavings).toBe(0);
    expect(r.transitSavings).toBe(150 * 12);
  });

  it('UK HMRC rate (0.45) yields lower car savings than US IRS (0.67)', () => {
    const us = computeRemoteWork(base);
    const uk = computeRemoteWork({ ...base, irsRate: 0.45 });
    expect(uk.carSavings).toBeLessThan(us.carSavings);
  });

  it('a pay cut reduces net (negative salary impact)', () => {
    const r = computeRemoteWork({ ...base, payCut: -10 });
    expect(r.salaryImpact).toBeCloseTo(-8000, 6);
    expect(r.net).toBeLessThan(computeRemoteWork(base).net);
  });

  it('office days = days/week × 50 weeks', () => {
    expect(computeRemoteWork(base).officeDays).toBe(250);
  });

  it('all-zero commute gives no commute savings', () => {
    const r = computeRemoteWork({ ...base, commuteDays: 0 });
    expect(r.carSavings).toBe(0);
    expect(r.lunchSavings).toBe(0);
  });
});

describe('officeDayCost (return to office)', () => {
  it('one office day a week: 50 weeks x (30 miles x $0.67 + $12 lunch - $2 home coffee) = $1,505', () => {
    expect(officeDayCost(base)).toBeCloseTo(1505, 6);
  });
  it('does not depend on how many days are entered, the pay cut or flat items', () => {
    expect(officeDayCost({ ...base, commuteDays: 2, payCut: -10, clothing: 2000, transitCost: 150 })).toBeCloseTo(1505, 6);
  });
  it('3 vs 5 office days = 2 days a week of commuting costs', () => {
    const diff = computeRemoteWork({ ...base, commuteDays: 5 }).net - computeRemoteWork({ ...base, commuteDays: 3 }).net;
    expect(diff).toBeCloseTo(2 * officeDayCost(base), 6);
  });
});
