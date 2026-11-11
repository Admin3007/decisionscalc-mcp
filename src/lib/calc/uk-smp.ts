/**
 * UK Statutory Maternity Pay, week by week, with an optional employer scheme on top (overhaul C8). Pure + tested.
 * GOV.UK "Maternity pay and leave" (read 8 Nov 2026): 90% of average weekly earnings (before tax) for the first
 * 6 weeks, then £194.32 or 90% of average weekly earnings, whichever is lower, for the next 33 weeks; up to 52 weeks
 * of leave, so weeks 40-52 are unpaid unless the employer pays. Eligibility: average earnings of at least £129 a
 * week and 26 weeks' continuous employment into the qualifying week (15th week before the due week). SMP is taxed
 * like wages: figures here are before tax and National Insurance.
 */
export const SMP_FLAT = 194.32;
export const SMP_LEL = 129;
export const SMP_HIGH_WEEKS = 6;
export const SMP_FLAT_WEEKS = 33;
export const MAX_LEAVE_WEEKS = 52;

export interface SmpInput {
  weeklyPay: number;            // average weekly earnings before tax
  leaveWeeks: number;           // weeks of maternity leave taken (1-52)
  eligible?: boolean;           // 26 weeks' service into the qualifying week (default true)
  employerFullWeeks?: number;   // weeks the employer pays full pay (SMP counts towards it)
  employerHalfWeeks?: number;   // weeks after that at half pay plus SMP (a common scheme shape)
}
export interface SmpWeek { week: number; smp: number; employer: number; total: number; }
export interface SmpResult {
  eligible: boolean;
  reason?: string;
  weeks: SmpWeek[];
  smpTotal: number;
  employerTotal: number;
  paidTotal: number;
  normalPay: number;            // what the same weeks would have paid at work
  gap: number;                  // normalPay - paidTotal (before tax)
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeSmp(i: SmpInput): SmpResult {
  const pay = Math.max(0, i.weeklyPay || 0);
  const leave = Math.min(MAX_LEAVE_WEEKS, Math.max(0, Math.round(i.leaveWeeks || 0)));
  let reason: string | undefined;
  let eligible = i.eligible !== false;
  if (!eligible) reason = 'You need 26 weeks’ continuous employment into the qualifying week for SMP. You may get Maternity Allowance instead.';
  else if (pay < SMP_LEL) { eligible = false; reason = `SMP needs average earnings of at least £${SMP_LEL} a week. You may get Maternity Allowance instead.`; }
  const full = Math.max(0, i.employerFullWeeks || 0);
  const half = Math.max(0, i.employerHalfWeeks || 0);
  const weeks: SmpWeek[] = [];
  for (let w = 1; w <= leave; w++) {
    const smp = !eligible ? 0 : w <= SMP_HIGH_WEEKS ? 0.9 * pay : w <= SMP_HIGH_WEEKS + SMP_FLAT_WEEKS ? Math.min(SMP_FLAT, 0.9 * pay) : 0;
    // Employer schemes normally include SMP: full pay means the employer tops SMP up to normal pay; half pay means
    // half pay plus SMP, capped at normal pay.
    let employer = 0;
    if (w <= full) employer = Math.max(0, pay - smp);
    else if (w <= full + half) employer = Math.max(0, Math.min(pay, 0.5 * pay + smp) - smp);
    weeks.push({ week: w, smp: r2(smp), employer: r2(employer), total: r2(smp + employer) });
  }
  const smpTotal = r2(weeks.reduce((a, x) => a + x.smp, 0));
  const employerTotal = r2(weeks.reduce((a, x) => a + x.employer, 0));
  const paidTotal = r2(smpTotal + employerTotal);
  const normalPay = r2(pay * leave);
  return { eligible, reason, weeks, smpTotal, employerTotal, paidTotal, normalPay, gap: r2(normalPay - paidTotal) };
}
