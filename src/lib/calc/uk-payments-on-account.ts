/**
 * UK Self Assessment: the 31 January balancing payment and payments on account (gov.uk "Understanding your Self Assessment
 * tax bill: payments on account", read 10 Nov 2026):
 *  - each payment on account is usually half of the previous year's Self Assessment bill (income tax plus Class 4 NI), due
 *    by 31 January (in the tax year) and 31 July (after it);
 *  - none are due if last year's bill was under £1,000, or more than 80% of the tax owed was paid outside Self Assessment
 *    (PAYE, tax taken off savings);
 *  - capital gains tax and student loan repayments are not part of payments on account: they go in the balancing payment;
 *  - balancing payment = total tax owed for the year less the payments on account made for it, due 31 January after the year;
 *  - payments on account can be reduced (online, or form SA303); interest is charged if the final bill turns out higher.
 * Reproduces the gov.uk worked example (£3,000 bill, £900 + £900 paid: £1,200 balancing + £1,500 first payment = £2,700 by
 * 31 January, £1,500 by 31 July). Not modelled: Class 2 NI, interest and penalties, overpayment refunds timing.
 */
export const POA = { threshold: 1000, atSourceShare: 0.8 } as const;
export const POA_SOURCES = {
  guide: 'https://www.gov.uk/understand-self-assessment-bill/payments-on-account',
} as const;

export interface PoaInput {
  /** Tax year that just ended, as its first calendar year (2025 = 2025-26). */
  year: number;
  /** Income tax + Class 4 NI owed through Self Assessment for that year (after tax taken at source). */
  saBill: number;
  /** Tax already taken at source for that year (PAYE, savings), for the 80% test. */
  atSource: number;
  /** Capital gains tax for that year. */
  cgt: number;
  /** Student loan repayment collected through Self Assessment for that year. */
  studentLoan: number;
  /** Payments on account already made towards that year (both instalments). */
  paidOnAccount: number;
}

export interface PoaResult {
  taxYear: string;
  nextTaxYear: string;
  poaDue: boolean;
  reason: 'under-threshold' | 'mostly-at-source' | 'due';
  balancing: number;
  poaEach: number;
  january: { date: string; amount: number };
  july: { date: string; amount: number };
  totalNext12Months: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (x: number) => Math.round(x * 100) / 100;
const ty = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;

export function paymentsOnAccount(i: PoaInput): PoaResult {
  const year = Math.round(Number(i.year)) || 2025;
  const sa = n(i.saBill), atSource = n(i.atSource), cgt = n(i.cgt), sl = n(i.studentLoan), paid = n(i.paidOnAccount);
  const totalTax = sa + atSource;
  const under = sa < POA.threshold;
  const mostly = totalTax > 0 && atSource / totalTax > POA.atSourceShare;
  const poaDue = !under && !mostly;
  const poaEach = poaDue ? r2(sa / 2) : 0;
  // A negative balance (overpaid on account) is a refund, shown as 0 due here.
  const balancing = r2(Math.max(0, sa + cgt + sl - paid));
  return {
    taxYear: ty(year), nextTaxYear: ty(year + 1),
    poaDue, reason: under ? 'under-threshold' : mostly ? 'mostly-at-source' : 'due',
    balancing, poaEach,
    january: { date: `${year + 2}-01-31`, amount: r2(balancing + poaEach) },
    july: { date: `${year + 2}-07-31`, amount: poaEach },
    totalNext12Months: r2(balancing + 2 * poaEach),
  };
}
