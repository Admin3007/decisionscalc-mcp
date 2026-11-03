import { describe, it, expect } from 'vitest';
import { TCA_FULL, MIN_PAID, MAX_RATE, computeTca } from './ie-state-pension';

describe('State Pension (Contributory) TCA (gov.ie DSP + Citizens Information, read 2026-11-03)', () => {
  it('pins the official constants and 2026/2027 maximum rates', () => {
    expect([TCA_FULL, MIN_PAID]).toEqual([2080, 520]);
    expect(MAX_RATE).toEqual({ '2026-66': 299.3, '2026-67': 313.4, '2026-68': 328.9, '2027-66': 309.3 });
  });

  it("reproduces the Department's worked example: 947 + 520 + 350 = 1,817 → 87.35% × €289.30 = €252.70", () => {
    const r = computeTca({ paid: 947, credits: 855, homeCaring: 350, maxRate: 289.3 });
    expect(r.creditsUsed).toBe(520);
    expect(r.homeCaringUsed).toBe(350);
    expect(r.total).toBe(1817);
    expect(r.pct).toBe(87.35);
    expect(r.weekly).toBe(252.7);
  });

  it('caps credits + HomeCaring at 1,040 together', () => {
    const r = computeTca({ paid: 1000, credits: 520, homeCaring: 1040, maxRate: 299.3 });
    expect(r.homeCaringUsed).toBe(520);
    expect(r.total).toBe(2040);
    const h = computeTca({ paid: 1000, credits: 0, homeCaring: 1500, maxRate: 299.3 });
    expect(h.homeCaringUsed).toBe(1040);
  });

  it('40 years gets the full rate; more does not add', () => {
    expect(computeTca({ paid: 2080, credits: 0, homeCaring: 0, maxRate: 299.3 }).weekly).toBe(299.3);
    expect(computeTca({ paid: 2600, credits: 0, homeCaring: 0, maxRate: 299.3 }).pct).toBe(100);
  });

  it('needs 520 paid contributions to qualify (credits and HomeCaring alone do not)', () => {
    expect(computeTca({ paid: 519, credits: 520, homeCaring: 520, maxRate: 299.3 }).qualifies).toBe(false);
    expect(computeTca({ paid: 519, credits: 520, homeCaring: 520, maxRate: 299.3 }).weekly).toBe(0);
    expect(computeTca({ paid: 520, credits: 0, homeCaring: 0, maxRate: 299.3 }).weekly).toBe(74.83); // 25% × 299.30
  });

  it('reports what is missing for the full rate', () => {
    const r = computeTca({ paid: 1560, credits: 104, homeCaring: 0, maxRate: 299.3 });
    expect(r.weeksToFull).toBe(416);
    expect(r.yearsToFull).toBe(8);
  });
});
