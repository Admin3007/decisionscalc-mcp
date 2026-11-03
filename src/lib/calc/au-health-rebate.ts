/**
 * Australian private health insurance rebate + Medicare Levy Surcharge (MLS).
 * Pure + tested (CONTRACTS §4). Used by /tools/australia-private-health-rebate-calculator.
 * Figures: rebate percentages effective 1 April 2026 – 31 March 2027 (the rebate
 * adjustment factor changes every 1 April); income thresholds 2026–27 (ATO,
 * indexed to AWOTE from 1 July 2026 — single base $105,000, family $210,000).
 * Rebate percentages are TRANSCRIBED from the government's published table at
 * privatehealth.gov.au, not derived. They are the statutory base (30/35/40% by
 * age, −10pp per income tier) times the 2026 adjustment factor of 0.803933,
 * but the published figures use the government's own rounding, and computing
 * them here rounded four of the nine differently — 8.039 against a published
 * 8.038, and the same 0.001 discrepancy at 28.138/28.139, 32.157/32.158 and
 * 12.059/12.058. Two cents on a premium, but these are published statutory
 * rates and a reader comparing our table against the source should find them
 * identical. Verified against the live page 2026-09-30.
 */

export type AuFamily = 'single' | 'family';
export type AuAgeBand = 'under65' | '65to69' | '70plus';

export interface AuHealthInput {
  income: number;        // income for surcharge purposes (A$)
  family: AuFamily;
  age: AuAgeBand;
  premium: number;       // annual hospital premium (A$)
  hasCover: boolean;     // holds private hospital cover?
  children: number;      // dependent children
}

export interface AuHealthResult {
  tier: 0 | 1 | 2 | 3;
  tierLabel: string;
  rebatePct: number;
  rebateAmount: number;  // $ off premium (0 if no cover)
  netPremium: number;    // premium - rebate (if cover) else 0
  mlsRate: number;       // %
  mlsAmount: number;     // $ payable if NOT holding cover
}

const SINGLE = [105000, 123000, 164000];
const REBATE: number[][] = [
  [24.118, 28.139, 32.158], // Tier 0
  [16.079, 20.098, 24.118], // Tier 1
  [8.038, 12.058, 16.079],  // Tier 2
  [0, 0, 0],                // Tier 3
];
const MLS = [0, 1.0, 1.25, 1.5];
const AGE_IDX: Record<AuAgeBand, number> = { under65: 0, '65to69': 1, '70plus': 2 };
const TIER_LABEL = ['Tier 0 (base)', 'Tier 1', 'Tier 2', 'Tier 3'];

export function computeAuHealth(input: AuHealthInput): AuHealthResult {
  const income = Math.max(0, Number(input.income) || 0);
  const premium = Math.max(0, Number(input.premium) || 0);
  const children = Math.max(0, Math.floor(Number(input.children) || 0));
  // Family thresholds are double the single figures, +$1,500 per child after the first.
  // The ATO applies family thresholds to single parents with a dependent child too.
  const isFamily = input.family === 'family' || children > 0;
  const childLift = isFamily ? 1500 * Math.max(0, children - 1) : 0;
  const mult = isFamily ? 2 : 1;
  const t = SINGLE.map((s) => s * mult + childLift);

  let tier: 0 | 1 | 2 | 3 = 3;
  if (income <= t[0]) tier = 0;
  else if (income <= t[1]) tier = 1;
  else if (income <= t[2]) tier = 2;

  const rebatePct = REBATE[tier][AGE_IDX[input.age]];
  const rebateAmount = input.hasCover ? Math.round(premium * (rebatePct / 100)) : 0;
  const netPremium = input.hasCover ? Math.round(premium - rebateAmount) : 0;
  const mlsRate = MLS[tier];
  const mlsAmount = input.hasCover ? 0 : Math.round(income * (mlsRate / 100));

  return { tier, tierLabel: TIER_LABEL[tier], rebatePct, rebateAmount, netPremium, mlsRate, mlsAmount };
}
