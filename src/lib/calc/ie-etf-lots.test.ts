import { describe, it, expect } from 'vitest';
import { computeEtfLots, exitTaxRate } from './ie-etf-lots';

// The same hand-worked Revenue TDM 27-01a-02 cases as the tracker spreadsheet (tests/contracts/etf-tracker.test.ts).
describe('Irish ETF exit tax across purchases', () => {
  it('rates by year: 41% to 2025, 38% in 2026, 35% from 2027', () => {
    expect([exitTaxRate(2018), exitTaxRate(2025), exitTaxRate(2026), exitTaxRate(2027), exitTaxRate(2040)]).toEqual([0.41, 0.41, 0.38, 0.35, 0.35]);
  });

  const r = computeEtfLots({
    growth: 0,
    until: '2050-12-31',
    lots: [
      // 100 units at €50 bought 15 Mar 2018; €80 on 15 Mar 2026, €100 on 15 Mar 2034; sold 1 Jun 2035 for €9,000.
      { bought: '2018-03-15', cost: 5000, values: [8000, 10000], sold: { date: '2035-06-01', value: 9000 } },
      // A 2019 purchase at a loss on its 8-year date.
      { bought: '2019-07-01', cost: 1000, values: [900] },
      // A 2010 purchase: first 8-year date in 2018, at 41%.
      { bought: '2010-06-01', cost: 1000, values: [1500] },
    ],
  }, '2026-01-01');
  const ev = (lot: number, n: number) => r.events.filter((e) => e.lot === lot)[n];

  it('1st deemed disposal on 15 Mar 2026: €3,000 gain at 38% = €1,140', () => {
    expect(ev(0, 0)).toMatchObject({ date: '2026-03-15', kind: 'deemed', due: 1140 });
  });
  it('2nd deemed disposal in 2034: €5,000 gain at 35% less the €1,140 already paid = €610', () => {
    expect(ev(0, 1)).toMatchObject({ date: '2034-03-15', due: 610 });
  });
  it('sale in 2035: €4,000 gain at 35% = €1,400, less €1,750 paid: nothing due, €350 refunded', () => {
    expect(ev(0, 2)).toMatchObject({ kind: 'sale', due: 0, refund: 350 });
  });
  it('a loss on the 8-year date: no tax', () => {
    expect(ev(1, 0)).toMatchObject({ date: '2027-07-01', due: 0 });
  });
  it('a 2018 deemed disposal at 41%: €500 gain = €205', () => {
    expect(ev(2, 0)).toMatchObject({ date: '2018-06-01', due: 205 });
  });
  it('totals and the next event after today', () => {
    expect(r.totalRefund).toBe(350);
    expect(r.next?.date).toBe('2026-03-15');
  });
  it('grows a holding at the stated rate when no value is given', () => {
    const g = computeEtfLots({ growth: 5, until: '2034-12-31', lots: [{ bought: '2026-01-10', cost: 10000 }] }, '2026-01-01');
    expect(g.events).toHaveLength(1);
    const e = g.events[0];
    expect(e.date).toBe('2034-01-10');
    expect(e.value).toBeGreaterThan(14700); expect(e.value).toBeLessThan(14800); // ~10,000 × 1.05^8 = 14,775
    expect(e.due).toBeCloseTo((e.value - 10000) * 0.35, 0);
  });
});
