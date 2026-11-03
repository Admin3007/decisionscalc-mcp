/**
 * Irish income tax for an employee (and spouse) with optional non-PAYE income, on the 2026 or Budget 2027
 * bands and credits in ./ie-budget-2027.ts. Shared by the landlord and pension relief calculators.
 */
import { RULES, type Year } from './ie-budget-2027';

export type TaxStatus = 'single' | 'single-parent' | 'married-one' | 'married-two';

/** Income tax (after personal, employee and single person child carer credits) on PAYE pay plus other income. */
export function incomeTaxFor(year: Year, status: TaxStatus, pay: number, spousePay: number, other: number): number {
  const R = RULES[year];
  const married = status === 'married-one' || status === 'married-two';
  let band: number;
  if (status === 'married-two') band = R.band.married + Math.min(R.band.secondMax, Math.min(pay, spousePay));
  else if (married) band = R.band.married;
  else band = R.band[status];
  let credits = married ? R.personal * 2 : R.personal;
  credits += Math.min(R.employee, pay * 0.2);
  if (status === 'married-two') credits += Math.min(R.employee, spousePay * 0.2);
  if (status === 'single-parent') credits += R.spcc;
  const total = pay + (status === 'married-two' ? spousePay : 0) + other;
  const gross = Math.min(total, band) * 0.2 + Math.max(0, total - band) * 0.4;
  return Math.max(0, gross - credits);
}
