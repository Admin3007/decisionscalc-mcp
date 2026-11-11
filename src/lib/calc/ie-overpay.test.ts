import { describe, it, expect } from 'vitest';
import { computeOverpay, monthlyPayment, runLoan, etfLot, EXAMPLE, type OverpayInput } from './ie-overpay';
import { computeHomes, exitTaxFor, DIRT, CGT_EXEMPTION, LUMP_SUM_TAX_FREE } from './ie-money-homes';
import { DEEMED_YEARS } from './ie-etf-lots';
import { ageLimit, EARNINGS_CAP } from './ie-pension-relief';
import { RATE_NEW } from './ie-cgt';

const i = 0.04 / 12;
const opt = (r: ReturnType<typeof computeOverpay>, id: string) => r.options.find((o) => o.id === id)!;

/** Independent month-by-month loop (not the engine's): months to clear and total interest. */
function loop(balance: number, payment: number, extra = 0) {
  let bal = balance, months = 0, interest = 0;
  while (bal > 0.005 && months < 1000) {
    const int = bal * i;
    interest += int;
    bal = bal + int - payment - extra;
    months++;
  }
  // the last payment only clears what is left
  return { months, interest };
}

describe('mortgage maths (standard monthly amortisation)', () => {
  it('€300,000 at 4% over 25 years: €1,583.51 a month', () => {
    expect(monthlyPayment(300000, 4, 300)).toBeCloseTo(1583.51, 2);
    expect(computeOverpay(EXAMPLE).mortgage.payment).toBe(1583.51);
    expect(monthlyPayment(12000, 0, 12)).toBe(1000);
  });

  it('€10,000 lump sum, payment kept: months and interest saved match an independent loop', () => {
    const P = monthlyPayment(300000, 4, 300);
    const base = loop(300000, P), over = loop(290000, P);
    expect(base.months).toBe(300);
    const r = computeOverpay(EXAMPLE).mortgage;
    expect(r.monthsSaved).toBe(base.months - over.months);
    expect(r.monthsSaved).toBe(16);
    // interest: the loop overshoots by part of one payment at the end; allow €20
    expect(Math.abs(r.interestSaved - (base.interest - over.interest))).toBeLessThan(20);
    // hand: total base interest = 300 × 1,583.51 − 300,000 = €175,053
    expect(Math.round(runLoan({ balance: 300000, ratePct: 4, months: 300, lump: 0, extra: 0, mode: 'shorten', horizonMonths: 0, depositPct: 0 }).totalInterest)).toBe(175053);
  });

  it('payment kept: at year 10 you are better off by €10,000 grown at the mortgage rate (hand: 10,000 × 1.00333^120 = €14,908)', () => {
    const r = computeOverpay(EXAMPLE);
    expect(opt(r, 'overpay').value).toBe(Math.round(10000 * (1 + i) ** 120));
    expect(opt(r, 'overpay').value).toBe(14908);
    expect(r.mortgage.balanceNow.base - r.mortgage.balanceNow.overpay).toBe(14908);
    expect(r.mortgage.equivalentReturnPct).toBe(4);
  });

  it('reduce payment: €1,530.73 a month (hand: 1,583.51 × 290/300), €5,834 less interest, less than keeping the payment', () => {
    const red = computeOverpay({ ...EXAMPLE, mode: 'reduce' });
    expect(red.mortgage.newPayment).toBeCloseTo(1583.51 * 290 / 300, 1);
    expect(red.mortgage.monthsSaved).toBe(0);
    const hand = (300 * monthlyPayment(300000, 4, 300) - 300000) - (300 * monthlyPayment(290000, 4, 300) - 290000);
    expect(Math.abs(red.mortgage.interestSaved - hand)).toBeLessThan(1);
    // the €52.78 a month saved after DIRT is counted, but keeping the payment still saves more (CCPC)
    expect(red.mortgage.freedSaved).toBeGreaterThan(52.78 * 120);
    expect(opt(red, 'overpay').value).toBeLessThan(opt(computeOverpay(EXAMPLE), 'overpay').value);
  });

  it('€300 a month extra: payoff month matches the independent loop; freed payments saved after DIRT', () => {
    const input: OverpayInput = { ...EXAMPLE, lumpSum: 0, monthlyExtra: 300, horizonYears: 25 };
    const r = computeOverpay(input);
    const ind = loop(300000, monthlyPayment(300000, 4, 300), 300);
    expect(r.mortgage.payoffMonths.overpay).toBe(ind.months);
    expect(r.mortgage.paidOffWithinHorizon).toBe(true);
    // both loans are cleared by year 25: the whole gain is the deposit built from freed payments
    expect(r.mortgage.balanceNow).toEqual({ base: 0, overpay: 0 });
    // independent: a budget of P + extra each month; what the loan does not need goes to a deposit at 2.5% less 33% DIRT
    const dm = (1 + 0.025 * (1 - DIRT)) ** (1 / 12) - 1;
    const P = monthlyPayment(300000, 4, 300);
    const deposit = (extra: number) => {
      let bal = 300000, dep = 0;
      for (let m = 1; m <= 300; m++) {
        dep *= 1 + dm;
        const due = bal > 0 ? bal * (1 + i) : 0;
        const used = Math.min(P + extra, due);
        bal = due - used;
        dep += P + extra - used;
      }
      return dep;
    };
    expect(Math.abs(opt(r, 'overpay').value - (deposit(300) - deposit(0)))).toBeLessThan(1);
  });

  it('a lump sum bigger than the loan clears it; the rest is saved', () => {
    const r = computeOverpay({ ...EXAMPLE, balance: 5000, termYears: 5, lumpSum: 10000, horizonYears: 5 });
    expect(r.mortgage.payoffMonths.overpay).toBe(0);
    expect(opt(r, 'overpay').value).toBeGreaterThan(10000);
  });
});

describe('the same money invested, after Irish tax (rates imported from the tested engines)', () => {
  it('pins the imported rules', () => {
    expect([exitTaxFor(2026), exitTaxFor(2027), exitTaxFor(2040)]).toEqual([0.38, 0.35, 0.35]);
    expect(DEEMED_YEARS).toBe(8);
    expect(RATE_NEW).toBe(0.31);
    expect(CGT_EXEMPTION).toBe(1270);
    expect([ageLimit(29), ageLimit(40), ageLimit(60)]).toEqual([0.15, 0.25, 0.4]);
    expect(EARNINGS_CAP).toBe(115000);
    expect(LUMP_SUM_TAX_FREE).toBe(200000);
  });

  it('ETF, lump sum: identical to the "Where should my money go?" engine (deemed disposal at year 8, 35%): €13,976', () => {
    const r = computeOverpay(EXAMPLE);
    const homes = computeHomes({ amount: 10000, years: 10, growth: 5, depositRate: 2.5, marginalRate: 40, retirementRate: 20 }).homes;
    expect(opt(r, 'etf').value).toBe(homes.find((h) => h.id === 'etf')!.net);
    expect(opt(r, 'etf').value).toBe(13976);
    // under 8 years no deemed disposal: 35% of the gain on sale (hand: 10,000 × 1.05^5 = 12,763; tax 967)
    expect(Math.round(etfLot(10000, 60, 0.05).net)).toBe(Math.round(12762.82 - 2762.82 * 0.35));
  });

  it('shares: identical to the savings engine for a lump sum (€14,733), and one €1,270 exemption across monthly buys', () => {
    expect(opt(computeOverpay(EXAMPLE), 'shares').value).toBe(14733);
    const r = computeOverpay({ ...EXAMPLE, lumpSum: 0, monthlyExtra: 200 });
    const s = opt(r, 'shares');
    let gross = 0;
    for (let k = 1; k <= 120; k++) gross += 200 * 1.05 ** ((120 - k) / 12);
    expect(s.tax).toBe(Math.round((gross - 24000 - 1270) * 0.31));
  });

  it('pension within the age limit: identical to the savings engine (€16,667 in for €10,000, net €23,076), locked until 60', () => {
    const r = computeOverpay(EXAMPLE);
    expect(opt(r, 'pension').value).toBe(23076);
    expect(r.pension.contributions).toBe(16667);
    expect(r.pension.relief).toBe(6667);
    expect(r.pension.locked).toBe(true);
    expect(r.best).toBe('pension');
    expect(r.bestAccessible).toBe('overpay');
    expect(r.verdict).toContain('locked until 60');
  });

  it('pension above the age limit: age 25 on €40,000 can get relief on €6,000 (15%); the rest goes in without relief', () => {
    const r = computeOverpay({ ...EXAMPLE, age: 25, pay: 40000 });
    expect(r.pension.limitPctNow).toBe(15);
    expect(r.pension.relief).toBe(2400);          // 6,000 × 40%
    expect(r.pension.contributions).toBe(12400);  // 6,000 + (10,000 − 3,600)
    expect(r.pension.unrelieved).toBe(6400);
    // earnings counted up to €115,000: age 60 on €200,000 → €46,000 of room, so €20,000 at 40% is all relieved
    const big = computeOverpay({ ...EXAMPLE, lumpSum: 20000, age: 60, pay: 200000 });
    expect(big.pension.unrelieved).toBe(0);
    expect(big.pension.locked).toBe(false);
  });
});

describe('ranking, break-even and verdict', () => {
  it('break-even: an ETF at the break-even growth matches overpaying; below it, overpaying wins', () => {
    const r = computeOverpay(EXAMPLE);
    expect(r.breakEven.etf.kind).toBe('found');
    const at = computeOverpay({ ...EXAMPLE, growthPct: r.breakEven.etf.pct! });
    // the rate is shown to 0.01%, worth about €3 here
    expect(Math.abs(opt(at, 'etf').value - opt(at, 'overpay').value)).toBeLessThanOrEqual(5);
    const below = computeOverpay({ ...EXAMPLE, growthPct: r.breakEven.etf.pct! - 0.5 });
    expect(opt(below, 'etf').value).toBeLessThan(opt(below, 'overpay').value);
    // golden: 4% mortgage, 10 years, 35% exit tax with one deemed disposal → about 5.94% a year
    expect(r.breakEven.etf.pct).toBeCloseTo(5.94, 1);
    // shares need less (31% CGT and the exemption), the pension far less (40% relief, 20% in retirement)
    expect(r.breakEven.shares.pct!).toBeLessThan(r.breakEven.etf.pct!);
    expect(r.breakEven.pension.pct!).toBeLessThan(1);
  });

  it('break-even "never": a 20% loan for one year beats anything up to 30% growth after exit tax', () => {
    const r = computeOverpay({ ...EXAMPLE, ratePct: 20, horizonYears: 1, termYears: 10 });
    expect(r.breakEven.etf.kind).toBe('never');
    expect(r.best).not.toBe('etf');
  });

  it('options are ranked by what you are better off at the horizon; no advice wording', () => {
    const r = computeOverpay({ ...EXAMPLE, age: 58, growthPct: 3 });
    const values = r.ranked.map((id) => opt(r, id).value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    expect(r.verdict).toMatch(/^On these assumptions/);
    expect(r.verdict).not.toMatch(/you should/i);
    expect(r.pension.locked).toBe(false);
  });

  it('no extra money: every option is worth nothing and the verdict asks for an amount', () => {
    const r = computeOverpay({ ...EXAMPLE, lumpSum: 0, monthlyExtra: 0 });
    expect(r.options.map((o) => o.value)).toEqual([0, 0, 0, 0]);
    expect(r.verdict).toMatch(/Enter a lump sum/);
  });

  it('bad input falls back to safe values instead of throwing', () => {
    const r = computeOverpay({ lumpSum: 'x' as never, monthlyExtra: -5, balance: NaN, ratePct: 4, termYears: 0, horizonYears: 99, growthPct: 5, marginalRate: 20, age: 40 });
    expect(r.inputs.horizonYears).toBe(40);
    expect(Number.isFinite(opt(r, 'overpay').value)).toBe(true);
  });
});
