/**
 * Debt Payoff (avalanche vs. snowball) — pure calculation logic.
 *
 * Extracted from src/pages/tools/debt-payoff-calculator.astro (CONTRACTS §4).
 * No DOM access; the page imports simulate()/comparePayoff() and renders.
 *
 * Method: month-by-month simulation. Each month interest accrues, minimum
 * payments are made, then any `extra` is funneled to one target debt —
 * highest-APR first (avalanche) or lowest-balance first (snowball).
 */

export interface Debt {
  name: string;
  balance: number;
  apr: number;    // annual percentage rate, e.g. 24.9
  minPay: number;
}

export interface PerDebtPayoff {
  name: string;
  payoffMonth: number;
  balance: number; // original balance
  apr: number;
}

export interface SimResult {
  months: number;
  totalInterest: number;
  perDebt: PerDebtPayoff[];
  /**
   * True when the simulation hit the cap with money still owed — i.e. the
   * payments never clear the debt. Without this the tool reported a $8,500
   * balance at 30% with a $40 minimum as "50y 0m" and "$18,757,230,777 of
   * interest": a confident, absurd answer to the exact situation this
   * calculator exists to diagnose. Callers must say "never at these
   * payments" rather than printing the capped figures.
   */
  neverRepaid: boolean;
  /** Debts whose own minimum does not cover their own monthly interest. */
  unpayable: string[];
}

export interface DebtComparison {
  avalanche: SimResult;
  snowball: SimResult;
  avalancheWins: boolean;     // avalanche interest <= snowball interest
  interestSaved: number;      // abs difference between the two methods
}

const MAX_MONTHS = 600; // 50-year safety cap

export function simulate(debts: Debt[], extra: number, method: 'avalanche' | 'snowball'): SimResult {
  const bal = debts.map((d) => d.balance);
  const paidMo = new Array(debts.length).fill(0);
  let totalInt = 0;
  let months = 0;

  while (bal.some((b) => b > 0.01) && months < MAX_MONTHS) {
    months++;
    // Interest accrual
    for (let i = 0; i < bal.length; i++) {
      if (bal[i] > 0) bal[i] += bal[i] * (debts[i].apr / 100 / 12);
    }
    // Pay minimums
    let pool = extra;
    for (let i = 0; i < bal.length; i++) {
      if (bal[i] <= 0) continue;
      const pay = Math.min(bal[i], Math.max(debts[i].minPay, 10));
      totalInt += pay > 0 ? (debts[i].apr / 100 / 12) * bal[i] / (1 + debts[i].apr / 100 / 12) : 0;
      bal[i] = Math.max(0, bal[i] - pay);
    }
    // Extra payment to the target debt
    const active = bal.map((b, i) => ({ i, b })).filter((x) => x.b > 0.01);
    if (active.length && pool > 0) {
      active.sort((a, z) =>
        method === 'avalanche' ? debts[z.i].apr - debts[a.i].apr : a.b - z.b
      );
      for (const { i } of active) {
        if (pool <= 0) break;
        const p = Math.min(bal[i], pool);
        bal[i] = Math.max(0, bal[i] - p);
        pool -= p;
      }
    }
    bal.forEach((b, i) => {
      if (b <= 0.01 && !paidMo[i] && debts[i].balance > 0) paidMo[i] = months;
    });
  }

  const outstanding = bal.some((b) => b > 0.01);
  // A debt amortises only if its minimum exceeds its own monthly interest.
  // Reported separately from `neverRepaid` because the extra payment can
  // rescue one of these, while `neverRepaid` is the actual outcome.
  const unpayable = debts
    .filter((d) => d.balance > 0 && Math.max(d.minPay, 10) <= d.balance * (d.apr / 100 / 12))
    .map((d) => d.name);

  return {
    months,
    totalInterest: totalInt,
    perDebt: paidMo.map((m, i) => ({
      name: debts[i].name,
      payoffMonth: m || months,
      balance: debts[i].balance,
      apr: debts[i].apr,
    })),
    neverRepaid: outstanding,
    unpayable,
  };
}

/**
 * Month-by-month TOTAL remaining balance for a method (index 0 = today).
 * Used by the paydown-timeline chart (Step 3.3). Same model as simulate().
 */
export function balanceSeries(debts: Debt[], extra: number, method: 'avalanche' | 'snowball'): number[] {
  const bal = debts.map((d) => d.balance);
  const out = [bal.reduce((a, b) => a + b, 0)];
  let months = 0;
  while (bal.some((b) => b > 0.01) && months < MAX_MONTHS) {
    months++;
    for (let i = 0; i < bal.length; i++) {
      if (bal[i] > 0) bal[i] += bal[i] * (debts[i].apr / 100 / 12);
    }
    let pool = extra;
    for (let i = 0; i < bal.length; i++) {
      if (bal[i] <= 0) continue;
      const pay = Math.min(bal[i], Math.max(debts[i].minPay, 10));
      bal[i] = Math.max(0, bal[i] - pay);
    }
    const active = bal.map((b, i) => ({ i, b })).filter((x) => x.b > 0.01);
    if (active.length && pool > 0) {
      active.sort((a, z) =>
        method === 'avalanche' ? debts[z.i].apr - debts[a.i].apr : a.b - z.b
      );
      for (const { i } of active) {
        if (pool <= 0) break;
        const p = Math.min(bal[i], pool);
        bal[i] = Math.max(0, bal[i] - p);
        pool -= p;
      }
    }
    out.push(bal.reduce((a, b) => a + b, 0));
  }
  return out;
}

export function comparePayoff(debts: Debt[], extra: number): DebtComparison {
  const avalanche = simulate(debts, extra, 'avalanche');
  const snowball = simulate(debts, extra, 'snowball');
  return {
    avalanche,
    snowball,
    avalancheWins: avalanche.totalInterest <= snowball.totalInterest,
    interestSaved: Math.abs(snowball.totalInterest - avalanche.totalInterest),
  };
}
