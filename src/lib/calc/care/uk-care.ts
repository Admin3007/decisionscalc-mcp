/**
 * UK care fees by nation, week by week: how long savings (and the home, if it counts) pay for care before the council
 * helps, then the means-tested contribution, the council's share, NHS or Scottish payments and any family top-up.
 * The Care Costs Planner's UK edition (scripts/gen-care-planner.mjs) runs the same rules as formulas, row for row
 * (tests/contracts/care-planner.test.ts).
 *
 * 2026/27 figures (read 9 Nov 2026; decisionscalc-apps radar/decisionscalc/CARE-COSTS-FACTS-2026-11.md):
 *  - England: capital limits £23,250 / £14,250 (LAC(DHSC)(2026)2); tariff income £1 a week per £250 or part of £250
 *    between them (Care and support statutory guidance, Annex B: £18,100 gives £16); Personal Expenses Allowance
 *    £31.80; Minimum Income Guarantee (home care, single, Pension Credit age) £241.45; NHS-funded nursing care
 *    £267.68 a week (nhs.uk); 12-week property disregard on a permanent move to a care home.
 *  - Scotland (CCD 1/2026): capital limits £36,750 / £22,750, tariff £1 per £250 or part; PEA £37.65; free personal
 *    care £260.30 and free nursing care £117.10 a week; personal care at home is free.
 *  - Wales (gov.wales/charging-social-care, no year label on the page): over £50,000 of capital the person pays the
 *    full cost of a care home; at or below it the council helps, leaving at least £46.35 a week; home care at most
 *    £100 a week. Tariff income below £50,000 is not modelled (the page does not mention one).
 *  - Northern Ireland (nidirect, no year label): £23,250 / £14,250, tariff £1 per £250; PEA £34.10; the Trust pays
 *    £100 a week for assessed nursing needs.
 * Model: each week the fee is paid by any fixed public payment (FNC, Scottish FPC/FNC), then by the person while their
 * capital is above the upper limit (income first, then savings, then the home through a deferred payment agreement,
 * which lends up to the home's value less 10% less the lower capital limit, then in practice a sale); below it the council pays its usual rate less the person's assessed contribution (income + tariff − PEA),
 * and anyone else (usually the family) pays the difference between the home's fee and the council's rate (a "top-up").
 * Fees rise once a year; fixed payments are held at their 2026/27 rates.
 */

export type Nation = 'england' | 'scotland' | 'wales' | 'ni';
export type CareTypeUK = 'residential' | 'nursing' | 'home';

export interface NationRules {
  name: string;
  upper: number;
  lower: number;
  /** £ of tariff income a week per £250 (or part) between the limits; 0 = none. */
  tariff: number;
  pea: number;
  /** Paid towards nursing in a care home whatever the person's means. */
  nursing: number;
  /** Scotland: free personal care in a care home. */
  personal: number;
  /** England: Minimum Income Guarantee for home care. Wales: the weekly cap on home care. */
  mig: number;
  homeCap: number;
  source: string;
  checked: string;
}

export const UK_NATIONS: Record<Nation, NationRules> = {
  england: { name: 'England', upper: 23250, lower: 14250, tariff: 1, pea: 31.8, nursing: 267.68, personal: 0, mig: 241.45, homeCap: 0,
    source: 'https://www.gov.uk/government/publications/social-care-charging-for-local-authorities-2026-to-2027/social-care-charging-for-care-and-support-2026-to-2027-local-authority-circular', checked: '2026/27' },
  scotland: { name: 'Scotland', upper: 36750, lower: 22750, tariff: 1, pea: 37.65, nursing: 117.1, personal: 260.3, mig: 0, homeCap: 0,
    source: 'https://www.publications.scot.nhs.uk/files/ccd2026-01.pdf', checked: '2026/27' },
  wales: { name: 'Wales', upper: 50000, lower: 50000, tariff: 0, pea: 46.35, nursing: 0, personal: 0, mig: 0, homeCap: 100,
    source: 'https://www.gov.wales/charging-social-care', checked: 'no year on the page' },
  ni: { name: 'Northern Ireland', upper: 23250, lower: 14250, tariff: 1, pea: 34.1, nursing: 100, personal: 0, mig: 0, homeCap: 0,
    source: 'https://www.nidirect.gov.uk/articles/paying-your-care-home-fees', checked: 'no year on the page' },
};

export const UK_SOURCES = {
  guidance: 'https://www.gov.uk/government/publications/care-act-statutory-guidance/care-and-support-statutory-guidance',
  fnc: 'https://www.nhs.uk/social-care-and-support/money-work-and-benefits/nhs-funded-nursing-care/',
  chc: 'https://www.gov.uk/government/publications/national-framework-for-nhs-continuing-healthcare-and-nhs-funded-nursing-care',
};

export const WEEKS = 780; // 15 years of 52 weeks
export const DISREGARD_WEEKS = 12;
/** Deferred payment equity limit: the home's value less this share less the lower capital limit (statutory guidance ch. 9). Shown as a note. */
export const DPA_MARGIN = 0.1;

/** Tariff income a week: £1 for every £250, or part of £250, between the limits (none in Wales). */
export function tariffIncome(nation: Nation, capital: number): number {
  const n = UK_NATIONS[nation];
  if (!n.tariff || capital <= n.lower) return 0;
  return n.tariff * Math.ceil((Math.min(capital, n.upper) - n.lower) / 250);
}

export interface UkInput {
  nation: Nation;
  careType: CareTypeUK;
  /** The care home's (or home care's) weekly fee today. */
  fee: number;
  /** What the council usually pays for this kind of care a week; the gap to the fee is a top-up. */
  councilRate: number;
  savings: number;
  /** Home value less any mortgage. */
  homeEquity: number;
  /** A partner, or a relative aged 60+ or incapacitated, still lives in the home (it is not counted). */
  homeDisregarded: boolean;
  /** Weekly income: pensions and benefits. */
  income: number;
  /** Scotland home care: share of the cost that is personal care (free), percent. */
  personalShare: number;
  feeInflation: number;
  incomeGrowth: number;
  savingsGrowth: number;
  homeGrowth: number;
  /** Interest on a deferred payment agreement, % a year (your council's rate). */
  dpaRate: number;
}

export interface UkWeek {
  w: number; year: number; fee: number; income: number; council: number; fixedPublic: number;
  cashStart: number; cashGrown: number; debtStart: number; debtGrown: number; home: number; capital: number;
  selfFund: number; tariff: number; contribution: number; personDue: number; councilPays: number; topUp: number;
  fromIncome: number; fromSavings: number; fromHome: number; family: number; cashEnd: number; debtEnd: number;
}
export interface UkYear { year: number; fee: number; fromIncome: number; fromSavings: number; fromHome: number; publicHelp: number; family: number; savingsEnd: number; debtEnd: number }

export interface UkResult {
  rules: NationRules;
  weeks: UkWeek[];
  years: UkYear[];
  /** First week the council helps (null: not within 15 years). */
  councilWeek: number | null;
  /** That week's tariff income, contribution, council share and top-up. */
  atCouncil: { tariff: number; contribution: number; councilPays: number; topUp: number } | null;
  fixedPublicNow: number;
  totals: { fee: number; fromIncome: number; fromSavings: number; fromHome: number; publicHelp: number; family: number };
}

/** Weekly payment made whatever the person's means (NHS nursing care; Scotland free personal and nursing care). */
export function fixedPublic(i: Pick<UkInput, 'nation' | 'careType' | 'personalShare'>, fee: number): number {
  const n = UK_NATIONS[i.nation];
  if (i.careType === 'home') return i.nation === 'scotland' ? fee * Math.min(100, Math.max(0, i.personalShare)) / 100 : 0;
  return Math.min(fee, n.personal + (i.careType === 'nursing' ? n.nursing : 0));
}

export function projectUK(i: UkInput): UkResult {
  const n = UK_NATIONS[i.nation];
  const home = i.careType === 'home';
  // How the means test works for this case: 0 = self-funder above the upper limit, else council-funded with a contribution;
  // Scotland and Northern Ireland home care are not means-tested here (the person pays what is not free).
  const meansTested = !home || i.nation === 'england';
  const gw = Math.pow(1 + i.savingsGrowth / 100, 1 / 52);
  const dw = Math.pow(1 + i.dpaRate / 100, 1 / 52);
  const weeks: UkWeek[] = [];
  let cPrev = Math.max(0, i.savings), dPrev = 0;
  for (let w = 0; w < WEEKS; w++) {
    const year = Math.floor(w / 52);
    const fee = i.fee * Math.pow(1 + i.feeInflation / 100, year);
    const council = i.councilRate * Math.pow(1 + i.feeInflation / 100, year);
    const income = i.income * Math.pow(1 + i.incomeGrowth / 100, year);
    const fx = fixedPublic(i, fee);
    const cashStart = cPrev, cashGrown = cashStart * gw, debtStart = dPrev, debtGrown = debtStart * dw;
    const homeV = !home && !i.homeDisregarded && w >= DISREGARD_WEEKS ? Math.max(0, i.homeEquity) * Math.pow(1 + i.homeGrowth / 100, year) : 0;
    const capital = Math.max(0, cashGrown + homeV - debtGrown);
    const selfFund = meansTested ? (capital > n.upper ? 1 : 0) : 1;
    const allowance = home ? n.mig : n.pea;
    const tariff = selfFund ? 0 : tariffIncome(i.nation, capital);
    const contribution = selfFund ? 0 : Math.max(0, income + tariff - allowance);
    const base = Math.max(0, Math.min(council, fee) - fx);
    let personDue: number, councilPays: number, topUp: number;
    if (home && i.nation === 'wales') { personDue = Math.min(fee - fx, n.homeCap); councilPays = fee - fx - personDue; topUp = 0; }
    else if (selfFund) { personDue = fee - fx; councilPays = 0; topUp = 0; }
    else { personDue = Math.min(contribution, base); councilPays = base - personDue; topUp = Math.max(0, fee - council); }
    const incomeAvail = selfFund ? income : Math.max(0, income - allowance);
    const fromIncome = Math.min(personDue, incomeAvail);
    const rest = personDue - fromIncome;
    const fromSavings = Math.min(cashGrown, rest);
    // The home pays until its value is used up: a deferred payment up to its equity limit, then (in practice) a sale.
    const fromHome = homeV > 0 ? Math.min(rest - fromSavings, Math.max(0, homeV - debtGrown)) : 0;
    const family = rest - fromSavings - fromHome + topUp;
    const cashEnd = cashGrown - fromSavings, debtEnd = debtGrown + fromHome;
    weeks.push({ w, year, fee, income, council, fixedPublic: fx, cashStart, cashGrown, debtStart, debtGrown, home: homeV, capital, selfFund, tariff, contribution, personDue, councilPays, topUp, fromIncome, fromSavings, fromHome, family, cashEnd, debtEnd });
    cPrev = cashEnd; dPrev = debtEnd;
  }
  const years: UkYear[] = [];
  for (let y = 0; y < WEEKS / 52; y++) {
    const ws = weeks.slice(y * 52, y * 52 + 52);
    const sum = (f: (x: UkWeek) => number) => ws.reduce((t, x) => t + f(x), 0);
    years.push({ year: y + 1, fee: sum((x) => x.fee), fromIncome: sum((x) => x.fromIncome), fromSavings: sum((x) => x.fromSavings), fromHome: sum((x) => x.fromHome),
      publicHelp: sum((x) => x.fixedPublic + x.councilPays), family: sum((x) => x.family), savingsEnd: ws[51].cashEnd, debtEnd: ws[51].debtEnd });
  }
  const tot = (k: keyof UkYear) => years.reduce((t, y) => t + (y[k] as number), 0);
  const first = meansTested ? weeks.find((x) => x.selfFund === 0) : undefined;
  return {
    rules: n, weeks, years,
    councilWeek: first ? first.w : null,
    atCouncil: first ? { tariff: first.tariff, contribution: first.personDue, councilPays: first.councilPays, topUp: first.topUp } : null,
    fixedPublicNow: weeks[0].fixedPublic,
    totals: { fee: tot('fee'), fromIncome: tot('fromIncome'), fromSavings: tot('fromSavings'), fromHome: tot('fromHome'), publicHelp: tot('publicHelp'), family: tot('family') },
  };
}

export const UK_DEFAULT: UkInput = {
  nation: 'england', careType: 'residential', fee: 1300, councilRate: 1000, savings: 60000, homeEquity: 0, homeDisregarded: false, income: 350,
  personalShare: 100, feeInflation: 4, incomeGrowth: 3, savingsGrowth: 2, homeGrowth: 0, dpaRate: 0,
};
