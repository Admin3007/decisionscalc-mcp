import { describe, it, expect } from 'vitest';
import { box3 } from './nl-box3';

// Belastingdienst, "How is my Box 3 income calculated on my provisional assessment 2026?" (read 10 Nov 2026).
describe('box 3 2026: the Belastingdienst worked examples', () => {
  it('€150,000 savings, no partner: return €1,920, share 60.42%, income €1,160, tax €417', () => {
    const r = box3({ bank: 150000, other: 0, debts: 0, partner: false });
    expect(r.returns.taxable).toBe(1920);
    expect(r.savingsBase).toBe(90643);
    expect(r.you.sharePct).toBe(60.42);
    expect(r.you.income).toBe(1160);
    expect(r.you.tax).toBe(417);
  });
  it('€150,000 savings with a tax partner, split 50/50: €15,643 each, share 10.42%, income €200, tax €72 each', () => {
    const r = box3({ bank: 150000, other: 0, debts: 0, partner: true });
    expect(r.allowance).toBe(118714);
    expect(r.savingsBase).toBe(31286);
    expect(r.you.base).toBe(15643);
    expect(r.you.sharePct).toBe(10.42);
    expect(r.you.income).toBe(200);
    expect(r.you.tax).toBe(72);
    expect(r.partner!.tax).toBe(72);
    expect(r.totalTax).toBe(144);
  });
  it('savings €150,000 + investments €75,000 + second home €200,000 − debt €100,000, no partner: income €12,965', () => {
    const r = box3({ bank: 150000, other: 275000, debts: 100000, partner: false });
    expect(r.deductibleDebts).toBe(96200);
    expect(r.returns).toEqual({ bank: 1920, other: 16500, debts: 2597, taxable: 15823 });
    expect(r.capitalBase).toBe(328800);
    expect(r.savingsBase).toBe(269443);
    expect(r.you.sharePct).toBe(81.94);
    expect(r.you.income).toBe(12965);
    expect(r.you.tax).toBe(4667);
  });
  it('green investments: €150,000 with a partner, €53,430 exempt, €96,570 counts at 6%', () => {
    const r = box3({ bank: 5000, other: 250000, green: 150000, debts: 0, partner: true });
    expect(r.greenCounted).toBe(96570);
    expect(r.returns.bank).toBe(64);
    expect(r.returns.other).toBe(20794);
    expect(r.returns.taxable).toBe(20858);
    expect(r.capitalBase).toBe(351570);
  });
  it('under the allowance pays nothing; bad input never gives NaN', () => {
    expect(box3({ bank: 50000, other: 0, debts: 0, partner: false }).totalTax).toBe(0);
    const r = box3({ bank: Number.NaN, other: -5, debts: Infinity as unknown as number, partner: false });
    expect(Number.isFinite(r.totalTax)).toBe(true);
  });
});
