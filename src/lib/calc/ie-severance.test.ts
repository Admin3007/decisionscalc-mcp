import { describe, it, expect } from 'vitest';
import { computeSeverance, exemptionFor, statutoryRedundancy, type SeveranceInput } from './ie-severance';

const base: SeveranceInput = {
  redundancy: false, years: 0, months: 0, weeklyPay: 0, avgPay: 0, lumpSum: 0, pensionLumpSum: 0, waive: false,
  claimedIn10Years: false, priorExempt: 0, year: 2026, status: 'single', payThisYear: 0, spousePay: 0,
};
const ex = (o: Partial<SeveranceInput>) => exemptionFor({ ...base, ...o });

describe('ie-severance: Revenue TDM 05-05-19 worked examples (read 2026-11-06)', () => {
  it('Jim: 35 complete years → basic exemption €36,935 (no increase claimed)', () => {
    const e = ex({ years: 35, claimedIn10Years: true });
    expect(e.basic).toBe(36935);
    expect(e.available).toBe(36935);
  });

  it('Anna: 10 years → €17,810 covers a €17,000 payment, no tax', () => {
    const r = computeSeverance({ ...base, years: 10, claimedIn10Years: true, lumpSum: 17000, payThisYear: 50000 });
    expect(r.exemption.basic).toBe(17810);
    expect(r.taxable).toBe(0);
    expect(r.incomeTax).toBe(0);
  });

  it('Mary: no pension scheme → increased exemption €46,935', () => {
    expect(ex({ years: 35 }).basic + ex({ years: 35 }).increase).toBe(46935);
  });

  it('Tony: €5,000 pension lump sum → increase €5,000, total €41,935', () => {
    const e = ex({ years: 35, pensionLumpSum: 5000 });
    expect(e.increase).toBe(5000);
    expect(e.basic + e.increase).toBe(41935);
    expect(ex({ years: 35, pensionLumpSum: 12000 }).increase).toBe(0);
  });

  it('Martin: future lump sum worth €2,500 today, 11 years → €26,075', () => {
    const e = ex({ years: 11, pensionLumpSum: 2500 });
    expect(e.basic + e.increase).toBe(26075);
  });

  it('Lorna: SCSB €268,000 with the RCS capped at €200,000, then the €200,000 lifetime cap', () => {
    const e = ex({ years: 39, avgPay: 180000, pensionLumpSum: 270000 });
    expect(e.rcs).toBe(200000);
    expect(e.basic + e.increase).toBe(39995);
    expect(e.scsb).toBe(268000);
    expect(e.method).toBe('scsb');
    expect(e.available).toBe(200000);
  });

  it('Tom: SCSB €114,000 (19 years, €90,000, no pension)', () => {
    const e = ex({ years: 19, avgPay: 90000 });
    expect(e.basic + e.increase).toBe(34695);
    expect(e.scsb).toBe(114000);
  });

  it('Martina: €228,667 restricted to €200,000', () => {
    const e = ex({ years: 35, avgPay: 98000 });
    expect(e.uncapped).toBeCloseTo(228666.67, 1);
    expect(e.available).toBe(200000);
  });

  it('Alan: earlier exemptions of €110,000 leave €90,000 of the cap', () => {
    const e = ex({ years: 30, avgPay: 108000, pensionLumpSum: 121500, priorExempt: 110000 });
    expect(e.basic + e.increase).toBe(33110);
    expect(e.scsb).toBe(94500);
    expect(e.available).toBe(90000);
  });

  it('Jenny: €60,000 lump sum, €27,000 tax-free, €33,000 taxable', () => {
    const r = computeSeverance({ ...base, years: 18, avgPay: 95000 / 3, pensionLumpSum: 11000, lumpSum: 60000 });
    expect(r.exemption.scsb).toBe(27000);
    expect(r.taxFree).toBe(27000);
    expect(r.taxable).toBe(33000);
  });

  it('John: statutory €22,200 tax-free; €44,765 lump sum, €31,000 exempt, €13,765 taxable', () => {
    expect(statutoryRedundancy(18, 0, 800)).toBe(22200);
    const r = computeSeverance({ ...base, redundancy: true, years: 18, weeklyPay: 800, avgPay: 95000 / 3, pensionLumpSum: 7000, lumpSum: 44765 });
    expect(r.statutory).toBe(22200);
    expect(r.exemption.increase).toBe(3000);
    expect(r.taxFree).toBe(31000);
    expect(r.taxable).toBe(13765);
  });
});

describe('ie-severance: tax on the taxable part and the waiver comparison', () => {
  it('taxable part pays income tax and USC at your marginal rates, no PRSI', () => {
    // Single, €80,000 pay already in 2026: every extra euro is at 40% income tax + 3% USC (band to €70,044 passed).
    const r = computeSeverance({ ...base, years: 5, claimedIn10Years: true, lumpSum: 30000, payThisYear: 80000 });
    expect(r.taxable).toBe(30000 - (10160 + 765 * 5));
    expect(r.incomeTax).toBeCloseTo(r.taxable * 0.4, 1);
    expect(r.usc).toBeCloseTo(r.taxable * 0.08, 1);
    expect(r.takeHome).toBeCloseTo(30000 - r.incomeTax - r.usc, 1);
  });

  it('waiving the pension lump sum restores the increase and full SCSB', () => {
    const r = computeSeverance({ ...base, years: 20, avgPay: 60000, pensionLumpSum: 40000, lumpSum: 100000, payThisYear: 40000 });
    expect(r.exemption.scsb).toBe(40000);
    expect(r.ifWaived).toBeDefined();
    expect(r.ifWaived!.taxFree).toBe(80000);
    expect(r.ifWaived!.extra).toBeGreaterThan(0);
  });

  it('statutory redundancy counts part years and caps weekly pay at €600', () => {
    expect(statutoryRedundancy(10, 6, 1000)).toBe(13200);
    expect(statutoryRedundancy(10, 0, 400)).toBe(8400);
  });

  it('bad inputs do not produce NaN', () => {
    const r = computeSeverance({ ...base, years: NaN, lumpSum: -5, avgPay: Number('x') });
    expect(Number.isNaN(r.takeHome)).toBe(false);
    expect(r.taxable).toBe(0);
  });
});
