import { describe, it, expect } from 'vitest';
import { computeBabyCost, childcareCost, feedingCost, type BabyCostInputs } from './baby-cost';
import { resolveBabyCosts, US_DEFAULT_STATE, type BabyPackData } from './baby-cost';
import { PACKS, defaultsFor } from '../../data/packs';

const base: BabyCostInputs = {
  medical: 2500, annualCC: 12000, weeklyPay: 1000, unpaidWeeks: 8,
  paidPct: 50, ccType: 'center', ccMonths: 12, feeding: 'combo',
};

describe('childcareCost', () => {
  it('center = annual/12 × months', () => expect(childcareCost('center', 12000, 12, 1000)).toBe(12000));
  it('home is 75% of center', () => expect(childcareCost('home', 12000, 12, 1000)).toBe(9000));
  it('nanny is 160% of center', () => expect(childcareCost('nanny', 12000, 12, 1000)).toBe(19200));
  it('sahp uses foregone wages', () => expect(childcareCost('sahp', 12000, 12, 1000)).toBe(52000));
  it('unknown/family type = 0', () => expect(childcareCost('family', 12000, 12, 1000)).toBe(0));
});

describe('feedingCost', () => {
  it('maps each feeding type', () => {
    expect(feedingCost('formula')).toBe(1800);
    expect(feedingCost('breast')).toBe(400);
    expect(feedingCost('combo')).toBe(1100);
    expect(feedingCost('none')).toBe(0);
  });
});

describe('computeBabyCost', () => {
  it('lost wages = weeks × pay × (1 - paidPct)', () => {
    const r = computeBabyCost(base);
    expect(r.lostWages).toBe(8 * 1000 * 0.5);
  });

  it('total sums all components', () => {
    const r = computeBabyCost(base);
    const expected = r.medical + r.pediatric + r.lostWages + r.childcare + r.feedingCost + r.gear + r.diapers + r.clothing + r.misc;
    expect(r.total).toBeCloseTo(expected, 6);
  });

  it('NHS (medical 0) lowers total', () => {
    const nhs = computeBabyCost({ ...base, medical: 0 });
    const paid = computeBabyCost({ ...base, medical: 4500 });
    expect(nhs.total).toBeLessThan(paid.total);
  });

  it('full paid leave eliminates lost wages', () => {
    const r = computeBabyCost({ ...base, paidPct: 100 });
    expect(r.lostWages).toBe(0);
  });

  it('maxVal is at least 1', () => {
    const r = computeBabyCost({
      medical: 0, annualCC: 0, weeklyPay: 0, unpaidWeeks: 0, paidPct: 0,
      ccType: 'family', ccMonths: 0, feeding: 'none',
    });
    expect(r.maxVal).toBeGreaterThanOrEqual(1);
  });
});

// The page's own defaults per country (pack defaults + the selects' first options), pinned to the totals the live
// page showed on 12 Nov 2026 before the lookups moved here (US $25,791, GB £24,300, CA $32,325, AU $26,130,
// IE €17,763, CH CHF 31,050; US Massachusetts, HDHP, C-section, nanny 12 months, combination feeding $67,575).

const pageTotal = (cc: string, over: Partial<{ region: string; insurance: string; delivery: string; ccType: string; ccMonths: number; feeding: string }> = {}) => {
  const data = (PACKS as any)[cc]['baby-cost-planner'].data as BabyPackData;
  const D = defaultsFor(cc, 'baby-cost-planner');
  const region = over.region ?? (cc === 'US' ? US_DEFAULT_STATE : (data.defaultRegion as string));
  const { medical, annualCC } = resolveBabyCosts(data, region, over.delivery ?? 'vaginal', over.insurance ?? 'employer');
  return computeBabyCost({ medical, annualCC, weeklyPay: D.weeklyPay, unpaidWeeks: D.unpaidWeeks, paidPct: D.paidPct, ccType: over.ccType ?? 'center', ccMonths: over.ccMonths ?? D.childcareMonths, feeding: over.feeding ?? 'formula' });
};

describe('resolveBabyCosts + page defaults', () => {
  it('US: Texas, employer plan, vaginal birth = $25,791 ($2,500 birth, $8,441 childcare for 9 months)', () => {
    const r = pageTotal('US');
    expect(r.medical).toBe(2500);
    expect(Math.round(r.childcare)).toBe(8441);
    expect(Math.round(r.total)).toBe(25791);
  });
  it('US: Massachusetts, HDHP, C-section, nanny for 12 months, combination feeding = $67,575', () => {
    expect(Math.round(pageTotal('US', { region: 'MA', insurance: 'hdhp', delivery: 'csection', ccType: 'nanny', ccMonths: 12, feeding: 'combo' }).total)).toBe(67575);
  });
  it('countries without a birth-cost table pay nothing for the birth; page totals unchanged', () => {
    for (const [cc, total] of [['GB', 24300], ['CA', 32325], ['AU', 26130], ['IE', 17763], ['CH', 31050]] as const) {
      const r = pageTotal(cc);
      expect(r.medical, cc).toBe(0);
      expect(Math.round(r.total), cc).toBe(total);
    }
  });
  it('fallbacks: unknown region uses the default region, unknown plan $3,500', () => {
    const us = PACKS.US['baby-cost-planner'].data as unknown as BabyPackData;
    expect(resolveBabyCosts(us, 'ZZ', 'vaginal', 'nope')).toEqual({ medical: 3500, annualCC: 11000 });
    const gb = PACKS.GB['baby-cost-planner'].data as unknown as BabyPackData;
    expect(resolveBabyCosts(gb, 'ZZ', 'vaginal', 'nhs')).toEqual({ medical: 0, annualCC: 11000 });
  });
});
