/**
 * Irish Capital Acquisitions Tax (gift and inheritance tax): pure calculation logic.
 * Rules read on revenue.ie on 2026-11-03:
 *  - "CAT group thresholds": on or after 7 October 2026 Group A €420,000, B €44,000, C €22,000;
 *    2 October 2024 – 6 October 2026 €400,000 / €40,000 / €20,000; 9 October 2019 – 1 October 2024 €335,000 / €32,500 /
 *    €16,250. Worked example: €450,000 in Group A → excess €30,000 → tax €9,900 at 33%.
 *  - "CAT aggregation rules": add the taxable value of all prior benefits within the same group since 5 December 1991;
 *    unused threshold = threshold − prior; tax the current benefit above the unused balance. Worked example: Group A,
 *    prior €385,000, gift €40,000 on 7 October 2026 → unused €35,000 → excess €5,000.
 *  - "CAT groups": A = child (incl. adopted and stepchild), minor child of a deceased child, some foster children, a parent
 *    inheriting an absolute interest from a child; B = parent (gift or limited interest), brother, sister, niece, nephew,
 *    grandparent, grandchild; C = everyone else (aunts, uncles, cousins, in-laws, friends).
 *  - "Small Gift Exemption": the first €3,000 of gifts from each person in a calendar year is exempt (gifts only, not
 *    inheritances) and is not aggregated.
 *  - "CAT aggregation rules"/"Important dates for CAT": file an IT38 if total taxable benefits in the group exceed 80% of the
 *    threshold; pay and file by 31 October for valuation dates in the 12 months to the previous 31 August.
 *  - Rate 33% (unchanged in Budget 2027).
 * Not modelled (stated on the page): the dwelling house exemption, agricultural and business relief, favourite nephew
 * or niece relief, spouse/civil partner exemption (always exempt), double taxation relief, limited interests.
 */
export type Group = 'A' | 'B' | 'C';
export const RATE = 0.33;
export const SMALL_GIFT = 3000;
export const FILING_SHARE = 0.8;
/** Thresholds by start date (ISO), newest first. */
export const THRESHOLDS: { from: string; A: number; B: number; C: number }[] = [
  { from: '2026-10-07', A: 420000, B: 44000, C: 22000 },
  { from: '2024-10-02', A: 400000, B: 40000, C: 20000 },
  { from: '2019-10-09', A: 335000, B: 32500, C: 16250 },
];

export function thresholdFor(group: Group, date: string): number {
  const row = THRESHOLDS.find((t) => date >= t.from) ?? THRESHOLDS[THRESHOLDS.length - 1];
  return row[group];
}

/** 31 October of the year the valuation date's 12-month window (to 31 August) ends. */
export function payAndFileBy(valuationDate: string): string {
  const y = Number(valuationDate.slice(0, 4));
  const m = Number(valuationDate.slice(5, 7));
  return `${m >= 9 ? y + 1 : y}-10-31`;
}

export interface CatInput {
  group: Group;
  kind: 'gift' | 'inheritance';
  /** Market value of what you receive, less debts and costs you pay, EUR. */
  value: number;
  /** Date of the gift or inheritance (decides the threshold). ISO. */
  date: string;
  /** Valuation date (decides the pay-and-file date). Defaults to the date. ISO. */
  valuationDate?: string;
  /** Taxable value of earlier gifts/inheritances in the SAME group since 5 December 1991, EUR. */
  priorInGroup: number;
}

export interface CatResult {
  group: Group;
  threshold: number;
  smallGiftExemption: number;
  taxableValue: number;
  unusedThreshold: number;
  taxable: number;
  tax: number;
  effectiveRate: number;
  mustFile: boolean;
  payAndFileBy: string;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

export function computeCat(i: CatInput): CatResult {
  const group: Group = i.group === 'B' || i.group === 'C' ? i.group : 'A';
  const value = n(i.value);
  const smallGiftExemption = i.kind === 'gift' ? Math.min(SMALL_GIFT, value) : 0;
  const taxableValue = value - smallGiftExemption;
  const threshold = thresholdFor(group, i.date);
  const prior = n(i.priorInGroup);
  const unusedThreshold = Math.max(0, threshold - prior);
  const taxable = Math.max(0, taxableValue - unusedThreshold);
  const tax = r2(taxable * RATE);
  return {
    group, threshold, smallGiftExemption, taxableValue, unusedThreshold, taxable, tax,
    effectiveRate: value > 0 ? r2((tax / value) * 100) : 0,
    mustFile: prior + taxableValue > FILING_SHARE * threshold,
    payAndFileBy: payAndFileBy(i.valuationDate || i.date),
  };
}
