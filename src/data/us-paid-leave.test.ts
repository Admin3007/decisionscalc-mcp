import { describe, it, expect } from 'vitest';
import { usLeaveFor, US_STATES } from './us-paid-leave.js';

describe('us-paid-leave: one parent', () => {
  it('California birth parent: waiting week, 9 recovery + 8 bonding at 90% of $1,000', () => {
    const r = usLeaveFor('CA', 52000, { birthParent: true, weeksOff: 20 });
    expect(r.paidWeeks).toBe(17);
    expect(r.total).toBeCloseTo(17 * 900, 6);
    expect(r.gap).toBeCloseTo(20 * 1000 - 17 * 900, 6);
  });
  it('New York partner: 12 bonding weeks at 67% up to $1,228.53, no waiting week', () => {
    const r = usLeaveFor('NY', 130000, { birthParent: false, weeksOff: 12 });
    expect(r.weekly).toBeCloseTo(1228.53, 6);
    expect(r.total).toBeCloseTo(12 * 1228.53, 6);
  });
  it('no state program pays nothing; every state has a sane entitlement', () => {
    expect(usLeaveFor('TX', 60000).total).toBe(0);
    for (const s of US_STATES.filter((x) => x.code !== 'XX')) {
      const r = usLeaveFor(s.code, 60000);
      expect(r.paidWeeks).toBeGreaterThan(0);
      expect(r.weekly).toBeLessThanOrEqual(s.max);
    }
  });
});
