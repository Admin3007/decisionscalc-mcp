/**
 * Irish tax on residential rental income (Case V) for an individual landlord: pure calculation logic.
 * Rules read on the official pages on 2026-11-03:
 *  - revenue.ie "Irish rental income" (published 5 Dec 2025): net rental income = rent less allowable expenses
 *    (rates, insurance, maintenance and repairs, management fees, services you pay for, RTB registration,
 *    capital allowances); mortgage interest on a loan to buy, improve or repair the property is deductible in
 *    full only while the tenancy is registered with the RTB; wear and tear on furniture and appliances is 12.5%
 *    of cost a year for 8 years; the profit is added to your other income and taxed at your marginal rate.
 *  - revenue.ie RPRIR "How much can you claim": relief of €1,000 in 2026 and 2027 (€800 in 2025), capped at
 *    20% of Case V profit after capital allowances and losses carried forward; one relief a year.
 *  - revenue.ie USC "Standard rates" (2026 bands) and "Other rates": 3% surcharge on non-PAYE income above
 *    €100,000. Income tax bands and credits for 2026 and 2027 (Budget 2027): ./ie-budget-2027.ts.
 *  - citizensinformation.ie "Social insurance" + gov.ie "PRSI Class K Rates": an employee under 66 whose
 *    unearned income is over €5,000 pays PRSI on all of it at 4.2% to 30 September 2026, 4.35% from
 *    1 October 2026 (4.5% from 1 October 2027 under the PRSI roadmap); prorated by month for the tax year.
 * Not modelled: Rent-a-Room relief (a separate exemption up to €14,000, €16,000 from 2027), pre-letting
 * expenses, the retrofitting deduction, non-resident landlord withholding, companies.
 */
import { RULES, uscFor, type Year } from './ie-budget-2027';
import { incomeTaxFor as incomeTax, type TaxStatus } from './ie-income-tax';

export type LandlordStatus = TaxStatus;
export const WEAR_AND_TEAR = 0.125;
export const PRSI_UNEARNED_MIN = 5000;
export const USC_SURCHARGE = { over: 100000, rate: 0.03 };
export const RPRIR: Record<Year, number> = { 2026: 1000, 2027: 1000 };
export const RPRIR_SHARE = 0.2;

export interface LandlordInput {
  year: Year;
  status: LandlordStatus;
  /** Your gross pay from employment (PAYE) a year, EUR. */
  pay: number;
  /** Married, two incomes: your spouse's gross pay, EUR (for the rate band). */
  spousePay?: number;
  /** Gross rent received in the year (your share if you own it jointly), EUR. */
  rent: number;
  /** Mortgage interest for the year (not capital repayments), EUR. */
  mortgageInterest: number;
  /** Tenancy registered with the RTB (needed for the interest deduction and the relief). */
  rtbRegistered: boolean;
  /** Other allowable expenses: insurance, repairs, maintenance, management fees, RTB fee, EUR. */
  otherExpenses: number;
  /** Cost of furniture and appliances bought in the last 8 years, EUR (12.5% a year). */
  furnishings: number;
  /** Rental losses carried forward from earlier years, EUR. */
  lossesForward?: number;
  /** 66 or older (no PRSI). */
  over66?: boolean;
}

export interface LandlordResult {
  rent: number;
  interestAllowed: number;
  wearAndTear: number;
  expenses: number;
  profit: number;
  lossUsed: number;
  lossCarried: number;
  incomeTax: number;
  rprir: number;
  usc: number;
  prsi: number;
  totalTax: number;
  /** Rent less expenses and tax (before mortgage capital repayments). */
  keep: number;
  /** Tax as a share of the profit, %. */
  effectiveRate: number;
  /** Tax on the next €100 of profit, %. */
  marginalRate: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

/** PRSI rate for the year, prorated by month (Class K/S change each 1 October). */
export function unearnedPrsiRate(year: Year): number {
  return RULES[year].prsi.reduce((s, [months, rate]) => s + rate * months / 12, 0);
}

function taxOn(i: LandlordInput, profit: number) {
  const pay = n(i.pay), spouse = i.status === 'married-two' ? n(i.spousePay) : 0;
  const base = incomeTax(i.year, i.status, pay, spouse, 0);
  const withRent = incomeTax(i.year, i.status, pay, spouse, profit);
  const it = withRent - base;
  const rprir = i.rtbRegistered ? Math.min(RPRIR[i.year], RPRIR_SHARE * profit, withRent) : 0;
  const usc = uscFor(pay + profit, i.year) - uscFor(pay, i.year) + USC_SURCHARGE.rate * Math.max(0, profit - USC_SURCHARGE.over);
  const prsi = !i.over66 && profit > PRSI_UNEARNED_MIN ? profit * unearnedPrsiRate(i.year) : 0;
  return { it, rprir, usc, prsi, total: it - rprir + usc + prsi };
}

export function computeLandlord(i: LandlordInput): LandlordResult {
  const rent = n(i.rent);
  const interestAllowed = i.rtbRegistered ? n(i.mortgageInterest) : 0;
  const wearAndTear = r2(WEAR_AND_TEAR * n(i.furnishings));
  const expenses = r2(interestAllowed + n(i.otherExpenses) + wearAndTear);
  const beforeLosses = rent - expenses;
  const lossesForward = n(i.lossesForward);
  const lossUsed = Math.min(lossesForward, Math.max(0, beforeLosses));
  const profit = r2(Math.max(0, beforeLosses - lossUsed));
  const lossCarried = r2(lossesForward - lossUsed + Math.max(0, -beforeLosses));
  const t = taxOn(i, profit);
  const next = taxOn(i, profit + 100);
  const totalTax = r2(t.total);
  return {
    rent, interestAllowed, wearAndTear, expenses, profit, lossUsed: r2(lossUsed), lossCarried,
    incomeTax: r2(t.it), rprir: r2(t.rprir), usc: r2(t.usc), prsi: r2(t.prsi), totalTax,
    keep: r2(rent - n(i.mortgageInterest) - n(i.otherExpenses) - totalTax),
    effectiveRate: profit > 0 ? r2((totalTax / profit) * 100) : 0,
    marginalRate: r2(next.total - t.total),
  };
}
