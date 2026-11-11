/**
 * "Sell or keep my rental? (Ireland)": pure calculation logic, shared by the free calculator
 * (/tools/ireland-sell-or-keep-rental-calculator/) and the Irish Landlord Planner spreadsheet
 * (scripts/gen-landlord-planner.mjs, recalculated against this file in tests/contracts/landlord-planner.test.ts).
 *
 * Two paths over N whole years, for one to five properties owned by one or two people:
 *  KEEP: rent (growth capped at 2% or CPI, whichever is lower, under the national rent control) less costs,
 *        mortgage payments and tax on the rental profit (Case V) at each owner's marginal rate; the cash left
 *        each year is saved at the deposit rate after DIRT. Wealth in year y = what the properties would bring
 *        if sold that year (price less selling costs, CGT, any RPRIR clawback and the mortgage still owed)
 *        plus the cash saved.
 *  SELL NOW: price (less any tenant-in-situ discount) less selling costs, CGT and the mortgage redemption,
 *        then the proceeds invested in a mix of State Savings, a deposit, an ETF, a pension contribution and
 *        paying down your home mortgage. Wealth in year y = what the mix would be worth after tax if cashed in.
 *
 * Rules and where they were read (every page read on the date shown):
 *  - CGT 31% for disposals from 7 October 2026 (33% before), personal exemption €1,270 a year each, selling
 *    and buying costs (solicitor, auctioneer) and enhancement expenditure allowable, losses deducted first:
 *    revenue.ie "How to calculate CGT" (published 7 Oct 2026), read 2026-11-04. Rates and exemption: ./ie-cgt.ts.
 *  - Indexation relief for costs incurred before 2003: revenue.ie "Capital Gains Tax Multiplier Table"
 *    (cgtmult.pdf, column "31 Dec 2004 et seq"), and "Indexation Relief"; indexation cannot create or
 *    increase a loss (Revenue Notes for Guidance, Part 19). Read 2026-11-04.
 *  - Rental profit, interest (RTB), 12.5% wear and tear for 8 years, income tax at the marginal rate, USC with
 *    the 3% surcharge, PRSI on unearned income: ./ie-landlord.ts (revenue.ie, read 2026-11-03).
 *    LPT is not deductible: revenue.ie "What expenses are not allowed?" (published 5 Dec 2025), read 2026-11-04.
 *    RTB registration (€40 a year a tenancy) is allowable: revenue.ie "What expenses are allowed?" and
 *    rtb.ie "Registration fees", read 2026-11-04.
 *  - RPRIR €1,000 in 2026 and 2027, nothing after 2027 as the law stands; clawed back if you stop being the
 *    landlord (sale or gift) within 4 years of the first year you claimed it: revenue.ie RPRIR (published
 *    2 Mar 2026) and "Clawback of the relief" (Revenue's example: claims 2024-2026, sells 2027, all clawed back),
 *    read 2026-11-04.
 *  - Rent control from 1 March 2026: rent can be increased once a year by 2%, or by inflation (CPI) if lower;
 *    RPZs replaced by a national system: rtb.ie "Rental law changes from 1 March 2026", read 2026-11-04.
 *  - PRSI on unearned income 4.5% from 1 October 2027 and 4.7% from 1 October 2028 (PRSI roadmap, S.I. 534/2024).
 *  - State Savings, DIRT 33%, ETF exit tax 35% from 2027 with the 8-year deemed disposal, pension lump sum:
 *    ./ie-money-homes.ts (NTMA and Revenue, read 2026-11-02).
 *  - Pension relief limits: 15% of earnings under 30, 20% 30-39, 25% 40-49, 30% 50-54, 35% 55-59, 40% from 60,
 *    earnings capped at €115,000: revenue.ie "Tax relief limits on pension contributions" (published
 *    15 Oct 2026), read 2026-11-04.
 * Simplifications (said on the page): year 1 is 2027 and its tax bands and credits stay for later years; salary
 * stays flat; the mortgage is repaid yearly (annuity); a pension is valued as if drawn at the end; paying down
 * your home mortgage earns its interest rate, tax-free.
 */
import { RULES, uscFor } from './ie-budget-2027';
import { incomeTaxFor, type TaxStatus } from './ie-income-tax';
import { WEAR_AND_TEAR, PRSI_UNEARNED_MIN, USC_SURCHARGE, RPRIR, RPRIR_SHARE, unearnedPrsiRate } from './ie-landlord';
import { computeIeCgt, EXEMPTION as CGT_EXEMPTION } from './ie-cgt';
import { DIRT, STATE_SAVINGS, POSB, exitTaxFor, LUMP_SUM_SHARE, LUMP_SUM_TAX_FREE } from './ie-money-homes';

export const START_YEAR = 2026;           // the sale "now"; keep-path year 1 is 2027
export const RENT_CAP = 0.02;             // rtb.ie, from 1 March 2026
export const RTB_FEE = 40;                // rtb.ie "Registration fees": €40 a year a tenancy
export const PRSI_2028 = 0.045 * 0.75 + 0.047 * 0.25; // 4.5% to 30 Sep 2028, 4.7% from 1 October 2028 (PRSI roadmap)
export const PRSI_LATER = 0.047;          // from 2029
export const RPRIR_CLAWBACK_YEARS = 4;
export const PENSION_EARNINGS_CAP = 115000;
/** [age from, % of earnings] (Revenue). */
export const PENSION_AGE_LIMITS: [number, number][] = [[0, 0.15], [30, 0.2], [40, 0.25], [50, 0.3], [55, 0.35], [60, 0.4]];
export const MAX_PROPERTIES = 5;
export const MAX_YEARS = 30;

/**
 * Revenue CGT multiplier for disposals from 2003, by the tax year the cost was incurred
 * (6 April to 5 April up to 2000/01; "2001" is 6 April to 31 December 2001; 2002 is the calendar year).
 * Key = the calendar year the tax year starts in.
 */
export const INDEXATION: Record<number, number> = {
  1974: 7.528, 1975: 6.080, 1976: 5.238, 1977: 4.490, 1978: 4.148, 1979: 3.742, 1980: 3.240, 1981: 2.678,
  1982: 2.253, 1983: 2.003, 1984: 1.819, 1985: 1.713, 1986: 1.637, 1987: 1.583, 1988: 1.553, 1989: 1.503,
  1990: 1.442, 1991: 1.406, 1992: 1.356, 1993: 1.331, 1994: 1.309, 1995: 1.277, 1996: 1.251, 1997: 1.232,
  1998: 1.212, 1999: 1.193, 2000: 1.144, 2001: 1.087, 2002: 1.049,
};

/** Multiplier for a cost paid on an ISO date (1 for 2003 on, or no date). Before 6 April = the previous tax year. */
export function indexationFactor(date?: string): number {
  if (!date || !/^\d{4}-\d{2}/.test(date)) return 1;
  const y = Number(date.slice(0, 4)), md = date.slice(5, 10) || '01-01';
  if (y >= 2003) return 1;
  if (y === 2002) return INDEXATION[2002];
  const key = y === 2001 ? (md < '04-06' ? 2000 : 2001) : md < '04-06' ? y - 1 : y;
  return INDEXATION[Math.max(1974, key)] ?? 1;
}

export interface Owner {
  status: TaxStatus;
  /** Gross salary a year (PAYE), EUR. Married, two incomes: also spousePay. */
  pay: number;
  spousePay?: number;
  over66?: boolean;
  age: number;
  rentalLossesForward?: number;
  cgtLossesForward?: number;
  /** RPRIR already claimed (all years), EUR, and the first year you claimed it. */
  rprirClaimed?: number;
  rprirFirstYear?: number | null;
}

export interface Property {
  name?: string;
  /** What it would sell for today, EUR. */
  value: number;
  purchasePrice: number;
  /** ISO date bought (for indexation before 2003). */
  purchaseDate: string;
  /** Stamp duty, legal fees when you bought. */
  buyingCosts: number;
  /** Improvements still reflected in the value (extension, not repairs). */
  enhancement: number;
  enhancementDate?: string;
  mortgageBalance: number;
  /** % a year. */
  mortgageRate: number;
  mortgageYears: number;
  /** Rent a year now, EUR. */
  rent: number;
  /** Deductible costs a year: insurance, repairs, management, service charges (not LPT, not the RTB fee). */
  costs: number;
  /** Local Property Tax a year (not deductible). */
  lpt: number;
  /** Furniture and appliances bought in the last 8 years, and the years of allowance left. */
  furnishings: number;
  furnishingsYearsLeft: number;
  rtbRegistered: boolean;
  /** Share owned by owner 1 (0-1); owner 2 has the rest. */
  owner1Share: number;
  /** Estate agent's fee, % of the price including VAT. */
  agentPct: number;
  /** Solicitor, BER certificate and other fixed selling costs, EUR. */
  saleFixedCosts: number;
  /** % below full value if you sell now with the tenant in place. */
  tenantDiscount: number;
}

export interface Mix { state: number; deposit: number; etf: number; pension: number; mortgage: number }

export interface Assumptions {
  years: number;
  /** % a year. */
  houseGrowth: number;
  rentGrowth: number;
  /** Apply the 2% / CPI rent cap. */
  rentCap: boolean;
  /** CPI and cost growth, % a year. */
  inflation: number;
  /** ETF and pension growth, % a year. */
  investReturn: number;
  depositRate: number;
  homeMortgageRate: number;
  homeMortgageBalance: number;
  /** Income tax rate on pension income when drawn, 20 or 40. */
  retirementRate: number;
  /** Percent weights, normalised. */
  mix: Mix;
  /** ISO date of the sale now. */
  saleDate?: string;
}

export interface SellOrKeepInput { owners: Owner[]; properties: Property[]; a: Assumptions }

export interface YearRow {
  year: number;
  rent: number; costs: number; interest: number; capital: number; tax: number; rprir: number; cash: number; saved: number;
  value: number; mortgageLeft: number; saleCosts: number; cgt: number; clawback: number;
  keep: number; sell: number; diff: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const r0 = (v: number) => Math.round(v);
const r2 = (v: number) => Math.round(v * 100) / 100;

export function pensionLimitPct(age: number): number {
  let pct = 0;
  for (const [from, p] of PENSION_AGE_LIMITS) if (age >= from) pct = p;
  return pct;
}

/** Standard rate band for the owner (as ./ie-income-tax.ts). */
function bandFor(o: Owner): number {
  const B = RULES[2027].band;
  if (o.status === 'married-two') return B.married + Math.min(B.secondMax, Math.min(n(o.pay), n(o.spousePay)));
  if (o.status === 'married-one') return B.married;
  return B[o.status];
}
/** 40 if the salary (household salary when married, two incomes) reaches the higher rate, else 20. */
export function marginalRate(o: Owner): 0.2 | 0.4 {
  const total = n(o.pay) + (o.status === 'married-two' ? n(o.spousePay) : 0);
  return total >= bandFor(o) ? 0.4 : 0.2;
}

/** Monthly-free annuity: the yearly payment that clears `bal` in `years` at `rate`% a year. */
export function annuity(bal: number, rate: number, years: number): number {
  if (bal <= 0 || years <= 0) return 0;
  const r = rate / 100;
  return r === 0 ? bal / years : (bal * r) / (1 - (1 + r) ** -years);
}

/** Chargeable gain on a property sold for `price` less `saleCosts`, with pre-2003 indexation (never creating or increasing a loss). */
export function propertyGain(p: Property, price: number, saleCosts: number): number {
  const base = price - saleCosts;
  const plain = base - n(p.purchasePrice) - n(p.buyingCosts) - n(p.enhancement);
  if (plain <= 0) return plain;
  const indexed = base - (n(p.purchasePrice) + n(p.buyingCosts)) * indexationFactor(p.purchaseDate) - n(p.enhancement) * indexationFactor(p.enhancementDate || p.purchaseDate);
  return Math.max(0, indexed);
}

/** One owner's CGT on their share of the year's gains (losses first, then the €1,270 exemption). */
function ownerCgt(o: Owner, gain: number, date: string): number {
  if (gain <= 0) return 0;
  return computeIeCgt({ disposalDate: date, salePrice: gain, purchasePrice: 0, costs: 0, losses: n(o.cgtLossesForward) }).cgt;
}

/** Tax on one owner's rental profit in keep-path year y (calendar START_YEAR + y). */
export function rentalTax(o: Owner, profit: number, y: number, rtb: boolean) {
  const spouse = o.status === 'married-two' ? n(o.spousePay) : 0;
  const pay = n(o.pay);
  const base = incomeTaxFor(2027, o.status, pay, spouse, 0);
  const withRent = incomeTaxFor(2027, o.status, pay, spouse, profit);
  const cal = START_YEAR + y;
  const rprir = rtb && cal <= 2027 ? Math.min(RPRIR[2027], RPRIR_SHARE * profit, withRent) : 0;
  const usc = uscFor(pay + profit, 2027) - uscFor(pay, 2027) + USC_SURCHARGE.rate * Math.max(0, profit - USC_SURCHARGE.over);
  const prsiRate = cal <= 2027 ? unearnedPrsiRate(2027) : cal === 2028 ? PRSI_2028 : PRSI_LATER;
  const prsi = !(o.over66 || num(o.age) >= 66) && profit > PRSI_UNEARNED_MIN ? profit * prsiRate : 0;
  return { incomeTax: withRent - base, rprir, usc, prsi, total: withRent - base - rprir + usc + prsi };
}

const share = (p: Property, i: number) => (i === 0 ? Math.min(1, n(p.owner1Share)) : 1 - Math.min(1, n(p.owner1Share)));

function clean(i: SellOrKeepInput): SellOrKeepInput {
  const owners = (i.owners.length ? i.owners : [{ status: 'single', pay: 0, age: 45 } as Owner]).slice(0, 2);
  const properties = i.properties.slice(0, MAX_PROPERTIES).map((p) => ({ ...p, owner1Share: owners.length === 1 ? 1 : p.owner1Share }));
  const years = Math.max(1, Math.min(MAX_YEARS, Math.floor(num(i.a.years, 10))));
  return { owners, properties, a: { ...i.a, years } };
}

export interface SaleNow {
  price: number; saleCosts: number; gain: number; mortgage: number; cgt: number; clawback: number; net: number;
  owners: { cgt: number; clawback: number; net: number; gain: number }[];
  payBy: string;
  rate: number;
}

export function saleNow(input: SellOrKeepInput): SaleNow {
  const { owners, properties } = clean(input);
  const date = input.a.saleDate || `${START_YEAR}-11-30`;
  let price = 0, saleCosts = 0, gainAll = 0, mortgage = 0;
  const og = owners.map(() => 0), equity = owners.map(() => 0);
  for (const p of properties) {
    const pr = n(p.value) * (1 - n(p.tenantDiscount) / 100);
    const sc = pr * n(p.agentPct) / 100 + n(p.saleFixedCosts);
    const g = propertyGain(p, pr, sc);
    price += pr; saleCosts += sc; gainAll += g; mortgage += n(p.mortgageBalance);
    owners.forEach((_, k) => { og[k] += share(p, k) * g; equity[k] += share(p, k) * (pr - sc - n(p.mortgageBalance)); });
  }
  const saleYear = Number(date.slice(0, 4));
  const rows = owners.map((o, k) => {
    const cgt = ownerCgt(o, og[k], date);
    const first = o.rprirFirstYear;
    const clawback = first != null && saleYear - first < RPRIR_CLAWBACK_YEARS ? n(o.rprirClaimed) : 0;
    return { gain: og[k], cgt, clawback, net: equity[k] - cgt - clawback };
  });
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
  const d = computeIeCgt({ disposalDate: date, salePrice: 0, purchasePrice: 0, costs: 0 });
  return { price, saleCosts, gain: gainAll, mortgage, cgt: sum((r) => r.cgt), clawback: sum((r) => r.clawback), net: sum((r) => r.net), owners: rows, payBy: d.payBy, rate: d.rate };
}

export interface Buckets { state: number; deposit: number; etf: number; pension: number[]; pensionGross: number[]; mortgage: number }

/** Split the net proceeds into the mix, within the pension limits and the home mortgage balance. */
export function allocate(input: SellOrKeepInput, sale: SaleNow): Buckets {
  const { owners, a } = clean(input);
  const m = a.mix;
  const tot = n(m.state) + n(m.deposit) + n(m.etf) + n(m.pension) + n(m.mortgage) || 1;
  const w = (k: keyof Mix) => n(m[k]) / tot;
  const L = Math.max(0, sale.net);
  const pension = owners.map((o, k) => {
    const want = w('pension') * Math.max(0, sale.owners[k].net);
    const cap = pensionLimitPct(num(o.age, 45)) * Math.min(n(o.pay), PENSION_EARNINGS_CAP) * (1 - marginalRate(o));
    return Math.min(want, cap);
  });
  const pensionGross = owners.map((o, k) => pension[k] / (1 - marginalRate(o)));
  const mortgage = Math.min(w('mortgage') * L, n(a.homeMortgageBalance));
  const deposit = L - w('state') * L - w('etf') * L - pension.reduce((s, v) => s + v, 0) - mortgage;
  return { state: w('state') * L, deposit, etf: w('etf') * L, pension, pensionGross, mortgage };
}

/** The State Savings product for an N-year plan: the longest that fits, else the Post Office deposit after DIRT. */
export function stateSavingsRate(years: number): number {
  const ss = STATE_SAVINGS.find((p) => p.years <= years);
  return ss ? ss.aer : POSB * (1 - DIRT);
}

/** Wealth after tax in the sell path, year by year (index 0 = now). */
export function sellPath(input: SellOrKeepInput, sale = saleNow(input)): number[] {
  const { a } = clean(input);
  const N = a.years;
  if (sale.net <= 0) return Array.from({ length: N + 1 }, () => sale.net);
  const b = allocate(input, sale);
  const g = num(a.investReturn) / 100, d = Math.max(0, num(a.depositRate)) / 100, rm = Math.max(0, num(a.homeMortgageRate)) / 100;
  const ss = stateSavingsRate(N);
  const mr = num(a.retirementRate, 20) >= 40 ? 0.4 : 0.2;
  const out = [sale.net];
  let units = b.etf, paid = 0;
  for (let y = 1; y <= N; y++) {
    units *= 1 + g;
    const rate = exitTaxFor(START_YEAR + y);
    const etf = units - Math.max(0, (units + paid - b.etf) * rate) + paid;
    if (y % 8 === 0) { const due = Math.max(0, (units + paid - b.etf) * rate - paid); units -= due; paid += due; }
    const pension = b.pensionGross.reduce((s, gross) => {
      const pot = gross * (1 + g) ** y;
      const lump = Math.min(pot * LUMP_SUM_SHARE, LUMP_SUM_TAX_FREE);
      return s + lump + (pot - lump) * (1 - mr);
    }, 0);
    out.push(b.state * (1 + ss) ** y + b.deposit * (1 + d * (1 - DIRT)) ** y + etf + pension + b.mortgage * (1 + rm) ** y);
  }
  return out;
}

/** The keep path, year by year. */
export function keepPath(input: SellOrKeepInput) {
  const { owners, properties, a } = clean(input);
  const N = a.years;
  const hg = num(a.houseGrowth) / 100, inf = num(a.inflation) / 100;
  const rg = a.rentCap ? Math.min(num(a.rentGrowth), RENT_CAP * 100, Math.max(0, num(a.inflation))) / 100 : num(a.rentGrowth) / 100;
  const dNet = Math.max(0, num(a.depositRate)) / 100 * (1 - DIRT);
  const bal = properties.map((p) => n(p.mortgageBalance));
  const pmt = properties.map((p) => annuity(n(p.mortgageBalance), num(p.mortgageRate), num(p.mortgageYears)));
  const lossFwd = owners.map((o) => n(o.rentalLossesForward));
  const rprirSum = owners.map((o) => n(o.rprirClaimed));
  const first = owners.map((o) => (o.rprirFirstYear ?? null) as number | null);
  const rtb = properties.some((p) => p.rtbRegistered);
  let saved = 0;
  const rows: Omit<YearRow, 'sell' | 'diff'>[] = [];
  for (let y = 1; y <= N; y++) {
    const cal = START_YEAR + y;
    let rent = 0, costs = 0, interest = 0, capital = 0;
    const before = owners.map(() => 0);
    properties.forEach((p, k) => {
      const r = n(p.rent) * (1 + rg) ** (y - 1);
      const c = n(p.costs) * (1 + inf) ** (y - 1) + (p.rtbRegistered ? RTB_FEE : 0);
      const lpt = n(p.lpt) * (1 + inf) ** (y - 1);
      const i = bal[k] * num(p.mortgageRate) / 100;
      const cap = Math.min(bal[k], Math.max(0, pmt[k] - i));
      bal[k] -= cap;
      const wear = y <= num(p.furnishingsYearsLeft) ? WEAR_AND_TEAR * n(p.furnishings) : 0;
      const deductible = c + (p.rtbRegistered ? i : 0) + wear;
      owners.forEach((_, o) => { before[o] += share(p, o) * (r - deductible); });
      rent += r; costs += c + lpt; interest += i; capital += cap;
    });
    let tax = 0, rprir = 0;
    owners.forEach((o, k) => {
      const used = Math.min(lossFwd[k], Math.max(0, before[k]));
      const profit = Math.max(0, before[k] - used);
      lossFwd[k] = lossFwd[k] - used + Math.max(0, -before[k]);
      const t = rentalTax(o, profit, y, rtb);
      tax += t.total; rprir += t.rprir;
      if (t.rprir > 0) { rprirSum[k] += t.rprir; if (first[k] == null) first[k] = cal; }
    });
    const cash = rent - costs - interest - capital - tax;
    saved = saved * (1 + dNet) + cash;
    // If sold at the end of this year.
    let value = 0, saleCosts = 0;
    const og = owners.map(() => 0);
    properties.forEach((p, k) => {
      const v = n(p.value) * (1 + hg) ** y;
      const sc = v * n(p.agentPct) / 100 + n(p.saleFixedCosts) * (1 + inf) ** y;
      const g = propertyGain(p, v, sc);
      owners.forEach((_, o) => { og[o] += share(p, o) * g; });
      value += v; saleCosts += sc;
    });
    const cgt = owners.reduce((s, o, k) => s + ownerCgt(o, og[k], `${cal}-12-31`), 0);
    const clawback = owners.reduce((s, _, k) => s + (first[k] != null && cal - (first[k] as number) < RPRIR_CLAWBACK_YEARS ? rprirSum[k] : 0), 0);
    const mortgageLeft = bal.reduce((s, v) => s + v, 0);
    rows.push({ year: cal, rent, costs, interest, capital, tax, rprir, cash, saved, value, mortgageLeft, saleCosts, cgt, clawback,
      keep: value - saleCosts - cgt - clawback - mortgageLeft + saved });
  }
  return rows;
}

export interface SellOrKeepResult {
  sale: SaleNow;
  buckets: Buckets;
  rows: YearRow[];
  /** Keep minus sell at the end, EUR (positive = keeping wins). */
  diff: number;
  keepEnd: number;
  sellEnd: number;
  /** House-price growth a year at which the two paths end level, % (null if none in -10%..25%). */
  breakEven: number | null;
  /** After-tax cash a year in year 1. */
  keepIncome: number;
  sellIncome: number;
}

function diffAt(input: SellOrKeepInput, houseGrowth: number): number {
  const i = { ...input, a: { ...input.a, houseGrowth } };
  const k = keepPath(i);
  const s = sellPath(i);
  return k[k.length - 1].keep - s[s.length - 1];
}

export function breakEvenGrowth(input: SellOrKeepInput): number | null {
  let lo = -10, hi = 25;
  let flo = diffAt(input, lo), fhi = diffAt(input, hi);
  if (flo > 0 || fhi < 0) return null;
  for (let it = 0; it < 60; it++) {
    const mid = (lo + hi) / 2, f = diffAt(input, mid);
    if (f < 0) { lo = mid; flo = f; } else { hi = mid; fhi = f; }
  }
  return Math.round(((lo + hi) / 2) * 100) / 100;
}

export function computeSellOrKeep(input: SellOrKeepInput): SellOrKeepResult {
  const c = clean(input);
  const sale = saleNow(c);
  const buckets = allocate(c, sale);
  const sell = sellPath(c, sale);
  const keep = keepPath(c);
  const rows: YearRow[] = keep.map((r, i) => ({ ...r, sell: sell[i + 1], diff: r.keep - sell[i + 1] }));
  const last = rows[rows.length - 1];
  const g = num(c.a.investReturn) / 100, d = Math.max(0, num(c.a.depositRate)) / 100, rm = Math.max(0, num(c.a.homeMortgageRate)) / 100;
  const sellIncome = sale.net <= 0 ? 0 : buckets.state * stateSavingsRate(c.a.years) + buckets.deposit * d * (1 - DIRT) + buckets.etf * g * (1 - exitTaxFor(START_YEAR + 1)) + buckets.mortgage * rm;
  return {
    sale, buckets, rows, diff: last.diff, keepEnd: last.keep, sellEnd: last.sell,
    breakEven: breakEvenGrowth(c), keepIncome: rows[0].cash, sellIncome,
  };
}

/** Rounded copy for display and the agent tool. */
export function roundResult(r: SellOrKeepResult) {
  return {
    ...r,
    diff: r0(r.diff), keepEnd: r0(r.keepEnd), sellEnd: r0(r.sellEnd), keepIncome: r0(r.keepIncome), sellIncome: r0(r.sellIncome),
    rows: r.rows.map((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === 'year' ? v : r0(v)]))) as unknown as YearRow[],
    sale: { ...r.sale, price: r0(r.sale.price), saleCosts: r0(r.sale.saleCosts), gain: r0(r.sale.gain), cgt: r2(r.sale.cgt), net: r0(r.sale.net) },
  };
}

/** Example used on the page, in the tests and as the planner's example: one flat, one owner. */
export const EXAMPLE: SellOrKeepInput = {
  owners: [{ status: 'single', pay: 70000, age: 52, over66: false, rentalLossesForward: 0, cgtLossesForward: 0, rprirClaimed: 1400, rprirFirstYear: 2024 }],
  properties: [{
    name: 'Apartment', value: 380000, purchasePrice: 210000, purchaseDate: '2012-05-01', buyingCosts: 6000, enhancement: 0,
    mortgageBalance: 90000, mortgageRate: 4, mortgageYears: 10, rent: 24000, costs: 3200, lpt: 450,
    furnishings: 6000, furnishingsYearsLeft: 4, rtbRegistered: true, owner1Share: 1, agentPct: 1.5 * 1.23, saleFixedCosts: 2500, tenantDiscount: 0,
  }],
  a: {
    years: 10, houseGrowth: 3, rentGrowth: 2, rentCap: true, inflation: 2, investReturn: 6, depositRate: 2, homeMortgageRate: 3.5,
    homeMortgageBalance: 0, retirementRate: 20, mix: { state: 0, deposit: 20, etf: 50, pension: 30, mortgage: 0 }, saleDate: '2026-11-30',
  },
};
export { CGT_EXEMPTION };
