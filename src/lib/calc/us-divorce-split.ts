/**
 * Divorce: what each spouse really gets after tax (US, tax year 2026). A split that is 50/50 on paper is rarely 50/50
 * after tax, because each asset carries a different future tax bill for the spouse who receives it.
 *
 * Rules (read 9 Nov 2026; facts file radar/decisionscalc/DIVORCE-FACTS-2026-11.md in decisionscalc-apps):
 *  - 26 U.S.C. 1041: transfers between spouses incident to divorce are tax-free and the receiver keeps the giver's
 *    basis, so a low-basis investment comes with its built-in gain. A cash equalising payment is tax-free too.
 *  - 26 U.S.C. 121: up to $250,000 of gain on a main home is excluded for a single owner who owned and lived in it 2 of
 *    the last 5 years (121(d)(3) counts the ex-spouse's ownership and, under a divorce decree, the ex's use).
 *  - 26 U.S.C. 72(t)(2)(C): a 401(k)/403(b)/pension payment to the ex-spouse under a QDRO has no 10% early
 *    withdrawal tax (it is still income). IRAs split under 408(d)(6) are tax-free at transfer, but an IRA cashed out
 *    before 59½ pays the 10% (IRS Topic 558: the QDRO exception does not apply to IRAs).
 *  - 2026 ordinary brackets, standard deduction and long-term capital gains thresholds: Rev. Proc. 2025-32
 *    (0% to $49,450 single / $66,200 head of household; 15% to $545,500 / $579,600; 20% above);
 *    Net Investment Income Tax 3.8% above $200,000 MAGI (IRS Topic 559).
 * Simplifications, stated on the page: each spouse files single or head of household after the divorce; gains are
 * long-term; the home is valued as if sold (selling costs included); traditional retirement money kept invested is
 * valued at the tax rate you expect when you draw it (an input); losses are not used; state tax is a flat rate.
 */
import { federalIncomeTax, STANDARD_DEDUCTION_2026 } from './us-federal-tax';

export type Status = 'single' | 'hoh';
export type Who = 'A' | 'B';

export const LTCG_2026: Record<Status, { zero: number; fifteen: number }> = {
  single: { zero: 49450, fifteen: 545500 },
  hoh: { zero: 66200, fifteen: 579600 },
};
export const NIIT = { rate: 0.038, threshold: 200000 };
export const HOME_EXCLUSION_SINGLE = 250000;
export const EARLY_PENALTY = 0.1;
export const DIVORCE_SOURCES = {
  s1041: 'https://www.law.cornell.edu/uscode/text/26/1041',
  s121: 'https://www.law.cornell.edu/uscode/text/26/121',
  s72t: 'https://www.law.cornell.edu/uscode/text/26/72',
  topic558: 'https://www.irs.gov/taxtopics/tc558',
  pub504: 'https://www.irs.gov/publications/p504',
  revproc: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf',
  niit: 'https://www.irs.gov/taxtopics/tc559',
};

export interface Spouse {
  status: Status;
  /** Income for the year after the divorce, before tax (wages etc.), without the assets below. */
  income: number;
  /** State income tax rate on extra income and gains, %. */
  stateRate: number;
  /** Combined tax rate you expect when you later draw traditional (pre-tax) retirement money, %. */
  retireRate: number;
  /** 59½ or older (no 10% on an IRA cash-out). */
  over59: boolean;
}

export type AssetType = 'cash' | 'brokerage' | 'home' | 'k401' | 'ira' | 'roth' | 'other' | 'debt';

export interface Asset {
  type: AssetType;
  label?: string;
  /** Market value (for a home, the price it would sell for; for a debt, the balance owed). */
  value: number;
  to: Who;
  /** Cost basis (brokerage, home: purchase price + improvements). */
  basis?: number;
  /** Home: mortgage balance. */
  mortgage?: number;
  /** Home: selling costs as % of the price. */
  sellPct?: number;
  /** Home: the receiver will meet the 2-of-5-years test when it is sold. */
  meetsUse?: boolean;
  /** 401(k) or IRA: cash it out this year instead of keeping it invested. */
  cashOut?: boolean;
  /** Roth: qualified (5 years and 59½), so withdrawals are tax-free. */
  qualified?: boolean;
}

export interface AssetResult { type: AssetType; label: string; to: Who; paper: number; tax: number; afterTax: number; note: string }

export interface SplitResult {
  assets: AssetResult[];
  paper: Record<Who, number>;
  afterTax: Record<Who, number>;
  tax: Record<Who, number>;
  paperShareA: number;
  afterTaxShareA: number;
  /** Cash A pays B (negative: B pays A) so A's after-tax share equals the target. Tax-free under 1041. */
  equaliser: number;
  target: number;
}

const ordinaryTaxable = (s: Spouse, extra: number) => Math.max(0, s.income + extra - STANDARD_DEDUCTION_2026[s.status]);

/** Federal tax on ordinary income plus long-term gains (the qualified dividends and capital gain worksheet). */
export function federalTaxWithGains(status: Status, ordinaryIncome: number, gains: number): number {
  const std = STANDARD_DEDUCTION_2026[status];
  const taxable = Math.max(0, ordinaryIncome + gains - std);
  const ord = Math.max(0, ordinaryIncome - std);
  const g = Math.max(0, taxable - ord);
  const { zero, fifteen } = LTCG_2026[status];
  const g0 = Math.min(g, Math.max(0, zero - ord));
  const g15 = Math.min(g - g0, Math.max(0, fifteen - Math.max(ord, zero)));
  const g20 = g - g0 - g15;
  return federalIncomeTax(ord, status) + g15 * 0.15 + g20 * 0.2;
}

function homeParts(a: Asset) {
  const price = Math.max(0, a.value), cost = price * Math.max(0, a.sellPct ?? 6) / 100;
  const gain = Math.max(0, price - cost - Math.max(0, a.basis ?? 0));
  const excluded = a.meetsUse === false ? 0 : Math.min(gain, HOME_EXCLUSION_SINGLE);
  return { price, cost, equity: price - Math.max(0, a.mortgage ?? 0), taxableGain: gain - excluded, excluded, gain };
}

export function divorceSplit(spouses: Record<Who, Spouse>, assets: Asset[], target = 0.5): SplitResult {
  const out: AssetResult[] = [];
  // Per receiver: the ordinary income and gains the assets add, to tax them together on top of the spouse's own income.
  const add: Record<Who, { ordinary: number; gains: number; early: number }> = { A: { ordinary: 0, gains: 0, early: 0 }, B: { ordinary: 0, gains: 0, early: 0 } };
  for (const a of assets) {
    const v = Math.max(0, a.value || 0);
    if (a.type === 'brokerage') add[a.to].gains += Math.max(0, v - Math.max(0, a.basis ?? v));
    if (a.type === 'home') add[a.to].gains += homeParts(a).taxableGain;
    if ((a.type === 'k401' || a.type === 'ira') && a.cashOut) { add[a.to].ordinary += v; if (a.type === 'ira' && !spouses[a.to].over59) add[a.to].early += v; }
  }
  // The tax each receiver owes because of the assets, split between ordinary and capital gains so it can be put back on each asset.
  const owed: Record<Who, { ordinaryRate: number; gainRate: number }> = { A: { ordinaryRate: 0, gainRate: 0 }, B: { ordinaryRate: 0, gainRate: 0 } };
  for (const w of ['A', 'B'] as Who[]) {
    const s = spouses[w], x = add[w], st = Math.max(0, s.stateRate) / 100;
    const base = federalTaxWithGains(s.status, s.income, 0);
    const withOrd = federalTaxWithGains(s.status, s.income + x.ordinary, 0);
    const withAll = federalTaxWithGains(s.status, s.income + x.ordinary, x.gains);
    const magi = s.income + x.ordinary + x.gains;
    const niit = NIIT.rate * Math.min(x.gains, Math.max(0, magi - NIIT.threshold));
    owed[w].ordinaryRate = x.ordinary > 0 ? (withOrd - base) / x.ordinary + st : 0;
    owed[w].gainRate = x.gains > 0 ? (withAll - withOrd + niit) / x.gains + st : 0;
  }
  for (const a of assets) {
    const v = Math.max(0, a.value || 0), s = spouses[a.to], label = a.label ?? a.type;
    let paper = v, tax = 0, note = '';
    switch (a.type) {
      case 'cash': case 'other': note = 'No tax to pay on it.'; break;
      case 'debt': paper = -v; note = 'A debt you take on.'; break;
      case 'brokerage': {
        const gain = Math.max(0, v - Math.max(0, a.basis ?? v));
        tax = gain * owed[a.to].gainRate;
        note = gain > 0 ? `Comes with a $${Math.round(gain).toLocaleString('en-US')} built-in gain (the original cost basis carries over).` : 'No built-in gain.';
        break;
      }
      case 'home': {
        const h = homeParts(a);
        paper = h.equity;
        tax = h.cost + h.taxableGain * owed[a.to].gainRate;
        note = h.taxableGain > 0 ? `If sold: selling costs, and tax on the gain above the ${h.excluded > 0 ? '$250,000 exclusion' : 'cost (no exclusion: use test not met)'}.` : 'If sold: selling costs; the gain is within the $250,000 exclusion.';
        break;
      }
      case 'k401':
        tax = a.cashOut ? v * owed[a.to].ordinaryRate : v * Math.max(0, s.retireRate) / 100;
        note = a.cashOut ? 'Cashed out under the QDRO: income tax, but no 10% penalty.' : 'Kept invested: taxed when you draw it, at your retirement tax rate.';
        break;
      case 'ira':
        tax = a.cashOut ? v * owed[a.to].ordinaryRate + (s.over59 ? 0 : v * EARLY_PENALTY) : v * Math.max(0, s.retireRate) / 100;
        note = a.cashOut ? (s.over59 ? 'Cashed out: income tax.' : 'Cashed out before 59½: income tax plus the 10% early withdrawal tax (the QDRO exception does not cover IRAs).') : 'Kept invested: taxed when you draw it, at your retirement tax rate.';
        break;
      case 'roth':
        tax = a.qualified === false ? Math.max(0, v - Math.max(0, a.basis ?? 0)) * Math.max(0, s.retireRate) / 100 : 0;
        note = a.qualified === false ? 'Not yet qualified: earnings may be taxed if withdrawn early.' : 'Qualified: tax-free.';
        break;
    }
    out.push({ type: a.type, label, to: a.to, paper, tax, afterTax: paper - tax, note });
  }
  const sum = (w: Who, k: 'paper' | 'afterTax' | 'tax') => out.filter((x) => x.to === w).reduce((t, x) => t + x[k], 0);
  const paper = { A: sum('A', 'paper'), B: sum('B', 'paper') };
  const afterTax = { A: sum('A', 'afterTax'), B: sum('B', 'afterTax') };
  const tax = { A: sum('A', 'tax'), B: sum('B', 'tax') };
  const pt = paper.A + paper.B, at = afterTax.A + afterTax.B;
  return {
    assets: out, paper, afterTax, tax,
    paperShareA: pt ? paper.A / pt : 0,
    afterTaxShareA: at ? afterTax.A / at : 0,
    equaliser: afterTax.A - target * at,
    target,
  };
}
