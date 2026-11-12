/**
 * Baby Cost (year one) — pure calculation logic.
 *
 * Extracted from src/pages/tools/baby-cost-planner.astro (CONTRACTS §4).
 * Country-specific lookups (state/region childcare tables, delivery-cost
 * matrix) stay in the page and move to the data pack in Step 1.4 — the page
 * resolves `medical` and `annualCC` for the active country and passes them in.
 */

export type ChildcareType = 'center' | 'home' | 'nanny' | 'sahp' | string;
export type Feeding = 'formula' | 'breast' | 'combo' | string;

export interface BabyCostInputs {
  medical: number;       // resolved delivery/prenatal cost (0 for NHS)
  annualCC: number;      // resolved full-time annual childcare for the area
  weeklyPay: number;
  unpaidWeeks: number;
  paidPct: number;       // percent of pay covered during leave
  ccType: ChildcareType;
  ccMonths: number;
  feeding: Feeding;
}

export interface BabyCostResults {
  medical: number;
  pediatric: number;
  lostWages: number;
  childcare: number;
  feedingCost: number;
  gear: number;
  diapers: number;
  clothing: number;
  misc: number;
  total: number;
  maxVal: number;
}

const PEDIATRIC = 450;
const GEAR = 2800;
const DIAPERS = 1200;
const CLOTHING = 600;
const MISC = 800;

export function childcareCost(ccType: ChildcareType, annualCC: number, ccMonths: number, weeklyPay: number): number {
  switch (ccType) {
    case 'center': return (annualCC / 12) * ccMonths;
    case 'home': return (annualCC * 0.75 / 12) * ccMonths;
    case 'nanny': return (annualCC * 1.6 / 12) * ccMonths;
    case 'sahp': return weeklyPay * 52 * (ccMonths / 12);
    default: return 0;
  }
}

export function feedingCost(feeding: Feeding): number {
  switch (feeding) {
    case 'formula': return 1800;
    case 'breast': return 400;
    case 'combo': return 1100;
    default: return 0;
  }
}

export function computeBabyCost(input: BabyCostInputs): BabyCostResults {
  const lostWages = input.unpaidWeeks * input.weeklyPay * (1 - input.paidPct / 100);
  const childcare = childcareCost(input.ccType, input.annualCC, input.ccMonths, input.weeklyPay);
  const feeding = feedingCost(input.feeding);

  const values = [input.medical, PEDIATRIC, lostWages, childcare, feeding, GEAR, DIAPERS, CLOTHING, MISC];
  const total = values.reduce((a, b) => a + b, 0);
  const maxVal = Math.max(...values, 1);

  return {
    medical: input.medical, pediatric: PEDIATRIC, lostWages, childcare, feedingCost: feeding,
    gear: GEAR, diapers: DIAPERS, clothing: CLOTHING, misc: MISC, total, maxVal,
  };
}

/** The country pack's data for this tool (src/data/packs/<cc>.ts 'baby-cost-planner'.data). */
export interface BabyPackData {
  childcare: Record<string, number>;
  /** Out-of-pocket birth cost by delivery and plan; only where birth is not free at the point of use (US). */
  deliveryCosts?: Record<string, Record<string, number>>;
  defaultRegion?: string;
}

/**
 * Resolves the area's full-time childcare a year and the birth cost from the country pack: the page's selects
 * (state or region, delivery, insurance) and the agent tool both go through here. No deliveryCosts table
 * (NHS, provincial medicare, Medicare, the HSE scheme, Swiss basic insurance) = 0.
 */
export function resolveBabyCosts(data: BabyPackData, region: string, delivery: string, insurance: string): { medical: number; annualCC: number } {
  const medical = data.deliveryCosts ? (data.deliveryCosts[delivery]?.[insurance] ?? 3500) : 0;
  const annualCC = data.childcare[region] ?? data.childcare[data.defaultRegion as string] ?? 11000;
  return { medical, annualCC };
}

/** The state the US page selects on load (the page's other selects default to employer plan, vaginal birth, centre care, formula). */
export const US_DEFAULT_STATE = 'TX';
