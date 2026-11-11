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

// Overhaul D2: the Welsh Government's own worked examples (gov.wales "Land Transaction Tax rates and bands",
// read 8 Nov 2026). Only the two on today's rates; the others use rates from before 10 Oct 2022 / 11 Dec 2024.
describe('Wales LTT: gov.wales worked examples', () => {
  it('gov.wales example: £280,000 house, 0% on £225,000 + 6% on £55,000 = £3,300', () => {
    expect(computeLtt(280000, 'standard').total).toBe(3300);
  });
  it('gov.wales example: £260,000 second home, 5% on £180,000 + 8.5% on £70,000 + 10% on £10,000 = £15,950', () => {
    expect(computeLtt(260000, 'additional').total).toBe(15950);
  });
});
