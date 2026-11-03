import { describe, it, expect } from 'vitest';
import { RULES, USC_EXEMPT, uscFor, prsiFor, computeYear, compareBudget } from './ie-budget-2027';

describe('Budget 2027 (Ireland), official figures read 2026-11-03', () => {
  it('pins Revenue 2026 and the Budget 2027 changes (gov.ie guide)', () => {
    expect(RULES[2027].band.single - RULES[2026].band.single).toBe(2500);
    expect(RULES[2027].band.married).toBe(55500);
    expect(RULES[2027].band.secondMax).toBe(37500);
    expect(RULES[2027].personal - RULES[2026].personal).toBe(125);
    expect(RULES[2027].employee).toBe(2125);
    expect(RULES[2027].homeCarer - RULES[2026].homeCarer).toBe(100);
    expect(RULES[2026].usc[1][0]).toBe(28700);
    expect(RULES[2027].usc[1][0]).toBe(30300);
    expect(RULES[2027].rent).toEqual({ single: 1150, couple: 2300 });
    expect(USC_EXEMPT).toBe(13000);
  });

  it('single employee on €50,000, 2026 (hand: tax 7,200; USC 1,032.82; PRSI 2,118.75)', () => {
    const y = computeYear({ status: 'single', pay1: 50000 }, 2026);
    expect(y.incomeTax).toBe(7200);
    expect(y.usc).toBe(1032.82);
    expect(y.prsi).toBe(2118.75);
    expect(y.takeHome).toBe(39648.43);
  });

  it('single on €50,000 keeps €691 more in 2027: tax −750, USC −16, PRSI +75', () => {
    const c = compareBudget({ status: 'single', pay1: 50000 });
    expect(c.y27.incomeTax).toBe(6450);
    expect(c.y27.usc).toBe(1016.82);
    expect(c.y27.prsi).toBe(2193.75);
    expect(c.lines.map((l) => l.change)).toEqual([750, 16, -75]);
    expect(c.gain).toBe(691);
  });

  it('two-income couple on €60,000 + €45,000: band rises €5,000, so income tax falls €1,500 (matches the published "€1,500 for a two-income couple")', () => {
    const c = compareBudget({ status: 'married-two', pay1: 60000, pay2: 45000 });
    // 2026: band 53,000 + 35,000 = 88,000; tax 88,000×20% + 17,000×40% − (4,000 + 2×2,000) = 16,400
    expect(c.y26.incomeTax).toBe(16400);
    // 2027: band 55,500 + 37,500 = 93,000; tax 93,000×20% + 12,000×40% − (4,250 + 2×2,125) = 14,900
    expect(c.y27.incomeTax).toBe(14900);
  });

  it('USC: nothing at or under €13,000; all of it once above', () => {
    expect(uscFor(13000, 2026)).toBe(0);
    expect(uscFor(13001, 2026)).toBe(Math.round((12012 * 0.005 + 989 * 0.02) * 100) / 100);
  });

  it('PRSI: none up to €352 a week; tapered credit up to €424; flat above', () => {
    expect(prsiFor(352 * 52, 2027)).toBe(0);
    const at400 = prsiFor(400 * 52, 2027);
    const credit = 12 - (400 - 352.01) / 6;
    expect(at400).toBeCloseTo(((400 * 0.0435 - credit) * 0.75 + (400 * 0.045 - credit) * 0.25) * 52, 1);
    expect(prsiFor(52000, 2027)).toBe(Math.round(52000 * (0.0435 * 0.75 + 0.045 * 0.25) * 100) / 100);
  });

  it('renters get the higher rent credit; single parents the wider band; low earners never negative', () => {
    expect(compareBudget({ status: 'single', pay1: 40000, renter: true }).lines[0].change).toBe(400); // personal 125 + employee 125 + rent 150
    const sp = computeYear({ status: 'single-parent', pay1: 50000 }, 2027);
    expect(sp.incomeTax).toBe(50000 * 0.2 - (2125 + 2125 + 1900));
    const low = computeYear({ status: 'single', pay1: 9000 }, 2027);
    expect(low.incomeTax).toBe(0);
    expect(low.takeHome).toBe(9000);
  });

  it('survives bad input', () => {
    const r = compareBudget({ status: 'married-two', pay1: NaN as any, pay2: -5 as any });
    expect(Number.isFinite(r.gain)).toBe(true);
  });
});
