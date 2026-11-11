/**
 * Remote Work net financial impact — pure calculation logic.
 *
 * Extracted from src/pages/tools/remote-work-calculator.astro (CONTRACTS §4).
 * The per-mile driving rate is country-aware (US IRS vs UK HMRC AMAP) and is
 * resolved by the page and passed in as `irsRate`. WEEKS (working weeks/yr) is
 * a methodology constant. Equipment is amortized over 3 years here.
 */

const WEEKS = 50;

export interface RemoteWorkInputs {
  commuteDays: number;     // office days per week
  commuteMiles: number;    // one-way
  mode: string;            // 'car' | 'transit' | 'both'/other
  transitCost: number;     // monthly transit fares or parking (any commute mode)
  lunchCost: number;       // per office day
  clothing: number;        // annual
  utilities: number;       // annual home utilities increase
  internet: number;        // annual internet upgrade
  equipment: number;       // total equipment spend (amortized /3)
  homeCoffee: number;      // per office day saved
  salary: number;
  payCut: number;          // percent (negative cut reduces net)
  irsRate: number;         // per-mile driving cost
}

export interface RemoteWorkResults {
  officeDays: number;
  carSavings: number;
  transitSavings: number;
  lunchSavings: number;
  clothingSavings: number;
  utilities: number;
  internet: number;
  equipment: number;       // amortized annual
  homeCoffeeCost: number;
  salaryImpact: number;    // signed
  totalSavings: number;
  totalCosts: number;
  net: number;
}

export function computeRemoteWork(input: RemoteWorkInputs): RemoteWorkResults {
  const officeDays = input.commuteDays * WEEKS;
  const equipment = input.equipment / 3;

  const carSavings = input.mode !== 'transit' ? input.commuteMiles * 2 * officeDays * input.irsRate : 0;
  // The field is "transport / parking": a car commuter's parking is a real saving too.
  // (It used to count only for transit modes, so drivers' parking silently dropped out.)
  const transitSavings = input.transitCost * 12;
  const lunchSavings = input.lunchCost * officeDays;
  const clothingSavings = input.clothing;

  const homeCoffeeCost = input.homeCoffee * officeDays;
  const salaryImpact = input.salary * (input.payCut / 100);

  const totalSavings = carSavings + transitSavings + lunchSavings + clothingSavings;
  const totalCosts = homeCoffeeCost + input.utilities + input.internet + equipment;
  const net = totalSavings - totalCosts + salaryImpact;

  return {
    officeDays, carSavings, transitSavings, lunchSavings, clothingSavings,
    utilities: input.utilities, internet: input.internet, equipment, homeCoffeeCost,
    salaryImpact, totalSavings, totalCosts, net,
  };
}

/**
 * What one office day a week costs over a year (overhaul C9, return-to-office): driving, lunch out, less the coffee
 * you would have made at home. The transit/parking pass and clothing are flat amounts in this calculator, so they
 * do not change with the number of days.
 */
export function officeDayCost(input: RemoteWorkInputs): number {
  const one = computeRemoteWork({ ...input, commuteDays: 1, payCut: 0 });
  const none = computeRemoteWork({ ...input, commuteDays: 0, payCut: 0 });
  return one.net - none.net;
}
