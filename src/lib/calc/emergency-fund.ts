/**
 * Emergency Fund — pure calculation logic.
 *
 * Extracted from src/pages/tools/emergency-fund-calculator.astro (CONTRACTS §4)
 * so the math is unit-testable and reusable. No DOM access here; the page's
 * inline script imports computeEmergencyFund() and only wires the DOM.
 *
 * Methodology: a risk-weighted number of months of essential expenses.
 * Buffer months scale with job stability, income-stream fragility, and health
 * risk (BLS unemployment-duration data, Fed SCF, KFF OOP data), capped at 9.
 */

export type JobStability = 'high' | 'good' | 'moderate' | 'variable' | 'freelance';
export type IncomeStreams = 'dual' | 'single' | 'singleParent' | string;
export type HealthRisk = 'low' | 'moderate' | 'high' | string;

export interface EmergencyFundInputs {
  housing: number;
  food: number;
  transport: number;
  utilities: number;
  insurance: number;
  minDebt: number;
  other: number;
  currentSaved: number;
  monthlySavingsCapacity: number;
  jobStability: JobStability | string;
  incomeStreams: IncomeStreams;
  healthRisk: HealthRisk;
}

export interface SavingsPlan {
  /** Monthly contribution for this plan. */
  rate: number;
  /** Whole months to close the gap at `rate` (Infinity if rate <= 0). */
  months: number;
}

export interface EmergencyFundResults {
  monthlyExpenses: number;
  targetMonths: number;   // recommended buffer, integer, capped at 9
  target: number;         // dollar target fund
  gap: number;            // remaining to save (>= 0)
  pct: number;            // 0–100 progress
  funded: boolean;        // gap === 0
  /** Three plans: at capacity, 1.5×, and 2× capacity. Empty if capacity <= 0. */
  plans: SavingsPlan[];
}

/** Base buffer months by job stability. */
export function baseBufferMonths(jobStability: string): number {
  switch (jobStability) {
    case 'high': return 3;
    case 'good': return 3.5;
    case 'moderate': return 4.5;
    case 'variable': return 5.5;
    case 'freelance': return 7;
    default: return 3;
  }
}

/** Risk-weighted recommended buffer months, capped at 9 (integer). */
export function recommendedMonths(
  jobStability: string,
  incomeStreams: IncomeStreams,
  healthRisk: HealthRisk,
): number {
  let m = baseBufferMonths(jobStability);
  if (incomeStreams === 'single') m += 0.5;
  if (incomeStreams === 'singleParent') m += 1.5;
  if (healthRisk === 'moderate') m += 0.5;
  if (healthRisk === 'high') m += 1.5;
  return Math.min(Math.ceil(m), 9);
}

/** Whole months to close `gap` at monthly `rate`. Infinity if rate <= 0. */
export function monthsToClose(gap: number, rate: number): number {
  if (gap <= 0) return 0;
  if (rate <= 0) return Infinity;
  return Math.ceil(gap / rate);
}

export function computeEmergencyFund(input: EmergencyFundInputs): EmergencyFundResults {
  const monthlyExpenses =
    input.housing + input.food + input.transport + input.utilities +
    input.insurance + input.minDebt + input.other;

  const targetMonths = recommendedMonths(input.jobStability, input.incomeStreams, input.healthRisk);
  const target = Math.round(monthlyExpenses * targetMonths);
  const gap = Math.max(0, target - input.currentSaved);
  const pct = Math.min(100, input.currentSaved > 0 && target > 0
    ? Math.round((input.currentSaved / target) * 100)
    : 0);

  const cap = input.monthlySavingsCapacity;
  const plans: SavingsPlan[] = cap > 0
    ? [cap, cap * 1.5, cap * 2].map((rate) => ({ rate, months: monthsToClose(gap, rate) }))
    : [];

  return { monthlyExpenses, targetMonths, target, gap, pct, funded: gap === 0, plans };
}
