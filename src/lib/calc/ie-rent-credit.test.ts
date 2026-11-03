import { describe, it, expect } from 'vitest';
import { CAPS, deadlineFor, creditFor, rentCredits } from './ie-rent-credit';

describe('Rent Tax Credit (revenue.ie, read 2026-11-03)', () => {
  it('pins the official caps by year', () => {
    expect(CAPS[2022]).toEqual({ single: 500, couple: 1000 });
    expect(CAPS[2023]).toEqual({ single: 500, couple: 1000 });
    expect(CAPS[2024]).toEqual({ single: 1000, couple: 2000 });
    expect(CAPS[2026]).toEqual({ single: 1000, couple: 2000 });
    expect(CAPS[2027]).toEqual({ single: 1150, couple: 2300 });
  });

  it("reproduces Revenue's example: Jane, €18,000 rent in 2025, single → €1,000", () => {
    expect(creditFor({ year: 2025, rent: 18000, incomeTax: 16500 }, false)).toBe(1000);
  });

  it('is 20% of rent when that is lower, and never more than the income tax due', () => {
    expect(creditFor({ year: 2025, rent: 3000 }, false)).toBe(600);
    expect(creditFor({ year: 2025, rent: 18000, incomeTax: 400 }, false)).toBe(400);
  });

  it('four-year rule: 2022 must be claimed by 31 December 2026 (Revenue)', () => {
    expect(deadlineFor(2022)).toBe('31 December 2026');
  });

  it('a single renter since 2022 who never claimed is owed €3,000 for 2022–2025, €4,000 including 2026', () => {
    const years = [2022, 2023, 2024, 2025, 2026].map((year) => ({ year, rent: 14400 }));
    const r = rentCredits(years, false);
    expect(r.owedPastYears).toBe(3000);
    expect(r.total).toBe(4000);
  });

  it('years already claimed are not counted again', () => {
    const years = [2022, 2023, 2024, 2025].map((year) => ({ year, rent: 14400 }));
    expect(rentCredits(years, true, { 2024: true, 2025: true }).owedPastYears).toBe(2000);
  });
});
