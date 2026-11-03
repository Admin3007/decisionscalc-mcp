/**
 * Ireland: Working Family Payment (WFP) estimate.
 * Official rules (citizensinformation.ie "Working Family Payment", read 2026-11-03):
 *  - income limits from January 2026 (weekly family income): 1 child €765, 2 €866, 3 €967, 4 €1,058,
 *    5 €1,184, 6 €1,300, 7 €1,436, 8+ €1,532; Budget 2027: every limit +€30 a week from January 2027;
 *  - WFP = 60% of (limit − assessable weekly income); minimum €20 a week; tax-free; paid for 52 weeks;
 *  - assessable earnings = gross pay − income tax − employee PRSI − USC − pension contributions
 *    (incl. MyFutureFund); Child Benefit and child maintenance are not counted; 38 hours a fortnight
 *    (a couple may combine hours); employees only.
 * Net pay is estimated with the tested Budget 2027 tax module (ie-budget-2027.ts); the Department uses
 * your actual payslips, so treat this as an estimate.
 */
import { computeYear, type Year } from './ie-budget-2027';

export const WFP_LIMITS_2026 = [765, 866, 967, 1058, 1184, 1300, 1436, 1532] as const;
export const WFP_2027_INCREASE = 30;
export const WFP_RATE = 0.6;
export const WFP_MIN = 20;
export const MIN_HOURS_FORTNIGHT = 38;

export const limitFor = (children: number, year: Year) => {
  const k = Math.max(1, Math.min(8, Math.floor(children))) - 1;
  return WFP_LIMITS_2026[k] + (year === 2027 ? WFP_2027_INCREASE : 0);
};

export interface WfpInput {
  year: Year;
  children: number;
  couple: boolean;
  pay1: number;          // gross pay a year, you
  pay2?: number;         // gross pay a year, partner
  pension?: number;      // pension contributions a year (both), incl. MyFutureFund
  otherWeekly?: number;  // other assessable income a week (e.g. carer's payment); not Child Benefit/maintenance
  hoursFortnight: number;
}

export interface WfpResult {
  eligibleHours: boolean;
  limit: number;
  assessableWeekly: number;
  weekly: number;   // 0 if not entitled
  yearly: number;
  netPayWeekly: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

export function computeWfp(i: WfpInput): WfpResult {
  const year: Year = i.year === 2027 ? 2027 : 2026;
  const children = Math.max(1, Math.floor(n(i.children) || 1));
  const pay2 = i.couple ? n(i.pay2) : 0;
  const tax = computeYear(i.couple
    ? { status: pay2 > 0 ? 'married-two' : 'married-one', pay1: n(i.pay1), pay2 }
    : { status: 'single-parent', pay1: n(i.pay1) }, year);
  const netPayWeekly = tax.takeHome / 52;
  const assessableWeekly = Math.max(0, netPayWeekly - n(i.pension) / 52 + n(i.otherWeekly));
  const limit = limitFor(children, year);
  const eligibleHours = n(i.hoursFortnight) >= MIN_HOURS_FORTNIGHT;
  let weekly = 0;
  if (eligibleHours && assessableWeekly < limit) weekly = Math.max(WFP_MIN, WFP_RATE * (limit - assessableWeekly));
  return { eligibleHours, limit, assessableWeekly: r2(assessableWeekly), weekly: r2(weekly), yearly: r2(weekly * 52), netPayWeekly: r2(netPayWeekly) };
}
