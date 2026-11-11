/**
 * Salary Negotiation — pure calculation logic.
 *
 * Extracted from src/pages/tools/salary-negotiation-calculator.astro (CONTRACTS §4).
 * Country pay-range tables (FIELDS_SETS) stay in the page and move to the data
 * pack in Step 1.4; the page resolves the market low/median/high and passes the
 * range bounds in. Percent inputs are taken as whole numbers (e.g. 3 for 3%).
 */

export interface SalaryInputs {
  offer: number;
  target: number;
  years: number;
  annualRaise: number;     // percent
  retirement401k: number;  // percent of the salary difference contributed
  investReturn: number;    // percent annual return on investments
  marketLow: number;
  marketHigh: number;
}

export interface SalaryResults {
  diff: number;        // immediate annual increase
  lifeDiff: number;    // lifetime salary difference with raises
  k401: number;        // compounded retirement-contribution impact
  total: number;       // lifeDiff + k401
  avgPerYr: number;
  mktPos: number;      // 0–100 percentile of the ask within the market range
}

/** Sum of a salary growing at rate `r` for `n` years (geometric series). */
export function lifetimeSalary(start: number, r: number, n: number): number {
  if (r === 0) return start * n;
  return start * ((Math.pow(1 + r, n) - 1) / r);
}

export function computeSalaryNegotiation(input: SalaryInputs): SalaryResults {
  const years = Math.round(input.years);
  const raiseRate = input.annualRaise / 100;
  const k401Rate = input.retirement401k / 100;
  const retRate = input.investReturn / 100;

  const diff = input.target - input.offer;
  const lifeDiff = lifetimeSalary(input.target, raiseRate, years) - lifetimeSalary(input.offer, raiseRate, years);

  let k401 = 0;
  for (let i = 1; i <= years; i++) {
    k401 += diff * k401Rate * Math.pow(1 + raiseRate, i - 1) * Math.pow(1 + retRate, years - i + 1);
  }

  const total = lifeDiff + k401;
  const avgPerYr = years > 0 ? total / years : 0;
  const mktPos = input.marketHigh > input.marketLow
    ? Math.max(0, Math.min(100, ((input.target - input.marketLow) / (input.marketHigh - input.marketLow)) * 100))
    : 50;

  return { diff, lifeDiff, k401, total, avgPerYr, mktPos };
}
