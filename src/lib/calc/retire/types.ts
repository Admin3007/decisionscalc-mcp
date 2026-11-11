/**
 * Retirement projection: the shapes shared by the engine (./engine.ts) and the country rule packs (./ie.ts).
 * The engine knows nothing about any country: tax, State Pension age, lump sum and minimum drawdown rules all
 * come from the pack, so a CA/AU/GB/US pack can be added without touching the engine.
 */

/** Where a figure comes from: the official page, the date it was read, what it says. */
export interface Source { what: string; url: string; read: string }

export type Household = 'single' | 'married' | 'cohabiting';

export interface PersonInput {
  /** Age in the first projected year (the pack's base year). */
  age: number;
  /** Stops paid work at this age (no salary from this age on). */
  retireAge: number;
  /** Draws the pension pot (lump sum + drawdown fund) at this age; defaults to retireAge. */
  drawAge?: number;
  /** Gross pay a year, today's money. */
  salary: number;
  /** Own pension contributions, % of salary (incl. AVCs). */
  contribPct: number;
  /** Employer contributions, % of salary. */
  employerPct: number;
  /** Defined contribution pots today (occupational DC, PRSA, AVC, PEPP), total. */
  pensionPot: number;
  /** Drawdown fund (ARF / vested PRSA) already held. */
  arf?: number;
  /** Share of the pot taken as a lump sum at drawAge, 0 to the pack's maximum (Ireland 25%). */
  lumpPct?: number;
  /** Defined benefit pension: amount a year in its first year of payment. */
  dbPension: number;
  dbFromAge: number;
  /** Increase a year once the DB pension is in payment, %. */
  dbIndex: number;
  /** Lump sum paid with the DB pension (counts towards the lifetime tax-free amount). */
  dbLumpSum?: number;
  /** State Pension a week in today's money (0 = none). Paid from the pack's State Pension age. */
  statePensionWeekly: number;
  /** UK State Pension a week in pounds (base-year pounds), paid from ukPensionAge; 0 = none. */
  ukPensionWeekly?: number;
  ukPensionAge?: number;
  /** Holds a full medical card (Ireland: reduced USC rate, legislated to the end of 2027). */
  medicalCard?: boolean;
  /**
   * Age the State Pension (or the pack's main public pension) starts, in years; may have a fraction (UK: 66 and 6 months
   * = 66.5, paid for the part of that year). Unset: the pack's statePensionAgeFor(birth year), else its statePensionAge.
   * Canada: the CPP start age you choose (60 to 70), which also sets the early/late adjustment.
   */
  statePensionAge?: number;
  /** Canada: OAS start age (65 to 70) and years lived in Canada after 18 (40 = full OAS). */
  pension2Age?: number;
  pension2Years?: number;
}

export interface LocalOptions {
  /** UK: 'rUK' | 'scotland'. Canada: province code (ON, BC, ...). */
  region?: string;
  /** Australia: owns the home (Age Pension assets test thresholds). */
  homeowner?: boolean;
  /** Australia: other assets the assets test counts (car, contents, etc.), today's money. */
  otherAssets?: number;
  /** Canada: split eligible pension income between spouses (default true). */
  split?: boolean;
}

export interface PlanInput {
  household: Household;
  /** One person, or two for a couple (married or cohabiting). */
  people: PersonInput[];
  /** Savings and investments outside pensions today (household). */
  savings: number;
  /** Added to savings each year until person 1 retires, today's money. */
  savingsAdd: number;
  /** Household spending a year in retirement, today's money (after tax). */
  spending: number;
  /** Pension and drawdown fund growth, % a year after charges. */
  growth: number;
  /** Savings growth, % a year after tax. */
  savingsGrowth: number;
  inflation: number;
  /** Pay growth, % a year. */
  payGrowth: number;
  /** Tax bands and credits rise with inflation (an assumption: Budgets usually raise them). */
  indexTax: boolean;
  /** Pounds per unit of the pack's currency (euro, Canadian or Australian dollar) for the UK State Pension (defaults to the pack's dated rate). */
  gbpPerEur?: number;
  /** Country options read by the pack. */
  local?: LocalOptions;
}

/** One person's taxable amounts for a year before any extra drawdown (built by the engine, taxed by the pack). */
export interface TaxPerson {
  exists: boolean;
  age: number;
  /** Income for income tax: pay after relieved pension contributions + pensions + State Pension + drawdown. */
  itBase: number;
  /** Income for the pack's second charge (Ireland: USC, which excludes State Pension). */
  uscBase: number;
  /** Income that earns the employee tax credit (pay, occupational pension, State Pension). */
  creditBase: number;
  medicalCard: boolean;
  /** The parts, for packs that tax each kind differently. */
  salary: number;
  /** Own pension contributions that get tax relief (deducted from pay). */
  relieved: number;
  db: number;
  sp: number;
  sp2: number;
  uk: number;
  /** Minimum drawdown from the drawdown fund (ARF, RRIF, account-based pension). */
  draw: number;
  /** Means-tested benefit for this person (Australia: Age Pension share; Canada: GIS). */
  benefit: number;
}

export interface TaxYear {
  year: number;
  /** Cumulative inflation factor applied to bands and credits (1 when not indexed). */
  idx: number;
  household: Household;
  people: [TaxPerson, TaxPerson];
  /** Years since the base year, inflation (fraction) and the index switch: for packs whose bands are frozen for a while (UK to 2030-31). */
  t?: number;
  inf?: number;
  indexTax?: boolean;
  local?: LocalOptions;
}

/** What a means-tested benefit hook sees for a year (nominal amounts). */
export interface BenefitCtx {
  year: number;
  t: number;
  /** Inflation factor since the base year. */
  f: number;
  idx: number;
  household: Household;
  two: boolean;
  local: LocalOptions;
  ages: [number, number];
  /** Savings, drawdown funds and undrawn pots at the start of the year (before growth). */
  savings: number;
  funds: [number, number];
  pots: [number, number];
  /** This year's income per person (before any extra drawdown). */
  income: { salary: number; db: number; sp: number; sp2: number; uk: number; draw: number }[];
  /** Last year's income per person (taxable income except sp2 and the benefit, before relief) and pay; this year's when t = 0. */
  prev: { income: number; pay: number }[];
}

export interface RulePack {
  id: string;
  country: string;
  currency: string;
  locale: string;
  /** First projected year: inputs are in this year's money. */
  baseYear: number;
  endAge: number;
  statePensionAge: number;
  maxLumpPct: number;
  /** Share of pay (by age) on which own contributions get tax relief, and the earnings cap. */
  reliefPct(age: number): number;
  reliefCap: number;
  /** Tax on a person's lifetime retirement lump sums totalling `cumulative`. */
  lumpTax(cumulative: number): number;
  /** Minimum (imputed) drawdown rate for a drawdown fund worth `value` held at `age`. */
  minDrawdownRate(age: number, value: number): number;
  /** Social insurance on pay (Ireland: PRSI). */
  payContribution(year: number, age: number, salary: number, onStatePension: boolean, reachedSpa?: boolean, ctx?: { t: number; f: number; inf: number; indexTax: boolean }): number;
  /** Income tax + second charge for the household when `x1`/`x2` extra drawdown is added to each person. */
  tax(t: TaxYear, x1: number, x2: number): { incomeTax: number; usc: number };
  /** How this country treats a UK State Pension paid to its residents. */
  ukPension: {
    /** Rises each year (Ireland, EEA) or frozen (Canada, Australia). */
    indexed: boolean;
    /** Counts for the employee-type tax credit, and for the second charge (Ireland: USC). */
    earnsCredit: boolean;
    secondCharge: boolean;
    gbpPerEur: number;
    fullWeekly: number;
    fullYears: number;
    /** UK State Pension age (whole years) for someone born in this year. */
    age(birthYear: number): number;
  };
  /** Lifetime allowance for pension savings by year (warning only). */
  fundThreshold(year: number): number;
  sources: Source[];

  // Optional country hooks. Unset = the Irish behaviour, so the Irish results never change.
  /** State Pension amounts are entered per this period (52 = a week, the default; Canada CPP 12 = a month). */
  periods?: number;
  /** Closing-step divisor for the extra drawdown (below 1 - the highest marginal rate). */
  close?: number;
  /** Default State Pension age for someone born in this year (used when the person has no statePensionAge). */
  statePensionAgeFor?(birthYear: number): number;
  /** Adjustment for starting the State Pension at this age (Canada CPP: -7.2% a year before 65, +8.4% after). */
  statePensionFactor?(startAge: number): number;
  /** A second public pension per person, nominal a year (Canada: OAS). */
  pension2?(q: PersonInput, age: number, f: number): number;
  /** Whether a pot can be drawn at this age in this year (UK minimum pension age, Australian preservation age). */
  canDraw?(age: number, year: number): boolean;
  /** The pot is drawn in this year of age at the latest (Canada: RRSP to RRIF by the year you turn 71). */
  maxDrawAge?: number;
  /** Lifetime cap on tax-free lump sums (UK Lump Sum Allowance): the lump sum is limited to what is left of it. */
  lumpCap?: number;
  /** Tax taken inside the fund from contributions (Australia: 15% on concessional contributions). */
  contribTax?: number;
  /** Minimum drawdown on the fund's opening value (Canada RRIF, Australia account-based pension; none in the first year). */
  minOnOpening?: boolean;
  /** Means-tested benefit per person, nominal a year (Australia: Age Pension; Canada: GIS). */
  benefit?(c: BenefitCtx): [number, number];
  /** Person 1's age from which the "bridge" ends (default: their State Pension age, rounded up). */
  bridgeAge?(q: PersonInput): number;
}

export interface YearRow {
  year: number;
  age1: number;
  age2: number | null;
  retired: boolean;
  salary: number;
  /** Own pension contributions out of pay. */
  contributions: number;
  db: number;
  statePension: number;
  /** UK State Pension, in the pack's currency. */
  ukPension: number;
  /** Second public pension (Canada: OAS) and means-tested benefit (Australia: Age Pension; Canada: GIS); 0 elsewhere. */
  statePension2: number;
  benefit: number;
  /** Drawdown from the ARF: imputed minimum + any extra needed. */
  arfMin: number;
  arfExtra: number;
  /** Lump sums received this year, after their tax. */
  lumpNet: number;
  lumpTax: number;
  incomeTax: number;
  usc: number;
  prsi: number;
  /** Income after tax from pay, pensions and drawdown (not savings). */
  netIncome: number;
  spending: number;
  fromSavings: number;
  /** Spending that could not be paid for. */
  shortfall: number;
  savingsEnd: number;
  arfEnd: number;
  potEnd: number;
  /** Divide by this to get today's money. */
  deflator: number;
}

export interface PlanResult {
  rows: YearRow[];
  /** Person 1's age in the first year spending could not be met in full; null = it lasts to endAge. */
  runOutAge: number | null;
  /** Retirement years before the State Pension starts (person 1). */
  bridgeYears: number;
  lumpSums: { gross: number; tax: number };
  /** Income tax + USC + PRSI from retirement to endAge, plus lump sum tax. */
  taxInRetirement: number;
  /** Total of savings + drawdown funds + pots at retirement (nominal) and in today's money. */
  wealthAtRetirement: number;
  wealthAtRetirementToday: number;
  /** Pot above the fund threshold in the year it is drawn. */
  overThreshold: boolean;
}
