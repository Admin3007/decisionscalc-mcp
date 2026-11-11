/**
 * Car True Cost of Ownership (5-year) — pure calculation logic.
 *
 * Extracted from src/pages/tools/car-ownership-calculator.astro (CONTRACTS §4).
 * The depreciation schedule is a methodology constant (not country data) and
 * lives here. No DOM.
 */

// Depreciation rates by type: [yr1, yr2, yr3, yr4, yr5]
export const DEPR: Record<string, number[]> = {
  new_gas: [0.20, 0.15, 0.13, 0.12, 0.11],
  used_gas: [0.12, 0.12, 0.11, 0.10, 0.10],
  new_ev: [0.22, 0.16, 0.14, 0.13, 0.12],
  used_ev: [0.15, 0.13, 0.12, 0.11, 0.10],
  new_hybrid: [0.18, 0.14, 0.12, 0.11, 0.10],
};

/** Litres in an imperial (UK) gallon, the gallon UK MPG figures use. */
export const IMPERIAL_GALLON_L = 4.54609;

export interface CarInputs {
  vehicleType: string;
  price: number;
  down: number;
  loanRate: number;   // annual percent
  loanMonths: number;
  milesPerYear: number;
  mpg: number;
  fuelPrice: number;
  annualInsurance: number;
  annualMaint: number;
  salesTaxRate: number; // percent
  // Metric markets (CA/AU/IE/CH): milesPerYear holds km/yr, mpg holds
  // litres/100km, fuelPrice holds price/litre. Imperial (US/GB) leaves it unset.
  metric?: boolean;
  // UK: miles and imperial MPG, but drivers know the pump price per LITRE, so
  // fuelPrice holds price/litre and is converted to the imperial gallon here.
  pricePerLitre?: boolean;
}

export interface CarResults {
  salesTax: number;
  monthlyPay: number;
  totalInterest: number;
  totalDepr: number;
  fuelCost5: number;
  insur5: number;
  maint5: number;
  totalCost: number;
  monthlyEff: number;
  deprPct: number;     // depreciation as % of purchase price
}

export function computeCarOwnership(input: CarInputs): CarResults {
  const price = input.price;
  const loanRate = input.loanRate / 100 / 12;
  const loanMos = input.loanMonths;
  const taxRate = input.salesTaxRate / 100;

  const salesTax = price * taxRate;
  const loan = price - input.down;
  const deprRates = DEPR[input.vehicleType] || DEPR.new_gas;

  const monthlyPay = loanRate === 0
    ? (loanMos > 0 ? loan / loanMos : 0)
    : loan * loanRate * Math.pow(1 + loanRate, loanMos) / (Math.pow(1 + loanRate, loanMos) - 1);
  const totalLoanPay = monthlyPay * loanMos;
  const totalInterest = Math.max(0, totalLoanPay - loan);

  let value = price;
  let totalDepr = 0;
  for (let yr = 0; yr < 5; yr++) {
    const loss = value * deprRates[yr];
    totalDepr += loss;
    value -= loss;
  }

  // Imperial: (miles / mpg) × price/gallon. Metric: (km/100 × L/100km) × price/litre.
  const fuelCost5 = input.metric
    ? (input.milesPerYear / 100) * input.mpg * input.fuelPrice * 5
    : (input.mpg > 0 ? (input.milesPerYear / input.mpg) * input.fuelPrice * (input.pricePerLitre ? IMPERIAL_GALLON_L : 1) * 5 : 0);
  const insur5 = input.annualInsurance * 5;
  const maint5 = input.annualMaint * 5;
  const totalCost = salesTax + input.down + totalInterest + totalDepr + fuelCost5 + insur5 + maint5;
  const monthlyEff = totalCost / 60;
  const deprPct = price > 0 ? Math.round((totalDepr / price) * 100) : 0;

  return { salesTax, monthlyPay, totalInterest, totalDepr, fuelCost5, insur5, maint5, totalCost, monthlyEff, deprPct };
}
