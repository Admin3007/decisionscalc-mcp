/**
 * UK voluntary National Insurance for time abroad: which gap years you can still fill, which class, what each costs,
 * the deadline, and what it adds to the new State Pension. Pure + tested.
 *
 * Official sources (read 2026-11-03, gov.uk):
 *  - "Voluntary National Insurance" guide (print view): rates 2026–27 Class 2 £3.65 / Class 3 £18.40 a week; Class 2 for
 *    the previous tax year and Class 3 for the previous 2 tax years are paid at the original rate, other years at the
 *    current rate; you can only pay for the past 6 years, deadline 5 April (e.g. 5 April 2032 for 2025–26).
 *    Abroad, for 2025–26 or earlier: Class 2 or 3 if you lived in the UK 3 years in a row or paid 3 years of
 *    contributions; Class 2 also needs work in the UK immediately before leaving and work abroad.
 *    For 2026–27 onwards: no Class 2 for time abroad; Class 3 needs 10 years in a row living in the UK or 10 years of
 *    qualifying contributions, unless you applied for 2024–25 or 2025–26 on or before 5 April 2026, pay those by
 *    5 April 2027 and apply for 2026–27 Class 3 by 5 April 2027 (then the 3-year test still applies).
 *  - "Rates and allowances: National Insurance contributions": Class 2 £3.45 (2024–25), £3.50 (2025–26);
 *    Class 3 £17.45 (2024–25), £17.75 (2025–26).
 *  - "The new State Pension: what you'll get": full rate £241.30 a week (2026–27); 35 qualifying years for the full
 *    rate; usually at least 10 qualifying years to get any.
 * Re-checked 2026-11-12 (radar/decisionscalc/UK-SP-ABROAD-FACTS.md in the apps repo): the law is The Social Security
 * (Contributions) (Amendment) Regulations 2026, SI 2026/294, reg 147. The transitional rule splits by previous class:
 * former Class 3 payers need only to have applied before 6 April 2026 and to pay 2024–25 or 2025–26 by 5 April 2027;
 * former Class 2 payers must also apply for 2026–27 Class 3 by 5 April 2027. Protection ends on a return to the UK.
 * The 10-year contributions route counts UK-paid years only (no NI credits, no voluntary contributions for time abroad).
 * 2027–28 (announced at Budget 2026, "proposed" until the regulations are made): Class 2 £3.80, Class 3 £19.05,
 * full new State Pension £250.70 a week. Where you live (gov.uk "State Pension if you retire abroad", MSD, Services
 * Australia, SSA): increases are paid in the EEA, Switzerland, Gibraltar and agreement countries such as the US, Israel,
 * the Philippines and Turkey; frozen elsewhere, including Canada, Australia and New Zealand. NZ deducts a UK pension from
 * NZ Super except the share built from voluntary contributions (since 9 Nov 2020). Australia counts it as income for the
 * Age Pension income test (50c per $1 above the free area, single).
 * Simplifications (stated on the page): pension = years/35 × full rate (people with a pre-2016 record may have a
 * different starting amount; HMRC's forecast is authoritative); a year is assumed to be a full gap.
 */

export const PAY_YEAR = 2026; // tax year 2026–27 (years are named by the calendar year they start)
export const FULL_RATE_WEEKLY = 241.3;
export const FULL_YEARS = 35;
export const MIN_YEARS = 10;
export const WEEKS = 52;
export const CLASS2: Record<number, number> = { 2024: 3.45, 2025: 3.5, 2026: 3.65, 2027: 3.8 };
export const CLASS3: Record<number, number> = { 2024: 17.45, 2025: 17.75, 2026: 18.4, 2027: 19.05 };
/** 2027–28 rates as announced at Budget 2026 (proposed until the regulations are made). */
export const NEXT_YEAR = 2027;
export const FULL_RATE_WEEKLY_2027 = 250.7;
export const CURRENT = { class2: CLASS2[PAY_YEAR], class3: CLASS3[PAY_YEAR] };

export const yearLabel = (y: number) => `${y}–${String((y + 1) % 100).padStart(2, '0')}`;
/** Deadline to pay for tax year y (starting April y): 5 April, 7 calendar years later. */
export const deadlineFor = (y: number) => `5 April ${y + 7}`;
/** Earliest tax year still payable while paying in PAY_YEAR. */
export const EARLIEST = PAY_YEAR - 6;

/** Weekly rate payable now for a past year: original rate inside the window, current rate otherwise. */
export function weeklyRate(cls: 2 | 3, y: number, payYear = PAY_YEAR): number {
  const table = cls === 2 ? CLASS2 : CLASS3;
  const window = cls === 2 ? 1 : 2;
  if (y < payYear && payYear - y <= window && table[y] !== undefined) return table[y];
  return table[payYear];
}

export interface NiInput {
  /** Qualifying years already on the UK record. */
  qualifyingYears: number;
  /** Tax years (start year) with gaps spent abroad that you want to fill. */
  gapYears: number[];
  /** Lived in the UK this many years in a row (longest stretch). */
  ukResidenceYears: number;
  /** Years of UK contributions paid (or Class 2 treated as paid) in total. */
  ukContributionYears: number;
  /** Worked in the UK immediately before leaving. */
  workedBeforeLeaving: boolean;
  /** Worked (employed or self-employed) while abroad in that period. */
  workedAbroad: boolean;
  /** Applied to pay for 2024–25 or 2025–26 on or before 5 April 2026 (keeps the 3-year test for 2026–27). */
  appliedBefore2026: boolean;
  /** The class you were paying under that application: 3 needs no new application, 2 must apply for 2026–27 Class 3 by 5 April 2027. */
  previousClass?: 2 | 3;
  /** Years of UK-PAID contributions for the 10-year test (no NI credits, no voluntary years paid for time abroad). Defaults to ukContributionYears. */
  contributionYearsFor10?: number;
}

export interface NiYear {
  year: number;
  label: string;
  payable: boolean;
  cls: 2 | 3 | null;
  weekly: number;
  cost: number;
  deadline: string;
  reason: string;
}

export interface NiResult {
  years: NiYear[];
  totalCost: number;
  yearsBought: number;
  pensionBefore: number;   // £ a week
  pensionAfter: number;    // £ a week
  gainWeekly: number;
  gainYearly: number;
  paybackYears: number | null;
  /** The same purchase if you wait until after 5 April 2027: years lost and the cost at 2027–28 rates (proposed). */
  waitAfterApril2027: { lostYears: number[]; cost: number; extraCost: number };
  /** Years beyond 35 add nothing; years bought while under 10 may unlock the whole pension. */
  note: string;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export function pensionFor(qualifyingYears: number): number {
  const y = Math.max(0, Math.floor(qualifyingYears));
  if (y < MIN_YEARS) return 0;
  return r2((Math.min(y, FULL_YEARS) / FULL_YEARS) * FULL_RATE_WEEKLY);
}

export function assessYear(y: number, i: NiInput): NiYear {
  const base = { year: y, label: yearLabel(y), deadline: deadlineFor(y) };
  if (y < EARLIEST) return { ...base, payable: false, cls: null, weekly: 0, cost: 0, reason: `The deadline (${deadlineFor(y)}) has passed.` };
  if (y > PAY_YEAR) return { ...base, payable: false, cls: null, weekly: 0, cost: 0, reason: 'This tax year has not started yet.' };
  const three = i.ukResidenceYears >= 3 || i.ukContributionYears >= 3;
  const ten = i.ukResidenceYears >= 10 || (i.contributionYearsFor10 ?? i.ukContributionYears) >= 10;
  if (y <= 2025) {
    if (!three) return { ...base, payable: false, cls: null, weekly: 0, cost: 0, reason: 'You need 3 years in a row living in the UK, or 3 years of UK contributions.' };
    const cls: 2 | 3 = i.workedBeforeLeaving && i.workedAbroad ? 2 : 3;
    const weekly = weeklyRate(cls, y);
    return { ...base, payable: true, cls, weekly, cost: r2(weekly * WEEKS), reason: cls === 2 ? 'Class 2: you worked in the UK before leaving and worked abroad.' : 'Class 3 (Class 2 needs UK work just before leaving and work abroad).' };
  }
  // 2026–27 onwards: Class 3 only, 10-year test unless protected.
  if (!(ten || (three && i.appliedBefore2026))) {
    return { ...base, payable: false, cls: null, weekly: 0, cost: 0, reason: 'From 2026–27 you need 10 years in a row living in the UK or 10 years of UK-paid contributions (NI credits and voluntary years abroad don’t count), unless you applied to pay for 2024–25 or 2025–26 before 6 April 2026.' };
  }
  const weekly = weeklyRate(3, y);
  const transitional = i.previousClass === 3
    ? 'Class 3 under the transitional rule: pay the 2024–25 or 2025–26 year you applied for by 5 April 2027 (no new application needed).'
    : i.previousClass === 2
      ? 'Class 3 under the transitional rule: pay 2024–25 or 2025–26 by 5 April 2027 and apply for 2026–27 Class 3 by 5 April 2027.'
      : 'Class 3 under the transitional rule: pay 2024–25 or 2025–26 by 5 April 2027; if you were paying Class 2, also apply for 2026–27 Class 3 by then.';
  return { ...base, payable: true, cls: 3, weekly, cost: r2(weekly * WEEKS), reason: ten ? 'Class 3 (Class 2 is no longer available for time abroad).' : transitional };
}

export function computeNi(i: NiInput): NiResult {
  const uniq = [...new Set(i.gapYears.map((y) => Math.floor(y)))].sort((a, b) => a - b);
  const before = Math.max(0, Math.floor(i.qualifyingYears));
  const assessed = uniq.map((y) => assessYear(y, i));
  // Buy only the years that still raise the pension (up to 35), cheapest first.
  const needed = Math.max(0, FULL_YEARS - before);
  const keep = new Set(assessed.filter((y) => y.payable).sort((a, b) => a.cost - b.cost || b.year - a.year).slice(0, needed).map((y) => y.year));
  const years = assessed.map((y) => (y.payable && !keep.has(y.year) ? { ...y, payable: false, cost: 0, reason: 'Not needed: you reach 35 qualifying years with cheaper years.' } : y));
  const payable = years.filter((y) => y.payable);
  const after = before + payable.length;
  const pensionBefore = pensionFor(before);
  const pensionAfter = pensionFor(after);
  const gainWeekly = r2(pensionAfter - pensionBefore);
  const gainYearly = r2(gainWeekly * WEEKS);
  const totalCost = r2(payable.reduce((s, y) => s + y.cost, 0));
  const surplus = assessed.filter((y) => y.payable).length - payable.length;
  const note = before >= FULL_YEARS ? 'You already have 35 qualifying years: extra years add nothing to the new State Pension.'
    : surplus > 0 ? `Only ${FULL_YEARS - before} of these years are needed to reach 35; the cheapest are used.`
    : before < MIN_YEARS && after >= MIN_YEARS ? 'These years take you to the 10-year minimum, so they unlock the whole pension.'
    : after < MIN_YEARS ? `You would still have fewer than ${MIN_YEARS} qualifying years, so no UK State Pension yet.`
    : 'Each year adds about 1/35 of the full new State Pension, for life.';
  // Waiting past 5 April 2027: 2020–21 can no longer be paid, the transitional route closes (2026–27 then needs the
  // 10-year test), and every year is charged at 2027–28 rates (original rate only inside the window).
  const tenNow = i.ukResidenceYears >= 10 || (i.contributionYearsFor10 ?? i.ukContributionYears) >= 10;
  const lostYears = payable.filter((y) => y.year < NEXT_YEAR - 6 || (y.year >= 2026 && !tenNow)).map((y) => y.year);
  const kept = payable.filter((y) => !lostYears.includes(y.year));
  const laterCost = r2(kept.reduce((s, y) => s + weeklyRate((y.cls ?? 3) as 2 | 3, y.year, NEXT_YEAR) * WEEKS, 0));
  const keptNowCost = r2(kept.reduce((s, y) => s + y.cost, 0));
  return { years, totalCost, yearsBought: payable.length, pensionBefore, pensionAfter, gainWeekly, gainYearly, paybackYears: gainYearly > 0 ? Math.round((totalCost / gainYearly) * 10) / 10 : null, waitAfterApril2027: { lostYears, cost: laterCost, extraCost: r2(laterCost - keptNowCost) }, note };
}

/** Where you live when you draw the pension: is it raised each April, and how much of the gain do you keep? */
export type Residence = 'ie' | 'eea' | 'ch' | 'us' | 'gi' | 'il' | 'ph' | 'tr' | 'ca' | 'au' | 'nz' | 'other';
export const RESIDENCES: { id: Residence; name: string }[] = [
  { id: 'ie', name: 'Ireland' }, { id: 'eea', name: 'Another EU/EEA country' }, { id: 'ch', name: 'Switzerland' },
  { id: 'us', name: 'United States' }, { id: 'gi', name: 'Gibraltar' }, { id: 'il', name: 'Israel' }, { id: 'ph', name: 'Philippines' },
  { id: 'tr', name: 'Turkey' }, { id: 'ca', name: 'Canada' }, { id: 'au', name: 'Australia' }, { id: 'nz', name: 'New Zealand' },
  { id: 'other', name: 'Somewhere else' },
];
export interface WhereResult { uprated: boolean; keepShare: number; keptYearly: number; paybackYears: number | null; notes: string[] }

export function whereYouLive(r: Pick<NiResult, 'gainYearly' | 'totalCost'>, residence: Residence, opts: { auAboveFreeArea?: boolean } = {}): WhereResult {
  const uprated = ['ie', 'eea', 'ch', 'us', 'gi', 'il', 'ph', 'tr'].includes(residence);
  const notes: string[] = [];
  let keepShare = 1;
  if (residence === 'nz') notes.push('New Zealand deducts a UK State Pension from NZ Super, but not the part built from voluntary contributions (since 9 November 2020), so the years you buy keep their full value. The UK pension is frozen in New Zealand.');
  else if (residence === 'au') {
    keepShare = opts.auAboveFreeArea === false ? 1 : 0.5;
    notes.push(opts.auAboveFreeArea === false
      ? 'Australia counts a UK pension as income for the Age Pension. Below the income-test free area ($226 a fortnight single, $396 a couple) nothing is lost; above it the Age Pension falls by 50c for each $1 (25c each for a couple). The UK pension is frozen in Australia.'
      : 'Australia counts a UK pension as income: above the free area ($226 a fortnight single, $396 a couple) the Age Pension falls by 50c for each $1 of it, so on a part Age Pension you keep about half. The UK pension is frozen in Australia.');
  } else if (residence === 'ca') notes.push('Canada does not reduce CPP or OAS for a UK pension, but the Guaranteed Income Supplement (GIS) counts it as income. The UK pension is frozen in Canada.');
  else if (residence === 'us') notes.push('Since the Social Security Fairness Act (January 2025) a UK pension no longer reduces US Social Security, and under the UK-US tax treaty a US resident is taxed on it only in the US. It rises each April.');
  else if (residence === 'ie') notes.push('Ireland does not reduce the Irish contributory State Pension for a UK pension, and the UK pension rises each April. UK years can also count towards the Irish 520-contribution rule.');
  else if (uprated) notes.push('The UK State Pension rises each April where you live (EEA, Switzerland, Gibraltar and agreement countries).');
  else notes.push('In most countries outside the EEA (including Canada, Australia and New Zealand) the UK State Pension is frozen: you get the rate from when you first claim, with no yearly increases.');
  const keptYearly = Math.round(r.gainYearly * keepShare * 100) / 100;
  return { uprated, keepShare, keptYearly, paybackYears: keptYearly > 0 ? Math.round((r.totalCost / keptYearly) * 10) / 10 : null, notes };
}
