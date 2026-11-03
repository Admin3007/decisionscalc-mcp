/**
 * Ireland: State Pension (Contributory), Total Contributions Approach (TCA).
 * Official sources (read 2026-11-03):
 *  - gov.ie (DSP) "How to calculate your State Pension (Contributory) rate": TCA total = reckonable paid
 *    contributions + reckonable credits (max 520) + HomeCaring Periods (max 1,040; credits + HomeCaring
 *    together max 1,040); 2,080 for the maximum rate; otherwise total ÷ 2,080 × 100 to 2 decimals (truncated),
 *    × the maximum rate; at least 520 paid (reckonable) contributions to qualify. Worked example:
 *    947 + 520 + 350 = 1,817 → 87.35% × €289.30 = €252.70.
 *  - citizensinformation.ie "State Pension (Contributory)": 2026 TCA maximum weekly rates by drawdown age:
 *    66 €299.30, 67 €313.40, 68 €328.90; Budget 2027: +€10 from January 2027 with proportionate increases.
 * Not modelled: the Yearly Average blend for people reaching pension age 2025–2033 (the Department pays
 * whichever method gives more), mixed insurance pro-rata pensions, increases for dependants.
 */
export const TCA_FULL = 2080;
export const MIN_PAID = 520;
export const MAX_CREDITS = 520;
export const MAX_CREDITS_PLUS_HOMECARING = 1040;
export const MAX_RATE: Record<string, number> = { '2026-66': 299.3, '2026-67': 313.4, '2026-68': 328.9, '2027-66': 309.3 };

export interface PensionInput {
  paid: number;          // reckonable paid contributions (weeks), Column 5
  credits: number;       // reckonable credited contributions (weeks), Column 6
  homeCaring: number;    // HomeCaring Periods (weeks)
  maxRate: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

export function computeTca(i: PensionInput) {
  const paid = Math.floor(n(i.paid));
  const credits = Math.min(MAX_CREDITS, Math.floor(n(i.credits)));
  const homeCaring = Math.min(Math.floor(n(i.homeCaring)), MAX_CREDITS_PLUS_HOMECARING - credits);
  const total = paid + credits + homeCaring;
  const qualifies = paid >= MIN_PAID;
  // The Department truncates (its example: 1,817 ÷ 2,080 = 0.873557 → 87.35%, not 87.36%).
  const pct = Math.min(100, Math.floor(Math.round((total / TCA_FULL) * 1e8) / 1e4) / 100);
  const weekly = qualifies ? Math.round((pct / 100) * n(i.maxRate) * 100) / 100 : 0;
  const toFull = Math.max(0, TCA_FULL - total);
  return { paid, creditsUsed: credits, homeCaringUsed: homeCaring, total, pct, qualifies, weekly, yearly: Math.round(weekly * 52 * 100) / 100, weeksToFull: toFull, yearsToFull: Math.ceil(toFull / 52) };
}
