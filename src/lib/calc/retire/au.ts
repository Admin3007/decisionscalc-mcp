/**
 * Australia rule pack for the retirement engine (./engine.ts). Plan years are financial years: 2027 = 1 July 2027 to
 * 30 June 2028. Figures were read on servicesaustralia.gov.au, the DSS Social Security Guide and ato.gov.au on
 * 9 November 2026. Age Pension rates and thresholds are those from 20 September 2026 (next change 20 March 2027), used
 * as today's money and raised with inflation.
 *
 * Modelled: resident income tax 2027-28 (14% from 1 July 2027, legislated), the Medicare levy with its low-income
 * thresholds (seniors' thresholds from Age Pension age), SAPTO and LITO; super contributions taxed 15% in the fund,
 * super from preservation age 60, tax-free from 60, the account-based pension minimum (4% to 14% by age on the 1 July
 * balance; none in the first year); the Age Pension from 67 under the income test (deeming on super pensions, super
 * from 67 and savings; Work Bonus) and the assets test ($3 a fortnight per $1,000 in $250 steps, homeowner or not),
 * the lower result paid, single or couple; a UK State Pension (frozen in Australia, counted as income in full).
 *
 * Not modelled (said on the page): Division 296 tax on balances over $3m, defined benefit pensions from taxed funds
 * (we tax DB pensions as untaxed-source pensions with the 10% offset), transition to retirement, the Energy
 * Supplement being tax-free, the Work Bonus income bank, unused SAPTO transferred between partners, Commonwealth
 * Seniors Health Card, rent assistance, and the 2027-28 SAPTO and Medicare thresholds (not yet published: 2026-27
 * SAPTO and 2025-26 Medicare figures are used).
 */
import type { BenefitCtx, PlanInput, PersonInput, RulePack, Source, TaxPerson, TaxYear } from './types';

const READ = '2026-11-09';
const U = {
  apRates: 'https://guides.dss.gov.au/social-security-guide/5/1/8/10',
  apHow: 'https://www.servicesaustralia.gov.au/how-much-age-pension-you-can-get',
  apWho: 'https://www.servicesaustralia.gov.au/who-can-get-age-pension',
  income: 'https://www.servicesaustralia.gov.au/income-test-for-age-pension',
  workBonus: 'https://www.servicesaustralia.gov.au/how-work-bonus-works',
  assets: 'https://www.servicesaustralia.gov.au/assets-test-for-age-pension',
  taper: 'https://guides.dss.gov.au/social-security-guide/4/2/3',
  superSA: 'https://www.servicesaustralia.gov.au/superannuation',
  deeming: 'https://guides.dss.gov.au/social-security-guide/4/4/1/10',
  tax: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents',
  cuts: 'https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer',
  medicare: 'https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners',
  medicareFamily: 'https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-family-income',
  sapto: 'https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/seniors-and-pensioners-tax-offset',
  lito: 'https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset',
  payments: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/payments-from-super',
  caps: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps',
  sg: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee',
  withdraw: 'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/retirement-withdrawal-lump-sum-or-income-stream',
  div296: 'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/division-296-tax/division-296-tax-on-large-super-balances',
  ukAbroad: 'https://www.gov.uk/government/publications/state-pensions-annual-increases-if-you-live-abroad/countries-where-we-pay-an-annual-increase-in-the-state-pension',
  ecb: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html',
} as const;
export const AU_URLS = U;

/** Resident tax 2027-28: nil to $18,200, 14% to $45,000, 30% to $135,000, 37% to $190,000, 45% above. */
export const AU_TAX = { thresholds: [18200, 45000, 135000, 190000] as const, rates: [0, 0.14, 0.3, 0.37, 0.45] as const } as const;
/** Medicare levy 2%; no levy at or below the lower threshold, then 10% of the excess until 2% (2025-26 thresholds, latest published). */
export const AU_MEDICARE = { rate: 0.02, phase: 0.1, single: 28011, singleSenior: 44268, family: 47238, familySenior: 61623 } as const;
/** SAPTO 2026-27: $2,230 single, $1,602 each of a couple; reduced 12.5c a dollar over $36,034 / $31,847. LITO: $700, less 5c over $37,500, then 1.5c over $45,000. */
export const AU_SAPTO = { single: 2230, singleFrom: 36034, couple: 1602, coupleFrom: 31847, taper: 0.125 } as const;
export const AU_LITO = { max: 700, from: 37500, mid: 45000, midValue: 325, r1: 0.05, r2: 0.015 } as const;
/** Untaxed-source defined benefit pensions from 60: 10% tax offset on up to the defined benefit income cap ($131,250, 2026-27). */
export const AU_DB = { offset: 0.1, cap: 131250 } as const;
/** Age Pension from 20 September 2026, a fortnight: single $1,237.70, each of a couple $933.00 (Energy Supplement $14.10 / $10.60). Age 67. */
export const AU_AGE_PENSION = {
  age: 67, single: 1237.7, singleES: 14.1, couple: 933.0, coupleES: 10.6,
  incomeFree: 226, incomeFreeCouple: 396, taper: 0.5, taperCoupleEach: 0.25, workBonus: 300,
  /** Full pension asset limits [single, couple combined]. */
  assetsHome: [333000, 499000] as const, assetsNoHome: [600000, 766000] as const,
  /** $3 a fortnight per $1,000 (single or couple combined), in whole $250 steps: $0.75 a step. */
  assetsStep: 250, assetsPerStep: 0.75,
} as const;
/** Deeming from 20 September 2026: 1.75% up to $66,800 (single) / $110,600 (pensioner couple), 3.75% above. */
export const AU_DEEMING = { low: 0.0175, high: 0.0375, single: 66800, couple: 110600 } as const;
/** Super: preservation age 60; minimum pension drawdown by age on 1 July; 15% contributions tax; SG 12%; concessional cap $32,500; transfer balance cap $2.1m. */
export const AU_SUPER = { preservation: 60, contribTax: 0.15, sg: 12, concessionalCap: 32500, tbc: 2100000, minimum: [[65, 0.04], [75, 0.05], [80, 0.06], [85, 0.07], [90, 0.09], [95, 0.11], [Infinity, 0.14]] as [number, number][] } as const;

export function auMinimum(ageJuly1: number): number {
  return AU_SUPER.minimum.find(([below]) => ageJuly1 < below)![1];
}

export function auIncomeTax(ti: number, k = 1): number {
  let tax = 0, lo = 0;
  const th = AU_TAX.thresholds, r = AU_TAX.rates;
  for (let i = 0; i < r.length; i++) {
    const hi = i < th.length ? th[i] * k : Infinity;
    tax += r[i] * Math.max(0, Math.min(ti, hi) - lo);
    lo = hi;
  }
  return tax;
}
export function auLito(ti: number, k = 1): number {
  const L = AU_LITO;
  if (ti <= L.from * k) return L.max * k;
  if (ti <= L.mid * k) return Math.max(0, L.max * k - L.r1 * (ti - L.from * k));
  return Math.max(0, L.midValue * k - L.r2 * (ti - L.mid * k));
}
export function auSapto(ti: number, couple: boolean, k = 1): number {
  const max = (couple ? AU_SAPTO.couple : AU_SAPTO.single) * k, from = (couple ? AU_SAPTO.coupleFrom : AU_SAPTO.singleFrom) * k;
  return Math.max(0, max - AU_SAPTO.taper * Math.max(0, ti - from));
}
/** Medicare levy for a single person; for a couple, the family reduction on combined income shared by income. */
export function auMedicare(ti: number, senior: boolean, k = 1, family?: { combined: number; senior: boolean }): number {
  const M = AU_MEDICARE;
  const own = ti <= (senior ? M.singleSenior : M.single) * k ? 0 : Math.min(M.rate * ti, M.phase * (ti - (senior ? M.singleSenior : M.single) * k));
  if (!family || family.combined <= 0) return own;
  const lower = (family.senior ? M.familySenior : M.family) * k;
  const fam = family.combined <= lower ? 0 : Math.min(M.rate * family.combined, M.phase * (family.combined - lower));
  return Math.min(own, (fam * ti) / family.combined);
}

/** Taxable income: pay after salary sacrifice, DB pension, Age Pension, UK State Pension. Super pensions and lump sums from 60 are tax-free. */
const taxable = (p: TaxPerson) => p.salary - p.relieved + p.db + p.benefit + p.uk;

export function auTax(t: TaxYear) {
  const k = t.indexTax === false ? 1 : t.idx;
  const [a, b] = t.people;
  const couple = t.household !== 'single' && b.exists;
  const ta = taxable(a), tb = couple ? taxable(b) : 0;
  const seniorAny = a.age >= AU_AGE_PENSION.age || (couple && b.age >= AU_AGE_PENSION.age);
  const one = (p: TaxPerson, ti: number) => {
    if (!p.exists) return { it: 0, ml: 0 };
    const senior = p.age >= AU_AGE_PENSION.age;
    const offsets = auLito(ti, k) + (senior ? auSapto(ti, couple, k) : 0) + AU_DB.offset * Math.min(p.db, AU_DB.cap * k);
    const it = Math.max(0, auIncomeTax(ti, k) - offsets);
    const ml = auMedicare(ti, senior, k, couple ? { combined: ta + tb, senior: seniorAny } : undefined);
    return { it, ml };
  };
  const ra = one(a, ta), rb = couple ? one(b, tb) : { it: 0, ml: 0 };
  return { incomeTax: ra.it + rb.it, usc: ra.ml + rb.ml };
}

/** Deemed income a year on financial assets. */
export function auDeemed(financial: number, couple: boolean, f = 1): number {
  const th = (couple ? AU_DEEMING.couple : AU_DEEMING.single) * f;
  return AU_DEEMING.low * Math.min(financial, th) + AU_DEEMING.high * Math.max(0, financial - th);
}

/** Age Pension a fortnight for each eligible person, from fortnightly assessable income (combined for a couple) and assets. */
export function auAgePension(incomeFn: number, assets: number, couple: boolean, homeowner: boolean, f = 1): number {
  const A = AU_AGE_PENSION;
  const max = couple ? (A.couple - A.coupleES) * f + A.coupleES : (A.single - A.singleES) * f + A.singleES;
  const free = (couple ? A.incomeFreeCouple : A.incomeFree) * f;
  const byIncome = Math.max(0, max - (couple ? A.taperCoupleEach : A.taper) * Math.max(0, incomeFn - free));
  const limit = (homeowner ? A.assetsHome : A.assetsNoHome)[couple ? 1 : 0] * f;
  const steps = Math.floor(Math.max(0, assets - limit) / A.assetsStep);
  const byAssets = Math.max(0, max - (couple ? A.assetsPerStep / 2 : A.assetsPerStep) * steps);
  return Math.min(byIncome, byAssets);
}

export function auBenefit(c: BenefitCtx): [number, number] {
  const A = AU_AGE_PENSION;
  const elig = [c.ages[0] >= A.age, c.two && c.ages[1] >= A.age];
  if (!elig[0] && !elig[1]) return [0, 0];
  const couple = c.two;
  const persons = couple ? [0, 1] : [0];
  // Super counts from Age Pension age (accumulation); drawdown funds (account-based pensions) always count.
  const financial = c.savings + persons.reduce((s, i) => s + c.funds[i] + (c.ages[i] >= A.age ? c.pots[i] : 0), 0);
  const assets = financial + (c.local.otherAssets ?? 0) * c.f;
  const work = (i: number) => Math.max(0, c.income[i].salary - (c.ages[i] >= A.age ? A.workBonus * 26 : 0));
  const income = auDeemed(financial, couple, c.f) + persons.reduce((s, i) => s + c.income[i].db + c.income[i].uk + work(i), 0);
  const rate = 26 * auAgePension(income / 26, assets, couple, c.local.homeowner !== false, c.f);
  return [elig[0] ? rate : 0, elig[1] ? rate : 0];
}

export const AU_SOURCES: Source[] = [
  { what: 'Age Pension from 20 September 2026 to 19 March 2027: $1,237.70 a fortnight single, $933.00 each for a couple (basic rate, Pension Supplement, Energy Supplement $14.10 / $10.60)', url: U.apRates, read: READ },
  { what: 'Age Pension age 67; rates change every 20 March and 20 September; foreign pensions count as income', url: U.apHow, read: READ },
  { what: 'Income test: $226 a fortnight free (single), $396 combined (couple); then 50c a dollar (couple: 25c each on combined income)', url: U.income, read: READ },
  { what: 'Work Bonus: the first $300 a fortnight of work income is not counted (income bank up to $11,800, not modelled)', url: U.workBonus, read: READ },
  { what: 'Assets test: full pension up to $333,000 single / $499,000 couple (homeowners), $600,000 / $766,000 (non-homeowners); the home is not counted', url: U.assets, read: READ },
  { what: 'Assets taper: $3 a fortnight for each $1,000 over the limit (single or couple combined), worked out in whole $250 steps', url: U.taper, read: READ },
  { what: 'Super under Age Pension age is not counted unless it pays a pension; from Age Pension age it counts in both tests and is deemed', url: U.superSA, read: READ },
  { what: 'Deeming from 20 September 2026: 1.75% to $66,800 (single) / $110,600 (pensioner couple), 3.75% above; account-based pensions are deemed', url: U.deeming, read: READ },
  { what: 'Resident tax 2026-27: nil to $18,200, 15% to $45,000, 30% to $135,000, 37% to $190,000, 45% above', url: U.tax, read: READ },
  { what: 'The 15% rate falls to 14% from 1 July 2027 (law); the planner uses 14% from 2027-28', url: U.cuts, read: READ },
  { what: 'Medicare levy 2%; low-income thresholds 2025-26: $28,011 single, $44,268 single entitled to SAPTO (10% of the excess above them until 2%)', url: U.medicare, read: READ },
  { what: 'Medicare levy family thresholds 2025-26: $47,238, $61,623 for families entitled to SAPTO', url: U.medicareFamily, read: READ },
  { what: 'SAPTO 2026-27: $2,230 single (reduced 12.5c a dollar over $36,034), $1,602 each of a couple (over $31,847)', url: U.sapto, read: READ },
  { what: 'LITO: $700 up to $37,500, less 5c a dollar to $45,000 ($325), less 1.5c a dollar to $66,667', url: U.lito, read: READ },
  { what: 'Preservation age 60 (born from 1 July 1964); super lump sums and pensions from a taxed fund are tax-free from 60; minimum pension drawdown 4% under 65, 5% at 65-74, 6% at 75-79, 7% at 80-84, 9% at 85-89, 11% at 90-94, 14% from 95', url: U.payments, read: READ },
  { what: 'Concessional contributions cap $32,500 (2026-27); taxed 15% in the fund', url: U.caps, read: READ },
  { what: 'Super guarantee 12%', url: U.sg, read: READ },
  { what: 'Transfer balance cap $2.1 million from 1 July 2026; untaxed defined benefit pensions get a 10% tax offset from 60, up to the $131,250 defined benefit income cap', url: U.withdraw, read: READ },
  { what: 'Division 296: extra tax on earnings of super balances over $3 million from 1 July 2026 (not modelled)', url: U.div296, read: READ },
  { what: 'The UK State Pension is not increased for people living in Australia (frozen at the rate when you claim)', url: U.ukAbroad, read: READ },
  { what: 'Pounds per Australian dollar 0.51332: ECB reference rates on 6 November 2026 (£0.83415 and A$1.6250 per euro); an input you can change', url: U.ecb, read: READ },
];

export const au: RulePack = {
  id: 'au',
  country: 'Australia',
  currency: 'AUD',
  locale: 'en-AU',
  baseYear: 2027,
  endAge: 95,
  statePensionAge: AU_AGE_PENSION.age,
  periods: 26,
  maxLumpPct: 1,
  reliefPct: () => 1,
  reliefCap: 1e12,
  lumpTax: () => 0,
  minDrawdownRate: (age, value) => (value > 0 ? auMinimum(age - 1) : 0),
  minOnOpening: true,
  canDraw: (age) => age >= AU_SUPER.preservation,
  contribTax: AU_SUPER.contribTax,
  benefit: auBenefit,
  bridgeAge: () => AU_AGE_PENSION.age,
  payContribution: () => 0,
  tax: (t) => auTax(t),
  ukPension: { indexed: false, earnsCredit: true, secondCharge: true, gbpPerEur: 0.51332, fullWeekly: 241.3, fullYears: 35, age: (y) => (y <= 1959 ? 66 : y <= 1976 ? 67 : 68) },
  fundThreshold: () => AU_SUPER.tbc,
  sources: AU_SOURCES,
};

/** A 55-year-old homeowner asking "can I retire at 60 with $500k in super?". */
export const AU_DEFAULT: PlanInput = {
  household: 'single',
  people: [{
    age: 55, retireAge: 60, salary: 95000, contribPct: 0, employerPct: AU_SUPER.sg, pensionPot: 500000, arf: 0, lumpPct: 0,
    dbPension: 0, dbFromAge: 60, dbIndex: 0, dbLumpSum: 0, statePensionWeekly: 0,
  }],
  savings: 50000, savingsAdd: 5000, spending: 52000,
  growth: 5, savingsGrowth: 3, inflation: 2.5, payGrowth: 3, indexTax: true,
  local: { homeowner: true, otherAssets: 15000 },
};
export const AU_PARTNER: PersonInput = {
  age: 55, retireAge: 60, salary: 70000, contribPct: 0, employerPct: AU_SUPER.sg, pensionPot: 250000, arf: 0, lumpPct: 0,
  dbPension: 0, dbFromAge: 60, dbIndex: 0, dbLumpSum: 0, statePensionWeekly: 0,
};
