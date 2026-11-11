/**
 * Stamp Duty Land Tax for any completion date since 1 December 2003, England and Northern Ireland, residential
 * (overhaul C1). Pure + tested. Every period is one of the 17 GOV.UK "Stamp Duty Land Tax rates" pages
 * (gov.uk/government/publications/rates-and-allowances-stamp-duty-land-tax, read 8 Nov 2026) plus the current
 * rates page for 1 April 2025 onward.
 *
 *  - Until 3 December 2014 SDLT was a SLAB tax: one rate on the whole price ("charged on the whole amount of the
 *    consideration"). From 4 December 2014 it is a SLICE tax, like income tax.
 *  - First-time buyer relief: 25 Mar 2010 – 24 Mar 2012 (0% up to £250,000, slab); from 22 Nov 2017 slice relief
 *    (0% to £300,000, 5% to £500,000, homes up to £500,000; 0% to £425,000 and 5% to £625,000 from 23 Sep 2022 to
 *    31 Mar 2025). Where the standard rates were lower (the 2020-21 holiday), the lower figure is used.
 *  - Higher rates for additional dwellings from 1 Apr 2016: +3 points on every band, +5 from 31 Oct 2024 (not
 *    below £40,000). Non-UK resident surcharge from 1 Apr 2021: +2 points on every band.
 * Not modelled: disadvantaged areas relief (to 2013), companies' 15% rate, leases (rent NPV), mixed-use,
 * multiple dwellings relief. Scotland (LBTT from 1 Apr 2015) and Wales (LTT from 1 Apr 2018) are separate taxes.
 */

type Band = [upTo: number, rate: number];
export interface Period {
  from: string; to: string | null; label: string; url: string;
  kind: 'slab' | 'slice';
  bands: Band[];
  ftb?: { maxPrice: number; bands: Band[] };
}

const G = 'https://www.gov.uk/government/publications/rates-and-allowances-stamp-duty-land-tax/stamp-duty-land-tax-rates-';
const SLICE_2014: Band[] = [[125000, 0], [250000, 0.02], [925000, 0.05], [1500000, 0.1], [Infinity, 0.12]];
const SLICE_250K: Band[] = [[250000, 0], [925000, 0.05], [1500000, 0.1], [Infinity, 0.12]];
const SLICE_500K: Band[] = [[500000, 0], [925000, 0.05], [1500000, 0.1], [Infinity, 0.12]];
const FTB_300: { maxPrice: number; bands: Band[] } = { maxPrice: 500000, bands: [[300000, 0], [500000, 0.05]] };
const FTB_425: { maxPrice: number; bands: Band[] } = { maxPrice: 625000, bands: [[425000, 0], [625000, 0.05]] };
const SLAB_125: Band[] = [[125000, 0], [250000, 0.01], [500000, 0.03], [Infinity, 0.04]];

export const PERIODS: Period[] = [
  { from: '2003-12-01', to: '2005-03-16', label: '1 Dec 2003 to 16 Mar 2005', url: G + '1-december-2003-to-16-march-2005', kind: 'slab', bands: [[60000, 0], [250000, 0.01], [500000, 0.03], [Infinity, 0.04]] },
  { from: '2005-03-17', to: '2006-03-22', label: '17 Mar 2005 to 22 Mar 2006', url: G + '17-march-2005-to-22-march-2006', kind: 'slab', bands: [[120000, 0], [250000, 0.01], [500000, 0.03], [Infinity, 0.04]] },
  { from: '2006-03-23', to: '2008-03-11', label: '23 Mar 2006 to 11 Mar 2008', url: G + '23-march-2006-to-11-march-2008', kind: 'slab', bands: SLAB_125 },
  { from: '2008-03-12', to: '2008-09-02', label: '12 Mar 2008 to 2 Sep 2008', url: G + '12-march-2008-to-2-september-2008', kind: 'slab', bands: SLAB_125 },
  { from: '2008-09-03', to: '2009-04-21', label: '3 Sep 2008 to 21 Apr 2009', url: G + '3-september-2008-to-21-april-2009', kind: 'slab', bands: [[175000, 0], [250000, 0.01], [500000, 0.03], [Infinity, 0.04]] },
  { from: '2009-04-22', to: '2009-12-31', label: '22 Apr 2009 to 31 Dec 2009', url: G + '22-april-2009-to-31-december-2009', kind: 'slab', bands: [[175000, 0], [250000, 0.01], [500000, 0.03], [Infinity, 0.04]] },
  { from: '2010-01-01', to: '2010-03-24', label: '1 Jan 2010 to 24 Mar 2010', url: G + '1-january-2010-to-24-march-2010', kind: 'slab', bands: SLAB_125 },
  { from: '2010-03-25', to: '2011-04-05', label: '25 Mar 2010 to 5 Apr 2011', url: G + '25-march-2010-to-5-april-2011', kind: 'slab', bands: SLAB_125, ftb: { maxPrice: 250000, bands: [[250000, 0]] } },
  { from: '2011-04-06', to: '2012-03-21', label: '6 Apr 2011 to 24 Mar 2012', url: G + '6-april-2011-to-24-march-2012', kind: 'slab', bands: [[125000, 0], [250000, 0.01], [500000, 0.03], [1000000, 0.04], [Infinity, 0.05]], ftb: { maxPrice: 250000, bands: [[250000, 0]] } },
  // 7% over £2m from 22 Mar 2012 (same GOV.UK page as above until 24 Mar; first-time buyer relief to 24 Mar 2012).
  { from: '2012-03-22', to: '2012-03-24', label: '6 Apr 2011 to 24 Mar 2012', url: G + '6-april-2011-to-24-march-2012', kind: 'slab', bands: [[125000, 0], [250000, 0.01], [500000, 0.03], [1000000, 0.04], [2000000, 0.05], [Infinity, 0.07]], ftb: { maxPrice: 250000, bands: [[250000, 0]] } },
  { from: '2012-03-25', to: '2014-03-23', label: '25 Mar 2012 to 23 Mar 2014', url: G + '25-march-2012-to-23-march-2014', kind: 'slab', bands: [[125000, 0], [250000, 0.01], [500000, 0.03], [1000000, 0.04], [2000000, 0.05], [Infinity, 0.07]] },
  { from: '2014-03-24', to: '2014-12-03', label: '24 Mar 2014 to 3 Dec 2014', url: G + '24-march-2014-to-3-december-2014', kind: 'slab', bands: [[125000, 0], [250000, 0.01], [500000, 0.03], [1000000, 0.04], [2000000, 0.05], [Infinity, 0.07]] },
  { from: '2014-12-04', to: '2020-07-07', label: '4 Dec 2014 to 7 Jul 2020', url: G + '4-december-2014-to-7-july-2020', kind: 'slice', bands: SLICE_2014, ftb: FTB_300 },
  { from: '2020-07-08', to: '2021-06-30', label: '8 Jul 2020 to 30 Jun 2021', url: G + '8-july-2020-to-30-june-2021', kind: 'slice', bands: SLICE_500K, ftb: FTB_300 },
  { from: '2021-07-01', to: '2021-09-30', label: '1 Jul 2021 to 30 Sep 2021', url: G + '1-july-2021-to-30-september-2021', kind: 'slice', bands: SLICE_250K, ftb: FTB_300 },
  { from: '2021-10-01', to: '2022-09-22', label: '1 Oct 2021 to 22 Sep 2022', url: G + '1-october-2021-to-22-september-2022--2', kind: 'slice', bands: SLICE_2014, ftb: FTB_300 },
  { from: '2022-09-23', to: '2024-10-30', label: '23 Sep 2022 to 30 Oct 2024', url: G + '23-september-2022-to-30-october-2024', kind: 'slice', bands: SLICE_250K, ftb: FTB_425 },
  { from: '2024-10-31', to: '2025-03-31', label: '31 Oct 2024 to 31 Mar 2025', url: G + '31-october-2024-to-31-march-2025', kind: 'slice', bands: SLICE_250K, ftb: FTB_425 },
  { from: '2025-04-01', to: null, label: '1 Apr 2025 onward (current)', url: 'https://www.gov.uk/stamp-duty-land-tax/residential-property-rates', kind: 'slice', bands: SLICE_2014, ftb: FTB_300 },
];

/** First-time buyer relief (slice) started 22 Nov 2017, within the 2014 period. */
const FTB_SLICE_FROM = '2017-11-22';
export const HIGHER_FROM = '2016-04-01';
export const NONRES_FROM = '2021-04-01';
export const higherRate = (date: string) => (date >= '2024-10-31' ? 0.05 : date >= HIGHER_FROM ? 0.03 : 0);
export const FIRST_DATE = PERIODS[0].from;

export type Buyer = 'standard' | 'firstTimeBuyer' | 'additional';
export interface SdltHistoryInput { price: number; date: string; buyer: Buyer; nonResident?: boolean; }
export interface SliceRow { from: number; to: number; rate: number; tax: number; }
export interface SdltHistoryResult {
  period: Period | null;
  tax: number;
  effectiveRate: number;
  rows: SliceRow[];
  system: 'slab' | 'slice' | null;
  ftbApplied: boolean;
  surcharge: number;   // percentage points added per band (higher rates + non-resident)
  notes: string[];
}

export const periodFor = (date: string) => PERIODS.find((p) => date >= p.from && (p.to == null || date <= p.to)) ?? null;

function slice(price: number, bands: Band[], add: number): SliceRow[] {
  const rows: SliceRow[] = [];
  let prev = 0;
  for (const [upTo, rate] of bands) {
    if (price <= prev) break;
    const top = Math.min(price, upTo);
    const r = rate + add;
    rows.push({ from: prev, to: top, rate: r, tax: (top - prev) * r });
    prev = upTo;
  }
  return rows;
}

export function computeSdltHistory(input: SdltHistoryInput): SdltHistoryResult {
  const price = Math.max(0, Math.round(input.price || 0));
  const p = periodFor(input.date);
  const empty: SdltHistoryResult = { period: p, tax: 0, effectiveRate: 0, rows: [], system: p?.kind ?? null, ftbApplied: false, surcharge: 0, notes: [] };
  if (!p) return { ...empty, notes: [`SDLT started on 1 December 2003; before that, Stamp Duty applied.`] };
  const notes: string[] = [];

  if (p.kind === 'slab') {
    const ftbOk = input.buyer === 'firstTimeBuyer' && p.ftb && price <= p.ftb.maxPrice;
    const band = p.bands.find(([upTo]) => price <= upTo)!;
    const rate = ftbOk ? 0 : band[1];
    if (input.buyer === 'firstTimeBuyer' && !p.ftb) notes.push('No first-time buyer relief applied on this date.');
    if (input.buyer === 'additional') notes.push('The higher rates for additional homes started on 1 April 2016.');
    if (input.nonResident) notes.push('The non-resident surcharge started on 1 April 2021.');
    return { ...empty, tax: Math.round(price * rate), effectiveRate: rate, rows: [{ from: 0, to: price, rate, tax: price * rate }], system: 'slab', ftbApplied: !!ftbOk, notes };
  }

  let add = 0;
  if (input.buyer === 'additional') {
    const h = higherRate(input.date);
    if (h > 0 && price >= 40000) add += h;
    else if (h === 0) notes.push('The higher rates for additional homes started on 1 April 2016.');
    else notes.push('The higher rates do not apply below £40,000.');
  }
  if (input.nonResident) {
    if (input.date >= NONRES_FROM) add += 0.02;
    else notes.push('The non-resident surcharge started on 1 April 2021.');
  }
  let rows = slice(price, p.bands, add);
  let ftbApplied = false;
  if (input.buyer === 'firstTimeBuyer') {
    if (p.ftb && input.date >= FTB_SLICE_FROM && price <= p.ftb.maxPrice) {
      const ftbRows = slice(price, p.ftb.bands, add);
      const sum = (r: SliceRow[]) => r.reduce((a, x) => a + x.tax, 0);
      if (sum(ftbRows) <= sum(rows)) { rows = ftbRows; ftbApplied = true; }
      else notes.push('The standard rates were lower than first-time buyer relief on this date, so they apply.');
    } else if (p.ftb && input.date >= FTB_SLICE_FROM) {
      notes.push(`First-time buyer relief only applied to homes up to £${p.ftb.maxPrice.toLocaleString('en-GB')}.`);
    } else notes.push('No first-time buyer relief applied on this date (it started on 22 November 2017).');
  }
  const tax = Math.round(rows.reduce((a, r) => a + r.tax, 0));
  return { period: p, tax, effectiveRate: price ? tax / price : 0, rows, system: 'slice', ftbApplied, surcharge: add, notes };
}
