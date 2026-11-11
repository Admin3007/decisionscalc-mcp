/**
 * US federal income tax for tax year 2026 (filed in 2027): ordinary rate tables, standard deduction and payroll
 * (FICA) rates, for calculators that need a household's federal tax.
 *
 * Rate tables: Rev. Proc. 2025-32, section 4.01, Tables 1-3 (read 9 Nov 2026,
 * https://www.irs.gov/pub/irs-drop/rp-25-32.pdf). Standard deduction 2026: $32,200 joint, $24,150 head of household,
 * $16,100 single (Rev. Proc. 2025-32 section 4.14; IRS "Working Families Tax Cuts" page, read 9 Nov 2026).
 * Social Security wage base 2026: $184,500 (ssa.gov/oact/cola/cbb.html). Additional Medicare Tax 0.9% on wages above
 * $200,000 ($250,000 joint) is withheld by the employer above $200,000 of one person's wages (IRC 3101(b)(2), 3102(f)).
 * Ordinary income only: no capital gains rates, AMT or credits.
 */

export type FilingStatus = 'single' | 'mfj' | 'hoh';

export const FED_TAX_YEAR = 2026;
export const FED_SOURCES = {
  rates: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf',
  standard: 'https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers',
  wageBase: 'https://www.ssa.gov/oact/cola/cbb.html',
};

/** Upper limits of each bracket (the last is open) and the rates, 2026. */
export const BRACKETS_2026: Record<FilingStatus, { limits: number[]; rates: number[] }> = {
  mfj: { limits: [24800, 100800, 211400, 403550, 512450, 768700], rates: [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37] },
  hoh: { limits: [17700, 67450, 105700, 201750, 256200, 640600], rates: [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37] },
  single: { limits: [12400, 50400, 105700, 201775, 256225, 640600], rates: [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37] },
};

export const STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = { mfj: 32200, hoh: 24150, single: 16100 };

export const SS_WAGE_BASE_2026 = 184500;
export const SS_RATE = 0.062;
export const MEDICARE_RATE = 0.0145;
export const ADDL_MEDICARE_RATE = 0.009;
export const ADDL_MEDICARE_WITHHOLD_FROM = 200000;

/** Federal income tax on taxable income (after deductions), 2026 tables. */
export function federalIncomeTax(taxable: number, status: FilingStatus): number {
  const { limits, rates } = BRACKETS_2026[status];
  let tax = 0, lower = 0;
  const t = Math.max(0, taxable);
  for (let i = 0; i < rates.length; i++) {
    const upper = i < limits.length ? limits[i] : Infinity;
    if (t <= lower) break;
    tax += (Math.min(t, upper) - lower) * rates[i];
    lower = upper;
  }
  return tax;
}

/** Tax on adjusted gross income with the standard deduction. */
export function federalTaxOnAgi(agi: number, status: FilingStatus): number {
  return federalIncomeTax(agi - STANDARD_DEDUCTION_2026[status], status);
}

/** Marginal federal rate at this AGI (standard deduction), 0 below the deduction. */
export function marginalRate(agi: number, status: FilingStatus): number {
  const t = agi - STANDARD_DEDUCTION_2026[status];
  if (t <= 0) return 0;
  const { limits, rates } = BRACKETS_2026[status];
  for (let i = 0; i < limits.length; i++) if (t <= limits[i]) return rates[i];
  return rates[rates.length - 1];
}

/**
 * Employee payroll tax (FICA) saved when `cut` dollars come off one person's wages before tax:
 * 6.2% Social Security below the wage base, 1.45% Medicare, and 0.9% Additional Medicare above $200,000 withheld.
 */
export function ficaSaved(wages: number, cut: number): number {
  const w = Math.max(0, wages), c = Math.max(0, Math.min(cut, w));
  const band = (lo: number, hi: number) => Math.max(0, Math.min(w, hi) - Math.max(w - c, lo));
  return band(0, SS_WAGE_BASE_2026) * SS_RATE + c * MEDICARE_RATE + band(ADDL_MEDICARE_WITHHOLD_FROM, Infinity) * ADDL_MEDICARE_RATE;
}
