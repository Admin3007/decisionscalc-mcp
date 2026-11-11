/**
 * Canada rule pack for the retirement engine (./engine.ts). Plan years are calendar (tax) years from 2027. Figures were
 * read on canada.ca (CRA, ESDC), the Justice Laws site and the CRA payroll formulas (T4127) on 9 November 2026. CRA had
 * not yet published the 2027 indexation, so 2027 uses the 2026 tax amounts (2027 CPP and EI limits are published and
 * used); every amount then rises with inflation when the plan says so.
 *
 * Modelled: federal tax and the tax of every province and territory except Quebec (brackets, basic personal amount,
 * age amount with its 15% reduction, pension income amount, CPP and EI credits, Canada employment amount, Ontario
 * surtax and Health Premium); CPP from the age you choose (60 to 70, -0.6% a month before 65, +0.7% after); OAS from
 * 65 to 70 (+0.6% a month deferred, years in Canada / 40, +10% from 75) and its 15% recovery tax; GIS for a single
 * pensioner or a couple who both get OAS, on last year's income (the legal formula, which reproduces Service Canada's
 * Oct-Dec 2026 rate tables); RRSP to RRIF by the year you turn 71 and the RRIF minimum withdrawal on 1 January's value;
 * pension income splitting for couples; a UK State Pension (frozen in Canada).
 *
 * Not modelled (said on the page): Quebec (QPP and Quebec tax), the Allowance for a partner aged 60-64 and GIS when
 * only one partner gets OAS, provincial low-income tax reductions and senior supplements, the CPP post-retirement
 * benefit, TFSA rules beyond "savings grow after tax", tax on non-registered investment income, RRSP pension
 * adjustments, CPP sharing, and the planned 2027 change to the CPP base rate (not yet confirmed).
 */
import type { BenefitCtx, PersonInput, PlanInput, RulePack, Source, TaxPerson, TaxYear } from './types';

const READ = '2026-11-09';
const U = {
  rates: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html',
  index: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html',
  t4127: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jul/t4127-jul-payroll-deductions-formulas.html',
  td1: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/td1-personal-tax-credits-returns/td1-forms-pay-received-on-january-1-later/td1.html',
  pension: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31400-pension-income-amount.html',
  split: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/pension-income-splitting.html',
  ympe: 'https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html',
  ei: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html',
  esdc: 'https://www.canada.ca/en/employment-social-development/programs/pensions/pension/statistics/2026-quarterly-october-december.html',
  cppStart: 'https://www.canada.ca/en/services/benefits/publicpensions/cpp/when-start.html',
  oasAmount: 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/benefit-amount.html',
  oasStart: 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/when-start.html',
  oasRecovery: 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/recovery-tax.html',
  oasAct: 'https://laws-lois.justice.gc.ca/eng/acts/O-9/page-3.html',
  gisTables: 'https://open.canada.ca/data/en/dataset/dfa4daf1-669e-4514-82cd-982f27707ed0',
  rrif: 'https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._945/section-7308.html',
  t4040: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4040/rrsps-other-registered-plans-retirement.html',
  ukAbroad: 'https://www.gov.uk/government/publications/state-pensions-annual-increases-if-you-live-abroad/countries-where-we-pay-an-annual-increase-in-the-state-pension',
  ecb: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html',
} as const;
export const CA_URLS = U;

/** Federal 2026 (14% lowest rate from 2026). */
export const CA_FED = {
  thresholds: [58523, 117045, 181440, 258482] as const, rates: [0.14, 0.205, 0.26, 0.29, 0.33] as const,
  bpaMax: 16452, bpaMin: 14829, ageAmount: 9208, ageFrom: 46432, ageRate: 0.15, pensionAmount: 2000, employment: 1501, creditRate: 0.14,
} as const;
/** CPP and EI contributions on pay, 2027 limits (published): 5.95% (4.95% base, a credit; 1% enhanced, a deduction) above $3,500 to the YMPE; CPP2 4% to the YAMPE; EI 1.64%. */
export const CA_CPP = { ympe: 76700, yampe: 87400, exemption: 3500, rate: 0.0595, base: 0.0495, cpp2: 0.04, eiRate: 0.0164, eiMax: 70800, stopAge: 70 } as const;
/** CPP: maximum at 65 $1,507.65 a month (January 2026); -0.6% a month before 65 (from 60), +0.7% a month after (to 70). */
export const CA_CPP_PENSION = { max65: 1507.65, early: 0.072, late: 0.084, from: 60, to: 70 } as const;
/** OAS Oct-Dec 2026: $762.50 a month at 65-74, 10% more from 75; years in Canada after 18 / 40 (10 minimum); +0.6% a month deferred to 70; recovery tax 15% of net income over $95,323 (2026). */
export const CA_OAS = { max: 762.5, at75: 1.1, fullYears: 40, minYears: 10, defer: 0.072, from: 65, to: 70, clawFrom: 95323, clawRate: 0.15 } as const;
/** GIS Oct-Dec 2026 (OAS Act ss.12, 12.1): base and top-up a month, reduced by income. Single max $1,138.90; each of a couple both on OAS $685.56. */
export const CA_GIS = { singleBase: 962.49, singleTop: 176.41, coupleBase: 635.57, coupleTop: 49.99, topFrom: 2000, coupleTopFrom: 4000, empFree: 5000, empHalf: 10000 } as const;
/** RRIF minimum: 1/(90 - age) under 71, then the s.7308(4) factors (age on 1 January). */
export const CA_RRIF: Record<number, number> = { 71: 0.0528, 72: 0.054, 73: 0.0553, 74: 0.0567, 75: 0.0582, 76: 0.0598, 77: 0.0617, 78: 0.0636, 79: 0.0658, 80: 0.0682, 81: 0.0708, 82: 0.0738, 83: 0.0771, 84: 0.0808, 85: 0.0851, 86: 0.0899, 87: 0.0955, 88: 0.1021, 89: 0.1099, 90: 0.1192, 91: 0.1306, 92: 0.1449, 93: 0.1634, 94: 0.1879, 95: 0.2 };
/** RRSP deduction limit: 18% of earned income up to $35,390 (2027). */
export const CA_RRSP = { pct: 0.18, limit2027: 35390, matureBy: 71 } as const;

export interface Province {
  code: string; name: string;
  thresholds: number[]; rates: number[];
  bpa: number; age: number; ageFrom: number; pension: number;
  /** Manitoba: BPA reduced to 0 between these net incomes. Yukon: follows the federal BPA. */
  bpaPhase?: [number, number]; bpaFederal?: boolean;
  /** Saskatchewan senior supplementary amount (65+). */
  senior?: number;
}

/** 2026 provincial and territorial tax (CRA 2026 rates page, T4127 July 2026, TD1 2026 forms). Quebec is not included. */
export const PROVINCES: Province[] = [
  { code: 'AB', name: 'Alberta', thresholds: [61200, 154259, 185111, 246813, 370220], rates: [0.08, 0.1, 0.12, 0.13, 0.14, 0.15], bpa: 22769, age: 6345, ageFrom: 47234, pension: 1753 },
  { code: 'BC', name: 'British Columbia', thresholds: [50363, 100728, 115648, 140430, 190405, 265545], rates: [0.056, 0.077, 0.105, 0.1229, 0.147, 0.168, 0.205], bpa: 13216, age: 5927, ageFrom: 44119, pension: 1000 },
  { code: 'MB', name: 'Manitoba', thresholds: [47000, 100000], rates: [0.108, 0.1275, 0.174], bpa: 15780, age: 3728, ageFrom: 27749, pension: 1000, bpaPhase: [200000, 400000] },
  { code: 'NB', name: 'New Brunswick', thresholds: [52333, 104666, 193861], rates: [0.094, 0.14, 0.16, 0.195], bpa: 13664, age: 6158, ageFrom: 45844, pension: 1000 },
  { code: 'NL', name: 'Newfoundland and Labrador', thresholds: [44678, 89354, 159528, 223340, 285319, 570638, 1141275], rates: [0.087, 0.145, 0.158, 0.178, 0.198, 0.208, 0.213, 0.218], bpa: 13094, age: 7142, ageFrom: 39138, pension: 1000 },
  { code: 'NS', name: 'Nova Scotia', thresholds: [30995, 61991, 97417, 157124], rates: [0.0879, 0.1495, 0.1667, 0.175, 0.21], bpa: 11932, age: 5826, ageFrom: 30828, pension: 1173 },
  { code: 'NT', name: 'Northwest Territories', thresholds: [53003, 106009, 172346], rates: [0.059, 0.086, 0.122, 0.1405], bpa: 18198, age: 8902, ageFrom: 46432, pension: 1000 },
  { code: 'NU', name: 'Nunavut', thresholds: [55801, 111602, 181439], rates: [0.04, 0.07, 0.09, 0.115], bpa: 19659, age: 12550, ageFrom: 46432, pension: 2000 },
  { code: 'ON', name: 'Ontario', thresholds: [53891, 107785, 150000, 220000], rates: [0.0505, 0.0915, 0.1116, 0.1216, 0.1316], bpa: 12989, age: 6342, ageFrom: 47210, pension: 1796 },
  { code: 'PE', name: 'Prince Edward Island', thresholds: [33928, 65820, 106890, 142520, 200000], rates: [0.095, 0.1347, 0.166, 0.1762, 0.19, 0.2], bpa: 15000, age: 6510, ageFrom: 36600, pension: 1000 },
  { code: 'SK', name: 'Saskatchewan', thresholds: [54532, 155805], rates: [0.105, 0.125, 0.145], bpa: 20381, age: 5901, ageFrom: 43927, pension: 1000, senior: 2569 },
  { code: 'YT', name: 'Yukon', thresholds: [58523, 117045, 181440, 500000], rates: [0.064, 0.09, 0.109, 0.128, 0.15], bpa: 16452, age: 9208, ageFrom: 46432, pension: 2000, bpaFederal: true },
];
export const provinceOf = (code?: string) => PROVINCES.find((p) => p.code === code) ?? PROVINCES.find((p) => p.code === 'ON')!;

/** Ontario surtax (20% of Ontario tax over $5,818, 36% over $7,446) and Health Premium (not indexed). */
export const ON_EXTRA = { s1: 5818, s2: 7446, r1: 0.2, r2: 0.36 } as const;
export function ontarioHealthPremium(ti: number): number {
  if (ti <= 20000) return 0;
  if (ti <= 36000) return Math.min(300, 0.06 * (ti - 20000));
  if (ti <= 48000) return Math.min(450, 300 + 0.06 * (ti - 36000));
  if (ti <= 72000) return Math.min(600, 450 + 0.25 * (ti - 48000));
  if (ti <= 200000) return Math.min(750, 600 + 0.25 * (ti - 72000));
  return Math.min(900, 750 + 0.25 * (ti - 200000));
}

export const bracketTax = (income: number, thresholds: readonly number[], rates: readonly number[], k: number) => {
  let tax = 0, lo = 0;
  for (let i = 0; i < rates.length; i++) {
    const hi = i < thresholds.length ? thresholds[i] * k : Infinity;
    tax += rates[i] * Math.max(0, Math.min(income, hi) - lo);
    lo = hi;
  }
  return tax;
};

/** CPP (base, enhanced, CPP2) and EI on a year's pay; wf raises the limits (wages). */
export function caPayContrib(salary: number, age: number, wf = 1) {
  if (salary <= 0) return { base: 0, enhanced: 0, cpp2: 0, ei: 0, total: 0 };
  const ympe = CA_CPP.ympe * wf, yampe = CA_CPP.yampe * wf;
  const c1 = age >= CA_CPP.stopAge ? 0 : CA_CPP.rate * Math.max(0, Math.min(salary, ympe) - CA_CPP.exemption);
  const c2 = age >= CA_CPP.stopAge ? 0 : CA_CPP.cpp2 * Math.max(0, Math.min(salary, yampe) - ympe);
  const ei = CA_CPP.eiRate * Math.min(salary, CA_CPP.eiMax * wf);
  const base = (c1 * CA_CPP.base) / CA_CPP.rate;
  return { base, enhanced: c1 - base, cpp2: c2, ei, total: c1 + c2 + ei };
}

/** CPP adjustment for the start age. */
export const cppFactor = (start: number) => (start < 65 ? 1 - CA_CPP_PENSION.early * (65 - start) : 1 + CA_CPP_PENSION.late * (Math.min(start, 70) - 65));

/** OAS a year (nominal) for a person at `age`, starting at `start`, with `years` in Canada after 18. */
export function oasFor(years: number, start: number, age: number, f: number): number {
  if (years < CA_OAS.minYears || age < start) return 0;
  return CA_OAS.max * 12 * (Math.min(years, CA_OAS.fullYears) / CA_OAS.fullYears) * (1 + CA_OAS.defer * (start - 65)) * (age >= 75 ? CA_OAS.at75 : 1) * f;
}

/** GIS income: last year's income except OAS and GIS, less $5,000 of pay and half the next $10,000. */
export const gisIncome = (income: number, pay: number) => Math.max(0, income - Math.min(pay, CA_GIS.empFree) - 0.5 * Math.min(Math.max(0, pay - CA_GIS.empFree), CA_GIS.empHalf));
/** GIS a month: single, or each of a couple who both get OAS (Y = combined income). f raises the maximums (they are indexed); the income steps are in law. */
export function gisMonthly(y: number, couple: boolean, f = 1): number {
  if (couple) return Math.max(0, CA_GIS.coupleBase * f - Math.floor(y / 48)) + Math.max(0, CA_GIS.coupleTop * f - Math.floor(Math.max(0, y - CA_GIS.coupleTopFrom) / 96));
  return Math.max(0, CA_GIS.singleBase * f - Math.floor(y / 24)) + Math.max(0, CA_GIS.singleTop * f - Math.floor(Math.max(0, y - CA_GIS.topFrom) / 48));
}

export function rrifRate(ageJan1: number): number {
  if (ageJan1 < 71) return 1 / (90 - ageJan1);
  return CA_RRIF[Math.min(95, ageJan1)];
}

/** One person's tax for the year, after pension splitting. */
export interface CaPerson { exists: boolean; age: number; salary: number; relieved: number; db: number; cpp: number; oas: number; uk: number; draw: number; splitIn: number }
export function caPersonTax(p: CaPerson, prov: Province, k: number, wf: number) {
  if (!p.exists) return { federal: 0, provincial: 0, clawback: 0, net: 0 };
  const c = caPayContrib(p.salary, p.age, wf);
  const splittable = p.db + (p.age >= 65 ? p.draw : 0);
  const ni234 = p.salary - p.relieved - c.enhanced - c.cpp2 + p.db + p.cpp + p.oas + p.uk + p.draw + p.splitIn;
  const clawback = Math.min(p.oas, CA_OAS.clawRate * Math.max(0, ni234 - CA_OAS.clawFrom * k));
  const ni = ni234 - clawback;
  const eligible = Math.max(0, splittable + p.splitIn) + (p.age >= 65 ? p.uk : 0);
  const over65 = p.age >= 65;
  const bpaF = CA_FED.bpaMax * k - (CA_FED.bpaMax - CA_FED.bpaMin) * k * Math.min(1, Math.max(0, (ni - CA_FED.thresholds[2] * k) / ((CA_FED.thresholds[3] - CA_FED.thresholds[2]) * k)));
  const ageF = over65 ? Math.max(0, CA_FED.ageAmount * k - CA_FED.ageRate * Math.max(0, ni - CA_FED.ageFrom * k)) : 0;
  const fedCredits = bpaF + ageF + Math.min(CA_FED.pensionAmount, eligible) + Math.min(CA_FED.employment * k, p.salary) + c.base + c.ei;
  const federal = Math.max(0, bracketTax(ni, CA_FED.thresholds, CA_FED.rates, k) - CA_FED.creditRate * fedCredits);
  const low = prov.rates[0];
  let bpaP = prov.bpaFederal ? bpaF : prov.bpa * k;
  if (prov.bpaPhase) bpaP = Math.max(0, prov.bpa * k * (1 - Math.min(1, Math.max(0, (ni - prov.bpaPhase[0] * k) / ((prov.bpaPhase[1] - prov.bpaPhase[0]) * k)))));
  const ageP = over65 ? Math.max(0, prov.age * k - 0.15 * Math.max(0, ni - prov.ageFrom * k)) : 0;
  const provCredits = bpaP + ageP + (over65 && prov.senior ? prov.senior * k : 0) + Math.min(prov.pension, eligible) + c.base + c.ei;
  let provincial = Math.max(0, bracketTax(ni, prov.thresholds, prov.rates, k) - low * provCredits);
  if (prov.code === 'ON') provincial += ON_EXTRA.r1 * Math.max(0, provincial - ON_EXTRA.s1 * k) + ON_EXTRA.r2 * Math.max(0, provincial - ON_EXTRA.s2 * k) + ontarioHealthPremium(ni);
  return { federal, provincial, clawback, net: ni };
}

/** Pension income splitting: move eligible pension income from the higher to the lower net income, up to half, to even them out. */
export function caSplit(a: CaPerson, b: CaPerson): number {
  const pre = (p: CaPerson) => p.salary - p.relieved + p.db + p.cpp + p.oas + p.uk + p.draw;
  const ea = a.db + (a.age >= 65 ? a.draw : 0), eb = b.db + (b.age >= 65 ? b.draw : 0);
  const na = pre(a), nb = pre(b);
  if (na >= nb) return Math.min(0.5 * ea, (na - nb) / 2); // positive: a gives to b
  return -Math.min(0.5 * eb, (nb - na) / 2);
}

export const CA_SOURCES: Source[] = [
  { what: 'Federal tax 2026: 14% to $58,523, 20.5% to $117,045, 26% to $181,440, 29% to $258,482, 33% above', url: U.rates, read: READ },
  { what: 'Federal credits 2026: basic personal amount $16,452 (down to $14,829 between $181,440 and $258,482 of net income), age amount $9,208 reduced by 15% of net income over $46,432, pension income amount $2,000, Canada employment amount $1,501; indexation 2.0% (2027 not yet published)', url: U.index, read: READ },
  { what: 'Provincial and territorial brackets, Ontario surtax ($5,818 / $7,446) and Health Premium, CPP and EI credits (payroll formulas, July 2026: BC lowest rate 5.6%, PEI 20% over $200,000, NL basic amount $13,094 for 2026)', url: U.t4127, read: READ },
  { what: 'Provincial basic, age and pension amounts 2026 (TD1 forms for each province and territory)', url: U.td1, read: READ },
  { what: 'Pension income amount: RRIF payments count from 65, life annuities from a pension plan at any age; OAS and CPP never; foreign pensions count', url: U.pension, read: READ },
  { what: 'Pension income splitting: up to 50% of eligible pension income to a spouse or common-law partner; RRIF income from 65', url: U.split, read: READ },
  { what: 'CPP 2027: YMPE $76,700, YAMPE $87,400; RRSP limit $35,390 (2027)', url: U.ympe, read: READ },
  { what: 'EI 2027: 1.64% on insurable earnings up to $70,800', url: U.ei, read: READ },
  { what: 'CPP maximum at 65 $1,507.65 a month (2026); OAS Oct-Dec 2026 $762.50 (65-74), $838.75 (75+); GIS single $1,138.90, each of a couple on OAS $685.56; CPP 5.95% from $3,500, CPP2 4%', url: U.esdc, read: READ },
  { what: 'CPP from 60 to 70: 0.6% less a month before 65 (36% at 60), 0.7% more a month after 65 (42% at 70)', url: U.cppStart, read: READ },
  { what: 'OAS: years lived in Canada after 18 / 40 (10 minimum), 10% more from 75', url: U.oasAmount, read: READ },
  { what: 'OAS deferral: 0.6% more a month after 65, up to 36% at 70; no GIS while deferring', url: U.oasStart, read: READ },
  { what: 'OAS recovery tax: 15% of net world income over $95,323 (2026 income year)', url: U.oasRecovery, read: READ },
  { what: 'GIS: base reduced $1 for each $2 of monthly income (couples: combined income / 24), top-up reduced by a quarter of income over $2,000 ($4,000 couples); last year\'s income without OAS and GIS, less $5,000 of pay and half the next $10,000 (OAS Act ss.12-12.1)', url: U.oasAct, read: READ },
  { what: 'GIS rate tables Oct-Dec 2026 (open data): our formula reproduces every row for single pensioners and couples who both get OAS', url: U.gisTables, read: READ },
  { what: 'RRIF minimum: 1/(90 - age) under 71, then 5.28% at 71 rising to 20% at 95 (Income Tax Regulations s.7308)', url: U.rrif, read: READ },
  { what: 'RRSPs mature by the end of the year you turn 71; RRIF minimum on the value at 1 January, none in the year the RRIF starts', url: U.t4040, read: READ },
  { what: 'The UK State Pension is not increased for people living in Canada (frozen at the rate when you claim)', url: U.ukAbroad, read: READ },
  { what: 'Pounds per Canadian dollar 0.53114: ECB reference rates on 6 November 2026 (£0.83415 and C$1.5705 per euro); an input you can change', url: U.ecb, read: READ },
];

const idxOf = (t: TaxYear) => (t.indexTax === false ? 1 : t.idx);
const wageF = (t: TaxYear) => Math.pow(1 + (t.inf ?? 0), t.t ?? 0);

export function caTax(t: TaxYear, x1: number, x2: number) {
  const prov = provinceOf(t.local?.region);
  const k = idxOf(t), wf = wageF(t);
  const mk = (p: TaxPerson, x: number): CaPerson => ({ exists: p.exists, age: p.age, salary: p.salary, relieved: p.relieved, db: p.db, cpp: p.sp, oas: p.sp2, uk: p.uk, draw: p.draw + x, splitIn: 0 });
  const a = mk(t.people[0], x1), b = mk(t.people[1], x2);
  if (t.household !== 'single' && a.exists && b.exists && t.local?.split !== false) {
    const s = caSplit(a, b);
    a.splitIn = -s; b.splitIn = s;
  }
  const ra = caPersonTax(a, prov, k, wf), rb = caPersonTax(b, prov, k, wf);
  return { incomeTax: ra.federal + ra.provincial + rb.federal + rb.provincial, usc: ra.clawback + rb.clawback };
}

export function caGis(c: BenefitCtx): [number, number] {
  const on = c.income.map((x) => x.sp2 > 0);
  const y = c.prev.map((p) => gisIncome(p.income, p.pay));
  if (!c.two) return [on[0] ? 12 * gisMonthly(y[0], false, c.f) : 0, 0];
  if (on[0] && on[1]) { const m = 12 * gisMonthly(y[0] + y[1], true, c.f); return [m, m]; }
  return [0, 0];
}

export const ca: RulePack = {
  id: 'ca',
  country: 'Canada',
  currency: 'CAD',
  locale: 'en-CA',
  baseYear: 2027,
  endAge: 95,
  statePensionAge: 65,
  periods: 12,
  maxLumpPct: 0,
  reliefPct: () => CA_RRSP.pct,
  reliefCap: CA_RRSP.limit2027 / CA_RRSP.pct,
  lumpTax: () => 0,
  minDrawdownRate: (age, value) => (value > 0 ? rrifRate(age - 1) : 0),
  minOnOpening: true,
  maxDrawAge: CA_RRSP.matureBy,
  statePensionFactor: cppFactor,
  pension2: (q: PersonInput, age, f) => oasFor(q.pension2Years ?? 40, q.pension2Age ?? 65, age, f),
  benefit: caGis,
  bridgeAge: (q) => Math.ceil(Math.min(q.statePensionAge ?? 65, q.pension2Age ?? 65)),
  close: 0.3,
  payContribution(_year, age, salary, _on, _spa, ctx) {
    return caPayContrib(salary, age, ctx ? Math.pow(1 + ctx.inf, ctx.t) : 1).total;
  },
  tax: caTax,
  ukPension: { indexed: false, earnsCredit: true, secondCharge: true, gbpPerEur: 0.53114, fullWeekly: 241.3, fullYears: 35, age: (y) => (y <= 1959 ? 66 : y <= 1976 ? 67 : 68) },
  fundThreshold: () => Infinity,
  sources: CA_SOURCES,
};

/** A 55-year-old in Ontario asking "can I retire at 60 with $500k?". */
export const CA_DEFAULT: PlanInput = {
  household: 'single',
  people: [{
    age: 55, retireAge: 60, salary: 85000, contribPct: 8, employerPct: 4, pensionPot: 500000, arf: 0, lumpPct: 0,
    dbPension: 0, dbFromAge: 60, dbIndex: 0, dbLumpSum: 0, statePensionWeekly: 1100, statePensionAge: 65, pension2Age: 65, pension2Years: 40,
  }],
  savings: 80000, savingsAdd: 7000, spending: 50000,
  growth: 4.5, savingsGrowth: 3, inflation: 2, payGrowth: 2.5, indexTax: true,
  local: { region: 'ON', split: true },
};
export const CA_PARTNER: PersonInput = {
  age: 55, retireAge: 60, salary: 60000, contribPct: 5, employerPct: 3, pensionPot: 150000, arf: 0, lumpPct: 0,
  dbPension: 0, dbFromAge: 60, dbIndex: 0, dbLumpSum: 0, statePensionWeekly: 800, statePensionAge: 65, pension2Age: 65, pension2Years: 40,
};
