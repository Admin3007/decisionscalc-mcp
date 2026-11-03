/**
 * Québec Parental Insurance Plan (QPIP / RQAP) — pure calculation logic.
 * Pure + tested (CONTRACTS §4). Used by /tools/quebec-qpip-calculator.
 *
 * Figures read on Québec.ca on 3 November 2026:
 *  - Maximum insurable earnings $103,000 in 2026 ($98,000 in 2025).
 *  - Minimum $2,000 of insurable earnings to qualify.
 *  - Birth, basic plan: maternity 18 wk at 70%, paternity 5 wk at 70%,
 *    shareable 32 wk (first 7 at 70%, next 25 at 55%), extra 4 wk at 55%.
 *  - Birth, special plan: maternity 15 wk, paternity 3 wk, shareable 25 wk,
 *    extra 3 wk, all at 75%.
 *  - Adoption: exclusive 5 wk at 70% (basic) / 3 wk at 75% (special) per
 *    parent, then shareable "welcome and support" 13 wk at 70% / 12 wk at 75%
 *    and adoption 32 wk (7 at 70%, 25 at 55%) / 25 wk at 75%, plus the extras.
 *  - Single parent and multiple births/adoptions: 5 wk at 70% / 3 wk at 75%
 *    added to each exclusive entitlement.
 *  - The extra shareable weeks need each parent to have received at least
 *    8 (basic) or 6 (special) shareable weeks.
 * Benefit = rate × average weekly insurable earnings (capped at the MIE).
 * Real QPIP uses the last 26 weeks of the qualifying period; this assumes
 * steady pay (stated on the page). The low-income increase is not modelled.
 */
import { EI_2026, eiWeekly } from './ca-ei-benefit';

export type QpipPlan = 'basic' | 'special';
export type QpipEvent = 'birth' | 'adoption';

interface Segment { weeks: number; rate: number }

export const QPIP_2026 = {
  mie: 103000,
  minEarnings: 2000,
  basic: {
    maternity: { weeks: 18, rate: 0.7 },
    paternity: { weeks: 5, rate: 0.7 },
    adoptionExclusive: { weeks: 5, rate: 0.7 },
    singleOrMultiple: { weeks: 5, rate: 0.7 },
    // Shareable weeks in the order they are paid.
    birthShared: [{ weeks: 7, rate: 0.7 }, { weeks: 25, rate: 0.55 }] as Segment[],
    adoptionShared: [{ weeks: 13, rate: 0.7 }, { weeks: 7, rate: 0.7 }, { weeks: 25, rate: 0.55 }] as Segment[],
    extra: { weeks: 4, rate: 0.55 },
    extraMinEach: 8,
  },
  special: {
    maternity: { weeks: 15, rate: 0.75 },
    paternity: { weeks: 3, rate: 0.75 },
    adoptionExclusive: { weeks: 3, rate: 0.75 },
    singleOrMultiple: { weeks: 3, rate: 0.75 },
    birthShared: [{ weeks: 25, rate: 0.75 }] as Segment[],
    adoptionShared: [{ weeks: 12, rate: 0.75 }, { weeks: 25, rate: 0.75 }] as Segment[],
    extra: { weeks: 3, rate: 0.75 },
    extraMinEach: 6,
  },
} as const;

export interface QpipInput {
  plan: QpipPlan;
  event: QpipEvent;
  /** Gross annual insurable earnings of parent 1 (the birth parent for a birth), CAD. */
  salary1: number;
  /** Gross annual insurable earnings of parent 2, CAD. Ignored for a single parent. */
  salary2: number;
  singleParent?: boolean;
  /** Twins, triplets, or more than one child adopted at once. */
  multiple?: boolean;
  /** Shareable weeks parent 1 takes; parent 2 takes the rest. */
  sharedWeeks1: number;
  /** Which parent takes their shareable weeks first (the 70% weeks go first). */
  firstParent?: 1 | 2;
  /** Take the extra shareable weeks when eligible. */
  takeExtra?: boolean;
  /** Extra weeks parent 1 takes; parent 2 takes the rest. */
  extraWeeks1?: number;
}

export interface QpipLine {
  parent: 1 | 2;
  label: string;
  weeks: number;
  rate: number;
  weekly: number;
  total: number;
}

export interface QpipParent {
  eligible: boolean;
  weeklyEarnings: number;
  weeks: number;
  total: number;
}

export interface EiOption { weeks1: number; weeks2: number; total1: number; total2: number; total: number }

export interface QpipResult {
  lines: QpipLine[];
  parents: [QpipParent, QpipParent];
  sharedTotal: number;
  sharedWeeks: [number, number];
  extraAvailable: boolean;
  extraWeeks: number;
  totalWeeks: number;
  total: number;
  ei: { standard: EiOption; extended: EiOption };
}

const cents = (v: number) => Math.round(v * 100) / 100;
const money = (v: unknown) => Math.max(0, Number(v) || 0);

/** Weekly QPIP benefit for a rate, from annual insurable earnings capped at the MIE. */
export function qpipWeekly(annual: number, rate: number): number {
  return cents((Math.min(money(annual), QPIP_2026.mie) / 52) * rate);
}

/** Splits `take` weeks off the front of a segment list; returns [taken, rest]. */
function cut(segs: Segment[], take: number): [Segment[], Segment[]] {
  const a: Segment[] = [], b: Segment[] = [];
  let left = take;
  for (const s of segs) {
    const n = Math.min(left, s.weeks);
    if (n > 0) a.push({ weeks: n, rate: s.rate });
    if (s.weeks - n > 0) b.push({ weeks: s.weeks - n, rate: s.rate });
    left -= n;
  }
  return [a, b];
}

export function computeQpip(input: QpipInput): QpipResult {
  const p = QPIP_2026[input.plan === 'special' ? 'special' : 'basic'];
  const birth = input.event !== 'adoption';
  const single = !!input.singleParent;
  const salary: [number, number] = [money(input.salary1), single ? 0 : money(input.salary2)];
  const eligible: [boolean, boolean] = [salary[0] >= QPIP_2026.minEarnings, !single && salary[1] >= QPIP_2026.minEarnings];

  const lines: QpipLine[] = [];
  const add = (parent: 1 | 2, label: string, weeks: number, rate: number) => {
    if (weeks <= 0 || !eligible[parent - 1]) return;
    const weekly = qpipWeekly(salary[parent - 1], rate);
    lines.push({ parent, label, weeks, rate, weekly, total: cents(weekly * weeks) });
  };

  // Exclusive weeks.
  if (birth) {
    add(1, 'Maternity', p.maternity.weeks, p.maternity.rate);
    add(2, 'Paternity', p.paternity.weeks, p.paternity.rate);
  } else {
    add(1, 'Adoption (exclusive)', p.adoptionExclusive.weeks, p.adoptionExclusive.rate);
    add(2, 'Adoption (exclusive)', p.adoptionExclusive.weeks, p.adoptionExclusive.rate);
  }
  const bonus = p.singleOrMultiple;
  if (single) add(1, 'Single parent', bonus.weeks, bonus.rate);
  if (input.multiple) {
    add(1, birth ? 'Multiple birth' : 'Multiple adoption', bonus.weeks, bonus.rate);
    add(2, birth ? 'Multiple birth' : 'Multiple adoption', bonus.weeks, bonus.rate);
  }

  // Shareable weeks: whoever goes first gets the front of the queue (the 70% weeks).
  const pool = birth ? p.birthShared : p.adoptionShared;
  const sharedTotal = pool.reduce((s, x) => s + x.weeks, 0);
  const canShare = eligible;
  let w1 = Math.max(0, Math.min(sharedTotal, Math.round(Number(input.sharedWeeks1) || 0)));
  if (!canShare[1]) w1 = canShare[0] ? sharedTotal : 0;
  if (!canShare[0]) w1 = 0;
  const w2 = canShare[1] ? sharedTotal - w1 : 0;
  const first: 1 | 2 = input.firstParent === 2 ? 2 : 1;
  const [frontSegs, backSegs] = cut(pool, first === 1 ? w1 : w2);
  const label = birth ? 'Parental (shared)' : 'Shared';
  const sharedLines = (parent: 1 | 2, segs: Segment[]) => {
    // Merge equal-rate pieces so the table shows one row per rate.
    const byRate = new Map<number, number>();
    for (const s of segs) byRate.set(s.rate, (byRate.get(s.rate) ?? 0) + s.weeks);
    for (const [rate, weeks] of byRate) add(parent, label, weeks, rate);
  };
  sharedLines(first, frontSegs);
  sharedLines(first === 1 ? 2 : 1, backSegs);

  // Extra shareable weeks: both parents must each take the minimum.
  const extraAvailable = canShare[0] && canShare[1] && w1 >= p.extraMinEach && w2 >= p.extraMinEach;
  let extraWeeks = 0;
  if (extraAvailable && input.takeExtra) {
    const e1 = Math.max(0, Math.min(p.extra.weeks, Math.round(Number(input.extraWeeks1 ?? 0) || 0)));
    add(1, 'Extra shared', e1, p.extra.rate);
    add(2, 'Extra shared', p.extra.weeks - e1, p.extra.rate);
    extraWeeks = p.extra.weeks;
  }

  const parent = (n: 1 | 2): QpipParent => {
    const mine = lines.filter((l) => l.parent === n);
    return {
      eligible: eligible[n - 1],
      weeklyEarnings: cents(Math.min(salary[n - 1], QPIP_2026.mie) / 52),
      weeks: mine.reduce((s, l) => s + l.weeks, 0),
      total: cents(mine.reduce((s, l) => s + l.total, 0)),
    };
  };
  const parents: [QpipParent, QpipParent] = [parent(1), parent(2)];

  // The same family on federal EI (outside Québec), sharing parental weeks
  // in the same proportion. EI pays no maternity for an adoption.
  // EI's own entry rule (600 hours) is not modelled: the same parents are assumed eligible.
  const eiOption = (rate: number, cap: number, both: number, perParent: number): EiOption => {
    let a = 0, b = 0;
    if (eligible[0] && eligible[1]) {
      a = Math.min(perParent, Math.round((both * w1) / sharedTotal));
      b = Math.min(perParent, both - a);
      a = Math.min(perParent, both - b);
    } else if (eligible[0]) a = perParent;
    else if (eligible[1]) b = perParent;
    const wk = (s: number, r: number, c: number) => eiWeekly(Math.min(s, EI_2026.mie) / 52, r, c).amount;
    const mat = birth && eligible[0] ? EI_2026.maternityWeeks : 0;
    const total1 = wk(salary[0], 0.55, EI_2026.maxWeekly55) * mat + wk(salary[0], rate, cap) * a;
    const total2 = wk(salary[1], rate, cap) * b;
    return { weeks1: a + mat, weeks2: b, total1, total2, total: total1 + total2 };
  };
  const ei = {
    standard: eiOption(0.55, EI_2026.maxWeekly55, EI_2026.standardParentalMaxWeeks, EI_2026.standardParentalPerParent),
    extended: eiOption(0.33, EI_2026.maxWeekly33, EI_2026.extendedParentalMaxWeeks, EI_2026.extendedParentalPerParent),
  };

  return {
    lines,
    parents,
    sharedTotal,
    sharedWeeks: [w1, w2],
    extraAvailable,
    extraWeeks,
    totalWeeks: parents[0].weeks + parents[1].weeks,
    total: cents(parents[0].total + parents[1].total),
    ei,
  };
}
