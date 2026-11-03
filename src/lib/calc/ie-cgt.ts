/**
 * Irish Capital Gains Tax: pure calculation logic.
 * Rules read on revenue.ie on 2026-11-02 ("How to calculate CGT", "When and how do you pay and file CGT"):
 *  - 31% for most gains on disposals from 7 October 2026; 33% from 6 December 2021 to 6 October 2026;
 *  - 33% on development land; personal exemption €1,270 a year per individual (not transferable);
 *  - pay by 15 December for disposals 1 January – 30 November, by 31 January next year for December disposals;
 *  - file the CGT return by 31 October of the year after the disposal.
 * Out of scope (said on the page): indexation for assets bought before 2003, reliefs (principal private
 * residence, retirement relief, entrepreneur relief), funds and ETFs (exit tax, not CGT).
 */
export const CGT_RATE_CHANGE = '2026-10-07';
export const RATE_NEW = 0.31;
export const RATE_OLD = 0.33;
export const RATE_DEV_LAND = 0.33;
export const EXEMPTION = 1270;

export type AssetType = 'general' | 'development-land';

export interface IeCgtInput {
  /** ISO date of the disposal (contract date). */
  disposalDate: string;
  salePrice: number;
  purchasePrice: number;
  /** Buying and selling costs: fees, stamp duty, commissions. */
  costs: number;
  /** Improvement costs reflected in the asset's value when sold. */
  enhancement?: number;
  /** Allowable losses: this year's losses plus losses carried forward. */
  losses?: number;
  /** Part of this year's €1,270 exemption already used on other gains. */
  exemptionUsed?: number;
  asset?: AssetType;
}

export interface IeCgtResult {
  gain: number;          // chargeable gain before losses
  afterLosses: number;
  exemption: number;
  taxable: number;
  rate: number;
  cgt: number;
  payBy: string;         // ISO date
  fileBy: string;        // ISO date
  lossCarriedForward: number;
  /** CGT at the other main rate, to show the Budget 2027 change. */
  cgtAtOtherRate: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const round2 = (v: number) => Math.round(v * 100) / 100;

export function rateFor(disposalDate: string, asset: AssetType = 'general'): number {
  if (asset === 'development-land') return RATE_DEV_LAND;
  return disposalDate >= CGT_RATE_CHANGE ? RATE_NEW : RATE_OLD;
}

export function deadlines(disposalDate: string): { payBy: string; fileBy: string } {
  const y = Number(disposalDate.slice(0, 4));
  const m = Number(disposalDate.slice(5, 7));
  return {
    payBy: m === 12 ? `${y + 1}-01-31` : `${y}-12-15`,
    fileBy: `${y + 1}-10-31`,
  };
}

export function computeIeCgt(i: IeCgtInput): IeCgtResult {
  const gainRaw = n(i.salePrice) - n(i.purchasePrice) - n(i.costs) - n(i.enhancement);
  const gain = gainRaw;
  const losses = n(i.losses);
  // A loss on this disposal is shown as a loss to carry forward; losses reduce gains before the exemption.
  const afterLosses = gain - losses;
  const exemption = Math.max(0, Math.min(EXEMPTION - n(i.exemptionUsed), Math.max(0, afterLosses)));
  const taxable = Math.max(0, afterLosses - exemption);
  const asset = i.asset ?? 'general';
  const rate = rateFor(i.disposalDate, asset);
  const other = asset === 'development-land' ? RATE_DEV_LAND : rate === RATE_NEW ? RATE_OLD : RATE_NEW;
  return {
    gain: round2(gain),
    afterLosses: round2(afterLosses),
    exemption: round2(exemption),
    taxable: round2(taxable),
    rate,
    cgt: round2(taxable * rate),
    ...deadlines(i.disposalDate),
    lossCarriedForward: round2(Math.max(0, -afterLosses)),
    cgtAtOtherRate: round2(taxable * other),
  };
}
