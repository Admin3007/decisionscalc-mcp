/**
 * Ireland rule pack for the retirement engine (./engine.ts). Every figure was read on the official page named
 * next to it; the dates are when we read them. Years after 2027 use the 2027 (Budget 2027) figures, with bands
 * and credits raised by inflation when the plan says so (indexTax). Lump sum limits, the €2m ARF test, the
 * age exemption limits and the USC €13,000 / €60,000 limits are fixed in law and are not indexed.
 *
 * Not modelled: Increase for a Qualified Adult, the Benefit Payment for 65 Year Olds, PRSI on rent or
 * investment income, the 11% USC on self-employed income, tax on savings growth (enter growth after tax),
 * marginal-rate excess lump sums above €500,000 are taxed at 40% + 8% USC.
 */
import type { RulePack, Source, TaxPerson, TaxYear } from './types';

const READ = '2026-11-04';
const REV_BANDS = 'https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/tax-relief-charts/index.aspx';
const CI_BUDGET27 = 'https://www.citizensinformation.ie/en/money-and-tax/budgets/budget-2027/';
const REV_EXEMPT = 'https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/marital-and-civil-status/exemption-and-marginal-relief/exemption-limits.aspx';
const REV_MARGINAL = 'https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/marital-and-civil-status/exemption-and-marginal-relief/marginal-relief.aspx';
const CI_USC = 'https://www.citizensinformation.ie/en/money-and-tax/tax/income-tax/universal-social-charge/';
const REV_USC_REDUCED = 'https://www.revenue.ie/en/jobs-and-pensions/usc/reduced-rates.aspx';
const CI_PENSION_TAX = 'https://www.citizensinformation.ie/en/money-and-tax/personal-finance/pensions/taxation-of-pensions/';
const CI_PRSI = 'https://www.citizensinformation.ie/en/social-welfare/irish-social-welfare-system/social-insurance-prsi/social-insurance/';
const GOV_PRSI_A = 'https://www.gov.ie/en/department-of-social-protection/publications/prsi-class-a-rates/';
const REV_LUMP = 'https://www.revenue.ie/en/jobs-and-pensions/pension/private/retirement-lump-sums.aspx';
const REV_ARF = 'https://www.revenue.ie/en/tax-professionals/tdm/pensions/chapter-28.pdf';
const REV_SFT = 'https://www.revenue.ie/en/jobs-and-pensions/pension/private/chargeable-excess-tax.aspx';
const REV_RELIEF = 'https://www.revenue.ie/en/jobs-and-pensions/pension/relief/tax-relief-limits.aspx';
const REV_EMPLOYEE = 'https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-15/15-01-07.pdf';
const GOV_UK_SP = 'https://www.gov.uk/new-state-pension/what-youll-get';
const GOV_UK_SPA = 'https://www.gov.uk/government/publications/state-pension-age-timetable/state-pension-age-timetable';
const GOV_UK_ABROAD = 'https://www.gov.uk/state-pension-if-you-retire-abroad/rates-of-state-pension';
const REV_DTA_UK = 'https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-35/35-01-02.pdf';
const ECB_GBP = 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-gbp.en.html';
const CI_SPC = 'https://www.citizensinformation.ie/en/social-welfare/older-and-retired-people/state-pension-contributory/';

/** Income tax and USC by year. 2026: Revenue tax relief charts (published 1 Jan 2026); 2027: Budget 2027. */
export const IE_TAX = {
  2026: { single: 44000, married: 53000, secondMax: 35000, personal: 2000, employee: 2000, ageSingle: 245, ageMarried: 490, usc: [12012, 28700, 70044] as const },
  2027: { single: 46500, married: 55500, secondMax: 37500, personal: 2125, employee: 2125, ageSingle: 245, ageMarried: 490, usc: [12012, 30300, 70044] as const },
} as const;
export type TaxTable = (typeof IE_TAX)[2026] | (typeof IE_TAX)[2027];

/** Age exemption limits (65 or over), not indexed: single €18,000, married €36,000; +€575 each for 2 children, €830 after. */
export const EXEMPT = { single: 18000, married: 36000, child: 575, childAfter2: 830 } as const;
/** Marginal relief: tax limited to 40% of income above the exemption limit, up to twice the limit. */
export const MARGINAL_RATE = 0.4;
/** USC: none at €13,000 or less; reduced rates (0.5% / 2%) at 70+ or with a full medical card on €60,000 or less (DSP payments excluded). */
export const USC = { exempt: 13000, reducedLimit: 60000, rates: [0.005, 0.02, 0.03, 0.08] as const, medicalCardUntil: 2027, reducedAge: 70 } as const;
/** Employee PRSI (Class A), PRSI roadmap (Social Welfare (Miscellaneous Provisions) Act 2024, S.I. 534/2024): 4.35% from 1 Oct 2026,
 *  4.5% from 1 Oct 2027, 4.7% from 1 Oct 2028; none on pensions; none from 66 once on the State Pension. */
export const PRSI = { free: 352, rate2027: 0.0435 * 0.75 + 0.045 * 0.25, rate2028: 0.045 * 0.75 + 0.047 * 0.25, rateFrom2029: 0.047, onPensionFrom: 66, until: 70 } as const;
/** Retirement lump sums: €200,000 lifetime tax-free; €200,001-€500,000 at 20%; above €500,000 at 40% + USC. */
export const LUMP = { free: 200000, standardTop: 500000, standardRate: 0.2, higherRate: 0.48, maxPct: 0.25 } as const;
/** ARF / vested PRSA imputed distribution: 4% when 60 or over for the whole year, 5% when 70 or over, 6% when the fund is over €2m. */
export const ARF = { from: 61, at70: 71, rate: 0.04, rate70: 0.05, large: 2000000, rateLarge: 0.06 } as const;
/** Standard Fund Threshold by year (warning only). */
export const SFT: Record<number, number> = { 2025: 2000000, 2026: 2200000, 2027: 2400000, 2028: 2600000, 2029: 2800000 };
/** Age-related limits on relief for own contributions, earnings up to €115,000. */
export const RELIEF: [number, number][] = [[30, 0.15], [40, 0.2], [50, 0.25], [55, 0.3], [60, 0.35], [Infinity, 0.4]];
export const RELIEF_CAP = 115000;
/** State Pension (Contributory) maximum a week at 66: €299.30 in 2026, +€10 from January 2027. Paid from 66. */
export const STATE_PENSION = { age: 66, max2026: 299.3, max2027: 309.3 } as const;

/**
 * UK State Pension for Irish residents with UK years: full new State Pension £241.30 a week (2026-27), 35 qualifying years
 * for the full rate (1/35 a year); UK State Pension age 66 if born before 6 April 1960, 66 and 1-11 months for 6 April 1960
 * to 5 March 1961, 67 to 5 April 1977, then 68 (in whole years: born 1960 -> paid from 67); increased each year while you
 * live in the EEA (Ireland); taxable in Ireland (relief from UK tax under the Ireland-UK DTA), earns the Employee Tax
 * Credit (TDM 15-01-07 §3.2), no USC (social welfare payments from abroad are exempt). £ to € at the ECB reference rate.
 */
export const UK_PENSION = { fullWeekly: 241.3, fullYears: 35, gbpPerEur: 0.8346, rateDate: '2026-11-04' } as const;
/** Weekly UK State Pension from qualifying years: 1/35 of the full rate a year, none under the usual 10-year minimum. */
export function ukWeeklyFromYears(years: number): number {
  const y = Math.max(0, Math.floor(years || 0));
  return y < 10 ? 0 : (Math.min(y, UK_PENSION.fullYears) / UK_PENSION.fullYears) * UK_PENSION.fullWeekly;
}

export function ukPensionAge(birthYear: number): number {
  return birthYear <= 1959 ? 66 : birthYear <= 1976 ? 67 : 68;
}

export const IE_SOURCES: Source[] = [
  { what: 'Income tax bands and credits for 2026: €44,000 single band, €53,000 married (one income) +€35,000 for a second income; personal €2,000, employee €2,000, age credit €245 single / €490 married', url: REV_BANDS, read: READ },
  { what: 'Budget 2027: bands +€2,500 (single €46,500), personal and employee credits €2,125, USC 2% band to €30,300; social welfare pensions +€10 a week from January 2027', url: CI_BUDGET27, read: READ },
  { what: 'Age exemption limits (65 or over): €18,000 single, €36,000 married or civil partners; €575 per child for the first two, €830 after', url: REV_EXEMPT, read: READ },
  { what: 'Marginal relief: tax limited to 40% of income above the exemption limit while income is under twice the limit; no credits then (Revenue’s example: Jim, €38,000, tax €340 not €1,110)', url: REV_MARGINAL, read: READ },
  { what: 'USC 2026: 0.5% to €12,012, 2% to €28,700, 3% to €70,044, 8% above; none at €13,000 or less; State Pension and all DSP payments exempt; on lump sums only above €500,000', url: CI_USC, read: READ },
  { what: 'Reduced USC (0.5% to €12,012, 2% above) at 70 or over, or with a full medical card, on income of €60,000 or less; the medical card rate is legislated to 31 December 2027', url: REV_USC_REDUCED, read: READ },
  { what: 'No PRSI on occupational or social welfare pensions; occupational pensions pay USC; State Pension pays income tax only', url: CI_PENSION_TAX, read: READ },
  { what: 'PRSI age limit 70 since 2024, but none for people 66-70 who draw the State Pension (Contributory) (Class M)', url: CI_PRSI, read: READ },
  { what: 'Employee PRSI Class A: 4.2% to 30 Sep 2026, 4.35% from 1 Oct 2026 (4.5% from 1 Oct 2027 and 4.7% from 1 Oct 2028 under the PRSI roadmap, held after that)', url: GOV_PRSI_A, read: READ },
  { what: 'Retirement lump sums: €200,000 lifetime tax-free from all sources, €200,001-€500,000 at 20%, above €500,000 at 40%; 25% of a personal pension fund', url: REV_LUMP, read: READ },
  { what: 'ARF and vested PRSA imputed distribution (s790D TCA): 4% when 60 or over for the whole year, 5% when 70 or over for the whole year, 6% of the whole fund when over €2m; less actual distributions (Pensions Manual ch. 28, updated 22 May 2026)', url: REV_ARF, read: READ },
  { what: 'Standard Fund Threshold: €2.2m (2026), €2.4m (2027), €2.6m (2028), €2.8m (2029)', url: REV_SFT, read: READ },
  { what: 'Relief on own pension contributions: 15% of earnings under 30 rising to 40% at 60 or over, earnings up to €115,000', url: REV_RELIEF, read: '2026-11-03' },
  { what: 'An Irish social welfare pension qualifies for the Employee Tax Credit (TDM 15-01-07 §3.1); ARF drawdowns are not on Revenue’s list, so we give them none', url: REV_EMPLOYEE, read: READ },
  { what: 'UK State Pension (for UK years): full new State Pension £241.30 a week, 35 qualifying years for the full rate', url: GOV_UK_SP, read: READ },
  { what: 'UK State Pension age: 66 if born before 6 April 1960, 66 and 1 to 11 months to 5 March 1961, 67 to 5 April 1977, then 68', url: GOV_UK_SPA, read: READ },
  { what: 'UK State Pension rises each year if you live in the EEA (Ireland), Switzerland or Gibraltar; frozen in most other countries (e.g. Canada)', url: GOV_UK_ABROAD, read: READ },
  { what: 'Irish residents claim relief from UK tax on the UK State Pension (Ireland-UK double taxation agreement), so it is taxed in Ireland; it earns the Employee Tax Credit (TDM 15-01-07 §3.2) and pays no USC (social welfare from abroad is exempt)', url: REV_DTA_UK, read: READ },
  { what: 'Pounds to euro: ECB reference rate €1 = £0.83460 on 4 November 2026 (an input you can change)', url: ECB_GBP, read: READ },
  { what: 'State Pension (Contributory) 2026: €299.30 a week at 66 (€313.40 at 67, €328.90 at 68); +€10 from January 2027; from age 66, deferral to 70 possible', url: CI_SPC, read: READ },
];

const table = (year: number): TaxTable => (year <= 2026 ? IE_TAX[2026] : IE_TAX[2027]);

export function reliefPct(age: number): number {
  return RELIEF.find(([below]) => age < below)![1];
}

/** USC on one person's income (DSP payments already left out). */
export function uscFor(income: number, year: number, idx: number, reduced: boolean): number {
  if (income <= USC.exempt) return 0;
  const [c1, c2, c3] = table(year).usc.map((c) => c * idx);
  const [r1, r2, r3, r4] = USC.rates;
  if (reduced && income <= USC.reducedLimit) return r1 * Math.min(income, c1) + r2 * Math.max(0, income - c1);
  return r1 * Math.min(income, c1) + r2 * Math.max(0, Math.min(income, c2) - c1) + r3 * Math.max(0, Math.min(income, c3) - c2) + r4 * Math.max(0, income - c3);
}

export interface TaxUnit {
  married: boolean;
  /** Taxable income of each spouse (one entry for a single person). */
  incomes: number[];
  /** Income that earns the employee credit, per person. */
  creditBases: number[];
  ages: number[];
  children?: number;
}

/** Income tax for one tax unit (a single person, or a jointly assessed married couple), with age credit, exemption and marginal relief. */
export function incomeTaxFor(u: TaxUnit, year: number, idx = 1): number {
  const T = table(year);
  const total = u.incomes.reduce((a, b) => a + b, 0);
  let band: number;
  if (u.married) {
    const both = u.incomes.length === 2 && u.incomes[0] > 0 && u.incomes[1] > 0;
    band = T.married * idx + (both ? Math.min(T.secondMax * idx, Math.min(u.incomes[0], u.incomes[1])) : 0);
  } else band = T.single * idx;
  const over65 = u.ages.some((a) => a >= 65);
  let credits = (u.married ? 2 : 1) * T.personal * idx;
  for (const b of u.creditBases) credits += Math.min(T.employee * idx, 0.2 * b);
  if (over65) credits += (u.married ? T.ageMarried : T.ageSingle) * idx;
  const gross = 0.2 * Math.min(total, band) + 0.4 * Math.max(0, total - band);
  const normal = Math.max(0, gross - credits);
  if (!over65) return normal;
  const kids = u.children ?? 0;
  const limit = (u.married ? EXEMPT.married : EXEMPT.single) + EXEMPT.child * Math.min(2, kids) + EXEMPT.childAfter2 * Math.max(0, kids - 2);
  if (total <= limit) return 0;
  if (total < 2 * limit) return Math.min(normal, MARGINAL_RATE * (total - limit));
  return normal;
}

const unit = (people: TaxPerson[], married: boolean, extra: number[]): TaxUnit => ({
  married,
  incomes: people.map((p, i) => p.itBase + extra[i]),
  creditBases: people.map((p) => p.creditBase),
  ages: people.map((p) => p.age),
});

export const ie: RulePack = {
  id: 'ie',
  country: 'Ireland',
  currency: 'EUR',
  locale: 'en-IE',
  baseYear: 2027,
  endAge: 95,
  statePensionAge: STATE_PENSION.age,
  maxLumpPct: LUMP.maxPct,
  reliefPct,
  reliefCap: RELIEF_CAP,
  lumpTax(cum) {
    return LUMP.standardRate * Math.max(0, Math.min(cum, LUMP.standardTop) - LUMP.free) + LUMP.higherRate * Math.max(0, cum - LUMP.standardTop);
  },
  minDrawdownRate(age, value) {
    if (age < ARF.from || value <= 0) return 0;
    if (value > ARF.large) return ARF.rateLarge;
    return age >= ARF.at70 ? ARF.rate70 : ARF.rate;
  },
  payContribution(year, age, salary, onStatePension) {
    if (salary / 52 <= PRSI.free || age >= PRSI.until || (onStatePension && age >= PRSI.onPensionFrom)) return 0;
    return salary * (year <= 2027 ? PRSI.rate2027 : year === 2028 ? PRSI.rate2028 : PRSI.rateFrom2029);
  },
  tax(t: TaxYear, x1: number, x2: number) {
    const [p1, p2] = t.people;
    let incomeTax: number;
    if (t.household === 'married') incomeTax = incomeTaxFor(unit([p1, p2], true, [x1, x2]), t.year, t.idx);
    else {
      incomeTax = incomeTaxFor(unit([p1], false, [x1]), t.year, t.idx);
      if (p2.exists) incomeTax += incomeTaxFor(unit([p2], false, [x2]), t.year, t.idx);
    }
    const reduced = (p: TaxPerson) => p.age >= USC.reducedAge || (p.medicalCard && t.year <= USC.medicalCardUntil);
    const usc = uscFor(p1.uscBase + x1, t.year, t.idx, reduced(p1)) + (p2.exists ? uscFor(p2.uscBase + x2, t.year, t.idx, reduced(p2)) : 0);
    return { incomeTax, usc };
  },
  ukPension: { indexed: true, earnsCredit: true, secondCharge: false, gbpPerEur: UK_PENSION.gbpPerEur, fullWeekly: UK_PENSION.fullWeekly, fullYears: UK_PENSION.fullYears, age: ukPensionAge },
  fundThreshold(year) {
    return SFT[Math.min(2029, Math.max(2025, year))];
  },
  sources: IE_SOURCES,
};
