/**
 * Ireland: maternity, paternity and parent's leave pay, and the household income gap.
 * Official figures (read 2026-11-03):
 *  - citizensinformation.ie Maternity / Paternity / Parent's Benefit: standard rate €299 a week (2026),
 *    +€10 from January 2027 (Budget 2027); Maternity Benefit 26 weeks, Paternity Benefit 2 weeks,
 *    Parent's Benefit 9 weeks per parent (children born from 1 Aug 2024), within the child's first 2 years;
 *    up to 16 further weeks of unpaid maternity leave.
 *  - Revenue (Taxation of maternity, adoptive and health and safety benefits): the benefits are liable to
 *    income tax but not to USC or PRSI.
 * Simplifications (stated on the page): each parent taxed individually; the whole leave falls in one tax
 * year; employer top-up = full salary for the topped-up weeks; dependant increases (Illness Benefit
 * comparison) not modelled.
 */
import { RULES, uscFor, prsiFor, type Year } from './ie-budget-2027';

export const BENEFIT_WEEKLY: Record<Year, number> = { 2026: 299, 2027: 309 };
export const MATERNITY_WEEKS = 26;
export const MATERNITY_UNPAID_MAX = 16;
export const PATERNITY_WEEKS = 2;
export const PARENTS_WEEKS = 9;

export interface ParentInput {
  salary: number;        // gross a year
  benefitWeeks: number;  // weeks on a State benefit (26 maternity, 2 paternity, + 9 parent's if taken)
  unpaidWeeks: number;   // unpaid leave weeks (no pay, no benefit)
  topUpWeeks: number;    // weeks the employer pays full salary (and keeps the benefit)
}

export interface ParentResult {
  normalTakeHome: number;
  leaveYearTakeHome: number;
  gap: number;            // how much less this parent has in the leave year
  benefitTotal: number;   // State benefit paid to the parent
  weeklyBenefit: number;
  weeklyNormalNet: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Income tax for one person on PAYE wages plus taxable benefit, single assessment. */
function incomeTax(wages: number, benefit: number, year: Year): number {
  const R = RULES[year];
  const total = wages + benefit;
  const band = R.band.single;
  const gross = Math.min(total, band) * 0.2 + Math.max(0, total - band) * 0.4;
  const credits = R.personal + Math.min(R.employee, total * 0.2);
  return Math.max(0, gross - credits);
}

function takeHome(wages: number, benefit: number, year: Year): number {
  return wages + benefit - incomeTax(wages, benefit, year) - uscFor(wages, year) - prsiFor(wages, year);
}

export function parentLeave(p: ParentInput, year: Year): ParentResult {
  const salary = n(p.salary);
  const benefitWeeks = Math.min(52, Math.floor(n(p.benefitWeeks)));
  const unpaidWeeks = Math.min(52 - benefitWeeks, Math.floor(n(p.unpaidWeeks)));
  const topUpWeeks = Math.min(benefitWeeks, Math.floor(n(p.topUpWeeks)));
  const weekly = salary / 52;
  const workedWeeks = 52 - benefitWeeks - unpaidWeeks;
  const wages = weekly * (workedWeeks + topUpWeeks);
  const benefit = BENEFIT_WEEKLY[year] * (benefitWeeks - topUpWeeks);
  const normal = takeHome(salary, 0, year);
  const leaveYear = takeHome(wages, benefit, year);
  return {
    normalTakeHome: r2(normal),
    leaveYearTakeHome: r2(leaveYear),
    gap: r2(normal - leaveYear),
    benefitTotal: r2(benefit),
    weeklyBenefit: BENEFIT_WEEKLY[year],
    weeklyNormalNet: r2(normal / 52),
  };
}

export interface HouseholdInput {
  year: Year;
  mother: { salary: number; unpaidWeeks: number; topUpWeeks: number; parents: boolean };
  partner?: { salary: number; topUpWeeks: number; parents: boolean } | null;
}

export function householdLeave(h: HouseholdInput) {
  const year: Year = h.year === 2027 ? 2027 : 2026;
  const mother = parentLeave({
    salary: h.mother.salary,
    benefitWeeks: MATERNITY_WEEKS + (h.mother.parents ? PARENTS_WEEKS : 0),
    unpaidWeeks: Math.min(MATERNITY_UNPAID_MAX, n(h.mother.unpaidWeeks)),
    topUpWeeks: h.mother.topUpWeeks,
  }, year);
  const partner = h.partner ? parentLeave({
    salary: h.partner.salary,
    benefitWeeks: PATERNITY_WEEKS + (h.partner.parents ? PARENTS_WEEKS : 0),
    unpaidWeeks: 0,
    topUpWeeks: h.partner.topUpWeeks,
  }, year) : null;
  const gap = r2(mother.gap + (partner ? partner.gap : 0));
  return { year, mother, partner, gap, monthlySaving: r2(gap / 12) };
}
