/**
 * US nursing-home Medicaid: spend-down, spousal protection, look-back penalty and who pays for care, month by month.
 * The Care Costs Planner's US edition (scripts/gen-care-planner.mjs) runs the same rules as formulas, row for row:
 * tests/contracts/care-planner.test.ts recalculates the file in HyperFormula and compares it with this module.
 *
 * Federal 2026 standards (CMS CIB 27 Apr 2026, read 9 Nov 2026):
 *  - CSRA (community spouse resource allowance) minimum $32,532, maximum $162,660 (from 1 Jan 2026).
 *  - MMMNA minimum $2,705 a month from 1 Jul 2026 (Alaska $3,381.25, Hawaii $3,111.25); maximum $4,066.50.
 *    Excess shelter base (30% of the minimum) $811.50 (AK $1,014.38, HI $933.38).
 *  - Home equity limit $752,000 to $1,130,000 (a state's choice); not applied while a spouse lives in the home.
 *  - Personal needs allowance federal floor $30 a month (42 U.S.C. 1396a(q)(2)).
 *  - Look-back 60 months; penalty = transfers ÷ the state's average monthly private-pay nursing facility cost, with
 *    no rounding down of part months (42 U.S.C. 1396p(c)(1)(B), (E)(i), (E)(iv)).
 *  - Medicare does not pay for long-term custodial care; skilled nursing days 21-100 cost $217 a day in 2026.
 *
 * Model, stated on the page and in the planner:
 *  - Countable assets (the couple's together if married) minus the CSRA and the state asset limit are "spendable":
 *    they pay for care until they cannot cover a month; from that month the person is eligible.
 *  - Gifts in the look-back delay Medicaid by the penalty months from the month the person is otherwise eligible.
 *  - On Medicaid the person pays their income minus the personal needs allowance, the spouse's income allowance and
 *    health insurance premiums ("patient liability"); Medicaid pays the rest of the nursing home's cost.
 *  - Assisted living and home care are paid by Medicaid only through a waiver (not guaranteed): with no waiver,
 *    the family covers what income cannot once savings run out.
 *  - Care costs and income rise once a year (the year's first month); savings grow monthly.
 */
import { stateByCode, monthlyDivisor, type StateCare } from './us-states.ts';

export const US_FED = {
  csraMin: 32532,
  csraMax: 162660,
  mmmnaMin: 2705,
  mmmnaMinAK: 3381.25,
  mmmnaMinHI: 3111.25,
  mmmnaMax: 4066.5,
  shelterBase: 811.5,
  shelterBaseAK: 1014.38,
  shelterBaseHI: 933.38,
  equityMin: 752000,
  equityMax: 1130000,
  pnaFloor: 30,
  incomeCap: 2982,
  ssiFbr: 994,
  lookbackMonths: 60,
  caLookbackMonths: 30,
  snfCoinsurance: 217,
  partADeductible: 1736,
} as const;

export const US_CARE_SOURCES = {
  cib: 'https://www.medicaid.gov/federal-policy-guidance/downloads/cib04272026.pdf',
  s1917: 'https://www.ssa.gov/OP_Home/ssact/title19/1917.htm',
  s1902: 'https://www.ssa.gov/OP_Home/ssact/title19/1902.htm',
  medicareLtc: 'https://www.medicare.gov/coverage/long-term-care',
  medicareSnf: 'https://www.medicare.gov/coverage/skilled-nursing-facility-care',
  caLookback: 'https://www.dhcs.ca.gov/services/medi-cal/eligibility/letters/Documents/25-18.pdf',
};

export const MONTHS = 180; // 15 years
export type CareTypeUS = 'nursing' | 'assisted' | 'home';

export interface UsInput {
  state: string;
  /** A spouse still lives at home (the "community spouse"). */
  married: boolean;
  /** Countable assets: savings, investments, second property, cash value (the couple's together if married). Not the home. */
  assets: number;
  /** The person's own gross income a month (Social Security, pensions). */
  income: number;
  spouseIncome: number;
  /** The spouse's housing costs a month (rent or mortgage, tax, insurance, the state's utility allowance). */
  shelter: number;
  premiums: number;
  /** Equity in the home (value less mortgage). */
  homeEquity: number;
  /** A spouse, a child under 21 or a disabled child lives in the home (the equity limit does not apply). */
  homeProtected: boolean;
  careType: CareTypeUS;
  /** Medicaid pays for this care through a waiver (assisted living, home care). */
  waiver: boolean;
  /** Care cost a month today. */
  cost: number;
  /** Gifts and transfers for less than value inside the look-back. */
  gifts: number;
  costInflation: number;
  incomeGrowth: number;
  savingsGrowth: number;
  /** Your state's figures, where you know better (or where we have none). */
  assetLimit?: number | null;
  divisor?: number | null;
  pna?: number | null;
  equityLimit?: number | null;
}

export interface UsFigures {
  state: StateCare;
  assetLimit: number;
  assetLimitMissing: boolean;
  divisor: number;
  divisorMissing: boolean;
  pna: number;
  pnaMissing: boolean;
  equityLimit: number;
  csraMethod: 'half' | 'max' | 'min';
  csraMissing: boolean;
  csraMin: number;
  incomeCap: number | null;
  mmmnaAtMax: boolean;
}

/** The state's figures, with the person's own entries taking precedence. Missing figures fall back as stated in the flags. */
export function usFigures(i: Pick<UsInput, 'state' | 'assetLimit' | 'divisor' | 'pna' | 'equityLimit'>): UsFigures {
  const s = stateByCode(i.state);
  const num = (x: number | null | undefined) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
  const dv = num(i.divisor) ?? monthlyDivisor(s);
  return {
    state: s,
    assetLimit: num(i.assetLimit) ?? s.asset?.v ?? 0,
    assetLimitMissing: num(i.assetLimit) == null && !s.asset,
    divisor: dv ?? 0,
    divisorMissing: dv == null,
    pna: num(i.pna) ?? s.pna?.v ?? US_FED.pnaFloor,
    pnaMissing: num(i.pna) == null && !s.pna,
    equityLimit: num(i.equityLimit) ?? s.equity?.v ?? US_FED.equityMin,
    csraMethod: s.csra?.method ?? 'half',
    csraMissing: !s.csra,
    csraMin: s.csra?.stateMin ?? US_FED.csraMin,
    incomeCap: s.income && s.income.rule !== 'mn' ? s.income.cap : null,
    mmmnaAtMax: !!s.mmmnaMax,
  };
}

/** What the spouse at home keeps of the couple's countable assets. */
export function csra(assets: number, method: 'half' | 'max' | 'min', stateMin: number = US_FED.csraMin): number {
  const a = Math.max(0, assets);
  if (method === 'max') return Math.min(a, US_FED.csraMax);
  if (method === 'min') return Math.min(a, US_FED.csraMin);
  return Math.min(a, Math.max(stateMin, Math.min(US_FED.csraMax, a / 2)));
}

/** The spouse's monthly income allowance (MMMNA + excess shelter, capped, less the spouse's own income). */
export function spouseAllowance(state: string, atMax: boolean, shelter: number, spouseIncome: number): number {
  const min = state === 'AK' ? US_FED.mmmnaMinAK : state === 'HI' ? US_FED.mmmnaMinHI : US_FED.mmmnaMin;
  const base = state === 'AK' ? US_FED.shelterBaseAK : state === 'HI' ? US_FED.shelterBaseHI : US_FED.shelterBase;
  const need = atMax ? US_FED.mmmnaMax : Math.min(US_FED.mmmnaMax, min + Math.max(0, shelter - base));
  return Math.max(0, need - Math.max(0, spouseIncome));
}

/** First day of the look-back for an application on `app` (California: 30 months, never before 1 Jan 2026). */
export function lookbackStart(state: string, app: Date): Date {
  const d = new Date(Date.UTC(app.getUTCFullYear(), app.getUTCMonth() - (state === 'CA' ? US_FED.caLookbackMonths : US_FED.lookbackMonths), app.getUTCDate()));
  if (state === 'CA') { const floor = new Date(Date.UTC(2026, 0, 1)); return d < floor ? floor : d; }
  return d;
}

/** Gifts dated from the look-back start to the application date (inclusive). */
export function giftsInLookback(state: string, app: Date, gifts: { date: Date; amount: number }[]): number {
  const from = lookbackStart(state, app);
  return gifts.filter((g) => g.date >= from && g.date <= app).reduce((t, g) => t + Math.max(0, g.amount), 0);
}

export interface UsMonth {
  m: number; year: number; cost: number; income: number; need: number;
  savingsStart: number; savingsGrown: number; eligible: number; k: number; penaltyFrac: number; medicaidFrac: number;
  fromSavings: number; savingsEnd: number; fromIncome: number; medicaid: number; family: number;
}
export interface UsYear { year: number; cost: number; fromIncome: number; fromSavings: number; family: number; medicaid: number; savingsEnd: number }

export interface UsResult {
  figures: UsFigures;
  csra: number;
  spendable: number;
  allowance: number;
  liability: number;
  penaltyMonths: number;
  /** Months until savings cannot pay a full month (null: they last the whole plan or income covers the cost). */
  savingsMonths: number | null;
  /** Months until Medicaid starts paying (null: not within 15 years, or the care type is not covered). */
  medicaidMonth: number | null;
  overIncomeCap: boolean;
  overEquity: boolean;
  months: UsMonth[];
  years: UsYear[];
  totals: { cost: number; fromIncome: number; fromSavings: number; family: number; medicaid: number };
}

export function projectUS(i: UsInput): UsResult {
  const F = usFigures(i);
  const keep = i.married ? csra(i.assets, F.csraMethod, F.csraMin) : 0;
  const spendable = Math.max(0, i.assets - keep - F.assetLimit);
  const allowance = i.married ? spouseAllowance(F.state.code, F.mmmnaAtMax, i.shelter, i.spouseIncome) : 0;
  const P = F.divisor > 0 ? Math.max(0, i.gifts) / F.divisor : 0;
  const covered = i.careType === 'nursing' || i.waiver ? 1 : 0;
  const g = Math.pow(1 + i.savingsGrowth / 100, 1 / 12);
  const months: UsMonth[] = [];
  let sPrev = spendable, ePrev = 0, kPrev = 0;
  for (let m = 0; m < MONTHS; m++) {
    const year = Math.floor(m / 12);
    const cost = i.cost * Math.pow(1 + i.costInflation / 100, year);
    const income = i.income * Math.pow(1 + i.incomeGrowth / 100, year);
    const need = Math.max(0, cost - income);
    const savingsStart = sPrev;
    const savingsGrown = savingsStart * g;
    const eligible = ePrev === 1 ? 1 : savingsGrown < need ? 1 : 0;
    const k = eligible === 1 ? kPrev + 1 : 0;
    const penaltyFrac = eligible === 1 ? Math.max(0, Math.min(1, P - (k - 1))) : 0;
    const medicaidFrac = covered * eligible * (1 - penaltyFrac);
    const privFrac = 1 - medicaidFrac;
    const fromSavings = Math.min(savingsGrown, need * privFrac);
    const savingsEnd = savingsGrown - fromSavings;
    const liab = Math.max(0, Math.min(cost, income - F.pna - allowance - i.premiums));
    const fromIncome = Math.min(income, cost) * privFrac + liab * medicaidFrac;
    const medicaid = (cost - liab) * medicaidFrac;
    const family = Math.max(0, need * privFrac - fromSavings);
    months.push({ m, year, cost, income, need, savingsStart, savingsGrown, eligible, k, penaltyFrac, medicaidFrac, fromSavings, savingsEnd, fromIncome, medicaid, family });
    sPrev = savingsEnd; ePrev = eligible; kPrev = k;
  }
  const years: UsYear[] = [];
  for (let y = 0; y < MONTHS / 12; y++) {
    const ms = months.slice(y * 12, y * 12 + 12);
    const sum = (k: keyof UsMonth) => ms.reduce((t, x) => t + (x[k] as number), 0);
    years.push({ year: y + 1, cost: sum('cost'), fromIncome: sum('fromIncome'), fromSavings: sum('fromSavings'), family: sum('family'), medicaid: sum('medicaid'), savingsEnd: ms[11].savingsEnd });
  }
  const tot = (k: keyof UsYear) => years.reduce((t, y) => t + (y[k] as number), 0);
  const firstElig = months.find((x) => x.eligible === 1);
  const firstMed = months.find((x) => x.medicaidFrac > 0);
  const liability = Math.max(0, Math.min(i.cost, i.income - F.pna - allowance - i.premiums));
  return {
    figures: F, csra: keep, spendable, allowance, liability, penaltyMonths: P,
    savingsMonths: firstElig ? firstElig.m : null,
    medicaidMonth: firstMed ? firstMed.m : null,
    overIncomeCap: F.incomeCap != null && i.income > F.incomeCap,
    overEquity: !i.homeProtected && i.homeEquity > F.equityLimit,
    months, years,
    totals: { cost: tot('cost'), fromIncome: tot('fromIncome'), fromSavings: tot('fromSavings'), family: tot('family'), medicaid: tot('medicaid') },
  };
}

export const US_DEFAULT: UsInput = {
  state: 'FL', married: false, assets: 150000, income: 2200, spouseIncome: 0, shelter: 0, premiums: 0, homeEquity: 0, homeProtected: false,
  careType: 'nursing', waiver: false, cost: 10645, gifts: 0, costInflation: 3, incomeGrowth: 2, savingsGrowth: 2,
};
