/** Revenue's own worked examples (IE-FARM-SUCCESSION-FACTS.md section 9). Examples dated before 7 Oct 2026 use 33% CGT and the old thresholds. */
import { describe, it, expect } from 'vitest';
import { computeFarm, retirementReliefCgt, residentialDuty, s599Cap, EXAMPLE, type FarmInput } from './ie-farm-transfer';

const base: FarmInput = { route: 'inheritance', date: '2026-11-12', relationship: 'child', landValue: 0, activeFarmer: false };

describe('CAT (Revenue CAT thresholds page and agricultural relief manual)', () => {
  it('9.14 Sarah: 450,000 to each child on 7 Oct 2026, Group A 420,000, CAT 9,900 each', () => {
    expect(computeFarm({ ...base, date: '2026-10-07', otherValue: 450_000 }).cat.with).toBe(9900);
  });
  it('9.15 Annie: Group B, 34,000 earlier, 20,000 in March 2025 (threshold 40,000): CAT 4,620', () => {
    expect(computeFarm({ ...base, date: '2025-03-01', relationship: 'relative', otherValue: 20_000, priorBenefits: 34_000 }).cat.with).toBe(4620);
  });
  it('9.2 Ben: 500,000 of farmland from an uncle, threshold used up: agricultural relief gives CAT 16,500; without it 165,000', () => {
    const r = computeFarm({ ...base, date: '2022-01-01', relationship: 'relative', landValue: 500_000, activeFarmer: true, priorBenefits: 32_500 });
    expect(r.agReliefApplies).toBe(true);
    expect(r.cat.with).toBe(16500);
    expect(r.cat.without).toBe(165000);
  });
  it('9.1 Alex: 1,175,000 of farm assets and 110,000 of her own = 91%, passes the 80% test', () => {
    const r = computeFarm({ ...base, landValue: 1_175_000, beneficiaryAssets: 110_000, activeFarmer: true });
    expect(r.assetTestShare).toBeCloseTo(0.914, 3);
    expect(r.agReliefApplies).toBe(true);
  });
  it('fails the 80% test with large other assets, or without active farming', () => {
    expect(computeFarm({ ...base, landValue: 600_000, beneficiaryAssets: 400_000, activeFarmer: true }).agReliefApplies).toBe(false);
    expect(computeFarm({ ...base, landValue: 600_000, activeFarmer: false }).agReliefApplies).toBe(false);
  });
  it('a gift gets the 3,000 small gift exemption; an inheritance has no CGT or stamp duty', () => {
    const g = computeFarm({ ...base, route: 'gift', otherValue: 500_000, disponerAge: 50, baseCost: 0 });
    expect(g.cat.with).toBeCloseTo(0.33 * (500_000 - 3000 - 420_000), 2);
    const inh = computeFarm({ ...base, landValue: 2_000_000, activeFarmer: true });
    expect(inh.cgt.with).toBe(0);
    expect(inh.stampDuty.with).toBe(0);
  });
});

describe('CGT retirement relief (TDM 19-06-03 and 19-06-03b)', () => {
  it('9.11a s.599 2021, aged 67, 5m to a child, cost 1.5m, 3m cap: net CGT 660,000', () => {
    expect(retirementReliefCgt({ value: 5e6, gain: 3.5e6, rate: 0.33, age: 67, date: '2021-06-01', toChild: true, prior: 0, qualifies: true }).due).toBe(660000);
  });
  it('9.11b s.599 2025, aged 67, 15m, cost 8m, 10m cap: 1,650,000, deferrable', () => {
    const r = retirementReliefCgt({ value: 15e6, gain: 7e6, rate: 0.33, age: 67, date: '2025-06-01', toChild: true, prior: 0, qualifies: true });
    expect(r.due).toBe(1650000);
    expect(r.deferrable).toBe(1650000);
  });
  it('9.11c/d caps: unlimited at 63 in 2024; 70+ from 2025 capped at 3m and not deferrable', () => {
    expect(s599Cap(63, '2024-01-01')).toBe(Infinity);
    expect(s599Cap(69, '2025-01-01')).toBe(10e6);
    const r = retirementReliefCgt({ value: 4e6, gain: 2e6, rate: 0.33, age: 70, date: '2026-01-01', toChild: true, prior: 9e6, qualifies: true });
    expect(r.due).toBeCloseTo(0.33 * 2e6, 2); // no relief left: aggregate 13m > 3m
    expect(r.deferrable).toBe(0);
  });
  it('9.9 s.598 marginal relief at the 750,000 threshold: tax limited to 5,000 / 15,000 / 20,000', () => {
    const t = (value: number, gain: number) => retirementReliefCgt({ value, gain, rate: 0.33, age: 60, date: '2025-06-01', toChild: false, prior: 0, qualifies: true }).due;
    expect(t(760_000, 30_000)).toBe(5000);
    expect(t(780_000, 80_000)).toBe(15000);
    expect(t(790_000, 110_000)).toBe(20000);
  });
  it('no relief under 55 or without 10 years of ownership and use', () => {
    expect(retirementReliefCgt({ value: 1e6, gain: 5e5, rate: 0.31, age: 54, date: '2026-11-12', toChild: true, prior: 0, qualifies: true }).due).toBe(155000);
    expect(retirementReliefCgt({ value: 1e6, gain: 5e5, rate: 0.31, age: 60, date: '2026-11-12', toChild: true, prior: 0, qualifies: false }).relief).toBe('none');
  });
});

describe('stamp duty (Stamp Duty Manual Sch. 1 and s.81AA)', () => {
  it('9.16 1m of farmland to a child: 10,000 at 1% consanguinity, then nil with young trained farmer relief', () => {
    const g = { ...base, route: 'gift' as const, landValue: 1_000_000, activeFarmer: true, disponerAge: 60, baseCost: 1_000_000 };
    expect(computeFarm(g).stampDuty.with).toBe(10000);
    const y = computeFarm({ ...g, youngTrainedFarmer: true });
    expect(y.stampDuty.with).toBe(0);
    expect(y.stampDuty.stateAid).toBe(10000);
  });
  it('no young trained farmer relief (or consanguinity) if they will not farm it', () => {
    const r = computeFarm({ ...base, route: 'gift', landValue: 1_000_000, activeFarmer: false, youngTrainedFarmer: true, disponerAge: 60, baseCost: 1_000_000 });
    expect(r.stampDuty.ytf).toBe(false);
    expect(r.stampDuty.with).toBe(75000);
  });
  it('9.17 farmhouse of 1.2m at residential rates: 14,000', () => {
    expect(residentialDuty(1_200_000)).toBe(14000);
  });
  it('9.18 the 100,000 cap: 13,000 used leaves 87,000; a third party pays 7.5%', () => {
    const g = { ...base, route: 'gift' as const, landValue: 1_300_000, activeFarmer: true, disponerAge: 60, baseCost: 1_300_000, youngTrainedFarmer: true };
    expect(computeFarm(g).stampDuty.stateAid).toBe(13000);
    expect(computeFarm({ ...g, relationship: 'other', youngTrainedFarmer: false }).stampDuty.with).toBe(97500);
  });
});

describe('the page example', () => {
  it('a 1.5m farm from a parent aged 64 to a qualified child: no tax with the reliefs', () => {
    const r = computeFarm(EXAMPLE);
    expect(r.cat.with).toBe(0);
    expect(r.cgt.with).toBe(0);
    expect(r.stampDuty.with).toBe(0);
    // Without reliefs: CGT 31% x 1.3m = 403,000 is credited (s.104) against the CAT of 33% x (1.5m - 3,000 - 420,000) = 355,410,
    // so the CAT is nil; stamp duty 7.5% x 1.2m + 1% x 300,000 = 93,000.
    expect(r.cgt.without).toBeCloseTo(403_000, 2);
    expect(r.cat.without).toBe(0);
    expect(r.stampDuty.without).toBe(93_000);
    expect(r.totalWithout).toBe(496_000);
    expect(r.saved).toBe(r.totalWithout);
  });
});
