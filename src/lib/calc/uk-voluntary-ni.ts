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
 * Simplifications (stated on the page): pension = years/35 × full rate (people with a pre-2016 record may have a
 * different starting amount; HMRC's forecast is authoritative); a year is assumed to be a full gap.
 */

export const PAY_YEAR = 2026; // tax year 2026–27 (years are named by the calendar year they start)
export const FULL_RATE_WEEKLY = 241.3;
export const FULL_YEARS = 35;
export const MIN_YEARS = 10;
export const WEEKS = 52;
export const CLASS2: Record<number, number> = { 2024: 3.45, 2025: 3.5, 2026: 3.65 };
export const CLASS3: Record<number, number> = { 2024: 17.45, 2025: 17.75, 2026: 18.4 };
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
  const ten = i.ukResidenceYears >= 10 || i.ukContributionYears >= 10;
  if (y <= 2025) {
    if (!three) return { ...base, payable: false, cls: null, weekly: 0, cost: 0, reason: 'You need 3 years in a row living in the UK, or 3 years of UK contributions.' };
    const cls: 2 | 3 = i.workedBeforeLeaving && i.workedAbroad ? 2 : 3;
    const weekly = weeklyRate(cls, y);
    return { ...base, payable: true, cls, weekly, cost: r2(weekly * WEEKS), reason: cls === 2 ? 'Class 2: you worked in the UK before leaving and worked abroad.' : 'Class 3 (Class 2 needs UK work just before leaving and work abroad).' };
  }
  // 2026–27 onwards: Class 3 only, 10-year test unless protected.
  if (!(ten || (three && i.appliedBefore2026))) {
    return { ...base, payable: false, cls: null, weekly: 0, cost: 0, reason: 'From 2026–27 you need 10 years in a row living in the UK or 10 years of qualifying contributions (or to have applied before 6 April 2026 and apply for 2026–27 by 5 April 2027).' };
  }
  const weekly = weeklyRate(3, y);
  return { ...base, payable: true, cls: 3, weekly, cost: r2(weekly * WEEKS), reason: ten ? 'Class 3 (Class 2 is no longer available for time abroad).' : 'Class 3 under the transitional rule: apply for 2026–27 by 5 April 2027.' };
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
  return { years, totalCost, yearsBought: payable.length, pensionBefore, pensionAfter, gainWeekly, gainYearly, paybackYears: gainYearly > 0 ? Math.round((totalCost / gainYearly) * 10) / 10 : null, note };
}
