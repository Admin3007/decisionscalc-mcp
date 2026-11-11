/**
 * Netherlands 30% ruling (expat scheme, "30%-regeling" / "expatregeling"), 2026 and 2027.
 *
 * Box 1 2026 (below AOW age), Belastingdienst "Voorlopige aanslag 2026: gebruikte tarieven en heffingskortingen", read 10 Nov 2026:
 *  - 35.75% to €38,883, 37.56% to €78,426, 49.50% above;
 *  - general tax credit (algemene heffingskorting) €3,115, reduced by 6.398% of income above €29,736 (nil from €78,426);
 *  - labour tax credit (arbeidskorting) 8.324% to €11,965; €996 + 31.009% to €25,845; €5,300 + 1.950% to €45,592;
 *    €5,685 − 6.510% above €45,592 (nil from €132,920).
 * 30% ruling, Belastingdienst "Coming to work in the Netherlands: 30% facility", read 10 Nov 2026:
 *  - up to 30% of salary (including the allowance) may be paid tax-free; the salary EXCLUDING the allowance must exceed the norm:
 *    2026 €48,013, or €36,497 if under 30 with a Dutch academic master's (or equivalent); the employer may pay a lower allowance;
 *  - maximum allowance 2026 €78,600 (30% of the WNT maximum €262,000), time-proportional for part of a year.
 * 2027 (Tax Plan 2025, passed by the Senate 17 Dec 2024): rate 27%; new salary norms €50,436 / €38,338 in 2024 prices, indexed
 *  yearly (2026 prices: €52,521 / €39,923 using the Belastingdienst's own 2024->2026 norm index 48,013/46,107); the indexed 2027
 *  figures are published in December 2026. WNT maximum 2027 €273,000 (Stcrt. 2026, 29611) -> cap €73,710 at 27%.
 *  Transitional: rulings that started before 2024 keep 30% (and the old norms) until they end; rulings that started in 2024 move
 *  to 27% from 2027 but keep the old (lower) norms.
 * 2027 box 1 tables are in the Tax Plan 2027 (not yet law), so 2027 results use the 2026 tables and say so.
 * Not modelled: the employee's other income (box 2/3 affect the general tax credit), part-year rulings, pension accrual and the
 * employer's Zvw contribution (both follow the lower taxable wage), and the 5-year term reduction for earlier stays.
 */
export const BOX1_2026 = {
  brackets: [[38883, 0.3575], [78426, 0.3756], [Infinity, 0.495]] as [number, number][],
  ahk: { max: 3115, start: 29736, rate: 0.06398 },
  ak: [
    { upTo: 11965, base: 0, rate: 0.08324, from: 0 },
    { upTo: 25845, base: 996, rate: 0.31009, from: 11965 },
    { upTo: 45592, base: 5300, rate: 0.0195, from: 25845 },
    { upTo: 132920, base: 5685, rate: -0.0651, from: 45592 },
  ],
} as const;

export type StartYear = 'before-2024' | '2024' | '2025-or-later';
export type RulingYear = 2026 | 2027;

const OLD_NORMS = { 2026: { norm: 48013, young: 36497 }, 2027: { norm: 48013, young: 36497 } };
const NEW_NORMS_2027 = { norm: 52521, young: 39923 };
const WNT = { 2026: 262000, 2027: 273000 };

export const RULING_SOURCES = {
  box1: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/voorlopige-aanslag/content/voorlopige-aanslag-tarieven-en-heffingskortingen',
  ruling: 'https://www.belastingdienst.nl/wps/wcm/connect/en/individuals/content/coming-to-work-in-the-netherlands-30-percent-facility',
  wnt2027: 'https://zoek.officielebekendmakingen.nl/stcrt-2026-29611.pdf',
} as const;

export interface Box1Tax { gross: number; ahk: number; ak: number; tax: number }

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

/** Box 1 income tax 2026 on taxable wage only (below AOW age), after the general and labour tax credits. */
export function box1Tax2026(income: number, B = BOX1_2026): Box1Tax {
  const y = n(income);
  let gross = 0, lo = 0;
  for (const [hi, r] of B.brackets) { if (y > lo) gross += (Math.min(y, hi) - lo) * r; lo = hi; }
  const ahk = Math.max(0, B.ahk.max - Math.max(0, y - B.ahk.start) * B.ahk.rate);
  const band = B.ak.find((b) => y < b.upTo);
  const ak = band ? Math.max(0, band.base + band.rate * (y - band.from)) : 0;
  // Credits cannot exceed the tax itself.
  const tax = Math.max(0, gross - ahk - ak);
  return { gross, ahk, ak, tax };
}

export interface RulingInput {
  /** Gross annual salary INCLUDING the tax-free allowance (the employer's total pay). */
  salary: number;
  year: RulingYear;
  start: StartYear;
  /** Under 30 with a Dutch academic master's (or equivalent foreign degree). */
  youngMasters?: boolean;
}

export interface RulingResult {
  rate: number;
  norm: number;
  normEstimated: boolean;
  cap: number;
  /** Lowest gross salary that gets the full percentage. */
  fullFrom: number;
  eligible: boolean;
  limitedBy: 'none' | 'norm' | 'cap' | 'ineligible';
  allowance: number;
  taxable: number;
  without: Box1Tax;
  with: Box1Tax;
  saving: number;
  savingMonthly: number;
  netWithout: number;
  netWith: number;
  usesTaxTables2026: boolean;
}

export function rulingParams(year: RulingYear, start: StartYear, young = false) {
  const rate = year === 2027 && start !== 'before-2024' ? 0.27 : 0.3;
  const norms = year === 2027 && start === '2025-or-later' ? NEW_NORMS_2027 : OLD_NORMS[year];
  const normEstimated = year === 2027; // indexed 2027 norms are published in December 2026
  const norm = young ? norms.young : norms.norm;
  const cap = Math.round(rate * WNT[year]);
  return { rate, norm, normEstimated, cap, wnt: WNT[year] };
}

export function ruling(i: RulingInput): RulingResult {
  const salary = n(i.salary);
  const { rate, norm, normEstimated, cap } = rulingParams(i.year, i.start, !!i.youngMasters);
  const byRate = rate * salary;
  const byNorm = salary - norm; // the salary excluding the allowance must stay above the norm
  const eligible = byNorm > 0;
  const allowance = eligible ? Math.floor(Math.min(byRate, byNorm, cap)) : 0;
  const limitedBy: RulingResult['limitedBy'] = !eligible ? 'ineligible'
    : allowance === Math.floor(cap) && cap < Math.min(byRate, byNorm) + 1 ? 'cap'
    : byNorm < byRate ? 'norm' : 'none';
  const taxable = salary - allowance;
  const without = box1Tax2026(salary);
  const withR = box1Tax2026(taxable);
  const saving = Math.round(without.tax - withR.tax);
  return {
    rate, norm, normEstimated, cap,
    fullFrom: Math.ceil(norm / (1 - rate)),
    eligible, limitedBy, allowance, taxable,
    without, with: withR, saving, savingMonthly: Math.round(saving / 12),
    netWithout: Math.round(salary - without.tax),
    netWith: Math.round(salary - withR.tax),
    usesTaxTables2026: true,
  };
}
