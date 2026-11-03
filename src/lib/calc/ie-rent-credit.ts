/**
 * Ireland: Rent Tax Credit, including claims for past years.
 * Official sources (revenue.ie, read 2026-11-03):
 *  - "How much can you claim?": relief at 20% of rent paid; maximum €500 (single) / €1,000 (jointly assessed
 *    couple) for 2022 and 2023; €1,000 / €2,000 for 2024 to 2028; the credit cannot exceed your income tax
 *    for the year (no relief against USC or PRSI). Example: Jane, €18,000 rent in 2025 → €1,000.
 *  - Budget 2027 (gov.ie guide): €1,150 single / €2,300 couple from 2027.
 *  - "How to claim": 2022–2025 through an Income Tax Return in myAccount; 2026 in-year for PAYE workers.
 *  - "Four year rule": "claims for 2022 must be made by 31 December 2026. Claims made after this time
 *    cannot be repaid."
 */
export const CAPS: Record<number, { single: number; couple: number }> = {
  2022: { single: 500, couple: 1000 },
  2023: { single: 500, couple: 1000 },
  2024: { single: 1000, couple: 2000 },
  2025: { single: 1000, couple: 2000 },
  2026: { single: 1000, couple: 2000 },
  2027: { single: 1150, couple: 2300 },
};
export const RATE = 0.2;
export const YEARS = [2022, 2023, 2024, 2025, 2026, 2027] as const;
/** Last day a claim for `year` can be made (four-year rule). */
export const deadlineFor = (year: number) => `31 December ${year + 4}`;

export interface YearIn { year: number; rent: number; incomeTax?: number }

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

export function creditFor(y: YearIn, couple: boolean): number {
  const cap = CAPS[y.year]?.[couple ? 'couple' : 'single'] ?? 0;
  const byRent = Math.round(n(y.rent) * RATE * 100) / 100;
  const limit = y.incomeTax === undefined ? Infinity : n(y.incomeTax);
  return Math.min(byRent, cap, limit);
}

export function rentCredits(years: YearIn[], couple: boolean, alreadyClaimed: Record<number, boolean> = {}) {
  const rows = years.filter((y) => CAPS[y.year]).map((y) => {
    const credit = creditFor(y, couple);
    const claimed = !!alreadyClaimed[y.year];
    return { year: y.year, rent: n(y.rent), cap: CAPS[y.year][couple ? 'couple' : 'single'], credit, claimed, deadline: deadlineFor(y.year) };
  });
  const owed = rows.filter((r) => !r.claimed && r.year <= 2025).reduce((s, r) => s + r.credit, 0);
  return { rows, owedPastYears: Math.round(owed * 100) / 100, total: Math.round(rows.reduce((s, r) => s + (r.claimed ? 0 : r.credit), 0) * 100) / 100 };
}
