import { describe, it, expect } from 'vitest';
import { computeQpip, qpipWeekly, QPIP_2026 } from './ca-qpip';

const sum = (lines: { weeks: number }[]) => lines.reduce((s, l) => s + l.weeks, 0);

describe('QPIP (Québec Parental Insurance Plan) 2026', () => {
  it('Québec.ca tables: weeks and rates for both plans', () => {
    // Choice of Plan and Types of Benefits, Québec.ca (updated 22 Oct 2026).
    expect(QPIP_2026.basic.maternity).toEqual({ weeks: 18, rate: 0.7 });
    expect(QPIP_2026.special.maternity).toEqual({ weeks: 15, rate: 0.75 });
    expect(QPIP_2026.basic.paternity).toEqual({ weeks: 5, rate: 0.7 });
    expect(QPIP_2026.special.paternity).toEqual({ weeks: 3, rate: 0.75 });
    expect(sum(QPIP_2026.basic.birthShared)).toBe(32);
    expect(sum(QPIP_2026.special.birthShared)).toBe(25);
    expect(QPIP_2026.basic.extra).toEqual({ weeks: 4, rate: 0.55 });
    expect(QPIP_2026.special.extra).toEqual({ weeks: 3, rate: 0.75 });
    // Adoption: 13 welcome + 32 adoption (basic), 12 + 25 (special).
    expect(sum(QPIP_2026.basic.adoptionShared)).toBe(45);
    expect(sum(QPIP_2026.special.adoptionShared)).toBe(37);
    expect(QPIP_2026.mie).toBe(103000);
  });

  it('weekly benefit is capped at the $103,000 maximum insurable earnings', () => {
    expect(qpipWeekly(150000, 0.7)).toBe(1386.54); // 103,000 / 52 × 70%
    expect(qpipWeekly(150000, 0.75)).toBe(1485.58);
    expect(qpipWeekly(150000, 0.55)).toBe(1089.42);
    expect(qpipWeekly(52000, 0.7)).toBe(700);
  });

  it('basic plan, two parents at $52,000 sharing 16/16: 59 family weeks with the extra 4', () => {
    const r = computeQpip({ plan: 'basic', event: 'birth', salary1: 52000, salary2: 52000, sharedWeeks1: 16, takeExtra: true, extraWeeks1: 2 });
    expect(r.extraAvailable).toBe(true);
    expect(r.totalWeeks).toBe(18 + 5 + 32 + 4);
    // Parent 1 goes first: 18 × 700 + 7 × 700 + 9 × 550 + 2 × 550.
    expect(r.parents[0].total).toBe(18 * 700 + 7 * 700 + 9 * 550 + 2 * 550);
    // Parent 2: 5 × 700 + 16 × 550 + 2 × 550.
    expect(r.parents[1].total).toBe(5 * 700 + 16 * 550 + 2 * 550);
  });

  it('the first 7 shared weeks at 70% go to whichever parent starts', () => {
    const r = computeQpip({ plan: 'basic', event: 'birth', salary1: 52000, salary2: 52000, sharedWeeks1: 16, firstParent: 2 });
    const p2At70 = r.lines.filter((l) => l.parent === 2 && l.label === 'Parental (shared)' && l.rate === 0.7);
    expect(sum(p2At70)).toBe(7);
  });

  it('special plan: 46 family weeks all at 75%', () => {
    const r = computeQpip({ plan: 'special', event: 'birth', salary1: 52000, salary2: 52000, sharedWeeks1: 12, takeExtra: true, extraWeeks1: 1 });
    expect(r.totalWeeks).toBe(15 + 3 + 25 + 3);
    expect(r.lines.every((l) => l.rate === 0.75)).toBe(true);
    expect(r.total).toBe(46 * 750);
  });

  it('extra weeks need each parent to take 8 (basic) or 6 (special) shared weeks', () => {
    expect(computeQpip({ plan: 'basic', event: 'birth', salary1: 52000, salary2: 52000, sharedWeeks1: 25, takeExtra: true }).extraAvailable).toBe(false); // other parent 7
    expect(computeQpip({ plan: 'basic', event: 'birth', salary1: 52000, salary2: 52000, sharedWeeks1: 24, takeExtra: true }).extraAvailable).toBe(true);
    expect(computeQpip({ plan: 'special', event: 'birth', salary1: 52000, salary2: 52000, sharedWeeks1: 19, takeExtra: true }).extraAvailable).toBe(true);
    expect(computeQpip({ plan: 'special', event: 'birth', salary1: 52000, salary2: 52000, sharedWeeks1: 20, takeExtra: true }).extraAvailable).toBe(false);
  });

  it('a parent under $2,000 of insurable earnings gets nothing; the other takes all shared weeks', () => {
    const r = computeQpip({ plan: 'basic', event: 'birth', salary1: 52000, salary2: 1999, sharedWeeks1: 10 });
    expect(r.parents[1].eligible).toBe(false);
    expect(r.parents[1].total).toBe(0);
    expect(r.sharedWeeks).toEqual([32, 0]);
    expect(r.parents[0].weeks).toBe(18 + 32);
  });

  it('single parent gets the 5 extra exclusive weeks and all shared weeks', () => {
    const r = computeQpip({ plan: 'basic', event: 'birth', salary1: 52000, salary2: 52000, singleParent: true, sharedWeeks1: 0 });
    expect(r.parents[1].weeks).toBe(0);
    expect(r.parents[0].weeks).toBe(18 + 5 + 32);
  });

  it('adoption, basic plan: 5 + 5 exclusive and 45 shareable (20 at 70%, 25 at 55%)', () => {
    const r = computeQpip({ plan: 'basic', event: 'adoption', salary1: 52000, salary2: 52000, sharedWeeks1: 45 });
    expect(r.parents[1].weeks).toBe(5);
    const at70 = r.lines.filter((l) => l.parent === 1 && l.label === 'Shared' && l.rate === 0.7);
    expect(sum(at70)).toBe(20);
    expect(r.totalWeeks).toBe(55);
  });

  it('EI comparison: same family outside Québec at $52,000', () => {
    const r = computeQpip({ plan: 'basic', event: 'birth', salary1: 52000, salary2: 52000, sharedWeeks1: 16 });
    // Maternity 15 × $550, then 40 standard weeks split 20/20 at $550.
    expect(r.ei.standard.total1).toBe(15 * 550 + 20 * 550);
    expect(r.ei.standard.total2).toBe(20 * 550);
    // Extended: 69 weeks split 34/35 at 33% ($330).
    expect(r.ei.extended.weeks1 - 15 + r.ei.extended.weeks2).toBe(69);
    // EI caps at $729 a week above $68,900; QPIP pays far more for a high earner.
    const high = computeQpip({ plan: 'special', event: 'birth', salary1: 120000, salary2: 120000, sharedWeeks1: 12 });
    expect(high.parents[0].total).toBeGreaterThan(high.ei.standard.total1);
  });

  it('no NaN on empty inputs', () => {
    const r = computeQpip({ plan: 'basic', event: 'birth', salary1: NaN, salary2: NaN, sharedWeeks1: NaN });
    expect(r.total).toBe(0);
    expect(Number.isFinite(r.ei.standard.total)).toBe(true);
  });
});
