/**
 * Canadian land transfer tax (and the registration fees that stand in for it) on a home purchase (overhaul C3).
 * Pure + tested. Marginal bands are exported (the Home Buying Planner writes them to its Rules tab and its contract test
 * recalculates them). Sources read 2 Nov 2026 and re-checked 9 Nov 2026:
 *  - Ontario: ontario.ca "Calculating Land Transfer Tax" (updated 22 Apr 2026): 0.5% to $55,000, 1% to $250,000, 1.5% to
 *    $400,000, 2% to $2,000,000, 2.5% above (1-2 single-family residences); first-time buyer refund up to $4,000.
 *  - Toronto: Municipal Land Transfer Tax on top of Ontario's, same bands to $3,000,000, then (from 1 April 2026) 4.40% to
 *    $4m, 5.45% to $5m, 6.50% to $10m, 7.55% to $20m, 8.60% above; first-time buyer rebate up to $4,475 (toronto.ca).
 *  - British Columbia: Property Transfer Tax 1% on the first $200,000, 2% to $2,000,000, 3% above, and a further 2% on
 *    residential value above $3,000,000. First-time home buyers (registrations from 1 April 2024): the tax on the first
 *    $500,000 is exempt (at most $8,000) for homes up to $835,000, shrinking in proportion to nothing at $860,000.
 *    (www2.gov.bc.ca could not be fetched on 9 Nov 2026: read from the official pages' search listing.)
 *  - Alberta: no land transfer tax; Land Titles transfer fee $50 plus $5 for every $5,000 of value or part (fee schedule
 *    effective 1 Oct 2026).
 *  - Quebec (quebec.ca, 2026): welcome tax 0.5% to $62,900, 1% to $315,000, 1.5% above; municipalities may charge more
 *    above $500,000 (up to 3%). Montreal 2026 (montreal.ca): 0.5% / 1% / 1.5% to $552,300 / 2% to $1,104,700 / 2.5% to
 *    $2,136,500 / 3.5% to $3,113,000 / 4% above. First-time buyer credit (announced 17 Apr 2026, retroactive to
 *    1 Jan 2026): 100% of the first $5,000 of welcome tax plus 25% of the next $3,500 (up to $5,875) on homes up to
 *    $750,000; it phases down to nothing at $1m (phase-down not modelled: flagged, none counted).
 *  - Manitoba (gov.mb.ca): 0% to $30,000, 0.5% to $90,000, 1% to $150,000, 1.5% to $200,000, 2% above.
 *  - New Brunswick: 1% of the greater of price and assessed value (the price is used here).
 *  - Nova Scotia, Halifax Regional Municipality deed transfer tax 1.5% (Service Nova Scotia list, July 2026).
 *  - Prince Edward Island (Real Property Transfer Tax Act, consolidated 29 May 2026): 1% of the greater of price and
 *    assessed value, none at $30,000 or less; first-time buyers who qualify pay none (no price cap).
 *  - Saskatchewan (Saskatchewan Registry Services, from 15 Apr 2026): title transfer free to $500, $25 to $6,300, then
 *    0.4% of the whole value.
 *  - Newfoundland and Labrador (Registry of Deeds): $100, plus $0.40 for each $100 or part above $500.
 */
export type Province = 'ON' | 'ON-TOR' | 'BC' | 'AB' | 'QC' | 'QC-MTL' | 'MB' | 'NB' | 'NS-HFX' | 'PE' | 'SK' | 'NL';
/** [band starts above, rate on the part above it]. */
export type Band = [from: number, rate: number];

export const LTT_BANDS: Record<string, readonly Band[]> = {
  ON: [[0, 0.005], [55000, 0.01], [250000, 0.015], [400000, 0.02], [2000000, 0.025]],
  TOR: [[0, 0.005], [55000, 0.01], [250000, 0.015], [400000, 0.02], [2000000, 0.025], [3000000, 0.044], [4000000, 0.0545], [5000000, 0.065], [10000000, 0.0755], [20000000, 0.086]],
  BC: [[0, 0.01], [200000, 0.02], [2000000, 0.03], [3000000, 0.05]],
  QC: [[0, 0.005], [62900, 0.01], [315000, 0.015]],
  'QC-MTL': [[0, 0.005], [62900, 0.01], [315000, 0.015], [552300, 0.02], [1104700, 0.025], [2136500, 0.035], [3113000, 0.04]],
  MB: [[0, 0], [30000, 0.005], [90000, 0.01], [150000, 0.015], [200000, 0.02]],
  NB: [[0, 0.01]],
  'NS-HFX': [[0, 0.015]],
  PE: [[0, 0.01]],
};
export const ON_FTB_REFUND = 4000;
export const TOR_FTB_REBATE = 4475;
export const BC_FTB = { exemptOn: 500000, fullTo: 835000, endAt: 860000 };
export const QC_FTB = { first: 5000, next: 3500, nextShare: 0.25, fullTo: 750000, endAt: 1000000 };
export const PE_MIN = 30000;

export function marginal(price: number, bands: readonly Band[]): number {
  let tax = 0;
  bands.forEach(([from, rate], i) => {
    const to = i + 1 < bands.length ? bands[i + 1][0] : Infinity;
    if (price > from) tax += (Math.min(price, to) - from) * rate;
  });
  return tax;
}

export interface LttResult { tax: number; rebate: number; net: number; parts: { label: string; amount: number }[]; note?: string; }

export const PROVINCE_NAMES: Record<Province, string> = {
  ON: 'Ontario', 'ON-TOR': 'Toronto (Ontario + municipal)', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  'QC-MTL': 'Montreal (Quebec)', MB: 'Manitoba', NB: 'New Brunswick', 'NS-HFX': 'Halifax (Nova Scotia)', PE: 'Prince Edward Island',
  SK: 'Saskatchewan', NL: 'Newfoundland and Labrador',
};

export function landTransferTax(price: number, province: Province, firstTimeBuyer = false): LttResult {
  const p = Math.max(0, price || 0);
  const parts: { label: string; amount: number }[] = [];
  let rebate = 0, note: string | undefined;
  if (province === 'ON' || province === 'ON-TOR') {
    const prov = marginal(p, LTT_BANDS.ON);
    parts.push({ label: 'Ontario land transfer tax', amount: prov });
    if (firstTimeBuyer) rebate += Math.min(ON_FTB_REFUND, prov);
    if (province === 'ON-TOR') {
      const city = marginal(p, LTT_BANDS.TOR);
      parts.push({ label: 'Toronto municipal land transfer tax', amount: city });
      if (firstTimeBuyer) rebate += Math.min(TOR_FTB_REBATE, city);
      if (p > 3000000) note = 'Toronto’s luxury rates (4.40% to 8.60%) apply above $3,000,000 (from 1 April 2026).';
    }
  } else if (province === 'BC') {
    const ptt = marginal(p, LTT_BANDS.BC);
    parts.push({ label: 'BC property transfer tax', amount: ptt });
    if (firstTimeBuyer && p < BC_FTB.endAt) {
      const full = marginal(Math.min(p, BC_FTB.exemptOn), LTT_BANDS.BC); // tax on the first $500,000 (max $8,000)
      rebate = p <= BC_FTB.fullTo ? full : full * (BC_FTB.endAt - p) / (BC_FTB.endAt - BC_FTB.fullTo);
    }
  } else if (province === 'AB') {
    parts.push({ label: 'Alberta Land Titles transfer fee', amount: 50 + 5 * Math.ceil(p / 5000) });
  } else if (province === 'SK') {
    parts.push({ label: 'Saskatchewan title transfer fee', amount: p <= 500 ? 0 : p <= 6300 ? 25 : p * 0.004 });
  } else if (province === 'NL') {
    parts.push({ label: 'Newfoundland and Labrador registration fee', amount: 100 + 0.4 * Math.ceil(Math.max(0, p - 500) / 100) });
  } else if (province === 'QC' || province === 'QC-MTL') {
    const wt = marginal(p, LTT_BANDS[province]);
    parts.push({ label: province === 'QC' ? 'Quebec welcome tax' : 'Montreal welcome tax', amount: wt });
    if (province === 'QC') note = 'Many Quebec municipalities charge more above $500,000 (up to 3%): check yours.';
    if (firstTimeBuyer) {
      if (p <= QC_FTB.fullTo) rebate = Math.min(wt, QC_FTB.first) + QC_FTB.nextShare * Math.min(QC_FTB.next, Math.max(0, wt - QC_FTB.first));
      else if (p < QC_FTB.endAt) note = 'Quebec’s first-time buyer credit is reduced between $750,000 and $1m; not counted here.';
    }
  } else if (province === 'PE') {
    parts.push({ label: 'PEI real property transfer tax', amount: p <= PE_MIN ? 0 : marginal(p, LTT_BANDS.PE) });
    if (firstTimeBuyer) rebate = parts[0].amount;
  } else {
    parts.push({ label: province === 'MB' ? 'Manitoba land transfer tax' : province === 'NB' ? 'New Brunswick real property transfer tax' : 'Halifax deed transfer tax', amount: marginal(p, LTT_BANDS[province]) });
  }
  const tax = parts.reduce((a, x) => a + x.amount, 0);
  const r = Math.round(rebate);
  return { tax: Math.round(tax), rebate: r, net: Math.round(tax) - r, parts: parts.map((x) => ({ ...x, amount: Math.round(x.amount) })), note };
}
