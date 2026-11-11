import { describe, it, expect } from 'vitest';
import { project, compareRetireAges, sustainableSpending, IE_DEFAULT, IE_PARTNER, PACKS, type PlanInput } from './index';

const ie = PACKS.ie;
const plan = (o: Partial<PlanInput> = {}, p: object = {}): PlanInput => ({ ...IE_DEFAULT, ...o, people: [{ ...IE_DEFAULT.people[0], ...p }, ...(o.people?.slice(1) ?? [])] });

describe('retirement engine (Ireland)', () => {
  it('projects every year from age now to 95', () => {
    const r = project(IE_DEFAULT, ie);
    expect(r.rows[0]).toMatchObject({ year: 2027, age1: 55, retired: false });
    expect(r.rows.at(-1)!.age1).toBe(95);
    expect(r.rows).toHaveLength(41);
  });

  it('pays spending from income, savings, then the ARF until the money runs out', () => {
    const r = project(IE_DEFAULT, ie);
    for (const y of r.rows.filter((x) => x.retired)) {
      expect(y.netIncome + y.fromSavings + y.shortfall).toBeGreaterThanOrEqual(y.spending - 0.01);
      if (y.shortfall > 1) expect(y.savingsEnd + y.arfEnd).toBeLessThan(1);
    }
    expect(r.runOutAge).toBeGreaterThan(80);
    expect(r.bridgeYears).toBe(6);
  });

  it('draws the pot at retirement: 25% lump sum (tax-free under €200,000) and the rest to the ARF', () => {
    const r = project(plan({}, { age: 60, retireAge: 60, pensionPot: 400000, salary: 0 }), ie);
    expect(r.lumpSums).toEqual({ gross: 100000, tax: 0 });
    expect(r.rows[0].potEnd).toBe(0);
    // ARF: €300,000 grows 4.5%; no imputed distribution at 60, 4% at 61
    expect(r.rows[1].arfMin).toBeCloseTo(0.04 * (r.rows[0].arfEnd * 1.045), 6);
  });

  it('a large pot pays 20% on the lump sum between €200,000 and €500,000', () => {
    const r = project(plan({}, { age: 60, retireAge: 60, pensionPot: 1200000, salary: 0 }), ie);
    expect(r.lumpSums.gross).toBe(300000);
    expect(r.lumpSums.tax).toBeCloseTo(20000, 6);
  });

  it('nothing saved and no pension: the shortfall starts the first year of retirement', () => {
    const r = project(plan({ savings: 0, savingsAdd: 0 }, { age: 60, retireAge: 60, pensionPot: 0, salary: 0, statePensionWeekly: 0 }), ie);
    expect(r.runOutAge).toBe(60);
  });

  it('plenty of money: lasts beyond 95', () => {
    const r = project(plan({ savings: 3000000 }), ie);
    expect(r.runOutAge).toBeNull();
  });

  it('retiring later never makes the money run out sooner', () => {
    const c = compareRetireAges(IE_DEFAULT, ie, [60, 62, 65]);
    const age = (x: number | null) => x ?? 999;
    expect(age(c[1].runOutAge)).toBeGreaterThanOrEqual(age(c[0].runOutAge));
    expect(age(c[2].runOutAge)).toBeGreaterThanOrEqual(age(c[1].runOutAge));
    expect(c.map((x) => x.bridgeYears)).toEqual([6, 4, 1]);
  });

  it('a DB pension starts at its age and rises by its increase', () => {
    const r = project(plan({}, { dbPension: 20000, dbFromAge: 60, dbIndex: 2 }), ie);
    const at = (a: number) => r.rows.find((x) => x.age1 === a)!;
    expect(at(59).db).toBe(0);
    expect(at(60).db).toBe(20000);
    expect(at(62).db).toBeCloseTo(20000 * 1.02 ** 2, 6);
  });

  it('State Pension from 66 at the weekly rate in today’s money, rising with inflation', () => {
    const r = project(IE_DEFAULT, ie);
    const y = r.rows.find((x) => x.age1 === 66)!;
    expect(y.statePension).toBeCloseTo(309.3 * 52 * 1.02 ** 11, 6);
    expect(r.rows.find((x) => x.age1 === 65)!.statePension).toBe(0);
  });

  it('couple: a married couple with one income pays less tax than the same couple cohabiting', () => {
    const couple = (h: 'married' | 'cohabiting'): PlanInput => ({ ...IE_DEFAULT, household: h, spending: 45000, people: [IE_DEFAULT.people[0], { ...IE_PARTNER, salary: 0, pensionPot: 0, statePensionWeekly: 0 }] });
    const tax = (h: 'married' | 'cohabiting') => project(couple(h), ie).rows.slice(0, 5).reduce((a, r) => a + r.incomeTax, 0);
    expect(tax('married')).toBeLessThan(tax('cohabiting'));
    expect(project(couple('married'), ie).rows[0].age2).toBe(55);
  });

  it('UK State Pension: pounds to euros at the plan rate from its age, rising with inflation, income tax but no USC', () => {
    const uk = 241.3 * 20 / 35; // 20 UK qualifying years
    const withUk = project(plan({ gbpPerEur: 0.8346 }, { ukPensionWeekly: uk, ukPensionAge: 67 }), ie);
    const without = project(IE_DEFAULT, ie);
    const at = (r: typeof withUk, a: number) => r.rows.find((x) => x.age1 === a)!;
    expect(at(withUk, 66).ukPension).toBe(0);
    expect(at(withUk, 67).ukPension).toBeCloseTo((uk / 0.8346) * 52 * 1.02 ** 12, 6);
    expect(at(withUk, 70).usc).toBeCloseTo(at(without, 70).usc, 6);
    expect(at(withUk, 70).incomeTax).toBeGreaterThan(at(without, 70).incomeTax);
    expect(withUk.runOutAge ?? 999).toBeGreaterThan(without.runOutAge ?? 999);
  });

  it('UK State Pension age defaults from the year of birth', () => {
    const r = project(plan({}, { age: 50, ukPensionWeekly: 100 }), ie); // born 1977: 68
    expect(r.rows.find((x) => x.age1 === 67)!.ukPension).toBe(0);
    expect(r.rows.find((x) => x.age1 === 68)!.ukPension).toBeGreaterThan(0);
  });

  it('flags a pot over the Standard Fund Threshold', () => {
    expect(project(plan({}, { pensionPot: 2500000 }), ie).overThreshold).toBe(true);
    expect(project(IE_DEFAULT, ie).overThreshold).toBe(false);
  });

  it('sustainable spending lasts to 95, and €200 more a year does not', () => {
    const s = sustainableSpending(IE_DEFAULT, ie);
    expect(project({ ...IE_DEFAULT, spending: s }, ie).runOutAge).toBeNull();
    expect(project({ ...IE_DEFAULT, spending: s + 200 }, ie).runOutAge).not.toBeNull();
  });

  it('bad inputs fall back to safe values', () => {
    const r = project({ ...IE_DEFAULT, savings: NaN, people: [{ ...IE_DEFAULT.people[0], age: -5, salary: 'x' as any }] }, ie);
    expect(r.rows[0].age1).toBe(18);
    expect(r.rows[0].salary).toBe(0);
  });
});
