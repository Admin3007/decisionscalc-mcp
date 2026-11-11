import { describe, it, expect } from 'vitest';
import { computeSdltHistory as h, PERIODS, periodFor } from './uk-sdlt-history';
import { computeSdlt } from './uk-stamp-duty';

const tax = (price: number, date: string, buyer: 'standard' | 'firstTimeBuyer' | 'additional' = 'standard', nonResident = false) =>
  h({ price, date, buyer, nonResident }).tax;

describe('SDLT history: periods (17 GOV.UK pages + current rates)', () => {
  it('periods are contiguous from 1 Dec 2003 with no gaps or overlaps', () => {
    for (let i = 1; i < PERIODS.length; i++) {
      const prevEnd = new Date(PERIODS[i - 1].to! + 'T00:00:00Z'); prevEnd.setUTCDate(prevEnd.getUTCDate() + 1);
      expect(PERIODS[i].from).toBe(prevEnd.toISOString().slice(0, 10));
    }
    expect(PERIODS[PERIODS.length - 1].to).toBeNull();
    expect(periodFor('2003-11-30')).toBeNull();
  });
});

describe('SDLT history: the slab years (one rate on the whole price)', () => {
  it('2004: 1% above £60,000', () => { expect(tax(60000, '2004-06-01')).toBe(0); expect(tax(200000, '2004-06-01')).toBe(2000); });
  it('2005: nil band £120,000', () => { expect(tax(120000, '2005-06-01')).toBe(0); expect(tax(130000, '2005-06-01')).toBe(1300); });
  it('2008-09 holiday: nil band £175,000', () => { expect(tax(175000, '2009-06-01')).toBe(0); expect(tax(180000, '2009-06-01')).toBe(1800); expect(tax(180000, '2010-02-01')).toBe(1800); expect(tax(130000, '2010-02-01')).toBe(1300); });
  it('the £250,000 cliff edge: £1 more cost £5,000', () => { expect(tax(250000, '2013-06-01')).toBe(2500); expect(tax(250001, '2013-06-01')).toBe(7500); });
  it('2010-12: first-time buyers paid nothing up to £250,000', () => { expect(tax(240000, '2011-01-01', 'firstTimeBuyer')).toBe(0); expect(tax(240000, '2011-01-01')).toBe(2400); expect(tax(240000, '2012-06-01', 'firstTimeBuyer')).toBe(2400); });
  it('5% over £1m from 6 Apr 2011; 7% over £2m from 22 Mar 2012', () => {
    expect(tax(1500000, '2011-03-01')).toBe(60000);
    expect(tax(1500000, '2011-06-01')).toBe(75000);
    expect(tax(2500000, '2012-03-21')).toBe(125000);
    expect(tax(2500000, '2012-03-23')).toBe(175000);
  });
});

describe('SDLT history: the slice years', () => {
  it('2018: £300,000 = £5,000; first-time buyer £0; additional home £14,000', () => {
    expect(tax(300000, '2018-06-01')).toBe(5000);
    expect(tax(300000, '2018-06-01', 'firstTimeBuyer')).toBe(0);
    expect(tax(300000, '2018-06-01', 'additional')).toBe(14000);
  });
  it('first-time buyer relief starts 22 Nov 2017', () => { expect(tax(300000, '2017-11-21', 'firstTimeBuyer')).toBe(5000); expect(tax(300000, '2017-11-22', 'firstTimeBuyer')).toBe(0); });
  it('higher rates start 1 Apr 2016', () => { expect(tax(300000, '2016-03-31', 'additional')).toBe(5000); expect(tax(300000, '2016-04-01', 'additional')).toBe(14000); });
  it('2020 holiday: £400,000 pays nothing, and first-time buyers get the lower standard figure', () => {
    expect(tax(400000, '2020-10-01')).toBe(0);
    expect(tax(400000, '2020-10-01', 'firstTimeBuyer')).toBe(0);
  });
  it('Jul–Sep 2021 taper: £300,000 = £2,500; first-time buyer £0', () => { expect(tax(300000, '2021-08-01')).toBe(2500); expect(tax(300000, '2021-08-01', 'firstTimeBuyer')).toBe(0); });
  it('2022-25: first-time buyers 0% to £425,000; £450,000 = £1,250', () => { expect(tax(450000, '2023-06-01', 'firstTimeBuyer')).toBe(1250); expect(tax(450000, '2023-06-01')).toBe(10000); });
  it('higher rates 5% from 31 Oct 2024: £300,000 additional = £17,500 (was £11,500)', () => {
    expect(tax(300000, '2024-10-30', 'additional')).toBe(11500);
    expect(tax(300000, '2024-11-15', 'additional')).toBe(17500);
  });
  it('non-resident surcharge 2% from 1 Apr 2021', () => { expect(tax(300000, '2021-03-31', 'standard', true)).toBe(0); expect(tax(300000, '2021-10-15', 'standard', true)).toBe(5000 + 6000); });
});

describe('SDLT history: today matches the current-rates calculator exactly', () => {
  for (const price of [100000, 125000, 250000, 295000, 450000, 600000, 1000000, 2000000]) {
    for (const buyer of ['standard', 'firstTimeBuyer', 'additional'] as const) {
      it(`£${price} ${buyer}`, () => expect(tax(price, '2026-11-08', buyer)).toBe(Math.round(computeSdlt(price, buyer).total)));
    }
  }
});
