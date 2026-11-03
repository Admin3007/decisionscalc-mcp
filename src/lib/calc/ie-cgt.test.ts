import { describe, it, expect } from 'vitest';
import { computeIeCgt, rateFor, deadlines, EXEMPTION, RATE_NEW, RATE_OLD, CGT_RATE_CHANGE } from './ie-cgt';

describe('Irish CGT (revenue.ie, read 2026-11-02)', () => {
  it('pins the official figures', () => {
    expect(RATE_NEW).toBe(0.31);
    expect(RATE_OLD).toBe(0.33);
    expect(EXEMPTION).toBe(1270);
    expect(CGT_RATE_CHANGE).toBe('2026-10-07');
  });

  it("reproduces Revenue's worked example (Mary, 2025 sale at 33%)", () => {
    // Sale €380,000 (implied: gain 243,310 + costs), purchase €130,000, fees 300 + 5,280 + 1,110.
    const r = computeIeCgt({ disposalDate: '2025-06-01', salePrice: 380000, purchasePrice: 130000, costs: 300 + 5280 + 1110 });
    expect(r.gain).toBe(243310);
    expect(r.taxable).toBe(242040);
    expect(r.cgt).toBe(79873.2);
    expect(r.payBy).toBe('2025-12-15');
    expect(r.fileBy).toBe('2026-10-31');
  });

  it('31% from 7 October 2026; 33% the day before; development land stays 33%', () => {
    expect(rateFor('2026-10-06')).toBe(0.33);
    expect(rateFor('2026-10-07')).toBe(0.31);
    expect(rateFor('2026-11-20', 'development-land')).toBe(0.33);
    const r = computeIeCgt({ disposalDate: '2026-11-20', salePrice: 20000, purchasePrice: 10000, costs: 0 });
    expect(r.cgt).toBeCloseTo((10000 - 1270) * 0.31, 2);
    expect(r.cgtAtOtherRate).toBeCloseTo((10000 - 1270) * 0.33, 2);
  });

  it('December disposals pay by 31 January', () => {
    expect(deadlines('2026-12-03')).toEqual({ payBy: '2027-01-31', fileBy: '2027-10-31' });
    expect(deadlines('2026-11-30')).toEqual({ payBy: '2026-12-15', fileBy: '2027-10-31' });
  });

  it('losses come off before the exemption; unused exemption is not carried', () => {
    const r = computeIeCgt({ disposalDate: '2026-11-01', salePrice: 15000, purchasePrice: 10000, costs: 0, losses: 3000 });
    expect(r.afterLosses).toBe(2000);
    expect(r.taxable).toBe(730);
    const l = computeIeCgt({ disposalDate: '2026-11-01', salePrice: 8000, purchasePrice: 10000, costs: 100 });
    expect(l.cgt).toBe(0);
    expect(l.lossCarriedForward).toBe(2100);
    const used = computeIeCgt({ disposalDate: '2026-11-01', salePrice: 12000, purchasePrice: 10000, costs: 0, exemptionUsed: 1270 });
    expect(used.exemption).toBe(0);
    expect(used.taxable).toBe(2000);
  });

  it('bad input never produces NaN', () => {
    const r = computeIeCgt({ disposalDate: '2026-11-01', salePrice: NaN, purchasePrice: -5, costs: NaN });
    expect(Number.isFinite(r.cgt)).toBe(true);
  });
});
