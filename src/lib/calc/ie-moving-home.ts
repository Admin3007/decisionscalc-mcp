/**
 * "Is it worth moving home to Ireland?" Take-home pay, rent and childcare where you live now vs in an Irish county,
 * a month at a time, in euro, and the Irish salary at which you would be no worse off. Pure + tested.
 *
 * Year compared: 2027, the year most people would move.
 *  - Ireland: Budget 2027 bands, credits, USC and PRSI (./ie-budget-2027.ts computeYear), the Rent Tax Credit for
 *    renters (€1,150 single / €2,300 couple), Child Benefit €140 a child a month (universal).
 *  - UK: 2026-27 income tax (rest of UK or Scotland) and employee NI, frozen to 2030-31 (./retire/gb.ts).
 *  - Australia: 2027-28 resident rates (14% from 1 July 2027, legislated), LITO and the Medicare levy (./retire/au.ts).
 *  - Canada: federal + provincial tax, CPP (5.75% in 2027), CPP2 and EI for a worker (./retire/ca.ts caPersonTax).
 *  - US: 2026 federal brackets and standard deduction, Social Security and Medicare tax, state tax for 18 states
 *    (./us-federal-tax.ts, ./us-state-tax.ts); each person's state tax as a single filer (stated on the page).
 * Family payments in the country you live in now (UK Child Benefit, US Child Tax Credit, Canada Child Benefit,
 * Australian Family Tax Benefit) are income-tested and vary, so they are an input; Irish Child Benefit is computed.
 * Childcare in Ireland: the National Childcare Scheme universal subsidy (€2.14 an hour, up to 45 hours a week) and
 * the Core Funding fee cap (€280 a week for a 40-50 hour place); from September 2027 €2.50 an hour (to senior infants)
 * and a €250 cap (gov.ie, Department of Children, 15 Oct 2026). Weeks are turned into months as 52/12.
 * Rents: RTB Rent Index Q1 2026 (ESRI, published 3 Sep 2026), new tenancies, standardised averages.
 * Exchange rates: ECB euro reference rates of 11 November 2026 (editable on the page).
 * Facts: decisionscalc-apps radar/decisionscalc/IE-MOVING-HOME-FACTS.md (read 12 Nov 2026).
 */
import { computeYear, type Status } from './ie-budget-2027';
import { gbIncomeTax, gbNI } from './retire/gb';
import { auIncomeTax, auLito, auMedicare } from './retire/au';
import { caPayContrib, caPersonTax, provinceOf } from './retire/ca';
import { federalTaxOnAgi, SS_WAGE_BASE_2026, SS_RATE, MEDICARE_RATE, ADDL_MEDICARE_RATE, type FilingStatus } from './us-federal-tax';
import { stateIncomeTax, type StateCode } from './us-state-tax';

export type Origin = 'gb' | 'gb-sct' | 'au' | 'us' | 'ca';
export type Currency = 'GBP' | 'USD' | 'AUD' | 'CAD';
export const ORIGINS: { id: Origin; name: string; currency: Currency; symbol: string }[] = [
  { id: 'gb', name: 'England, Wales or Northern Ireland', currency: 'GBP', symbol: '£' },
  { id: 'gb-sct', name: 'Scotland', currency: 'GBP', symbol: '£' },
  { id: 'au', name: 'Australia', currency: 'AUD', symbol: 'A$' },
  { id: 'us', name: 'United States', currency: 'USD', symbol: 'US$' },
  { id: 'ca', name: 'Canada', currency: 'CAD', symbol: 'C$' },
];
/** Units of each currency per euro: ECB reference rates, 11 November 2026. */
export const FX_DATE = '2026-11-11';
export const FX: Record<Currency, number> = { GBP: 0.83618, USD: 1.1127, AUD: 1.6222, CAD: 1.5839 };

/** RTB Rent Index Q1 2026, new tenancies, standardised average rent a month (Table 5 counties; cities from the text). */
export const RENT_QUARTER = 'Q1 2026';
export const IE_RENT: { id: string; name: string; rent: number }[] = [
  { id: 'dublin-city', name: 'Dublin City', rent: 2301 }, { id: 'dlr', name: 'Dún Laoghaire-Rathdown', rent: 2629 },
  { id: 'south-dublin', name: 'South Dublin', rent: 2267 }, { id: 'dublin', name: 'Dublin (county average)', rent: 2335 },
  { id: 'cork-city', name: 'Cork City', rent: 1903 }, { id: 'galway-city', name: 'Galway City', rent: 2004 },
  { id: 'limerick-city', name: 'Limerick City', rent: 1921 }, { id: 'waterford-city', name: 'Waterford City', rent: 1423 },
  ...([
    ['Carlow', 1357], ['Cavan', 1204], ['Clare', 1333], ['Cork', 1678], ['Donegal', 1107], ['Galway', 1718], ['Kerry', 1311],
    ['Kildare', 1852], ['Kilkenny', 1298], ['Laois', 1408], ['Leitrim', 1040], ['Limerick', 1744], ['Longford', 1215],
    ['Louth', 1526], ['Mayo', 1153], ['Meath', 1706], ['Monaghan', 1081], ['Offaly', 1212], ['Roscommon', 1132],
    ['Sligo', 1290], ['Tipperary', 1204], ['Waterford', 1371], ['Westmeath', 1379], ['Wexford', 1231], ['Wicklow', 1888],
  ] as [string, number][]).map(([name, rent]) => ({ id: name.toLowerCase(), name: `${name} (county)`, rent })),
];
export const IE_NATIONAL_RENT = 1839;

/** National Childcare Scheme universal subsidy and Core Funding cap for a 40-50 hour place (a week). */
export const CHILDCARE = {
  now: { subsidyHour: 2.14, capWeek: 280, label: 'until August 2027' },
  sep2027: { subsidyHour: 2.5, capWeek: 250, label: 'from September 2027' },
  hours: 45,
  medianFeeMonth: 800,
} as const;
export const CHILD_BENEFIT_MONTH = 140;
const WEEKS_PER_MONTH = 52 / 12;

export interface MoveInput {
  origin: Origin;
  usState?: StateCode;
  caProvince?: string;
  couple: boolean;
  /** Gross salaries a year, in the local currency now and in euro in Ireland. */
  salaryNow: number;
  partnerNow?: number;
  salaryIe: number;
  partnerIe?: number;
  children?: number;
  /** Children in full-time (40-50 hour) childcare, up to senior infants. */
  inCare?: number;
  /** Childcare you pay now, a month, all children, local currency. */
  careNow?: number;
  /** Irish childcare fee a month per child, before the subsidy. */
  careFeeIe?: number;
  careRules?: 'now' | 'sep2027';
  /** Family payments you get now a month (child benefit, tax credits paid out), local currency. */
  familyNow?: number;
  housing: 'rent' | 'own';
  /** Rent or mortgage a month: now in local currency, in Ireland in euro. */
  housingNow: number;
  housingIe: number;
  /** Units of the local currency per euro. */
  fx?: number;
}

export interface Side { gross: number; tax: number; takeHome: number; family: number; housing: number; childcare: number; leftOver: number }
export interface MoveResult {
  currency: Currency; fx: number;
  /** Monthly, in euro. */
  now: Side; ireland: Side;
  /** Monthly, in the local currency, for the "now" side as people know it. */
  nowLocal: Side;
  difference: number;
  breakEvenSalary: number | null;
  irelandDetail: { incomeTax: number; usc: number; prsi: number; rentCredit: boolean; status: Status };
  careEach: number;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Tax and social insurance a year in the country you live in now, local currency. */
export function originTax(i: Pick<MoveInput, 'origin' | 'usState' | 'caProvince' | 'couple' | 'children'>, s1: number, s2: number): number {
  const two = i.couple ? s2 : 0;
  switch (i.origin) {
    case 'gb': case 'gb-sct': {
      const sct = i.origin === 'gb-sct';
      return [s1, two].reduce((t, s) => t + gbIncomeTax(s, sct) + gbNI(s), 0);
    }
    case 'au': {
      const combined = s1 + two;
      const one = (s: number) => (s <= 0 ? 0 : Math.max(0, auIncomeTax(s) - auLito(s)) + auMedicare(s, false, 1, i.couple ? { combined, senior: false } : undefined));
      return one(s1) + (i.couple ? one(two) : 0);
    }
    case 'ca': {
      const prov = provinceOf(i.caProvince);
      const one = (s: number) => {
        if (s <= 0) return 0;
        const c = caPayContrib(s, 40);
        const t = caPersonTax({ exists: true, age: 40, salary: s, relieved: 0, db: 0, cpp: 0, oas: 0, uk: 0, draw: 0, splitIn: 0 }, prov, 1, 1);
        return t.federal + t.provincial + c.base + c.enhanced + c.cpp2 + c.ei;
      };
      return one(s1) + (i.couple ? one(two) : 0);
    }
    case 'us': {
      const status: FilingStatus = i.couple ? 'mfj' : n(i.children) > 0 ? 'hoh' : 'single';
      const fed = federalTaxOnAgi(s1 + two, status);
      const fica = (s: number) => SS_RATE * Math.min(s, SS_WAGE_BASE_2026) + MEDICARE_RATE * s;
      const addl = ADDL_MEDICARE_RATE * Math.max(0, s1 + two - (i.couple ? 250000 : 200000));
      const state = i.usState ? stateIncomeTax(i.usState, s1).tax + (i.couple && two > 0 ? stateIncomeTax(i.usState, two).tax : 0) : 0;
      return fed + fica(s1) + (i.couple ? fica(two) : 0) + addl + state;
    }
  }
}

/** Irish childcare a month for one child after the universal subsidy, with the fee capped at the Core Funding cap. */
export function irishCareEach(feeMonth: number, rules: 'now' | 'sep2027'): number {
  const R = CHILDCARE[rules];
  const fee = Math.min(n(feeMonth), R.capWeek * WEEKS_PER_MONTH);
  return r2(Math.max(0, fee - R.subsidyHour * CHILDCARE.hours * WEEKS_PER_MONTH));
}

function irelandSide(i: MoveInput, salaryIe: number) {
  const p2 = i.couple ? n(i.partnerIe) : 0;
  const kids = n(i.children);
  const status: Status = i.couple ? (p2 > 0 ? 'married-two' : 'married-one') : kids > 0 ? 'single-parent' : 'single';
  const y = computeYear({ status, pay1: n(salaryIe), pay2: p2, renter: i.housing === 'rent' }, 2027);
  const careEach = irishCareEach(i.careFeeIe ?? CHILDCARE.medianFeeMonth, i.careRules ?? 'sep2027');
  const childcare = r2(careEach * Math.min(kids, n(i.inCare)));
  const family = CHILD_BENEFIT_MONTH * kids;
  const takeHome = r2(y.takeHome / 12);
  const side: Side = { gross: r2(y.gross / 12), tax: r2((y.incomeTax + y.usc + y.prsi) / 12), takeHome, family, housing: n(i.housingIe), childcare, leftOver: r2(takeHome + family - n(i.housingIe) - childcare) };
  return { side, y, status, careEach };
}

export function computeMove(i: MoveInput): MoveResult {
  const origin = ORIGINS.find((o) => o.id === i.origin) ?? ORIGINS[0];
  const fx = n(i.fx) || FX[origin.currency];
  const s1 = n(i.salaryNow), s2 = i.couple ? n(i.partnerNow) : 0;
  const tax = originTax(i, s1, s2);
  const local: Side = {
    gross: r2((s1 + s2) / 12), tax: r2(tax / 12), takeHome: r2((s1 + s2 - tax) / 12), family: n(i.familyNow),
    housing: n(i.housingNow), childcare: n(i.careNow), leftOver: 0,
  };
  local.leftOver = r2(local.takeHome + local.family - local.housing - local.childcare);
  const eur = (v: number) => r2(v / fx);
  const now: Side = { gross: eur(local.gross), tax: eur(local.tax), takeHome: eur(local.takeHome), family: eur(local.family), housing: eur(local.housing), childcare: eur(local.childcare), leftOver: eur(local.leftOver) };
  const ie = irelandSide(i, n(i.salaryIe));
  // The Irish salary (with the partner's Irish salary as entered) that leaves the same each month as now.
  let breakEvenSalary: number | null = null;
  const left = (s: number) => irelandSide(i, s).side.leftOver;
  if (left(1_000_000) >= now.leftOver) {
    let lo = 0, hi = 1_000_000;
    if (left(0) >= now.leftOver) breakEvenSalary = 0;
    else {
      for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (left(mid) >= now.leftOver) hi = mid; else lo = mid; }
      breakEvenSalary = Math.ceil(hi / 100) * 100;
    }
  }
  return {
    currency: origin.currency, fx, now, ireland: ie.side, nowLocal: local,
    difference: r2(ie.side.leftOver - now.leftOver), breakEvenSalary,
    irelandDetail: { incomeTax: ie.y.incomeTax, usc: ie.y.usc, prsi: ie.y.prsi, rentCredit: i.housing === 'rent', status: ie.status },
    careEach: ie.careEach,
  };
}
