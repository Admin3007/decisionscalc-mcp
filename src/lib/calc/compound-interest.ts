/**
 * Compound interest / savings-growth math (CONTRACTS §4).
 * Pure, currency-agnostic, unit-tested. The tool component reads the DOM,
 * calls this, and renders; all formatting/currency happens in the component
 * via window.DC. No country-specific rules here — just maths.
 */

export interface CompoundInput {
  principal: number;       // starting amount
  monthly: number;         // recurring monthly contribution
  ratePct: number;         // annual nominal rate, as a percent (e.g. 7 = 7%)
  years: number;           // investment horizon
  compounding?: number;    // compounds per year (default 12 = monthly)
}

export interface CompoundYearPoint {
  year: number;
  balance: number;         // end-of-year balance
  contributed: number;     // cumulative principal + contributions to date
  interest: number;        // balance − contributed (growth to date)
}

export interface CompoundResult {
  futureValue: number;
  totalContributed: number; // principal + all contributions
  totalInterest: number;    // growth on top of contributions
  series: CompoundYearPoint[]; // year 0 … final year, for charting
}

/**
 * Standard compound-interest projection with regular contributions.
 * Contributions are spread evenly across each compounding period so the
 * result is consistent regardless of the compounding frequency chosen.
 */
export function computeCompoundInterest(i: CompoundInput): CompoundResult {
  const n = i.compounding && i.compounding > 0 ? i.compounding : 12;
  const years = Math.max(0, i.years || 0);
  const r = (i.ratePct || 0) / 100;
  const perPeriodRate = r / n;
  const totalPeriods = Math.round(years * n);
  // Monthly contribution expressed per compounding period.
  const contribPerPeriod = (i.monthly || 0) * (12 / n);

  let balance = i.principal || 0;
  let contributed = i.principal || 0;
  const series: CompoundYearPoint[] = [
    { year: 0, balance, contributed, interest: 0 },
  ];

  for (let p = 1; p <= totalPeriods; p++) {
    balance = balance * (1 + perPeriodRate) + contribPerPeriod;
    contributed += contribPerPeriod;
    if (p % n === 0) {
      const yr = p / n;
      series.push({ year: yr, balance, contributed, interest: balance - contributed });
    }
  }
  // Capture a final partial year, if the horizon isn't a whole number of years.
  if (totalPeriods % n !== 0) {
    series.push({ year: years, balance, contributed, interest: balance - contributed });
  }

  return {
    futureValue: balance,
    totalContributed: contributed,
    totalInterest: balance - contributed,
    series,
  };
}
