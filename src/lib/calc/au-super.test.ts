import { describe, it, expect } from 'vitest';
import { superGuarantee as sg, MAX_BASE_2026_27, CONCESSIONAL_CAP_2026_27, SG_RATE } from './au-super';

// ATO "Super guarantee" and "Contributions caps" pages (read 8 Nov 2026).
describe('Australian super guarantee 2026-27', () => {
  it('ATO formula: maximum contribution base = cap x 100 / 12%, rounded down to $10 = $270,830', () => {
    expect(Math.floor((CONCESSIONAL_CAP_2026_27 * 100) / (SG_RATE * 100) / 10) * 10).toBe(MAX_BASE_2026_27);
  });
  it('$100,000 salary: $12,000 a year, $461.54 a fortnight; $20,500 of cap left', () => {
    const r = sg({ salary: 100000, salarySacrifice: 0, paydays: 26 });
    expect(r.sg).toBe(12000);
    expect(r.perPayday).toBe(461.54);
    expect(r.capLeft).toBe(20500);
    expect(r.intoFund).toBe(10200);
  });
  it('earnings above $270,830 attract no more super guarantee', () => {
    expect(sg({ salary: 400000, salarySacrifice: 0, paydays: 12 }).sg).toBe(32499.6);
  });
  it('salary sacrifice counts towards the $32,500 cap; the excess is flagged', () => {
    const r = sg({ salary: 150000, salarySacrifice: 20000, paydays: 26 });
    expect(r.concessional).toBe(38000);
    expect(r.overCap).toBe(5500);
    expect(r.capLeft).toBe(0);
  });
  it('Division 293 flagged above $250,000', () => {
    expect(sg({ salary: 260000, salarySacrifice: 0, paydays: 26 }).div293).toBe(true);
    expect(sg({ salary: 120000, salarySacrifice: 0, paydays: 26 }).div293).toBe(false);
  });
});
