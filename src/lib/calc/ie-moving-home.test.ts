import { describe, it, expect } from 'vitest';
import { computeMove, originTax, irishCareEach, CHILD_BENEFIT_MONTH, FX, IE_RENT } from './ie-moving-home';
import { computeYear } from './ie-budget-2027';

describe('moving home to Ireland: tax where you live now (worked by hand)', () => {
  it('UK (rest of UK), £50,000: 20% and 8% NI above £12,570', () => {
    expect(originTax({ origin: 'gb', couple: false }, 50000, 0)).toBeCloseTo((50000 - 12570) * 0.2 + (50000 - 12570) * 0.08, 6);
  });
  it('Scotland, £50,000: the six Scottish bands on £37,430 taxable', () => {
    const it_ = 3967 * 0.19 + (16956 - 3967) * 0.2 + (31092 - 16956) * 0.21 + (37430 - 31092) * 0.42;
    expect(originTax({ origin: 'gb-sct', couple: false }, 50000, 0)).toBeCloseTo(it_ + (50000 - 12570) * 0.08, 6);
  });
  it('Australia 2027-28, A$90,000: 14% / 30%, no LITO at this income, 2% Medicare levy', () => {
    expect(originTax({ origin: 'au', couple: false }, 90000, 0)).toBeCloseTo((45000 - 18200) * 0.14 + (90000 - 45000) * 0.3 + 1800, 6);
  });
  it('US, Texas, single, $100,000: 2026 brackets after the $16,100 standard deduction, plus 7.65% FICA', () => {
    const fed = 12400 * 0.1 + (50400 - 12400) * 0.12 + (83900 - 50400) * 0.22;
    expect(originTax({ origin: 'us', usState: 'TX', couple: false }, 100000, 0)).toBeCloseTo(fed + 100000 * 0.0765, 6);
  });
  it('Canada: CPP at the 2027 rate of 5.75% is in the total', () => {
    const on = originTax({ origin: 'ca', caProvince: 'ON', couple: false }, 80000, 0);
    const ab = originTax({ origin: 'ca', caProvince: 'AB', couple: false }, 80000, 0);
    expect(on).toBeGreaterThan(4209 + 1161); // at least CPP max + EI max (1.64% of $70,800)
    expect(ab).toBeLessThan(on);
  });
  it('a couple is taxed person by person in the UK', () => {
    expect(originTax({ origin: 'gb', couple: true }, 50000, 30000)).toBeCloseTo(originTax({ origin: 'gb', couple: false }, 50000, 0) + originTax({ origin: 'gb', couple: false }, 30000, 0), 6);
  });
});

describe('Irish childcare after the National Childcare Scheme subsidy (gov.ie, 15 Oct 2026)', () => {
  it('median €800 fee: €2.14 x 45 hours today, €2.50 from September 2027 (52/12 weeks a month)', () => {
    expect(irishCareEach(800, 'now')).toBeCloseTo(800 - 2.14 * 45 * 52 / 12, 2);
    expect(irishCareEach(800, 'sep2027')).toBeCloseTo(800 - 2.5 * 45 * 52 / 12, 2);
  });
  it('the fee is capped at €280 a week (€250 from September 2027) for a Core Funding service', () => {
    expect(irishCareEach(2000, 'now')).toBeCloseTo(280 * 52 / 12 - 2.14 * 45 * 52 / 12, 2);
    expect(irishCareEach(2000, 'sep2027')).toBeCloseTo(250 * 52 / 12 - 2.5 * 45 * 52 / 12, 2);
  });
});

describe('the whole comparison', () => {
  const base = { origin: 'gb' as const, couple: false, salaryNow: 50000, salaryIe: 60000, housing: 'rent' as const, housingNow: 1400, housingIe: 2301 };
  it('Ireland side = Budget 2027 take-home with the Rent Tax Credit, a month', () => {
    const r = computeMove(base);
    const y = computeYear({ status: 'single', pay1: 60000, renter: true }, 2027);
    expect(r.ireland.takeHome).toBeCloseTo(y.takeHome / 12, 2);
    expect(r.ireland.leftOver).toBeCloseTo(y.takeHome / 12 - 2301, 2);
  });
  it('the UK side is converted at the ECB rate', () => {
    const r = computeMove(base);
    expect(r.fx).toBe(FX.GBP);
    expect(r.now.leftOver).toBeCloseTo(((50000 - originTax(base, 50000, 0)) / 12 - 1400) / FX.GBP, 1);
    expect(r.difference).toBeCloseTo(r.ireland.leftOver - r.now.leftOver, 2);
  });
  it('Child Benefit €140 a child and childcare for children in care', () => {
    const r = computeMove({ ...base, children: 2, inCare: 1, careFeeIe: 800, careRules: 'sep2027' });
    expect(r.ireland.family).toBe(2 * CHILD_BENEFIT_MONTH);
    expect(r.ireland.childcare).toBeCloseTo(irishCareEach(800, 'sep2027'), 2);
    expect(r.irelandDetail.status).toBe('single-parent');
  });
  it('owners get no Rent Tax Credit', () => {
    expect(computeMove({ ...base, housing: 'own' }).irelandDetail.rentCredit).toBe(false);
    expect(computeMove({ ...base, housing: 'own' }).ireland.takeHome).toBeLessThan(computeMove(base).ireland.takeHome);
  });
  it('break-even Irish salary leaves the same each month as now (within rounding to €100)', () => {
    const r = computeMove(base);
    expect(r.breakEvenSalary).not.toBeNull();
    const at = computeMove({ ...base, salaryIe: r.breakEvenSalary! });
    expect(at.ireland.leftOver).toBeGreaterThanOrEqual(r.now.leftOver);
    expect(computeMove({ ...base, salaryIe: r.breakEvenSalary! - 200 }).ireland.leftOver).toBeLessThan(r.now.leftOver);
  });
  it('rent list: all 26 counties plus 5 cities and 2 Dublin areas, Dublin at €2,335', () => {
    expect(IE_RENT.length).toBe(33);
    expect(IE_RENT.find((c) => c.id === 'dublin')!.rent).toBe(2335);
  });
});
