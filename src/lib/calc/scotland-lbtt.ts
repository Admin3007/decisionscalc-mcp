/**
 * Scotland Land and Buildings Transaction Tax (LBTT) — 2026/27 bands.
 * Pure + tested (CONTRACTS §4). Used by /tools/scotland-lbtt-calculator.
 *
 * Standard residential bands; first-time buyers get the nil-rate raised to
 * £175,000 (from £145,000). The Additional Dwelling Supplement (ADS) is a flat
 * 8% of the whole price on top of standard LBTT (since December 2024).
 */
export type LbttBuyerType = 'standard' | 'firstTimeBuyer' | 'additional';
export interface LbttRow { label: string; rate: number; taxable: number; tax: number }
export interface LbttResult { total: number; effectiveRate: number; rows: LbttRow[] }

export interface Band { from: number; to: number; rate: number }
export const STANDARD: Band[] = [
  { from: 0, to: 145000, rate: 0 },
  { from: 145000, to: 250000, rate: 2 },
  { from: 250000, to: 325000, rate: 5 },
  { from: 325000, to: 750000, rate: 10 },
  { from: 750000, to: Infinity, rate: 12 },
];
// First-time buyer relief: nil-rate band raised to £175,000.
export const FTB: Band[] = [
  { from: 0, to: 175000, rate: 0 },
  { from: 175000, to: 250000, rate: 2 },
  { from: 250000, to: 325000, rate: 5 },
  { from: 325000, to: 750000, rate: 10 },
  { from: 750000, to: Infinity, rate: 12 },
];
const ADS_RATE = 8; // % of whole price

function gbp(n: number) { return `£${n.toLocaleString('en-GB')}`; }

function applyBands(price: number, bands: Band[]): LbttRow[] {
  const rows: LbttRow[] = [];
  for (const b of bands) {
    if (price <= b.from) break;
    const taxable = Math.min(price, b.to) - b.from;
    if (taxable <= 0) continue;
    rows.push({
      label: b.to === Infinity ? `Above ${gbp(b.from)}` : `${gbp(b.from)}–${gbp(b.to)}`,
      rate: b.rate, taxable, tax: taxable * (b.rate / 100),
    });
  }
  return rows;
}

export function computeLbtt(price: number, buyerType: LbttBuyerType): LbttResult {
  const p = Math.max(0, Number(price) || 0);
  const rows = applyBands(p, buyerType === 'firstTimeBuyer' ? FTB : STANDARD);
  if (buyerType === 'additional' && p > 0) {
    rows.push({ label: `Additional Dwelling Supplement (${ADS_RATE}%)`, rate: ADS_RATE, taxable: p, tax: p * (ADS_RATE / 100) });
  }
  const total = Math.round(rows.reduce((s, r) => s + r.tax, 0));
  return { total, effectiveRate: p > 0 ? (total / p) * 100 : 0, rows };
}
