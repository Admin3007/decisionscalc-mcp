import { describe, it, expect } from 'vitest';
import { computeLbtt } from './scotland-lbtt';

describe('Scotland LBTT (2026/27)', () => {
  it('standard £300,000 = £4,600', () => {
    expect(computeLbtt(300000, 'standard').total).toBe(4600);
  });
  it('standard £450,000 = £18,350', () => {
    expect(computeLbtt(450000, 'standard').total).toBe(18350);
  });
  it('first-time buyer £175,000 = £0 (nil-rate raised to £175k)', () => {
    expect(computeLbtt(175000, 'firstTimeBuyer').total).toBe(0);
  });
  it('first-time buyer £200,000 = £500', () => {
    expect(computeLbtt(200000, 'firstTimeBuyer').total).toBe(500);
  });
  it('additional property £300,000 = £28,600 (£4,600 + 8% ADS £24,000)', () => {
    expect(computeLbtt(300000, 'additional').total).toBe(28600);
  });
  it('zero price = £0, no NaN', () => {
    const r = computeLbtt(0, 'standard');
    expect(r.total).toBe(0);
    expect(Number.isFinite(r.effectiveRate)).toBe(true);
  });

  /**
   * Revenue Scotland's own published figures, from
   * revenue.scot/taxes/land-buildings-transaction-tax/residential-property.
   *
   * The cases above are self-derived — correct, but they only prove the code
   * agrees with bands someone typed into it. These are tied to the authority
   * a user would check against. Verified against the live page 2026-09-30.
   */
  describe('against Revenue Scotland', () => {
    it('their worked example: £135,000 = £0 (below the £145,000 nil band)', () => {
      expect(computeLbtt(135000, 'standard').total).toBe(0);
    });

    it('their worked example: £235,000 = £1,800', () => {
      expect(computeLbtt(235000, 'standard').total).toBe(1800);
    });

    it('their worked example: £875,000 = £63,350 (every band exercised)', () => {
      expect(computeLbtt(875000, 'standard').total).toBe(63350);
    });

    it('first-time buyer relief is worth at most £600, as they state', () => {
      // "the availability of the relief will result in a reduction in tax of
      // up to £600" — the 2% between the £145,000 and £175,000 nil bands. It
      // cannot exceed that at any price.
      for (const p of [175000, 200000, 300000, 900000]) {
        const saving = computeLbtt(p, 'standard').total - computeLbtt(p, 'firstTimeBuyer').total;
        expect(saving).toBeLessThanOrEqual(600);
      }
      expect(
        computeLbtt(175000, 'standard').total - computeLbtt(175000, 'firstTimeBuyer').total,
      ).toBe(600);
    });
  });
});
