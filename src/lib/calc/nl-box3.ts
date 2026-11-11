/**
 * Netherlands box 3 (income from savings and investments), tax year 2026, as the Belastingdienst calculates it on the
 * provisional assessment under the transitional legislation (Overbruggingswetgeving). Read 10 Nov 2026 on
 * "How is my Box 3 income calculated on my provisional assessment 2026?":
 *  - notional returns: bank balances 1.28% (provisional), investments and other assets 6.00% (fixed), debts 2.70% (provisional);
 *  - debts are reduced by a threshold of €3,800 per person before they count;
 *  - tax-free allowance €59,357 per person (€118,714 for tax partners), divisible between partners in any proportion;
 *  - green investments are exempt up to €26,715 per person; the excess counts as an investment;
 *  - steps: taxable return = returns on bank + other − return on deductible debts; capital yield tax base = assets − deductible
 *    debts; base for savings and investments = base − allowance; share % = your part of that base ÷ capital yield tax base × 100,
 *    to 2 decimals; box 3 income = taxable return × share %; tax = 36% of it.
 * The Belastingdienst's worked examples round each euro amount down (e.g. 36% × €1,160 = €417), and the share percentage is cut
 * to 2 decimals (81.9474% → 81.94%); this module does the same so the three published examples reproduce exactly.
 * Not modelled: the actual-return (counter-evidence) route, the green-investment tax credit, foreign-asset relief, and 2027
 * figures (Tax Plan 2027 still before parliament).
 */
export const BOX3_2026 = {
  year: 2026,
  rBank: 0.0128,
  rOther: 0.06,
  rDebt: 0.027,
  debtThreshold: 3800,
  allowance: 59357,
  greenExempt: 26715,
  rate: 0.36,
} as const;

export const BOX3_SOURCES = {
  calc: 'https://www.belastingdienst.nl/wps/wcm/connect/en/income-in-box-3/content/box-3-provisional-assessment-2026',
  allowance: 'https://www.belastingdienst.nl/wps/wcm/connect/en/income-in-box-3/content/tax-free-allowance',
} as const;

export interface Box3Input {
  bank: number;
  /** Investments, second homes (WOZ value), other assets: total, today. */
  other: number;
  /** Green investments (exempt up to €26,715 per person). */
  green?: number;
  debts: number;
  partner: boolean;
  /** Your share of the base for savings and investments when you have a tax partner, % (default 50). */
  sharePct?: number;
}

export interface Box3Person { base: number; sharePct: number; income: number; tax: number }
export interface Box3Result {
  returns: { bank: number; other: number; debts: number; taxable: number };
  greenCounted: number;
  deductibleDebts: number;
  capitalBase: number;
  allowance: number;
  savingsBase: number;
  you: Box3Person;
  partner: Box3Person | null;
  totalTax: number;
  /** Effective tax as % of net assets. */
  effectivePct: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const floor = (x: number) => Math.floor(x + 1e-9);
const trunc2 = (x: number) => Math.floor(x * 100 + 1e-9) / 100;

export function box3(i: Box3Input, R = BOX3_2026): Box3Result {
  const people = i.partner ? 2 : 1;
  const bank = n(i.bank), green = n(i.green), debts = n(i.debts);
  const greenCounted = Math.max(0, green - R.greenExempt * people);
  const other = n(i.other) + greenCounted;
  const deductibleDebts = Math.max(0, debts - R.debtThreshold * people);
  const rBank = floor(bank * R.rBank), rOther = floor(other * R.rOther), rDebts = floor(deductibleDebts * R.rDebt);
  const taxable = Math.max(0, rBank + rOther - rDebts);
  const capitalBase = Math.max(0, bank + other - deductibleDebts);
  const allowance = R.allowance * people;
  const savingsBase = Math.max(0, capitalBase - allowance);
  const person = (part: number): Box3Person => {
    const base = Math.round(part);
    const sharePct = capitalBase > 0 ? trunc2((base / capitalBase) * 100) : 0;
    const income = floor((taxable * sharePct) / 100);
    return { base, sharePct, income, tax: floor(income * R.rate) };
  };
  const s = i.partner ? Math.min(100, Math.max(0, i.sharePct ?? 50)) / 100 : 1;
  const you = person(savingsBase * s);
  const partner = i.partner ? person(savingsBase - you.base) : null;
  const totalTax = you.tax + (partner?.tax ?? 0);
  return {
    returns: { bank: rBank, other: rOther, debts: rDebts, taxable },
    greenCounted, deductibleDebts, capitalBase, allowance, savingsBase, you, partner, totalTax,
    effectivePct: (() => { const net = bank + n(i.other) + green - debts; return net > 0 ? Math.round((totalTax / net) * 10000) / 100 : 0; })(),
  };
}
