import { describe, it, expect } from 'vitest';
import { computeMff, ratesFor, PHASES, PAY_CAP, SCHEME_START_YEAR } from './ie-mff';

describe('MyFutureFund (Citizens Information, read 2026-11-02)', () => {
  it('pins the official schedule', () => {
    expect(SCHEME_START_YEAR).toBe(2026);
    expect(PAY_CAP).toBe(80000);
    expect(PHASES.map((p) => [p.fromYear, p.employee, p.employer, p.state])).toEqual([
      [1, 0.015, 0.015, 0.005], [4, 0.03, 0.03, 0.01], [7, 0.045, 0.045, 0.015], [10, 0.06, 0.06, 0.02],
    ]);
  });

  it('phases by calendar year: 2026–28, 2029–31, 2032–34, 2035+', () => {
    expect(ratesFor(2028).employee).toBe(0.015);
    expect(ratesFor(2029).employee).toBe(0.03);
    expect(ratesFor(2032).state).toBe(0.015);
    expect(ratesFor(2035).employer).toBe(0.06);
    expect(ratesFor(2050).employee).toBe(0.06);
  });

  it("reproduces Citizens Information's €20,000 example (€700, €1,400, €2,100, €2,800 a year)", () => {
    const r = computeMff({ age: 30, retireAge: 40, salary: 20000, payGrowth: 0, investReturn: 0, charges: 0 });
    const total = (y: number) => { const x = r.years.find((v) => v.year === y)!; return x.employee + x.employer + x.state; };
    expect(total(2026)).toBe(700);
    expect(total(2029)).toBe(1400);
    expect(total(2032)).toBe(2100);
    expect(total(2035)).toBe(2800);
  });

  it('contributions stop at €80,000 of pay', () => {
    const r = computeMff({ age: 40, retireAge: 41, salary: 120000, payGrowth: 0, investReturn: 0, charges: 0 });
    expect(r.years[0].employee).toBe(1200);
    expect(r.years[0].state).toBe(400);
  });

  it('with no growth the pot is exactly what went in; employer + State add €1.33 per €1 at every phase', () => {
    const r = computeMff({ age: 30, retireAge: 66, salary: 40000, payGrowth: 0, investReturn: 0, charges: 0 });
    expect(r.pot).toBe(r.paidByYou + r.paidByEmployer + r.paidByState);
    expect(r.growth).toBe(0);
    expect(r.matchPerEuro).toBeCloseTo(4 / 3, 6);
  });

  it('bad input never produces NaN', () => {
    const r = computeMff({ age: NaN, retireAge: NaN, salary: NaN, payGrowth: NaN, investReturn: NaN, charges: NaN });
    expect(Number.isFinite(r.pot)).toBe(true);
  });
});
