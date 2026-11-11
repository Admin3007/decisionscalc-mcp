/**
 * Pension lump sum or monthly payments (US): what interest rate the pension is paying, break-even ages, how long the
 * lump sum lasts paying yourself the same income, and the pension's value at your own expected return.
 *
 * Mortality: SSA 2023 period life table (2026 Trustees Report), src/data/ssa-period-life-2023.ts. Deaths are spread
 * evenly within each year of age (uniform distribution of deaths), nobody lives past 120. "Unisex" averages the male and
 * female one-year death rates (our blend, not an SSA table). Joint life assumes the two lives are independent.
 *
 * Timing: the lump sum is paid now (current age); pension payments are monthly, the first at the start age, each paid
 * only if the person (or, for the survivor share, the spouse) is alive. A COLA raises the payment once a year from the
 * first anniversary. Rates are effective annual rates; money is discounted at (1 + r)^-t with t in years.
 *
 * Plans themselves price lump sums with the IRS minimum present value rules (26 U.S.C. 417(e)(3): corporate bond segment
 * rates and the IRS mortality table), so the "implied rate" here is a check on the offer, not the plan's own figure.
 * General information on the user's own assumptions (return, inflation, COLA); not financial advice.
 */
import { SSA_LIFE, PBGC_MAX } from '../../data/ssa-period-life-2023';

export type Sex = 'male' | 'female' | 'unisex';

export interface LumpInput {
  /** Lump sum offered, USD. */
  lumpSum: number;
  /** Monthly pension for the form chosen (single life, or the reduced joint amount), USD. */
  monthly: number;
  /** Age the monthly pension starts (whole years). */
  startAge: number;
  /** Your age today (whole years); the lump sum is paid now. */
  currentAge: number;
  sex: Sex;
  /** 'single' = payments stop at your death; 'joint' = your spouse gets survivorPct of the payment for life after you. */
  form?: 'single' | 'joint';
  spouseAge?: number;
  spouseSex?: Sex;
  /** Survivor share, % of your payment (50 to 100 under a qualified joint and survivor annuity). */
  survivorPct?: number;
  /** Yearly cost-of-living increase, % (most private pensions: 0). */
  colaPct?: number;
  /** Return you expect on the lump sum, % a year (your assumption). */
  returnPct: number;
  /** Inflation, % a year (your assumption). */
  inflationPct: number;
}

export interface LumpResult {
  /** Discount rate at which the survival-weighted pension equals the lump sum (null if outside -10% to +100%). */
  impliedRate: number | null;
  /** Same, counting payments only to life expectancy (and the survivor share to the spouse's life expectancy). */
  impliedRateToLe: number | null;
  /** Survival-weighted present value of the pension at your return. */
  pvAtReturn: number;
  /** pvAtReturn minus the lump sum (positive = the pension is worth more on your assumptions). */
  pvGain: number;
  /** Age at which pension payments received add up to the lump sum (null = never by 120). */
  breakEvenAge: number | null;
  /** Same, with each payment discounted at your return (i.e. against investing the lump sum). */
  breakEvenAgeAtReturn: number | null;
  /** Age the lump sum runs out paying yourself the pension's amount (with the same COLA) at your return; null = lasts past 120. */
  runOutAge: number | null;
  /** Your life expectancy as an age (current age + period life expectancy). */
  lifeExpectancyAge: number;
  spouseLifeExpectancyAge: number | null;
  /** Chance you are alive at each age (from today). */
  pAliveAtBreakEven: number | null;
  pAliveAtBreakEvenAtReturn: number | null;
  pAliveAtRunOut: number | null;
  /** Chance at least one of you is alive when the lump sum runs out (joint only). */
  pEitherAliveAtRunOut: number | null;
  /** Survival-weighted total of payments, not discounted. */
  expectedPayments: number;
  /** The monthly payment at your life-expectancy age in today's dollars (after COLA and inflation). */
  realMonthlyAtLe: number;
  /** Share of buying power lost by then. */
  buyingPowerLost: number;
  /** PBGC maximum monthly guarantee at the start age, [straight life, joint and 50%], 2026 and 2027 tables (null outside 45-75). */
  pbgc: { 2026: [number, number]; 2027: [number, number] } | null;
  /** Under 59½ when the lump sum is paid (10% additional tax may apply if it is not rolled over). */
  under59Half: boolean;
  /** Months from now to the first payment. */
  deferMonths: number;
}

export const LUMP_SOURCES = {
  life: SSA_LIFE.source,
  pbgc: PBGC_MAX.source,
  pbgcCoverage: 'https://www.pbgc.gov/workers-retirees/learn/understanding-your-pension-pbgc-coverage',
  early: 'https://www.irs.gov/taxtopics/tc558',
  rollover: 'https://www.irs.gov/taxtopics/tc413',
  pensions: 'https://www.irs.gov/taxtopics/tc410',
  pub575: 'https://www.irs.gov/publications/p575',
  qjsa: 'https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-qualified-joint-and-survivor-annuity',
  s417: 'https://www.law.cornell.edu/uscode/text/26/417',
};

const MAX_AGE = 120;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const finite = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);

/** One-year death probability at whole age a (1 at 120 and above). */
export function qx(sex: Sex, a: number): number {
  if (a >= MAX_AGE) return 1;
  const i = clamp(Math.floor(a), SSA_LIFE.firstAge, SSA_LIFE.lastAge) - SSA_LIFE.firstAge;
  if (sex === 'unisex') return (SSA_LIFE.male.q[i] + SSA_LIFE.female.q[i]) / 2;
  return SSA_LIFE[sex].q[i];
}

/** Survival curve from a whole age x: s(t) = chance of being alive t years later (deaths uniform within each year). */
export function survival(sex: Sex, x: number): (t: number) => number {
  const x0 = clamp(Math.round(x), SSA_LIFE.firstAge, MAX_AGE);
  const l: number[] = [1];
  for (let k = 0; x0 + k < MAX_AGE; k++) l.push(l[k] * (1 - qx(sex, x0 + k)));
  l.push(0);
  return (t: number) => {
    if (t <= 0) return 1;
    const k = Math.floor(t), s = t - k;
    if (k >= l.length - 1 || x0 + t >= MAX_AGE) return 0;
    return l[k] * (1 - s * qx(sex, x0 + k));
  };
}

/** Period life expectancy at whole age x: SSA's published figure for male/female, computed from the blended rates for unisex. */
export function lifeExpectancy(sex: Sex, x: number): number {
  const a = clamp(Math.round(x), SSA_LIFE.firstAge, SSA_LIFE.lastAge);
  if (sex !== 'unisex') return SSA_LIFE[sex].e[a - SSA_LIFE.firstAge];
  const s = survival(sex, a);
  let e = 0;
  for (let k = 0; a + k < MAX_AGE; k++) e += (s(k) + s(k + 1)) / 2;
  return Math.round(e * 100) / 100;
}

interface Flow { t: number; full: number; p: number; }

function normalise(i: LumpInput) {
  const currentAge = Math.round(clamp(finite(i.currentAge, 62), SSA_LIFE.firstAge, 100));
  const startAge = Math.round(clamp(finite(i.startAge, currentAge), currentAge, 100));
  const joint = i.form === 'joint';
  const spouseSex: Sex = i.spouseSex ?? (i.sex === 'male' ? 'female' : i.sex === 'female' ? 'male' : 'unisex');
  return {
    lumpSum: Math.max(0, finite(i.lumpSum, 0)),
    monthly: Math.max(0, finite(i.monthly, 0)),
    currentAge, startAge, joint, spouseSex,
    sex: (['male', 'female', 'unisex'].includes(i.sex) ? i.sex : 'unisex') as Sex,
    spouseAge: Math.round(clamp(finite(i.spouseAge, currentAge), SSA_LIFE.firstAge, 100)),
    survivor: joint ? clamp(finite(i.survivorPct, 50), 0, 100) / 100 : 0,
    cola: clamp(finite(i.colaPct, 0), 0, 10) / 100,
    r: clamp(finite(i.returnPct, 5), -20, 30) / 100,
    infl: clamp(finite(i.inflationPct, 2.5), -5, 20) / 100,
  };
}

/** Bisection for the rate r where f(r) = 0, f decreasing in r. */
function solveRate(f: (r: number) => number): number | null {
  let lo = -0.1, hi = 1;
  if (f(lo) < 0 || f(hi) > 0) return null;
  for (let n = 0; n < 200 && hi - lo > 1e-10; n++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function compareLumpSum(input: LumpInput): LumpResult {
  const n = normalise(input);
  const sMe = survival(n.sex, n.currentAge);
  const sSp = n.joint ? survival(n.spouseSex, n.spouseAge) : () => 0;
  const deferMonths = (n.startAge - n.currentAge) * 12;
  const leMe = lifeExpectancy(n.sex, n.currentAge);
  const leSp = n.joint ? lifeExpectancy(n.spouseSex, n.spouseAge) : 0;
  const tEnd = MAX_AGE - Math.min(n.currentAge, n.joint ? n.spouseAge : n.currentAge);

  // Monthly payments from the start age until nobody can be alive.
  const flows: Flow[] = [];
  for (let m = 0; ; m++) {
    const t = (deferMonths + m) / 12;
    if (t >= tEnd) break;
    const full = n.monthly * Math.pow(1 + n.cola, Math.floor(m / 12));
    const pm = sMe(t);
    const p = pm + (n.joint ? n.survivor * (1 - pm) * sSp(t) : 0);
    flows.push({ t, full, p });
  }
  const df = (r: number, t: number) => Math.pow(1 + r, -t);
  const pv = (r: number) => flows.reduce((s, f) => s + f.full * f.p * df(r, f.t), 0);
  const pvLe = (r: number) => flows.reduce((s, f) => {
    const w = f.t < leMe ? 1 : n.joint && f.t < leSp ? n.survivor : 0;
    return s + f.full * w * df(r, f.t);
  }, 0);

  const L = n.lumpSum;
  const impliedRate = L > 0 && n.monthly > 0 ? solveRate((r) => pv(r) - L) : null;
  const impliedRateToLe = L > 0 && n.monthly > 0 ? solveRate((r) => pvLe(r) - L) : null;
  const pvAtReturn = pv(n.r);

  // Break-even: payments while you are alive (full amount), plain and discounted at your return.
  let cum = 0, cumPv = 0, breakEvenAge: number | null = null, breakEvenAgeAtReturn: number | null = null;
  for (const f of flows) {
    cum += f.full; cumPv += f.full * df(n.r, f.t);
    const age = n.currentAge + f.t;
    if (breakEvenAge === null && cum >= L - 1e-9) breakEvenAge = age;
    if (breakEvenAgeAtReturn === null && cumPv >= L - 1e-9) breakEvenAgeAtReturn = age;
    if (breakEvenAge !== null && breakEvenAgeAtReturn !== null) break;
  }
  if (L <= 0) { breakEvenAge = n.startAge; breakEvenAgeAtReturn = n.startAge; }

  // The lump sum invested at your return, paying yourself the same monthly amount (same COLA) from the start age.
  const rm = Math.pow(1 + n.r, 1 / 12) - 1;
  let bal = L * Math.pow(1 + rm, deferMonths), runOutAge: number | null = null;
  for (let m = 0; n.monthly > 0; m++) {
    const age = n.startAge + m / 12;
    if (age >= MAX_AGE) break;
    const pay = n.monthly * Math.pow(1 + n.cola, Math.floor(m / 12));
    if (bal < pay - 1e-9) { runOutAge = age; break; }
    bal = (bal - pay) * (1 + rm);
  }

  const leAge = n.currentAge + leMe;
  const yrsToLe = Math.max(0, leMe);
  const yearsPaidAtLe = Math.max(0, leAge - n.startAge);
  const realMonthlyAtLe = n.monthly * Math.pow(1 + n.cola, Math.floor(yearsPaidAtLe)) / Math.pow(1 + n.infl, yrsToLe);
  const pAt = (age: number | null) => (age === null ? null : sMe(age - n.currentAge));
  const pb26 = PBGC_MAX.years[2026][n.startAge], pb27 = PBGC_MAX.years[2027][n.startAge];

  return {
    impliedRate, impliedRateToLe, pvAtReturn, pvGain: pvAtReturn - L,
    breakEvenAge, breakEvenAgeAtReturn, runOutAge,
    lifeExpectancyAge: leAge,
    spouseLifeExpectancyAge: n.joint ? n.spouseAge + leSp : null,
    pAliveAtBreakEven: pAt(breakEvenAge), pAliveAtBreakEvenAtReturn: pAt(breakEvenAgeAtReturn), pAliveAtRunOut: pAt(runOutAge),
    pEitherAliveAtRunOut: n.joint && runOutAge !== null ? (() => { const t = runOutAge - n.currentAge, a = sMe(t), b = sSp(t); return a + b - a * b; })() : null,
    expectedPayments: flows.reduce((s, f) => s + f.full * f.p, 0),
    realMonthlyAtLe, buyingPowerLost: n.monthly > 0 ? 1 - realMonthlyAtLe / n.monthly : 0,
    pbgc: pb26 && pb27 ? { 2026: pb26, 2027: pb27 } : null,
    under59Half: n.currentAge < 59.5,
    deferMonths,
  };
}

/** The Bogleheads case used as the worked example on the page. */
export const LUMP_EXAMPLE: LumpInput = { lumpSum: 111000, monthly: 911, startAge: 62, currentAge: 62, sex: 'male', form: 'single', colaPct: 0, returnPct: 5, inflationPct: 2.5 };
