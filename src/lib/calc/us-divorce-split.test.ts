import { describe, it, expect } from 'vitest';
import { divorceSplit, federalTaxWithGains, type Spouse } from './us-divorce-split';

const sp = (o: Partial<Spouse> = {}): Spouse => ({ status: 'single', income: 80000, stateRate: 0, retireRate: 20, over59: false, ...o });

describe('federal tax with long-term gains (2026 worksheet)', () => {
  it('fills the 0% band left over above ordinary income, then 15%', () => {
    // $40,000 income, $30,000 gain: ordinary taxable $23,900 ($2,620 tax); 0% on $25,550, 15% on $4,450.
    expect(federalTaxWithGains('single', 40000, 30000)).toBeCloseTo(2620 + 4450 * 0.15, 6);
  });
  it('20% above the 15% band', () => {
    // Ordinary taxable $583,900 is above $545,500: the whole gain at 20%.
    expect(federalTaxWithGains('single', 600000, 10000) - federalTaxWithGains('single', 600000, 0)).toBeCloseTo(2000, 6);
  });
  it('head of household thresholds', () => {
    // $50,000 income: ordinary taxable $25,850; 0% to $66,200.
    expect(federalTaxWithGains('hoh', 50000, 40000) - federalTaxWithGains('hoh', 50000, 0)).toBeCloseTo(0, 6); // all $40,000 fits in the $40,350 of 0% room
  });
});

describe('divorce split after tax', () => {
  it('$200k of low-basis stock is not equal to $200k of cash', () => {
    const r = divorceSplit({ A: sp({ stateRate: 5 }), B: sp({ stateRate: 5 }) }, [
      { type: 'brokerage', value: 200000, basis: 50000, to: 'A' },
      { type: 'cash', value: 200000, to: 'B' },
    ]);
    // Gain $150,000 at 15% = $22,500; NIIT 3.8% on $30,000 over $200,000 MAGI = $1,140; state 5% = $7,500.
    expect(r.assets[0].tax).toBeCloseTo(22500 + 1140 + 7500, 6);
    expect(r.paperShareA).toBeCloseTo(0.5, 9);
    expect(r.afterTax.A).toBeCloseTo(168860, 6);
    expect(r.afterTaxShareA).toBeCloseTo(168860 / 368860, 9);
    expect(r.equaliser).toBeCloseTo(-15570, 6); // B pays A $15,570 to be 50/50 after tax
  });
  it('home: equity on paper, selling costs and tax above the $250,000 exclusion', () => {
    const home = { type: 'home' as const, value: 600000, basis: 300000, mortgage: 200000, sellPct: 6, to: 'B' as const };
    const r = divorceSplit({ A: sp(), B: sp({ income: 60000 }) }, [{ ...home, meetsUse: true }]);
    // Gain 600,000 - 36,000 - 300,000 = 264,000; 14,000 taxable: 5,550 at 0%, 8,450 at 15%.
    expect(r.assets[0].paper).toBe(400000);
    expect(r.assets[0].tax).toBeCloseTo(36000 + 8450 * 0.15, 6);
    const n = divorceSplit({ A: sp(), B: sp({ income: 60000 }) }, [{ ...home, meetsUse: false }]);
    // No exclusion: 5,550 at 0%, 258,450 at 15%, NIIT on 124,000 above $200,000.
    expect(n.assets[0].tax).toBeCloseTo(36000 + 258450 * 0.15 + 124000 * 0.038, 6);
  });
  it('401(k) cashed out under a QDRO: income tax, no 10%; an IRA before 59½ adds 10%', () => {
    const k = divorceSplit({ A: sp({ income: 50000 }), B: sp() }, [{ type: 'k401', value: 30000, to: 'A', cashOut: true }]);
    expect(k.assets[0].tax).toBeCloseTo(4950, 6); // tax on $63,900 ($8,770) minus tax on $33,900 ($3,820)
    const i = divorceSplit({ A: sp({ income: 50000 }), B: sp() }, [{ type: 'ira', value: 30000, to: 'A', cashOut: true }]);
    expect(i.assets[0].tax).toBeCloseTo(4950 + 3000, 6);
    const o = divorceSplit({ A: sp({ income: 50000, over59: true }), B: sp() }, [{ type: 'ira', value: 30000, to: 'A', cashOut: true }]);
    expect(o.assets[0].tax).toBeCloseTo(4950, 6);
  });
  it('kept-invested retirement money at the retirement rate; qualified Roth tax-free; debts count against', () => {
    const r = divorceSplit({ A: sp({ retireRate: 22 }), B: sp() }, [
      { type: 'k401', value: 100000, to: 'A' },
      { type: 'roth', value: 50000, to: 'B' },
      { type: 'debt', value: 10000, to: 'B' },
    ]);
    expect(r.afterTax.A).toBeCloseTo(78000, 6);
    expect(r.afterTax.B).toBeCloseTo(40000, 6);
    expect(r.paper.B).toBe(40000);
  });
  it('gains from several assets are taxed together on top of the receiver’s income', () => {
    const r = divorceSplit({ A: sp({ income: 40000 }), B: sp() }, [
      { type: 'brokerage', value: 20000, basis: 5000, to: 'A' },
      { type: 'brokerage', value: 20000, basis: 5000, to: 'A' },
    ]);
    const total = federalTaxWithGains('single', 40000, 30000) - federalTaxWithGains('single', 40000, 0);
    expect(r.tax.A).toBeCloseTo(total, 6);
    expect(r.assets[0].tax).toBeCloseTo(r.assets[1].tax, 9);
  });
});
