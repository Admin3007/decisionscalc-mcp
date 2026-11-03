/**
 * MyFutureFund (Irish pension auto-enrolment): pure calculation logic.
 * Rules (read 2026-11-02): Citizens Information "Auto-enrolment pension – MyFutureFund" and myfuturefund.ie.
 *  - scheme started 1 January 2026; contribution rates by scheme year (employee / employer / State):
 *    years 1–3 1.5 / 1.5 / 0.5%, 4–6 3 / 3 / 1%, 7–9 4.5 / 4.5 / 1.5%, 10+ 6 / 6 / 2%;
 *  - contributions are on gross pay up to €80,000 a year (Department of Social Protection payroll guidance:
 *    contributions stop once €80,000 is reached in the year; Citizens Information: employer and State stop at €80,000);
 *  - automatic for ages 23–60 earning over €20,000 with no payroll pension.
 * Growth is the user's assumption (shown as such); fund charges are an input.
 */
export const SCHEME_START_YEAR = 2026;
export const PAY_CAP = 80000;
export const PHASES = [
  { fromYear: 1, employee: 0.015, employer: 0.015, state: 0.005 },
  { fromYear: 4, employee: 0.03, employer: 0.03, state: 0.01 },
  { fromYear: 7, employee: 0.045, employer: 0.045, state: 0.015 },
  { fromYear: 10, employee: 0.06, employer: 0.06, state: 0.02 },
] as const;

export function ratesFor(calendarYear: number) {
  const schemeYear = calendarYear - SCHEME_START_YEAR + 1;
  let r: (typeof PHASES)[number] = PHASES[0];
  for (const p of PHASES) if (schemeYear >= p.fromYear) r = p;
  return r;
}

export interface MffInput {
  age: number;          // age now
  retireAge: number;    // MyFutureFund pays out from State Pension age; 66 is the default
  salary: number;       // gross pay a year, today
  payGrowth: number;    // % a year
  investReturn: number; // % a year, before charges
  charges: number;      // % a year
  startYear?: number;   // first calendar year of contributions (default 2026)
}

export interface MffYear { year: number; age: number; pay: number; employee: number; employer: number; state: number; balance: number }
export interface MffResult {
  years: MffYear[];
  pot: number;
  paidByYou: number;
  paidByEmployer: number;
  paidByState: number;
  growth: number;
  /** For every €1 you pay in, what goes into your pot from employer + State. */
  matchPerEuro: number;
}

const n = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function computeMff(i: MffInput): MffResult {
  const age = Math.max(18, Math.min(66, Math.floor(n(i.age, 30))));
  const retire = Math.max(age + 1, Math.min(70, Math.floor(n(i.retireAge, 66))));
  const start = Math.max(SCHEME_START_YEAR, Math.floor(n(i.startYear, SCHEME_START_YEAR)));
  const g = n(i.payGrowth) / 100;
  const net = (n(i.investReturn) - n(i.charges)) / 100;
  let pay = Math.max(0, n(i.salary));
  let balance = 0;
  const years: MffYear[] = [];
  let you = 0, emp = 0, st = 0;
  for (let k = 0; k < retire - age; k++) {
    const year = start + k;
    const r = ratesFor(year);
    const base = Math.min(pay, PAY_CAP);
    const e = base * r.employee, m = base * r.employer, s = base * r.state;
    // Contributions arrive through the year: on average half a year of growth.
    balance = balance * (1 + net) + (e + m + s) * (1 + net / 2);
    you += e; emp += m; st += s;
    years.push({ year, age: age + k, pay: Math.round(pay), employee: Math.round(e), employer: Math.round(m), state: Math.round(s), balance: Math.round(balance) });
    pay *= 1 + g;
  }
  const pot = Math.round(balance);
  return {
    years, pot,
    paidByYou: Math.round(you), paidByEmployer: Math.round(emp), paidByState: Math.round(st),
    growth: Math.round(balance - you - emp - st),
    matchPerEuro: you > 0 ? (emp + st) / you : 0,
  };
}
