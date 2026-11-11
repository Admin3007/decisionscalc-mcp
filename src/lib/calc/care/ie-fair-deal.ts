/**
 * Ireland: the Nursing Homes Support Scheme (Fair Deal), week by week: the person's contribution (80% of assessable
 * income and 7.5% a year of assets over €36,000; a couple 40% of combined income and 3.75% of combined assets over
 * €72,000), the home counted for 3 years only, the optional Nursing Home Loan on the home's share, what the HSE pays,
 * and what is left for the family. The Care Costs Planner's Irish edition runs the same rules as formulas.
 *
 * Read 9 Nov 2026 (decisionscalc-apps radar/decisionscalc/CARE-COSTS-FACTS-2026-11.md):
 *  - HSE financial assessment page: 80% income, 7.5% of cash and non-cash assets, first €36,000 exempt; couples 40%,
 *    3.75%, €72,000; assets transferred in the 5 years before the first application are included.
 *  - HSE 3-year cap: the home counts for 3 years (22.5% in total; 11.25% for a couple with one in care). A farm or business
 *    gets the same cap only on application (part 6 of the form): a family successor (18+, partner or relative) appointed by
 *    the HSE commits to run it for 6 years, it was actively worked for 3 of the 5 years before care, and the HSE takes a
 *    charge on it. The cap runs from the successor's appointment (no backdating); without it the farm counts every year.
 *    Modelled: farmCap = successor appointed when care starts. Farm and home are land, so the Nursing Home Loan can defer
 *    their share.
 *  - Citizens Information: the person keeps 20% of income or 20% of the maximum State Pension (Non-Contributory),
 *    whichever is more; a spouse at home keeps 50% of the couple's income or the maximum State Pension
 *    (Non-Contributory), whichever is more. The HSE pays the cost of care less the person's contribution.
 *  - HSE Nursing Home Loan: defers the contribution on land and property; repaid to Revenue within 18 months of death
 *    (from 5 Sep 2026), CPI-adjusted.
 * The 2026 maximum State Pension (Non-Contributory) was not verified: it is an input (0 = the 20%-of-income floor).
 * Model: contributions are worked out each week from the savings left (in practice the HSE reviews on request).
 */

export const FAIR_DEAL = {
  incomeRate: 0.8, assetRate: 0.075, disregard: 36000,
  coupleIncomeRate: 0.4, coupleAssetRate: 0.0375, coupleDisregard: 72000,
  capWeeks: 156, keepIncome: 0.2, spouseIncome: 0.5,
} as const;

export const IE_CARE_SOURCES = {
  assessment: 'https://www2.hse.ie/services/schemes-allowances/fair-deal-scheme/financial-assessment/',
  cap: 'https://www2.hse.ie/services/schemes-allowances/fair-deal-scheme/3-year-cap/',
  loan: 'https://www2.hse.ie/services/schemes-allowances/fair-deal-scheme/nursing-home-loan/',
  ci: 'https://www.citizensinformation.ie/en/health/health-services/health-services-for-older-people/fair-deal-scheme/',
};

export const IE_WEEKS = 780;

export interface IeInput {
  /** Spouse or partner still at home (assessed as a couple). */
  couple: boolean;
  /** The nursing home's agreed weekly price. */
  cost: number;
  /** Extra charges a week not covered by Fair Deal (activities, hairdressing, etc.). */
  extras: number;
  /** Assessable weekly income (combined for a couple). */
  income: number;
  /** Savings and other non-home assets (combined for a couple). */
  savings: number;
  /** Value of the home (principal residence) less any mortgage. */
  homeEquity: number;
  /** Farm or business assets (value less debts), counted like other assets. */
  farm?: number;
  /** A family successor is appointed when care starts, so the farm/business counts for 3 years only. */
  farmCap?: boolean;
  useLoan: boolean;
  /** Maximum State Pension (Non-Contributory) a week; 0 = use the 20%-of-income floor only. */
  spnc: number;
  costInflation: number;
  incomeGrowth: number;
  savingsGrowth: number;
  /** CPI uplift on the Nursing Home Loan, % a year. */
  cpi: number;
}

export interface IeWeek {
  w: number; year: number; cost: number; extras: number; income: number; cashStart: number; cashGrown: number; loanStart: number; loanGrown: number;
  home: number; farm: number; assetC: number; homePart: number; incomeC: number; contribution: number; incomePaid: number; homePaid: number;
  toLoan: number; cashDue: number; fromSavings: number; unpaid: number; hse: number; extrasFromIncome: number; family: number; cashEnd: number; loanEnd: number;
}
export interface IeYear { year: number; cost: number; extras: number; contribution: number; fromIncome: number; fromSavings: number; toLoan: number; hse: number; family: number; savingsEnd: number; loanEnd: number }

export function incomeContribution(couple: boolean, income: number, spnc: number): number {
  const inc = Math.max(0, income);
  return couple
    ? Math.max(0, inc - Math.max(FAIR_DEAL.spouseIncome * inc, spnc) - Math.max(FAIR_DEAL.keepIncome / 2 * inc, FAIR_DEAL.keepIncome * spnc))
    : Math.max(0, inc - Math.max(FAIR_DEAL.keepIncome * inc, FAIR_DEAL.keepIncome * spnc));
}

export function projectIE(i: IeInput) {
  const rate = i.couple ? FAIR_DEAL.coupleAssetRate : FAIR_DEAL.assetRate;
  const dis = i.couple ? FAIR_DEAL.coupleDisregard : FAIR_DEAL.disregard;
  const gw = Math.pow(1 + i.savingsGrowth / 100, 1 / 52);
  const lw = Math.pow(1 + i.cpi / 100, 1 / 52);
  const weeks: IeWeek[] = [];
  let cPrev = Math.max(0, i.savings), lPrev = 0;
  for (let w = 0; w < IE_WEEKS; w++) {
    const year = Math.floor(w / 52);
    const cost = i.cost * Math.pow(1 + i.costInflation / 100, year);
    const extras = i.extras * Math.pow(1 + i.costInflation / 100, year);
    const income = i.income * Math.pow(1 + i.incomeGrowth / 100, year);
    const cashStart = cPrev, cashGrown = cashStart * gw, loanStart = lPrev, loanGrown = loanStart * lw;
    const home = w < FAIR_DEAL.capWeeks ? Math.max(0, i.homeEquity) : 0;
    const farmV = Math.max(0, Number(i.farm) || 0);
    const farm = i.farmCap && w >= FAIR_DEAL.capWeeks ? 0 : farmV;
    const assetC = rate / 52 * Math.max(0, cashGrown + home + farm - dis);
    const homePart = Math.min(assetC, rate / 52 * (home + farm));
    const incomeC = incomeContribution(i.couple, income, i.spnc);
    const contribution = Math.min(cost, incomeC + assetC);
    const incomePaid = Math.min(incomeC, cost);
    const assetPaid = contribution - incomePaid;
    const homePaid = Math.min(homePart, assetPaid);
    const toLoan = i.useLoan ? homePaid : 0;
    const cashDue = assetPaid - toLoan;
    const fromSavings = Math.min(cashGrown, cashDue);
    const unpaid = cashDue - fromSavings;
    const hse = cost - contribution;
    const keep = income - incomePaid - (i.couple ? Math.max(FAIR_DEAL.spouseIncome * income, i.spnc) : 0);
    const extrasFromIncome = Math.min(extras, Math.max(0, keep));
    const family = unpaid + extras - extrasFromIncome;
    const cashEnd = cashGrown - fromSavings, loanEnd = loanGrown + toLoan;
    weeks.push({ w, year, cost, extras, income, cashStart, cashGrown, loanStart, loanGrown, home, farm, assetC, homePart, incomeC, contribution, incomePaid, homePaid, toLoan, cashDue, fromSavings, unpaid, hse, extrasFromIncome, family, cashEnd, loanEnd });
    cPrev = cashEnd; lPrev = loanEnd;
  }
  const years: IeYear[] = [];
  for (let y = 0; y < IE_WEEKS / 52; y++) {
    const ws = weeks.slice(y * 52, y * 52 + 52);
    const sum = (f: (x: IeWeek) => number) => ws.reduce((t, x) => t + f(x), 0);
    years.push({ year: y + 1, cost: sum((x) => x.cost), extras: sum((x) => x.extras), contribution: sum((x) => x.contribution), fromIncome: sum((x) => x.incomePaid + x.extrasFromIncome),
      fromSavings: sum((x) => x.fromSavings), toLoan: sum((x) => x.toLoan), hse: sum((x) => x.hse), family: sum((x) => x.family), savingsEnd: ws[51].cashEnd, loanEnd: ws[51].loanEnd });
  }
  const tot = (k: keyof IeYear) => years.reduce((t, y) => t + (y[k] as number), 0);
  return {
    weeks, years,
    now: { contribution: weeks[0].contribution, incomeC: weeks[0].incomeC, assetC: weeks[0].assetC, hse: weeks[0].hse },
    afterCap: { contribution: weeks[FAIR_DEAL.capWeeks].contribution, hse: weeks[FAIR_DEAL.capWeeks].hse },
    loanAtEnd: weeks[IE_WEEKS - 1].loanEnd,
    totals: { cost: tot('cost'), extras: tot('extras'), contribution: tot('contribution'), fromSavings: tot('fromSavings'), toLoan: tot('toLoan'), hse: tot('hse'), family: tot('family') },
  };
}
export type IeResult = ReturnType<typeof projectIE>;

export const IE_DEFAULT: IeInput = {
  couple: false, cost: 1400, extras: 40, income: 330, savings: 80000, homeEquity: 300000, useLoan: true, spnc: 0,
  costInflation: 3, incomeGrowth: 2, savingsGrowth: 1, cpi: 2,
};
