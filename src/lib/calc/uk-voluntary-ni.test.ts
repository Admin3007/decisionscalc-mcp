import { describe, it, expect } from 'vitest';
import { computeNi, weeklyRate, deadlineFor, pensionFor, assessYear, whereYouLive, EARLIEST, type NiInput } from './uk-voluntary-ni';

const base: NiInput = { qualifyingYears: 20, gapYears: [], ukResidenceYears: 12, ukContributionYears: 12, workedBeforeLeaving: false, workedAbroad: false, appliedBefore2026: false };

describe('uk-voluntary-ni: gov.uk rules (read 2026-11-03)', () => {
  it('rates: Class 3 original for the previous 2 years, current (£18.40) for older; Class 2 original for the previous year only', () => {
    expect(weeklyRate(3, 2025)).toBe(17.75);
    expect(weeklyRate(3, 2024)).toBe(17.45);
    expect(weeklyRate(3, 2023)).toBe(18.4);
    expect(weeklyRate(3, 2026)).toBe(18.4);
    expect(weeklyRate(2, 2025)).toBe(3.5);
    expect(weeklyRate(2, 2024)).toBe(3.65);
  });
  it('deadline: 5 April 2032 for 2025–26 (gov.uk example); 2020–21 is the earliest, due 5 April 2027', () => {
    expect(deadlineFor(2025)).toBe('5 April 2032');
    expect(EARLIEST).toBe(2020);
    expect(deadlineFor(2020)).toBe('5 April 2027');
    expect(assessYear(2019, base).payable).toBe(false);
  });
  it('full new State Pension £241.30 at 35 years; nothing under 10', () => {
    expect(pensionFor(35)).toBe(241.3);
    expect(pensionFor(40)).toBe(241.3);
    expect(pensionFor(9)).toBe(0);
    expect(pensionFor(10)).toBeCloseTo(68.94, 2);
  });
  it('abroad before 2026–27: Class 2 when you worked before leaving and abroad; 3-year test', () => {
    expect(assessYear(2024, { ...base, workedBeforeLeaving: true, workedAbroad: true }).cls).toBe(2);
    expect(assessYear(2024, base).cls).toBe(3);
    expect(assessYear(2024, { ...base, ukResidenceYears: 2, ukContributionYears: 2 }).payable).toBe(false);
  });
  it('from 2026–27: Class 3 only, 10-year test, unless protected by an application before 6 April 2026', () => {
    const five = { ...base, ukResidenceYears: 5, ukContributionYears: 5, workedBeforeLeaving: true, workedAbroad: true };
    expect(assessYear(2026, five).payable).toBe(false);
    expect(assessYear(2026, { ...five, appliedBefore2026: true }).cls).toBe(3);
    expect(assessYear(2026, base).cls).toBe(3);
  });
  it('one Class 3 year adds 1/35 of £241.30 (≈£6.89 a week, ≈£358 a year) and pays back in under 3 years', () => {
    const r = computeNi({ ...base, gapYears: [2025] });
    expect(r.totalCost).toBe(923); // 17.75 × 52
    expect(r.gainWeekly).toBeCloseTo(6.89, 2);
    expect(r.gainYearly).toBeCloseTo(358.28, 1);
    expect(r.paybackYears).toBeLessThan(3);
  });
  it('a Class 2 year pays back in about 6 months', () => {
    const r = computeNi({ ...base, gapYears: [2025], workedBeforeLeaving: true, workedAbroad: true });
    expect(r.totalCost).toBe(182);
    expect(r.paybackYears).toBeLessThan(0.6);
  });
  it('buys only the years needed to reach 35, cheapest first', () => {
    const r = computeNi({ ...base, qualifyingYears: 33, gapYears: [2020, 2023, 2024, 2025] });
    expect(r.yearsBought).toBe(2);
    expect(r.pensionAfter).toBe(241.3);
    expect(r.years.filter((y) => y.payable).map((y) => y.year).sort()).toEqual([2024, 2025]);
  });
  it('reaching the 10-year minimum unlocks the whole pension', () => {
    const r = computeNi({ ...base, qualifyingYears: 8, gapYears: [2024, 2025] });
    expect(r.pensionBefore).toBe(0);
    expect(r.pensionAfter).toBeCloseTo(68.94, 2);
    expect(r.note).toContain('unlock');
  });
});

describe('uk-voluntary-ni: SI 2026/294 transitional rule and 2027–28 (facts re-checked 2026-11-12)', () => {
  const five = { ...base, ukResidenceYears: 5, ukContributionYears: 5, appliedBefore2026: true };
  it('former Class 3 payers need no new application; former Class 2 payers must apply for 2026–27 Class 3 by 5 April 2027', () => {
    expect(assessYear(2026, { ...five, previousClass: 3 }).reason).toContain('no new application');
    expect(assessYear(2026, { ...five, previousClass: 2 }).reason).toContain('apply for 2026–27 Class 3 by 5 April 2027');
  });
  it('the 10-year test counts UK-paid contributions only: 12 qualifying years with 6 paid is not enough', () => {
    const r = assessYear(2026, { ...base, ukResidenceYears: 4, ukContributionYears: 12, contributionYearsFor10: 6 });
    expect(r.payable).toBe(false);
  });
  it('2027–28 rates: Class 3 £19.05, Class 2 £3.80; 2026–27 Class 3 stays £18.40 inside the 2-year window', () => {
    expect(weeklyRate(3, 2026, 2027)).toBe(18.4);
    expect(weeklyRate(3, 2024, 2027)).toBe(19.05);
    expect(weeklyRate(2, 2025, 2027)).toBe(3.8);
  });
  it('waiting past 5 April 2027 loses 2020–21 and costs more for the rest', () => {
    const r = computeNi({ ...base, gapYears: [2020, 2023, 2025] });
    expect(r.waitAfterApril2027.lostYears).toEqual([2020]);
    expect(r.waitAfterApril2027.extraCost).toBeGreaterThan(0);
  });
  it('a transitional-only 2026–27 year is lost after 5 April 2027', () => {
    const r = computeNi({ ...five, previousClass: 3, gapYears: [2026] });
    expect(r.waitAfterApril2027.lostYears).toEqual([2026]);
  });
  it('where you live: frozen in Canada, Australia and New Zealand; Australia keeps about half above the free area; NZ keeps voluntary years in full', () => {
    const r = computeNi({ ...base, gapYears: [2025] });
    expect(whereYouLive(r, 'ie').uprated).toBe(true);
    expect(whereYouLive(r, 'ca').uprated).toBe(false);
    expect(whereYouLive(r, 'au').keepShare).toBe(0.5);
    expect(whereYouLive(r, 'au', { auAboveFreeArea: false }).keepShare).toBe(1);
    expect(whereYouLive(r, 'nz').keepShare).toBe(1);
    expect(whereYouLive(r, 'nz').uprated).toBe(false);
  });
});
