/**
 * "PCP vs car loan vs cash (Ireland)": pure calculation logic.
 *
 * Rules and conventions (sources on the page; read 10 November 2026):
 *  - APR is an effective annual rate. The EU Consumer Credit Directive 2008/48/EC (Annex I, transposed in Ireland by
 *    S.I. 281/2010) defines the APR as the rate X that equates the present value of drawdowns with the present value
 *    of repayments and charges, with time "expressed in years and fractions of a year" and 12 equal months to a year.
 *    With no fees, the monthly rate is therefore i = (1 + APR)^(1/12) − 1 (not APR / 12). Any fees are not modelled.
 *  - PCP: deposit (or trade-in), monthly payments, then an optional final payment (the balloon or GMFV). You do not own
 *    the car until the final payment; at the end you pay the GMFV and keep it, hand it back, or trade it in (CCPC,
 *    Citizens Information). Excess mileage and excessive wear can bring charges if you hand it back (CCPC).
 *    Payment with a balloon: payment = (P − B/(1+i)^n) × i / (1 − (1+i)^−n), the GMFV due at month n.
 *  - Half rule: once you have paid half the total amount payable you can hand the car back with nothing more to pay
 *    (Consumer Credit Act 1995, CCPC). We count the deposit or trade-in as paid, as the hire-purchase price includes it.
 *  - Loan (credit union or bank): standard amortisation; you own the car from the day you buy it (CCPC).
 *  - Cash: the savings used to buy the car stop earning interest; DIRT at 33% is imported from ie-money-homes.ts.
 *
 * Model (stated on the page): everything is measured at the end of the PCP term. Each route's "net cost" is what it
 * pays out (deposit, monthly payments, the GMFV or the loan balance still owed, excess-km charges), plus the interest
 * those euro would have earned in savings after DIRT until the end of the term, minus the value of the car you hold
 * at the end. The same car and the same mileage in every route, so the same end value. Savings interest is credited
 * monthly at the AER's monthly equivalent, less DIRT.
 */
import { DIRT } from './ie-money-homes';

export type RouteId = 'cash' | 'loan' | 'pcpKeep' | 'pcpHandBack';

export interface PcpInput {
  price: number;              // EUR, cash price of the car
  deposit: number;            // EUR, deposit or trade-in value (PCP and loan)
  pcpAprPct: number;          // PCP APR %
  pcpTermMonths: number;      // PCP term, months (typically 36)
  gmfv: number;               // EUR, GMFV / balloon due at the end of the PCP
  kmAllowance: number;        // km a year allowed under the PCP
  expectedKm: number;         // km a year you expect to drive
  excessCentPerKm: number;    // cent per km over the allowance
  loanAprPct: number;         // loan APR %
  loanTermMonths: number;     // loan term, months
  savingsRatePct: number;     // savings AER % before DIRT (opportunity cost of cash)
  endValue?: number;          // EUR, the car's value at the end of the PCP term (assumption; default = GMFV)
}

export interface RouteResult {
  id: RouteId;
  label: string;
  monthly: number;            // monthly payment (0 for cash)
  upfront: number;            // paid on day one (price for cash, the deposit otherwise)
  paidInTerm: number;         // monthly payments made during the PCP term
  finalPayment: number;       // GMFV (keep), loan balance still owed at the end of the PCP term, else 0
  extraCharges: number;       // excess-km charges (hand back only)
  totalPaid: number;          // upfront + paidInTerm + finalPayment + extraCharges
  costOfCredit: number;       // interest to the end of the PCP term (PCP: the whole agreement)
  lostInterest: number;       // savings interest after DIRT given up on the money paid out, to the end of the term
  carValue: number;           // what you hold at the end
  netCost: number;            // totalPaid + lostInterest − carValue
  owns: string;               // what you own at the end, in words
}

export interface PcpResult {
  inputs: Required<PcpInput> & { financed: number; months: number };
  rates: { pcpMonthlyPct: number; loanMonthlyPct: number; savingsMonthlyAfterDirtPct: number; convention: string };
  pcp: {
    monthly: number;
    totalPayable: number;     // deposit + all monthly payments + GMFV
    costOfCredit: number;     // totalPayable − price
    halfPayable: number;
    halfReachedMonth: number | null; // month the deposit + payments reach half, or null (only with the final payment)
    equity: number;           // endValue − GMFV (negative: the car is worth less than the GMFV)
    excessKm: number;         // km over the allowance across the term
    excessCharge: number;
    balances: number[];       // balance after each month 0..n (ends at the GMFV)
  };
  loan: {
    monthly: number;
    totalInterest: number;    // over the whole loan
    totalPaid: number;        // over the whole loan, incl. the deposit
    balanceAtPcpEnd: number;
    balances: number[];       // balance after each month 0..loan term
  };
  cash: { lostInterest: number };
  routes: RouteResult[];      // in the fixed order cash, loan, pcpKeep, pcpHandBack
  ranked: RouteId[];          // lowest net cost first
  best: RouteId;
  verdict: string;
}

const num = (v: unknown, d = 0) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? d : Number(v));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r0 = (v: number) => Math.round(v);
const r2 = (v: number) => Math.round(v * 100) / 100;
const r4 = (v: number) => Math.round(v * 10000) / 10000;
const eur = (v: number) => `€${r0(v).toLocaleString('en-IE')}`;

/** Monthly rate from an APR (effective annual rate, Directive 2008/48/EC Annex I): (1 + APR)^(1/12) − 1. */
export function monthlyRateFromApr(aprPct: number): number {
  return (1 + aprPct / 100) ** (1 / 12) - 1;
}

/** Level monthly payment on `principal` at monthly rate `i` over `n` months, leaving `balloon` due at month n. */
export function paymentWithBalloon(principal: number, i: number, n: number, balloon = 0): number {
  if (!(n > 0)) return 0;
  if (i === 0) return (principal - balloon) / n;
  return ((principal - balloon / (1 + i) ** n) * i) / (1 - (1 + i) ** -n);
}

/** Balance after k payments (closed form): P(1+i)^k − pay × ((1+i)^k − 1)/i. */
export function balanceAfter(principal: number, i: number, pay: number, k: number): number {
  if (i === 0) return principal - pay * k;
  const g = (1 + i) ** k;
  return principal * g - (pay * (g - 1)) / i;
}

/** Interest given up, at monthly rate k after DIRT, on `amount` paid out at month m, counted to month n. */
const lost = (amount: number, k: number, m: number, n: number) => amount * ((1 + k) ** (n - m) - 1);

const LABEL: Record<RouteId, string> = {
  cash: 'Pay cash',
  loan: 'Car loan (credit union or bank)',
  pcpKeep: 'PCP, then pay the GMFV',
  pcpHandBack: 'PCP, then hand it back',
};
const IN_TEXT: Record<RouteId, string> = {
  cash: 'paying cash',
  loan: 'the car loan',
  pcpKeep: 'the PCP with the GMFV paid at the end',
  pcpHandBack: 'the PCP with the car handed back',
};

export function computePcp(input: PcpInput): PcpResult {
  const price = Math.max(0, num(input.price));
  const deposit = clamp(num(input.deposit), 0, price);
  const P = price - deposit;
  const n = Math.round(clamp(num(input.pcpTermMonths, 36), 1, 120));
  const gmfv = clamp(num(input.gmfv), 0, P);
  const pcpApr = clamp(num(input.pcpAprPct), 0, 100);
  const loanApr = clamp(num(input.loanAprPct), 0, 100);
  const L = Math.round(clamp(num(input.loanTermMonths, 60), 1, 120));
  const allowance = Math.max(0, num(input.kmAllowance));
  const expected = Math.max(0, num(input.expectedKm));
  const cent = Math.max(0, num(input.excessCentPerKm));
  const sav = clamp(num(input.savingsRatePct), 0, 50);
  const endValue = Math.max(0, num(input.endValue, gmfv));

  const iP = monthlyRateFromApr(pcpApr);
  const iL = monthlyRateFromApr(loanApr);
  const k = ((1 + sav / 100) ** (1 / 12) - 1) * (1 - DIRT);

  // PCP
  const pcpPay = P > 0 ? paymentWithBalloon(P, iP, n, gmfv) : 0;
  const pcpBalances = Array.from({ length: n + 1 }, (_, m) => r2(balanceAfter(P, iP, pcpPay, m)));
  const totalPayable = deposit + pcpPay * n + gmfv;
  const halfPayable = totalPayable / 2;
  let halfReachedMonth: number | null = null;
  for (let m = 0; m <= n; m++) if (deposit + pcpPay * m >= halfPayable - 1e-9) { halfReachedMonth = m; break; }
  const excessKm = Math.max(0, expected - allowance) * (n / 12);
  const excessCharge = (excessKm * cent) / 100;

  // Loan
  const loanPay = P > 0 ? paymentWithBalloon(P, iL, L, 0) : 0;
  const loanBalances = Array.from({ length: L + 1 }, (_, m) => r2(Math.max(0, balanceAfter(P, iL, loanPay, m))));
  const loanMonthsInTerm = Math.min(n, L);
  const loanBalAtN = n >= L ? 0 : Math.max(0, balanceAfter(P, iL, loanPay, n));

  // Lost savings interest on each outflow, to month n
  const lostOnPayments = (pay: number, months: number) => { let s = 0; for (let m = 1; m <= months; m++) s += lost(pay, k, m, n); return s; };
  const lostDeposit = lost(deposit, k, 0, n);
  const cashLost = lost(price, k, 0, n);
  const pcpLost = lostDeposit + lostOnPayments(pcpPay, n);
  const loanLost = lostDeposit + lostOnPayments(loanPay, loanMonthsInTerm);

  const route = (id: RouteId, r: Omit<RouteResult, 'id' | 'label' | 'totalPaid' | 'netCost'>): RouteResult => {
    const totalPaid = r.upfront + r.paidInTerm + r.finalPayment + r.extraCharges;
    return { id, label: LABEL[id], ...r, totalPaid: r0(totalPaid), netCost: r0(totalPaid + r.lostInterest - r.carValue),
      monthly: r2(r.monthly), upfront: r0(r.upfront), paidInTerm: r0(r.paidInTerm), finalPayment: r0(r.finalPayment), extraCharges: r0(r.extraCharges),
      costOfCredit: r0(r.costOfCredit), lostInterest: r0(r.lostInterest), carValue: r0(r.carValue) };
  };
  const routes: RouteResult[] = [
    route('cash', { monthly: 0, upfront: price, paidInTerm: 0, finalPayment: 0, extraCharges: 0, costOfCredit: 0, lostInterest: cashLost, carValue: endValue,
      owns: 'You own the car from day one.' }),
    route('loan', { monthly: loanPay, upfront: deposit, paidInTerm: loanPay * loanMonthsInTerm, finalPayment: loanBalAtN, extraCharges: 0,
      costOfCredit: loanPay * loanMonthsInTerm + loanBalAtN - P, lostInterest: loanLost, carValue: endValue,
      owns: loanBalAtN > 0 ? `You own the car from day one; ${eur(loanBalAtN)} of the loan is still owed at month ${n} (counted here as if cleared).` : 'You own the car from day one, and the loan is cleared.' }),
    route('pcpKeep', { monthly: pcpPay, upfront: deposit, paidInTerm: pcpPay * n, finalPayment: gmfv, extraCharges: 0, costOfCredit: totalPayable - price,
      lostInterest: pcpLost, carValue: endValue, owns: 'You own the car once the GMFV is paid.' }),
    route('pcpHandBack', { monthly: pcpPay, upfront: deposit, paidInTerm: pcpPay * n, finalPayment: 0, extraCharges: excessCharge, costOfCredit: totalPayable - price,
      lostInterest: pcpLost, carValue: 0, owns: endValue > gmfv ? `Nothing: the car goes back, with ${eur(endValue - gmfv)} of equity left in it.` : 'Nothing: the car goes back.' }),
  ];
  const ranked = [...routes].sort((a, b) => a.netCost - b.netCost);
  const best = ranked[0].id;

  let verdict: string;
  if (price <= 0) verdict = 'Enter the price of the car to compare.';
  else {
    const top = ranked[0];
    const tied = ranked.filter((r) => r.netCost === top.netCost);
    const next = ranked.find((r) => r.netCost > top.netCost);
    const list = (ids: RouteId[]) => ids.map((id) => IN_TEXT[id]).join(ids.length > 2 ? ', ' : ' and ').replace(/, ([^,]*)$/, ' and $1');
    const after = next ? `, ${eur(next.netCost - top.netCost)} less than ${IN_TEXT[next.id]}` : '';
    verdict = tied.length > 1
      ? `On these assumptions, ${list(tied.map((r) => r.id))} cost the same over ${n} months: ${eur(top.netCost)} each after the car’s value at the end${after}.`
      : `On these assumptions, ${IN_TEXT[top.id]} costs least over ${n} months: ${eur(top.netCost)} after the car’s value at the end${after}.`;
    const eq = endValue - gmfv;
    if (eq > 0) verdict += ` The car would be worth ${eur(eq)} more than the GMFV: you keep that equity only if you pay the GMFV or trade it in.`;
    else if (eq < 0) verdict += ` The car would be worth ${eur(-eq)} less than the GMFV, so handing it back beats paying the GMFV, if you stay within the mileage and condition terms.`;
    if (excessCharge > 0) verdict += ` Driving ${r0(excessKm).toLocaleString('en-IE')} km over the allowance would cost about ${eur(excessCharge)} if you hand it back.`;
  }

  return {
    inputs: { price, deposit, pcpAprPct: pcpApr, pcpTermMonths: n, gmfv, kmAllowance: allowance, expectedKm: expected, excessCentPerKm: cent, loanAprPct: loanApr, loanTermMonths: L, savingsRatePct: sav, endValue, financed: P, months: n },
    rates: { pcpMonthlyPct: r4(iP * 100), loanMonthlyPct: r4(iL * 100), savingsMonthlyAfterDirtPct: r4(k * 100),
      convention: 'APR treated as an effective annual rate (Directive 2008/48/EC Annex I): monthly rate = (1 + APR)^(1/12) − 1; fees not modelled.' },
    pcp: { monthly: r2(pcpPay), totalPayable: r0(totalPayable), costOfCredit: r0(totalPayable - price), halfPayable: r0(halfPayable), halfReachedMonth,
      equity: r0(endValue - gmfv), excessKm: r0(excessKm), excessCharge: r0(excessCharge), balances: pcpBalances },
    loan: { monthly: r2(loanPay), totalInterest: r0(loanPay * L - P), totalPaid: r0(deposit + loanPay * L), balanceAtPcpEnd: r0(loanBalAtN), balances: loanBalances },
    cash: { lostInterest: r0(cashLost) },
    routes, ranked: ranked.map((r) => r.id), best, verdict,
  };
}

/** The page's worked example (intro text, FAQ, embed defaults and the MCP tool test). All inputs are assumptions. */
export const EXAMPLE: PcpInput = {
  price: 35000, deposit: 7000, pcpAprPct: 5.9, pcpTermMonths: 36, gmfv: 15000, kmAllowance: 15000, expectedKm: 15000, excessCentPerKm: 10,
  loanAprPct: 8, loanTermMonths: 60, savingsRatePct: 2.5, endValue: 15000,
};
