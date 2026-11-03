import { describe, it, expect } from 'vitest';
import { PERIODS, capitalMeans, rateFor, computeCarer } from './ie-carers';

describe("Carer's Allowance (Citizens Information + DSP SW19 2026, read 2026-11-03)", () => {
  it('pins the official rates and disregards', () => {
    expect(PERIODS['h2-2026']).toMatchObject({ rateUnder66: 270, rate66: 308, disregardSingle: 1000, disregardCouple: 2000 });
    expect(PERIODS['h1-2027']).toMatchObject({ rateUnder66: 280, rate66: 318, disregardSingle: 1000, disregardCouple: 2000 });
    expect(PERIODS['h2-2027']).toMatchObject({ disregardSingle: 1150, disregardCouple: 2300 });
  });

  it('reproduces SW19 table rows exactly (under 66, caring for 1 / 2+)', () => {
    const rows: [number, number, number][] = [
      [7.6, 270, 405], [7.61, 267.5, 402.5], [10.1, 267.5, 402.5], [10.11, 265, 400],
      [78, 197.5, 332.5], [63, 212.5, 347.5], [152.6, 125, 260], [275.1, 2.5, 137.5], [275.11, 0, 135],
    ];
    for (const [means, one, two] of rows) {
      expect(rateFor(means, 270)).toBe(one);
      expect(rateFor(means, 405)).toBe(two);
    }
    expect(rateFor(410.1, 405)).toBe(2.5);
    expect(rateFor(410.11, 405)).toBe(0);
    expect(rateFor(77.6, 308)).toBe(238); // 66 or over table row "Over 75.10 and up to 77.60"
  });

  it('capital bands: per complete €1,000 (Citizens Information worked example: €72,000 share = €38)', () => {
    expect(capitalMeans(50000)).toBe(0);
    expect(capitalMeans(72500)).toBe(38);
    expect(capitalMeans(60000)).toBe(10);
    expect(capitalMeans(70000)).toBe(30);
  });

  it("reproduces Citizens Information's couple example: means €63 a week → €212.50", () => {
    // Cash €2,050 (taken as already after deductions) + capital €145,000 halved → €38 x 2 = €76; less €2,000; halved = €63.
    const r = computeCarer({ period: 'h2-2026', aged66: false, caringForTwoOrMore: false, couple: true, earn1: 0, earn2: 0, otherWeekly: 2050, capital: 145000 });
    expect(r.capitalWeekly).toBe(76);
    expect(r.means).toBe(63);
    expect(r.weekly).toBe(212.5);
  });

  it('a single carer with no other income gets the full rate; 2027 adds €10', () => {
    const a = computeCarer({ period: 'h2-2026', aged66: false, caringForTwoOrMore: false, couple: false, earn1: 0, capital: 0 });
    const b = computeCarer({ period: 'h1-2027', aged66: false, caringForTwoOrMore: false, couple: false, earn1: 0, capital: 0 });
    expect(a.weekly).toBe(270);
    expect(b.weekly).toBe(280);
  });

  it("earnings count after PRSI; the July 2027 disregard lifts a couple's payment", () => {
    const early = computeCarer({ period: 'h1-2027', aged66: false, caringForTwoOrMore: false, couple: true, earn1: 0, earn2: 2200, capital: 0 });
    const late = computeCarer({ period: 'h2-2027', aged66: false, caringForTwoOrMore: false, couple: true, earn1: 0, earn2: 2200, capital: 0 });
    expect(early.cashWeekly).toBeCloseTo(2200 - 2200 * (0.0435 * 0.75 + 0.045 * 0.25), 1);
    expect(late.weekly).toBe(280); // €2,104 cash is under the €2,300 disregard
    expect(early.weekly).toBeLessThan(late.weekly);
  });

  it('survives bad input', () => {
    const r = computeCarer({ period: 'bogus' as any, aged66: false, caringForTwoOrMore: true, couple: true, earn1: NaN as any, capital: -1 as any });
    expect(Number.isFinite(r.weekly)).toBe(true);
  });
});
