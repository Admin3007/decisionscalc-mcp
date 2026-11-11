import { describe, it, expect } from 'vitest';
import { computeMff, ratesFor, PHASES, PAY_CAP, SCHEME_START_YEAR, compareWithPension } from './ie-mff';

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

describe('MyFutureFund or a pension with tax relief, same take-home cost', () => {
  it('€35,000 in 2026, 20% relief, no employer money: MyFutureFund €1,225 in vs €656.25', () => {
    const r = compareWithPension({ salary: 35000, marginalRate: 0.2, otherEmployerPct: 0 });
    expect(r.takeHomeCost).toBe(525);
    expect(r.mff.total).toBe(1225); // 525 + 525 + 175
    expect(r.mff.perEuro).toBe(2.33);
    expect(r.other.you).toBe(656.25); // 525 / 0.8
    expect(r.other.perEuro).toBe(1.25);
    expect(r.better).toBe('mff');
    expect(r.employerToMatch).toBe(568.75);
    expect(r.employerToMatchPct).toBe(1.63);
  });
  it('€60,000 in 2026 at 40%: the other pension needs 1% of salary from the employer to match', () => {
    const r = compareWithPension({ salary: 60000, marginalRate: 0.4, otherEmployerPct: 0 });
    expect(r.mff.total).toBe(2100);
    expect(r.other.you).toBe(1500);
    expect(r.employerToMatch).toBe(600);
    expect(r.employerToMatchPct).toBe(1);
    expect(compareWithPension({ salary: 60000, marginalRate: 0.4, otherEmployerPct: 1.5 }).better).toBe('other');
  });
  it('from 2035 (6%) the employer match needed is 6.5% (20%) and 4% (40%) of salary', () => {
    expect(compareWithPension({ salary: 35000, marginalRate: 0.2, otherEmployerPct: 0, calendarYear: 2035 }).employerToMatchPct).toBe(6.5);
    expect(compareWithPension({ salary: 60000, marginalRate: 0.4, otherEmployerPct: 0, calendarYear: 2035 }).employerToMatchPct).toBe(4);
  });
  it('above €80,000 MyFutureFund stops at the cap; the comparison uses the capped amounts', () => {
    const r = compareWithPension({ salary: 100000, marginalRate: 0.4, otherEmployerPct: 0 });
    expect(r.mff.you).toBe(1200);
  });
});
