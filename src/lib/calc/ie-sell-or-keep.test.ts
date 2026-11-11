import { describe, it, expect } from 'vitest';
import {
  computeSellOrKeep, keepPath, sellPath, saleNow, allocate, rentalTax, indexationFactor, propertyGain, pensionLimitPct, annuity,
  breakEvenGrowth, EXAMPLE, INDEXATION, RENT_CAP, RTB_FEE, PRSI_LATER, PENSION_EARNINGS_CAP, type SellOrKeepInput, type Property,
} from './ie-sell-or-keep';
import { computeLandlord } from './ie-landlord';
import { computeHomes } from './ie-money-homes';

const clone = (x: SellOrKeepInput): SellOrKeepInput => JSON.parse(JSON.stringify(x));
const prop = (p: Partial<Property> = {}): Property => ({ ...EXAMPLE.properties[0], ...p });

describe('sell or keep: official rules (read 2026-11-04)', () => {
  it('pins the figures', () => {
    expect(RENT_CAP).toBe(0.02);
    expect(RTB_FEE).toBe(40);
    expect(PRSI_LATER).toBe(0.047); // 4.7% from 1 Oct 2028 (PRSI roadmap, S.I. 534/2024)
    expect(PENSION_EARNINGS_CAP).toBe(115000);
    expect([29, 30, 40, 50, 55, 60, 70].map(pensionLimitPct)).toEqual([0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.4]);
    // Revenue multiplier table, column "31 Dec 2004 et seq".
    expect([INDEXATION[1974], INDEXATION[1990], INDEXATION[2001], INDEXATION[2002]]).toEqual([7.528, 1.442, 1.087, 1.049]);
  });

  it('indexation: tax years run 6 April to 5 April until 2001', () => {
    expect(indexationFactor('1990-03-31')).toBe(1.503); // 1989/90
    expect(indexationFactor('1990-04-06')).toBe(1.442); // 1990/91 (Revenue's worked example multiplier)
    expect(indexationFactor('2001-03-01')).toBe(1.144); // 2000/01
    expect(indexationFactor('2001-07-01')).toBe(1.087); // the short 2001 year
    expect(indexationFactor('2002-12-31')).toBe(1.049);
    expect(indexationFactor('2003-01-01')).toBe(1);
    expect(indexationFactor('1970-01-01')).toBe(7.528);
  });

  it('indexation never creates or increases a loss', () => {
    const p = prop({ purchasePrice: 200000, buyingCosts: 0, enhancement: 0, purchaseDate: '1998-06-01' });
    expect(propertyGain(p, 300000, 0)).toBeCloseTo(300000 - 200000 * 1.212, 6);  // indexed gain
    expect(propertyGain(p, 230000, 0)).toBe(0);                                  // real gain, indexed loss: nil
    expect(propertyGain(p, 180000, 0)).toBe(-20000);                             // real loss, not increased
  });

  it('sale now: selling costs, CGT 31% after the €1,270 exemption, mortgage, RPRIR clawback', () => {
    const s = saleNow(EXAMPLE);
    const costs = 380000 * 1.5 * 1.23 / 100 + 2500;
    expect(s.saleCosts).toBeCloseTo(costs, 6);
    expect(s.gain).toBeCloseTo(380000 - costs - 210000 - 6000, 6);
    expect(s.rate).toBe(0.31);
    expect(s.cgt).toBeCloseTo((s.gain - 1270) * 0.31, 1);
    expect(s.clawback).toBe(1400);                      // first claimed 2024, sold 2026: within 4 years
    expect(s.net).toBeCloseTo(380000 - costs - 90000 - s.cgt - 1400, 2);
    expect(s.payBy).toBe('2026-12-15');
    const old = saleNow({ ...EXAMPLE, a: { ...EXAMPLE.a, saleDate: '2026-10-01' } });
    expect(old.rate).toBe(0.33);
  });

  it('RPRIR clawback stops 4 years after the first year claimed (Revenue: 2024 claim, 2027 sale clawed back)', () => {
    const i = clone(EXAMPLE);
    i.owners[0].rprirFirstYear = 2022;
    expect(saleNow(i).clawback).toBe(0);
    i.owners[0].rprirFirstYear = 2024;
    const rows = keepPath(i);
    expect(rows[0].clawback).toBe(1400 + 1000);          // sold end of 2027: 2024, 2025 and 2027 relief back
    expect(rows[1].clawback).toBe(0);                    // 2028 is 4 years on
  });

  it('joint owners: each has their own €1,270 exemption and pays at their own rate', () => {
    const i = clone(EXAMPLE);
    i.owners = [{ ...i.owners[0], rprirClaimed: 0, rprirFirstYear: null }, { status: 'single', pay: 30000, age: 50, rprirClaimed: 0, rprirFirstYear: null }];
    i.properties[0].owner1Share = 0.5;
    const s = saleNow(i);
    expect(s.cgt).toBeCloseTo((s.gain - 2 * 1270) * 0.31, 1);
    expect(s.owners[0].gain).toBeCloseTo(s.gain / 2, 6);
  });

  it('keep, year 1 (2027): tax equals the landlord tax calculator for the same profit', () => {
    const o = { status: 'single' as const, pay: 60000, age: 40 };
    const t = rentalTax(o, 14000, 1, true);
    const ll = computeLandlord({ year: 2027, status: 'single', pay: 60000, rent: 20000, mortgageInterest: 6000, rtbRegistered: true, otherExpenses: 0, furnishings: 0 });
    expect(t.total).toBeCloseTo(ll.totalTax, 2);
    // From 2028: no RPRIR, PRSI 4.5%.
    const later = rentalTax(o, 14000, 2, true);
    expect(later.rprir).toBe(0);
    expect(later.prsi).toBeCloseTo(14000 * (0.045 * 0.75 + 0.047 * 0.25), 6); // 2028: 4.5% to Sep, 4.7% from Oct
  });

  it('keep: rent grows by the lower of your guess, 2% and CPI; LPT is a cost but not deductible', () => {
    const i = clone(EXAMPLE);
    i.a.rentGrowth = 5; i.a.inflation = 1.5;
    const rows = keepPath(i);
    expect(rows[1].rent).toBeCloseTo(24000 * 1.015, 6);
    i.a.rentCap = false;
    expect(keepPath(i)[1].rent).toBeCloseTo(24000 * 1.05, 6);
    const a = clone(EXAMPLE); a.properties[0].lpt = 0;
    const b = clone(EXAMPLE); b.properties[0].lpt = 1000;
    expect(keepPath(a)[0].tax).toBeCloseTo(keepPath(b)[0].tax, 6);
    expect(keepPath(a)[0].cash - keepPath(b)[0].cash).toBeCloseTo(1000, 6);
  });

  it('keep: the mortgage is cleared on schedule and interest is the deductible part', () => {
    const rows = keepPath(EXAMPLE);
    const pmt = annuity(90000, 4, 10);
    expect(rows[0].interest).toBeCloseTo(3600, 6);
    expect(rows[0].capital).toBeCloseTo(pmt - 3600, 6);
    expect(rows[9].mortgageLeft).toBeCloseTo(0, 4);
  });

  it('sell: each investment matches the "Where should my money go?" calculator at the end', () => {
    for (const [key, id] of [['deposit', 'deposit'], ['etf', 'etf'], ['state', 'state'], ['pension', 'pension']] as const) {
      for (const years of [2, 5, 9, 10, 17]) {
        const i = clone(EXAMPLE);
        i.a.years = years;
        i.a.mix = { state: 0, deposit: 0, etf: 0, pension: 0, mortgage: 0, [key]: 100 };
        i.owners[0].pay = 1e6; i.owners[0].age = 60; // pension limit not binding
        const s = saleNow(i);
        const path = sellPath(i, s);
        const home = (amount: number, which: string) => computeHomes({ amount, years, growth: i.a.investReturn, depositRate: i.a.depositRate, marginalRate: 40, retirementRate: 20 }).homes.find((x) => x.id === which)!.net;
        // The pension takes what the age limit allows (40% of €115,000 after relief); the rest goes on deposit.
        const inPension = key === 'pension' ? allocate(i, s).pension[0] : 0;
        const want = key === 'pension' ? home(inPension, 'pension') + home(s.net - inPension, 'deposit') : home(s.net, id);
        expect(Math.round(path[years]), `${key} ${years}y`).toBeCloseTo(want, -1);
      }
    }
  });

  it('sell: pension within the age limit on earnings up to €115,000; home mortgage up to its balance; the rest on deposit', () => {
    const i = clone(EXAMPLE);
    i.a.mix = { state: 0, deposit: 0, etf: 0, pension: 50, mortgage: 50 };
    i.a.homeMortgageBalance = 40000;
    const s = saleNow(i);
    const b = allocate(i, s);
    expect(b.pension[0]).toBeCloseTo(0.3 * 70000 * 0.6, 6);       // age 52: 30%, after 40% relief
    expect(b.pensionGross[0]).toBeCloseTo(0.3 * 70000, 6);
    expect(b.mortgage).toBe(40000);
    expect(b.deposit).toBeCloseTo(s.net - b.pension[0] - 40000, 6);
  });

  it('break-even house-price growth leaves the two paths level', () => {
    const be = breakEvenGrowth(EXAMPLE)!;
    expect(be).not.toBeNull();
    const at = computeSellOrKeep({ ...EXAMPLE, a: { ...EXAMPLE.a, houseGrowth: be } });
    expect(Math.abs(at.diff)).toBeLessThan(600); // be is rounded to 0.01%
  });

  it('example: keeping beats selling at 3% growth; income figures', () => {
    const r = computeSellOrKeep(EXAMPLE);
    expect(r.rows).toHaveLength(10);
    expect(r.rows[0].year).toBe(2027);
    expect(r.diff).toBeGreaterThan(0);
    expect(r.keepIncome).toBeCloseTo(r.rows[0].cash, 6);
    expect(r.sellIncome).toBeGreaterThan(0);
  });

  it('negative equity: the sell path carries the shortfall', () => {
    const i = clone(EXAMPLE);
    i.properties[0].mortgageBalance = 450000;
    const r = computeSellOrKeep(i);
    expect(r.sale.net).toBeLessThan(0);
    expect(r.rows[0].sell).toBeCloseTo(r.sale.net, 6);
  });
});

describe('sell or keep: owners (found by the planner contract test, 4 Nov 2026)', () => {
  const twoOwners = (): SellOrKeepInput => {
    const i = clone(EXAMPLE);
    i.owners = [{ status: 'single', pay: 70000, age: 52 }, { status: 'single', pay: 45000, age: 67 }];
    i.properties = [{ ...i.properties[0], owner1Share: 1 }, { ...i.properties[0], name: 'Second', owner1Share: 0.5, mortgageBalance: 0, furnishings: 0 }];
    return i;
  };
  it('each owner is taxed on their own share of each property', () => {
    const i = twoOwners();
    const rows = keepPath(i);
    // Owner 2 owns half of the second flat only: profit = half its rent less half its deductible costs.
    const p2 = (24000 - 3200 - RTB_FEE) / 2;
    const t2 = rentalTax(i.owners[1], p2, 1, true);
    const p1 = 24000 - 3240 - 3600 - 750 + p2;
    const t1 = rentalTax(i.owners[0], p1, 1, true);
    expect(rows[0].tax).toBeCloseTo(t1.total + t2.total, 6);
  });
  it('no PRSI on rent from age 66, with or without the over66 flag', () => {
    expect(rentalTax({ status: 'single', pay: 30000, age: 67 }, 20000, 2, true).prsi).toBe(0);
    expect(rentalTax({ status: 'single', pay: 30000, age: 65 }, 20000, 2, true).prsi).toBeCloseTo(910, 6); // 2028 blended 4.55%
  });
});
