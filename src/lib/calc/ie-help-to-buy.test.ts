import { describe, it, expect } from 'vitest';
import {
  computeHtb, computeIeHome, htbRules, jointShare, fhsCeiling, serviceCharge, serviceChargeRate,
  HTB_CAP, HTB_CAP_ENHANCED, HTB_PRICE_LIMIT, HTB_MIN_LTV, HTB_CHANGE, FHS_MAX, FHS_MAX_WITH_HTB, FHS_CEILINGS,
} from './ie-help-to-buy';

describe('Help to Buy (revenue.ie and TDM 15-01-46, read 2026-11-03)', () => {
  it('pins the official figures', () => {
    expect(HTB_CAP).toBe(35000);
    expect(HTB_CAP_ENHANCED).toBe(30000);
    expect(HTB_CHANGE).toBe('2026-10-07');
    expect(HTB_PRICE_LIMIT).toBe(500000);
    expect(HTB_MIN_LTV).toBe(0.7);
    expect(htbRules('2026-10-06')).toEqual({ cap: 30000, rate: 0.1 });
    expect(htbRules('2026-10-07')).toEqual({ cap: 35000, rate: 0.1 });
    expect(htbRules('2020-07-22')).toEqual({ cap: 20000, rate: 0.05 });
  });

  it('Example 12.1: Mairead and James, €250,000 apartment, 2021 → 10% of price, €25,000', () => {
    const r = computeHtb({ price: 250000, taxPaid: 6200 + 6400 + 6800 + 7200, mortgage: 200000, contractDate: '2021-10-01' });
    expect(r.refund).toBe(25000);
    expect(r.limitedBy).toBe('price');
  });

  it('Example 12.2: Amy, €400,000 house, 2021, €71,600 tax → capped at €30,000', () => {
    const r = computeHtb({ price: 400000, taxPaid: 71600, mortgage: 320000, contractDate: '2021-11-01' });
    expect(r.refund).toBe(30000);
    expect(r.limitedBy).toBe('cap');
    // The same purchase under Budget 2027 rules gets the new €35,000 cap.
    expect(computeHtb({ price: 400000, taxPaid: 71600, mortgage: 320000, contractDate: '2026-11-01' }).refund).toBe(35000);
  });

  it('Example 12.3: Louise, €680,000 new build → over the price limit, nothing', () => {
    const r = computeHtb({ price: 680000, taxPaid: 50000, mortgage: 600000, contractDate: '2021-08-01' });
    expect(r.eligible).toBe(false);
    expect(r.refund).toBe(0);
  });

  it('Example 12.6: Maura, €490,000 in April 2020, €23,000 tax → original cap €20,000', () => {
    expect(computeHtb({ price: 490000, taxPaid: 23000, mortgage: 400000, contractDate: '2020-04-15' }).refund).toBe(20000);
  });

  it('Example 12.7: Joe and Robert, €500,000, €51,000 tax → €30,000 per property (2021)', () => {
    expect(computeHtb({ price: 500000, taxPaid: 51000, mortgage: 400000, contractDate: '2021-11-01' }).refund).toBe(30000);
  });

  it('Example 13.1: Susan, income tax €15,900 + DIRT €3,800 → €19,700', () => {
    const r = computeHtb({ price: 500000, taxPaid: 15900 + 3800, mortgage: 400000, contractDate: '2022-03-01' });
    expect(r.refund).toBe(19700);
    expect(r.limitedBy).toBe('tax');
  });

  it('Example 13.2: Colm, €450,000, income tax reaches the €30,000 maximum', () => {
    expect(computeHtb({ price: 450000, taxPaid: 34200, mortgage: 360000, contractDate: '2022-03-01' }).refund).toBe(30000);
  });

  it('Example 13.3: Philip, jointly assessed 2018-2019 → €15,407', () => {
    const y2018 = jointShare(29000, 66000, 9000);
    const y2019 = jointShare(30000, 67000, 9500);
    expect(y2018).toBe(3954);
    expect(y2019).toBe(4253);
    expect(y2018 + y2019 + 3500 + 3700).toBe(15407);
    expect(computeHtb({ price: 280000, taxPaid: 15407, mortgage: 230000, contractDate: '2022-03-01' }).refund).toBe(15407);
    // Josephine's share of the same years.
    expect(jointShare(37000, 66000, 9000) + jointShare(37000, 67000, 9500)).toBe(10291);
  });

  it('Citizens Information: €300,000, €180,000 mortgage + €45,000 FHS equity → 60% LTV, no HTB', () => {
    const r = computeHtb({ price: 300000, taxPaid: 40000, mortgage: 180000 });
    expect(r.eligible).toBe(false);
    expect(r.ltv).toBe(0.6);
  });

  it('at exactly 70% and €500,000 it still qualifies', () => {
    const r = computeHtb({ price: 500000, taxPaid: 60000, mortgage: 350000 });
    expect(r.eligible).toBe(true);
    expect(r.refund).toBe(35000);
  });
});

describe('First Home Scheme (firsthomescheme.ie, read 2026-11-03)', () => {
  it('pins the equity limits, ceilings and service charges', () => {
    expect(FHS_MAX).toBe(0.3);
    expect(FHS_MAX_WITH_HTB).toBe(0.2);
    expect(Object.keys(FHS_CEILINGS)).toHaveLength(31);
    expect(fhsCeiling('Dublin City', 'new')).toBe(500000);
    expect(fhsCeiling('Wicklow County', 'new')).toBe(500000);
    expect(fhsCeiling('Kildare County', 'new')).toBe(475000);
    expect(fhsCeiling('Cork County', 'self')).toBe(450000);
    expect(fhsCeiling('Waterford City and County', 'new', 'house')).toBe(400000);
    expect(fhsCeiling('Waterford City and County', 'new', 'apartment')).toBe(450000);
    expect(fhsCeiling('Waterford City and County', 'self')).toBe(400000);
    expect(fhsCeiling('Tipperary County', 'new')).toBe(375000);
    expect(serviceChargeRate(5)).toBe(0);
    expect(serviceChargeRate(6)).toBe(0.0175);
    expect(serviceChargeRate(16)).toBe(0.0215);
    expect(serviceChargeRate(30)).toBe(0.0285);
  });

  it('service charge examples: €400,000 × 10% → €700; €400,000 × 7.56% → €529.20; self-build €300,000 × 10% → €525', () => {
    expect(serviceCharge(400000, 0.10, 6)).toBe(700);
    expect(serviceCharge(400000, 0.0756, 6)).toBe(529.2);
    expect(serviceCharge(300000, 0.10, 6)).toBe(525);
    expect(serviceCharge(400000, 0.10, 3)).toBe(0);
  });

  it('Example one (David and Amy, with HTB): €450,000, €350,000 mortgage, €20,000 HTB → FHS €55,000 (12.22%)', () => {
    const r = computeIeHome({ price: 450000, mortgage: 350000, taxPaid: 20000, savings: 25000, buildType: 'new', area: 'Dublin City' });
    expect(r.htb.refund).toBe(20000);
    expect(r.fhs.amount).toBe(55000);
    expect(r.fhs.share).toBe(0.1222);
    expect(r.fhs.max).toBe(90000);
    expect(r.stillNeeded).toBe(0);
  });

  it('Example two (Sarah and Sean, no HTB): €380,000, €280,000 mortgage, €38,000 deposit → FHS €62,000 (16.32%)', () => {
    const r = computeIeHome({ price: 380000, mortgage: 280000, taxPaid: 0, savings: 38000, buildType: 'new', area: 'Meath County', useHtb: false });
    expect(r.fhs.amount).toBe(62000);
    expect(r.fhs.share).toBe(0.1632);
    expect(r.fhs.max).toBe(114000);
  });

  it('caps FHS at 20% with HTB and shows what is still needed', () => {
    const r = computeIeHome({ price: 400000, mortgage: 280000, taxPaid: 50000, savings: 5000, buildType: 'new', area: 'Fingal' });
    expect(r.htb.refund).toBe(35000);
    expect(r.gap).toBe(85000);
    expect(r.fhs.amount).toBe(80000); // gap 85,000 less the 5,000 deposit top-up to 10% (HTB already gives 35,000 of 40,000)
    expect(r.cashNeeded).toBe(5000);
    expect(r.stillNeeded).toBe(0);
    const short = computeIeHome({ price: 400000, mortgage: 280000, taxPaid: 50000, savings: 0, buildType: 'new', area: 'Fingal' });
    expect(short.stillNeeded).toBe(5000);
  });

  it('over the county ceiling: no FHS', () => {
    const r = computeIeHome({ price: 400000, mortgage: 300000, taxPaid: 40000, savings: 10000, buildType: 'new', area: 'Carlow County' });
    expect(r.fhs.eligible).toBe(false);
    expect(r.fhs.amount).toBe(0);
    expect(r.stillNeeded).toBe(55000);
  });

  it('a gap below the minimum share takes the minimum when the deposit allows it', () => {
    const r = computeIeHome({ price: 300000, mortgage: 240000, taxPaid: 30000, savings: 25000, buildType: 'new', area: 'Cork County' });
    // gap = 300,000 − 240,000 − 30,000 = 30,000; savings 25,000 leaves 5,000; minimum share €10,000.
    expect(r.fhs.min).toBe(10000);
    expect(r.fhs.amount).toBe(10000);
    expect(r.savingsUsed).toBe(20000);
  });

  it('bad input never produces NaN', () => {
    const r = computeIeHome({ price: NaN, mortgage: -1, taxPaid: NaN, savings: NaN, buildType: 'new', area: 'nowhere' });
    expect(Number.isFinite(r.stillNeeded)).toBe(true);
    expect(Number.isFinite(r.fhs.amount)).toBe(true);
  });
});
