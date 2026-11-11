/**
 * FIRE (Financial Independence / Retire Early) — pure calculation logic.
 *
 * Extracted from src/pages/tools/fire-calculator.astro so the math is unit
 * testable and reusable (e.g. to build rich AI-analysis payloads). The page's
 * inline script should import and call these; no DOM access here.
 *
 * Methodology: FIRE number = annual expenses ÷ safe withdrawal rate (Trinity
 * Study / Bengen 1994). Returns are treated as real (inflation-adjusted).
 */

export interface FireInputs {
  currentAge: number;
  targetAge: number;
  annualSpend: number;
  currentSavings: number;
  annualSavings: number;
  /** Expected real annual return, as a percent, e.g. 7 for 7%. */
  returnRate: number;
  /** Estimated Social Security benefit in dollars PER MONTH. */
  ssMonthly: number;
  ssStartAge: 62 | 67 | 70;
  /** Safe withdrawal rate as a percent, e.g. 4 for 4%. */
  withdrawalRate: number;
  /** Inflation assumption as a percent (informational; returns are real). */
  inflationRate: number;
}

export interface FireResults {
  fireNumber: number;        // FIRE target ignoring Social Security
  fireNumberWithSS: number;  // FIRE target after capitalizing SS income
  yearsToFire: number;       // Infinity if never reached at current rate
  yearsToFireWithSS: number;
  fireAge: number;           // currentAge + yearsToFire (Infinity-safe)
  fireAgeWithSS: number;
  portfolioAtTargetAge: number;
  progressPct: number;       // 0–100, savings vs fireNumber
  onTrack: boolean;          // will reach FIRE by targetAge
}

const MAX_PROJECTION_YEARS = 60;

/** Years until a growing portfolio first reaches `target`. Infinity if never. */
export function yearsToReach(
  startBalance: number,
  annualContribution: number,
  realReturnRate: number,
  target: number,
): number {
  if (target <= startBalance) return 0;
  let portfolio = startBalance;
  for (let yr = 1; yr <= MAX_PROJECTION_YEARS; yr++) {
    portfolio = portfolio * (1 + realReturnRate) + annualContribution;
    if (portfolio >= target) return yr;
  }
  return Infinity;
}

/**
 * Year-by-year portfolio trajectory (index 0 = today). Used by the FIRE
 * growth chart (Step 3.3); same compounding model as projectPortfolio.
 */
export function portfolioSeries(
  startBalance: number,
  annualContribution: number,
  realReturnRate: number,
  years: number,
): number[] {
  const out = [startBalance];
  let portfolio = startBalance;
  for (let i = 0; i < Math.max(0, years); i++) {
    portfolio = portfolio * (1 + realReturnRate) + annualContribution;
    out.push(portfolio);
  }
  return out;
}

/** Project a portfolio forward `years` with annual contributions. */
export function projectPortfolio(
  startBalance: number,
  annualContribution: number,
  realReturnRate: number,
  years: number,
): number {
  let portfolio = startBalance;
  for (let i = 0; i < Math.max(0, years); i++) {
    portfolio = portfolio * (1 + realReturnRate) + annualContribution;
  }
  return portfolio;
}

export function computeFire(input: FireInputs): FireResults {
  const ret = input.returnRate / 100;
  const wd = input.withdrawalRate / 100;
  const ssAnnual = input.ssMonthly * 12;

  const fireNumber = wd > 0 ? input.annualSpend / wd : Infinity;
  const fireNumberWithSS = wd > 0 ? Math.max(0, (input.annualSpend - ssAnnual) / wd) : Infinity;

  const yearsToFire = yearsToReach(input.currentSavings, input.annualSavings, ret, fireNumber);
  const yearsToFireWithSS = yearsToReach(input.currentSavings, input.annualSavings, ret, fireNumberWithSS);

  const targetYears = input.targetAge - input.currentAge;
  const portfolioAtTargetAge = projectPortfolio(input.currentSavings, input.annualSavings, ret, targetYears);

  const progressPct = fireNumber > 0 && isFinite(fireNumber)
    ? Math.min(100, Math.round((input.currentSavings / fireNumber) * 100))
    : 0;

  return {
    fireNumber,
    fireNumberWithSS,
    yearsToFire,
    yearsToFireWithSS,
    fireAge: input.currentAge + yearsToFire,
    fireAgeWithSS: input.currentAge + yearsToFireWithSS,
    portfolioAtTargetAge,
    progressPct,
    onTrack: input.currentAge + yearsToFire <= input.targetAge,
  };
}
