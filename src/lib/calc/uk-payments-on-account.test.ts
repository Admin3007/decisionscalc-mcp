import { describe, it, expect } from 'vitest';
import { paymentsOnAccount } from './uk-payments-on-account';

describe('UK payments on account (gov.uk rules and worked example)', () => {
  it('gov.uk example: £3,000 bill for 2023-24, £900 + £900 paid -> £1,200 + £1,500 = £2,700 by 31 Jan 2025, £1,500 by 31 Jul 2025', () => {
    const r = paymentsOnAccount({ year: 2023, saBill: 3000, atSource: 0, cgt: 0, studentLoan: 0, paidOnAccount: 1800 });
    expect(r.balancing).toBe(1200);
    expect(r.poaEach).toBe(1500);
    expect(r.january).toEqual({ date: '2025-01-31', amount: 2700 });
    expect(r.july).toEqual({ date: '2025-07-31', amount: 1500 });
    expect(r.taxYear).toBe('2023-24');
  });
  it('no payments on account under £1,000, or when more than 80% was taken at source', () => {
    expect(paymentsOnAccount({ year: 2025, saBill: 999, atSource: 0, cgt: 0, studentLoan: 0, paidOnAccount: 0 }).reason).toBe('under-threshold');
    const m = paymentsOnAccount({ year: 2025, saBill: 2000, atSource: 9000, cgt: 0, studentLoan: 0, paidOnAccount: 0 });
    expect(m.reason).toBe('mostly-at-source');
    expect(m.poaEach).toBe(0);
    expect(m.january.amount).toBe(2000);
  });
  it('capital gains tax and student loan go in the balancing payment only', () => {
    const r = paymentsOnAccount({ year: 2025, saBill: 4000, atSource: 0, cgt: 1500, studentLoan: 600, paidOnAccount: 0 });
    expect(r.poaEach).toBe(2000);
    expect(r.balancing).toBe(6100);
    expect(r.january.amount).toBe(8100);
    expect(r.january.date).toBe('2027-01-31');
  });
  it('overpaid on account: nothing to pay as a balance; bad input is safe', () => {
    expect(paymentsOnAccount({ year: 2025, saBill: 2000, atSource: 0, cgt: 0, studentLoan: 0, paidOnAccount: 3000 }).balancing).toBe(0);
    expect(Number.isFinite(paymentsOnAccount({ year: NaN, saBill: NaN, atSource: -1, cgt: 0, studentLoan: 0, paidOnAccount: 0 }).totalNext12Months)).toBe(true);
  });
});
