/**
 * "Where should my money go? Ireland, after tax": pure calculation logic.
 * Official figures (read 2026-11-02; see radar/decisionscalc/IRELAND-FLAGSHIP-SPEC.md):
 *  - State Savings, new issues from 30 Aug 2026 (NTMA): 3-yr 1.96%, 5-yr 2.29%, 10-yr 2.66% AER, tax-free;
 *    POSB deposit 1.25% (DIRT applies);
 *  - DIRT 33% (Revenue);
 *  - ETF/fund exit tax 38% (2026), 35% from 2027 (Budget 2027), 8-year deemed disposal with credit (Revenue TDM 27-01a-02);
 *  - CGT 31% from 7 Oct 2026, €1,270 exemption (Revenue);
 *  - pension relief at the marginal rate; lump sum up to 25% of the pot (tax-free up to €200,000), the rest taxed as income.
 * Market growth is the user's assumption. One lump sum, invested now (2026 rules), held N whole years.
 */
export const DIRT = 0.33;
export const CGT = 0.31;
export const CGT_EXEMPTION = 1270;
export const STATE_SAVINGS = [
  { years: 10, aer: 0.0266, name: '10-year National Solidarity Bond' },
  { years: 5, aer: 0.0229, name: '5-year Savings Certificate' },
  { years: 3, aer: 0.0196, name: '3-year Savings Bond' },
] as const;
export const POSB = 0.0125;
export const LUMP_SUM_SHARE = 0.25;
export const LUMP_SUM_TAX_FREE = 200000;
export const exitTaxFor = (year: number) => (year <= 2025 ? 0.41 : year === 2026 ? 0.38 : 0.35);

export interface HomesInput {
  amount: number;
  years: number;
  growth: number;        // % a year for market products (assumption)
  depositRate: number;   // % a year, bank deposit AER (user's rate)
  marginalRate: number;  // 20 or 40
  retirementRate?: number; // tax rate on pension income in retirement (default = marginal)
  startYear?: number;    // default 2026
}

export interface Home { id: 'state' | 'deposit' | 'etf' | 'shares' | 'pension'; label: string; gross: number; tax: number; net: number; note: string; access: string }

const r2 = (v: number) => Math.round(v);
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function computeHomes(i: HomesInput): { homes: Home[]; best: Home['id'] } {
  const L = Math.max(0, num(i.amount));
  const N = Math.max(1, Math.min(40, Math.floor(num(i.years, 5))));
  const g = num(i.growth) / 100;
  const d = Math.max(0, num(i.depositRate)) / 100;
  const m = num(i.marginalRate, 20) >= 40 ? 0.4 : 0.2;
  const mr = num(i.retirementRate, m * 100) >= 40 ? 0.4 : 0.2;
  const y0 = Math.max(2026, Math.floor(num(i.startYear, 2026)));

  // State Savings: the longest product that fits, reinvested; under 3 years, the POSB deposit (DIRT applies).
  const ss = STATE_SAVINGS.find((p) => p.years <= N);
  const ssValue = ss ? L * (1 + ss.aer) ** N : L * (1 + POSB * (1 - DIRT)) ** N;
  const ssGross = ss ? ssValue : L * (1 + POSB) ** N;
  const state: Home = {
    id: 'state', label: 'State Savings', gross: r2(ssGross), tax: r2(ssGross - ssValue), net: r2(ssValue),
    note: ss ? `${ss.name} at ${(ss.aer * 100).toFixed(2)}% AER, tax-free (rates for new issues from 30 August 2026)` : 'Under 3 years: Post Office Savings Bank deposit at 1.25%, less DIRT',
    access: 'Fixed term; State-guaranteed',
  };

  // Bank deposit: interest taxed at 33% DIRT each year.
  const depGross = L * (1 + d) ** N;
  const depNet = L * (1 + d * (1 - DIRT)) ** N;
  const deposit: Home = { id: 'deposit', label: 'Bank deposit', gross: r2(depGross), tax: r2(depGross - depNet), net: r2(depNet), note: `${(d * 100).toFixed(2)}% AER less 33% DIRT`, access: 'Instant or notice; deposit guarantee' };

  // ETF (accumulating, Irish/EU): deemed disposal every 8 years paid from the fund; final sale with credit.
  let units = L; // value
  let paid = 0;
  for (let y = 1; y <= N; y++) {
    units *= 1 + g;
    if (y % 8 === 0 && y < N) {
      const due = Math.max(0, (units + paid - L) * exitTaxFor(y0 + y) - paid);
      // Tax paid by selling units: value falls; the credit carries forward.
      units -= due; paid += due;
    }
  }
  const finalGross = L * (1 + g) ** N;       // what the holding would be worth with no tax ever taken
  const finalDue = Math.max(0, (units + paid - L) * exitTaxFor(y0 + N)) - paid;
  const etfNet = units - Math.max(0, finalDue) + Math.max(0, -finalDue);
  const etf: Home = { id: 'etf', label: 'ETF (Irish/EU fund)', gross: r2(finalGross), tax: r2(finalGross - etfNet), net: r2(etfNet), note: `Exit tax ${N >= 8 ? '(8-year deemed disposal paid from the fund; tax includes the growth that money would have made), ' : ''}38% in 2026, 35% from 2027`, access: 'Sell any day; value can fall' };

  // Direct shares (growth only, no dividends): CGT at 31% on the gain above €1,270.
  const shGross = L * (1 + g) ** N;
  const shTax = Math.max(0, shGross - L - CGT_EXEMPTION) * CGT;
  const shares: Home = { id: 'shares', label: 'Direct shares', gross: r2(shGross), tax: r2(shTax), net: r2(shGross - shTax), note: '31% CGT on the gain above €1,270; assumes growth only, no dividends', access: 'Sell any day; value can fall' };

  // Pension: the same out-of-pocket amount buys more (relief at the marginal rate); 25% lump sum tax-free,
  // the rest taxed as income at the retirement rate.
  const potIn = L / (1 - m);
  const pot = potIn * (1 + g) ** N;
  const lump = Math.min(pot * LUMP_SUM_SHARE, LUMP_SUM_TAX_FREE);
  const penNet = lump + (pot - lump) * (1 - mr);
  const pension: Home = { id: 'pension', label: 'Pension (PRSA)', gross: r2(pot), tax: r2(pot - penNet), net: r2(penNet), note: `€${r2(L).toLocaleString('en-IE')} costs you that after ${m * 100}% relief, so €${r2(potIn).toLocaleString('en-IE')} goes in; 25% tax-free lump sum, the rest taxed at ${mr * 100}% income tax (USC also applies when drawn)`, access: 'Locked until retirement (usually 60+)' };

  const homes = [state, deposit, etf, shares, pension];
  const best = [...homes].sort((a, b) => b.net - a.net)[0].id;
  return { homes, best };
}
