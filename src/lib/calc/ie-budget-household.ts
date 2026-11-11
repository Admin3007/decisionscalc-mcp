/**
 * Budget 2027 for a household's welfare payments (overhaul B6), alongside the take-home pay calculator.
 * gov.ie "Your guide to Budget 2027" (6 Oct 2026, read 3 Nov 2026), as already summarised on
 * /tools/ireland-budget-2027-calculator/: core weekly social welfare rates up €10 from January 2027 (State Pension,
 * Jobseeker's, Carer's, Disability and the rest), Fuel Allowance up €5 a week (€38 → €43 from the week of
 * 4 January 2027, ./ie-fuel.ts), Living Alone Allowance up €3, Child Support Payment up €6 per child, Child Benefit
 * unchanged at €140 a month. Increases from January, so a full calendar year has 52 weeks of each; Fuel Allowance
 * is paid for 28 weeks a season, so a year of seasons has 28 weeks of the increase.
 */
export const CORE_WEEKLY_RISE = 10;
export const FUEL_WEEKLY_RISE = 5;
export const FUEL_SEASON_WEEKS = 28;
export const LIVING_ALONE_RISE = 3;
export const CSP_RISE_PER_CHILD = 6;
export const CHILD_BENEFIT_MONTHLY = 140;

export interface HouseholdInput {
  corePayments: number;      // people in the household getting a core weekly payment (State Pension, Jobseeker's…)
  fuelAllowance: boolean;
  livingAlone: boolean;
  cspChildren: number;       // children for whom a Child Support Payment is paid
  children: number;          // children for whom Child Benefit is paid
}
export interface HouseholdResult { core: number; fuel: number; livingAlone: number; csp: number; total: number; childBenefit: number; }

export function budgetHousehold(i: HouseholdInput): HouseholdResult {
  const n = (x: number) => Math.max(0, Math.floor(x || 0));
  const core = n(i.corePayments) * CORE_WEEKLY_RISE * 52;
  const fuel = i.fuelAllowance ? FUEL_WEEKLY_RISE * FUEL_SEASON_WEEKS : 0;
  const livingAlone = i.livingAlone ? LIVING_ALONE_RISE * 52 : 0;
  const csp = n(i.cspChildren) * CSP_RISE_PER_CHILD * 52;
  return { core, fuel, livingAlone, csp, total: core + fuel + livingAlone + csp, childBenefit: n(i.children) * CHILD_BENEFIT_MONTHLY * 12 };
}
