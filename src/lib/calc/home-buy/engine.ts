/**
 * Home Buying Planner engine: one household, one home, five countries. The spreadsheet
 * (scripts/gen-home-buying-planner.mjs) runs the same steps as formulas; tests/contracts/home-buying-planner.test.ts
 * recalculates the file in HyperFormula and compares it with this engine, figure by figure.
 *
 *  1. Upfront: deposit, purchase tax (the free calculators' own modules, with first-time buyer relief), fees, mortgage
 *     insurance (CA CMHC exact; AU LMI and US PMI are estimates the buyer can change), government help paid at purchase
 *     (IE Help to Buy, AU First Home Owner Grant, CA first-time buyers' GST rebate on a new home) -> cash needed.
 *  2. Deposit plan: month by month, savings growth plus any scheme bonus (UK Lifetime ISA 25%, CA FHSA tax refund) until
 *     the savings reach the cash needed (CA: less what the Home Buyers' Plan takes from RRSPs).
 *  3. Affordability: the repayment and each country's lender test (US 28/36 rule of thumb, CA stress test with GDS/TDS,
 *     AU 3-point buffer, IE Central Bank income multiple, UK 4.5x typical).
 *  4. Owning vs renting, 30 years: the rent-vs-buy calculator's model (src/lib/calc/rent-vs-buy.ts) with the planner's
 *     own running costs, mortgage term and PMI; break-even = first year buying costs less.
 */
import { computeSdlt } from '../uk-stamp-duty.ts';
import { computeLbtt } from '../scotland-lbtt.ts';
import { computeLtt } from '../wales-ltt.ts';
import { landTransferTax, type Province } from '../ca-land-transfer.ts';
import { transferDuty, schedule, type AuState } from '../au-transfer-duty.ts';
import { US, US_STATES, GB, HMLR, CA, CMHC, AU, FHOG, DEPOSIT5, IE, IE_STAMP, IE_REGISTRY, LPT, type Edition } from './rules.ts';

export const MONTHS = 240;   // the deposit plan looks 20 years ahead
export const YEARS = 30;     // owning vs renting

export interface PlanInput {
  edition: Edition;
  region: string;             // US state code, GB nation, CA province code, AU state; IE: ''
  price: number;
  firstTime: boolean;
  newBuild: boolean;
  depositPct: number;         // % of the price
  buyers: number;             // 1 or 2 (FHSA, LISA and HBP limits are per person)
  savings: number; monthlySaving: number; savingsRate: number;   // savings growth, % a year
  income1: number; income2: number; debts: number;              // gross a year; other debt repayments a month
  rate: number; term: number;                                   // mortgage % a year, years
  rent: number; rentGrowth: number; priceGrowth: number; investReturn: number; sellCostPct: number;
  legal: number; survey: number; lenderFees: number; moving: number; furniture: number;
  insurance: number; maintPct: number; hoa: number;             // a year; % of price a year; a month
  /** US: property tax % (blank = state average); CA: property tax %; GB: council tax a year (blank = average);
   *  AU: council rates a year; IE: local adjustment factor % on LPT. */
  propTax?: number;
  pmiPct?: number;            // US: PMI % of the loan a year
  lisaMonthly?: number;       // GB: paid into Lifetime ISAs each month (part of the monthly saving)
  fhsaAnnual?: number; marginalRate?: number; hbp?: number; heating?: number;   // CA
  capital?: boolean; useScheme?: boolean; lmiPct?: number;      // AU
  taxPaid?: number;           // IE: income tax + DIRT paid in the last 4 years (Help to Buy)
}

export interface YearRow { year: number; ownCost: number; rentYear: number; balance: number; value: number; netBuy: number; netRent: number; pmi: number }
export interface MonthRow { month: number; bonus: number; balance: number; ready: boolean }

const pmt = (loan: number, r: number, n: number) => (r === 0 ? loan / n : loan * r / (1 - (1 + r) ** -n));
const balanceAfter = (loan: number, r: number, n: number, k: number, pay: number) =>
  k >= n ? 0 : r === 0 ? loan - pay * k : Math.max(0, loan * (1 + r) ** k - pay * ((1 + r) ** k - 1) / r);

/** Purchase tax after first-time buyer relief, and its parts, by edition. */
export function purchaseTax(i: PlanInput): { tax: number; relief: number; registry: number } {
  const p = i.price;
  if (i.edition === 'us') return { tax: 0, relief: 0, registry: 0 };
  if (i.edition === 'gb') {
    const n = i.region;
    const full = n === 'Scotland' ? computeLbtt(p, 'standard').total : n === 'Wales' ? computeLtt(p, 'standard').total : computeSdlt(p, 'standard').total;
    const paid = n === 'Scotland' ? computeLbtt(p, i.firstTime ? 'firstTimeBuyer' : 'standard').total : n === 'Wales' ? full : computeSdlt(p, i.firstTime ? 'firstTimeBuyer' : 'standard').total;
    const registry = n === 'England' || n === 'Wales' ? schedule(p, HMLR) : 0;
    return { tax: paid, relief: full - paid, registry };
  }
  if (i.edition === 'ca') {
    const r = landTransferTax(p, i.region as Province, i.firstTime);
    return { tax: r.net, relief: r.rebate, registry: 0 };
  }
  if (i.edition === 'au') {
    const st = i.region as AuState;
    const full = transferDuty(p, st, false, { home: true }).duty;
    const paid = transferDuty(p, st, i.firstTime, { home: true, newHome: i.newBuild }).duty;
    return { tax: paid, relief: full - paid, registry: 0 };
  }
  const base = i.newBuild ? p / (1 + IE.vat) : p;
  return { tax: Math.round(schedule(base, IE_STAMP)), relief: 0, registry: schedule(p, IE_REGISTRY) };
}

export function computePlan(i: PlanInput) {
  const p = i.price, ed = i.edition;
  const deposit = p * i.depositPct / 100;
  const loanBase = p - deposit;
  const ltv = p > 0 ? Math.round(loanBase / p * 1e10) / 1e10 : 0;   // rounded like the sheet's ROUND(x,10): band edges must not depend on float noise
  const income = i.income1 + i.income2;

  // CA mortgage insurance: premium added to the loan, provincial sales tax on it paid in cash.
  let premium = 0, premiumRate = 0, premiumTax = 0;
  const minDeposit = ed === 'ca' ? (p >= CA.insuredMax ? p * CA.minUninsured : Math.min(p, CA.minFirst) * CA.minRate1 + Math.max(0, p - CA.minFirst) * CA.minRate2) : 0;
  if (ed === 'ca' && ltv > 0.8) {
    premiumRate = (CMHC.find(([to]) => ltv <= to)?.[1] ?? CMHC[CMHC.length - 1][1]) + (i.term > 25 ? CA.surcharge30 : 0);
    premium = loanBase * premiumRate;
    premiumTax = premium * (CA.pst[i.region] ?? 0);
  }
  const insurable = ed !== 'ca' || ltv <= 0.8 || (p < CA.insuredMax && deposit >= minDeposit - 1e-6);
  const loan = loanBase + premium;

  // AU: 5% Deposit Scheme (no LMI) or LMI estimate.
  const capRow = ed === 'au' ? DEPOSIT5[i.region as AuState] : undefined;
  const schemeCap = capRow ? (i.capital ? capRow[0] : capRow[1]) : 0;
  const schemeOk = ed === 'au' && !!i.useScheme && i.firstTime && i.depositPct >= AU.deposit5 * 100 && p <= schemeCap;
  const lmi = ed === 'au' && ltv > 0.8 && !schemeOk ? loanBase * (i.lmiPct ?? AU.lmiDefault) / 100 : 0;

  const t = purchaseTax(i);
  // Help paid at purchase
  let grant = 0;
  if (ed === 'au' && i.firstTime && i.newBuild) {
    const [amt, cap] = FHOG[i.region as AuState];
    if (cap === 0 || p <= cap) grant = amt;
  }
  if (ed === 'ie' && i.firstTime && i.newBuild && p <= IE.htbPrice && loanBase >= IE.htbLtv * p) grant = Math.min(IE.htbCap, IE.htbRate * p, i.taxPaid ?? 0);
  if (ed === 'ca' && i.firstTime && i.newBuild && p < CA.gstEnd) {
    const gst = p / (1 + CA.gstRate) * CA.gstRate;
    grant = Math.min(CA.gstMax, gst) * (p <= CA.gstFull ? 1 : (CA.gstEnd - p) / (CA.gstEnd - CA.gstFull));
  }
  const fees = i.legal + i.survey + i.lenderFees + t.registry;
  const closing = t.tax + fees + premiumTax + lmi;          // buying costs (the rent-vs-buy "closing" figure, before help)
  const upfront = closing + i.moving + i.furniture;
  const cashNeeded = deposit + upfront - grant;

  // Deposit plan
  const hbp = ed === 'ca' ? Math.min(i.hbp ?? 0, CA.hbp * i.buyers) : 0;
  const target = cashNeeded - hbp;
  const lisaOk = ed === 'gb' && i.firstTime && p <= GB.lisaPriceCap;
  const months: MonthRow[] = [];
  let bal = i.savings, cum = 0;
  let buyIn: number | null = bal >= target ? 0 : null;
  for (let m = 1; m <= MONTHS; m++) {
    let bonus = 0;
    if (lisaOk) bonus = GB.lisaBonus * Math.min(i.lisaMonthly ?? 0, i.monthlySaving, GB.lisaAnnual / 12 * i.buyers);
    if (ed === 'ca') {
      const c = Math.max(0, Math.min((i.fhsaAnnual ?? 0) / 12, i.monthlySaving, CA.fhsaLifetime * i.buyers - cum));
      cum += c;
      bonus = c * (i.marginalRate ?? 0) / 100;
    }
    bal = bal * (1 + i.savingsRate / 100 / 12) + i.monthlySaving + bonus;
    const ready = bal >= target;
    if (ready && buyIn === null) buyIn = m;
    months.push({ month: m, bonus, balance: bal, ready });
  }

  // Mortgage
  const r = i.rate / 100 / 12, n = Math.round(i.term * 12);
  const pi = loan > 0 ? pmt(loan, r, n) : 0;

  // Running costs (year 1)
  let propTax: number;
  if (ed === 'us') propTax = p * (i.propTax ?? US_STATES.find(([c]) => c === i.region)![2]) / 100;
  else if (ed === 'ca') propTax = p * (i.propTax ?? 0) / 100;
  else if (ed === 'gb') propTax = i.propTax ?? GB.councilTax[i.region];
  else if (ed === 'au') propTax = i.propTax ?? 0;
  else propTax = schedule(p, LPT) * (1 + (i.propTax ?? 0) / 100);
  const maint = p * i.maintPct / 100;
  // US PMI: while the scheduled balance is above 78% of the price (and to the loan's midpoint at most).
  let pmiMonths = 0;
  if (ed === 'us' && ltv > 0.8) {
    const stop = US.pmiStop * p;
    const k = r === 0 ? (loan - stop) / pi : Math.log((pi - stop * r) / (pi - loan * r)) / Math.log(1 + r);
    pmiMonths = Math.min(Math.ceil(k - 1e-9), Math.ceil(n / 2));
  }
  const pmiYear = (y: number) => (i.pmiPct ?? US.pmiDefault) / 100 * loan / 12 * Math.max(0, Math.min(12, pmiMonths - 12 * (y - 1)));
  const fixedYear = propTax + i.insurance + maint + i.hoa * 12;
  const ownMonthly = pi + (fixedYear + pmiYear(1)) / 12;

  // Owning vs renting (the rent-vs-buy model, corrected 9 Nov 2026): both start with the buyer's day-one cash and pay
  // out the same each year. The renter invests that cash and any year's excess of the buyer's outlay over rent; the
  // buyer invests rent's excess over the outlay. Net cost = money paid out less what the household has at the end.
  const years: YearRow[] = [];
  const start = deposit + closing - grant, g = 1 + i.investReturn / 100;
  let buyOut = start, rentTotal = 0, pot = start, paidIn = 0, buyerPot = 0, buyerPaidIn = 0, breakEven: number | null = null;
  for (let y = 1; y <= YEARS; y++) {
    const paid = Math.max(0, Math.min(12, n - 12 * (y - 1)));
    const pmi = pmiYear(y);
    const ownCost = pi * paid + fixedYear + pmi;
    buyOut += ownCost;
    const balance = balanceAfter(loan, r, n, 12 * y, pi);
    const value = p * (1 + i.priceGrowth / 100) ** y;
    const rentYear = i.rent * 12 * (1 + i.rentGrowth / 100) ** (y - 1);
    rentTotal += rentYear;
    const toRenter = Math.max(0, ownCost - rentYear), toBuyer = Math.max(0, rentYear - ownCost);
    paidIn += toRenter; buyerPaidIn += toBuyer;
    pot = (pot + toRenter) * g;
    buyerPot = (buyerPot + toBuyer) * g;
    const netBuy = buyOut - (value - balance - value * i.sellCostPct / 100) - (buyerPot - buyerPaidIn);
    const netRent = rentTotal + paidIn + start - pot;
    if (breakEven === null && netBuy < netRent) breakEven = y;
    years.push({ year: y, ownCost, rentYear, balance, value, netBuy, netRent, pmi });
  }

  // Affordability
  const mi = income / 12;
  const aff: Record<string, number> = {};
  if (ed === 'us') {
    // PITI + HOA + PMI: lenders leave maintenance out
    const other = (propTax + i.insurance + pmiYear(1)) / 12 + i.hoa;
    const housing = pi + other;
    aff.front = mi > 0 ? housing / mi : 0;
    aff.back = mi > 0 ? (housing + i.debts) / mi : 0;
    const maxPi = Math.max(0, Math.min(US.front * mi - other, US.back * mi - i.debts - other));
    aff.maxLoan = r === 0 ? maxPi * n : maxPi * (1 - (1 + r) ** -n) / r;
  } else if (ed === 'ca') {
    const q = Math.max(i.rate + CA.mqrBuffer, CA.mqrFloor);
    aff.qualRate = q;
    aff.qualPayment = loan > 0 ? pmt(loan, q / 100 / 12, n) : 0;
    const gdsCost = aff.qualPayment + propTax / 12 + (i.heating ?? 0) + CA.condoShare * i.hoa;
    aff.gds = mi > 0 ? gdsCost / mi : 0;
    aff.tds = mi > 0 ? (gdsCost + i.debts) / mi : 0;
  } else if (ed === 'au') {
    aff.assessRate = i.rate + AU.buffer;
    aff.assessPayment = loan > 0 ? pmt(loan, aff.assessRate / 100 / 12, n) : 0;
    aff.share = mi > 0 ? aff.assessPayment / mi : 0;
    aff.dti = income > 0 ? loan / income : 0;
  } else {
    const mult = ed === 'ie' ? (i.firstTime ? IE.ltiFirst : IE.ltiSecond) : GB.lti;
    aff.mult = mult;
    aff.lti = income > 0 ? loan / income : 0;
    aff.maxLoan = mult * income;
  }

  return {
    deposit, loanBase, loan, ltv, minDeposit, insurable, premium, premiumRate, premiumTax, lmi, schemeOk, schemeCap,
    tax: t.tax, relief: t.relief, registry: t.registry, fees, grant, closing, upfront, cashNeeded,
    hbp, target, months, buyIn, pi, propTax, maint, fixedYear, pmiMonths, pmi1: pmiYear(1), ownMonthly, years, breakEven, aff,
  };
}
export type PlanResult = ReturnType<typeof computePlan>;
