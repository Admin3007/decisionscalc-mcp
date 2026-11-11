/**
 * Canada EI maternity & parental benefits — pure calculation logic.
 * Pure + tested (CONTRACTS §4). Used by /tools/canada-ei-benefit-calculator.
 *
 * Figures: 2026 (effective 1 January 2026).
 *  - Maximum insurable earnings (MIE): $68,900/yr.
 *  - Standard rate 55% → max weekly benefit $729.
 *  - Extended parental rate 33% → max weekly benefit $437.
 * Maternity = 15 weeks (birth parent, 55% only). Parental can be taken at the
 * STANDARD rate (55%, up to 40 weeks shared / 35 per parent) OR the EXTENDED
 * rate (33%, up to 69 weeks shared / 61 per parent) — the total dollars are
 * similar; extended just spreads a smaller cheque over longer. A 1-week
 * unpaid waiting period applies once per claim.
 */

export const EI_2026 = {
  mie: 68900,
  maxWeekly55: 729,
  maxWeekly33: 437,
  maternityWeeks: 15,
  standardParentalMaxWeeks: 40, // shared between parents
  standardParentalPerParent: 35,
  extendedParentalMaxWeeks: 69, // shared between parents
  extendedParentalPerParent: 61,
} as const;

export interface CaEiInput {
  /** Gross annual employment income (insurable earnings) in CAD. */
  annualIncome: number;
  /** Parental weeks the user plans to take at the standard rate (their share). */
  standardParentalWeeks: number;
  /** Parental weeks the user plans to take at the extended rate (their share). */
  extendedParentalWeeks: number;
  /** Whether to include the 15-week maternity benefit (birth parent only). */
  includeMaternity: boolean;
}

export interface CaEiBenefit {
  weeklyAmount: number;
  weeks: number;
  total: number;
  capped: boolean; // true if the weekly amount is limited by the MIE cap
}

export interface CaEiResult {
  weeklyInsurable: number; // estimated average weekly insurable earnings
  maternity: CaEiBenefit;
  standardParental: CaEiBenefit;
  extendedParental: CaEiBenefit;
}

/** Weekly EI benefit for a rate (e.g. 0.55) and its dollar cap, from weekly insurable earnings. */
export function eiWeekly(weeklyInsurable: number, rate: number, weeklyCap: number): { amount: number; capped: boolean } {
  const raw = Math.round(Math.max(0, weeklyInsurable) * rate);
  return raw >= weeklyCap ? { amount: weeklyCap, capped: true } : { amount: raw, capped: false };
}

export function computeCaEi(input: CaEiInput): CaEiResult {
  const income = Math.max(0, Number(input.annualIncome) || 0);
  // Average weekly insurable earnings, capped at the MIE. Real EI uses a
  // "best weeks" formula; this assumes steady earnings (stated on the page).
  const weeklyInsurable = Math.min(income, EI_2026.mie) / 52;

  const w55 = eiWeekly(weeklyInsurable, 0.55, EI_2026.maxWeekly55);
  const w33 = eiWeekly(weeklyInsurable, 0.33, EI_2026.maxWeekly33);

  const clamp = (weeks: number, max: number) => Math.max(0, Math.min(max, Math.round(Number(weeks) || 0)));
  const matWeeks = input.includeMaternity ? EI_2026.maternityWeeks : 0;
  const stdWeeks = clamp(input.standardParentalWeeks, EI_2026.standardParentalPerParent);
  const extWeeks = clamp(input.extendedParentalWeeks, EI_2026.extendedParentalPerParent);

  return {
    weeklyInsurable: Math.round(weeklyInsurable),
    maternity: { weeklyAmount: w55.amount, weeks: matWeeks, total: w55.amount * matWeeks, capped: w55.capped },
    standardParental: { weeklyAmount: w55.amount, weeks: stdWeeks, total: w55.amount * stdWeeks, capped: w55.capped },
    extendedParental: { weeklyAmount: w33.amount, weeks: extWeeks, total: w33.amount * extWeeks, capped: w33.capped },
  };
}

/**
 * Both parents, standard vs extended (overhaul C4). The birth parent takes the 15 maternity weeks; the parental
 * weeks are shared (standard: 40 in all, 35 per parent at 55%; extended: 69 in all, 61 per parent at 33%). The
 * partner's weeks are what they take; the birth parent takes the rest up to their own limit. Same steady-earnings
 * assumption as computeCaEi; before tax; waiting week not deducted (as on the rest of the page).
 */
export interface CaCoupleOption { birthWeeks: number; partnerWeeks: number; unused: number; total: number; weeksOff: number; birthWeekly: number; partnerWeekly: number; }
export function compareCaCouple(birthIncome: number, partnerIncome: number, partnerStdWeeks: number, partnerExtWeeks: number): { standard: CaCoupleOption; extended: CaCoupleOption } {
  const a = computeCaEi({ annualIncome: birthIncome, standardParentalWeeks: 0, extendedParentalWeeks: 0, includeMaternity: true });
  const b = computeCaEi({ annualIncome: partnerIncome, standardParentalWeeks: 0, extendedParentalWeeks: 0, includeMaternity: false });
  const opt = (shared: number, perParent: number, partnerWeeksIn: number, wA: number, wB: number): CaCoupleOption => {
    const partnerWeeks = Math.max(0, Math.min(perParent, Math.round(partnerWeeksIn || 0)));
    const birthWeeks = Math.max(0, Math.min(perParent, shared - partnerWeeks));
    const mat = EI_2026.maternityWeeks * a.maternity.weeklyAmount;
    return {
      birthWeeks, partnerWeeks, unused: shared - birthWeeks - partnerWeeks,
      total: mat + birthWeeks * wA + partnerWeeks * wB,
      weeksOff: EI_2026.maternityWeeks + birthWeeks + partnerWeeks,
      birthWeekly: wA, partnerWeekly: wB,
    };
  };
  return {
    standard: opt(EI_2026.standardParentalMaxWeeks, EI_2026.standardParentalPerParent, partnerStdWeeks, a.standardParental.weeklyAmount, b.standardParental.weeklyAmount),
    extended: opt(EI_2026.extendedParentalMaxWeeks, EI_2026.extendedParentalPerParent, partnerExtWeeks, a.extendedParental.weeklyAmount, b.extendedParental.weeklyAmount),
  };
}
