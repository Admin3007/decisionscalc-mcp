import { describe, it, expect } from 'vitest';
import { computeSmp } from './uk-smp';

describe('UK Statutory Maternity Pay (GOV.UK, read 8 Nov 2026)', () => {
  it('£600 a week, 39 weeks: 6 × £540 then 33 × £194.32 = £9,652.56', () => {
    const r = computeSmp({ weeklyPay: 600, leaveWeeks: 39 });
    expect(r.weeks[0].smp).toBe(540);
    expect(r.weeks[6].smp).toBe(194.32);
    expect(r.smpTotal).toBe(9652.56);
    expect(r.gap).toBe(600 * 39 - 9652.56);
  });
  it('low earnings: 90% is lower than £194.32, so 90% for all 39 weeks', () => {
    expect(computeSmp({ weeklyPay: 200, leaveWeeks: 39 }).smpTotal).toBe(39 * 180);
  });
  it('weeks 40 to 52 are unpaid', () => {
    const r = computeSmp({ weeklyPay: 600, leaveWeeks: 52 });
    expect(r.weeks[39].smp).toBe(0);
    expect(r.smpTotal).toBe(9652.56);
  });
  it('below £129 a week or without 26 weeks’ service: no SMP, Maternity Allowance pointer', () => {
    expect(computeSmp({ weeklyPay: 120, leaveWeeks: 39 }).smpTotal).toBe(0);
    expect(computeSmp({ weeklyPay: 120, leaveWeeks: 39 }).reason).toMatch(/Maternity Allowance/);
    expect(computeSmp({ weeklyPay: 600, leaveWeeks: 39, eligible: false }).smpTotal).toBe(0);
  });
  it('employer scheme: 26 weeks full pay then 13 weeks half pay plus SMP', () => {
    const r = computeSmp({ weeklyPay: 600, leaveWeeks: 39, employerFullWeeks: 26, employerHalfWeeks: 13 });
    expect(r.weeks[0].total).toBe(600);
    expect(r.weeks[25].total).toBe(600);
    expect(r.weeks[26].total).toBe(Math.round((300 + 194.32) * 100) / 100);
    expect(r.paidTotal).toBe(26 * 600 + 13 * 494.32);
  });
});
