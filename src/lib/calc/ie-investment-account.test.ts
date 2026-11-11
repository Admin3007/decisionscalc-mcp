import { describe, it, expect } from 'vitest';
import {
  computeIia, iatFor, iatDragAt, pensionNet, simulateEtf, simulateIia, IIA, type IiaInput,
} from './ie-investment-account';
import { computeHomes } from './ie-money-homes';
import { computeEtfLots } from './ie-etf-lots';

const base: IiaInput = { contribution: 0, frequency: 'year', lumpSum: 0, years: 1, growth: 0, marginalRate: 20, retirementRate: 20, age: 35, pay: 60000 };
const run = (o: Partial<IiaInput>) => computeIia({ ...base, ...o });
const net = (r: ReturnType<typeof computeIia>, id: string) => r.options.find((o) => o.id === id)!.net;
const months = (n: number, f: (t: number) => number) => Array.from({ length: n }, (_, t) => f(t));

describe('ie-investment-account: the Bill’s formula (Finance (No. 2) Bill 2026 s.26, 747Q)', () => {
  it('constants as published on 19 Oct 2026: €12,000 limit, €50,000 threshold, 1%', () => {
    expect(IIA).toMatchObject({ limit: 12000, threshold: 50000, rate: 0.01 });
  });

  it('IAT = 1% × (average − €50,000), never negative: €50,000 → 0, €50,001 → 1 cent, €62,000 → €120', () => {
    expect(iatFor(49999)).toBe(0);
    expect(iatFor(50000)).toBe(0);
    expect(iatFor(50001)).toBeCloseTo(0.01, 10);
    expect(iatFor(62000)).toBeCloseTo(120, 10);
    expect(iatFor(250000)).toBeCloseTo(2000, 10);
  });

  it('drag of the 1% at a balance: €100,000 → 0.5%, €500,000 → 0.9%, under €50,000 → 0', () => {
    expect(iatDragAt(100000)).toBeCloseTo(0.5, 10);
    expect(iatDragAt(500000)).toBeCloseTo(0.9, 10);
    expect(iatDragAt(40000)).toBe(0);
    expect(iatDragAt(0)).toBe(0);
  });

  it('the average is over the year, not the year-end value: €40,000 all year then €40,000 more in the last month', () => {
    // Zero growth: 11 months at €40,000 and one month at €80,000 → average €43,333, no tax, though the year ends at €80,000.
    const r = simulateIia(months(12, (t) => (t === 0 ? 40000 : t === 11 ? 40000 : 0)), 0);
    expect(r.averages[0]).toBeCloseTo(40000 + 40000 / 12, 6);
    expect(r.iat[0]).toBe(0);
    expect(r.net).toBe(80000);
  });
});

describe('ie-investment-account: threshold and limit edges (hand-checked, zero growth)', () => {
  it('€10,000 a year: €50,000 exactly in year 5 pays nothing; €60,000 in year 6 pays €100', () => {
    const r = run({ contribution: 10000, years: 6 });
    expect(r.years[4].iiaAverage).toBe(50000);
    expect(r.years[4].iat).toBe(0);
    expect(r.years[5].iiaAverage).toBe(60000);
    expect(r.years[5].iat).toBe(100);
    expect(r.firstIatYear).toBe(6);
    expect(net(r, 'iia')).toBe(59900);
  });

  it('€12,000 a year fits the limit exactly; €1,000 a month too; €1,001 a month spills €12 a year into the ETF', () => {
    expect(run({ contribution: 12000, years: 3 }).iiaOverflow).toBe(0);
    expect(run({ contribution: 1000, frequency: 'month', years: 3 }).iiaOverflow).toBe(0);
    expect(run({ contribution: 1001, frequency: 'month', years: 2 }).iiaOverflow).toBe(24);
  });

  it('a €20,000 lump sum: €12,000 goes in, and in year 1 the €8,000 rest plus every monthly payment goes to the ETF', () => {
    const r = run({ lumpSum: 20000, contribution: 1000, frequency: 'month', years: 3 });
    expect(r.iiaOverflow).toBe(8000 + 12000);
    expect(r.yourMoney).toBe(20000 + 36000);
    expect(r.options.find((o) => o.id === 'iia')!.note).toContain('€20,000 above the €12,000-a-year limit');
  });

  it('zero growth: nothing to tax, so IIA, ETF and shares all give back exactly what went in', () => {
    const r = run({ contribution: 12000, years: 3 });
    expect(net(r, 'iia')).toBe(36000);
    expect(net(r, 'etf')).toBe(36000);
    expect(net(r, 'shares')).toBe(36000);
  });

  it('every option starts from the same money of your own', () => {
    const r = run({ lumpSum: 5000, contribution: 400, frequency: 'month', years: 12, growth: 5 });
    expect(new Set(r.options.map((o) => o.yourMoney))).toEqual(new Set([5000 + 400 * 12 * 12]));
  });
});

describe('ie-investment-account: ETF, shares and pension legs (hand-checked)', () => {
  it('one year at 10% on €12,000: IIA €13,200 (no tax under €50,000); ETF €12,780 (35% of €1,200); shares €13,200 (gain under €1,270)', () => {
    const r = run({ lumpSum: 12000, years: 1, growth: 10 });
    expect(net(r, 'iia')).toBe(13200);
    expect(net(r, 'etf')).toBe(12780);
    expect(net(r, 'shares')).toBe(13200);
  });

  it('ETF deemed disposal: €10,000 at 5% for 9 years → €1,671.09 tax at year 8, €13,529.32 after selling in year 9', () => {
    const v8 = 10000 * 1.05 ** 8;
    const due8 = (v8 - 10000) * 0.35;
    const v9 = (v8 - due8) * 1.05;
    const final = v9 - (v9 + due8 - 10000) * 0.35 + due8;
    const r = simulateEtf(months(108, (t) => (t === 0 ? 10000 : 0)), 0.05, 2027);
    expect(r.deemedByYear[7]).toBeCloseTo(due8, 6);
    expect(due8).toBeCloseTo(1671.09, 2);
    expect(r.net).toBeCloseTo(final, 6);
    expect(final).toBeCloseTo(13529.32, 2);
    // Same first deemed-disposal tax as the ETF lots calculator (tax at the 8-year date, 35% from 2027).
    const lots = computeEtfLots({ lots: [{ bought: '2027-01-01', cost: 10000 }], growth: 5, until: '2036-01-01' }, '2027-01-01');
    expect(lots.events[0].due).toBeCloseTo(due8, 0);
  });

  it('a lump sum in the ETF matches the "Where should my money go?" calculator (€10,000, 5%, 20 years)', () => {
    const homes = computeHomes({ amount: 10000, years: 20, growth: 5, depositRate: 2, marginalRate: 20, startYear: 2026 });
    const etf = simulateEtf(months(240, (t) => (t === 0 ? 10000 : 0)), 0.05, 2026);
    expect(Math.round(etf.net)).toBe(homes.homes.find((h) => h.id === 'etf')!.net);
  });

  it('pension, zero growth, 20% relief, age 35 on €60,000: €9,600 of yours a year buys €12,000 (20% limit); €2,400 spills to the ETF', () => {
    const r = run({ contribution: 12000, years: 3 });
    expect(r.pensionOverflow).toBe(7200);
    // Pot €36,000: €9,000 lump sum tax-free, €27,000 taxed at 20% → €21,600; plus €7,200 in the ETF.
    expect(net(r, 'pension')).toBe(9000 + 21600 + 7200);
  });

  it('pension, 40% relief at age 45: €9,000 of yours buys €15,000 (25% of €60,000); drawn at 20% → €12,750', () => {
    const r = run({ contribution: 9000, years: 1, marginalRate: 40, retirementRate: 20, age: 45 });
    expect(r.pensionOverflow).toBe(0);
    expect(r.options.find((o) => o.id === 'pension')!.gross).toBe(15000);
    expect(net(r, 'pension')).toBe(3750 + 11250 * 0.8);
    expect(r.pensionLocked).toBe(true);
    expect(r.endAge).toBe(46);
  });

  it('lump sum bands: €1m pot → €250,000 lump, €10,000 tax on it; €2.4m pot → €100,000 tax on a €600,000 lump', () => {
    expect(pensionNet(1000000, 0.4)).toMatchObject({ lump: 250000, tax: 10000 + 300000, net: 690000 });
    const big = pensionNet(2400000, 0.4);
    expect(big.lump).toBe(600000);
    expect(big.tax).toBeCloseTo(60000 + 40000 + 1800000 * 0.4, 6);
  });
});

describe('ie-investment-account: comparison, crossover and ordering', () => {
  it('worked example on the page: €1,000 a month for 20 years at 5%, 40% now, 20% in retirement, age 40 on €70,000', () => {
    const r = run({ contribution: 1000, frequency: 'month', years: 20, growth: 5, marginalRate: 40, retirementRate: 20, age: 40, pay: 70000 });
    expect(r.yourMoney).toBe(240000);
    expect(r.iiaOverflow).toBe(0);
    expect(net(r, 'iia')).toBeGreaterThan(net(r, 'etf'));
    expect(net(r, 'pension')).toBeGreaterThan(net(r, 'iia'));
    expect(r.pensionThenIiaThenEtf).toBe(true);
    expect(r.pensionLocked).toBe(false);
    expect(r.crossoverYear).toBeNull();
    expect(r.order).toContain('pension first, then IIA, then ETF" order holds');
  });

  it('at 7% for 30 years the IIA stays ahead of the ETF every year (1% above €50,000 < 35% of 7%)', () => {
    const r = run({ contribution: 12000, years: 30, growth: 7 });
    expect(r.crossoverYear).toBeNull();
    expect(r.dragOvertakeYear).toBeNull();
    expect(r.etfDragPct).toBe(2.45);
    expect(r.years.every((y) => y.iia >= y.etf)).toBe(true);
  });

  it('at 1.5% growth the 1% charge overtakes the ETF’s 0.525% drag, and later the ETF leaves more', () => {
    const r = run({ contribution: 12000, years: 40, growth: 1.5, age: 25, pay: 50000 });
    expect(r.etfDragPct).toBeCloseTo(0.525, 1);
    expect(r.dragOvertakeYear).not.toBeNull();
    expect(r.crossoverYear).not.toBeNull();
    expect(r.crossoverYear!).toBeGreaterThan(r.dragOvertakeYear!);
    expect(net(r, 'etf')).toBeGreaterThan(net(r, 'iia'));
    expect(r.pensionThenIiaThenEtf).toBe(false);
    expect(r.order).toContain('does not hold');
  });

  it('final-year drag is the 1% scaled by how much of the average is over €50,000', () => {
    const r = run({ contribution: 12000, years: 15, growth: 5 });
    const last = r.years[14];
    expect(r.iatDragPct).toBeCloseTo((100 * (last.iiaAverage - 50000) * 0.01) / last.iiaAverage, 1);
    expect(r.iatDragPct).toBeLessThan(1);
  });

  it('bad input falls back to safe values instead of NaN', () => {
    const r = computeIia({ contribution: NaN, years: 0, growth: NaN, marginalRate: 33, age: NaN } as unknown as IiaInput);
    expect(r.years).toHaveLength(1);
    expect(r.options.every((o) => Number.isFinite(o.net))).toBe(true);
    expect(computeIia({ ...base, years: 99 }).years).toHaveLength(40);
  });
});
