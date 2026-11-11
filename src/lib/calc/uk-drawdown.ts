/**
 * UK pension drawdown: "is my pot enough?" (FIREUK's most asked question: "Is £900k enough for a £40-50k lifestyle at 55?").
 *
 * One person living on a defined contribution pot (plus ISAs, State Pension and any DB pension), year by year from the
 * first plan year (tax year 2027-28 = the retirement pack's base year) to an end age. Tax is the UK pack's income tax
 * (src/lib/calc/retire/gb.ts: England, Wales and Northern Ireland or Scotland, allowance taper above £100,000, thresholds
 * frozen to 2030-31 by Finance Act 2026 s.10 then raised with inflation). Three ways to take the 25% tax-free part:
 *  - 'ufpls': leave the pot uncrystallised and take lump sums (UFPLS): 25% of each one is tax-free until the Lump Sum
 *    Allowance (£268,275) is used up, 75% is taxed as income.
 *  - 'pcls-first': take the tax-free lump sum (25%, at most £268,275) at the start, spend it first, then draw taxable
 *    income from the drawdown fund.
 *  - 'pcls-fill': as 'pcls-first', but every year also draw taxable income up to the personal allowance left after the
 *    State Pension and any DB pension (taxed at 0%), spending the tax-free cash on top. Unspent allowance money goes to ISAs.
 * Money outside the pension (tax-free cash taken and ISAs) is used after pension money and grows tax-free (ISAs).
 * Withdrawals are taken at the start of each year; what is left then grows. Amounts in today's money rise with
 * inflation; the State Pension is assumed to rise with inflation (the triple lock has given more).
 * Monte Carlo: yearly returns drawn from a lognormal distribution with the chosen average and volatility (seeded, so
 * the same inputs always give the same answer); inflation stays fixed.
 */
import { gbIncomeTax, gbIndex, gbStatePensionAge, GB_PENSION, GB_SP, GB_TAX, GB_URLS } from './retire/gb';

export type Strategy = 'ufpls' | 'pcls-first' | 'pcls-fill';
export const STRATEGIES: Strategy[] = ['pcls-fill', 'ufpls', 'pcls-first'];
export const STRATEGY_LABEL: Record<Strategy, string> = {
  ufpls: '25% of each withdrawal tax-free (UFPLS)',
  'pcls-first': 'Take 25% up front, spend it first',
  'pcls-fill': 'Take 25% up front + use your allowance each year',
};

export const BASE_YEAR = 2027;

export interface DrawdownInput {
  /** Age at the start of the first plan year (2027-28); retired from now. */
  age: number;
  /** Defined contribution pension pots today, total (none taken yet). */
  pot: number;
  /** ISAs and other savings today (tax-free). */
  isa: number;
  /** Spending a year after tax, today's money. */
  spending: number;
  /** New State Pension a week (2027-28 rate; full = £250.70). 0 = none. */
  statePensionWeekly: number;
  /** State Pension age (years, may have months as a fraction). Default: from the birth year implied by `age`. */
  statePensionAge?: number;
  /** DB or other taxable pension a year, today's money, from dbAge (rises with inflation). */
  dbPension?: number;
  dbAge?: number;
  /** Tax-free lump sums already taken or due from other pensions (e.g. a final salary scheme's lump sum), GBP: they use up the £268,275 Lump Sum Allowance first. */
  lsaUsed?: number;
  region: 'rUK' | 'scotland';
  strategy: Strategy;
  /** Average return a year after charges, %. */
  growth: number;
  inflation: number;
  /** Return volatility (standard deviation a year), % (Monte Carlo only). */
  volatility?: number;
  /** Plan to this age (inclusive). */
  endAge?: number;
}

export interface DrawdownRow {
  age: number;
  year: number;
  statePension: number;
  db: number;
  /** Taken from the pension this year (gross), the tax-free part of it, income tax for the year. */
  fromPension: number;
  taxFree: number;
  tax: number;
  /** From tax-free cash and ISAs. */
  fromOutside: number;
  spending: number;
  shortfall: number;
  /** Pension (uncrystallised + drawdown fund) and outside money at the end of the year. */
  pensionEnd: number;
  outsideEnd: number;
}

export interface DrawdownResult {
  /** First age spending could not be met in full; null = lasts to endAge. */
  runOutAge: number | null;
  /** Rows in today's money. */
  rows: DrawdownRow[];
  /** Income tax paid over the plan, today's money. */
  totalTax: number;
  /** Tax-free cash taken over the plan (nominal, counts against the £268,275 Lump Sum Allowance). */
  taxFreeTaken: number;
  /** Money left at endAge, today's money. */
  endWealth: number;
  /** Years before the State Pension starts (from the first year). */
  bridgeYears: number;
  statePensionAge: number;
  firstYearTax: number;
}

const clamp = (v: unknown, lo: number, hi: number, d: number) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d;
};

export interface Normalised extends Required<Omit<DrawdownInput, 'statePensionAge'>> { statePensionAge: number }

export function normalise(i: DrawdownInput): Normalised {
  const age = Math.round(clamp(i.age, 40, 90, 55));
  const endAge = Math.round(clamp(i.endAge ?? 95, age + 1, 110, 95));
  return {
    age, endAge,
    pot: clamp(i.pot, 0, 1e9, 0), isa: clamp(i.isa, 0, 1e9, 0), spending: clamp(i.spending, 0, 1e8, 0),
    statePensionWeekly: clamp(i.statePensionWeekly, 0, 2000, GB_SP.full2027),
    statePensionAge: clamp(i.statePensionAge ?? gbStatePensionAge(BASE_YEAR - age), 55, 80, 67),
    dbPension: clamp(i.dbPension ?? 0, 0, 1e7, 0), dbAge: Math.round(clamp(i.dbAge ?? age, 40, 90, age)),
    lsaUsed: clamp(i.lsaUsed ?? 0, 0, GB_PENSION.lsa, 0),
    region: i.region === 'scotland' ? 'scotland' : 'rUK',
    strategy: (STRATEGIES as string[]).includes(i.strategy) ? i.strategy : 'pcls-fill',
    growth: clamp(i.growth, -10, 20, 5), inflation: clamp(i.inflation, -5, 20, 2.5), volatility: clamp(i.volatility ?? 10, 0, 50, 10),
  };
}

/** Largest gross withdrawal W in [0, cap] with net(W) <= need, where net is increasing; returns W with net(W) ≈ need, or cap. */
function grossUp(need: number, cap: number, net: (w: number) => number): number {
  if (need <= 0 || cap <= 0) return 0;
  if (net(cap) <= need) return cap;
  let lo = need, hi = cap; // net(w) <= w, so w >= need
  if (lo > hi) lo = 0;
  for (let k = 0; k < 40 && hi - lo > 0.005; k++) {
    const mid = (lo + hi) / 2;
    if (net(mid) < need) lo = mid; else hi = mid;
  }
  return hi;
}

/** Normal minimum pension age in this tax year (55, 57 from 2028-29). Protected pension ages are not modelled. */
export const minPensionAge = (year: number) => (year >= GB_PENSION.nmpaFrom ? GB_PENSION.nmpaLater : GB_PENSION.nmpa);

/**
 * Run the plan with the given yearly returns (fractions, one per year; missing = the average growth).
 * `keepRows` false skips building rows (Monte Carlo).
 */
export function simulate(input: DrawdownInput, returns?: number[], keepRows = true): DrawdownResult {
  const p = normalise(input);
  const g = p.growth / 100, inf = p.inflation / 100;
  const scot = p.region === 'scotland';
  const years = p.endAge - p.age + 1;
  let pot = p.pot; // uncrystallised
  let fund = 0; // crystallised drawdown fund (all taxable)
  let tfc = 0; // tax-free cash taken, held outside the pension
  let isa = p.isa;
  let lsaLeft = GB_PENSION.lsa - p.lsaUsed;
  let started = false;
  let taxFreeTaken = 0, totalTax = 0, firstYearTax = 0;
  let runOutAge: number | null = null;
  const rows: DrawdownRow[] = [];

  for (let t = 0; t < years; t++) {
    const year = BASE_YEAR + t, age = p.age + t;
    const f = Math.pow(1 + inf, t);
    const k = gbIndex(year, inf, true);
    const r = returns?.[t] ?? g;
    const canDraw = started || age >= minPensionAge(year);

    if (canDraw && !started && (pot > 0)) {
      started = true;
      if (p.strategy !== 'ufpls') {
        const lump = Math.min(pot * GB_PENSION.maxLumpPct, lsaLeft);
        lsaLeft -= lump; taxFreeTaken += lump; tfc += lump; fund += pot - lump; pot = 0;
      }
    }

    const share = Math.min(1, Math.max(0, age + 1 - p.statePensionAge));
    const sp = p.statePensionWeekly * 52 * f * share;
    const db = p.dbPension > 0 && age >= p.dbAge ? p.dbPension * f : 0;
    const base = sp + db;
    const taxOn = (taxable: number) => gbIncomeTax(base + taxable, scot, k);
    const baseTax = taxOn(0);
    const need = p.spending * f;
    let remaining = need - (base - baseTax);
    let taxable = 0, taxFree = 0, fromPension = 0, fromOutside = 0;
    let surplus = 0;

    if (canDraw && p.strategy === 'pcls-fill' && fund > 0) {
      // Fill the personal allowance left after other income (allowance tapered above £100,000).
      const pa = Math.max(0, GB_TAX.allowance * k - Math.max(0, base - GB_TAX.taperFrom) / 2);
      const fill = Math.min(fund, Math.max(0, pa - base));
      fund -= fill; taxable += fill; fromPension += fill;
      remaining -= fill; // taxed at 0%
    }
    if (remaining < 0) { surplus = -remaining; remaining = 0; }

    if (remaining > 0 && canDraw) {
      if (p.strategy === 'ufpls' && pot > 0) {
        // Each UFPLS: 25% tax-free while the Lump Sum Allowance lasts.
        const tfOf = (w: number) => Math.min(w * GB_PENSION.maxLumpPct, lsaLeft);
        const t0 = taxable;
        const net = (w: number) => w - (taxOn(t0 + w - tfOf(w)) - taxOn(t0));
        const w = grossUp(remaining, pot, net);
        const tf = tfOf(w), got = net(w); // before the allowance is reduced
        pot -= w; lsaLeft -= tf; taxFreeTaken += tf; taxFree += tf; taxable += w - tf; fromPension += w;
        remaining = Math.max(0, remaining - got);
      } else {
        // Tax-free cash first, then taxable drawdown.
        const useTfc = Math.min(tfc, remaining);
        tfc -= useTfc; fromOutside += useTfc; remaining -= useTfc;
        if (remaining > 0 && fund > 0) {
          const t0 = taxable;
          const net = (w: number) => w - (taxOn(t0 + w) - taxOn(t0));
          const w = grossUp(remaining, fund, net);
          const got = net(w);
          fund -= w; taxable += w; fromPension += w;
          remaining = Math.max(0, remaining - got);
        }
      }
    }
    if (remaining > 0) {
      // Tax-free cash (UFPLS has none) and ISAs last.
      const useTfc = Math.min(tfc, remaining); tfc -= useTfc; remaining -= useTfc; fromOutside += useTfc;
      const useIsa = Math.min(isa, remaining); isa -= useIsa; remaining -= useIsa; fromOutside += useIsa;
    }
    isa += surplus;
    const tax = taxOn(taxable);
    const shortfall = remaining > 1 ? remaining : 0;
    if (shortfall > 0 && runOutAge === null) runOutAge = age;
    totalTax += tax / f;
    if (t === 0) firstYearTax = tax;

    pot *= 1 + r; fund *= 1 + r; tfc *= 1 + r; isa *= 1 + r;
    if (keepRows) rows.push({
      age, year, statePension: sp / f, db: db / f, fromPension: fromPension / f, taxFree: taxFree / f, tax: tax / f,
      fromOutside: fromOutside / f, spending: need / f, shortfall: shortfall / f,
      pensionEnd: (pot + fund) / f, outsideEnd: (tfc + isa) / f,
    });
    if (runOutAge !== null && !keepRows) break;
  }
  const fEnd = Math.pow(1 + inf, years);
  return {
    runOutAge, rows, totalTax, taxFreeTaken,
    endWealth: runOutAge === null ? (pot + fund + tfc + isa) / fEnd : 0,
    bridgeYears: Math.max(0, Math.min(years, Math.ceil(p.statePensionAge) - p.age)),
    statePensionAge: p.statePensionAge,
    firstYearTax,
  };
}

/** Highest spending (today's money, to the nearest £100) that lasts to the end age at the average return. */
export function sustainableSpending(input: DrawdownInput): number {
  let lo = 0, hi = Math.max(20000, (input.spending || 0) * 3);
  while (simulate({ ...input, spending: hi }, undefined, false).runOutAge === null && hi < 1e8) hi *= 2;
  for (let i = 0; i < 40 && hi - lo > 20; i++) {
    const mid = (lo + hi) / 2;
    if (simulate({ ...input, spending: mid }, undefined, false).runOutAge === null) lo = mid; else hi = mid;
  }
  return Math.floor(lo / 100) * 100;
}

/** Seeded random number generator (mulberry32), so results are repeatable. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `runs` paths of yearly returns, lognormal: the middle (median) yearly return is `growth`%, so the fixed-return plan is
 * the middle outcome, and returns swing with standard deviation about `volatility`%.
 */
export function returnPaths(growth: number, volatility: number, years: number, runs: number, seed = 20271): number[][] {
  const m = growth / 100, s = volatility / 100;
  const sigma = Math.sqrt(Math.log(1 + (s * s) / ((1 + m) * (1 + m)))), mu = Math.log(1 + m);
  const u = rng(seed);
  const paths: number[][] = [];
  for (let i = 0; i < runs; i++) {
    const path: number[] = [];
    for (let y = 0; y < years; y++) {
      const z = Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
      path.push(Math.exp(mu + sigma * z) - 1);
    }
    paths.push(path);
  }
  return paths;
}

export interface MonteCarlo {
  runs: number;
  /** Share of runs where spending lasts to the end age. */
  success: number;
  /** Run-out age in the worst 10% of runs (null = even then it lasts). */
  p10RunOut: number | null;
  /** Money left at the end age in today's money: middle run and the worst-10% run. */
  medianEnd: number;
}

export function monteCarlo(input: DrawdownInput, runs = 1000, paths?: number[][]): MonteCarlo {
  const p = normalise(input);
  const years = p.endAge - p.age + 1;
  const ps = paths ?? returnPaths(p.growth, p.volatility, years, runs);
  const outs = ps.map((path) => simulate(input, path, false));
  const ok = outs.filter((o) => o.runOutAge === null).length;
  const runOut = outs.map((o) => o.runOutAge ?? Infinity).sort((a, b) => a - b);
  const p10 = runOut[Math.floor(ps.length * 0.1)];
  const ends = outs.map((o) => o.endWealth).sort((a, b) => a - b);
  return { runs: ps.length, success: ok / ps.length, p10RunOut: p10 === Infinity ? null : p10, medianEnd: ends[Math.floor(ps.length / 2)] };
}

/** Highest spending (nearest £500) that lasts to the end age in at least `target` of the Monte Carlo runs (same paths for each test). */
export function safeSpending(input: DrawdownInput, target = 0.9, runs = 500): number {
  const p = normalise(input);
  const years = p.endAge - p.age + 1;
  const paths = returnPaths(p.growth, p.volatility, years, runs);
  const passes = (s: number) => monteCarlo({ ...input, spending: s }, runs, paths).success >= target;
  let lo = 0, hi = Math.max(20000, sustainableSpending(input) * 1.2);
  while (passes(hi) && hi < 1e8) hi *= 2;
  for (let i = 0; i < 14 && hi - lo > 250; i++) {
    const mid = (lo + hi) / 2;
    if (passes(mid)) lo = mid; else hi = mid;
  }
  return Math.floor(lo / 500) * 500;
}

export function compareStrategies(input: DrawdownInput) {
  return STRATEGIES.map((s) => {
    const r = simulate({ ...input, strategy: s });
    return { strategy: s, label: STRATEGY_LABEL[s], runOutAge: r.runOutAge, totalTax: r.totalTax, endWealth: r.endWealth, sustainable: sustainableSpending({ ...input, strategy: s }) };
  });
}

/** FIREUK's "55, £900k+, is it enough for £40-50k?" with the full State Pension at 67. */
export const DRAWDOWN_EXAMPLE: DrawdownInput = {
  age: 55, pot: 900000, isa: 0, spending: 45000, statePensionWeekly: GB_SP.full2027,
  region: 'rUK', strategy: 'pcls-fill', growth: 5, inflation: 2.5, volatility: 10, endAge: 95,
};

export const DRAWDOWN_SOURCES = {
  taxFree: GB_URLS.taxFree,
  lsa: GB_URLS.pens,
  it: GB_URLS.it,
  freeze: GB_URLS.freeze,
  scot: GB_URLS.scot,
  sp: GB_URLS.sp,
  spRise: GB_URLS.gad,
  spa: GB_URLS.spa,
  nmpa: GB_URLS.nmpa,
  iht: GB_URLS.iht,
  pensionTax: GB_URLS.pensionTax,
  ufpls: 'https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm063300',
  takePension: 'https://www.gov.uk/personal-pensions-your-rights/how-you-can-take-your-pension',
  mpaa: 'https://www.gov.uk/tax-on-your-private-pension/annual-allowance',
  emergency: 'https://www.gov.uk/claim-tax-refund/pension-payment',
} as const;
