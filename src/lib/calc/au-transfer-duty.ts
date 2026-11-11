/**
 * Australian transfer (stamp) duty on a home purchase (overhaul C3), only where the official schedule was read.
 * Pure + tested. Every schedule is a table of DutyRow (exported: the Home Buying Planner writes the same rows to its
 * Rules tab and its contract test recalculates them). General rates read 8 Nov 2026, re-checked 9 Nov 2026:
 *  - NSW, Revenue NSW "Calculate transfer duty" (2026/27, updated 6 Oct 2026): $1.25 per $100 to $18,000 (min $20);
 *    $225 + $1.50 per $100 over $18,000; $525 + $1.75 over $38,000; $1,662 + $3.50 over $103,000; $11,602 + $4.50 over
 *    $387,000; $52,237 + $5.50 over $1,290,000; premium $194,137 + $7.00 over $3,870,000. Each $100 "or part".
 *    First Home Buyers Assistance Scheme: no duty on a home of $800,000 or less; a concession below $1,000,000 (formula
 *    not published on the official pages: the general rate is used, which overstates duty between $800,000 and $1m).
 *  - Victoria, SRO "General land transfer duty current rates" (contracts from 1 July 2021, updated 29 Sep 2026): 1.4% to
 *    $25,000; $350 + 2.4% over $25,000; $2,870 + 6% over $130,000; 5.5% of the whole value from $960,000 to $2m;
 *    $110,000 + 6.5% over $2m. First home buyers (SRO, updated 22 Oct 2026): no duty to $600,000; reduced duty to
 *    $750,000 (sliding scale not published: the general rate is used there, flagged).
 *  - Queensland, QRO "Transfer duty rates" (general, updated 25 June 2026): nil to $5,000; $1.50 per $100 or part over
 *    $5,000; $1,050 + $3.50 over $75,000; $17,325 + $4.50 over $540,000; $38,025 + $5.75 over $1,000,000. QRO "Concession
 *    rates" (updated 31 July 2026), home concession for a home you live in: $1.00 per $100 to $350,000; $3,500 + $3.50
 *    over $350,000; $10,150 + $4.50 over $540,000; $30,850 + $5.75 over $1,000,000. First home concession (contracts
 *    from 9 June 2024): the home-concession duty less $17,350 to $709,999.99, then $1,735 less for each $10,000 band to
 *    nothing at $800,000 (QRO example: $730,000 pays $6,555). First home buyers of a NEW home pay no duty, no value cap
 *    (contracts from 1 May 2025). The Home Ownership and Other Legislation Amendment Act 2026 (assent 22 Oct 2026) did
 *    not change rates or thresholds.
 *  - WA, "Transfer duty assessment" (wa.gov.au, read 9 Nov 2026), general rate: $1.90 per $100 or part to $120,000;
 *    $2,280 + $2.85 over $120,000; $3,135 + $3.80 over $150,000; $11,115 + $4.75 over $360,000; $28,453 + $5.15 over
 *    $725,000. First home owner rate from 7 May 2026: nil to $600,000; $16.15 per $100 over $600,000 to $800,000;
 *    general rate above.
 *  - SA, RevenueSA "Rate of stamp duty": $1 per $100 or part to $12,000; $120 + $2 over $12,000; $480 + $3 over $30,000;
 *    $1,080 + $3.50 over $50,000; $2,830 + $4 over $100,000; $6,830 + $4.25 over $200,000; $8,955 + $4.75 over $250,000;
 *    $11,330 + $5 over $300,000; $21,330 + $5.50 over $500,000. First home buyers of a NEW home: no duty, no value cap
 *    (contracts from 6 June 2024); established homes: general rate.
 *  - Tasmania, SRO "Rates of duty" (transfers from 21 Oct 2013): $50 to $3,000; $50 + $1.75 per $100 or part over
 *    $3,000; $435 + $2.25 over $25,000; $1,560 + $3.50 over $75,000; $5,935 + $4 over $200,000; $12,935 + $4.25 over
 *    $375,000; $27,810 + $4.50 over $725,000. The first home buyer exemption for established homes ended for
 *    settlements after 30 June 2026 (SRO, published 16 July 2026).
 *  - ACT, owner-occupier ($0.28 per $100 or part to $260,000; $728 + $2.20 over $260,000; $1,608 + $3.40 over $300,000;
 *    $8,408 + $4.32 over $500,000; $19,208 + $5.90 over $750,000; $33,958 + $6.40 over $1,000,000; above $1,455,000 a
 *    flat $4.54 per $100 of the whole value). Home Buyer Concession Scheme from 1 July 2026: no duty at any price and no
 *    income test for buyers who have not owned property in the past 5 years (ACT Revenue; the site blocks automated
 *    reading, so this was read from the official page's search listing: re-check).
 *  - NT, Territory Revenue Office I-SD-002: up to $525,000, D = 0.06571441 x V^2 + 15 x V with V = value / 1,000; then
 *    4.95% of the whole value to $3m, 5.75% to $5m, 5.95% from $5m. TRO example: $140,000 = $3,388. House and Land
 *    Package Exemption: no duty on a new house-and-land package, contracts 1 July 2022 to 30 June 2027.
 */
export type AuState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';
export interface DutyResult { duty: number; note?: string; }

/**
 * One band of a schedule, chosen when value >= from (and below the next row's from):
 *   amount = base + round((value - at) / step) x per + quad x (value / 1000)^2
 * round: 'up' = "per $100 or part", 'down' = whole steps only, 'none' = exact. `from` is the first whole dollar of
 * the band: a schedule that reads "up to $X" starts its next band at X + 1.
 */
export interface DutyRow { from: number; base: number; at: number; step: number; per: number; round: 'up' | 'down' | 'none'; quad?: number }
const R = (from: number, base: number, at: number, per: number, round: DutyRow['round'] = 'up', step = 100, quad?: number): DutyRow =>
  ({ from, base, at, step, per, round, ...(quad ? { quad } : {}) });

export function schedule(v: number, rows: readonly DutyRow[]): number {
  let row = rows[0];
  for (const r of rows) if (v >= r.from) row = r;
  const x = (v - row.at) / row.step;
  const n = row.round === 'up' ? Math.ceil(x) : row.round === 'down' ? Math.floor(x) : x;
  return row.base + n * row.per + (row.quad ?? 0) * (v / 1000) ** 2;
}

/** General (and owner-occupier) schedules, and the concession schedules. */
export const AU_DUTY: Record<string, readonly DutyRow[]> = {
  NSW: [R(0, 0, 0, 1.25), R(18001, 225, 18000, 1.5), R(38001, 525, 38000, 1.75), R(103001, 1662, 103000, 3.5), R(387001, 11602, 387000, 4.5), R(1290001, 52237, 1290000, 5.5), R(3870001, 194137, 3870000, 7)],
  VIC: [R(0, 0, 0, 1.4, 'none'), R(25001, 350, 25000, 2.4, 'none'), R(130001, 2870, 130000, 6, 'none'), R(960001, 0, 0, 5.5, 'none'), R(2000001, 110000, 2000000, 6.5, 'none')],
  QLD: [R(0, 0, 0, 0), R(5001, 0, 5000, 1.5), R(75001, 1050, 75000, 3.5), R(540001, 17325, 540000, 4.5), R(1000001, 38025, 1000000, 5.75)],
  'QLD-home': [R(0, 0, 0, 1), R(350001, 3500, 350000, 3.5), R(540001, 10150, 540000, 4.5), R(1000001, 30850, 1000000, 5.75)],
  /** QLD first home concession: the amount taken off the home-concession duty. */
  'QLD-first': [R(0, 17350, 0, 0, 'none'), R(710000, 15615, 710000, -1735, 'down', 10000), R(800000, 0, 0, 0, 'none')],
  WA: [R(0, 0, 0, 1.9), R(120001, 2280, 120000, 2.85), R(150001, 3135, 150000, 3.8), R(360001, 11115, 360000, 4.75), R(725001, 28453, 725000, 5.15)],
  'WA-first': [R(0, 0, 0, 0), R(600001, 0, 600000, 16.15), R(800001, 28453, 725000, 5.15)],
  SA: [R(0, 0, 0, 1), R(12001, 120, 12000, 2), R(30001, 480, 30000, 3), R(50001, 1080, 50000, 3.5), R(100001, 2830, 100000, 4), R(200001, 6830, 200000, 4.25), R(250001, 8955, 250000, 4.75), R(300001, 11330, 300000, 5), R(500001, 21330, 500000, 5.5)],
  TAS: [R(0, 50, 0, 0, 'none'), R(3001, 50, 3000, 1.75), R(25001, 435, 25000, 2.25), R(75001, 1560, 75000, 3.5), R(200001, 5935, 200000, 4), R(375001, 12935, 375000, 4.25), R(725001, 27810, 725000, 4.5)],
  ACT: [R(0, 0, 0, 0.28), R(260001, 728, 260000, 2.2), R(300001, 1608, 300000, 3.4), R(500001, 8408, 500000, 4.32), R(750001, 19208, 750000, 5.9), R(1000001, 33958, 1000000, 6.4), R(1455001, 0, 0, 4.54)],
  NT: [R(0, 0, 0, 1.5, 'none', 100, 0.06571441), R(525001, 0, 0, 4.95, 'none'), R(3000000, 0, 0, 5.75, 'none'), R(5000000, 0, 0, 5.95, 'none')],
};
/** NSW and Victoria: first home buyers pay no duty up to the first value; reduced duty above (formula not published) to the second. */
export const FHB_EXEMPT: Partial<Record<AuState, [number, number]>> = { NSW: [800000, 1000000], VIC: [600000, 750000] };

export interface DutyOptions {
  /** A NEW home (QLD and SA first home buyers: no duty; NT: a new house-and-land package, any buyer). */
  newHome?: boolean;
  /** A home the buyer will live in: Queensland's home concession rate instead of the general rate. */
  home?: boolean;
}

export function transferDuty(value: number, state: AuState, firstHomeBuyer = false, opts: DutyOptions = {}): DutyResult {
  const v = Math.max(0, Math.round(value || 0));
  const gen = (s: string = state) => Math.round(schedule(v, AU_DUTY[s]));
  if (state === 'NSW' || state === 'VIC') {
    const [free, top] = FHB_EXEMPT[state]!;
    if (firstHomeBuyer && v <= free) return { duty: 0, note: `First home buyers pay no duty on homes of $${free.toLocaleString('en-AU')} or less (${state}).` };
    const duty = state === 'NSW' ? Math.max(20, gen()) : gen();
    if (firstHomeBuyer && v < top) return { duty, note: `${state} reduces duty for first home buyers below $${top.toLocaleString('en-AU')}; the reduced amount is not published as a formula, so this uses the general rate and overstates duty.` };
    if (state === 'VIC' && v <= 550000) return { duty, note: 'Owner-occupiers may get Victoria’s principal place of residence concession up to $550,000, not included here.' };
    return { duty };
  }
  if (state === 'QLD') {
    if (firstHomeBuyer && opts.newHome) return { duty: 0, note: 'First home buyers of a new home pay no duty in Queensland (contracts from 1 May 2025).' };
    if (firstHomeBuyer) {
      const home = gen('QLD-home');
      return { duty: Math.max(0, home - Math.round(schedule(v, AU_DUTY['QLD-first']))), note: 'Queensland first home concession on an established home.' };
    }
    if (opts.home) return { duty: gen('QLD-home'), note: 'Queensland home concession rate (you live in the home).' };
    return { duty: gen(), note: 'General rate. Owner-occupiers pay the lower home concession rate and first home buyers less again.' };
  }
  if (state === 'WA') {
    if (firstHomeBuyer) return { duty: gen('WA-first'), note: 'WA first home owner rate (from 7 May 2026): no duty to $600,000, $16.15 per $100 above it to $800,000.' };
    return { duty: gen(), note: 'General rate. First home owners pay no duty to $600,000.' };
  }
  if (state === 'SA') {
    if (firstHomeBuyer && opts.newHome) return { duty: 0, note: 'First home buyers of a new home pay no duty in South Australia (contracts from 6 June 2024).' };
    return { duty: gen(), note: firstHomeBuyer ? 'South Australia’s first home buyer relief is for new homes only; an established home pays the general rate.' : 'General rate.' };
  }
  if (state === 'TAS') return { duty: gen(), note: 'General rate. Tasmania’s first home buyer exemption for established homes ended for settlements after 30 June 2026.' };
  if (state === 'ACT') {
    if (firstHomeBuyer) return { duty: 0, note: 'ACT Home Buyer Concession Scheme (from 1 July 2026): no duty for buyers who have not owned property in the past 5 years.' };
    return { duty: gen(), note: 'Owner-occupier rate. Eligible buyers under the ACT Home Buyer Concession Scheme pay no duty; non owner-occupiers pay more below $300,000.' };
  }
  if (opts.newHome) return { duty: 0, note: 'Northern Territory House and Land Package Exemption: no duty on a new house-and-land package (contracts to 30 June 2027).' };
  return { duty: gen(), note: 'General rate.' };
}
