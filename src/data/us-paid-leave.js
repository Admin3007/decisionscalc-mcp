/**
 * US state paid family and medical leave, read on each state's own site on 3 November 2026
 * (sources: RULES.us.sources in scripts/gen-leave-planner.mjs).
 * Shared by the paid workbook (scripts/gen-leave-planner.mjs) and the free calculator
 * (src/lib/calc/parental-leave-gap.ts), so both always use the same figures.
 *
 * Weekly benefit on normal weekly pay w: r1 × min(w, t1) + r2 × (min(w, t2) − t1, if positive)
 * + r3 × (w − t2, if positive), capped at max. California's flat middle band is r2 = 0 (EDD table:
 * 90%, then $1,127, then 70% of w). wait1/wait2 = unpaid waiting weeks (birth parent / other parent);
 * rec = paid pregnancy and recovery weeks for the birth parent after the waiting week (typical
 * uncomplicated birth); bond = paid bonding weeks for each parent; cap = most paid weeks for the birth
 * parent (recovery + bonding). recPct/recMax: a separate recovery rate (New York disability benefits:
 * 50% up to $170); 0 = same formula. NONE = no threshold.
 */
export const NONE = 999999;

export const US_STATES = [
  { code: 'CA', name: 'California (SDI + PFL)', r1: 0.9, t1: 1252.3, r2: 0, t2: 1610.1, r3: 0.7, max: 1765, recPct: 0, recMax: 0, wait1: 1, wait2: 0, rec: 9, bond: 8, cap: 17,
    note: 'EDD: 90% of weekly wages, then a flat $1,127, then 70% up to $1,765 (2026). Pregnancy disability usually 4 weeks before and 6 after (8 for a C-section), first 7 days unpaid; then 8 weeks of Paid Family Leave.' },
  { code: 'CO', name: 'Colorado (FAMLI)', r1: 0.9, t1: 804.46, r2: 0.5, t2: NONE, r3: 0, max: 1448.02, recPct: 0, recMax: 0, wait1: 0, wait2: 0, rec: 6, bond: 12, cap: 12,
    note: '90% up to 50% of the state average weekly wage ($804.46), 50% above, up to $1,448.02 (from 1 July 2026). 12 weeks, plus 4 for pregnancy complications.' },
  { code: 'CT', name: 'Connecticut (CT Paid Leave)', r1: 0.95, t1: 677.6, r2: 0.6, t2: NONE, r3: 0, max: 1016.4, recPct: 0, recMax: 0, wait1: 0, wait2: 0, rec: 6, bond: 12, cap: 14,
    note: '95% up to 40 × the CT minimum wage ($677.60), 60% above, up to 60 × ($1,016.40, 2026). 12 weeks, plus 2 for incapacity during pregnancy.' },
  { code: 'DC', name: 'District of Columbia', r1: 0.9, t1: 1104, r2: 0.5, t2: NONE, r3: 0, max: 1100, recPct: 0, recMax: 0, wait1: 0, wait2: 0, rec: 2, bond: 12, cap: 14,
    note: '90% up to 1.5 × the DC minimum wage × 40 ($1,104 at $18.40), 50% above, up to $1,100 (from 1 October 2026). 12 weeks parental plus 2 prenatal.' },
  { code: 'DE', name: 'Delaware Paid Leave', r1: 0.8, t1: NONE, r2: 0, t2: NONE, r3: 0, max: 900, recPct: 0, recMax: 0, wait1: 0, wait2: 0, rec: 6, bond: 12, cap: 12,
    note: '80% of wages up to $900 a week (benefits from 1 January 2026). 12 weeks of parental leave; 12 weeks in total in 12 months.' },
  { code: 'MA', name: 'Massachusetts PFML', r1: 0.8, t1: 1003.6, r2: 0.5, t2: NONE, r3: 0, max: 1284.61, recPct: 0, recMax: 0, wait1: 1, wait2: 1, rec: 5, bond: 12, cap: 25,
    note: '80% up to 50% of the state average weekly wage, 50% above. 2027 benefit years: SAWW $2,007.20, maximum $1,284.61 (2026: $1,922.48 / $1,230.39). 7-day unpaid waiting period; none again when bonding follows medical leave straight away. 26 weeks combined.' },
  { code: 'ME', name: 'Maine PFML', r1: 0.9, t1: 624.56, r2: 0.66, t2: NONE, r3: 0, max: 1249.12, recPct: 0, recMax: 0, wait1: 1, wait2: 0, rec: 5, bond: 12, cap: 11,
    note: '90% up to 50% of the state average weekly wage, 66% above, up to the SAWW: $1,249.12 from 1 July 2026 (maine.gov benefits chart uses $1,250 rounded). 12 weeks in a benefit year; 7-day waiting period for medical leave only. Benefits from 1 May 2026.' },
  { code: 'MN', name: 'Minnesota Paid Leave', r1: 0.9, t1: 737.55, r2: 0.66, t2: 1475.09, r3: 0.55, max: 1475.09, recPct: 0, recMax: 0, wait1: 0, wait2: 0, rec: 6, bond: 12, cap: 20,
    note: '90% up to $737.55, 66% up to $1,475.09, 55% above, up to $1,475.09 (applications from 25 October 2026). Pregnancy medical leave up to 12 weeks + bonding 12, 20 combined. No unpaid waiting week.' },
  { code: 'NJ', name: 'New Jersey (TDI + FLI)', r1: 0.85, t1: NONE, r2: 0, t2: NONE, r3: 0, max: 1119, recPct: 0, recMax: 0, wait1: 0, wait2: 0, rec: 10, bond: 12, cap: 22,
    note: '85% of average weekly wage up to $1,119 (2026; $1,158 proposed for 2027). Disability usually 4 weeks before and 6 after the birth (8 for a C-section), then 12 weeks of Family Leave Insurance.' },
  { code: 'NY', name: 'New York (DBL + PFL)', r1: 0.67, t1: NONE, r2: 0, t2: NONE, r3: 0, max: 1228.53, recPct: 0.5, recMax: 170, wait1: 1, wait2: 0, rec: 9, bond: 12, cap: 25,
    note: 'Paid Family Leave: 67% of average weekly wage up to $1,228.53 (2026), 12 weeks. Disability benefits for the birth: 50% up to $170 a week, usually 4 weeks before and 6 after (8 for a C-section), first 7 days unpaid. 26 weeks combined.' },
  { code: 'OR', name: 'Oregon (Paid Leave Oregon)', r1: 1, t1: 916.58, r2: 0.5, t2: NONE, r3: 0, max: 1692.16, recPct: 0, recMax: 0, wait1: 0, wait2: 0, rec: 6, bond: 12, cap: 14,
    note: '100% up to 65% of the state average weekly wage ($916.58), 50% above, up to $1,692.16 (claims from 28 June 2026). 12 weeks, plus 2 for pregnancy.' },
  { code: 'RI', name: 'Rhode Island (TDI + TCI)', r1: 0.6006, t1: NONE, r2: 0, t2: NONE, r3: 0, max: 1150, recPct: 0, recMax: 0, wait1: 0, wait2: 0, rec: 6, bond: 8, cap: 14,
    note: '4.62% of your highest quarter (about 60% of weekly pay) up to $1,150 (from 1 July 2026). Disability for the birth as your doctor certifies, then 8 weeks of Temporary Caregiver Insurance (2026). No waiting week.' },
  { code: 'WA', name: 'Washington PFML', r1: 0.9, t1: 959.5, r2: 0.5, t2: NONE, r3: 0, max: 1727, recPct: 0, recMax: 0, wait1: 0, wait2: 0, rec: 6, bond: 12, cap: 16,
    note: '90% up to 50% of the state average weekly wage, 50% above. Claims from 1 January 2027: maximum $1,727 (SAWW $1,919); 2026: $1,647. No waiting week for birth or bonding. 16 weeks combined (18 with complications).' },
  { code: 'XX', name: 'No state program (FMLA only)', r1: 0, t1: NONE, r2: 0, t2: NONE, r3: 0, max: 0, recPct: 0, recMax: 0, wait1: 0, wait2: 0, rec: 0, bond: 0, cap: 0,
    note: 'Federal FMLA gives 12 weeks of job-protected leave but no pay. Enter employer paid leave or short-term disability as an employer top-up.' },
];

/** Weekly state benefit (bonding formula) for normal weekly pay w. */
export function usWeeklyBenefit(s, w) {
  const v = s.r1 * Math.min(w, s.t1) + s.r2 * Math.max(0, Math.min(w, s.t2) - s.t1) + s.r3 * Math.max(0, w - s.t2);
  return Math.min(s.max, v);
}

/** Weekly benefit during pregnancy and recovery weeks. */
export function usRecoveryBenefit(s, w) {
  return s.recPct > 0 ? Math.min(s.recPct * w, s.recMax) : usWeeklyBenefit(s, w);
}

/**
 * One parent's state leave pay: weekly benefit, paid weeks (after any waiting week, recovery first for the
 * birth parent, then bonding, up to the state's limit) and the total over `weeksOff` weeks of leave.
 */
export function usLeaveFor(code, salary, { birthParent = true, weeksOff = 52 } = {}) {
  const s = US_STATES.find((x) => x.code === code) || US_STATES.find((x) => x.code === 'XX');
  const w = Math.max(0, salary) / 52;
  const weekly = usWeeklyBenefit(s, w);
  const recWeekly = usRecoveryBenefit(s, w);
  const wait = birthParent ? s.wait1 : s.wait2;
  const rec = birthParent ? s.rec : 0;
  const entitled = birthParent ? Math.min(s.rec + s.bond, s.cap) : s.bond;
  const paidWeeks = Math.max(0, Math.min(Math.max(0, weeksOff - wait), entitled));
  const recPaid = Math.min(rec, paidWeeks);
  const total = recPaid * recWeekly + (paidWeeks - recPaid) * weekly;
  return { state: s, weeklyPay: w, weekly, recWeekly, wait, recWeeks: recPaid, bondWeeks: paidWeeks - recPaid, paidWeeks, total, normal: w * weeksOff, gap: w * weeksOff - total, replacement: w > 0 ? weekly / w : 0 };
}
