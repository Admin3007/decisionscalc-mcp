/**
 * United Kingdom rule pack for the retirement engine (./engine.ts). Plan years are tax years: 2027 = 6 April 2027 to
 * 5 April 2028. Every figure was read on the official page named next to it on 9 November 2026 (after the Budget of
 * 28 October 2026). Inputs are in today's money; amounts rise with inflation.
 *
 * Modelled: income tax for England, Wales and Northern Ireland or Scotland (personal allowance tapered above
 * £100,000), thresholds frozen to 2030-31 by Finance Act 2026 s.10 and raised with inflation after that when the plan
 * says so; employee National Insurance on pay until State Pension age; the new State Pension from your State Pension
 * age by date of birth (66 and some months for April 1960 to March 1961, 67, 67 and some months for April 1977 to
 * March 1978, then 68); pension pots from the normal minimum pension age (55, 57 from 6 April 2028), 25% tax-free
 * up to the Lump Sum Allowance (£268,275 over your lifetime), the rest drawn as taxable income with no minimum.
 *
 * Not modelled (said on the page and the Rules tab): Marriage Allowance (up to £252 a year), the Pension Tax Allowance
 * announced in Budget 2026 (up to £94 a year, not yet law), protected pension ages, tax on savings and dividends (enter
 * growth after tax), the annual allowance and money purchase annual allowance (warnings only), Pension Credit,
 * inheritance tax on pensions left at death (from 6 April 2027), and State Pension deferral.
 */
import type { PersonInput, PlanInput, RulePack, Source, TaxPerson, TaxYear } from './types';

const READ = '2026-11-09';
const U = {
  sp: 'https://www.gov.uk/new-state-pension/what-youll-get',
  spElig: 'https://www.gov.uk/new-state-pension/eligibility',
  gad: 'https://www.gov.uk/government/publications/budget-2026-a-gad-technical-bulletin/budget-2026-a-gad-technical-bulletin',
  spa: 'https://www.gov.uk/government/publications/state-pension-age-timetable/state-pension-age-timetable',
  it: 'https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past',
  freeze: 'https://www.legislation.gov.uk/ukpga/2026/11/section/10',
  scot: 'https://www.gov.uk/scottish-income-tax',
  ni: 'https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027',
  niSpa: 'https://www.gov.uk/national-insurance/what-national-insurance-is',
  pens: 'https://www.gov.uk/government/publications/rates-and-allowances-pension-schemes/pension-schemes-rates',
  taxFree: 'https://www.gov.uk/tax-on-pension/tax-free',
  nmpa: 'https://www.legislation.gov.uk/ukpga/2022/3/section/10',
  iht: 'https://www.legislation.gov.uk/ukpga/2026/11/part/2/crossheading/pension-interests',
  pta: 'https://www.gov.uk/government/publications/pension-tax-allowance-explainer/pension-tax-allowance-explainer',
  ma: 'https://www.gov.uk/marriage-allowance',
  abroad: 'https://www.gov.uk/government/publications/state-pensions-annual-increases-if-you-live-abroad/countries-where-we-pay-an-annual-increase-in-the-state-pension',
  pensionTax: 'https://www.gov.uk/tax-on-pension/how-your-tax-is-paid',
} as const;
export const GB_URLS = U;

/** Income tax 2026-27, unchanged for 2027-28 to 2030-31 (Finance Act 2026 s.10). Bands are on taxable income (after the allowance). */
export const GB_TAX = {
  allowance: 12570, taperFrom: 100000, basic: 37700, additional: 125140, rates: [0.2, 0.4, 0.45] as const,
  /** Scotland 2026-27 on taxable income: 19% to £3,967, 20% to £16,956, 21% to £31,092, 42% to £62,430, 45% to £125,140, 48% above. */
  scotBands: [3967, 16956, 31092, 62430, 125140] as const, scotRates: [0.19, 0.2, 0.21, 0.42, 0.45, 0.48] as const,
  /** Thresholds are frozen until the end of this tax year (2030-31), then rise with inflation if the plan says so. */
  frozenTo: 2030,
} as const;
/** Employee Class 1 NI 2026-27 (also frozen to 2030-31): 8% from the primary threshold to the upper earnings limit, 2% above; none from State Pension age. */
export const GB_NI = { pt: 12570, uel: 50270, main: 0.08, upper: 0.02 } as const;
/** Pensions: 25% tax-free up to the Lump Sum Allowance; normal minimum pension age 55, 57 from 6 April 2028 (tax year 2028-29). */
export const GB_PENSION = { maxLumpPct: 0.25, lsa: 268275, lsdba: 1073100, annualAllowance: 60000, mpaa: 10000, nmpa: 55, nmpaLater: 57, nmpaFrom: 2028 } as const;
/** New State Pension: £241.30 a week in 2026-27; £13,036.40 a year (£250.70 a week) from April 2027 (Budget 2026, +3.9%). 35 years full, 10 minimum. */
export const GB_SP = { full2026: 241.3, full2027: 250.7, fullYears: 35, minYears: 10 } as const;

/** State Pension age (years, with months as a fraction) from year and month (1-12) of birth. Month precision only: the law's boundaries fall on the 6th. */
export function gbStatePensionAge(birthYear: number, birthMonth = 6): number {
  const k = (birthYear - 1960) * 12 + (birthMonth - 4); // months from April 1960
  if (k < 0) return 66;
  if (k < 11) return 66 + (k + 1) / 12; // born April 1960 (+1 month) to February 1961 (+11 months)
  const j = (birthYear - 1977) * 12 + (birthMonth - 4); // months from April 1977
  if (j < 0) return 67;
  if (j < 12) return 67 + (j + 1) / 12; // born April 1977 (67 and 1 month) to March 1978 (68)
  return 68;
}

/** Weekly new State Pension from qualifying years (none under 10; 1/35 a year up to the full rate). 2027-28 rate by default. */
export function gbWeeklyFromYears(years: number, full: number = GB_SP.full2027): number {
  const y = Math.max(0, Math.floor(years || 0));
  return y < GB_SP.minYears ? 0 : (Math.min(y, GB_SP.fullYears) / GB_SP.fullYears) * full;
}

/** Index for thresholds: 1 until 2030-31, then inflation each year (when the plan raises bands with inflation). */
export function gbIndex(year: number, inf: number, indexTax: boolean): number {
  return indexTax ? Math.pow(1 + inf, Math.max(0, year - GB_TAX.frozenTo)) : 1;
}

/** Income tax on one person's income (pay after pension contributions, pensions, drawdown) in a year. The £100,000 taper point and £125,140 are fixed in law. */
export function gbIncomeTax(income: number, scotland: boolean, k = 1): number {
  if (income <= 0) return 0;
  const pa = Math.max(0, GB_TAX.allowance * k - Math.max(0, income - GB_TAX.taperFrom) / 2);
  const ti = Math.max(0, income - pa);
  if (scotland) {
    const b = GB_TAX.scotBands.map((x, i) => (i === 4 ? x : x * k));
    const r = GB_TAX.scotRates;
    let tax = 0, lo = 0;
    for (let i = 0; i < 5; i++) { tax += r[i] * Math.max(0, Math.min(ti, b[i]) - lo); lo = b[i]; }
    return tax + r[5] * Math.max(0, ti - b[4]);
  }
  const basic = GB_TAX.basic * k;
  return 0.2 * Math.min(ti, basic) + 0.4 * Math.max(0, Math.min(ti, GB_TAX.additional) - basic) + 0.45 * Math.max(0, ti - GB_TAX.additional);
}

/** Employee NI on a year's pay. */
export function gbNI(salary: number, k = 1): number {
  const pt = GB_NI.pt * k, uel = GB_NI.uel * k;
  return GB_NI.main * Math.max(0, Math.min(salary, uel) - pt) + GB_NI.upper * Math.max(0, salary - uel);
}

export const GB_SOURCES: Source[] = [
  { what: 'Full new State Pension £241.30 a week (2026-27); 35 qualifying years for the full amount (more if you were contracted out)', url: U.sp, read: READ },
  { what: '10 qualifying years needed for any new State Pension', url: U.spElig, read: READ },
  { what: 'Budget 2026 (28 October 2026): the full new State Pension rises 3.9% to £13,036.40 a year (£250.70 a week) from April 2027; triple lock kept', url: U.gad, read: READ },
  { what: 'State Pension age: 66 if born before 6 April 1960; 66 and 1 to 11 months for 6 April 1960 to 5 March 1961; 67 to 5 April 1977; 6 May 2044 to 6 March 2046 for 6 April 1977 to 5 April 1978; 68 after', url: U.spa, read: READ },
  { what: 'Income tax 2026-27: personal allowance £12,570, reduced by £1 for every £2 over £100,000; 20% to £37,700 of taxable income, 40% to £125,140, 45% above', url: U.it, read: READ },
  { what: 'Finance Act 2026 s.10: the £12,570 allowance and £37,700 basic rate limit stay the same for 2027-28 to 2030-31', url: U.freeze, read: READ },
  { what: 'Scottish income tax 2026-27: 19% £12,571-£16,537, 20% to £29,526, 21% to £43,662, 42% to £75,000, 45% to £125,140, 48% above (income including the allowance)', url: U.scot, read: READ },
  { what: 'Employee Class 1 NI 2026-27: 8% from £12,570 to £50,270 a year, 2% above (thresholds stay the same to 2030-31)', url: U.ni, read: READ },
  { what: 'You stop paying Class 1 National Insurance when you reach State Pension age', url: U.niSpa, read: READ },
  { what: 'Lump Sum Allowance £268,275; lump sum and death benefit allowance £1,073,100; annual allowance £60,000; money purchase annual allowance £10,000', url: U.pens, read: READ },
  { what: 'You can usually take up to 25% of a pension pot tax-free, at most £268,275 in total; the rest is taxed as income', url: U.taxFree, read: READ },
  { what: 'Normal minimum pension age rises from 55 to 57 on 6 April 2028 (Finance Act 2022 s.10; uniformed services schemes and protected pension ages excepted)', url: U.nmpa, read: READ },
  { what: 'Unused pension funds count for inheritance tax for deaths on or after 6 April 2027 (Finance Act 2026 Part 2)', url: U.iht, read: READ },
  { what: 'Pension Tax Allowance (Budget 2026, from 2027-28, not yet law): up to £94 a year for people over State Pension age; not included', url: U.pta, read: READ },
  { what: 'Marriage Allowance: transfer £1,260 of allowance to a basic-rate spouse, saving up to £252 a year; not included', url: U.ma, read: READ },
  { what: 'Pension withdrawals are taxed as income through PAYE', url: U.pensionTax, read: READ },
  { what: 'The State Pension rises each year if you live in the EEA (including Ireland), Switzerland or the USA, but is frozen in Canada, Australia and most other countries', url: U.abroad, read: READ },
];

const scot = (t: TaxYear) => t.local?.region === 'scotland';

export const gb: RulePack = {
  id: 'gb',
  country: 'United Kingdom',
  currency: 'GBP',
  locale: 'en-GB',
  baseYear: 2027,
  endAge: 95,
  statePensionAge: 67,
  maxLumpPct: GB_PENSION.maxLumpPct,
  reliefPct: () => 1,
  reliefCap: 1e12,
  lumpTax: () => 0,
  lumpCap: GB_PENSION.lsa,
  minDrawdownRate: () => 0,
  canDraw: (age, year) => age >= (year >= GB_PENSION.nmpaFrom ? GB_PENSION.nmpaLater : GB_PENSION.nmpa),
  statePensionAgeFor: (birthYear) => gbStatePensionAge(birthYear),
  close: 0.3,
  payContribution(year, age, salary, _on, reachedSpa, ctx) {
    if (reachedSpa || salary <= 0) return 0;
    return gbNI(salary, ctx ? gbIndex(year, ctx.inf, ctx.indexTax) : 1);
  },
  tax(t: TaxYear, x1: number, x2: number) {
    const k = gbIndex(t.year, t.inf ?? 0, t.indexTax !== false);
    const s = scot(t);
    const one = (p: TaxPerson, x: number) => (p.exists ? gbIncomeTax(p.salary - p.relieved + p.db + p.sp + p.uk + p.draw + x, s, k) : 0);
    return { incomeTax: one(t.people[0], x1) + one(t.people[1], x2), usc: 0 };
  },
  ukPension: { indexed: true, earnsCredit: false, secondCharge: false, gbpPerEur: 1, fullWeekly: GB_SP.full2026, fullYears: GB_SP.fullYears, age: (y) => Math.ceil(gbStatePensionAge(y)) },
  fundThreshold: () => Infinity,
  sources: GB_SOURCES,
};

/** A 55-year-old asking "can I retire at 60 with £300k?" (the shape of every UK search). */
export const GB_DEFAULT: PlanInput = {
  household: 'single',
  people: [{
    age: 55, retireAge: 60, salary: 50000, contribPct: 6, employerPct: 4, pensionPot: 300000, arf: 0, lumpPct: 25,
    dbPension: 0, dbFromAge: 60, dbIndex: 0, dbLumpSum: 0, statePensionWeekly: GB_SP.full2027, statePensionAge: gbStatePensionAge(1972),
  }],
  savings: 40000, savingsAdd: 3000, spending: 28000,
  growth: 4.5, savingsGrowth: 2.5, inflation: 2, payGrowth: 2.5, indexTax: true,
  local: { region: 'rUK' },
};
export const GB_PARTNER: PersonInput = {
  age: 55, retireAge: 60, salary: 30000, contribPct: 5, employerPct: 3, pensionPot: 80000, arf: 0, lumpPct: 25,
  dbPension: 0, dbFromAge: 60, dbIndex: 0, dbLumpSum: 0, statePensionWeekly: GB_SP.full2027, statePensionAge: gbStatePensionAge(1972),
};
