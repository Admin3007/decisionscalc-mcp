/**
 * Rent vs. Buy — pure calculation logic.
 *
 * Extracted from src/pages/tools/rent-vs-buy-calculator.astro (CONTRACTS §4).
 * No DOM/window access — the GB branch is driven by the `isGB` input. The page
 * reads inputs, passes them here, and renders the returned numbers.
 *
 * Compares the N-year net cost of buying (mortgage, taxes, maintenance, sale
 * proceeds, equity) against renting (rent paid minus what the down payment +
 * monthly difference would earn if invested). UK mode swaps US closing costs
 * for Stamp Duty Land Tax and treats the property-tax field as flat council tax.
 */

import { computeSdlt } from './uk-stamp-duty';
import { computeLbtt } from './scotland-lbtt';
import { computeLtt } from './wales-ltt';

export interface RentVsBuyInputs {
  homePrice: number;
  downPct: number;          // percent
  mortgageRate: number;     // annual percent
  /**
   * Recurring property tax. Read as a PERCENT of value when propTaxIsFlat is
   * false (US, CA), or as a FLAT annual amount in local currency when it is
   * true (GB council tax, AU council rates, IE LPT, CH cantonal tax).
   */
  propTaxRate: number;
  /** Defaults to isGB when omitted — see PROP_TAX_FLAT_COUNTRIES. */
  propTaxIsFlat?: boolean;
  hoaMonthly: number;
  homeAppreciation: number; // annual percent
  monthlyRent: number;
  rentIncrease: number;     // annual percent
  investReturn: number;     // annual percent
  yearsToStay: number;
  taxBracket: number;       // percent
  /**
   * ALL-IN buy-side cost as a percent of price: legal, survey and lender fees
   * PLUS transfer tax (stamp duty, land transfer tax). GB is the exception and
   * takes the exact SDLT path instead.
   *
   * It has to include transfer tax. Taking the home-buying packs' closingPct,
   * which excludes it, put Australia at 0.6% — about A$4,800 on an A$800,000
   * home against a real all-in cost near A$40,000, since AU stamp duty alone
   * runs 4-5%.
   */
  closingPct?: number;
  /** Sell-side agent commission as a percent, including local VAT. */
  sellCostPct?: number;
  /** UK transaction costs: SDLT on purchase and its own sale rate. */
  isGB: boolean;
  /** UK only (overhaul C2): which transfer tax applies. Default England & NI SDLT. */
  ukNation?: 'england' | 'scotland' | 'wales';
  /** UK only: first-time buyer relief (England & NI SDLT, Scotland LBTT; Wales has none). */
  firstTimeBuyer?: boolean;
  /** Non-UK: exact all-in buying costs in currency (e.g. a province's land transfer tax plus fees), instead of closingPct. */
  buyCostsAmount?: number;
}

/**
 * Countries whose recurring property tax is a flat annual bill, not a
 * percentage of value.
 *
 * This used to be a bare `isGB` check, which silently broke three locales.
 * The AU, IE and CH packs store flat amounts (A$2,000 council rates, €345 LPT,
 * CHF 2,000 cantonal tax) but only GB got the flat treatment, so those three
 * fell through to the percent branch — where the form's own max="3" clamped
 * them to 3, and the tool then modelled Australian council rates at 3% of an
 * A$800,000 home: A$24,000 a year against a true figure near A$2,000. Buying
 * looked so expensive that all three pages reported it never catching up over
 * 30 years.
 */
export const PROP_TAX_FLAT_COUNTRIES = ['GB', 'AU', 'IE', 'CH', 'NZ'] as const;

export function propTaxIsFlatFor(country: string | null | undefined): boolean {
  return (PROP_TAX_FLAT_COUNTRIES as readonly string[]).includes(country ?? '');
}

export interface RentVsBuyResults {
  years: number;
  monthlyMort: number;
  propTaxAnnual: number;
  closingBuy: number;
  homeValueAtSale: number;
  netProceeds: number;
  buyTotalOut: number;
  rentTotal: number;
  /** Renter: what the yearly differences paid in (buyer's outlay above rent) have grown to. */
  investedSavings: number;
  /** Renter: the day-one pot (down payment + buying costs) grown at the investment return. */
  downInvested: number;
  /** Renter: total of the yearly differences paid in. */
  contributions: number;
  /** Buyer: what the yearly differences in years when rent is higher have grown to, and their total paid in. */
  buyerInvested: number;
  buyerContributions: number;
  down: number;
  netBuyCost: number;
  netRentCost: number;
  diff: number;
  beYear: number;           // break-even year, 0 if none within 30
  buyIsBetterNow: boolean;
}

/** UK Stamp Duty Land Tax — standard residential, 2026/27 bands. */
export function sdlt(p: number): number {
  const bands: [number, number][] = [[125000, 0], [250000, 0.02], [925000, 0.05], [1500000, 0.10], [Infinity, 0.12]];
  let tax = 0, prev = 0;
  for (const [cap, r] of bands) { if (p <= prev) break; tax += (Math.min(p, cap) - prev) * r; prev = cap; }
  return Math.round(tax);
}

/**
 * Net cost of buying and of renting over exactly `years`.
 *
 * THE single model. Both the headline figures and the 30-year crossover series
 * come from here, because they used not to.
 *
 * Until 2026-09-28 `breakEvenSeries` carried its own, subtly different version
 * of the rent scenario: it credited the renter only with growth on the deposit
 * pool and omitted the invested monthly difference, and it applied the US 6%
 * selling cost even in GB mode. Both errors flattered buying, so the
 * break-even year it produced was too early — and since the verdict was derived
 * from that year while the money came from the other calculation, the tool
 * could print "Buying ✓" directly above figures showing buying cost more. At
 * the US defaults it claimed "Buying saves $19,786" when buying was $19,786
 * more expensive.
 */
/**
 * UK transfer tax on a main-home purchase (overhaul C2): SDLT in England and Northern Ireland, LBTT in Scotland,
 * LTT in Wales, each from its own tested calculator. Without a nation it keeps the original exact SDLT path.
 */
export function ukTransferTax(price: number, nation?: 'england' | 'scotland' | 'wales', ftb = false): number {
  if (!nation) return ftb ? computeSdlt(price, 'firstTimeBuyer').total : sdlt(price);
  if (nation === 'scotland') return computeLbtt(price, ftb ? 'firstTimeBuyer' : 'standard').total;
  if (nation === 'wales') return computeLtt(price, 'standard').total;
  return computeSdlt(price, ftb ? 'firstTimeBuyer' : 'standard').total;
}

function netCostsAtYear(input: RentVsBuyInputs, years: number) {
  const price = input.homePrice;
  const mRate = input.mortgageRate / 100 / 12;
  const hoa = input.hoaMonthly;
  const appRate = input.homeAppreciation / 100;
  const rentInc = input.rentIncrease / 100;
  const investR = input.investReturn / 100;
  const isGB = input.isGB;

  // Annual property tax: a flat bill in GB/AU/IE/CH, a percent of value in US/CA.
  const flat = input.propTaxIsFlat ?? isGB;
  const propTaxAnnual = flat ? input.propTaxRate : price * (input.propTaxRate / 100);
  const down = price * (input.downPct / 100);
  const loan = price - down;
  // Per-country, not the US 3%/6% that was applied to everyone but GB. The US
  // sell-side 6% in particular overstated the round trip badly where commission
  // is 1.8% (UK) to 3% (CH), which is much of why /ch/, /ca/ and /au/ all
  // reported that buying never catches up over 30 years.
  const closingBuy = isGB ? (ukTransferTax(price, input.ukNation, input.firstTimeBuyer) + 1500) : (input.buyCostsAmount ?? price * ((input.closingPct ?? 3) / 100));
  const nMonths = 360;

  const monthlyMort = mRate === 0
    ? loan / nMonths
    : loan * mRate * Math.pow(1 + mRate, nMonths) / (Math.pow(1 + mRate, nMonths) - 1);

  // --- BUY scenario over N years ---
  let buyTotalOut = down + closingBuy;
  let balance = loan;
  for (let m = 0; m < years * 12; m++) {
    const intPmt = balance * mRate;
    const prinPmt = monthlyMort - intPmt;
    balance = Math.max(0, balance - prinPmt);
    buyTotalOut += monthlyMort + hoa + (propTaxAnnual / 12);
    buyTotalOut += price * 0.01 / 12; // maintenance 1%/yr
  }
  const homeValueAtSale = price * Math.pow(1 + appRate, years);
  const closingSale = homeValueAtSale * ((input.sellCostPct ?? (isGB ? 1.8 : 6)) / 100);
  const netProceeds = homeValueAtSale - balance - closingSale;

  // --- RENT scenario over N years ---
  // Both households start with the same cash and pay out the same each year (corrected 9 Nov 2026). The renter
  // invests the buyer's day-one cash (down payment + buying costs) and, each year, the amount by which the buyer's
  // outlay exceeds the rent; in a year when rent is higher, the buyer invests the difference instead. Each net cost
  // is money paid out less what that household has at the end. Before, the renter was charged the buyer's buying
  // costs and the differences invested were counted as gains without being counted as money paid in: both
  // flattered buying.
  let rentTotal = 0;
  let currentRent = input.monthlyRent;
  const start = down + closingBuy;
  let pot = start, contributions = 0, buyerPot = 0, buyerContributions = 0;
  for (let yr = 0; yr < years; yr++) {
    const rentYear = currentRent * 12;
    rentTotal += rentYear;
    const ownYear = (monthlyMort + hoa + propTaxAnnual / 12 + price * 0.01 / 12) * 12;
    const toRenter = Math.max(0, ownYear - rentYear), toBuyer = Math.max(0, rentYear - ownYear);
    contributions += toRenter; buyerContributions += toBuyer;
    pot = (pot + toRenter) * (1 + investR);
    buyerPot = (buyerPot + toBuyer) * (1 + investR);
    currentRent *= (1 + rentInc);
  }
  const downInvested = start * Math.pow(1 + investR, years);
  const investedSavings = pot - downInvested;

  const netBuyCost = buyTotalOut - netProceeds - (buyerPot - buyerContributions);
  const netRentCost = rentTotal + contributions + start - pot;

  return {
    years, monthlyMort, propTaxAnnual, closingBuy, homeValueAtSale, netProceeds,
    buyTotalOut, rentTotal, investedSavings, downInvested, contributions, buyerInvested: buyerPot, buyerContributions, down,
    netBuyCost, netRentCost,
  };
}

/**
 * 30-year net-cost trajectories for buying vs renting (index 0 = end of
 * year 1). Powers the crossover chart and the break-even year — each point is
 * netCostsAtYear for that horizon, so the chart, the break-even marker and the
 * headline figures are the same calculation by construction.
 */
export function breakEvenSeries(input: RentVsBuyInputs): { buy: number[]; rent: number[] } {
  const buy: number[] = [], rent: number[] = [];
  for (let y = 1; y <= 30; y++) {
    const r = netCostsAtYear(input, y);
    buy.push(r.netBuyCost);
    rent.push(r.netRentCost);
  }
  return { buy, rent };
}

export function computeRentVsBuy(input: RentVsBuyInputs): RentVsBuyResults {
  const years = Math.round(input.yearsToStay);
  const core = netCostsAtYear(input, years);

  // First horizon at which buying is genuinely the cheaper option.
  const series = breakEvenSeries(input);
  let beYear = 0;
  for (let y = 1; y <= 30; y++) {
    if (series.buy[y - 1] < series.rent[y - 1]) { beYear = y; break; }
  }

  // Stated directly from the two figures we are about to show, NOT inferred
  // from beYear. The crossover need not be monotonic — a horizon past beYear
  // can still favour renting — and the verdict must never contradict the
  // numbers printed beside it.
  const buyIsBetterNow = core.netBuyCost < core.netRentCost;
  const diff = Math.abs(core.netBuyCost - core.netRentCost);

  return { ...core, diff, beYear, buyIsBetterNow };
}
