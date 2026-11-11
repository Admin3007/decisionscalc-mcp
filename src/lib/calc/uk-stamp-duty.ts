/**
 * UK Stamp Duty Land Tax (SDLT) — England & Northern Ireland, 2026/27 bands.
 * Pure + tested (CONTRACTS §4). Used by /gb/stamp-duty-calculator.
 *
 * Bands changed on 1 April 2025 (temporary thresholds expired):
 *   standard nil-rate 250k→125k; first-time-buyer relief 425k→300k (cap 500k).
 * Additional-property surcharge is 5% on every band (since 31 Oct 2024).
 */

export type SdltBuyerType = 'standard' | 'firstTimeBuyer' | 'additional';

export interface SdltBand { from: number; to: number; rate: number; }
export interface SdltResult {
  total: number;
  effectiveRate: number; // % of price
  rows: { label: string; rate: number; taxable: number; tax: number }[];
}

// Standard residential bands (England & NI, 2026/27).
export const STANDARD: SdltBand[] = [
  { from: 0, to: 125000, rate: 0 },
  { from: 125000, to: 250000, rate: 2 },
  { from: 250000, to: 925000, rate: 5 },
  { from: 925000, to: 1500000, rate: 10 },
  { from: 1500000, to: Infinity, rate: 12 },
];

// First-time buyer bands (only if price ≤ £500,000; otherwise standard applies).
export const FTB: SdltBand[] = [
  { from: 0, to: 300000, rate: 0 },
  { from: 300000, to: 500000, rate: 5 },
];

function applyBands(price: number, bands: SdltBand[]): SdltResult {
  const rows: SdltResult['rows'] = [];
  let total = 0;
  for (const b of bands) {
    if (price <= b.from) break;
    const taxable = Math.min(price, b.to) - b.from;
    if (taxable <= 0) continue;
    const tax = taxable * (b.rate / 100);
    total += tax;
    rows.push({
      label: b.to === Infinity ? `Above £${b.from.toLocaleString('en-GB')}` : `£${b.from.toLocaleString('en-GB')}–£${b.to.toLocaleString('en-GB')}`,
      rate: b.rate, taxable, tax,
    });
  }
  return { total: Math.round(total), effectiveRate: price > 0 ? (total / price) * 100 : 0, rows };
}

// Base bands for the buyer type (before any non-resident surcharge).
function bandsFor(p: number, buyerType: SdltBuyerType): SdltBand[] {
  if (buyerType === 'firstTimeBuyer' && p <= 500000) return FTB;
  if (buyerType === 'additional') return STANDARD.map((b) => ({ ...b, rate: b.rate + 5 })); // +5% second home / buy-to-let
  return STANDARD;
}

/**
 * @param nonResident adds the 2% Non-UK Resident SDLT surcharge on top of every
 *   band (in force since 1 April 2021). It STACKS with the additional-property
 *   surcharge, so a non-resident buying a second home pays standard + 5% + 2%.
 */
export function computeSdlt(price: number, buyerType: SdltBuyerType, nonResident = false): SdltResult {
  const p = Math.max(0, Number(price) || 0);
  let bands = bandsFor(p, buyerType);
  if (nonResident) bands = bands.map((b) => ({ ...b, rate: b.rate + 2 }));
  return applyBands(p, bands);
}
