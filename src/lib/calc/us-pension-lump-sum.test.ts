import { describe, it, expect } from 'vitest';
import { compareLumpSum, lifeExpectancy, survival, qx, LUMP_EXAMPLE, type LumpInput } from './us-pension-lump-sum';
import { SSA_LIFE, PBGC_MAX } from '../../data/ssa-period-life-2023';

const base: LumpInput = LUMP_EXAMPLE;

describe('SSA 2023 period life table', () => {
  it('stores ages 18 to 119 for both sexes, read from the page', () => {
    expect(SSA_LIFE.male.q).toHaveLength(102);
    expect(SSA_LIFE.female.e).toHaveLength(102);
    // Spot values copied from ssa.gov/oact/STATS/table4c6.html
    expect(qx('male', 62)).toBe(0.013196);
    expect(qx('female', 65)).toBe(0.010188);
    expect(lifeExpectancy('male', 62)).toBe(20.29);
    expect(lifeExpectancy('female', 62)).toBe(23.08);
  });

  it('our survival curve reproduces SSA life expectancy (uniform deaths within each year)', () => {
    for (const sex of ['male', 'female'] as const) for (const a of [40, 55, 62, 65, 80, 95]) {
      const s = survival(sex, a);
      let e = 0;
      for (let k = 0; k < 100; k++) e += (s(k) + s(k + 1)) / 2;
      expect(Math.abs(e - lifeExpectancy(sex, a))).toBeLessThan(0.006);
    }
  });

  it('unisex sits between male and female; nobody survives past 120', () => {
    const u = lifeExpectancy('unisex', 62);
    expect(u).toBeGreaterThan(20.29);
    expect(u).toBeLessThan(23.08);
    expect(survival('female', 62)(58.5)).toBe(0);
    expect(survival('male', 62)(1)).toBeCloseTo(1 - 0.013196, 10);
  });
});

describe('worked example: $111,000 or $911 a month from 62 (male, single life, no COLA)', () => {
  const r = compareLumpSum(base);

  it('plain break-even: 122 payments, the last at 72 years 1 month (111,000 / 911 = 121.8)', () => {
    expect(r.breakEvenAge).toBeCloseTo(62 + 121 / 12, 9);
  });

  it('implied rate to life expectancy (20.29 years = 244 payments) is about 8.2%: hand annuity-due check', () => {
    const i = r.impliedRateToLe!;
    const v = Math.pow(1 + i, -1 / 12);
    const pv = 911 * (1 - Math.pow(v, 244)) / (1 - v);
    expect(pv).toBeCloseTo(111000, 0);
    expect(i).toBeGreaterThan(0.081);
    expect(i).toBeLessThan(0.083);
  });

  it('survival-weighted implied rate is about 7.1% and makes the expected payments worth exactly $111,000', () => {
    expect(r.impliedRate!).toBeGreaterThan(0.07);
    expect(r.impliedRate!).toBeLessThan(0.072);
    const at = compareLumpSum({ ...base, returnPct: r.impliedRate! * 100 });
    expect(at.pvAtReturn).toBeCloseTo(111000, 0);
  });

  it('at a 5% return the lump sum paying $911 lasts 167 months, to about 75 years 11 months (hand annuity-due check)', () => {
    const rm = Math.pow(1.05, 1 / 12) - 1, v = 1 / (1 + rm);
    const n = Math.floor(-Math.log(1 - 111000 * (1 - v) / 911) / Math.log(1 + rm));
    expect(n).toBe(167);
    expect(r.runOutAge).toBeCloseTo(62 + 167 / 12, 9);
  });

  it('break-even at your return is the age the invested lump sum runs out (same thing, two views)', () => {
    expect(r.breakEvenAgeAtReturn).toBeCloseTo(r.runOutAge!, 9);
    for (const x of [{ returnPct: 3 }, { returnPct: 7, colaPct: 2 }, { currentAge: 55, startAge: 65 }]) {
      const y = compareLumpSum({ ...base, ...x });
      expect(y.breakEvenAgeAtReturn).toBeCloseTo(y.runOutAge!, 9);
    }
  });

  it('pension worth more than the lump sum at 5% when the implied rate is above 5%', () => {
    expect(r.pvAtReturn).toBeGreaterThan(111000);
    expect(r.pvGain).toBeCloseTo(r.pvAtReturn - 111000, 6);
    const hi = compareLumpSum({ ...base, returnPct: 9 });
    expect(hi.pvGain).toBeLessThan(0);
  });

  it('without a COLA, $911 at 82.29 is worth 911 / 1.025^20.29 in today’s money', () => {
    expect(r.lifeExpectancyAge).toBeCloseTo(82.29, 6);
    expect(r.realMonthlyAtLe).toBeCloseTo(911 / Math.pow(1.025, 20.29), 6);
    expect(r.buyingPowerLost).toBeGreaterThan(0.39);
  });

  it('PBGC 2026 and 2027 maximums at 62 are read from the tables', () => {
    expect(r.pbgc![2026]).toEqual([6153.92, 5538.53]);
    expect(r.pbgc![2027]).toEqual([6409.78, 5768.8]);
    expect(PBGC_MAX.years[2026][65][0]).toBe(7789.77);
    expect(compareLumpSum({ ...base, startAge: 80, currentAge: 80 }).pbgc).toBeNull();
  });
});

describe('other cases', () => {
  it('a woman (longer life expectancy) gets a higher implied rate from the same offer', () => {
    const m = compareLumpSum(base), f = compareLumpSum({ ...base, sex: 'female' });
    expect(f.impliedRate!).toBeGreaterThan(m.impliedRate!);
    expect(f.lifeExpectancyAge).toBeCloseTo(85.08, 6);
  });

  it('a survivor benefit raises the value; 0% survivor equals single life', () => {
    const s = compareLumpSum(base);
    const j = compareLumpSum({ ...base, form: 'joint', spouseAge: 60, survivorPct: 50 });
    const j0 = compareLumpSum({ ...base, form: 'joint', spouseAge: 60, survivorPct: 0 });
    expect(j.impliedRate!).toBeGreaterThan(s.impliedRate!);
    expect(j0.pvAtReturn).toBeCloseTo(s.pvAtReturn, 6);
    expect(j.spouseLifeExpectancyAge).toBeCloseTo(60 + 24.73, 6); // female 60: 24.73
    expect(j.pEitherAliveAtRunOut!).toBeGreaterThan(j.pAliveAtRunOut!);
  });

  it('a COLA raises the implied rate and the real payment', () => {
    const c = compareLumpSum({ ...base, colaPct: 2 });
    const b = compareLumpSum(base);
    expect(c.impliedRate!).toBeGreaterThan(b.impliedRate!);
    expect(c.realMonthlyAtLe).toBeGreaterThan(b.realMonthlyAtLe);
    // COLA steps once a year: payment 13 (month 12) is 911 x 1.02
    expect(c.breakEvenAge!).toBeLessThan(b.breakEvenAge!);
  });

  it('deferred pension: lump sum now at 55, $1,000 a month from 65; growth before 65 counts', () => {
    const d = compareLumpSum({ ...base, currentAge: 55, startAge: 65, lumpSum: 100000, monthly: 1000 });
    expect(d.deferMonths).toBe(120);
    expect(d.under59Half).toBe(true);
    expect(d.breakEvenAge).toBeCloseTo(65 + 99 / 12, 9); // 100 payments
    // At 5% for 10 years the lump sum is 162,889 by 65, so it lasts far longer than 100 months
    expect(d.runOutAge!).toBeGreaterThan(80);
  });

  it('start age before the current age is treated as starting now; bad input is safe', () => {
    const a = compareLumpSum({ ...base, startAge: 50 });
    expect(a.deferMonths).toBe(0);
    const z = compareLumpSum({ ...base, lumpSum: NaN as any, monthly: -5 });
    expect(z.impliedRate).toBeNull();
    expect(Number.isFinite(z.pvAtReturn)).toBe(true);
  });

  it('a lump sum bigger than everything the pension could ever pay gives no rate in range', () => {
    const r = compareLumpSum({ ...base, lumpSum: 1e9 });
    expect(r.impliedRate).toBeNull();
    expect(r.breakEvenAge).toBeNull();
  });
});
