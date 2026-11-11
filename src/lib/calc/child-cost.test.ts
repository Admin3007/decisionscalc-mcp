import { describe, it, expect } from 'vitest';
import {
  computeChildCost, bandFor, benefitAt, bandYears, BAND_WEIGHTS, YEARS, PART_TIME_SHARE,
  type ChildCostData, type ChildCostInputs,
} from './child-cost';

// Round numbers so every expectation can be worked by hand.
const DATA: ChildCostData = {
  bands: { early: 1000, middle: 2000, teen: 3000 },
  levels: { low: 0.8, average: 1, high: 1.3 },
  benefits: [
    { fromAge: 0, toAge: 5, first: 600, additional: 400 },
    { fromAge: 6, toAge: 16, first: 300, additional: 200 },
  ],
};
const BASE: ChildCostInputs = {
  children: 1, level: 'average', careYears: 0, careType: 'none', careAnnual: 10000,
  careSubsidyPct: 0, housing: false, housingAnnual: 1200, inflationPct: 0, includeBenefits: false,
};
const run = (o: Partial<ChildCostInputs> = {}) => computeChildCost({ ...BASE, ...o }, DATA);

describe('child-cost: age bands', () => {
  it('band boundaries fall at 4/5 and 11/12', () => {
    expect(bandFor(0)).toBe('early');
    expect(bandFor(4)).toBe('early');
    expect(bandFor(5)).toBe('middle');
    expect(bandFor(11)).toBe('middle');
    expect(bandFor(12)).toBe('teen');
    expect(bandFor(17)).toBe('teen');
  });

  it('models exactly 18 years, ages 0..17', () => {
    const r = run();
    expect(r.rows).toHaveLength(YEARS);
    expect(r.rows[0].age).toBe(0);
    expect(r.rows[17].age).toBe(17);
  });

  it('everyday total = 5 early + 7 middle + 6 teen years', () => {
    const r = run();
    expect(r.rows[4].everyday).toBe(1000);
    expect(r.rows[5].everyday).toBe(2000);
    expect(r.rows[11].everyday).toBe(2000);
    expect(r.rows[12].everyday).toBe(3000);
    expect(r.gross).toBe(5 * 1000 + 7 * 2000 + 6 * 3000); // 37,000
  });

  it('cost level scales everyday costs only', () => {
    expect(run({ level: 'high' }).gross).toBeCloseTo(37000 * 1.3, 6);
    expect(run({ level: 'low', housing: true }).gross).toBeCloseTo(37000 * 0.8 + 18 * 1200, 6);
  });

  it('band weights sum to 18.45 band-years', () => {
    expect(bandYears(BAND_WEIGHTS)).toBeCloseTo(18.45, 10);
  });
});

describe('child-cost: childcare and housing', () => {
  it('childcare runs from age 1 for careYears years, nothing at age 0', () => {
    const r = run({ careType: 'full', careYears: 3 });
    expect(r.rows[0].childcare).toBe(0);
    expect(r.rows[1].childcare).toBe(10000);
    expect(r.rows[3].childcare).toBe(10000);
    expect(r.rows[4].childcare).toBe(0);
    expect(r.byPart.childcare).toBe(30000);
  });

  it('part-time is half the full-time price, and the subsidy comes off', () => {
    expect(run({ careType: 'part', careYears: 2 }).byPart.childcare).toBe(2 * 10000 * PART_TIME_SHARE);
    expect(run({ careType: 'full', careYears: 2, careSubsidyPct: 75 }).byPart.childcare).toBe(5000);
    expect(run({ careType: 'none', careYears: 5 }).byPart.childcare).toBe(0);
  });

  it('housing share is added every year only when switched on', () => {
    expect(run({ housing: false }).byPart.housing).toBe(0);
    expect(run({ housing: true }).byPart.housing).toBe(18 * 1200);
  });
});

describe('child-cost: benefits offset', () => {
  it('benefit schedule picks the rate for the age and stops after the last age', () => {
    expect(benefitAt(DATA.benefits, 0, true)).toBe(600);
    expect(benefitAt(DATA.benefits, 5, true)).toBe(600);
    expect(benefitAt(DATA.benefits, 6, true)).toBe(300);
    expect(benefitAt(DATA.benefits, 16, false)).toBe(200);
    expect(benefitAt(DATA.benefits, 17, true)).toBe(0);
  });

  it('net = gross − benefits; benefits ignored when switched off', () => {
    const on = run({ includeBenefits: true });
    expect(on.benefits).toBe(6 * 600 + 11 * 300); // 6,900
    expect(on.net).toBe(on.gross - 6900);
    const off = run({ includeBenefits: false });
    expect(off.benefits).toBe(0);
    expect(off.net).toBe(off.gross);
  });

  it('per year and per month are the net over 18 years and 216 months', () => {
    const r = run({ includeBenefits: true });
    expect(r.perYear).toBeCloseTo(r.net / 18, 9);
    expect(r.perMonth).toBeCloseTo(r.net / 216, 9);
  });
});

describe('child-cost: inflation compounding', () => {
  it('age 0 is today\'s prices; age n is × (1 + i)^n', () => {
    const r = run({ inflationPct: 3 });
    expect(r.rows[0].everyday).toBe(1000);
    expect(r.rows[1].everyday).toBeCloseTo(1030, 9);
    expect(r.rows[17].everyday).toBeCloseTo(3000 * Math.pow(1.03, 17), 6);
  });

  it('total equals the sum of each year compounded; today\'s-money total is unchanged', () => {
    const r = run({ inflationPct: 2, includeBenefits: true, housing: true });
    let expected = 0;
    for (let a = 0; a < 18; a++) {
      const band = a <= 4 ? 1000 : a <= 11 ? 2000 : 3000;
      const ben = a <= 5 ? 600 : a <= 16 ? 300 : 0;
      expected += (band + 1200 - ben) * Math.pow(1.02, a);
    }
    expect(r.net).toBeCloseTo(expected, 6);
    expect(r.netToday).toBeCloseTo(run({ includeBenefits: true, housing: true }).net, 9);
  });

  it('zero inflation leaves nominal = today\'s money', () => {
    const r = run({ housing: true, careType: 'full', careYears: 2 });
    expect(r.gross).toBe(r.grossToday);
  });
});

describe('child-cost: more than one child', () => {
  it('costs scale per child; benefits use the eldest and additional rates', () => {
    const one = run({ includeBenefits: true, housing: true, careType: 'part', careYears: 3 });
    const three = run({ children: 3, includeBenefits: true, housing: true, careType: 'part', careYears: 3 });
    expect(three.gross).toBeCloseTo(one.gross * 3, 9);
    // eldest: 6×600 + 11×300; each additional: 6×400 + 11×200
    expect(three.benefits).toBe(6900 + 2 * (6 * 400 + 11 * 200));
    expect(three.perChildGrossToday).toBeCloseTo(one.perChildGrossToday, 9);
  });

  it('clamps nonsense inputs instead of producing NaN', () => {
    const r = run({ children: 0, careYears: 99, careType: 'full', careSubsidyPct: 150, inflationPct: NaN });
    expect(r.rows).toHaveLength(18);
    expect(Number.isFinite(r.net)).toBe(true);
    expect(r.byPart.childcare).toBe(0); // 100% subsidy cap
  });
});
