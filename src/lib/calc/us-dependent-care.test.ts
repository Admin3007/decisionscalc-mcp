import { describe, it, expect } from 'vitest';
import { compareDependentCare, creditRate } from './us-dependent-care';
import { federalIncomeTax, federalTaxOnAgi, ficaSaved } from './us-federal-tax';

describe('2026 federal tax (Rev. Proc. 2025-32 tables)', () => {
  it('matches the table amounts at bracket edges', () => {
    expect(federalIncomeTax(24800, 'mfj')).toBeCloseTo(2480, 6);
    expect(federalIncomeTax(100800, 'mfj')).toBeCloseTo(11600, 6);
    expect(federalIncomeTax(211400, 'mfj')).toBeCloseTo(35932, 6);
    expect(federalIncomeTax(768700, 'mfj')).toBeCloseTo(206583.5, 6);
    expect(federalIncomeTax(67450, 'hoh')).toBeCloseTo(7740, 6);
    expect(federalIncomeTax(105700, 'hoh')).toBeCloseTo(16155, 6);
    expect(federalIncomeTax(640600, 'hoh')).toBeCloseTo(191171, 6);
    expect(federalIncomeTax(50400, 'single')).toBeCloseTo(5800, 6);
    expect(federalIncomeTax(105700, 'single')).toBeCloseTo(17966, 6);
    expect(federalIncomeTax(640600, 'single')).toBeCloseTo(192979.25, 6);
  });
  it('uses the 2026 standard deduction', () => {
    expect(federalTaxOnAgi(32200, 'mfj')).toBe(0);
    expect(federalTaxOnAgi(16100 + 1000, 'single')).toBeCloseTo(100, 6);
  });
  it('payroll tax saved: 7.65% below the wage base, 1.45% above it, plus 0.9% above $200,000', () => {
    expect(ficaSaved(80000, 7500)).toBeCloseTo(573.75, 6);
    expect(ficaSaved(190000, 7500)).toBeCloseTo(2000 * 0.062 + 7500 * 0.0145, 6); // only $2,000 drops below the $184,500 base
    expect(ficaSaved(220000, 7500)).toBeCloseTo(7500 * (0.0145 + 0.009), 6);
  });
});

describe('credit rate, 26 U.S.C. 21(a)(2) as amended for 2026', () => {
  it('50% to $15,000, 1 point per $2,000 or part, 35% floor', () => {
    expect(creditRate(15000, 'single')).toBe(0.5);
    expect(creditRate(15001, 'single')).toBe(0.49);
    expect(creditRate(43000, 'mfj')).toBe(0.36);
    expect(creditRate(43001, 'mfj')).toBe(0.35);
    expect(creditRate(75000, 'single')).toBe(0.35);
  });
  it('second step over $75,000 ($150,000 joint, $4,000 steps), 20% floor', () => {
    expect(creditRate(75001, 'single')).toBe(0.34);
    expect(creditRate(105000, 'hoh')).toBe(0.2);
    expect(creditRate(150000, 'mfj')).toBe(0.35);
    expect(creditRate(150001, 'mfj')).toBe(0.34);
    expect(creditRate(200000, 'mfj')).toBe(0.22);
    expect(creditRate(210000, 'mfj')).toBe(0.2);
    expect(creditRate(500000, 'mfj')).toBe(0.2);
  });
});

describe('FSA or credit', () => {
  it('married, $120,000, two children: the 12% bracket makes the credit win', () => {
    const r = compareDependentCare({ status: 'mfj', income: 120000, kids: 2, expenses: 20000 });
    expect(r.creditOnly.credit).toBeCloseTo(2100, 6); // 35% of $6,000; tax owed $10,040
    expect(r.fsaMax.fsa).toBe(7500);
    expect(r.fsaMax.fedTaxSaved).toBeCloseTo(900, 6);
    expect(r.fsaMax.ficaSaved).toBeCloseTo(573.75, 6);
    expect(r.fsaMax.credit).toBe(0); // $7,500 excluded wipes out the $6,000 limit
    expect(r.best.fsa).toBe(0);
    expect(r.verdict).toBe('credit');
  });
  it('married, $200,000, two children: credit falls to 22%, the full FSA wins', () => {
    const r = compareDependentCare({ status: 'mfj', income: 200000, kids: 2, expenses: 20000, fsaWages: 100000 });
    expect(r.creditOnly.creditRate).toBe(0.22);
    expect(r.creditOnly.credit).toBeCloseTo(1320, 6);
    expect(r.fsaMax.total).toBeCloseTo(7500 * 0.22 + 573.75, 6);
    expect(r.best.fsa).toBe(7500);
    expect(r.verdict).toBe('fsa');
  });
  it('the credit is limited to the tax owed (non-refundable)', () => {
    const r = compareDependentCare({ status: 'hoh', income: 30000, kids: 1, expenses: 5000 });
    expect(r.creditOnly.creditRate).toBe(0.42);
    expect(r.creditOnly.credit).toBeCloseTo(585, 6); // tax on $5,850 taxable
    expect(r.creditOnly.creditLost).toBeCloseTo(1260 - 585, 6);
    expect(r.maxElection).toBe(5000); // can't put more in than the care costs
    expect(r.best.total).toBeGreaterThanOrEqual(Math.max(r.creditOnly.total, r.fsaMax.total) - 1e-9);
  });
  it('employer money counts toward $7,500 and the plan limit caps the election', () => {
    const r = compareDependentCare({ status: 'mfj', income: 200000, kids: 2, expenses: 20000, employer: 2000, planLimit: 5000 });
    expect(r.maxElection).toBe(5000);
    const r2 = compareDependentCare({ status: 'mfj', income: 200000, kids: 2, expenses: 20000, employer: 3000 });
    expect(r2.maxElection).toBe(4500);
  });
  it('the lower earner’s earned income caps both', () => {
    const r = compareDependentCare({ status: 'mfj', income: 150000, kids: 2, expenses: 20000, lowerEarned: 4000 });
    expect(r.maxElection).toBe(4000);
    expect(r.creditOnly.creditExpenses).toBe(4000);
  });
  it('the $50 search is within $25 of a $1 search', () => {
    for (const c of [
      { status: 'single' as const, income: 45000, kids: 1 as const, expenses: 9000, stateRate: 5 },
      { status: 'mfj' as const, income: 140000, kids: 2 as const, expenses: 14000, stateRate: 6 },
      { status: 'hoh' as const, income: 68000, kids: 2 as const, expenses: 12000, stateRate: 4.5 },
    ]) {
      const r = compareDependentCare(c);
      let brute = 0;
      for (let x = 0; x <= r.maxElection; x++) {
        const o = compareDependentCare({ ...c, planLimit: x, }).fsaMax;
        if (o.total > brute) brute = o.total;
      }
      expect(r.best.total).toBeGreaterThan(brute - 25);
      expect(r.best.total).toBeLessThanOrEqual(brute + 1e-6);
    }
  });
});
