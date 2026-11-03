/**
 * Wales Land Transaction Tax (LTT) — 2026/27 bands.
 * Pure + tested (CONTRACTS §4). Used by /tools/wales-ltt-calculator.
 *
 * Main residential rates (no first-time buyer relief in Wales — everyone gets
 * the £225,000 nil-rate band). Additional properties use a SEPARATE, steeper
 * banded scale (higher residential rates, +1% across all bands from 11 Dec 2024),
 * not a flat surcharge.
 */
export type LttBuyerType = 'standard' | 'additional';
export interface LttRow { label: string; rate: number; taxable: number; tax: number }
export interface LttResult { total: number; effectiveRate: number; rows: LttRow[] }

interface Band { from: number; to: number; rate: number }
const MAIN: Band[] = [
  { from: 0, to: 225000, rate: 0 },
  { from: 225000, to: 400000, rate: 6 },
  { from: 400000, to: 750000, rate: 7.5 },
  { from: 750000, to: 1500000, rate: 10 },
  { from: 1500000, to: Infinity, rate: 12 },
];
// Higher residential rates (additional dwellings), from 11 December 2024.
const HIGHER: Band[] = [
  { from: 0, to: 180000, rate: 5 },
  { from: 180000, to: 250000, rate: 8.5 },
  { from: 250000, to: 400000, rate: 10 },
  { from: 400000, to: 750000, rate: 12.5 },
  { from: 750000, to: 1500000, rate: 15 },
  { from: 1500000, to: Infinity, rate: 17 },
];

function gbp(n: number) { return `£${n.toLocaleString('en-GB')}`; }

function applyBands(price: number, bands: Band[]): LttRow[] {
  const rows: LttRow[] = [];
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

export function computeLtt(price: number, buyerType: LttBuyerType): LttResult {
  const p = Math.max(0, Number(price) || 0);
  const rows = applyBands(p, buyerType === 'additional' ? HIGHER : MAIN);
  const total = Math.round(rows.reduce((s, r) => s + r.tax, 0));
  return { total, effectiveRate: p > 0 ? (total / p) * 100 : 0, rows };
}
