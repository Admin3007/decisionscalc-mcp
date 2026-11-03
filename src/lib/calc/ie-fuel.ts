/**
 * Ireland: Fuel Allowance means test and season amount.
 * Official source: citizensinformation.ie "Fuel Allowance" (read 2026-11-03):
 *  - 66 or over: average gross weekly income up to €534 (single) / €1,068 (couple); Budget 2027 raises the
 *    single limit to €640.80 from January 2027 (the 2027 couple limit is not yet published: we keep €1,068).
 *  - under 66: you must get a qualifying payment; limit = maximum State Pension (Contributory) + increases + €200:
 *    single €499.30, couple (adult under 66) €698.70, couple (adult 66+) €767.70 in 2026. From January 2027 the
 *    single limit follows the rule: €309.30 + €200 = €509.30 (couple 2027 figures not yet published: 2026 kept).
 *  - not counted: social assistance payments, Carer's Allowance, child maintenance (and others listed).
 *  - capital (not your home): under 66 first €20,000 ignored, 66+ first €50,000; then €1 per €1,000 for the
 *    next €10,000, €2 per €1,000 for the next €10,000, €4 per €1,000 above.
 *  - €38 a week (2026), €43 from the week of 4 January 2027; 28 weeks from late September; 2026/27 season
 *    lump sums €532 (September) + €602 (January). One per household; household conditions apply.
 */
export type FuelPeriod = '2026' | '2027';
export const FUEL_RATE: Record<FuelPeriod, number> = { '2026': 38, '2027': 43 };
export const SEASON_2026_27 = 532 + 602;
export const LIMITS: Record<FuelPeriod, { over66Single: number; over66Couple: number; under66Single: number; under66CoupleYoung: number; under66CoupleOld: number }> = {
  '2026': { over66Single: 534, over66Couple: 1068, under66Single: 499.3, under66CoupleYoung: 698.7, under66CoupleOld: 767.7 },
  '2027': { over66Single: 640.8, over66Couple: 1068, under66Single: 509.3, under66CoupleYoung: 698.7, under66CoupleOld: 767.7 },
};

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

export function fuelCapitalMeans(capital: number, aged66: boolean): number {
  const k = Math.floor(n(capital) / 1000);
  const start = aged66 ? 50 : 20;
  const b1 = Math.max(0, Math.min(k, start + 10) - start);
  const b2 = Math.max(0, Math.min(k, start + 20) - (start + 10));
  const b3 = Math.max(0, k - (start + 20));
  return b1 + b2 * 2 + b3 * 4;
}

export interface FuelInput {
  period: FuelPeriod;
  aged66: boolean;
  couple: boolean;
  partner66: boolean;
  qualifyingPayment: boolean;  // under 66: you get a qualifying social welfare payment
  householdOk: boolean;        // live alone or only with the people the rules allow
  incomeWeekly: number;        // gross weekly income that counts (earnings, State Pension (Contributory), occupational pension, social insurance payments)
  capital: number;
}

export function computeFuel(i: FuelInput) {
  const p: FuelPeriod = i.period === '2027' ? '2027' : '2026';
  const L = LIMITS[p];
  const limit = i.aged66 ? (i.couple ? L.over66Couple : L.over66Single) : (i.couple ? (i.partner66 ? L.under66CoupleOld : L.under66CoupleYoung) : L.under66Single);
  const means = Math.round((n(i.incomeWeekly) + fuelCapitalMeans(i.capital, i.aged66)) * 100) / 100;
  const reasons: string[] = [];
  if (!i.aged66 && !i.qualifyingPayment) reasons.push('Under 66 you must already get a qualifying social welfare payment.');
  if (!i.householdOk) reasons.push('You must live alone or only with the people the rules allow.');
  if (means > limit) reasons.push(`Your weekly means (€${means.toFixed(2)}) are above the €${limit.toFixed(2)} limit.`);
  const qualifies = reasons.length === 0;
  return { limit, means, qualifies, reasons, weekly: qualifies ? FUEL_RATE[p] : 0, season: qualifies ? SEASON_2026_27 : 0, headroom: Math.round((limit - means) * 100) / 100 };
}
