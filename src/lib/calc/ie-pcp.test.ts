import { describe, it, expect } from 'vitest';
import { computePcp, monthlyRateFromApr, paymentWithBalloon, balanceAfter, EXAMPLE, type PcpInput } from './ie-pcp';
import { DIRT } from './ie-money-homes';

const route = (r: ReturnType<typeof computePcp>, id: string) => r.routes.find((x) => x.id === id)!;

/** Independent month-by-month loop (not the engine's closed form): balance after each payment. */
function loop(principal: number, aprPct: number, pay: number, months: number) {
  const i = Math.pow(1 + aprPct / 100, 1 / 12) - 1;
  const out = [principal];
  let bal = principal, interest = 0;
  for (let m = 1; m <= months; m++) {
    const int = bal * i;
    interest += int;
    bal = bal + int - pay;
    out.push(bal);
  }
  return { balances: out, interest };
}

describe('APR convention (effective annual rate, Directive 2008/48/EC Annex I)', () => {
  it('monthly rate = (1 + APR)^(1/12) − 1, not APR / 12', () => {
    expect(monthlyRateFromApr(12)).toBeCloseTo(0.0094888, 6);      // hand: 1.12^(1/12) = 1.0094888
    expect(monthlyRateFromApr(12)).toBeLessThan(0.01);               // APR/12 would be 1%
    expect(monthlyRateFromApr(0)).toBe(0);
    // twelve months at the monthly rate compound back to exactly the APR
    expect((1 + monthlyRateFromApr(5.9)) ** 12 - 1).toBeCloseTo(0.059, 12);
  });

  it('a loan priced at the APR has present value equal to the amount borrowed at (1+APR)^-t, t in years', () => {
    const pay = paymentWithBalloon(28000, monthlyRateFromApr(8), 60);
    let pv = 0;
    for (let m = 1; m <= 60; m++) pv += pay * 1.08 ** (-m / 12);
    expect(pv).toBeCloseTo(28000, 6);
  });
});

describe('PCP payment with a balloon (GMFV)', () => {
  it('worked example: €28,000 financed at 5.9% APR over 36 months with a €15,000 GMFV = €465.82 a month', () => {
    // hand: i = 1.059^(1/12) − 1 = 0.0047885; 1.059^3 = 1.187648; 15,000 / 1.187648 = 12,630.0;
    // (28,000 − 12,630.0) × 0.0047885 / (1 − 1/1.187648 = 0.158000) = €465.82
    const r = computePcp(EXAMPLE);
    expect(r.pcp.monthly).toBe(465.82);
    expect(r.inputs.financed).toBe(28000);
  });

  it('an independent month-by-month loop leaves exactly the GMFV owed after the last payment', () => {
    const r = computePcp(EXAMPLE);
    const L = loop(28000, 5.9, paymentWithBalloon(28000, monthlyRateFromApr(5.9), 36, 15000), 36);
    expect(L.balances[36]).toBeCloseTo(15000, 6);
    r.pcp.balances.forEach((b, m) => expect(Math.abs(b - L.balances[m])).toBeLessThan(0.01));
    // interest in the loop + GMFV = cost of credit: 36 × 465.82 + 15,000 − 28,000 = €3,770
    expect(Math.round(L.interest)).toBe(r.pcp.costOfCredit);
  });

  it('total amount payable, cost of credit and the half-rule point', () => {
    const r = computePcp(EXAMPLE);
    expect(r.pcp.totalPayable).toBe(38770);       // 7,000 + 36 × 465.82 + 15,000 = 38,769.6
    expect(r.pcp.costOfCredit).toBe(3770);
    expect(r.pcp.halfPayable).toBe(19385);
    // 7,000 + 465.82 m ≥ 19,384.8 → m ≥ 26.59 → month 27
    expect(r.pcp.halfReachedMonth).toBe(27);
  });

  it('a big GMFV and no deposit: half is only reached with the final payment', () => {
    const r = computePcp({ ...EXAMPLE, deposit: 0, gmfv: 20000 });
    expect(r.pcp.halfReachedMonth).toBeNull();
  });

  it('0% APR: payment is simply (price − deposit − GMFV) / months, no cost of credit', () => {
    const r = computePcp({ ...EXAMPLE, pcpAprPct: 0 });
    expect(r.pcp.monthly).toBe(361.11);           // 13,000 / 36
    expect(r.pcp.costOfCredit).toBe(0);
  });
});

describe('car loan (standard amortisation)', () => {
  it('€28,000 at 8% APR over 60 months = €564.01; loop agrees on every balance and clears at month 60', () => {
    // hand: i = 1.08^(1/12) − 1 = 0.0064340; 1.08^5 = 1.469328; 28,000 × 0.006434 / (1 − 0.680583) = €564.01
    const r = computePcp(EXAMPLE);
    expect(r.loan.monthly).toBe(564.01);
    const L = loop(28000, 8, paymentWithBalloon(28000, monthlyRateFromApr(8), 60), 60);
    expect(Math.abs(L.balances[60])).toBeLessThan(1e-6);
    r.loan.balances.forEach((b, m) => expect(Math.abs(b - Math.max(0, L.balances[m]))).toBeLessThan(0.01));
    expect(r.loan.totalInterest).toBe(5840);      // 60 × 564.01 − 28,000 = 5,840.6 → engine 5,840 unrounded
    expect(Math.abs(L.interest - 5840.4)).toBeLessThan(1);
  });

  it('balance still owed at the end of the PCP term (month 36) matches the loop and the closed form', () => {
    const r = computePcp(EXAMPLE);
    const pay = paymentWithBalloon(28000, monthlyRateFromApr(8), 60);
    const L = loop(28000, 8, pay, 36);
    expect(r.loan.balanceAtPcpEnd).toBe(Math.round(L.balances[36]));
    expect(r.loan.balanceAtPcpEnd).toBe(12506);
    expect(balanceAfter(28000, monthlyRateFromApr(8), pay, 36)).toBeCloseTo(L.balances[36], 6);
    // interest to month 36 = payments made + balance owed − amount borrowed
    expect(route(r, 'loan').costOfCredit).toBe(Math.round(36 * pay + L.balances[36] - 28000));
  });

  it('a loan shorter than the PCP term is cleared inside it: nothing owed, payments only for its own term', () => {
    const r = computePcp({ ...EXAMPLE, loanTermMonths: 24 });
    const lo = route(r, 'loan');
    expect(r.loan.balanceAtPcpEnd).toBe(0);
    expect(lo.finalPayment).toBe(0);
    expect(lo.paidInTerm).toBe(Math.round(24 * r.loan.monthly));
  });
});

describe('cash: interest lost on savings after DIRT', () => {
  it('€35,000 at 2.5% AER for 36 months, less 33% DIRT = €1,782', () => {
    // hand: monthly 1.025^(1/12) − 1 = 0.0020598; × 0.67 = 0.0013801; 1.0013801^36 − 1 = 0.05092; × 35,000 = €1,782
    const r = computePcp(EXAMPLE);
    expect(DIRT).toBe(0.33);
    expect(r.cash.lostInterest).toBe(1782);
    expect(route(r, 'cash').netCost).toBe(35000 + 1782 - 15000);
  });

  it('a 0% savings rate means no opportunity cost anywhere', () => {
    const r = computePcp({ ...EXAMPLE, savingsRatePct: 0 });
    r.routes.forEach((x) => expect(x.lostInterest).toBe(0));
    expect(route(r, 'cash').netCost).toBe(20000);
  });
});

describe('comparison, equity, mileage and the verdict', () => {
  it('worked example ranking: cash €21,782, PCP €24,537 (keep = hand back when the car is worth the GMFV), loan €25,664', () => {
    const r = computePcp(EXAMPLE);
    expect(r.routes.map((x) => x.netCost)).toEqual([21782, 25664, 24537, 24537]);
    expect(r.ranked[0]).toBe('cash');
    expect(r.ranked[3]).toBe('loan');
    expect(r.verdict).toContain('paying cash costs least over 36 months');
    expect(r.verdict).toContain('€2,755 less');
    // own outright: PCP total payable €38,770; loan over the 36 months + balance owed €39,810
    expect(route(r, 'pcpKeep').totalPaid).toBe(38770);
    expect(route(r, 'loan').totalPaid).toBe(39810);
    // net cost = total paid + lost interest − car value, for each route
    r.routes.forEach((x) => expect(Math.abs(x.netCost - (x.totalPaid + x.lostInterest - x.carValue))).toBeLessThanOrEqual(1));
  });

  it('equity: a car worth €3,000 more than the GMFV makes paying it (or trading in) €3,000 better than handing back', () => {
    const r = computePcp({ ...EXAMPLE, endValue: 18000 });
    expect(r.pcp.equity).toBe(3000);
    expect(route(r, 'pcpHandBack').netCost - route(r, 'pcpKeep').netCost).toBe(3000);
    expect(route(r, 'pcpHandBack').owns).toContain('€3,000 of equity');
    expect(r.verdict).toContain('€3,000 more than the GMFV');
  });

  it('negative equity: a car worth less than the GMFV makes handing back the better PCP ending', () => {
    const r = computePcp({ ...EXAMPLE, endValue: 12000 });
    expect(r.pcp.equity).toBe(-3000);
    expect(route(r, 'pcpKeep').netCost - route(r, 'pcpHandBack').netCost).toBe(3000);
    expect(r.verdict).toContain('handing it back beats paying the GMFV');
  });

  it('excess mileage: 5,000 km a year over a 15,000 km allowance for 3 years at 10c/km = €1,500, charged on hand back only', () => {
    const r = computePcp({ ...EXAMPLE, expectedKm: 20000 });
    expect(r.pcp.excessKm).toBe(15000);
    expect(r.pcp.excessCharge).toBe(1500);
    expect(route(r, 'pcpHandBack').extraCharges).toBe(1500);
    expect(route(r, 'pcpKeep').extraCharges).toBe(0);
    expect(r.verdict).toContain('€1,500');
  });

  it('a 0% PCP against a 10% loan with no savings return: PCP ties with cash, loan last', () => {
    const r = computePcp({ ...EXAMPLE, pcpAprPct: 0, loanAprPct: 10, savingsRatePct: 0 });
    // PCP at 0% costs exactly the depreciation, the same as cash at 0% savings: a tie, loan last
    expect(route(r, 'pcpKeep').netCost).toBe(20000);
    expect(route(r, 'cash').netCost).toBe(20000);
    expect(r.ranked[3]).toBe('loan');
    expect(r.verdict).toContain('paying cash, the PCP with the GMFV paid at the end and the PCP with the car handed back cost the same');
    expect(r.verdict).toContain('less than the car loan');
  });

  it('bad input is tolerated: deposit above price, GMFV above the amount financed, blanks', () => {
    const bad = computePcp({ ...EXAMPLE, deposit: 50000 } as PcpInput);
    expect(bad.inputs.financed).toBe(0);
    expect(bad.pcp.monthly).toBe(0);
    const big = computePcp({ ...EXAMPLE, gmfv: 40000 });
    expect(big.inputs.gmfv).toBe(28000);
    const blank = computePcp({ ...EXAMPLE, price: '' as unknown as number });
    expect(blank.verdict).toContain('Enter the price');
    expect(Number.isFinite(computePcp({ ...EXAMPLE, endValue: undefined }).pcp.equity)).toBe(true);
    expect(computePcp({ ...EXAMPLE, endValue: undefined }).inputs.endValue).toBe(15000); // defaults to the GMFV
  });
});
