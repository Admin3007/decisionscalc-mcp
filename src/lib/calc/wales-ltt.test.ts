import { describe, it, expect } from 'vitest';
import { computeLtt } from './wales-ltt';

describe('Wales LTT (2026/27)', () => {
  it('main residential £300,000 = £4,500', () => {
    expect(computeLtt(300000, 'standard').total).toBe(4500);
  });
  it('main residential £450,000 = £14,250', () => {
    expect(computeLtt(450000, 'standard').total).toBe(14250);
  });
  it('£225,000 or below = £0 (nil-rate band)', () => {
    expect(computeLtt(225000, 'standard').total).toBe(0);
  });
  it('additional property £300,000 = £19,950 (higher rates)', () => {
    // 5%*180k(9000) + 8.5%*70k(5950) + 10%*50k(5000) = 19,950
    expect(computeLtt(300000, 'additional').total).toBe(19950);
  });
  it('zero price = £0, no NaN', () => {
    const r = computeLtt(0, 'standard');
    expect(r.total).toBe(0);
    expect(Number.isFinite(r.effectiveRate)).toBe(true);
  });

  /**
   * The Welsh Revenue Authority's published main residential bands, from
   * gov.wales/land-transaction-tax-rates-and-bands (effective 10 October
   * 2022). Verified against the live page 2026-09-30.
   *
   * Wales is the one people get wrong, because it has no first-time buyer
   * relief but the highest ordinary nil-rate band in the UK.
   */
  describe('against the Welsh Revenue Authority', () => {
    it('£250,000 = £1,500 (6% of the £25,000 above the nil band)', () => {
      expect(computeLtt(250000, 'standard').total).toBe(1500);
    });

    it('£400,000 = £10,500 (top of the 6% band)', () => {
      expect(computeLtt(400000, 'standard').total).toBe(10500);
    });

    it('£800,000 = £41,750 (6%, 7.5% and 10% bands all exercised)', () => {
      expect(computeLtt(800000, 'standard').total).toBe(41750);
    });

    it('the £225,000 nil band beats Scotland even with its FTB relief', () => {
      // The point the article makes: having no first-time buyer relief sounds
      // worse than it is, because the ordinary Welsh threshold is above the
      // relieved Scottish one of £175,000.
      expect(computeLtt(225000, 'standard').total).toBe(0);
      expect(computeLtt(220000, 'standard').total).toBe(0);
    });
  });
});
