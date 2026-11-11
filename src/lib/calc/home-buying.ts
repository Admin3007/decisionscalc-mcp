/**
 * Home Buying — true cost of ownership, pure calculation logic.
 *
 * Extracted from src/pages/tools/home-buying-cost-calculator.astro (CONTRACTS §4).
 * No DOM/window — the GB branch is driven by `isGB`. The page maps the returned
 * row `key`s to localized labels/notes and renders; all domain math is here.
 *
 * Reuses sdlt() from the rent-vs-buy module so UK stamp duty has one source.
 */
import { sdlt } from './rent-vs-buy';

export interface HomeBuyingInputs {
  purchasePrice: number;
  downPct: number;        // percent
  interestRate: number;   // annual percent
  loanTermYears: number;
  closingPct: number;     // percent
  inspectionCost: number;
  /**
   * Recurring property tax. A PERCENT of value in US/CA; a FLAT annual amount
   * in GB/AU/IE/CH (council tax, council rates, LPT, cantonal tax). See
   * PROP_TAX_FLAT_COUNTRIES in ./rent-vs-buy.
   */
  propTaxRate: number;
  /** Defaults to isGB when omitted. */
  propTaxIsFlat?: boolean;
  hoiAnnual: number;
  pmiRate: number;        // percent (applied only if down < 20% and US)
  hoaMonthly: number;
  maintPct: number;       // percent of value / yr
  movingCost: number;
  isGB: boolean;
  /**
   * One-time transfer tax for countries where it is set nationally and simple
   * enough to compute exactly (Ireland: ieStampDuty). Omitted elsewhere, where
   * the page says it is excluded instead of inventing an average.
   */
  transferTax?: number;
}

export interface CostRow {
  key: string;
  value: number;
  oneTime: boolean;
}

export interface HomeBuyingResults {
  downPayment: number;
  loanAmount: number;
  monthlyPI: number;
  interestYr1: number;
  pmiAnnual: number;
  rows: CostRow[];          // filtered to value > 0, country-appropriate
  totalYr1: number;
  recurringAnnual: number;
  oneTimeTotal: number;
  monthlyAvg: number;
  maxVal: number;
  proj5: number;
  totalPaid5: number;
  principal5: number;
  monthlyOutlay: number;
}

/**
 * Irish residential stamp duty (fewer than 10 homes a year): 1% to €1m, 2% from
 * €1m to €1.5m, 6% above €1.5m (Citizens Information, read 1 Nov 2026). On a
 * new build it is charged on the price before VAT.
 */
export function ieStampDuty(p: number): number {
  const v = Math.max(0, p);
  return Math.min(v, 1_000_000) * 0.01
    + Math.max(0, Math.min(v, 1_500_000) - 1_000_000) * 0.02
    + Math.max(0, v - 1_500_000) * 0.06;
}

export function computeHomeBuying(input: HomeBuyingInputs): HomeBuyingResults {
  const price = input.purchasePrice;
  const downPct = input.downPct;
  const rate = input.interestRate / 100;
  const termYrs = input.loanTermYears;
  const closingPct = input.closingPct / 100;
  const inspection = input.inspectionCost;
  const propTaxRate = input.propTaxRate / 100;
  const hoiAnnual = input.hoiAnnual;
  const pmiRate = downPct < 20 ? input.pmiRate / 100 : 0;
  const hoaMonthly = input.hoaMonthly;
  const maintPct = input.maintPct / 100;
  const movingCost = input.movingCost;
  const isGB = input.isGB;

  const downPayment = price * (downPct / 100);
  const loanAmount = price - downPayment;

  const mr = rate / 12;
  const np = termYrs * 12;
  const monthlyPI = mr === 0 ? loanAmount / np
    : loanAmount * (mr * Math.pow(1 + mr, np)) / (Math.pow(1 + mr, np) - 1);

  const principalPaidYr1 = loanAmount * (Math.pow(1 + mr, 12) - 1) / (Math.pow(1 + mr, np) - 1);
  const interestYr1 = monthlyPI * 12 - principalPaidYr1;

  const hoaAnnual = hoaMonthly * 12;
  const maintenance = price * maintPct;
  const pmiAnnual = isGB ? 0 : loanAmount * pmiRate;

  // Flat annual bill in GB/AU/IE/CH, a percent of value in US/CA. Keyed off the
  // explicit flag rather than isGB: AU/IE/CH packs hold flat amounts too, and
  // gating on isGB alone had them charged as a percentage — 4% of an A$800,000
  // home in council rates, the field max, against a true figure near A$2,000.
  const propTaxAnnual = (input.propTaxIsFlat ?? isGB) ? input.propTaxRate : price * propTaxRate;

  let rows: CostRow[];
  if (isGB) {
    const propTax = propTaxAnnual;                 // flat council tax, £/yr
    const stampDuty = sdlt(price);
    const legalFees = loanAmount * closingPct + inspection;
    rows = [
      { key: 'stampDuty', value: stampDuty, oneTime: true },
      { key: 'legal', value: legalFees, oneTime: true },
      { key: 'moving', value: movingCost, oneTime: true },
      { key: 'interestYr1', value: interestYr1, oneTime: false },
      { key: 'councilTax', value: propTax, oneTime: false },
      { key: 'insurance', value: hoiAnnual, oneTime: false },
      { key: 'serviceCharge', value: hoaAnnual, oneTime: false },
      { key: 'maintenance', value: maintenance, oneTime: false },
    ].filter((r) => r.value > 0);
  } else {
    const closingCosts = loanAmount * closingPct + inspection;
    const propTax = propTaxAnnual;
    rows = [
      { key: 'stampDuty', value: input.transferTax ?? 0, oneTime: true },
      { key: 'closing', value: closingCosts, oneTime: true },
      { key: 'moving', value: movingCost, oneTime: true },
      { key: 'interestYr1', value: interestYr1, oneTime: false },
      { key: 'propTax', value: propTax, oneTime: false },
      { key: 'hoi', value: hoiAnnual, oneTime: false },
      { key: 'pmi', value: pmiAnnual, oneTime: false },
      { key: 'hoa', value: hoaAnnual, oneTime: false },
      { key: 'maintenance', value: maintenance, oneTime: false },
    ].filter((r) => r.value > 0);
  }

  const totalYr1 = rows.reduce((s, r) => s + r.value, 0);
  const maxVal = Math.max(...rows.map((r) => r.value), 1);
  const monthlyAvg = totalYr1 / 12;
  const recurringAnnual = rows.filter((r) => !r.oneTime).reduce((s, r) => s + r.value, 0);
  const oneTimeTotal = rows.filter((r) => r.oneTime).reduce((s, r) => s + r.value, 0);

  const proj5 = recurringAnnual * 5 + oneTimeTotal;
  const totalPaid5 = monthlyPI * 60;
  const principal5 = loanAmount - (loanAmount * Math.pow(1 + mr, -np + 60));
  const monthlyOutlay = monthlyPI + recurringAnnual / 12;

  return {
    downPayment, loanAmount, monthlyPI, interestYr1, pmiAnnual,
    rows, totalYr1, recurringAnnual, oneTimeTotal, monthlyAvg, maxVal,
    proj5, totalPaid5, principal5, monthlyOutlay,
  };
}
