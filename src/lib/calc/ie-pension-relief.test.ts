import { describe, it, expect } from 'vitest';
import { computePensionRelief, ageLimit } from './ie-pension-relief';

describe('ie-pension-relief: Revenue rules (read 2026-11-03)', () => {
  it('age bands: 15% under 30 up to 40% from 60', () => {
    expect([29, 30, 39, 40, 49, 50, 54, 55, 59, 60, 70].map(ageLimit)).toEqual([0.15, 0.2, 0.2, 0.25, 0.25, 0.3, 0.3, 0.35, 0.35, 0.4, 0.4]);
  });

  it("Revenue's example: age 42 on €40,000 can get relief on up to €10,000", () => {
    const r = computePensionRelief({ year: 2026, status: 'single', age: 42, pay: 40000, contributions: 12000 });
    expect(r.maxRelievable).toBe(10000);
    expect(r.relieved).toBe(10000);
    expect(r.excess).toBe(2000);
  });

  it('earnings counted up to €115,000; relief at 40% for a higher-rate payer', () => {
    const r = computePensionRelief({ year: 2026, status: 'single', age: 50, pay: 150000, contributions: 20000 });
    expect(r.maxRelievable).toBe(34500);       // 30% × 115,000
    expect(r.taxSaved).toBe(8000);
    expect(r.netCost).toBe(12000);
    expect(r.headroom).toBe(14500);
    expect(r.savedPer1000).toBe(400);
  });

  it('relief that crosses the standard rate band is partly at 20%', () => {
    // Single, 2026 band €44,000: €46,000 pay, €5,000 contribution → €2,000 at 40% + €3,000 at 20%.
    const r = computePensionRelief({ year: 2026, status: 'single', age: 35, pay: 46000, contributions: 5000 });
    expect(r.taxSaved).toBe(2000 * 0.4 + 3000 * 0.2);
  });

  it('2027 uses the Budget 2027 band (€46,500 single)', () => {
    const r = computePensionRelief({ year: 2027, status: 'single', age: 35, pay: 46000, contributions: 1000 });
    expect(r.taxSaved).toBe(200);
  });
});
