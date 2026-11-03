/**
 * Ireland Help to Buy (HTB) and First Home Scheme (FHS): pure calculation logic.
 * HTB rules read on revenue.ie on 2026-11-03 ("How much can you claim?", "Who can claim HTB?",
 * "What is a qualifying property?") and in Tax and Duty Manual Part 15-01-46; Budget 2027 change
 * confirmed by citizensinformation.ie (updated 12 October 2026) and gov.ie (Finance (No.2) Bill 2026):
 *  - lesser of €35,000, 10% of the purchase value (or approved valuation for self-builds), or income tax
 *    plus DIRT paid in the 4 tax years before the application, for contracts signed (self-build: first
 *    mortgage drawdown) from 7 October 2026 to 31 December 2029; €30,000 from 23 July 2020 to 6 October 2026;
 *    €20,000 or 5% from 1 January 2017 to 22 July 2020. The cap is per property, however many buyers.
 *  - purchase value or approved valuation €500,000 or less; mortgage at least 70% of it, and First Home
 *    Scheme equity does not count toward the 70%. New builds (or self-builds) only, first-time buyers only.
 * FHS rules read on firsthomescheme.ie on 2026-11-03 ("Eligibility", "Property Price Ceilings", "Service Charges"):
 *  - up to 30% of the price or build cost, 20% when HTB is used; minimum share 2.5% or €10,000, whichever is higher;
 *  - at least a 10% deposit (HTB counts as deposit), price at or under the local authority ceiling;
 *  - service charge 0% years 0-5, 1.75% years 6-15, 2.15% years 16-29, 2.85% from year 30, on the
 *    original price × equity share.
 * Out of scope (said on the page): joint-assessment splits after separation, the Local Authority Affordable
 * Purchase / Starter Home schemes, the Tenant Home Purchase product, stamp duty and fees.
 */
export const HTB_CHANGE = '2026-10-07';
export const HTB_ENHANCED_START = '2020-07-23';
export const HTB_END = '2029-12-31';
export const HTB_CAP = 35000;
export const HTB_CAP_ENHANCED = 30000;
export const HTB_CAP_ORIGINAL = 20000;
export const HTB_RATE = 0.10;
export const HTB_RATE_ORIGINAL = 0.05;
export const HTB_PRICE_LIMIT = 500000;
export const HTB_MIN_LTV = 0.70;
export const FHS_MAX = 0.30;
export const FHS_MAX_WITH_HTB = 0.20;
export const FHS_MIN_SHARE = 0.025;
export const FHS_MIN_AMOUNT = 10000;
export const MIN_DEPOSIT = 0.10;
/** FHS service charge per year of the equity facility (rate applies from the start of that year band). */
export const FHS_SERVICE_CHARGE = [
  { fromYear: 1, rate: 0 },
  { fromYear: 6, rate: 0.0175 },
  { fromYear: 16, rate: 0.0215 },
  { fromYear: 30, rate: 0.0285 },
] as const;

export type BuildType = 'new' | 'self';
export type PropertyType = 'house' | 'apartment';

/** FHS ceilings by local authority area: [house, apartment, self-build]. */
export const FHS_CEILINGS: Record<string, [number, number, number]> = {
  'Carlow County': [375000, 375000, 375000],
  'Cavan County': [375000, 375000, 375000],
  'Clare County': [400000, 400000, 400000],
  'Cork City': [500000, 500000, 500000],
  'Cork County': [450000, 450000, 450000],
  'Donegal County': [400000, 400000, 400000],
  'Dublin City': [500000, 500000, 500000],
  'Dún Laoghaire-Rathdown': [500000, 500000, 500000],
  'Fingal': [500000, 500000, 500000],
  'South Dublin': [500000, 500000, 500000],
  'Galway City': [475000, 475000, 475000],
  'Galway County': [450000, 450000, 450000],
  'Kerry County': [425000, 425000, 425000],
  'Kildare County': [475000, 475000, 475000],
  'Kilkenny County': [400000, 400000, 400000],
  'Laois County': [400000, 400000, 400000],
  'Leitrim County': [400000, 400000, 400000],
  'Limerick City and County': [450000, 450000, 450000],
  'Longford County': [375000, 375000, 375000],
  'Louth County': [425000, 425000, 425000],
  'Mayo County': [425000, 425000, 425000],
  'Meath County': [475000, 475000, 475000],
  'Monaghan County': [375000, 375000, 375000],
  'Offaly County': [375000, 375000, 375000],
  'Roscommon County': [400000, 400000, 400000],
  'Sligo County': [400000, 400000, 400000],
  'Tipperary County': [375000, 375000, 375000],
  'Waterford City and County': [400000, 450000, 400000],
  'Westmeath County': [400000, 400000, 400000],
  'Wexford County': [400000, 400000, 400000],
  'Wicklow County': [500000, 500000, 500000],
};

export interface HtbInput {
  /** Purchase value of a new build, or the lender's approved valuation for a self-build (site included). */
  price: number;
  /** Income tax plus DIRT paid in the 4 tax years before the application (all buyers together). */
  taxPaid: number;
  mortgage: number;
  /** Contract date (self-build: first mortgage drawdown). Defaults to the current rules. */
  contractDate?: string;
}

export interface HtbResult {
  refund: number;
  cap: number;
  rate: number;
  eligible: boolean;
  /** Which limit set the refund: the cap, the % of price, or the tax paid. */
  limitedBy: 'cap' | 'price' | 'tax' | 'none';
  ltv: number;
  reasons: string[];
}

export interface IeHomeInput extends HtbInput {
  buildType: BuildType;
  propertyType?: PropertyType;
  /** Local authority area, a key of FHS_CEILINGS. */
  area: string;
  /** Your own savings for the deposit. */
  savings: number;
  useHtb?: boolean;
  useFhs?: boolean;
}

export interface IeHomeResult {
  htb: HtbResult;
  fhs: {
    eligible: boolean;
    amount: number;
    share: number;
    max: number;
    min: number;
    ceiling: number;
    /** Annual service charge in years 6-15, with no buy-back. */
    chargeYear6: number;
    reasons: string[];
  };
  /** Price − mortgage − HTB: what savings and FHS must cover. */
  gap: number;
  /** Savings you put in (never more than you have). */
  savingsUsed: number;
  /** The least savings that would make the purchase work with the schemes. */
  cashNeeded: number;
  /** More savings still needed (0 when the numbers work). */
  stillNeeded: number;
  /** Savings left over after the deposit. */
  savingsLeft: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const round2 = (v: number) => Math.round(v * 100) / 100;
const eur = (v: number) => `€${Math.round(v).toLocaleString('en-IE')}`;

export function htbRules(contractDate?: string): { cap: number; rate: number } {
  if (!contractDate || contractDate >= HTB_CHANGE) return { cap: HTB_CAP, rate: HTB_RATE };
  if (contractDate >= HTB_ENHANCED_START) return { cap: HTB_CAP_ENHANCED, rate: HTB_RATE };
  return { cap: HTB_CAP_ORIGINAL, rate: HTB_RATE_ORIGINAL };
}

export function computeHtb(i: HtbInput): HtbResult {
  const price = n(i.price);
  const tax = n(i.taxPaid);
  const mortgage = n(i.mortgage);
  const { cap, rate } = htbRules(i.contractDate);
  const ltv = price > 0 ? mortgage / price : 0;
  const reasons: string[] = [];
  if (i.contractDate && i.contractDate > HTB_END) reasons.push('Help to Buy ends on 31 December 2029.');
  if (price > HTB_PRICE_LIMIT) reasons.push(`The price is over the ${eur(HTB_PRICE_LIMIT)} Help to Buy limit.`);
  if (price > 0 && ltv < HTB_MIN_LTV) reasons.push(`The mortgage is ${Math.round(ltv * 1000) / 10}% of the price; Help to Buy needs at least 70% (First Home Scheme equity does not count).`);
  if (tax <= 0) reasons.push('No income tax or DIRT paid in the last 4 years, so there is nothing to refund.');
  const eligible = price > 0 && reasons.length === 0;
  const byPrice = price * rate;
  const refund = eligible ? Math.min(cap, byPrice, tax) : 0;
  const limitedBy = !eligible ? 'none' : refund === tax && tax < Math.min(cap, byPrice) ? 'tax' : refund === byPrice && byPrice < cap ? 'price' : 'cap';
  return { refund: round2(refund), cap, rate, eligible, limitedBy, ltv: round2(ltv * 100) / 100, reasons };
}

/** Income tax deemed paid by one spouse in a jointly assessed year: A × C ÷ B (TDM 15-01-46, 13.1),
 *  rounded down to the euro as in Example 13.3 (3,954.5 → 3,954). */
export function jointShare(ownIncome: number, coupleIncome: number, taxPaid: number): number {
  return coupleIncome > 0 ? Math.floor((n(ownIncome) * n(taxPaid)) / n(coupleIncome)) : 0;
}

export function fhsCeiling(area: string, buildType: BuildType, propertyType: PropertyType = 'house'): number {
  const row = FHS_CEILINGS[area];
  if (!row) return 0;
  return buildType === 'self' ? row[2] : propertyType === 'apartment' ? row[1] : row[0];
}

export function serviceChargeRate(year: number): number {
  let rate = 0;
  for (const b of FHS_SERVICE_CHARGE) if (year >= b.fromYear) rate = b.rate;
  return rate;
}

/** Annual FHS service charge: original price × equity share × the rate for that year. */
export function serviceCharge(price: number, share: number, year: number): number {
  return round2(n(price) * n(share) * serviceChargeRate(year));
}

export function computeIeHome(i: IeHomeInput): IeHomeResult {
  const price = n(i.price);
  const mortgage = n(i.mortgage);
  const savings = n(i.savings);
  const useHtb = i.useHtb ?? true;
  const useFhs = i.useFhs ?? true;
  const htbFull = computeHtb(i);
  const htb = useHtb ? htbFull : { ...htbFull, refund: 0, eligible: false, limitedBy: 'none' as const, reasons: ['Not used.'] };
  const htbAmt = htb.refund;
  const gap = Math.max(0, price - mortgage - htbAmt);
  const minCash = Math.max(0, price * MIN_DEPOSIT - htbAmt);

  const ceiling = fhsCeiling(i.area, i.buildType, i.propertyType);
  const max = price * (htbAmt > 0 ? FHS_MAX_WITH_HTB : FHS_MAX);
  const min = Math.max(price * FHS_MIN_SHARE, FHS_MIN_AMOUNT);
  const reasons: string[] = [];
  if (!useFhs) reasons.push('Not used.');
  else {
    if (!ceiling) reasons.push('Choose the local authority area.');
    else if (price > ceiling) reasons.push(`The price is over the ${eur(ceiling)} First Home Scheme ceiling for this area and property type.`);
    if (max < min) reasons.push(`The price is too low for the ${eur(FHS_MIN_AMOUNT)} minimum equity share.`);
  }
  const fhsOpen = price > 0 && reasons.length === 0;
  // FHS fills what is left after the mortgage, HTB and your savings, on top of a 10% deposit
  // (savings + HTB). Below that deposit, the estimate assumes you save up to it first.
  const wanted = Math.max(0, gap - Math.max(savings, minCash));
  let amount = 0;
  if (fhsOpen && wanted >= min) amount = Math.min(max, wanted);
  else if (fhsOpen && wanted > 0 && gap - min >= minCash) amount = min;
  if (fhsOpen && wanted === 0) reasons.push('Not needed: your mortgage, Help to Buy and savings already cover the price.');
  else if (fhsOpen && amount === 0) reasons.push(`The gap is below the ${eur(min)} minimum equity share.`);
  const cashNeeded = Math.max(minCash, gap - (fhsOpen && gap - minCash >= min ? max : 0));
  const savingsUsed = Math.min(savings, Math.max(0, gap - amount));
  const stillNeeded = Math.max(0, gap - amount - savings);
  const share = price > 0 ? amount / price : 0;
  return {
    htb,
    fhs: {
      eligible: fhsOpen,
      amount: round2(amount),
      share: Math.round(share * 10000) / 10000,
      max: round2(max),
      min: round2(min),
      ceiling,
      chargeYear6: serviceCharge(price, share, 6),
      reasons,
    },
    gap: round2(gap),
    savingsUsed: round2(savingsUsed),
    cashNeeded: round2(cashNeeded),
    stillNeeded: round2(stillNeeded),
    savingsLeft: round2(Math.max(0, savings - savingsUsed)),
  };
}
