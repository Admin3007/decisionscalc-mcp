/**
 * Wedding Cost — pure calculation logic.
 *
 * Extracted from src/pages/tools/wedding-cost-calculator.astro (CONTRACTS §4).
 * Style/season/day multipliers are methodology constants and live here.
 * Country per-guest base costs and regional multipliers (BASE_SETS /
 * REGIONAL_SETS) stay in the page and move to the data pack in Step 1.4 — the
 * page resolves the base table + regional multiplier and passes them in, along
 * with any per-category custom overrides the user typed.
 */

export const STYLE: Record<string, number> = { budget: 0.55, moderate: 1.0, upscale: 1.65, luxury: 2.8 };
export const MONTH: Record<string, number> = { peak: 1.0, shoulder: 0.9, offpeak: 0.77 };
export const DAY: Record<string, number> = { saturday: 1.0, friday: 0.87, sunday: 0.83, weekday: 0.7 };

export interface WeddingBase {
  venue: number; catering: number; photo: number; music: number; flowers: number;
  attire: number; paper: number; transport: number; misc: number;
}

/** Per-category custom overrides (0 = use computed estimate). */
export interface WeddingOverrides {
  venue?: number; catering?: number; photo?: number; music?: number; flowers?: number; attire?: number;
}

export interface WeddingInputs {
  guests: number;
  regionalMult: number;   // resolved REGIONAL[region] for the active country
  style: string;
  month: string;
  day: string;
  base: WeddingBase;      // resolved per-guest base costs for the active country
  overrides?: WeddingOverrides;
}

export interface WeddingResults {
  mult: number;
  venue: number; catering: number; photo: number; music: number; flowers: number;
  attire: number; paper: number; officiant: number; transport: number; misc: number;
  total: number; perGuest: number; buffer: number;
}

export function computeWeddingCost(input: WeddingInputs): WeddingResults {
  const guests = Math.max(10, input.guests);
  const style = input.style;
  const mult = input.regionalMult * (STYLE[style] ?? 1) * (MONTH[input.month] ?? 1) * (DAY[input.day] ?? 1);
  const ov = input.overrides || {};

  const val = (base: number, custom?: number) =>
    (custom && custom > 0) ? custom : Math.round(base * guests * mult);

  const venue = val(input.base.venue, ov.venue);
  const catering = val(input.base.catering, ov.catering);
  const photo = val(input.base.photo, ov.photo);
  const music = val(input.base.music, ov.music);
  const flowers = val(input.base.flowers, ov.flowers);
  const attire = val(input.base.attire, ov.attire);
  const paper = Math.round(input.base.paper * guests * mult);
  const officiant = Math.round(350 * (STYLE[style] ?? 1));
  const transport = Math.round(input.base.transport * guests * mult);
  const misc = Math.round(input.base.misc * guests * mult);

  const total = venue + catering + photo + music + flowers + attire + paper + officiant + transport + misc;
  const perGuest = Math.round(total / guests);
  const buffer = Math.round(total * 0.15);

  return { mult, venue, catering, photo, music, flowers, attire, paper, officiant, transport, misc, total, perGuest, buffer };
}

/**
 * How many guests a total budget covers with everything else unchanged.
 * Every category scales with guests except the officiant and any custom
 * (fixed) amounts, so total = fixed + perHead * guests; solve for guests.
 * Returns 0 when the budget doesn't even cover the fixed costs.
 */
export function guestsForBudget(input: WeddingInputs, budget: number): number {
  const at = (guests: number) => computeWeddingCost({ ...input, guests }).total;
  const perHead = (at(200) - at(100)) / 100;
  const fixed = at(100) - perHead * 100;
  if (perHead <= 0 || budget <= fixed) return 0;
  return Math.max(0, Math.floor((budget - fixed) / perHead));
}
