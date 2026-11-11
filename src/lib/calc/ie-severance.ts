/**
 * Irish severance / redundancy lump sum: how much is tax-free and the tax on the rest. Pure calculation logic.
 * Rules read on 2026-11-06 in Revenue Tax and Duty Manual Part 05-05-19 "Taxation Treatment of Termination Payments"
 * (document updated March 2026) and revenue.ie "Lump sum payments" pages:
 *  - Statutory redundancy (section 203 TCA): exempt from income tax, USC and PRSI; 2 weeks' pay per year of service plus
 *    one week, weekly pay capped at €600; needs 104 weeks' continuous service; no effect on the exemptions below.
 *  - Basic exemption (section 201(1)(a)): €10,160 + €765 per COMPLETE year of service (no apportionment).
 *  - Increased exemption (Schedule 3 para 8): + €10,000 less the relevant capital sum (RCS), only if no amount above the
 *    basic exemption was received in the previous ten years, and you are not in an occupational pension scheme or have
 *    irrevocably given up the tax-free lump sum.
 *  - SCSB (Schedule 3 para 6): A × B / 15 − C, A = average annual taxable pay over the last 36 months, B = complete years,
 *    C = RCS (tax-free pension lump sum received, plus the present value of one receivable later, capped at €200,000
 *    by section 790AA).
 *  - The exemption is the higher of basic (+ increase) and SCSB, then capped at €200,000 for life less exemptions already
 *    granted on earlier termination payments (section 201(8)); retraining and death/injury payments sit outside the cap.
 *  - The excess is taxed as pay at the time of payment: income tax and USC, not PRSI. A payment due under the contract
 *    (including contractual pay in lieu of notice) is taxable in full and gets none of these exemptions.
 * Manual worked examples reproduced in ie-severance.test.ts (Jim, Anna, Mary, Tony, Martin, Lorna, Tom, Martina, Alan,
 * Jenny, John).
 */
import { incomeTaxFor, type TaxStatus } from './ie-income-tax';
import { uscFor, type Year } from './ie-budget-2027';

export const BASIC = 10160;
export const PER_YEAR = 765;
export const INCREASE = 10000;
export const CAP = 200000;
export const RCS_MAX = 200000;
export const STAT_WEEK_CAP = 600;

export interface SeveranceInput {
  /** Genuine redundancy with 104+ weeks' service: statutory redundancy is due. */
  redundancy: boolean;
  /** Complete years of service (breaks excluded). */
  years: number;
  /** Extra months beyond the complete years (count for statutory redundancy only). */
  months: number;
  /** Gross weekly pay now, EUR (statutory redundancy uses it, capped at €600). */
  weeklyPay: number;
  /** Average annual taxable pay over the last 36 months, EUR (SCSB "A"). */
  avgPay: number;
  /** Severance offered on top of statutory redundancy, EUR (non-contractual). */
  lumpSum: number;
  /** Value of the tax-free pension lump sum from this job (received, or present value of one due later), EUR. */
  pensionLumpSum: number;
  /** Sign the irrevocable waiver of that pension lump sum. */
  waive: boolean;
  /** Received more than the basic exemption on a termination payment in the last ten years. */
  claimedIn10Years: boolean;
  /** Exemptions already granted on earlier termination payments, EUR (counts against the €200,000 cap). */
  priorExempt: number;
  /** Tax on the taxable part. */
  year: Year;
  status: TaxStatus;
  /** Your other taxable pay in the same tax year, EUR. */
  payThisYear: number;
  /** Spouse's pay (married-two only), EUR. */
  spousePay: number;
}

export interface Exemption {
  rcs: number;
  basic: number;
  increase: number;
  scsb: number;
  method: 'basic' | 'increased' | 'scsb';
  /** Before the lifetime cap. */
  uncapped: number;
  capLeft: number;
  /** Tax-free amount available for this payment. */
  available: number;
}

export interface SeveranceResult {
  statutory: number;
  exemption: Exemption;
  taxFree: number;
  taxable: number;
  incomeTax: number;
  usc: number;
  takeHome: number;
  /** The same package if the pension lump sum is waived (only when there is one and it is not already waived). */
  ifWaived?: { taxFree: number; takeHome: number; extra: number };
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

export function statutoryRedundancy(years: number, months: number, weeklyPay: number): number {
  const service = n(years) + Math.min(11, n(months)) / 12;
  return r2((service * 2 + 1) * Math.min(STAT_WEEK_CAP, n(weeklyPay)));
}

export function exemptionFor(i: Pick<SeveranceInput, 'years' | 'avgPay' | 'pensionLumpSum' | 'waive' | 'claimedIn10Years' | 'priorExempt'>): Exemption {
  const years = Math.floor(n(i.years));
  const rcs = i.waive ? 0 : Math.min(RCS_MAX, n(i.pensionLumpSum));
  const basic = BASIC + PER_YEAR * years;
  const increase = i.claimedIn10Years ? 0 : Math.max(0, INCREASE - rcs);
  const scsb = Math.max(0, r2((n(i.avgPay) * years) / 15 - rcs));
  const basicTotal = basic + increase;
  const uncapped = Math.max(basicTotal, scsb);
  const method = scsb > basicTotal ? 'scsb' : increase > 0 ? 'increased' : 'basic';
  const capLeft = Math.max(0, CAP - n(i.priorExempt));
  return { rcs, basic, increase, scsb, method, uncapped, capLeft, available: Math.min(uncapped, capLeft) };
}

function taxOn(i: SeveranceInput, taxable: number) {
  const pay = n(i.payThisYear);
  const spouse = i.status === 'married-two' ? n(i.spousePay) : 0;
  const incomeTax = incomeTaxFor(i.year, i.status, pay + taxable, spouse, 0) - incomeTaxFor(i.year, i.status, pay, spouse, 0);
  const usc = uscFor(pay + taxable, i.year) - uscFor(pay, i.year);
  return { incomeTax: r2(incomeTax), usc: r2(usc) };
}

function run(i: SeveranceInput) {
  const statutory = i.redundancy ? statutoryRedundancy(i.years, i.months, i.weeklyPay) : 0;
  const lump = n(i.lumpSum);
  const exemption = exemptionFor(i);
  const taxFree = Math.min(lump, exemption.available);
  const taxable = r2(lump - taxFree);
  const { incomeTax, usc } = taxOn(i, taxable);
  return { statutory, exemption, taxFree: r2(taxFree), taxable, incomeTax, usc, takeHome: r2(statutory + lump - incomeTax - usc) };
}

export function computeSeverance(i: SeveranceInput): SeveranceResult {
  const r: SeveranceResult = run(i);
  if (!i.waive && n(i.pensionLumpSum) > 0) {
    const w = run({ ...i, waive: true });
    r.ifWaived = { taxFree: w.taxFree, takeHome: w.takeHome, extra: r2(w.takeHome - r.takeHome) };
  }
  return r;
}
