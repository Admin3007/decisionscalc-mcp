import { describe, it, expect } from 'vitest';
import { computeCat, thresholdFor, payAndFileBy } from './ie-cat';

describe('ie-cat: Revenue rules (read 2026-11-03)', () => {
  it('thresholds by date: Budget 2027 increase from 7 October 2026', () => {
    expect(thresholdFor('A', '2026-10-07')).toBe(420000);
    expect(thresholdFor('A', '2026-10-06')).toBe(400000);
    expect(thresholdFor('B', '2026-11-01')).toBe(44000);
    expect(thresholdFor('C', '2026-11-01')).toBe(22000);
    expect(thresholdFor('A', '2024-10-01')).toBe(335000);
  });

  it("Revenue's threshold example: €450,000 in Group A → €30,000 excess → €9,900", () => {
    const r = computeCat({ group: 'A', kind: 'inheritance', value: 450000, date: '2026-11-01', priorInGroup: 0 });
    expect(r.taxable).toBe(30000);
    expect(r.tax).toBe(9900);
  });

  it("Revenue's aggregation example: prior €385,000, gift taxable €40,000 on 7 Oct 2026 → €5,000 excess", () => {
    // €43,000 gift less the €3,000 small gift exemption = €40,000 taxable value, as in the example.
    const r = computeCat({ group: 'A', kind: 'gift', value: 43000, date: '2026-10-07', priorInGroup: 385000 });
    expect(r.taxableValue).toBe(40000);
    expect(r.unusedThreshold).toBe(35000);
    expect(r.taxable).toBe(5000);
    expect(r.tax).toBe(1650);
  });

  it("small gift exemption: Revenue's €30,000 gift → €27,000 taxable value; not for inheritances", () => {
    expect(computeCat({ group: 'B', kind: 'gift', value: 30000, date: '2026-11-01', priorInGroup: 0 }).taxableValue).toBe(27000);
    expect(computeCat({ group: 'B', kind: 'inheritance', value: 30000, date: '2026-11-01', priorInGroup: 0 }).smallGiftExemption).toBe(0);
  });

  it('prior benefits above the threshold: the whole new benefit is taxed', () => {
    expect(computeCat({ group: 'C', kind: 'inheritance', value: 10000, date: '2026-11-01', priorInGroup: 30000 }).tax).toBe(3300);
  });

  it('filing: IT38 required above 80% of the threshold; pay and file 31 October', () => {
    expect(computeCat({ group: 'B', kind: 'inheritance', value: 36000, date: '2026-11-01', priorInGroup: 0 }).mustFile).toBe(true);
    expect(computeCat({ group: 'B', kind: 'inheritance', value: 35000, date: '2026-11-01', priorInGroup: 0 }).mustFile).toBe(false);
    expect(payAndFileBy('2026-08-31')).toBe('2026-10-31');
    expect(payAndFileBy('2026-09-01')).toBe('2027-10-31');
  });
});
