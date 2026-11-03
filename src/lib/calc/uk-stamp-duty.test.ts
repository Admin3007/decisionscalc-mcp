import { describe, it, expect } from 'vitest';
import { computeSdlt } from './uk-stamp-duty';

describe('UK SDLT (2026/27, England & NI)', () => {
  it('standard £290,000 = £4,500', () => {
    expect(computeSdlt(290000, 'standard').total).toBe(4500);
  });
  it('standard £450,000 = £12,500', () => {
    expect(computeSdlt(450000, 'standard').total).toBe(12500);
  });
  it('standard £750,000 = £27,500', () => {
    expect(computeSdlt(750000, 'standard').total).toBe(27500);
  });
  it('first-time buyer £350,000 = £2,500', () => {
    expect(computeSdlt(350000, 'firstTimeBuyer').total).toBe(2500);
  });
  it('first-time buyer £280,000 = £0 (under £300k)', () => {
    expect(computeSdlt(280000, 'firstTimeBuyer').total).toBe(0);
  });
  it('first-time buyer above £500,000 loses relief (standard rates)', () => {
    expect(computeSdlt(600000, 'firstTimeBuyer').total).toBe(computeSdlt(600000, 'standard').total);
  });
  it('additional property £290,000 = £19,000 (standard £4,500 + 5% surcharge £14,500)', () => {
    expect(computeSdlt(290000, 'additional').total).toBe(19000);
  });
  it('zero price = £0, no NaN', () => {
    const r = computeSdlt(0, 'standard');
    expect(r.total).toBe(0);
    expect(Number.isFinite(r.effectiveRate)).toBe(true);
  });
  it('£1,000,000 standard = £43,750', () => {
    // 0-125k:0; 125-250k:2%=2500; 250-925k:5%*675000=33750; 925k-1m:10%*75000=7500 => 43750
    // The title said £41,250 until 2026-09-30 while the assertion said 43,750.
    // The assertion was right; the name was the thing to fix.
    expect(computeSdlt(1000000, 'standard').total).toBe(43750);
  });
  // Non-UK-resident surcharge (+2% on every band, stacks).
  it('non-resident standard £290,000 = £10,300 (£4,500 + 2% of price)', () => {
    expect(computeSdlt(290000, 'standard', true).total).toBe(10300);
  });
  it('non-resident additional £290,000 = £24,800 (£19,000 + 2% of price)', () => {
    expect(computeSdlt(290000, 'additional', true).total).toBe(24800);
  });
  it('nonResident defaults to false (backward compatible)', () => {
    expect(computeSdlt(290000, 'standard')).toEqual(computeSdlt(290000, 'standard', false));
    expect(computeSdlt(290000, 'standard').total).toBe(4500);
  });

  /**
   * HMRC's OWN published worked examples, from
   * gov.uk/stamp-duty-land-tax/residential-property-rates.
   *
   * The cases above are all self-derived: correct, but they only prove the
   * implementation agrees with the bands someone typed into it. These two are
   * the numbers HMRC prints on the page a user would check against, so if the
   * calculator ever drifts, the failure names the authority rather than
   * another line of our own arithmetic.
   *
   * Verified against the live GOV.UK page and the live calculator on
   * 2026-09-30; both matched.
   */
  describe("against HMRC's published examples", () => {
    it('GOV.UK: a £295,000 house, single property = £4,750', () => {
      // 0% on the first £125,000, 2% on the second £125,000 (£2,500),
      // 5% on the final £45,000 (£2,250).
      expect(computeSdlt(295000, 'standard').total).toBe(4750);
    });

    it('GOV.UK: a first-time buyer at exactly £500,000 = £10,000', () => {
      // 0% on the first £300,000, 5% on the remaining £200,000.
      expect(computeSdlt(500000, 'firstTimeBuyer').total).toBe(10000);
    });

    it('a pound over £500,000 loses the relief entirely, costing £5,000', () => {
      // Not an HMRC example, but the consequence of its rule, and the single
      // most expensive thing a first-time buyer can get wrong. GOV.UK: "If the
      // price is over £500,000, you cannot claim the relief."
      expect(computeSdlt(500000, 'firstTimeBuyer').total).toBe(10000);
      expect(computeSdlt(500001, 'firstTimeBuyer').total).toBe(15000);
      expect(computeSdlt(500001, 'firstTimeBuyer').total)
        .toBe(computeSdlt(500001, 'standard').total);
    });
  });
});
