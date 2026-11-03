/**
 * KiwiSaver (New Zealand): pure calculation logic. Every rule read on ird.govt.nz on 2026-11-03
 * (kiwisaver.govt.nz redirects to ird.govt.nz/kiwisaver).
 *  - Contribution rates: "KiwiSaver changes" (last updated 8 Apr 2026) and IR340 April 2026 PAYE tables:
 *    employee rates 3.5%, 4%, 6%, 8% or 10%; the default and the compulsory employer minimum are 3.5% from the
 *    first pay on or after 1 April 2026 and 4% from 1 April 2028. A temporary rate reduction to 3% lasts 3–12 months.
 *  - Government contribution: "Getting the KiwiSaver government contribution" (last updated 3 Jun 2026):
 *    25 cents per $1 the member contributes, maximum $260.72 a year (1 July–30 June), so $1,042.86 gets the most;
 *    not paid if taxable income is over $180,000; ages 16 to 65.
 *  - ESCT: IR340 April 2026 (tax year 1 April 2026–31 March 2027): rate set by salary or wages plus gross employer
 *    contributions: up to $18,720 10.5%, to $64,200 17.5%, to $93,720 30%, to $216,000 33%, above 39%.
 *  - PIR: IR861 March 2026: 10.5% / 17.5% / 28% from the previous two years' income (default 28%).
 *  - Employers do not have to contribute for employees over 65; savings can be withdrawn at 65.
 * Growth, fees, pay rises and inflation are the user's assumptions (shown as such).
 * Years run in tax years from 1 April 2026; the 2028/29 tax year is the first at 4%.
 */
export const FIRST_TAX_YEAR = 2026;
export const RATE_RISE_YEAR = 2028;
export const DEFAULT_RATE_NOW = 0.035;
export const DEFAULT_RATE_2028 = 0.04;
export const EMPLOYEE_RATES = [0.035, 0.04, 0.06, 0.08, 0.1] as const;
export const GOV_RATE = 0.25;
export const GOV_MAX = 260.72;
export const GOV_INCOME_LIMIT = 180000;
export const WITHDRAW_AGE = 65;
export const ESCT_BANDS = [
  { upTo: 18720, rate: 0.105 },
  { upTo: 64200, rate: 0.175 },
  { upTo: 93720, rate: 0.3 },
  { upTo: 216000, rate: 0.33 },
  { upTo: Infinity, rate: 0.39 },
] as const;
export const PIR_RATES = [0.105, 0.175, 0.28] as const;

/** The legal minimum (and default employee rate) for a tax year starting 1 April `taxYear`. */
export const minimumRate = (taxYear: number) => (taxYear >= RATE_RISE_YEAR ? DEFAULT_RATE_2028 : DEFAULT_RATE_NOW);

/** ESCT rate from salary or wages plus gross employer contributions. */
export function esctRate(salaryPlusEmployer: number): number {
  for (const b of ESCT_BANDS) if (salaryPlusEmployer <= b.upTo) return b.rate;
  return 0.39;
}

/**
 * Likely PIR for someone whose only income is salary (IR861: 10.5% if taxable income ≤ $15,600 and with PIE
 * income ≤ $53,500; 17.5% if taxable income ≤ $53,500 and with PIE income ≤ $78,100; otherwise 28%).
 */
export function suggestedPir(salary: number, pieIncome = 0): number {
  if (salary <= 15600 && salary + pieIncome <= 53500) return 0.105;
  if (salary <= 53500 && salary + pieIncome <= 78100) return 0.175;
  return 0.28;
}

export function governmentContribution(memberContribution: number, taxableIncome: number, age: number): number {
  if (age < 16 || age >= WITHDRAW_AGE || taxableIncome > GOV_INCOME_LIMIT) return 0;
  return Math.min(GOV_MAX, Math.max(0, memberContribution) * GOV_RATE);
}

export interface KsInput {
  age: number;
  balance: number;           // KiwiSaver balance today
  salary: number;            // gross salary or wages a year
  payGrowth: number;         // % a year
  /** 'default' follows the default rate (3.5%, then 4% from April 2028); otherwise a fixed rate like 0.06. */
  employeeRate: 'default' | number;
  /** 'minimum' follows the compulsory employer rate; otherwise a fixed rate the employer pays. */
  employerRate: 'minimum' | number;
  pir: number;               // 0.105 | 0.175 | 0.28
  grossReturn: number;       // % a year before tax and fees
  feePct: number;            // % a year of the balance
  feeDollars: number;        // $ a year (membership fee)
  inflation: number;         // % a year, for today's dollars
}

export interface KsYear { taxYear: number; age: number; salary: number; employee: number; employerGross: number; esct: number; employerNet: number; government: number; balance: number }
export interface KsResult {
  years: KsYear[];
  atRetirement: number;
  todaysDollars: number;
  startBalance: number;
  paidByYou: number;
  employerNet: number;
  esctPaid: number;
  government: number;
  returns: number;   // after PIE tax and fees
  netReturn: number; // % a year after PIE tax and the % fee
}

const n = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function computeKiwiSaver(i: KsInput): KsResult {
  const age = Math.max(16, Math.min(64, Math.floor(n(i.age, 30))));
  const g = n(i.payGrowth) / 100;
  const pir = (PIR_RATES as readonly number[]).includes(n(i.pir)) ? n(i.pir) : 0.28;
  const net = (n(i.grossReturn) / 100) * (1 - pir) - n(i.feePct) / 100;
  const feeDollars = Math.max(0, n(i.feeDollars));
  const infl = n(i.inflation) / 100;
  const startBalance = Math.max(0, n(i.balance));
  let salary = Math.max(0, n(i.salary));
  let balance = startBalance;
  let you = 0, empNet = 0, esctPaid = 0, gov = 0;
  const years: KsYear[] = [];
  for (let k = 0; k < WITHDRAW_AGE - age; k++) {
    const taxYear = FIRST_TAX_YEAR + k;
    const minRate = minimumRate(taxYear);
    const eRate = i.employeeRate === 'default' ? minRate : Math.max(minRate, n(i.employeeRate, minRate));
    const mRate = i.employerRate === 'minimum' ? minRate : Math.max(minRate, n(i.employerRate, minRate));
    const employee = salary * eRate;
    const employerGross = salary * mRate;
    const esct = employerGross * esctRate(salary + employerGross);
    const employerNet = employerGross - esct;
    const government = governmentContribution(employee, salary, age + k);
    // Contributions arrive through the year: on average half a year of growth. The $ fee comes off at year end.
    balance = Math.max(0, balance * (1 + net) + (employee + employerNet + government) * (1 + net / 2) - feeDollars);
    you += employee; empNet += employerNet; esctPaid += esct; gov += government;
    years.push({
      taxYear, age: age + k, salary: Math.round(salary), employee: Math.round(employee),
      employerGross: Math.round(employerGross), esct: Math.round(esct), employerNet: Math.round(employerNet),
      government: Math.round(government * 100) / 100, balance: Math.round(balance),
    });
    salary *= 1 + g;
  }
  const atRetirement = Math.round(balance);
  return {
    years, atRetirement,
    todaysDollars: Math.round(balance / Math.pow(1 + infl, years.length)),
    startBalance: Math.round(startBalance),
    paidByYou: Math.round(you), employerNet: Math.round(empNet), esctPaid: Math.round(esctPaid), government: Math.round(gov),
    returns: Math.round(balance - startBalance - you - empNet - gov),
    netReturn: net * 100,
  };
}
