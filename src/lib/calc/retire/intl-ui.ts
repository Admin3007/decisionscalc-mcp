/**
 * The UK, Canada and Australia "Can I retire at 60?" calculators: one page component (src/components/RetireIntlCalc.astro)
 * driven by these settings. Each edition lists its form fields, turns their values into a PlanInput for the engine,
 * and says how to label the answer. The MCP tools (agent-tools.ts) use the same toPlan, so the answers agree.
 */
import { PACKS } from './index';
import type { PlanInput, PersonInput, PlanResult, RulePack, YearRow } from './types';
import { GB_SP, gbStatePensionAge, gbWeeklyFromYears } from './gb';
import { PROVINCES, CA_CPP_PENSION, CA_OAS } from './ca';
import { AU_AGE_PENSION, AU_SUPER } from './au';
import { fmtFor, type Fmt, type Series, paidFor } from './view';

export type Ed = 'gb' | 'ca' | 'au';
export type Values = Record<string, number | string | boolean>;
export interface Field {
  id: string; label: string; small?: string; kind: 'num' | 'select' | 'check';
  value: number | string | boolean; min?: number; max?: number; step?: number; options?: [string, string][]; wide?: boolean; placeholder?: string;
}
export interface Column { head: string; get: (r: YearRow) => number | null }
export interface EdUI {
  ed: Ed; pack: RulePack; fmt: Fmt; sym: string; currencyWord: string;
  path: string; title: string; h1: string; description: string; lead: string; badge: string;
  groups: { you: Field[]; pensions: Field[]; partner: Field[]; savings: Field[]; more: Field[] };
  toPlan(v: Values): PlanInput;
  series: Series; cols: Column[]; fundName: string; spName: string; bridgeLabel: string;
  insight(res: PlanResult, plan: PlanInput, safe: number): string;
}

const N = (v: Values, k: string, d = 0) => { const x = Number(v[k]); return Number.isFinite(x) && v[k] !== '' ? x : d; };
const yes = (v: Values, k: string) => v[k] === true || v[k] === 'true' || v[k] === 'yes';
const age = (id: string, value: number): Field => ({ id, label: 'Age now', kind: 'num', value, min: 18, max: 94, step: 1 });
const num = (id: string, label: string, value: number, step = 1000, small?: string, extra: Partial<Field> = {}): Field => ({ id, label, small, kind: 'num', value, min: 0, step, ...extra });

/** Defaults shared by all three: growth etc. */
const assumptions = (g: number, sg: number, inf: number, pg: number): Field[] => [
  { id: 'growth', label: 'Pension growth (% a year, after charges)', kind: 'num', value: g, step: 0.1 },
  { id: 'sgrowth', label: 'Savings growth (% a year, after tax)', kind: 'num', value: sg, step: 0.1 },
  { id: 'inflation', label: 'Inflation (% a year)', kind: 'num', value: inf, step: 0.1 },
  { id: 'paygrowth', label: 'Pay rises (% a year)', kind: 'num', value: pg, step: 0.1 },
];

function people(v: Values, ed: Ed, me: (p: 'p1' | 'p2') => PersonInput): PersonInput[] {
  const couple = v.household === 'couple';
  return couple ? [me('p1'), me('p2')] : [me('p1')];
}
const common = (v: Values, d: { g: number; sg: number; inf: number; pg: number }) => ({
  savings: N(v, 'savings'), savingsAdd: N(v, 'savings-add'), spending: N(v, 'spending'),
  growth: N(v, 'growth', d.g), savingsGrowth: N(v, 'sgrowth', d.sg), inflation: N(v, 'inflation', d.inf), payGrowth: N(v, 'paygrowth', d.pg),
  indexTax: v.indextax === undefined ? true : yes(v, 'indextax'),
});
const household = (label2: string): Field => ({ id: 'household', label: 'Household', kind: 'select', value: 'single', options: [['single', 'Just me'], ['couple', label2]], wide: true });

const ukFields = (p: 'p1' | 'p2'): Field[] => [
  num(`${p}-ukyears`, 'UK qualifying years', 0, 1, 'National Insurance years; 0 if none', { max: 50 }),
  ...(p === 'p1' ? [num('p1-ukweekly', 'Or UK forecast a week (£)', 0, 0.01, 'From gov.uk; overrides years', { placeholder: 'from years', value: '' as unknown as number })] : []),
];
const ukOf = (v: Values, p: 'p1' | 'p2') => (p === 'p1' && N(v, 'p1-ukweekly') > 0 ? N(v, 'p1-ukweekly') : gbWeeklyFromYears(N(v, `${p}-ukyears`)));

// ── United Kingdom ─────────────────────────────────────────────────────────────────────────────────────────────
const GBF = fmtFor('en-GB', 'GBP', '£');
const gbUI: EdUI = {
  ed: 'gb', pack: PACKS.gb, fmt: GBF, sym: '£', currencyWord: 'pounds',
  path: '/tools/uk-retirement-calculator/',
  title: 'Can I Retire at 60 with £300k? UK Retirement Calculator (2027-28)',
  h1: 'Can I retire at 60? UK retirement calculator',
  description: 'Can I retire at 60 with £300k or £500k? Year by year to 95: 25% tax-free cash, drawdown tax, State Pension age, minimum pension age 57 from 2028.',
  lead: 'Your pension pots, tax-free cash, drawdown, State Pension and savings, year by year to 95, with UK income tax worked out each year. See how long your money lasts, the years to bridge before your State Pension, and what retiring at 60, 62 or 65 changes.',
  badge: 'Later life · United Kingdom',
  groups: {
    you: [household('Couple'), num('p1-born', 'Year of birth', 1972, 1, 'Sets your State Pension age', { min: 1931, max: 2008 }), { id: 'p1-month', label: 'Month of birth', kind: 'select', value: '6', options: [['1', 'January'], ['2', 'February'], ['3', 'March'], ['4', 'April'], ['5', 'May'], ['6', 'June'], ['7', 'July'], ['8', 'August'], ['9', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December']] },
      { id: 'p1-retire', label: 'Retire at', kind: 'num', value: 60, min: 40, max: 75, step: 1 }, num('p1-salary', 'Pay a year, before tax (£)', 50000)],
    pensions: [num('p1-pot', 'Pension pots today (£)', 300000, 5000, 'Workplace DC, SIPP, personal'), num('p1-contrib', 'You pay in (% of pay)', 6, 0.5, undefined, { max: 100 }), num('p1-employer', 'Employer pays in (% of pay)', 4, 0.5, undefined, { max: 100 }),
      num('p1-sp', 'State Pension a week (£)', GB_SP.full2027, 0.1, `Full £${GB_SP.full2027.toFixed(2)} from April 2027`), num('p1-db', 'Defined benefit pension a year (£)', 0, 1000, 'Final salary; 0 if none'), num('p1-dbfrom', 'DB pension starts at age', 60, 1, undefined, { min: 50, max: 75 })],
    partner: [num('p2-born', 'Year of birth', 1972, 1, undefined, { min: 1931, max: 2008 }), { id: 'p2-retire', label: 'Retires at', kind: 'num', value: 60, min: 40, max: 75, step: 1 }, num('p2-salary', 'Pay a year (£)', 30000), num('p2-pot', 'Pension pots today (£)', 80000, 5000),
      num('p2-contrib', 'Pays in (% of pay)', 5, 0.5), num('p2-employer', 'Employer pays in (%)', 3, 0.5), num('p2-sp', 'State Pension a week (£)', GB_SP.full2027, 0.1, 'Their own NI record'), num('p2-db', 'DB pension a year (£)', 0)],
    savings: [num('savings', 'Savings and ISAs (£)', 40000, 5000, 'Outside pensions'), num('savings-add', 'Saved a year until you retire (£)', 3000, 500), num('spending', 'Spending a year in retirement, after tax (£)', 28000, 1000, 'Household, in today’s money', { wide: true })],
    more: [...assumptions(4.5, 2.5, 2, 2.5),
      { id: 'p1-draw', label: 'Draw your pension pot at age', small: 'From 55; 57 from 6 April 2028', kind: 'num', value: 60, min: 55, max: 75, step: 1 },
      num('p1-lump', 'Tax-free cash (% of pot, up to 25%)', 25, 1, 'Within the £268,275 Lump Sum Allowance', { max: 25 }),
      num('p1-arf', 'Pension already in drawdown (£)', 0, 5000),
      { id: 'region', label: 'Income tax', kind: 'select', value: 'rUK', options: [['rUK', 'England, Wales or Northern Ireland'], ['scotland', 'Scotland']], wide: true },
      { id: 'indextax', label: 'Tax thresholds rise with inflation after 2030-31 (frozen until then by law)', kind: 'check', value: true }],
  },
  toPlan(v) {
    const me = (p: 'p1' | 'p2'): PersonInput => {
      const born = N(v, `${p}-born`, 1972), retire = N(v, `${p}-retire`, 60);
      const first = p === 'p1';
      return {
        age: 2027 - born, retireAge: retire, drawAge: first ? N(v, 'p1-draw', retire) : retire, salary: N(v, `${p}-salary`), contribPct: N(v, `${p}-contrib`), employerPct: N(v, `${p}-employer`),
        pensionPot: N(v, `${p}-pot`), arf: first ? N(v, 'p1-arf') : 0, lumpPct: first ? N(v, 'p1-lump', 25) : 25,
        dbPension: N(v, `${p}-db`), dbFromAge: first ? N(v, 'p1-dbfrom', retire) : retire, dbIndex: 0, dbLumpSum: 0,
        statePensionWeekly: N(v, `${p}-sp`), statePensionAge: gbStatePensionAge(born, first ? N(v, 'p1-month', 6) : 6),
      };
    };
    return { household: v.household === 'couple' ? 'married' : 'single', people: people(v, 'gb', me), ...common(v, { g: 4.5, sg: 2.5, inf: 2, pg: 2.5 }), local: { region: v.region === 'scotland' ? 'scotland' : 'rUK' } };
  },
  series: [{ key: 'sp', label: 'State Pension' }, { key: 'db', label: 'Work (DB) pension' }, { key: 'pay', label: 'Pay (still working)' }, { key: 'arf', label: 'Pension drawdown' }, { key: 'savings', label: 'Savings and tax-free cash' }, { key: 'gap', label: 'Not covered' }],
  cols: [{ head: 'Pay', get: (r) => r.salary }, { head: 'DB pension', get: (r) => r.db }, { head: 'State Pension', get: (r) => r.statePension }, { head: 'Drawdown', get: (r) => r.arfMin + r.arfExtra },
    { head: 'Tax and NI', get: (r) => r.incomeTax + r.usc + r.prsi }, { head: 'Income after tax', get: (r) => r.netIncome }, { head: 'Spending', get: (r) => (r.retired ? r.spending : null) },
    { head: 'From savings', get: (r) => r.fromSavings }, { head: 'Not covered', get: (r) => (r.shortfall > 1 ? r.shortfall : null) }, { head: 'Savings left', get: (r) => r.savingsEnd }, { head: 'Pensions left', get: (r) => r.arfEnd + r.potEnd }],
  fundName: 'drawdown', spName: 'State Pension', bridgeLabel: 'Years to bridge before your State Pension',
  insight(res, plan, safe) {
    const F = GBF; const p1 = plan.people[0];
    const spa = p1.statePensionAge ?? 67;
    const parts: string[] = [];
    const spaTxt = `${Math.floor(spa)}${spa % 1 ? ` and ${Math.round((spa % 1) * 12)} months` : ''}`;
    parts.push(`Your State Pension age is ${spaTxt}.`);
    if (res.bridgeYears > 0) parts.push(`From ${p1.retireAge} you bridge ${res.bridgeYears} year${res.bridgeYears === 1 ? '' : 's'} from savings, tax-free cash and drawdown.`);
    if (p1.retireAge < 57 && 2027 - p1.age + p1.retireAge >= 2028) parts.push('Pension pots can’t be drawn before 57 from 6 April 2028.');
    if (res.lumpSums.gross > 0) parts.push(`Tax-free cash: ${F.money(res.lumpSums.gross)}.`);
    parts.push(res.runOutAge != null ? `To last to 95, spend about ${F.money(safe)} a year, or ${F.money(Math.max(0, plan.spending - safe))} less.` : `You could spend up to about ${F.money(safe)} a year and still last to 95.`);
    return parts.join(' ');
  },
};

// ── Canada ─────────────────────────────────────────────────────────────────────────────────────────────────────
const CAF = fmtFor('en-CA', 'CAD', '$');
const caUI: EdUI = {
  ed: 'ca', pack: PACKS.ca, fmt: CAF, sym: '$', currencyWord: 'dollars',
  path: '/tools/canada-retirement-calculator/',
  title: 'Can I Retire at 60 with $500k? Canada Retirement Calculator (2026 Rules)',
  h1: 'Can I retire at 60? Canada retirement calculator',
  description: 'Can I retire at 60 with $500k or $1 million in Canada? Year by year to 95: CPP, OAS and clawback, GIS, RRIF minimums, pension splitting and tax.',
  lead: 'Your RRSP and RRIF, CPP, OAS, GIS and savings, year by year to 95, with federal and provincial tax and the OAS clawback worked out each year. See how long your money lasts and what retiring at 60, 62 or 65 changes.',
  badge: 'Later life · Canada',
  groups: {
    you: [household('Couple (married or common-law)'), { id: 'region', label: 'Province or territory', small: 'Quebec not included', kind: 'select', value: 'ON', options: PROVINCES.map((p) => [p.code, p.name]), wide: true },
      age('p1-age', 55), { id: 'p1-retire', label: 'Retire at', kind: 'num', value: 60, min: 40, max: 75, step: 1 }, num('p1-salary', 'Pay a year, before tax ($)', 85000)],
    pensions: [num('p1-pot', 'RRSP, DC pension and LIRA ($)', 500000, 5000, 'Registered savings'), num('p1-contrib', 'You pay in (% of pay)', 8, 0.5, undefined, { max: 100 }), num('p1-employer', 'Employer pays in (% of pay)', 4, 0.5, undefined, { max: 100 }),
      num('p1-cpp', 'CPP at 65, a month ($)', 1100, 10, `From My Service Canada; max $${CA_CPP_PENSION.max65.toLocaleString('en-CA')}`), { id: 'p1-cppage', label: 'Start CPP at', small: '60 to 70', kind: 'num', value: 65, min: 60, max: 70, step: 1 },
      num('p1-oasyears', 'Years in Canada after 18', 40, 1, '40 for full OAS', { max: 40 }), { id: 'p1-oasage', label: 'Start OAS at', small: '65 to 70', kind: 'num', value: 65, min: 65, max: 70, step: 1 },
      num('p1-db', 'Defined benefit pension a year ($)', 0, 1000, '0 if none'), num('p1-dbfrom', 'DB pension starts at age', 60, 1, undefined, { min: 50, max: 75 }), ...ukFields('p1')],
    partner: [age('p2-age', 55), { id: 'p2-retire', label: 'Retires at', kind: 'num', value: 60, min: 40, max: 75, step: 1 }, num('p2-salary', 'Pay a year ($)', 60000), num('p2-pot', 'RRSP and pensions ($)', 150000, 5000),
      num('p2-contrib', 'Pays in (% of pay)', 5, 0.5), num('p2-employer', 'Employer pays in (%)', 3, 0.5), num('p2-cpp', 'CPP at 65, a month ($)', 800, 10), { id: 'p2-cppage', label: 'Starts CPP at', kind: 'num', value: 65, min: 60, max: 70, step: 1 },
      num('p2-oasyears', 'Years in Canada after 18', 40, 1, undefined, { max: 40 }), num('p2-db', 'DB pension a year ($)', 0), ...ukFields('p2')],
    savings: [num('savings', 'TFSA and other savings ($)', 80000, 5000, 'Outside registered plans'), num('savings-add', 'Saved a year until you retire ($)', 7000, 500), num('spending', 'Spending a year in retirement, after tax ($)', 50000, 1000, 'Household, in today’s money', { wide: true })],
    more: [...assumptions(4.5, 3, 2, 2.5),
      { id: 'p1-draw', label: 'Convert RRSP to RRIF at age', small: 'By the year you turn 71', kind: 'num', value: 60, min: 50, max: 71, step: 1 },
      num('p1-arf', 'RRIF you already have ($)', 0, 5000),
      num('gbp', 'Pounds per Canadian dollar', 0.53114, 0.0001, 'ECB rates, 6 Nov 2026', { min: 0.2, max: 2 }),
      { id: 'split', label: 'Couples: split pension income', kind: 'check', value: true },
      { id: 'indextax', label: 'Tax brackets and credits rise with inflation', kind: 'check', value: true }],
  },
  toPlan(v) {
    const me = (p: 'p1' | 'p2'): PersonInput => {
      const retire = N(v, `${p}-retire`, 60), first = p === 'p1';
      return {
        age: N(v, `${p}-age`, 55), retireAge: retire, drawAge: first ? N(v, 'p1-draw', retire) : retire, salary: N(v, `${p}-salary`), contribPct: N(v, `${p}-contrib`), employerPct: N(v, `${p}-employer`),
        pensionPot: N(v, `${p}-pot`), arf: first ? N(v, 'p1-arf') : 0, lumpPct: 0, dbPension: N(v, `${p}-db`), dbFromAge: first ? N(v, 'p1-dbfrom', retire) : retire, dbIndex: 0, dbLumpSum: 0,
        statePensionWeekly: N(v, `${p}-cpp`), statePensionAge: N(v, `${p}-cppage`, 65), pension2Age: first ? N(v, 'p1-oasage', 65) : 65, pension2Years: N(v, `${p}-oasyears`, 40),
        ukPensionWeekly: ukOf(v, p),
      };
    };
    return { household: v.household === 'couple' ? 'married' : 'single', people: people(v, 'ca', me), ...common(v, { g: 4.5, sg: 3, inf: 2, pg: 2.5 }), gbpPerEur: N(v, 'gbp', 0.53114),
      local: { region: String(v.region || 'ON'), split: v.split === undefined ? true : yes(v, 'split') } };
  },
  series: [{ key: 'sp', label: 'CPP' }, { key: 'sp2', label: 'OAS' }, { key: 'ben', label: 'GIS' }, { key: 'uk', label: 'UK State Pension' }, { key: 'db', label: 'Work (DB) pension' }, { key: 'pay', label: 'Pay (still working)' }, { key: 'arf', label: 'RRIF withdrawals' }, { key: 'savings', label: 'Savings' }, { key: 'gap', label: 'Not covered' }],
  cols: [{ head: 'Pay', get: (r) => r.salary }, { head: 'CPP', get: (r) => r.statePension }, { head: 'OAS', get: (r) => r.statePension2 }, { head: 'GIS', get: (r) => r.benefit }, { head: 'DB and UK pensions', get: (r) => r.db + r.ukPension },
    { head: 'RRIF', get: (r) => r.arfMin + r.arfExtra }, { head: 'Tax and OAS clawback', get: (r) => r.incomeTax + r.usc }, { head: 'Income after tax', get: (r) => r.netIncome }, { head: 'Spending', get: (r) => (r.retired ? r.spending : null) },
    { head: 'From savings', get: (r) => r.fromSavings }, { head: 'Not covered', get: (r) => (r.shortfall > 1 ? r.shortfall : null) }, { head: 'Savings left', get: (r) => r.savingsEnd }, { head: 'RRSP and RRIF left', get: (r) => r.arfEnd + r.potEnd }],
  fundName: 'RRIF', spName: 'CPP and OAS', bridgeLabel: 'Years to bridge before CPP and OAS',
  insight(res, plan, safe) {
    const F = CAF; const p1 = plan.people[0];
    const parts: string[] = [];
    if (res.bridgeYears > 0) parts.push(`From ${p1.retireAge} you bridge ${res.bridgeYears} year${res.bridgeYears === 1 ? '' : 's'} before CPP and OAS from savings and your RRIF.`);
    const claw = res.rows.reduce((a, r) => a + r.usc / r.deflator, 0);
    if (claw > 1) parts.push(`OAS clawback costs ${F.money(claw)} in today’s money over your retirement.`);
    const gis = res.rows.reduce((a, r) => a + r.benefit / r.deflator, 0);
    if (gis > 1) parts.push(`GIS adds ${F.money(gis)} in today’s money.`);
    parts.push(res.runOutAge != null ? `To last to 95, spend about ${F.money(safe)} a year, or ${F.money(Math.max(0, plan.spending - safe))} less.` : `You could spend up to about ${F.money(safe)} a year and still last to 95.`);
    return parts.join(' ');
  },
};

// ── Australia ──────────────────────────────────────────────────────────────────────────────────────────────────
const AUF = fmtFor('en-AU', 'AUD', '$');
const auUI: EdUI = {
  ed: 'au', pack: PACKS.au, fmt: AUF, sym: '$', currencyWord: 'dollars',
  path: '/tools/australia-retirement-calculator/',
  title: 'Can I Retire at 60 with $500k Super? Australia Retirement Calculator (2027-28)',
  h1: 'Can I retire at 60? Australia retirement calculator',
  description: 'Can I retire at 60 with $500k or $1 million in super? Year by year to 95: drawdowns, the Age Pension income and assets tests, SAPTO and Medicare levy.',
  lead: 'Your super, account-based pension, Age Pension and savings, year by year to 95, with the income and assets tests and tax worked out each year. See how long your money lasts, how much Age Pension you get, and what retiring at 60, 62 or 65 changes.',
  badge: 'Later life · Australia',
  groups: {
    you: [household('Couple'), { id: 'homeowner', label: 'I own my home', kind: 'check', value: true }, age('p1-age', 55), { id: 'p1-retire', label: 'Retire at', kind: 'num', value: 60, min: 40, max: 75, step: 1 }, num('p1-salary', 'Pay a year, before tax ($)', 95000)],
    pensions: [num('p1-pot', 'Super balance ($)', 500000, 5000, 'Accumulation'), num('p1-employer', 'Employer super (% of pay)', AU_SUPER.sg, 0.5, 'Super guarantee 12%', { max: 100 }), num('p1-contrib', 'Salary sacrifice (% of pay)', 0, 0.5, undefined, { max: 100 }),
      num('p1-db', 'Defined benefit pension a year ($)', 0, 1000, 'Public sector; 0 if none'), num('p1-dbfrom', 'DB pension starts at age', 60, 1, undefined, { min: 50, max: 75 }), ...ukFields('p1')],
    partner: [age('p2-age', 55), { id: 'p2-retire', label: 'Retires at', kind: 'num', value: 60, min: 40, max: 75, step: 1 }, num('p2-salary', 'Pay a year ($)', 70000), num('p2-pot', 'Super balance ($)', 250000, 5000),
      num('p2-employer', 'Employer super (%)', AU_SUPER.sg, 0.5), num('p2-contrib', 'Salary sacrifice (%)', 0, 0.5), num('p2-db', 'DB pension a year ($)', 0), ...ukFields('p2')],
    savings: [num('savings', 'Savings and investments ($)', 50000, 5000, 'Bank, shares, managed funds'), num('savings-add', 'Saved a year until you retire ($)', 5000, 500), num('other-assets', 'Car, contents, other assets ($)', 15000, 1000, 'Counted in the assets test'), num('spending', 'Spending a year in retirement, after tax ($)', 52000, 1000, 'Household, in today’s money', { wide: true })],
    more: [...assumptions(5, 3, 2.5, 3),
      { id: 'p1-draw', label: 'Start a super pension at age', small: 'From 60 (preservation age)', kind: 'num', value: 60, min: 60, max: 75, step: 1 },
      num('p1-lump', 'Lump sum from super (% of balance)', 0, 1, 'Tax-free from 60, to savings', { max: 100 }),
      num('p1-arf', 'Account-based pension you already have ($)', 0, 5000),
      num('gbp', 'Pounds per Australian dollar', 0.51332, 0.0001, 'ECB rates, 6 Nov 2026', { min: 0.2, max: 2 }),
      { id: 'indextax', label: 'Tax brackets rise with inflation', kind: 'check', value: true }],
  },
  toPlan(v) {
    const me = (p: 'p1' | 'p2'): PersonInput => {
      const retire = N(v, `${p}-retire`, 60), first = p === 'p1';
      return {
        age: N(v, `${p}-age`, 55), retireAge: retire, drawAge: first ? N(v, 'p1-draw', Math.max(60, retire)) : Math.max(60, retire), salary: N(v, `${p}-salary`), contribPct: N(v, `${p}-contrib`), employerPct: N(v, `${p}-employer`, AU_SUPER.sg),
        pensionPot: N(v, `${p}-pot`), arf: first ? N(v, 'p1-arf') : 0, lumpPct: first ? N(v, 'p1-lump') : 0, dbPension: N(v, `${p}-db`), dbFromAge: first ? N(v, 'p1-dbfrom', retire) : retire, dbIndex: 0, dbLumpSum: 0,
        statePensionWeekly: 0, ukPensionWeekly: ukOf(v, p),
      };
    };
    return { household: v.household === 'couple' ? 'married' : 'single', people: people(v, 'au', me), ...common(v, { g: 5, sg: 3, inf: 2.5, pg: 3 }), gbpPerEur: N(v, 'gbp', 0.51332),
      local: { homeowner: v.homeowner === undefined ? true : yes(v, 'homeowner'), otherAssets: N(v, 'other-assets') } };
  },
  series: [{ key: 'ben', label: 'Age Pension' }, { key: 'uk', label: 'UK State Pension' }, { key: 'db', label: 'Work (DB) pension' }, { key: 'pay', label: 'Pay (still working)' }, { key: 'arf', label: 'Super pension' }, { key: 'savings', label: 'Savings' }, { key: 'gap', label: 'Not covered' }],
  cols: [{ head: 'Pay', get: (r) => r.salary }, { head: 'Age Pension', get: (r) => r.benefit }, { head: 'DB and UK pensions', get: (r) => r.db + r.ukPension }, { head: 'Super pension', get: (r) => r.arfMin + r.arfExtra },
    { head: 'Tax and Medicare', get: (r) => r.incomeTax + r.usc }, { head: 'Income after tax', get: (r) => r.netIncome }, { head: 'Spending', get: (r) => (r.retired ? r.spending : null) },
    { head: 'From savings', get: (r) => r.fromSavings }, { head: 'Not covered', get: (r) => (r.shortfall > 1 ? r.shortfall : null) }, { head: 'Savings left', get: (r) => r.savingsEnd }, { head: 'Super left', get: (r) => r.arfEnd + r.potEnd }],
  fundName: 'super pension', spName: 'Age Pension', bridgeLabel: 'Years to bridge before Age Pension age',
  insight(res, plan, safe) {
    const F = AUF; const p1 = plan.people[0];
    const parts: string[] = [];
    if (p1.retireAge < AU_SUPER.preservation) parts.push(`Super can’t be drawn before ${AU_SUPER.preservation}: savings pay for ${AU_SUPER.preservation - p1.retireAge} year${AU_SUPER.preservation - p1.retireAge === 1 ? '' : 's'}.`);
    const at67 = res.rows.find((r) => r.age1 === AU_AGE_PENSION.age);
    if (at67) {
      const p = paidFor(at67, true);
      parts.push(at67.benefit > 1 ? `At 67 the Age Pension pays ${F.money(p.ben)} a year in today’s money.` : 'At 67 your assets or income are above the Age Pension limits, so none is paid yet.');
    }
    const first = res.rows.find((r) => r.benefit > 1 && r.age1 > AU_AGE_PENSION.age && !(at67 && at67.benefit > 1));
    if (first) parts.push(`It starts at ${first.age1} as your super runs down.`);
    parts.push(res.runOutAge != null ? `To last to 95, spend about ${F.money(safe)} a year, or ${F.money(Math.max(0, plan.spending - safe))} less.` : `You could spend up to about ${F.money(safe)} a year and still last to 95.`);
    return parts.join(' ');
  },
};

export const UI: Record<Ed, EdUI> = { gb: gbUI, ca: caUI, au: auUI };

/** The form's starting values, as the page renders them. */
export function defaults(ed: Ed): Values {
  const g = UI[ed].groups;
  const v: Values = {};
  for (const f of [...g.you, ...g.pensions, ...g.partner, ...g.savings, ...g.more]) v[f.id] = f.value;
  return v;
}
export { CA_OAS, CA_CPP_PENSION };
