import { describe, it, expect } from 'vitest';
import { simulate, comparePayoff, balanceSeries, type Debt } from './debt-payoff';

const debts: Debt[] = [
  { name: 'Card A', balance: 6500, apr: 26.99, minPay: 163 },
  { name: 'Card B', balance: 3200, apr: 22.49, minPay: 80 },
  { name: 'Loan',   balance: 12000, apr: 14.5, minPay: 280 },
];

describe('simulate', () => {
  it('pays off all debts in finite months', () => {
    const r = simulate(debts, 300, 'avalanche');
    expect(r.months).toBeGreaterThan(0);
    expect(r.months).toBeLessThan(600);
    expect(r.totalInterest).toBeGreaterThan(0);
    expect(r.perDebt).toHaveLength(3);
  });

  it('extra payment shortens payoff and cuts interest', () => {
    const none = simulate(debts, 0, 'avalanche');
    const lots = simulate(debts, 500, 'avalanche');
    expect(lots.months).toBeLessThan(none.months);
    expect(lots.totalInterest).toBeLessThan(none.totalInterest);
  });

  it('avalanche targets highest APR first (Card A before Loan)', () => {
    const r = simulate(debts, 400, 'avalanche');
    const a = r.perDebt.find((d) => d.name === 'Card A')!;
    const loan = r.perDebt.find((d) => d.name === 'Loan')!;
    expect(a.payoffMonth).toBeLessThanOrEqual(loan.payoffMonth);
  });

  it('snowball targets lowest balance first (Card B early)', () => {
    const r = simulate(debts, 400, 'snowball');
    const b = r.perDebt.find((d) => d.name === 'Card B')!;
    const loan = r.perDebt.find((d) => d.name === 'Loan')!;
    expect(b.payoffMonth).toBeLessThanOrEqual(loan.payoffMonth);
  });

  it('respects the 600-month safety cap on tiny payments', () => {
    const stuck: Debt[] = [{ name: 'X', balance: 100000, apr: 99, minPay: 1 }];
    const r = simulate(stuck, 0, 'avalanche');
    expect(r.months).toBeLessThanOrEqual(600);
  });

  it('single debt, zero extra still terminates', () => {
    const one: Debt[] = [{ name: 'Solo', balance: 1000, apr: 10, minPay: 100 }];
    const r = simulate(one, 0, 'avalanche');
    expect(r.months).toBeGreaterThan(0);
    expect(r.perDebt[0].payoffMonth).toBe(r.months);
  });
});

describe('comparePayoff', () => {
  it('avalanche never costs more interest than snowball', () => {
    const c = comparePayoff(debts, 300);
    expect(c.avalanche.totalInterest).toBeLessThanOrEqual(c.snowball.totalInterest + 1e-6);
    expect(c.avalancheWins).toBe(true);
  });

  it('reports the absolute interest saved', () => {
    const c = comparePayoff(debts, 300);
    expect(c.interestSaved).toBeCloseTo(
      Math.abs(c.snowball.totalInterest - c.avalanche.totalInterest), 6,
    );
    expect(c.interestSaved).toBeGreaterThanOrEqual(0);
  });
});

describe('balanceSeries', () => {
  it('starts at total balance and ends near zero', () => {
    const s = balanceSeries(debts, 300, 'avalanche');
    expect(s[0]).toBeCloseTo(6500 + 3200 + 12000, 6);
    expect(s[s.length - 1]).toBeLessThanOrEqual(0.01);
  });
  it('series length matches simulate months + 1', () => {
    const s = balanceSeries(debts, 300, 'avalanche');
    expect(s).toHaveLength(simulate(debts, 300, 'avalanche').months + 1);
  });
  it('avalanche pays down at least as fast as snowball overall', () => {
    const a = balanceSeries(debts, 300, 'avalanche');
    const sn = balanceSeries(debts, 300, 'snowball');
    expect(a.length).toBeLessThanOrEqual(sn.length + 1);
  });
});
