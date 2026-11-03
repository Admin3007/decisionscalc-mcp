import { describe, it, expect } from 'vitest';
import { checkEntitlements, CHILD_BENEFIT_MONTHLY, NEW_BABY_GRANT, FUEL_WEEKLY } from './ie-entitlements';
import { computeWfp } from './ie-wfp';

const base = { year: 2026 as const, aged66: false, couple: false, children: 1, expecting: false, pay1: 30000, pay2: 0, hoursFortnight: 78, caring: false, renter: false, savings: 0, prsiYears: 0 };
const ids = (r: ReturnType<typeof checkEntitlements>) => r.items.map((i) => i.id);

describe('What can I claim? Ireland (read 2026-11-03)', () => {
  it('pins the extra official figures', () => {
    expect([CHILD_BENEFIT_MONTHLY, NEW_BABY_GRANT]).toEqual([140, 280]);
    expect(FUEL_WEEKLY).toEqual({ 2026: 38, 2027: 43 });
  });

  it('single parent on €30,000 with 1 child: Child Benefit + WFP (same figure as the WFP calculator) + Fuel Allowance', () => {
    const r = checkEntitlements(base);
    expect(ids(r)).toEqual(['child-benefit', 'wfp', 'fuel']);
    const wfp = computeWfp({ year: 2026, children: 1, couple: false, pay1: 30000, pay2: 0, hoursFortnight: 78 });
    expect(r.items.find((i) => i.id === 'wfp')!.amount).toBe(`€${wfp.weekly.toLocaleString('en-IE', { minimumFractionDigits: 2 })} a week`);
    expect(r.yearlyTotal).toBe(Math.round(140 * 12 + wfp.yearly));
    expect(r.items.find((i) => i.id === 'fuel')!.status).toBe('likely');
  });

  it('expecting a baby while working adds the New Baby Grant and Maternity Benefit', () => {
    const r = checkEntitlements({ ...base, expecting: true });
    expect(ids(r)).toContain('new-baby');
    expect(ids(r)).toContain('maternity');
  });

  it('a pensioner with 40 years of PRSI gets the full State Pension and a Fuel Allowance check', () => {
    const r = checkEntitlements({ ...base, aged66: true, children: 0, pay1: 0, prsiYears: 40, year: 2027 });
    expect(r.items.find((i) => i.id === 'pension')!.amount).toBe('€309.30 a week');
    expect(r.items.find((i) => i.id === 'fuel')!.status).toBe('check');
    expect(ids(r)).not.toContain('wfp');
  });

  it('a carer with a working partner gets a Carer’s Allowance estimate; a higher earner gets no WFP', () => {
    const r = checkEntitlements({ ...base, couple: true, children: 0, pay1: 0, pay2: 60000, caring: true });
    expect(r.items.find((i) => i.id === 'carers')!.status).toBe('likely');
    const rich = checkEntitlements({ ...base, pay1: 90000 });
    expect(rich.items.find((i) => i.id === 'wfp')!.status).toBe('no');
  });

  it('renters who pay tax get the Rent Tax Credit (2027 couple: up to €2,300)', () => {
    const r = checkEntitlements({ ...base, renter: true, couple: true, pay2: 20000, year: 2027 });
    expect(r.items.find((i) => i.id === 'rent-credit')!.amount).toBe('up to €2,300 a year');
  });

  it('survives bad input', () => {
    const r = checkEntitlements({ ...base, children: NaN as any, pay1: -1 as any, prsiYears: NaN as any, aged66: true });
    expect(Number.isFinite(r.yearlyTotal)).toBe(true);
  });
});
