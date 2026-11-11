import { describe, expect, it } from 'vitest';
import { compareStrategies, DRAWDOWN_EXAMPLE, minPensionAge, monteCarlo, returnPaths, safeSpending, simulate, sustainableSpending, type DrawdownInput } from './uk-drawdown';

// Flat world: no growth, no inflation, no State Pension, so every figure can be worked by hand.
const flat = (o: Partial<DrawdownInput>): DrawdownInput => ({
  age: 60, pot: 100000, isa: 0, spending: 20000, statePensionWeekly: 0, region: 'rUK', strategy: 'ufpls', growth: 0, inflation: 0, endAge: 95, ...o,
});

describe('one year by hand (2027-28, allowance £12,570, basic rate 20%)', () => {
  it('UFPLS: £20,000 net needs W with 0.85W + £2,514 = £20,000', () => {
    const r = simulate(flat({}));
    const row = r.rows[0];
    // W - 0.2 x (0.75W - 12,570) = 20,000  ->  W = 17,486 / 0.85 = 20,571.76
    expect(row.fromPension).toBeCloseTo(20571.76, 0);
    expect(row.taxFree).toBeCloseTo(20571.76 * 0.25, 0);
    expect(row.tax).toBeCloseTo(0.2 * (0.75 * 20571.76 - 12570), 0);
    expect(row.fromPension - row.tax).toBeCloseTo(20000, 0);
  });
  it('take 25% up front + use the allowance: £12,570 taxed at 0%, £7,430 from tax-free cash', () => {
    const row = simulate(flat({ strategy: 'pcls-fill' })).rows[0];
    expect(row.fromPension).toBeCloseTo(12570, 0);
    expect(row.tax).toBeCloseTo(0, 6);
    expect(row.fromOutside).toBeCloseTo(7430, 0);
  });
  it('take 25% up front, spend it first: £20,000 from the £25,000 of tax-free cash, no tax', () => {
    const r = simulate(flat({ strategy: 'pcls-first' }));
    expect(r.rows[0].fromOutside).toBeCloseTo(20000, 0);
    expect(r.rows[0].fromPension).toBe(0);
    expect(r.taxFreeTaken).toBeCloseTo(25000, 6);
    // Year 2: £5,000 cash left, then taxable drawdown W with W - 0.2(W - 12,570) = 15,000 -> W = 15,607.50
    expect(r.rows[1].fromOutside).toBeCloseTo(5000, 0);
    expect(r.rows[1].fromPension).toBeCloseTo(15607.5, 0);
  });
  it('Scotland: a little less tax on small withdrawals (19% starter band), more once income reaches the 42% band', () => {
    const e1 = simulate(flat({ pot: 300000, spending: 22000 })).rows[0];
    const s1 = simulate(flat({ pot: 300000, spending: 22000, region: 'scotland' })).rows[0];
    expect(e1.tax).toBeGreaterThan(0);
    expect(s1.tax).toBeLessThan(e1.tax);
    const e = simulate(flat({ pot: 2000000, spending: 70000 })).rows[0];
    const s = simulate(flat({ pot: 2000000, spending: 70000, region: 'scotland' })).rows[0];
    expect(s.tax).toBeGreaterThan(e.tax);
    expect(s.fromPension - s.tax).toBeCloseTo(70000, 0);
  });
  it('UFPLS in the year the Lump Sum Allowance runs out still meets spending exactly', () => {
    const r = simulate(flat({ pot: 3000000, spending: 100000 }));
    const kink = r.rows.find((x) => x.taxFree > 0 && x.taxFree < x.fromPension * 0.25 - 1)!;
    expect(kink).toBeTruthy();
    expect(kink.shortfall).toBe(0);
    expect(kink.fromPension - kink.tax).toBeCloseTo(100000, 0);
  });
});

describe('Lump Sum Allowance', () => {
  it('a £1.5m pot gives £268,275 tax-free, not 25% (£375,000)', () => {
    const r = simulate(flat({ pot: 1500000, strategy: 'pcls-first' }));
    expect(r.taxFreeTaken).toBeCloseTo(268275, 6);
  });
  it('UFPLS stops being 25% tax-free once £268,275 has been taken', () => {
    const r = simulate(flat({ pot: 3000000, spending: 100000, strategy: 'ufpls' }));
    expect(r.taxFreeTaken).toBeCloseTo(268275, 0);
    const last = r.rows[r.rows.length - 1];
    expect(last.taxFree).toBe(0);
  });
});

describe('how long it lasts', () => {
  it('£120,000 at £10,000 a year, all inside the allowance: 12 years, runs out at 72', () => {
    const r = simulate(flat({ pot: 120000, spending: 10000 }));
    expect(r.rows[0].tax).toBe(0);
    expect(r.runOutAge).toBe(72);
  });
  it('ISAs are used after the pension', () => {
    const r = simulate(flat({ pot: 120000, isa: 30000, spending: 10000 }));
    expect(r.rows[0].fromOutside).toBe(0);
    expect(r.runOutAge).toBe(75);
  });
  it('cannot draw before 55 (57 from 2028-29): a 54-year-old lives on ISAs first', () => {
    expect(minPensionAge(2027)).toBe(55);
    expect(minPensionAge(2028)).toBe(57);
    const r = simulate(flat({ age: 54, isa: 0, pot: 500000, spending: 10000 }));
    expect(r.runOutAge).toBe(54);
  });
  it('a pension started before 2028 keeps paying after the age rises to 57', () => {
    const r = simulate(flat({ age: 55, pot: 500000, spending: 20000 }));
    expect(r.rows[1].fromPension).toBeGreaterThan(0);
    expect(r.runOutAge).not.toBe(56);
  });
  it('State Pension starts at the age for the birth year (55 in 2027-28 = born 1972 = 67)', () => {
    const r = simulate({ ...DRAWDOWN_EXAMPLE });
    expect(r.statePensionAge).toBe(67);
    expect(r.rows[11].statePension).toBe(0);
    expect(r.rows[12].statePension).toBeCloseTo(250.7 * 52, 0);
    expect(r.bridgeYears).toBe(12);
  });
  it('more spending never lasts longer', () => {
    const a = simulate({ ...DRAWDOWN_EXAMPLE, spending: 40000 }).runOutAge ?? 999;
    const b = simulate({ ...DRAWDOWN_EXAMPLE, spending: 60000 }).runOutAge ?? 999;
    expect(b).toBeLessThanOrEqual(a);
  });
});

describe('sustainable spending', () => {
  it('lasts at the answer and not £500 above it', () => {
    const s = sustainableSpending(DRAWDOWN_EXAMPLE);
    expect(simulate({ ...DRAWDOWN_EXAMPLE, spending: s }).runOutAge).toBeNull();
    expect(simulate({ ...DRAWDOWN_EXAMPLE, spending: s + 500 }).runOutAge).not.toBeNull();
  });
  it('flat world, pot only, allowance-sized: £120,000 over 36 years (60 to 95) = £3,333 a year', () => {
    const s = sustainableSpending(flat({ pot: 120000, spending: 1000 }));
    expect(s).toBe(3300);
  });
});

describe('strategies', () => {
  it('using the allowance every year pays less tax than spending the tax-free cash first', () => {
    const c = compareStrategies(DRAWDOWN_EXAMPLE);
    const fill = c.find((x) => x.strategy === 'pcls-fill')!, first = c.find((x) => x.strategy === 'pcls-first')!;
    expect(fill.totalTax).toBeLessThan(first.totalTax);
    expect(fill.sustainable).toBeGreaterThanOrEqual(first.sustainable);
  });
});

describe('Monte Carlo', () => {
  it('is repeatable, centred on the chosen growth, with the chosen swing', () => {
    const a = returnPaths(5, 12, 41, 200), b = returnPaths(5, 12, 41, 200);
    expect(a).toEqual(b);
    const all = a.flat().sort((x, y) => x - y);
    const median = all[Math.floor(all.length / 2)];
    const mean = all.reduce((s, x) => s + x, 0) / all.length;
    const sd = Math.sqrt(all.reduce((s, x) => s + (x - mean) ** 2, 0) / all.length);
    expect(median).toBeGreaterThan(0.04); expect(median).toBeLessThan(0.06);
    expect(sd).toBeGreaterThan(0.10); expect(sd).toBeLessThan(0.14);
  });
  it('at the fixed-return sustainable spending, roughly half the random runs last', () => {
    const s = sustainableSpending(DRAWDOWN_EXAMPLE);
    const mc = monteCarlo({ ...DRAWDOWN_EXAMPLE, spending: s }, 1000);
    expect(mc.success).toBeGreaterThan(0.3); expect(mc.success).toBeLessThan(0.7);
  });
  it('with no volatility every run equals the fixed-return plan', () => {
    const s = sustainableSpending(DRAWDOWN_EXAMPLE);
    expect(monteCarlo({ ...DRAWDOWN_EXAMPLE, spending: s, volatility: 0 }, 50).success).toBe(1);
    expect(monteCarlo({ ...DRAWDOWN_EXAMPLE, spending: s + 2000, volatility: 0 }, 50).success).toBe(0);
  });
  it('volatility lowers the safe spending below the fixed-return answer', () => {
    const safe = safeSpending(DRAWDOWN_EXAMPLE, 0.9, 300);
    expect(safe).toBeLessThan(sustainableSpending(DRAWDOWN_EXAMPLE));
    expect(monteCarlo({ ...DRAWDOWN_EXAMPLE, spending: safe }, 300).success).toBeGreaterThanOrEqual(0.9);
  });
});

describe('FIREUK example: 55, £900,000, £45,000 a year', () => {
  it('prints the figures used on the page', () => {
    const r = simulate(DRAWDOWN_EXAMPLE);
    const mc = monteCarlo(DRAWDOWN_EXAMPLE);
    const c = compareStrategies(DRAWDOWN_EXAMPLE);
    console.log(JSON.stringify({ runOut: r.runOutAge, firstTax: Math.round(r.firstYearTax), totalTax: Math.round(r.totalTax), tfc: r.taxFreeTaken, end: Math.round(r.endWealth), sustainable: sustainableSpending(DRAWDOWN_EXAMPLE), safe90: safeSpending(DRAWDOWN_EXAMPLE), success: mc.success, p10: mc.p10RunOut, c: c.map((x) => [x.strategy, x.runOutAge, Math.round(x.totalTax), x.sustainable]) }));
    expect(r.taxFreeTaken).toBe(225000);
  });
});

describe('Lump Sum Allowance already used by another pension (e.g. a final salary lump sum)', () => {
  const base = { age: 60, pot: 600000, isa: 0, spending: 30000, statePensionWeekly: 250.7, region: 'rUK' as const, strategy: 'pcls-first' as const, growth: 5, inflation: 2.5 };
  it('none used: 25% of £600,000 = £150,000 tax-free', () => {
    expect(simulate(base).taxFreeTaken).toBeCloseTo(150000, 0);
  });
  it('£200,000 used elsewhere: only £68,275 of the allowance is left', () => {
    expect(simulate({ ...base, lsaUsed: 200000 }).taxFreeTaken).toBeCloseTo(68275, 0);
  });
  it('allowance fully used elsewhere: no tax-free cash, and more income tax', () => {
    const r = simulate({ ...base, lsaUsed: 300000 });
    expect(r.taxFreeTaken).toBe(0);
    expect(r.totalTax).toBeGreaterThan(simulate(base).totalTax);
  });
});

