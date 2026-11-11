/**
 * "Overpay my mortgage, invest, or top up my pension? Ireland, after tax": pure calculation logic.
 *
 * Every tax rule comes from an existing tested engine, by import (no rate is restated here):
 *  - DIRT 33%, ETF/fund exit tax by year (38% in 2026, 35% from 2027) and the pension lump sum rules
 *    (25% of the fund, tax-free up to €200,000): ./ie-money-homes.ts;
 *  - 8-year deemed disposal with credit for tax already paid (Revenue TDM 27-01a-02): ./ie-etf-lots.ts (DEEMED_YEARS),
 *    applied per purchase exactly as computeHomes() does (tax paid by selling units, credit on the final sale);
 *  - CGT 31% from 7 October 2026 with the €1,270 annual exemption: ./ie-cgt.ts (computeIeCgt);
 *  - pension relief at the marginal rate within the age-related % of earnings (capped at €115,000): ./ie-pension-relief.ts.
 *
 * Model (stated on the page):
 *  - The same money in every option: the lump sum now, and the extra monthly amount every month to the horizon.
 *    The usual mortgage payment is paid in every option; once a loan is cleared, the payments it no longer needs
 *    are saved on deposit at the user's rate after DIRT (in every option, so the comparison stays like for like).
 *  - Mortgage: standard monthly amortisation at a constant rate. "Shorten" keeps the payment and clears the loan
 *    sooner; "reduce" recalculates the payment over the remaining term after each overpayment, and the drop in
 *    the payment is saved on deposit.
 *  - Market options grow at the user's assumed rate (after charges), growth only, no dividends; monthly amounts
 *    are invested at the end of each month; everything is sold (or the pension drawn) at the horizon.
 *  - Pension: tax years are 12-month blocks from today; contributions above the year's age-related limit get no
 *    relief here. 25% lump sum tax-free up to €200,000 (applied to this money alone), the rest taxed as income at
 *    the retirement rate; USC on drawdown is not included.
 */
import { DIRT, exitTaxFor, LUMP_SUM_SHARE, LUMP_SUM_TAX_FREE } from './ie-money-homes';
import { DEEMED_YEARS } from './ie-etf-lots';
import { ageLimit, EARNINGS_CAP } from './ie-pension-relief';
import { computeIeCgt } from './ie-cgt';

export type OverpayMode = 'shorten' | 'reduce';
export type OptionId = 'overpay' | 'etf' | 'shares' | 'pension';

export interface OverpayInput {
  lumpSum: number;            // EUR, now
  monthlyExtra: number;       // EUR a month, to the horizon
  balance: number;            // mortgage balance, EUR
  ratePct: number;            // mortgage rate, % a year
  termYears: number;          // remaining term, years
  horizonYears: number;       // compare at this many years from now
  growthPct: number;          // market growth % a year after charges (assumption)
  marginalRate: number;       // 20 or 40
  retirementRate?: number;    // 20 or 40 (default: marginal)
  age: number;                // age now
  pay?: number;               // gross earnings for the pension limit, EUR a year (default 60,000)
  pensionContributions?: number; // own pension contributions already made each year, EUR
  accessAge?: number;         // age the pension can be drawn (default 60)
  depositRatePct?: number;    // deposit rate for freed payments, % AER (default 2.5)
  mode?: OverpayMode;         // default 'shorten'
  startYear?: number;         // default 2026
}

export interface LoanResult {
  payment: number;            // monthly payment at the start (after a lump sum in reduce mode)
  payoffMonths: number;       // months until the loan is cleared
  totalInterest: number;      // over the life of the loan
  balanceAtHorizon: number;
  depositAtHorizon: number;   // freed payments saved after DIRT, at the horizon
}

export interface OptionResult { id: OptionId; label: string; value: number; tax: number; note: string; access: string; locked?: boolean }

export interface BreakEven { pct: number | null; kind: 'found' | 'always' | 'never' }

export interface OverpayResult {
  inputs: { lumpSum: number; monthlyExtra: number; horizonYears: number; mode: OverpayMode; moneyIn: number };
  mortgage: {
    payment: number;          // usual monthly payment today
    newPayment: number;       // payment after overpaying (reduce mode; = payment in shorten mode)
    monthsSaved: number;
    interestSaved: number;    // over the life of the loan
    balanceNow: { base: number; overpay: number };   // at the horizon
    paidOffWithinHorizon: boolean;
    payoffMonths: { base: number; overpay: number };
    freedSaved: number;       // freed payments saved after DIRT by the horizon (overpay minus base)
    equivalentReturnPct: number; // tax-free, = mortgage rate
  };
  options: OptionResult[];    // in the fixed order overpay, etf, shares, pension
  ranked: OptionId[];
  best: OptionId;
  bestAccessible: OptionId;   // best option you could actually draw at the horizon
  breakEven: { etf: BreakEven; shares: BreakEven; pension: BreakEven };
  pension: { relief: number; contributions: number; unrelieved: number; limitPctNow: number; accessAge: number; locked: boolean; yearsToAccess: number };
  verdict: string;
}

const num = (v: unknown, d = 0) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? d : Number(v));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r0 = (v: number) => Math.round(v);
const r2 = (v: number) => Math.round(v * 100) / 100;
const eur = (v: number) => `€${r0(v).toLocaleString('en-IE')}`;

/** Standard annuity payment for a loan of `balance` at `annualPct` over `months`. */
export function monthlyPayment(balance: number, annualPct: number, months: number): number {
  if (!(balance > 0) || !(months > 0)) return 0;
  const i = annualPct / 100 / 12;
  if (i === 0) return balance / months;
  return (balance * i) / (1 - (1 + i) ** -months);
}

/**
 * Month-by-month loan with overpayments. The household budget each month is the usual payment plus `extra`;
 * whatever the loan does not need goes to a deposit earning `depositPct` less DIRT. Lump sum at month 0.
 */
export function runLoan(o: { balance: number; ratePct: number; months: number; lump: number; extra: number; mode: OverpayMode; horizonMonths: number; depositPct: number }): LoanResult {
  const i = o.ratePct / 100 / 12;
  const n = Math.max(1, Math.round(o.months));
  const P = monthlyPayment(o.balance, o.ratePct, n);
  const lumpIn = Math.min(Math.max(0, o.lump), o.balance);
  let bal = o.balance - lumpIn;
  let dep = Math.max(0, o.lump) - lumpIn; // a lump sum bigger than the loan: the rest is saved
  const dm = (1 + (o.depositPct / 100) * (1 - DIRT)) ** (1 / 12) - 1;
  let pay = o.mode === 'reduce' && lumpIn > 0 ? monthlyPayment(bal, o.ratePct, n) : P;
  const firstPay = bal > 1e-9 ? pay : 0;
  let interest = 0;
  let payoff = 0;
  let balH = bal, depH = dep;
  const H = Math.max(0, Math.round(o.horizonMonths));
  const last = Math.max(n, H);
  for (let m = 1; m <= last; m++) {
    dep *= 1 + dm;
    let used = 0;
    if (bal > 1e-9) {
      const int = bal * i;
      interest += int;
      const due = bal + int;
      const regular = Math.min(pay, due);
      bal = due - regular;
      const over = Math.min(Math.max(0, o.extra), bal);
      bal -= over;
      used = regular + over;
      if (bal < 1e-6) { bal = 0; payoff = m; }
      else if (o.mode === 'reduce' && over > 0) pay = monthlyPayment(bal, o.ratePct, n - m);
    }
    if (m <= H) dep += P + Math.max(0, o.extra) - used;
    if (m === H) { balH = bal; depH = dep; }
    if (m >= H && bal === 0) break;
  }
  if (H === 0) { balH = bal; depH = dep; }
  return { payment: firstPay, payoffMonths: payoff || (o.balance - lumpIn <= 1e-9 ? 0 : n), totalInterest: interest, balanceAtHorizon: balH, depositAtHorizon: depH };
}

/**
 * One ETF purchase: deemed disposal every 8 years while held (tax paid by selling units, credited later), exit tax
 * on the final sale less the credit. The same steps as computeHomes() in ie-money-homes.ts, at month resolution.
 */
export function etfLot(cost: number, heldMonths: number, growth: number, startYear = 2026, boughtMonth = 0): { gross: number; net: number } {
  const f = (mo: number) => (1 + growth) ** (mo / 12);
  let value = cost, paid = 0, t = 0;
  const step = DEEMED_YEARS * 12;
  for (let ev = step; ev < heldMonths; ev += step) {
    value *= f(ev - t); t = ev;
    const due = Math.max(0, (value + paid - cost) * exitTaxFor(startYear + Math.floor((boughtMonth + ev) / 12)) - paid);
    value -= due; paid += due;
  }
  value *= f(heldMonths - t);
  const finalDue = Math.max(0, (value + paid - cost) * exitTaxFor(startYear + Math.floor((boughtMonth + heldMonths) / 12))) - paid;
  return { gross: cost * f(heldMonths), net: value - finalDue };
}

interface Lot { month: number; amount: number }

function invest(lots: Lot[], M: number, g: number, y0: number) {
  let etfGross = 0, etfNet = 0, gross = 0, cost = 0;
  for (const l of lots) {
    if (!(l.amount > 0)) continue;
    const e = etfLot(l.amount, M - l.month, g, y0, l.month);
    etfGross += e.gross; etfNet += e.net;
    gross += l.amount * (1 + g) ** ((M - l.month) / 12);
    cost += l.amount;
  }
  const H = M / 12;
  const cgt = computeIeCgt({ disposalDate: `${y0 + Math.ceil(H)}-06-30`, salePrice: gross, purchasePrice: cost, costs: 0 });
  return { etf: { gross: etfGross, net: etfNet }, shares: { gross, net: gross - cgt.cgt, tax: cgt.cgt, rate: cgt.rate }, cost };
}

function pensionPot(lots: Lot[], M: number, g: number, p: { m: number; mr: number; age: number; pay: number; existing: number }) {
  const used: number[] = [];
  let pot = 0, contributions = 0, relief = 0, unrelieved = 0;
  for (const l of lots) {
    if (!(l.amount > 0)) continue;
    const year = l.month === 0 ? 0 : Math.floor((l.month - 1) / 12);
    const room = Math.max(0, ageLimit(p.age + year) * Math.min(p.pay, EARNINGS_CAP) - p.existing) - (used[year] ?? 0);
    const relieved = Math.min(l.amount / (1 - p.m), Math.max(0, room)); // gross contribution that gets relief
    const rest = l.amount - relieved * (1 - p.m);                       // the user's money above the limit, no relief
    used[year] = (used[year] ?? 0) + relieved;
    const gross = relieved + rest;
    contributions += gross; relief += relieved * p.m; unrelieved += rest;
    pot += gross * (1 + g) ** ((M - l.month) / 12);
  }
  const lump = Math.min(pot * LUMP_SUM_SHARE, LUMP_SUM_TAX_FREE);
  const net = lump + (pot - lump) * (1 - p.mr);
  return { pot, net, contributions, relief, unrelieved };
}

function search(f: (g: number) => number, target: number): BreakEven {
  let lo = -0.1, hi = 0.3;
  if (f(lo) >= target) return { pct: null, kind: 'always' };
  if (f(hi) < target) return { pct: null, kind: 'never' };
  for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (f(mid) >= target) hi = mid; else lo = mid; }
  return { pct: r2(hi * 100), kind: 'found' };
}

const LABELS: Record<OptionId, string> = { overpay: 'Overpay the mortgage', etf: 'ETF or fund', shares: 'Shares or investment trust', pension: 'Pension (AVC or PRSA)' };
/** The same options inside a sentence. */
const IN_TEXT: Record<OptionId, string> = { overpay: 'overpaying', etf: 'an ETF or fund', shares: 'shares or an investment trust', pension: 'a pension top-up (AVC or PRSA)' };

export function computeOverpay(input: OverpayInput): OverpayResult {
  const L = Math.max(0, num(input.lumpSum));
  const X = Math.max(0, num(input.monthlyExtra));
  const B = Math.max(0, num(input.balance));
  const rate = clamp(num(input.ratePct, 4), 0, 20);
  const n = Math.round(clamp(num(input.termYears, 25), 1 / 12, 40) * 12);
  const H = Math.round(clamp(num(input.horizonYears, 10), 1, 40));
  const M = H * 12;
  const g = clamp(num(input.growthPct, 5), -10, 30) / 100;
  const m = num(input.marginalRate, 20) >= 40 ? 0.4 : 0.2;
  const mr = num(input.retirementRate, m * 100) >= 40 ? 0.4 : 0.2;
  const age = clamp(Math.floor(num(input.age, 40)), 18, 80);
  const pay = Math.max(0, num(input.pay, 60000));
  const existing = Math.max(0, num(input.pensionContributions, 0));
  const accessAge = clamp(Math.floor(num(input.accessAge, 60)), 50, 75);
  const d = clamp(num(input.depositRatePct, 2.5), 0, 15);
  const mode: OverpayMode = input.mode === 'reduce' ? 'reduce' : 'shorten';
  const y0 = Math.max(2026, Math.floor(num(input.startYear, 2026)));

  // 1. Overpay, against the usual payments with no extra money.
  const loan = { balance: B, ratePct: rate, months: n, horizonMonths: M, depositPct: d, mode };
  const base = runLoan({ ...loan, lump: 0, extra: 0 });
  const over = runLoan({ ...loan, lump: L, extra: X });
  const overpayValue = over.depositAtHorizon - base.depositAtHorizon + base.balanceAtHorizon - over.balanceAtHorizon;
  const monthsSaved = Math.max(0, base.payoffMonths - over.payoffMonths);
  const paidOff = over.payoffMonths <= M && B > 0;

  // 2-4. The same money invested: lump sum at month 0, the monthly amount at the end of each month.
  const lots: Lot[] = [{ month: 0, amount: L }];
  for (let k = 1; k <= M; k++) lots.push({ month: k, amount: X });
  const inv = invest(lots, M, g, y0);
  const pen = pensionPot(lots, M, g, { m, mr, age, pay, existing });
  const locked = age + H < accessAge;
  const moneyIn = L + X * M;

  const overpayNote = mode === 'shorten'
    ? `${monthsSaved >= 12 ? `${Math.floor(monthsSaved / 12)} yr ${monthsSaved % 12} mo` : `${monthsSaved} months`} off the term, ${eur(base.totalInterest - over.totalInterest)} less interest over the loan; a tax-free return equal to your ${r2(rate)}% rate${paidOff ? '. Once it is cleared, the payments you no longer need are saved at your deposit rate after 33% DIRT' : ''}`
    : `${L > 0 ? `Payment falls from ${eur(base.payment)} to ${eur(over.payment)} a month after the lump sum${X > 0 ? ', then lower with each monthly overpayment' : ''}` : 'Payment falls a little with each monthly overpayment'} (the difference saved after DIRT), ${eur(base.totalInterest - over.totalInterest)} less interest over the loan`;
  const options: OptionResult[] = [
    { id: 'overpay', label: LABELS.overpay, value: r0(overpayValue), tax: 0, note: overpayNote, access: 'Money is in the house; getting it back means borrowing again' },
    { id: 'etf', label: LABELS.etf, value: r0(inv.etf.net), tax: r0(inv.etf.gross - inv.etf.net), note: `Exit tax 38% in 2026, 35% from 2027${H > DEEMED_YEARS ? `, with the ${DEEMED_YEARS}-year deemed disposal paid from the fund and credited on sale` : ''}`, access: 'Sell any day; value can fall' },
    { id: 'shares', label: LABELS.shares, value: r0(inv.shares.net), tax: r0(inv.shares.tax), note: `${r2(inv.shares.rate * 100)}% CGT on the gain above the €1,270 annual exemption, sold in one year; growth only, no dividends`, access: 'Sell any day; value can fall' },
    { id: 'pension', label: LABELS.pension, value: r0(pen.net), tax: r0(pen.pot - pen.net), locked, note: `${eur(moneyIn)} of your money buys ${eur(pen.contributions)} of pension after ${m * 100}% relief${pen.unrelieved > 0.5 ? ` (${eur(pen.unrelieved)} is above your age limit and gets no relief here)` : ''}; 25% tax-free lump sum, the rest taxed at ${mr * 100}% (USC also applies when drawn)`, access: locked ? `Locked until ${accessAge}: you could not draw it at year ${H}` : `Locked until ${accessAge}` },
  ];
  const ranked = [...options].sort((a, b) => b.value - a.value);
  const best = ranked[0].id;
  const bestAccessible = (ranked.find((o) => !o.locked) ?? ranked[0]).id;

  const target = overpayValue;
  const breakEven = {
    etf: search((x) => invest(lots, M, x, y0).etf.net, target),
    shares: search((x) => invest(lots, M, x, y0).shares.net, target),
    pension: search((x) => pensionPot(lots, M, x, { m, mr, age, pay, existing }).net, target),
  };

  const byId = (id: OptionId) => options.find((o) => o.id === id)!;
  const ov = byId('overpay');
  let verdict: string;
  if (moneyIn <= 0) verdict = 'Enter a lump sum or a monthly amount to compare.';
  else {
    const top = byId(best);
    verdict = best === 'overpay'
      ? `On these assumptions, overpaying leaves you the most better off after tax at year ${H}: ${eur(ov.value)}, against ${eur(ranked[1].value)} from the next best, ${IN_TEXT[ranked[1].id]}.`
      : `On these assumptions, ${IN_TEXT[best]} leaves you the most better off after tax at year ${H}: ${eur(top.value)}, against ${eur(ov.value)} from overpaying.`;
    if (best === 'pension' && locked) {
      const alt = byId(bestAccessible);
      verdict += ` But the pension is locked until ${accessAge}; of the options you could draw at year ${H}, ${IN_TEXT[bestAccessible]} leaves the most (${eur(alt.value)}).`;
    }
    const be = breakEven.etf;
    verdict += be.kind === 'found'
      ? ` An ETF needs about ${be.pct}% a year after charges to match overpaying.`
      : be.kind === 'always' ? ' An ETF matches overpaying even at -10% a year here.' : ' An ETF would need more than 30% a year to match overpaying.';
  }

  return {
    inputs: { lumpSum: L, monthlyExtra: X, horizonYears: H, mode, moneyIn: r0(moneyIn) },
    mortgage: {
      payment: r2(base.payment), newPayment: r2(over.payment), monthsSaved, interestSaved: r0(base.totalInterest - over.totalInterest),
      balanceNow: { base: r0(base.balanceAtHorizon), overpay: r0(over.balanceAtHorizon) }, paidOffWithinHorizon: paidOff,
      payoffMonths: { base: base.payoffMonths, overpay: over.payoffMonths },
      freedSaved: r0(over.depositAtHorizon - base.depositAtHorizon), equivalentReturnPct: r2(rate),
    },
    options, ranked: ranked.map((o) => o.id), best, bestAccessible, breakEven,
    pension: { relief: r0(pen.relief), contributions: r0(pen.contributions), unrelieved: r0(pen.unrelieved), limitPctNow: ageLimit(age) * 100, accessAge, locked, yearsToAccess: Math.max(0, accessAge - age) },
    verdict,
  };
}

/** The page's worked example (also used in the intro text and the MCP tool test). */
export const EXAMPLE: OverpayInput = { lumpSum: 10000, monthlyExtra: 0, balance: 300000, ratePct: 4, termYears: 25, horizonYears: 10, growthPct: 5, marginalRate: 40, retirementRate: 20, age: 40, pay: 70000, pensionContributions: 0, accessAge: 60, depositRatePct: 2.5, mode: 'shorten' };
