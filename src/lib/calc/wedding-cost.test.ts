import { describe, it, expect } from 'vitest';
import { computeWeddingCost, STYLE, type WeddingInputs, type WeddingBase } from './wedding-cost';

const base: WeddingBase = {
  venue: 120, catering: 90, photo: 35, music: 20, flowers: 25,
  attire: 30, paper: 6, transport: 8, misc: 15,
};
const input: WeddingInputs = {
  guests: 100, regionalMult: 1.0, style: 'moderate', month: 'peak', day: 'saturday', base,
};

describe('computeWeddingCost', () => {
  it('total equals the sum of all categories', () => {
    const r = computeWeddingCost(input);
    const sum = r.venue + r.catering + r.photo + r.music + r.flowers + r.attire + r.paper + r.officiant + r.transport + r.misc;
    expect(r.total).toBe(sum);
  });

  it('per guest and 15% buffer are derived from total', () => {
    const r = computeWeddingCost(input);
    expect(r.perGuest).toBe(Math.round(r.total / 100));
    expect(r.buffer).toBe(Math.round(r.total * 0.15));
  });

  it('luxury style costs more than budget', () => {
    const lux = computeWeddingCost({ ...input, style: 'luxury' });
    const bud = computeWeddingCost({ ...input, style: 'budget' });
    expect(lux.total).toBeGreaterThan(bud.total);
  });

  it('off-peak and weekday reduce cost vs peak Saturday', () => {
    const peak = computeWeddingCost(input);
    const cheap = computeWeddingCost({ ...input, month: 'offpeak', day: 'weekday' });
    expect(cheap.total).toBeLessThan(peak.total);
  });

  it('guest count floored at 10', () => {
    const tiny = computeWeddingCost({ ...input, guests: 2 });
    const ten = computeWeddingCost({ ...input, guests: 10 });
    expect(tiny.total).toBe(ten.total);
  });

  it('custom override replaces the computed estimate for that category', () => {
    const r = computeWeddingCost({ ...input, overrides: { venue: 99999 } });
    expect(r.venue).toBe(99999);
  });

  it('zero/absent override falls back to the estimate', () => {
    const withZero = computeWeddingCost({ ...input, overrides: { venue: 0 } });
    const without = computeWeddingCost(input);
    expect(withZero.venue).toBe(without.venue);
  });

  it('regional multiplier scales the estimate', () => {
    const r1 = computeWeddingCost(input);
    const r2 = computeWeddingCost({ ...input, regionalMult: 1.5 });
    expect(r2.venue).toBeGreaterThan(r1.venue);
  });

  it('officiant scales with style multiplier', () => {
    expect(computeWeddingCost(input).officiant).toBe(Math.round(350 * STYLE.moderate));
    expect(computeWeddingCost({ ...input, style: 'luxury' }).officiant).toBe(Math.round(350 * STYLE.luxury));
  });
});

// Each country's opening result (survey guest count, national region, the most
// common choices) must reproduce its published survey average. The pages say
// these figures are "checked against the named survey", so this keeps it true.
import { PACKS, defaultsFor } from '../../data/packs';
describe('country defaults reproduce the published survey averages', () => {
  const PUBLISHED: Record<string, number> = { US: 34200, GB: 20604, AU: 38252, CA: 32000, IE: 34392 };
  for (const [cc, avg] of Object.entries(PUBLISHED)) {
    it(`${cc} lands within 3% of ${avg}`, () => {
      const entry: any = (PACKS as any)[cc]['wedding-cost-calculator'];
      const r = computeWeddingCost({
        guests: defaultsFor(cc, 'wedding-cost-calculator').guestCount,
        regionalMult: 1, style: 'moderate', month: 'peak', day: 'saturday',
        base: entry.data.basePerGuest,
      });
      expect(Math.abs(r.total - avg) / avg).toBeLessThan(0.03);
    });
  }
  it('CH lands inside its published CHF 30,000-50,000 range', () => {
    const entry: any = (PACKS as any).CH['wedding-cost-calculator'];
    const r = computeWeddingCost({ guests: defaultsFor('CH', 'wedding-cost-calculator').guestCount, regionalMult: 1, style: 'moderate', month: 'peak', day: 'saturday', base: entry.data.basePerGuest });
    expect(r.total).toBeGreaterThan(30000); expect(r.total).toBeLessThan(50000);
  });
});

import { guestsForBudget } from './wedding-cost';
describe('guestsForBudget', () => {
  it('returns the guest count whose total fits the budget (and one more does not)', () => {
    const n = guestsForBudget(input, 25000);
    expect(computeWeddingCost({ ...input, guests: n }).total).toBeLessThanOrEqual(25000 + 5);
    expect(computeWeddingCost({ ...input, guests: n + 1 }).total).toBeGreaterThan(25000 - 5);
  });
  it('treats custom amounts as fixed costs', () => {
    const withVenue = { ...input, overrides: { venue: 12000 } };
    const a = guestsForBudget(input, 30000), b = guestsForBudget(withVenue, 30000);
    expect(b).not.toBe(a);
    expect(computeWeddingCost({ ...withVenue, guests: b }).total).toBeLessThanOrEqual(30000 + 5);
  });
  it('is 0 when the budget cannot cover the fixed costs', () => {
    expect(guestsForBudget({ ...input, overrides: { venue: 50000 } }, 20000)).toBe(0);
  });
});
