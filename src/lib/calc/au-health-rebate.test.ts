import { describe, it, expect } from 'vitest';
import { computeAuHealth } from './au-health-rebate';

const base = { income: 90000, family: 'single' as const, age: 'under65' as const, premium: 1500, hasCover: true, children: 0 };

describe('AU health rebate + MLS (rebate from 1 April 2026; 2026–27 thresholds)', () => {
  it('single $90k, under 65, with cover → Tier 0, 24.118% rebate', () => {
    const r = computeAuHealth(base);
    expect(r.tier).toBe(0);
    expect(r.rebatePct).toBeCloseTo(24.118, 3);
    expect(r.rebateAmount).toBe(362); // round(1500 * 0.24118)
    expect(r.mlsAmount).toBe(0);
  });
  it('single $120k, no cover → Tier 1, MLS 1.0% = $1,200', () => {
    // 2026-27: Tier 1 is $105,001–$123,000, so $120k = Tier 1 (1.0%)
    const r = computeAuHealth({ ...base, income: 120000, hasCover: false });
    expect(r.tier).toBe(1);
    expect(r.mlsRate).toBe(1.0);
    expect(r.mlsAmount).toBe(1200);
    expect(r.rebateAmount).toBe(0);
  });
  it('single $130k, no cover → Tier 2, MLS 1.25% = $1,625', () => {
    // 2026-27: Tier 2 is $123,001–$164,000
    const r = computeAuHealth({ ...base, income: 130000, hasCover: false });
    expect(r.tier).toBe(2);
    expect(r.mlsRate).toBe(1.25);
    expect(r.mlsAmount).toBe(1625);
  });
  it('single $200k → Tier 3, 0% rebate, MLS 1.5%', () => {
    const r = computeAuHealth({ ...base, income: 200000, hasCover: false });
    expect(r.tier).toBe(3);
    expect(r.rebatePct).toBe(0);
    expect(r.mlsAmount).toBe(3000);
  });
  it('family thresholds are double the single ones', () => {
    // 2026-27: $200k single = Tier 3 (>164k); $200k family = Tier 0 (≤210k)
    expect(computeAuHealth({ ...base, income: 200000 }).tier).toBe(3);
    expect(computeAuHealth({ ...base, income: 200000, family: 'family' }).tier).toBe(0);
  });
  it('each child after the first lifts the family threshold by $1,500', () => {
    // family $211,000: 1 child → Tier 1 (>210k); 2 children → +$1,500 → base $211,500 → Tier 0
    expect(computeAuHealth({ ...base, income: 211000, family: 'family', children: 1 }).tier).toBe(1);
    expect(computeAuHealth({ ...base, income: 211000, family: 'family', children: 2 }).tier).toBe(0);
    // single parent with a dependent child is tested against family thresholds (ATO)
    expect(computeAuHealth({ ...base, income: 150000, family: 'single', children: 1 }).tier).toBe(0);
    expect(computeAuHealth({ ...base, income: 150000, family: 'single', children: 0 }).tier).toBe(2);
  });
  it('older ages get a higher rebate', () => {
    expect(computeAuHealth({ ...base, age: '70plus' }).rebatePct).toBeGreaterThan(
      computeAuHealth({ ...base, age: 'under65' }).rebatePct);
  });
  it('net premium = premium − rebate when holding cover', () => {
    const r = computeAuHealth(base);
    expect(r.netPremium).toBe(1500 - r.rebateAmount);
  });

  /**
   * The full rebate table as the government publishes it, from
   * privatehealth.gov.au (the period from 1 July 2026).
   *
   * Only two of the twelve percentages were pinned by value before this:
   * Tier 0 under-65 and the Tier 3 zeroes. The rest were covered by a
   * relative check ("older ages get a higher rebate"), which passes equally
   * well on wrong numbers — and on 2026-09-30 four of them were wrong, by
   * 0.001 each, because they had been computed from the adjustment factor
   * instead of transcribed and our rounding differed from the government's.
   *
   * These are published statutory rates. Derive nothing; quote the source.
   */
  describe("against privatehealth.gov.au's published table", () => {
    const at = (income: number, age: 'under65' | '65to69' | '70plus') =>
      computeAuHealth({ income, family: 'single', age, premium: 2000, hasCover: true, children: 0 }).rebatePct;

    // Tier, representative single income, and the three age bands.
    const PUBLISHED: [string, number, number, number, number][] = [
      ['Tier 0 (base)', 90000, 24.118, 28.139, 32.158],
      ['Tier 1', 115000, 16.079, 20.098, 24.118],
      ['Tier 2', 130000, 8.038, 12.058, 16.079],
      ['Tier 3', 200000, 0, 0, 0],
    ];

    for (const [label, income, under65, a65, a70] of PUBLISHED) {
      it(`${label}: ${under65}% / ${a65}% / ${a70}% by age band`, () => {
        expect(at(income, 'under65')).toBe(under65);
        expect(at(income, '65to69')).toBe(a65);
        expect(at(income, '70plus')).toBe(a70);
      });
    }

    it('the single income thresholds are the 2026-27 ones', () => {
      // $105,000 / $123,000 / $164,000, indexed from 1 July 2026.
      const tierAt = (income: number) =>
        computeAuHealth({ income, family: 'single', age: 'under65', premium: 2000, hasCover: true, children: 0 }).tier;
      expect(tierAt(105000)).toBe(0);
      expect(tierAt(105001)).toBe(1);
      expect(tierAt(123000)).toBe(1);
      expect(tierAt(123001)).toBe(2);
      expect(tierAt(164000)).toBe(2);
      expect(tierAt(164001)).toBe(3);
    });
  });
});

describe('Lifetime Health Cover loading (overhaul C6)', () => {
  const base = { income: 120000, family: 'single' as const, age: 'under65' as const, premium: 1500, hasCover: false, children: 0 };
  it('2% a year after 30, capped at 70%, not reduced by the rebate', () => {
    expect(computeAuHealth({ ...base, lhcYears: 0 }).lhcLoadingPct).toBe(0);
    expect(computeAuHealth({ ...base, lhcYears: 10 }).lhcLoadingPct).toBe(20);
    expect(computeAuHealth({ ...base, lhcYears: 40 }).lhcLoadingPct).toBe(70);
    const r = computeAuHealth({ ...base, lhcYears: 10 });
    expect(r.lhcLoadingAmount).toBe(300);
    expect(r.costOfCover).toBe(1500 - Math.round(1500 * r.rebatePct / 100) + 300);
  });
});

// Overhaul D2: the ATO's own worked example ("Medicare levy surcharge income, thresholds and rates", read 8 Nov 2026).
describe('ATO worked example', () => {
  it('ATO example (Tom, 2026-27): single, no hospital cover, $117,000 income for MLS purposes, Tier 1 at 1% = $1,170', () => {
    const r = computeAuHealth({ income: 117000, family: 'single', age: 'under65', premium: 0, hasCover: false, children: 0 });
    expect(r.tier).toBe(1);
    expect(r.mlsRate).toBe(1);
    expect(r.mlsAmount).toBe(1170);
  });
});
