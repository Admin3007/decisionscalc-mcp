/**
 * Calculator tools for AI agents (Nov 2026).
 *
 * One definition per tool, used two ways: the MCP endpoint (functions/mcp.js, decisionscalc.com/mcp) and
 * WebMCP registration in the browser (src/lib/webmcp.ts). Every tool runs the same tested calculation as
 * the page, and every result carries the page URL and the official sources, so an agent can cite exactly
 * where the figure comes from. Inputs are validated by the calculators themselves (bad input → safe defaults).
 */
import { computeWfp } from './calc/ie-wfp';
import { rentCredits } from './calc/ie-rent-credit';
import { computeCarer } from './calc/ie-carers';
import { computeFuel } from './calc/ie-fuel';
import { computeJprb } from './calc/ie-jobseekers-pay-related';
import { computeTca, MAX_RATE } from './calc/ie-state-pension';
import { compareBudget } from './calc/ie-budget-2027';
import { householdLeave } from './calc/ie-parental-leave';
import { checkEntitlements } from './calc/ie-entitlements';
import { computeHtb } from './calc/ie-help-to-buy';
import { computeIeCgt } from './calc/ie-cgt';
import { computeMff } from './calc/ie-mff';
import { computeHomes } from './calc/ie-money-homes';
import { computeIia } from './calc/ie-investment-account';
import { computeOverpay } from './calc/ie-overpay';
import { computePcp } from './calc/ie-pcp';
import { box3 as nlBox3, BOX3_SOURCES } from './calc/nl-box3';
import { paymentsOnAccount, POA_SOURCES } from './calc/uk-payments-on-account';
import { ruling as nlRuling, RULING_SOURCES } from './calc/nl-30-ruling';
import { simulate as ddSimulate, monteCarlo as ddMonteCarlo, safeSpending as ddSafe, sustainableSpending as ddSustainable, compareStrategies as ddCompare, DRAWDOWN_SOURCES, type Strategy as DdStrategy } from './calc/uk-drawdown';
import { computeSdlt } from './calc/uk-stamp-duty';
import { computeSeverance } from './calc/ie-severance';
import { computeCarOwnership } from './calc/car-ownership';
import { computeCompoundInterest } from './calc/compound-interest';
import { comparePayoff, type Debt as PayoffDebt } from './calc/debt-payoff';
import { computeRentVsBuy, propTaxIsFlatFor } from './calc/rent-vs-buy';
import { defaultsFor } from '../data/packs';
import { computeSalaryNegotiation } from './calc/salary-negotiation';
import { computeEmergencyFund } from './calc/emergency-fund';
import { computeFire } from './calc/fire';
import { computeWeddingCost } from './calc/wedding-cost';
import { superGuarantee } from './calc/au-super';
import { computeChildCost, type Level as ChildLevel, type CareType as ChildCareType } from './calc/child-cost';
import { computePetCost } from './calc/pet-cost';
import { computeChronicIllness } from './calc/chronic-illness';
import { computeJapanTrip } from './calc/japan-trip';
import { computeAgingParent } from './calc/aging-parent';
import { ORIGINS as JP_ORIGINS, JPY_PER_EUR, type Origin as JpOrigin, type Style as JpStyle, type PassDays as JpPass } from '../data/travel/japan';
import { FX as MOVING_FX } from '../data/moving/figures';
import { WEDDING_PRICE_USD } from '../data/planners';
import { computeRemoteWork } from './calc/remote-work';
import { computeCollegeCost } from './calc/college-cost';
import { computeHomeBuying, ieStampDuty } from './calc/home-buying';
import { PACKS as COUNTRY_PACKS } from '../data/packs';
import { computeLbtt } from './calc/scotland-lbtt';
import { computeLtt } from './calc/wales-ltt';
import { computeCaEi } from './calc/ca-ei-benefit';
import { computeQpip } from './calc/ca-qpip';
import { computeAuHealth } from './calc/au-health-rebate';
import { computeKiwiSaver } from './calc/nz-kiwisaver';
import { leaveGap } from './calc/parental-leave-gap';
import { billSplit } from './calc/leave-bill-split';
import { compareDependentCare } from './calc/us-dependent-care';
import { divorceSplit } from './calc/us-divorce-split';
import { compareLumpSum, LUMP_SOURCES } from './calc/us-pension-lump-sum';
import { US_STATES } from '../data/us-paid-leave.js';
import { computeNi } from './calc/uk-voluntary-ni';
import { computeLandlord } from './calc/ie-landlord';
import { computeSellOrKeep, roundResult, EXAMPLE as SELL_KEEP_EXAMPLE } from './calc/ie-sell-or-keep';
import { computePensionRelief } from './calc/ie-pension-relief';
import { computeCat } from './calc/ie-cat';
import { project, compareRetireAges, sustainableSpending, IE_DEFAULT, PACKS, type PlanInput } from './calc/retire';
import { ukWeeklyFromYears } from './calc/retire/ie';
import { UI as RETIRE_UI, defaults as retireDefaults, type Ed as RetireEd, type Values as RetireValues } from './calc/retire/intl-ui';
import { PROVINCES as CA_PROVINCES } from './calc/retire/ca';
import { computeEtfLots } from './calc/ie-etf-lots';
import { computeSdltHistory } from './calc/uk-sdlt-history';
import { computeSmp } from './calc/uk-smp';
import { computePlp } from './calc/au-plp';
import { budgetHousehold } from './calc/ie-budget-household';
import { projectUS, usFigures } from './calc/care/us-medicaid';
import { US_CARE_STATES } from './calc/care/us-states';
import { projectUK } from './calc/care/uk-care';
import { projectIE } from './calc/care/ie-fair-deal';
import { CARE_ON_SALE } from '../data/care-planner';
import { computePlan, type PlanInput as HomePlanInput } from './calc/home-buy/engine';
import { DEFAULTS as HOME_DEFAULTS } from './calc/home-buy/defaults';
import { SOURCES as HOME_SOURCES, US_STATES as HOME_US, GB_NATIONS, CA_PROVINCES as HOME_CA, AU_STATES } from './calc/home-buy/rules';

const SITE = 'https://decisionscalc.com';
const READ = 'Official figures read on 3 November 2026. General information, not financial advice.';

export interface AgentTool {
  name: string;
  description: string;
  page: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  run: (args: any) => unknown;
}

const num = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'number', description, ...extra });
const bool = (description: string) => ({ type: 'boolean', description });
const wrap = (page: string, result: unknown, sources: string[], next?: { name: string; url: string; what: string }) =>
  ({ result, page: SITE + page, sources, note: READ, ...(next ? { next: { ...next, url: SITE + next.url } } : {}) });
/** Paid follow-on where it genuinely helps the person (shown to the agent as an optional next step). */
const LEAVE_PLANNER = { name: 'Parental Leave Planner (spreadsheet, US$19 one-time)', url: '/parental-leave-planner/', what: 'Week-by-week leave pay for both parents, the household income gap and a monthly savings target, Irish edition.' };
const LEAVE_PLANNER_ALL = { ...LEAVE_PLANNER, what: 'Week-by-week leave pay for both parents, employer top-ups, each week’s dated rate and a monthly savings target; US (12 states and DC), UK, Ireland, Australia and Canada (EI and QPIP) editions.' };
const ETF_TRACKER = { name: 'Irish ETF Exit Tax Tracker (spreadsheet, US$15 one-time)', url: '/irish-etf-tax-tracker/', what: 'Every ETF purchase’s 8-year deemed disposal date and exit tax due each year (38% in 2026, 35% from 2027), with credit on sale. Free one-holding calculator on the page.' };
const RETIREMENT_PLANNER = { name: 'Irish Retirement Planner (spreadsheet, US$15 one-time)', url: '/irish-retirement-planner/', what: 'The same year-by-year retirement plan to 95 in a spreadsheet you keep: a couple, three scenarios side by side and every tax line.' };
const CARE_PLANNER = CARE_ON_SALE ? { name: 'Care Costs Planner (spreadsheet, US$15 one-time)', url: '/care-costs-planner/', what: 'The same rules for 15 years in a spreadsheet: who pays each year, a gifts log for the look-back and a split of the family’s share among siblings; US (every state), UK and Ireland editions.' } : undefined;
const HOME_PLANNER = { name: 'Home Buying Planner (spreadsheet, US$15 one-time)', url: '/home-buying-planner/', what: 'The same rules in a spreadsheet you keep: every cost on the day, a month-by-month deposit plan, the lender tests and owning vs renting for 30 years; US, UK, Canada, Australia and Ireland editions.' };
const str = (description: string, values: string[]) => ({ type: 'string', enum: values, description });
/** Drop year-by-year arrays: agents get the summary, the page has the detail. */
const summary = <T extends Record<string, unknown>>(r: T) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'years'));

const RETIREMENT_INTL_PLANNER = { name: 'Retirement Planner, UK, Canada and Australia (spreadsheet, US$15 one-time)', url: '/retirement-planner/', what: 'The same year-by-year retirement plan to 95 in a spreadsheet you keep: a couple, three scenarios side by side and every tax line, with UK, Canada and Australia editions.' };

/**
 * "Can I retire at X?" for the UK, Canada and Australia: the agent's arguments become the calculator form's values
 * (src/lib/calc/retire/intl-ui.ts), so the tool and the page give the same answer.
 */
function retireIntlTool(ed: RetireEd, name: string, cur: string, extra: Record<string, unknown>, form: (a: any) => RetireValues, description: string): AgentTool {
  const ui = RETIRE_UI[ed];
  return {
    name, description, page: ui.path,
    inputSchema: { type: 'object', properties: {
      ...(ed === 'gb' ? { birthYear: num('Year of birth (sets the State Pension age)'), birthMonth: num('Month of birth 1-12 (matters for April 1960 - March 1961 and April 1977 - March 1978)') } : { age: num('Your age now') }),
      retireAge: num('Age you stop work'), salary: num(`Gross pay a year, ${cur}`), pensionPot: num(`Pension pots today, ${cur}`),
      contribPct: num('Your pension contributions, % of pay'), employerPct: num('Employer contributions, % of pay'),
      dbPension: num(`Defined benefit pension a year, ${cur} (0 if none)`), dbFromAge: num('Age the DB pension starts'),
      ...extra,
      savings: num(`Savings and investments outside pensions, ${cur}`), savingsAdd: num(`Added to savings each year until retirement, ${cur}`), spending: num(`Household spending a year in retirement after tax, today’s money, ${cur}`),
      household: str('Household', ['single', 'couple']), partnerAge: num('Partner age now'), partnerRetireAge: num('Partner retirement age'), partnerSalary: num(`Partner gross pay a year, ${cur}`), partnerPensionPot: num(`Partner pension pots, ${cur}`),
      growth: num('Pension growth % a year after charges (an assumption)'), inflation: num('Inflation % a year'),
    }, required: ['retireAge', 'spending'] },
    run: (a) => {
      const v: RetireValues = { ...retireDefaults(ed), 'p1-ukweekly': '' };
      const set = (k: string, x: unknown) => { if (x !== undefined && x !== null) v[k] = x as never; };
      set('household', a.household === 'couple' || a.household === 'married' ? 'couple' : 'single');
      set('p1-retire', a.retireAge); set('p1-draw', a.drawAge ?? a.retireAge); set('p1-salary', a.salary ?? 0); set('p1-pot', a.pensionPot ?? 0);
      set('p1-contrib', a.contribPct ?? 0); set('p1-employer', a.employerPct ?? 0); set('p1-db', a.dbPension ?? 0); set('p1-dbfrom', a.dbFromAge ?? a.retireAge);
      set('savings', a.savings ?? 0); set('savings-add', a.savingsAdd ?? 0); set('spending', a.spending); set('growth', a.growth); set('inflation', a.inflation);
      set('p2-retire', a.partnerRetireAge ?? a.retireAge); set('p2-salary', a.partnerSalary ?? 0); set('p2-pot', a.partnerPensionPot ?? 0);
      Object.assign(v, form(a));
      const plan = ui.toPlan(v);
      const r = project(plan, ui.pack);
      const today = (x: number, f: number) => Math.round(x / f);
      const ret = plan.people[0].retireAge;
      const key = r.rows.filter((y) => [ret, 67, 75, 85, 95].includes(y.age1)).map((y) => ({ age: y.age1, year: y.year, incomeAfterTax: today(y.netIncome, y.deflator), publicPensions: today(y.statePension + y.statePension2 + y.benefit, y.deflator), spending: today(y.spending, y.deflator), fromSavings: today(y.fromSavings, y.deflator), notCovered: today(y.shortfall, y.deflator), moneyLeft: today(y.savingsEnd + y.arfEnd + y.potEnd, y.deflator) }));
      return wrap(ui.path, {
        moneyLastsToAge: r.runOutAge == null ? 'past 95' : r.runOutAge - 1, firstShortYearAge: r.runOutAge, bridgeYears: r.bridgeYears,
        wealthAtRetirementTodaysMoney: Math.round(r.wealthAtRetirementToday), spendingThatLastsTo95: sustainableSpending(plan, ui.pack),
        ...(ed === 'gb' ? { statePensionAge: plan.people[0].statePensionAge, taxFreeLumpSums: Math.round(r.lumpSums.gross) } : {}),
        ...(ed === 'au' ? { overTransferBalanceCap: r.overThreshold } : {}),
        compare: compareRetireAges(plan, ui.pack, [60, 62, 65]).map((c) => ({ retireAge: c.retireAge, moneyLastsToAge: c.runOutAge == null ? 'past 95' : c.runOutAge - 1 })),
        keyYearsTodaysMoney: key, currency: ui.pack.currency,
      }, ui.pack.sources.map((x) => x.url), RETIREMENT_INTL_PLANNER);
    },
  };
}

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'ireland_what_can_i_claim',
    description: 'Ireland: list the social welfare payments and tax credits a household may get (Child Benefit, New Baby Grant, Working Family Payment, Maternity Benefit, Carer’s Allowance, State Pension, Fuel Allowance, Rent Tax Credit) with estimated amounts, using official 2026/2027 rates.',
    page: '/tools/ireland-what-can-i-claim/',
    inputSchema: { type: 'object', properties: {
      year: num('2026 or 2027', { enum: [2026, 2027] }), aged66: bool('Applicant is 66 or over'), couple: bool('Lives with a spouse, civil partner or cohabitant'),
      children: num('Number of children getting Child Benefit'), expecting: bool('Expecting a baby'), pay1: num('Applicant gross pay a year, EUR'), pay2: num('Partner gross pay a year, EUR'),
      hoursFortnight: num('Hours worked a fortnight, combined'), caring: bool('Cares full-time for someone'), renter: bool('Rents their home'), savings: num('Savings, EUR (not the home)'), prsiYears: num('Years of paid PRSI (for the State Pension)'),
    } },
    run: (a) => wrap('/tools/ireland-what-can-i-claim/', checkEntitlements({ year: a.year === 2026 ? 2026 : 2027, aged66: !!a.aged66, couple: !!a.couple, children: a.children ?? 0, expecting: !!a.expecting, pay1: a.pay1 ?? 0, pay2: a.pay2 ?? 0, hoursFortnight: a.hoursFortnight ?? 78, caring: !!a.caring, renter: !!a.renter, savings: a.savings ?? 0, prsiYears: a.prsiYears ?? 0 }),
      ['https://www.citizensinformation.ie/en/social-welfare/', 'https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/land-and-property/rent-credit/how-much-claim.aspx']),
  },
  {
    name: 'ireland_working_family_payment',
    description: 'Ireland: estimate the Working Family Payment (weekly, tax-free) for a family, from gross pay, number of children and hours worked, using the official income limits (2026, and +€30 from January 2027) and the 60% rule.',
    page: '/tools/ireland-working-family-payment-calculator/',
    inputSchema: { type: 'object', properties: { year: num('2026 or 2027', { enum: [2026, 2027] }), children: num('Number of children'), couple: bool('Has a spouse or partner'), pay1: num('Gross pay a year, EUR'), pay2: num('Partner gross pay a year, EUR'), pension: num('Pension contributions a year, EUR'), otherWeekly: num('Other assessable income a week, EUR'), hoursFortnight: num('Hours worked a fortnight, combined') }, required: ['children', 'pay1'] },
    run: (a) => wrap('/tools/ireland-working-family-payment-calculator/', computeWfp({ year: a.year === 2026 ? 2026 : 2027, children: a.children, couple: !!a.couple, pay1: a.pay1, pay2: a.pay2, pension: a.pension, otherWeekly: a.otherWeekly, hoursFortnight: a.hoursFortnight ?? 78 }),
      ['https://www.citizensinformation.ie/en/social-welfare/families-and-children/working-family-payment/']),
  },
  {
    name: 'ireland_rent_tax_credit',
    description: 'Ireland: how much Rent Tax Credit a renter can claim for each year 2022–2026 (20% of rent, capped per year), including back-claims. Claims for 2022 must be made by 31 December 2026 (Revenue four-year rule).',
    page: '/tools/ireland-rent-tax-credit-calculator/',
    inputSchema: { type: 'object', properties: { monthlyRent: num('Rent paid a month, EUR (same every year)'), couple: bool('Jointly assessed married couple or civil partners') }, required: ['monthlyRent'] },
    run: (a) => wrap('/tools/ireland-rent-tax-credit-calculator/', rentCredits([2022, 2023, 2024, 2025, 2026].map((year) => ({ year, rent: (Number(a.monthlyRent) || 0) * 12 })), !!a.couple),
      ['https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/land-and-property/rent-credit/how-much-claim.aspx', 'https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/four-year-rule/index.aspx']),
  },
  {
    name: 'ireland_carers_allowance',
    description: 'Ireland: estimate the weekly Carer’s Allowance from the official means test (income disregard €1,000/€2,000 from July 2026, €1,150/€2,300 from July 2027; savings bands; Department rate table).',
    page: '/tools/ireland-carers-allowance-calculator/',
    inputSchema: { type: 'object', properties: { period: { type: 'string', enum: ['h2-2026', 'h1-2027', 'h2-2027'], description: 'July–Dec 2026, Jan–Jun 2027, or from July 2027' }, aged66: bool('Carer is 66 or over'), caringForTwoOrMore: bool('Cares for two or more people'), couple: bool('Has a spouse or partner'), earn1: num('Carer weekly gross earnings, EUR'), earn2: num('Partner weekly gross earnings, EUR'), capital: num('Savings and investments, EUR (combined)') } },
    run: (a) => wrap('/tools/ireland-carers-allowance-calculator/', computeCarer({ period: a.period ?? 'h1-2027', aged66: !!a.aged66, caringForTwoOrMore: !!a.caringForTwoOrMore, couple: !!a.couple, earn1: a.earn1 ?? 0, earn2: a.earn2 ?? 0, capital: a.capital ?? 0 }),
      ['https://www.citizensinformation.ie/en/social-welfare/carers/carers-allowance/']),
  },
  {
    name: 'ireland_jobseekers_pay_related_benefit',
    description: 'Ireland: Jobseeker’s Pay-Related Benefit week by week for a job lost on or after 28 March 2025: 60% of average gross weekly pay up to €450 (weeks 1–13), 55% up to €375 (14–26), 50% up to €300 (27–39) with 260+ paid PRSI contributions, or 50% up to €300 for 26 weeks with 104–259; minimum €125; paid from the first Monday; apply within 6 weeks; redundancy has no effect; part-time days move to Jobseeker’s Benefit.',
    page: '/tools/ireland-jobseekers-benefit-calculator/',
    inputSchema: { type: 'object', properties: { lastDayOfWork: { type: 'string', description: 'Last day of work, YYYY-MM-DD' }, earnings: num('Gross pay before tax, EUR'), earningsPeriod: { type: 'string', enum: ['year', 'week'], description: 'Whether earnings is a yearly or a weekly figure (default year), e.g. "year"' }, weeksPaid: num('Weeks of PRSI paid in the 12 months averaged (default 52)'), totalPaidContributions: num('Class A/H/P PRSI contributions paid since starting work'), dateOfBirth: { type: 'string', description: 'YYYY-MM-DD' }, applyAfterWeeks: num('Weeks after the job ends before applying'), redundancyLumpSum: num('Redundancy payment, EUR'), partTimeDays: num('Part-time days worked a week (0–3)'), partTimeFromWeek: num('Benefit week the part-time work starts') }, required: ['lastDayOfWork', 'earnings', 'totalPaidContributions'] },
    run: (a) => wrap('/tools/ireland-jobseekers-benefit-calculator/', computeJprb({ lastDayOfWork: String(a.lastDayOfWork ?? ''), earnings: a.earnings ?? 0, earningsPeriod: a.earningsPeriod === 'week' ? 'week' : 'year', weeksPaid: a.weeksPaid ?? 52, totalPaidContributions: a.totalPaidContributions ?? 0, dateOfBirth: a.dateOfBirth, deferringStatePension: !!a.deferringStatePension, applyAfterWeeks: a.applyAfterWeeks ?? 0, redundancyLumpSum: a.redundancyLumpSum ?? 0, partTimeDays: a.partTimeDays ?? 0, partTimeFromWeek: a.partTimeFromWeek ?? 1 }),
      ['https://www.gov.ie/en/department-of-social-protection/publications/operational-guidelines-jobseekers-pay-related-benefit/', 'https://www.citizensinformation.ie/en/social-welfare/unemployed-people/jobseekers-pay-related-benefit/']),
  },
  {
    name: 'ireland_fuel_allowance',
    description: 'Ireland: check the Fuel Allowance means test (66+: €534 a week single, €640.80 from January 2027; under 66 needs a qualifying payment) and the 2026/27 season amount (€38, then €43 a week; €1,134 in lump sums).',
    page: '/tools/ireland-fuel-allowance-calculator/',
    inputSchema: { type: 'object', properties: { period: { type: 'string', enum: ['2026', '2027'], description: 'Which means-test limits apply: "2026" (to December 2026) or "2027" (from January 2027, Budget 2027 limits); default "2026"' }, aged66: bool('Applicant is 66 or over'), couple: bool('Lives with a partner'), partner66: bool('Partner is 66 or over'), qualifyingPayment: bool('Under 66: gets a qualifying social welfare payment'), householdOk: bool('Lives alone or only with people the rules allow'), incomeWeekly: num('Gross weekly income that counts, EUR'), capital: num('Savings, EUR') }, required: ['incomeWeekly'] },
    run: (a) => wrap('/tools/ireland-fuel-allowance-calculator/', computeFuel({ period: a.period === '2027' ? '2027' : '2026', aged66: a.aged66 ?? true, couple: !!a.couple, partner66: !!a.partner66, qualifyingPayment: !!a.qualifyingPayment, householdOk: a.householdOk ?? true, incomeWeekly: a.incomeWeekly, capital: a.capital ?? 0 }),
      ['https://www.citizensinformation.ie/en/social-welfare/extra-social-welfare-benefits/fuel-allowance/']),
  },
  {
    name: 'ireland_state_pension_contributory',
    description: 'Ireland: estimate the State Pension (Contributory) weekly rate under the Department’s Total Contributions Approach (paid PRSI + up to 520 credits + HomeCaring Periods; 2,080 for the full rate).',
    page: '/tools/ireland-state-pension-calculator/',
    inputSchema: { type: 'object', properties: { paidWeeks: num('Paid reckonable PRSI contributions (weeks)'), creditWeeks: num('Credited contributions (weeks)'), homeCaringWeeks: num('HomeCaring Periods (weeks)'), drawdown: { type: 'string', enum: ['2026-66', '2026-67', '2026-68', '2027-66'], description: 'Year and age the pension starts' } }, required: ['paidWeeks'] },
    run: (a) => wrap('/tools/ireland-state-pension-calculator/', computeTca({ paid: a.paidWeeks, credits: a.creditWeeks ?? 0, homeCaring: a.homeCaringWeeks ?? 0, maxRate: MAX_RATE[a.drawdown as string] ?? MAX_RATE['2027-66'] }),
      ['https://www.gov.ie/en/department-of-social-protection/publications/how-to-calculate-your-state-pension-contributory-rate/']),
  },
  {
    name: 'ireland_budget_2027_take_home',
    description: 'Ireland: take-home pay in 2026 against 2027 after Budget 2027 (income tax bands and credits, USC, PRSI, rent credit), line by line.',
    page: '/tools/ireland-budget-2027-calculator/',
    inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['single', 'single-parent', 'married-one', 'married-two'], description: 'Tax status: single, single-parent, married-one (one income) or married-two (two incomes), e.g. "married-two"' }, pay1: num('Gross pay a year, EUR'), pay2: num('Partner gross pay a year, EUR (married-two)'), selfEmployed: bool('Self-employed'), renter: bool('Claims the rent tax credit'), homeCarer: bool('Home carer credit (married-one)') }, required: ['status', 'pay1'] },
    run: (a) => wrap('/tools/ireland-budget-2027-calculator/', compareBudget({ status: a.status, pay1: a.pay1, pay2: a.pay2, selfEmployed: !!a.selfEmployed, renter: !!a.renter, homeCarer: !!a.homeCarer }),
      ['https://www.gov.ie/en/department-of-public-expenditure-infrastructure-public-service-reform-and-digitalisation/publications/your-guide-to-budget-2027/']),
  },
  {
    name: 'ireland_maternity_leave_pay',
    description: 'Ireland: each parent’s take-home pay in the year of maternity/paternity/parent’s leave against a normal year (Maternity Benefit €299 a week in 2026, €309 from 2027; taxed but no USC or PRSI), the household gap and a monthly saving target. Use this for an Irish couple’s after-tax household picture; for a quick gross comparison across countries use parental_leave_income_gap.',
    page: '/tools/ireland-maternity-benefit-calculator/',
    inputSchema: { type: 'object', properties: { year: num('2026 or 2027', { enum: [2026, 2027] }), motherSalary: num('Mother gross pay a year, EUR'), motherTopUpWeeks: num('Weeks the employer pays full salary'), motherUnpaidWeeks: num('Extra unpaid weeks (0–16)'), motherParents: bool('Mother also takes 9 weeks Parent’s Benefit'), partnerSalary: num('Partner gross pay a year, EUR (omit for none)'), partnerTopUpWeeks: num('Partner weeks on full salary'), partnerParents: bool('Partner also takes 9 weeks Parent’s Benefit') }, required: ['motherSalary'] },
    run: (a) => wrap('/tools/ireland-maternity-benefit-calculator/', householdLeave({ year: a.year === 2026 ? 2026 : 2027, mother: { salary: a.motherSalary, unpaidWeeks: a.motherUnpaidWeeks ?? 0, topUpWeeks: a.motherTopUpWeeks ?? 0, parents: !!a.motherParents }, partner: a.partnerSalary == null ? null : { salary: a.partnerSalary, topUpWeeks: a.partnerTopUpWeeks ?? 0, parents: !!a.partnerParents } }),
      ['https://www.citizensinformation.ie/en/social-welfare/families-and-children/maternity-benefit/'], LEAVE_PLANNER),
  },
  {
    name: 'ireland_help_to_buy',
    description: 'Ireland: Help to Buy refund for a first-time buyer of a new build or self-build: the lesser of €35,000 (contracts from 7 October 2026; €30,000 before), 10% of the price, or income tax + DIRT paid in the previous 4 years; price limit €500,000; mortgage at least 70% of the price. Scheme runs to the end of 2029.',
    page: '/tools/ireland-help-to-buy-calculator/',
    inputSchema: { type: 'object', properties: { price: num('Purchase price (or approved valuation for a self-build), EUR'), taxPaid: num('Income tax + DIRT paid by all buyers in the 4 tax years before applying, EUR'), mortgage: num('Mortgage amount, EUR'), contractDate: { type: 'string', description: 'Contract date YYYY-MM-DD (self-build: first drawdown). Default: today’s rules.' } }, required: ['price', 'taxPaid', 'mortgage'] },
    run: (a) => wrap('/tools/ireland-help-to-buy-calculator/', computeHtb({ price: a.price, taxPaid: a.taxPaid, mortgage: a.mortgage, contractDate: a.contractDate }),
      ['https://www.citizensinformation.ie/en/housing/owning-a-home/help-with-buying-a-home/help-to-buy-scheme/', 'https://www.gov.ie/en/department-of-finance/press-releases/department-of-finance-publishes-finance-bill-no2-2026/']),
  },
  {
    name: 'ireland_capital_gains_tax',
    description: 'Ireland: capital gains tax on a disposal (shares, crypto, property other than your home): 31% for disposals from 7 October 2026 (33% before), 33% on development land, €1,270 annual exemption, losses, and the payment deadline (15 December for January–November disposals). Not for Irish/EU ETFs or funds, which pay exit tax.',
    page: '/tools/ireland-cgt-calculator/',
    inputSchema: { type: 'object', properties: { disposalDate: { type: 'string', description: 'Date of the sale (contract date) YYYY-MM-DD' }, salePrice: num('Sale price, EUR'), purchasePrice: num('Purchase price, EUR'), costs: num('Buying and selling costs, EUR'), enhancement: num('Improvement costs, EUR'), losses: num('Allowable losses this year + carried forward, EUR'), exemptionUsed: num('Part of this year’s €1,270 exemption already used, EUR'), asset: str('Asset type', ['general', 'development-land']) }, required: ['disposalDate', 'salePrice', 'purchasePrice'] },
    run: (a) => wrap('/tools/ireland-cgt-calculator/', computeIeCgt({ disposalDate: a.disposalDate, salePrice: a.salePrice, purchasePrice: a.purchasePrice, costs: a.costs ?? 0, enhancement: a.enhancement, losses: a.losses, exemptionUsed: a.exemptionUsed, asset: a.asset }),
      ['https://www.revenue.ie/en/gains-gifts-and-inheritance/transfering-an-asset/how-to-calculate-cgt.aspx', 'https://www.revenue.ie/en/gains-gifts-and-inheritance/transfering-an-asset/when-and-how-do-you-pay-and-file-cgt.aspx'], ETF_TRACKER),
  },
  {
    name: 'ireland_inheritance_gift_tax',
    description: 'Ireland: Capital Acquisitions Tax (CAT) on a gift or inheritance: group threshold by relationship (A child €420,000, B sibling/niece/nephew/grandchild/parent €44,000, C everyone else €22,000 from 7 October 2026; €400,000/€40,000/€20,000 before), 33% above the unused threshold after earlier benefits in the same group since 5 December 1991, the €3,000 small gift exemption, whether an IT38 return is needed (above 80% of the threshold) and the 31 October pay-and-file date. Spouses and civil partners are exempt; reliefs (dwelling house, agricultural, business, favourite nephew) are not applied.',
    page: '/tools/ireland-inheritance-tax-calculator/',
    inputSchema: { type: 'object', properties: { group: str('Group by relationship to the person giving: A = child, B = parent/brother/sister/niece/nephew/grandparent/grandchild, C = anyone else', ['A', 'B', 'C']), kind: str('Gift (during life) or inheritance (on death)', ['gift', 'inheritance']), value: num('Market value received, less debts and costs paid by you, EUR'), date: { type: 'string', description: 'Date of the gift or inheritance YYYY-MM-DD (decides the threshold)' }, priorInGroup: num('Taxable value of earlier gifts/inheritances received in the same group since 5 December 1991, EUR (default 0)') }, required: ['group', 'value', 'date'] },
    run: (a) => wrap('/tools/ireland-inheritance-tax-calculator/', computeCat({ group: a.group, kind: a.kind === 'gift' ? 'gift' : 'inheritance', value: a.value, date: String(a.date), priorInGroup: a.priorInGroup ?? 0 }),
      ['https://www.revenue.ie/en/gains-gifts-and-inheritance/cat-thresholds-rates-and-aggregation-rules/cat-thresholds.aspx', 'https://www.revenue.ie/en/gains-gifts-and-inheritance/cat-thresholds-rates-and-aggregation-rules/cat-aggregation-rules.aspx', 'https://www.revenue.ie/en/gains-gifts-and-inheritance/cat-thresholds-rates-and-aggregation-rules/cat-groups.aspx']),
  },
  {
    name: 'ireland_myfuturefund_pension',
    description: 'Ireland: MyFutureFund (pension auto-enrolment, started January 2026): what you, your employer and the State pay in (1.5/1.5/0.5% rising to 6/6/2% by year 10, on pay up to €80,000) and the projected pot at retirement.',
    page: '/tools/ireland-myfuturefund-calculator/',
    inputSchema: { type: 'object', properties: { age: num('Age now'), salary: num('Gross pay a year, EUR'), retireAge: num('Retirement age (default 66)'), payGrowth: num('Pay growth % a year (default 2)'), investReturn: num('Investment return % a year before charges (default 5, an assumption)'), charges: num('Charges % a year (default 0.5)') }, required: ['age', 'salary'] },
    run: (a) => wrap('/tools/ireland-myfuturefund-calculator/', summary(computeMff({ age: a.age, salary: a.salary, retireAge: a.retireAge ?? 66, payGrowth: a.payGrowth ?? 2, investReturn: a.investReturn ?? 5, charges: a.charges ?? 0.5 }) as any),
      ['https://www.citizensinformation.ie/en/money-and-tax/personal-finance/pensions/auto-enrolment/', 'https://myfuturefund.ie/']),
  },
  {
    name: 'ireland_where_to_put_savings',
    description: 'Ireland: compare where a lump sum ends up after tax over a number of years: State Savings (tax-free), a bank deposit (DIRT 33%), ETFs (exit tax with 8-year deemed disposal), shares (CGT 31%) and a pension (tax relief). Growth for market products is an assumption you set.',
    page: '/tools/ireland-savings-investment-calculator/',
    inputSchema: { type: 'object', properties: { amount: num('Amount to put away, EUR'), years: num('Years'), marginalRate: num('Your income tax rate, 20 or 40', { enum: [20, 40] }), growth: num('Market growth % a year (default 5, an assumption)'), depositRate: num('Bank deposit rate % AER (default 2)') }, required: ['amount', 'years', 'marginalRate'] },
    run: (a) => wrap('/tools/ireland-savings-investment-calculator/', computeHomes({ amount: a.amount, years: a.years, marginalRate: a.marginalRate, growth: a.growth ?? 5, depositRate: a.depositRate ?? 2 }),
      ['https://www.ntma.ie/', 'https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/27-01a-02.pdf'], ETF_TRACKER),
  },
  {
    name: 'ireland_investment_account_vs_etf_vs_pension',
    description: 'Ireland: the new Individual Investment Account (IIA) under the Finance (No. 2) Bill 2026 as published on 19 October 2026 (not yet law; opens 1 July 2027 by ministerial order): up to €12,000 a year in, money only, 1% investment account tax a year on the average daily value above €50,000, no exit tax or deemed disposal inside. Compares what is left after tax at the horizon against an ETF outside the account (35% exit tax from 2027, 38% in 2026, 8-year deemed disposal with credit), direct shares (31% CGT above €1,270) and a pension/PRSA (relief at 20% or 40% within the age-related limit, 25% lump sum with the first €200,000 tax-free, rest at the retirement rate, locked until 60). Money above the IIA limit or the pension relief limit goes to the ETF in that option. Returns the ranking, year-by-year cash-out values, the first year the 1% applies, any year the ETF overtakes the IIA, and whether "pension first, then IIA, then ETF" holds on these assumptions. Growth is an assumption. Use this when someone in Ireland asks whether to use the new investment account, IIA or keep buying ETFs, or whether the account changes "max your pension first"; for a lump sum across State Savings, deposits, ETFs, shares and a pension use ireland_where_to_put_savings, and for existing ETF holdings’ deemed disposal dates use ireland_etf_exit_tax_lots.',
    page: '/tools/ireland-investment-account-calculator/',
    inputSchema: { type: 'object', properties: {
      contribution: num('Regular contribution, EUR per frequency'), frequency: str('How often the contribution is paid (default month)', ['month', 'year']),
      lumpSum: num('Lump sum invested at the start, EUR (counts towards the first year’s €12,000 IIA limit)'), years: num('Years to the horizon (1-40)'),
      growth: num('Growth % a year after charges, the same for every option (default 5, an assumption)'), marginalRate: num('Income tax rate now, 20 or 40', { enum: [20, 40] }),
      retirementRate: num('Income tax rate in retirement, 20 or 40 (default = marginalRate)', { enum: [20, 40] }), age: num('Age now (pension relief limit and access; default 35)'),
      pay: num('Gross pay a year for the pension relief limit, EUR (default 60,000; counted up to €115,000)'),
    }, required: ['contribution', 'years', 'marginalRate'] },
    run: (a) => {
      const r = computeIia({ contribution: a.contribution, frequency: a.frequency === 'year' ? 'year' : 'month', lumpSum: a.lumpSum ?? 0, years: a.years, growth: a.growth ?? 5, marginalRate: a.marginalRate, retirementRate: a.retirementRate, age: a.age ?? 35, pay: a.pay ?? 60000 });
      const { years, ...summary } = r;
      return wrap('/tools/ireland-investment-account-calculator/', { ...summary, basis: 'Finance (No. 2) Bill 2026 as published on 19 October 2026; not yet law', yearsSample: years.filter((y) => y.year % 5 === 0 || y.year === years.length) },
        ['https://data.oireachtas.ie/ie/oireachtas/bill/2026/98/eng/initiated/b9826d.pdf', 'https://data.oireachtas.ie/ie/oireachtas/bill/2026/98/eng/memo/b9826d-memo.pdf', 'https://www.oireachtas.ie/en/bills/bill/2026/98/',
          'https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/27-01a-02.pdf', 'https://www.revenue.ie/en/jobs-and-pensions/pension/relief/tax-relief-limits.aspx', 'https://www.revenue.ie/en/jobs-and-pensions/pension/private/retirement-lump-sums.aspx'], ETF_TRACKER);
    },
  },
  {
    name: 'ireland_overpay_mortgage_or_invest',
    description: 'Ireland: overpay the mortgage, invest, or top up a pension? Compares the same lump sum and/or extra monthly amount four ways at a horizon, after Irish tax: overpaying (keep the payment and shorten the term, or reduce the payment; interest saved, months cut, a tax-free return equal to the mortgage rate, freed payments saved after 33% DIRT), an Irish/EU ETF or fund (exit tax 38% in 2026, 35% from 2027, 8-year deemed disposal with credit), shares or an investment trust (CGT 31% above the €1,270 exemption) and a pension AVC/PRSA (relief at 20% or 40% within the age-related limit of 15%-40% of earnings up to €115,000; 25% lump sum tax-free up to €200,000, the rest taxed at the retirement rate; flags when it is still locked at the horizon). Returns the ranking, a plain verdict and the break-even growth rate at which each investment matches overpaying. Use this when someone in Ireland asks whether to overpay their mortgage or invest (ETFs, shares) or make pension AVCs, or whether to reduce the term or the payment; for a lump sum with no mortgage, use ireland_where_to_put_savings.',
    page: '/tools/ireland-overpay-mortgage-or-invest-calculator/',
    inputSchema: { type: 'object', properties: {
      lumpSum: num('Lump sum available now, EUR (default 0)'), monthlyExtra: num('Extra amount each month, EUR (default 0)'),
      balance: num('Mortgage balance, EUR'), ratePct: num('Mortgage interest rate, % a year'), termYears: num('Years left on the mortgage'),
      mode: str('After overpaying: keep the payment and shorten the term (default), or reduce the payment', ['shorten', 'reduce']),
      horizonYears: num('Compare after this many years (default 10)'), growthPct: num('Market growth % a year after charges (default 5, an assumption)'),
      marginalRate: num('Income tax rate now, 20 or 40', { enum: [20, 40] }), retirementRate: num('Income tax rate in retirement, 20 or 40 (default: same as now)', { enum: [20, 40] }),
      age: num('Age now'), pay: num('Gross pay a year for the pension limit, EUR (default 60000)'), pensionContributions: num('Own pension contributions already paid each year, EUR (default 0)'),
      accessAge: num('Age the pension can be drawn (default 60)'), depositRatePct: num('Deposit rate for freed payments, % AER (default 2.5)'),
    }, required: ['balance', 'ratePct', 'termYears', 'marginalRate', 'age'] },
    run: (a) => {
      const r = computeOverpay({ lumpSum: a.lumpSum ?? 0, monthlyExtra: a.monthlyExtra ?? 0, balance: a.balance, ratePct: a.ratePct, termYears: a.termYears, mode: a.mode, horizonYears: a.horizonYears ?? 10, growthPct: a.growthPct ?? 5, marginalRate: a.marginalRate, retirementRate: a.retirementRate, age: a.age, pay: a.pay, pensionContributions: a.pensionContributions, accessAge: a.accessAge, depositRatePct: a.depositRatePct });
      return wrap('/tools/ireland-overpay-mortgage-or-invest-calculator/', { ...r, assumptions: 'Same money in every option; constant mortgage rate; growth is an assumption (growth only, no dividends); everything sold or drawn at the horizon; USC on pension drawdown not included. On these assumptions only, not advice.' },
        ['https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/27-01a-02.pdf', 'https://www.revenue.ie/en/gains-gifts-and-inheritance/transfering-an-asset/how-to-calculate-cgt.aspx', 'https://www.revenue.ie/en/jobs-and-pensions/pension/relief/tax-relief-limits.aspx', 'https://www.revenue.ie/en/jobs-and-pensions/pension/private/retirement-lump-sums.aspx', 'https://www.revenue.ie/en/additional-incomes/dirt/what-dirt-rate-is-applicable.aspx', 'https://www.ccpc.ie/manage-your-money/buying-a-home/about-mortgages/paying-extra-off-your-mortgage'], ETF_TRACKER);
    },
  },
  {
    name: 'ireland_pcp_vs_car_loan',
    description: 'Ireland: PCP vs car loan (credit union or bank) vs paying cash for a car. PCP: deposit or trade-in, level monthly payments that leave the GMFV (balloon) owed at the end, then pay the GMFV to own the car or hand it back (excess-km charge applied on hand back only); you do not own a PCP car until the final payment and cannot sell it without the lender’s permission, and the half rule (Consumer Credit Act 1995) lets you hand it back once half the total amount payable is paid. Loan: standard amortisation, you own the car from day one; a balance still owed at the end of the PCP term is counted as cleared then. Cash: the savings interest given up after 33% DIRT. APR is treated as an effective annual rate (EU Directive 2008/48/EC Annex I): monthly rate = (1 + APR)^(1/12) − 1; fees not modelled. Returns each route’s monthly payment, total paid, cost of credit, savings interest lost, car value kept and net cost over the PCP term (payments + lost interest − car value), the ranking, PCP total payable, the half-rule point, equity (end value − GMFV) and a plain verdict. All rates, the GMFV and the end value are the user’s figures or stated assumptions. Use this when someone in Ireland asks whether a PCP or a credit union/bank car loan is cheaper, whether to pay cash or finance a car, what the GMFV or balloon means for them, or when they can hand back a PCP car.',
    page: '/tools/ireland-pcp-vs-car-loan-calculator/',
    inputSchema: { type: 'object', properties: {
      price: num('Cash price of the car, EUR'), deposit: num('Deposit or trade-in value for the PCP and the loan, EUR (default 0)'),
      pcpAprPct: num('PCP APR %'), pcpTermMonths: num('PCP term in months (default 36)'), gmfv: num('GMFV / balloon payment due at the end of the PCP, EUR'),
      kmAllowance: num('PCP mileage allowance, km a year (default 15000)'), expectedKm: num('Expected driving, km a year (default = allowance)'), excessCentPerKm: num('Excess mileage charge, cent per km (default 10, an assumption)'),
      loanAprPct: num('Car loan APR % (credit union or bank)'), loanTermMonths: num('Car loan term in months (default 60)'),
      savingsRatePct: num('Savings rate % AER before DIRT, for the cost of paying cash (default 2.5)'), endValue: num('Expected value of the car at the end of the PCP term, EUR (default = GMFV)'),
    }, required: ['price', 'pcpAprPct', 'gmfv', 'loanAprPct'] },
    run: (a) => {
      const allowance = a.kmAllowance ?? 15000;
      const r = computePcp({ price: a.price, deposit: a.deposit ?? 0, pcpAprPct: a.pcpAprPct, pcpTermMonths: a.pcpTermMonths ?? 36, gmfv: a.gmfv, kmAllowance: allowance, expectedKm: a.expectedKm ?? allowance, excessCentPerKm: a.excessCentPerKm ?? 10, loanAprPct: a.loanAprPct, loanTermMonths: a.loanTermMonths ?? 60, savingsRatePct: a.savingsRatePct ?? 2.5, endValue: a.endValue });
      const { balances: _pb, ...pcp } = r.pcp; const { balances: _lb, ...loan } = r.loan;
      return wrap('/tools/ireland-pcp-vs-car-loan-calculator/', { ...r, pcp, loan, assumptions: 'Measured at the end of the PCP term; same car and end value in every route; savings interest after 33% DIRT; fees, insurance and running costs not included; rates are the inputs, not market rates. On these assumptions only, not advice.' },
        ['https://www.ccpc.ie/manage-your-money/borrowing-money/car-loans-and-car-finance/personal-contract-plan', 'https://www.ccpc.ie/manage-your-money/borrowing-money/car-loans-and-car-finance/paying-for-your-car', 'https://www.ccpc.ie/manage-your-money/borrowing-money/car-loans-and-car-finance/hire-purchase', 'https://www.citizensinformation.ie/en/money-and-tax/personal-finance/loans-and-credit/hire-purchase/', 'https://www.revenue.ie/en/additional-incomes/dirt/what-dirt-rate-is-applicable.aspx', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008L0048']);
    },
  },
  {
    name: 'uk_pension_drawdown',
    description: 'UK: is my pension pot enough? One person living on a defined contribution pot in drawdown (plus ISAs, the new State Pension and any DB pension), year by year from tax year 2027-28 to an end age. Taxes every withdrawal with UK income tax (England, Wales and NI or Scotland; personal allowance £12,570 tapered above £100,000; thresholds frozen to 2030-31 by Finance Act 2026 s.10, then raised with inflation): 25% tax-free up to the £268,275 Lump Sum Allowance, either taken up front (optionally also drawing taxable income up to the personal allowance each year) or as 25% of each UFPLS (HMRC PTM063300). State Pension from the age set by date of birth (full rate £250.70 a week from April 2027), rising with inflation; minimum pension age 55, 57 from 6 April 2028. Returns the age the money runs out at a steady return (null = lasts), the highest spending that lasts to the end age, a seeded Monte Carlo (1,000 lognormal return paths centred on the return, with the volatility given): the chance the spending lasts, the run-out age in the worst 10% of paths and the spending that lasts in 90% of paths; the tax-free cash taken, first-year and lifetime income tax, and the three tax-free-cash methods compared. Return, inflation and volatility are the user’s assumptions. Use this when someone in the UK asks whether their pension pot is enough to retire, how long drawdown will last, how much they can safely withdraw, or whether to take the 25% tax-free cash up front or as UFPLS.',
    page: '/tools/uk-pension-drawdown-calculator/',
    inputSchema: { type: 'object', properties: {
      age: num('Age now (retired from now)'), pot: num('Pension pots not yet touched, GBP'), isa: num('ISAs and other savings, GBP (default 0)'),
      spending: num('Spending a year after tax, GBP, today’s money'), statePensionWeekly: num('State Pension a week, GBP (default 250.70, the full rate from April 2027)'),
      statePensionAge: num('State Pension age (default from the birth year implied by age)'), dbPension: num('Final salary or other taxable pension a year, GBP (default 0)'), dbAge: num('Age that pension starts'),
      lsaUsed: num('Tax-free lump sums already taken or due from other pensions, GBP; they use up the £268,275 Lump Sum Allowance (default 0)'),
      region: str('Where you pay income tax', ['rUK', 'scotland']), strategy: str('How the 25% tax-free part is taken (default pcls-fill)', ['pcls-fill', 'ufpls', 'pcls-first']),
      growth: num('Return after charges, % a year (default 5)'), inflation: num('Inflation, % a year (default 2.5)'), volatility: num('Volatility, % a year (default 10)'), endAge: num('Plan to age (default 95)'),
    }, required: ['age', 'pot', 'spending'] },
    run: (a) => {
      const strategy: DdStrategy = ['pcls-fill', 'ufpls', 'pcls-first'].includes(a.strategy) ? a.strategy : 'pcls-fill';
      const i = { age: a.age, pot: a.pot, isa: a.isa ?? 0, spending: a.spending, statePensionWeekly: a.statePensionWeekly ?? 250.7, statePensionAge: a.statePensionAge, dbPension: a.dbPension ?? 0, dbAge: a.dbAge, lsaUsed: a.lsaUsed ?? 0, region: a.region === 'scotland' ? 'scotland' as const : 'rUK' as const, strategy, growth: a.growth ?? 5, inflation: a.inflation ?? 2.5, volatility: a.volatility ?? 10, endAge: a.endAge ?? 95 };
      const r = ddSimulate(i, undefined, false);
      const mc = ddMonteCarlo(i);
      return wrap('/tools/uk-pension-drawdown-calculator/', {
        runOutAge: r.runOutAge, sustainableSpending: ddSustainable(i), spendingThatLasts90pct: ddSafe(i), chanceSpendingLasts: Math.round(mc.success * 1000) / 1000, worst10pctRunOutAge: mc.p10RunOut,
        taxFreeCashTaken: Math.round(r.taxFreeTaken), firstYearIncomeTax: Math.round(r.firstYearTax), statePensionAge: r.statePensionAge, yearsBeforeStatePension: r.bridgeYears,
        methods: ddCompare(i).map((c) => ({ method: c.strategy, label: c.label, runOutAge: c.runOutAge, sustainableSpending: c.sustainable, incomeTaxTodaysMoney: Math.round(c.totalTax) })),
        assumptions: 'One person; withdrawals at the start of each year; State Pension and DB pension rise with inflation; ISAs and tax-free cash grow tax-free and are used after pension money; Monte Carlo returns lognormal, centred on the return given, inflation fixed; Marriage Allowance, savings and dividend tax outside ISAs, annuities and inheritance tax not included. On these assumptions only, not advice.',
      }, [DRAWDOWN_SOURCES.taxFree, DRAWDOWN_SOURCES.ufpls, DRAWDOWN_SOURCES.lsa, DRAWDOWN_SOURCES.it, DRAWDOWN_SOURCES.freeze, DRAWDOWN_SOURCES.scot, DRAWDOWN_SOURCES.sp, DRAWDOWN_SOURCES.spa, DRAWDOWN_SOURCES.nmpa]);
    },
  },
  {
    name: 'netherlands_30_ruling',
    description: 'Netherlands: what the 30% ruling (expat scheme) saves in income tax for 2026, or 2027 when the maximum falls to 27% (Tax Plan 2025). Allowance = the smallest of 30%/27% of salary, salary minus the norm (2026: €48,013, or €36,497 under 30 with a master\'s; 2027 new rulings €52,521 in 2026 prices), and the WNT cap (€78,600 in 2026; €73,710 in 2027). Rulings that started before 2024 keep 30%; 2024 starters move to 27% with the old norm. Income tax from the Belastingdienst 2026 box 1 tables with the general and labour tax credits (2027 uses the 2026 tables). Use this when someone asks how much the 30% ruling is worth or whether they qualify.',
    page: '/tools/netherlands-30-ruling-calculator/',
    inputSchema: { type: 'object', properties: {
      salary: num('Gross annual salary including the tax-free allowance, EUR'),
      year: { type: 'number', enum: [2026, 2027], description: 'Tax year (default 2026)' },
      start: { type: 'string', enum: ['before-2024', '2024', '2025-or-later'], description: 'When the ruling started (default 2025-or-later)' },
      youngMasters: { type: 'boolean', description: 'Under 30 with a Dutch academic master\'s or equivalent' },
    }, required: ['salary'] },
    run: (a) => {
      const r = nlRuling({ salary: a.salary, year: a.year === 2027 ? 2027 : 2026, start: a.start ?? '2025-or-later', youngMasters: !!a.youngMasters });
      return wrap('/tools/netherlands-30-ruling-calculator/', { ...r, assumptions: 'Income from this job only, below AOW age, full year; pension contributions and other deductions not included; 2027 uses the 2026 tax tables and the 2027 norm is in 2026 prices until the indexed figure is published. Not tax advice.' }, [RULING_SOURCES.ruling, RULING_SOURCES.box1]);
    },
  },
  {
    name: 'uk_payments_on_account',
    description: "UK Self Assessment: what is due on 31 January (balancing payment for the year just ended + first payment on account for the next) and 31 July (second payment on account). Each payment on account is half of the previous year's Self Assessment bill (income tax + Class 4 NI); none if that bill was under £1,000 or more than 80% of the tax was taken at source; capital gains tax and student loan go in the balancing payment only (gov.uk). Reproduces the gov.uk worked example. Use this when someone asks how much Self Assessment tax they pay in January or July.",
    page: '/tools/uk-payments-on-account-calculator/',
    inputSchema: { type: 'object', properties: {
      year: num('Tax year just ended, as its first calendar year (2025 = 2025-26)'), saBill: num('Self Assessment bill for that year: income tax + Class 4 NI, GBP'),
      paidOnAccount: num('Payments on account already made towards that year, GBP (default 0)'), atSource: num('Tax taken at source (PAYE, savings), GBP (default 0)'),
      cgt: num('Capital gains tax for that year, GBP (default 0)'), studentLoan: num('Student loan through Self Assessment, GBP (default 0)'),
    }, required: ['year', 'saBill'] },
    run: (a) => {
      const r = paymentsOnAccount({ year: a.year, saBill: a.saBill, atSource: a.atSource ?? 0, cgt: a.cgt ?? 0, studentLoan: a.studentLoan ?? 0, paidOnAccount: a.paidOnAccount ?? 0 });
      return wrap('/tools/uk-payments-on-account-calculator/', { ...r, assumptions: 'Class 2 NI, interest and penalties not included; an overpaid balance is shown as 0 due. Not tax advice.' }, [POA_SOURCES.guide]);
    },
  },
  {
    name: 'ireland_severance_tax',
    description: "Ireland: how much of a redundancy or severance package is tax-free and the tax on the rest (Revenue Tax and Duty Manual Part 05-05-19, March 2026). Statutory redundancy is exempt; of the ex-gratia lump sum, the highest of the basic exemption (€10,160 + €765 per complete year), the increased exemption (+€10,000 less any tax-free pension lump sum, if not claimed in the last 10 years) and SCSB (average pay × years ÷ 15, less the pension lump sum) is tax-free, capped at €200,000 for life; the excess is taxed as pay (income tax and USC, not PRSI). Also shows the result if the pension lump sum is given up. Reproduces Revenue's 11 worked examples. Use this when someone in Ireland asks how much tax they will pay on a redundancy or severance payment.",
    page: '/tools/ireland-severance-tax-calculator/',
    inputSchema: { type: 'object', properties: {
      lumpSum: num('Severance on top of statutory redundancy (ex-gratia, non-contractual), EUR'), years: num('Complete years of service'),
      avgPay: num('Average annual taxable pay over the last 36 months, EUR'), weeklyPay: num('Gross weekly pay now, EUR (for statutory redundancy; default avgPay / 52)'),
      months: num('Extra months beyond the complete years (default 0)'), redundancy: bool('Genuine redundancy with 2+ years service, so statutory redundancy is due (default true)'),
      pensionLumpSum: num('Tax-free pension lump sum from this job (received or due later), EUR (default 0)'), waive: bool('Irrevocably give up that pension lump sum (default false)'),
      claimedIn10Years: bool('Received more than the basic exemption on a termination payment in the last 10 years (default false)'), priorExempt: num('Exemptions already used on earlier payments, EUR (default 0)'),
      year: num('Tax year of the payment, 2026 or 2027 (default 2026)', { enum: [2026, 2027] }), status: str('Tax status (default single)', ['single', 'single-parent', 'married-one', 'married-two']),
      payThisYear: num('Other taxable pay in the same tax year, EUR (default 0)'), spousePay: num('Spouse pay (married-two), EUR (default 0)'),
    }, required: ['lumpSum', 'years', 'avgPay'] },
    run: (a) => {
      const r = computeSeverance({ redundancy: a.redundancy ?? true, years: a.years, months: a.months ?? 0, weeklyPay: a.weeklyPay ?? a.avgPay / 52, avgPay: a.avgPay, lumpSum: a.lumpSum,
        pensionLumpSum: a.pensionLumpSum ?? 0, waive: !!a.waive, claimedIn10Years: !!a.claimedIn10Years, priorExempt: a.priorExempt ?? 0, year: a.year === 2027 ? 2027 : 2026,
        status: ['single', 'single-parent', 'married-one', 'married-two'].includes(a.status) ? a.status : 'single', payThisYear: a.payThisYear ?? 0, spousePay: a.spousePay ?? 0 });
      return wrap('/tools/ireland-severance-tax-calculator/', { ...r, assumptions: 'Contractual payments (including contractual pay in lieu of notice) are taxable in full and are not modelled. Not tax advice.' },
        ['https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-05/05-05-19.pdf', 'https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/lump-sum-payments/basic-exemption.aspx'], RETIREMENT_PLANNER);
    },
  },
  {
    name: 'car_ownership_5_year_cost',
    description: 'The true 5-year cost of owning a car (US, UK, Canada, Australia, Ireland, Switzerland or New Zealand): depreciation, loan interest, insurance, fuel or charging, maintenance and sales tax, plus the effective monthly cost. Any input left out uses that country\'s default (the calculator page\'s example). US/UK take miles and mpg; the other countries take kilometres and litres per 100 km. Use this when someone asks what a car (or a small SUV) really costs to own over five years.',
    page: '/tools/car-ownership-calculator/',
    inputSchema: { type: 'object', properties: {
      country: str('Country (default us)', ['us', 'gb', 'ca', 'au', 'ie', 'ch', 'nz']), vehicleType: str('Vehicle (default new_gas)', ['new_gas', 'used_gas', 'new_ev', 'used_ev', 'new_hybrid']),
      price: num('Purchase price'), down: num('Down payment'), loanRate: num('Loan APR, %'), loanMonths: num('Loan term in months (default 60)'),
      distancePerYear: num('Miles a year (US/UK) or km a year (others)'), fuelEconomy: num('mpg (US/UK) or litres per 100 km (others)'), fuelPrice: num('Fuel price per gallon (US), per litre (others)'),
      insurance: num('Insurance a year'), maintenance: num('Maintenance a year'), salesTaxRate: num('Sales tax / VAT / HST %, if not in the price'),
    } },
    run: (a) => {
      const cc = String(a.country || 'us').toUpperCase();
      const D = defaultsFor(cc, 'car-ownership-calculator');
      const r = computeCarOwnership({ vehicleType: a.vehicleType || 'new_gas', price: a.price ?? D.purchasePrice, down: a.down ?? D.downPayment, loanRate: a.loanRate ?? D.loanRate,
        loanMonths: a.loanMonths ?? 60, milesPerYear: a.distancePerYear ?? D.milesPerYear, mpg: a.fuelEconomy ?? D.mpg, fuelPrice: a.fuelPrice ?? D.fuelPrice,
        annualInsurance: a.insurance ?? D.annualInsurance, annualMaint: a.maintenance ?? D.annualMaint, salesTaxRate: a.salesTaxRate ?? D.salesTaxRate,
        metric: ['CA', 'AU', 'IE', 'CH', 'NZ'].includes(cc), pricePerLitre: cc === 'GB' });
      const round = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v]));
      return wrap(cc === 'US' ? '/tools/car-ownership-calculator/' : `/${cc.toLowerCase()}/tools/car-ownership-calculator/`, { ...round, assumptions: 'Depreciation uses typical curves by vehicle type; fuel and insurance are your inputs or the country defaults. Not advice.' }, []);
    },
  },
  {
    name: 'compound_interest',
    description: 'Compound interest: what a starting amount plus monthly contributions grows to at a given annual rate, and how much of the final balance is money paid in versus interest. Compounding monthly unless set. Pure arithmetic, before tax and inflation. Use this for "how much will my savings grow" questions.',
    page: '/tools/compound-interest-calculator/',
    inputSchema: { type: 'object', properties: {
      principal: num('Starting amount (default 0)'), monthly: num('Monthly contribution (default 0)'), ratePct: num('Annual interest or return, %'), years: num('Years'),
      compounding: num('Compounds a year: 1, 4, 12 or 365 (default 12)', { enum: [1, 4, 12, 365] }),
    }, required: ['ratePct', 'years'] },
    run: (a) => {
      const r = computeCompoundInterest({ principal: a.principal ?? 0, monthly: a.monthly ?? 0, ratePct: a.ratePct, years: a.years, compounding: a.compounding ?? 12 });
      return wrap('/tools/compound-interest-calculator/', { futureValue: Math.round(r.futureValue), totalContributed: Math.round(r.totalContributed), totalInterest: Math.round(r.totalInterest),
        interestShare: r.futureValue > 0 ? Math.round((r.totalInterest / r.futureValue) * 1000) / 10 : 0, assumptions: 'Nominal, before tax and inflation; contributions at each period.' }, []);
    },
  },
  {
    name: 'debt_avalanche_vs_snowball',
    description: 'Debt payoff: compares the avalanche (highest interest rate first) with the snowball (smallest balance first) for a list of debts and an extra monthly payment. Returns months to debt-free and total interest for each, and how much the avalanche saves. Flags debts the payments never clear. Use this when someone asks which debt to pay off first or how long it will take.',
    page: '/tools/debt-payoff-calculator/',
    inputSchema: { type: 'object', properties: {
      debts: { type: 'array', description: 'Debts: name, balance, APR % and minimum monthly payment', items: { type: 'object', properties: { name: { type: 'string' }, balance: num('Balance'), apr: num('APR, %'), minPay: num('Minimum monthly payment') }, required: ['balance', 'apr', 'minPay'] } },
      extraPayment: num('Extra paid each month on top of the minimums (default 0)'),
    }, required: ['debts'] },
    run: (a) => {
      const debts: PayoffDebt[] = (a.debts || []).map((d: any, i: number) => ({ name: d.name || `Debt ${i + 1}`, balance: Number(d.balance) || 0, apr: Number(d.apr) || 0, minPay: Number(d.minPay) || 0 }));
      const r = comparePayoff(debts, a.extraPayment ?? 0);
      const s1 = (x: any) => ({ months: x.months, totalInterest: Math.round(x.totalInterest), neverRepaid: x.neverRepaid });
      return wrap('/tools/debt-payoff-calculator/', { avalanche: s1(r.avalanche), snowball: s1(r.snowball), avalancheWins: r.avalancheWins, interestSaved: Math.round(r.interestSaved) }, []);
    },
  },
  {
    name: 'salary_negotiation_lifetime_value',
    description: 'What negotiating a higher starting salary is worth over a career: the extra pay over the years with the same yearly raises (each raise builds on the higher base), plus what saving a share of the difference grows to. Inputs left out use the country defaults from the calculator page. Use this when someone asks whether it is worth negotiating a job offer, or what a few thousand more is worth long term.',
    page: '/tools/salary-negotiation-calculator/',
    inputSchema: { type: 'object', properties: {
      country: str('Country (default us)', ['us', 'gb', 'ca', 'au', 'ie', 'ch', 'nz']), offer: num('Salary offered'), target: num('Salary you ask for or get'), years: num('Career years (default 30)'),
      annualRaise: num('Yearly raise, % (default 3)'), saveSharePct: num('Share of the difference saved for retirement, % (default 6)'), investReturn: num('Return on savings, % (default 7)'),
    }, required: ['offer', 'target'] },
    run: (a) => {
      const D = defaultsFor(String(a.country || 'us').toUpperCase(), 'salary-negotiation-calculator');
      const r = computeSalaryNegotiation({ offer: a.offer, target: a.target, years: a.years ?? D.careerYears ?? 30, annualRaise: a.annualRaise ?? D.annualRaise ?? 3,
        retirement401k: a.saveSharePct ?? D.retirement401k ?? 6, investReturn: a.investReturn ?? D.investReturn ?? 7, marketLow: D.marketLow ?? 0, marketHigh: D.marketHigh ?? 0 });
      return wrap('/tools/salary-negotiation-calculator/', { immediateYearly: Math.round(r.diff), lifetimePay: Math.round(r.lifeDiff), savingsGrowth: Math.round(r.k401), total: Math.round(r.total),
        assumptions: 'Gross pay, before tax; the same yearly raise on both salaries.' }, []);
    },
  },
  {
    name: 'remote_work_savings',
    description: 'What working from home saves (or costs) in a year compared with commuting: car or transit commuting costs, lunches and work clothes saved, less extra home utilities, internet and equipment, and any pay cut. Driving cost uses the country\'s official per-mile or per-km rate. Inputs left out use the country defaults from the calculator page. Use this when someone asks how much remote work saves or whether a pay cut to work remotely is worth it.',
    page: '/tools/remote-work-calculator/',
    inputSchema: { type: 'object', properties: {
      country: str('Country (default us)', ['us', 'gb', 'ca', 'au', 'ie', 'ch', 'nz']), officeDays: num('Office days a week'), commuteDistance: num('One-way commute, miles (US/UK) or km (others)'),
      mode: str('Commute (default car)', ['car', 'transit', 'both']), transitMonthly: num('Monthly transit fares or parking'), lunchPerDay: num('Lunch and coffee per office day'),
      clothingYear: num('Work clothes a year'), salary: num('Salary'), payCutPct: num('Pay cut for going remote, % (default 0)'),
    } },
    run: (a) => {
      const cc = String(a.country || 'us').toUpperCase();
      const D = defaultsFor(cc, 'remote-work-calculator');
      const rate = ((COUNTRY_PACKS as any)[cc] || (COUNTRY_PACKS as any).US)['remote-work-calculator'].data.mileageRate;
      const r = computeRemoteWork({ commuteDays: a.officeDays ?? D.commuteDays, commuteMiles: a.commuteDistance ?? D.commuteMiles, mode: a.mode || 'car', transitCost: a.transitMonthly ?? D.transitCost ?? 0,
        lunchCost: a.lunchPerDay ?? D.lunchCost, clothing: a.clothingYear ?? D.clothingCost, utilities: D.utilities, internet: D.internet, equipment: D.equipment, homeCoffee: D.homeCoffee,
        salary: a.salary ?? D.salary, payCut: a.payCutPct ?? D.payCut ?? 0, irsRate: rate });
      const rd = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v]));
      return wrap(cc === 'US' ? '/tools/remote-work-calculator/' : `/${cc.toLowerCase()}/tools/remote-work-calculator/`, { ...rd, perMileOrKmRate: rate, assumptions: 'Yearly figures; equipment spread over 3 years; before tax.' }, []);
    },
  },
  {
    name: 'college_cost_total',
    description: 'The full cost of a degree: net tuition after grants, housing and food, books, transport, loan interest (10-year repayment) and the pay given up while studying. US defaults are College Board 2026-27 public four-year figures; other countries use the calculator page\'s defaults. Use this when someone asks what college or university really costs.',
    page: '/tools/college-cost-calculator/',
    inputSchema: { type: 'object', properties: {
      country: str('Country (default us)', ['us', 'gb', 'ca', 'au', 'ie', 'ch', 'nz']), years: num('Years of study (default 4; 3 in GB, AU, CH)'), tuition: num('Tuition and fees a year'), grants: num('Grants a year'),
      housing: num('Housing and food a year (0 if living at home)'), books: num('Books and supplies a year'), transport: num('Transport a year'),
      loansPerYear: num('Borrowed each year'), loanRate: num('Loan rate, %'), forgoneWage: num('Pay given up a year while studying'),
    } },
    run: (a) => {
      const cc = String(a.country || 'us').toUpperCase();
      const D = defaultsFor(cc, 'college-cost-calculator');
      const r = computeCollegeCost({ years: a.years ?? (['GB', 'AU', 'CH'].includes(cc) ? 3 : 4), annualTuition: a.tuition ?? D.annualTuition, annualGrants: a.grants ?? D.annualGrants,
        roomBoard: a.housing ?? D.roomBoard, booksSupplies: a.books ?? D.booksSupplies, transportation: a.transport ?? D.transportation, annualLoans: a.loansPerYear ?? D.annualLoans,
        loanRate: a.loanRate ?? D.loanRate, opportunityWage: a.forgoneWage ?? D.opportunityWage });
      return wrap(cc === 'US' ? '/tools/college-cost-calculator/' : `/${cc.toLowerCase()}/tools/college-cost-calculator/`, {
        directCost: Math.round(r.directCost), totalWithInterestAndForgonePay: Math.round(r.total), loanInterest: Math.round(r.totalInterest), loanAtGraduation: Math.round(r.loanAtGrad),
        monthlyRepayment: Math.round(r.monthlyPayment), forgonePay: Math.round(r.totalOpportunityCost), assumptions: 'Today\'s prices, no inflation; 10-year standard repayment.' },
        cc === 'US' ? ['https://research.collegeboard.org/trends/college-pricing/highlights', 'https://studentaid.gov/understand-aid/types/loans/interest-rates'] : []);
    },
  },
  {
    name: 'home_buying_first_year_cost',
    description: 'The first-year cost of buying a home on top of the deposit and the loan principal: one-off buying costs (closing costs or stamp duty and fees, moving) and the year\'s mortgage interest, property tax, insurance, HOA or service charge, mortgage insurance and maintenance. Inputs left out use the country defaults from the calculator page. Use this when someone asks what owning a home really costs in the first year.',
    page: '/tools/home-buying-cost-calculator/',
    inputSchema: { type: 'object', properties: {
      country: str('Country (default us)', ['us', 'gb', 'ca', 'au', 'ie', 'ch', 'nz']), price: num('Purchase price'), downPct: num('Deposit, %'), interestRate: num('Mortgage rate, %'), termYears: num('Mortgage term in years (default 30)'),
    } },
    run: (a) => {
      const cc = String(a.country || 'us').toUpperCase();
      const D = defaultsFor(cc, 'home-buying-cost-calculator');
      const price = a.price ?? D.purchasePrice;
      const r = computeHomeBuying({ purchasePrice: price, downPct: a.downPct ?? D.downPct, interestRate: a.interestRate ?? D.interestRate, loanTermYears: a.termYears ?? 30,
        closingPct: D.closingPct, inspectionCost: D.inspectionCost, propTaxRate: D.propTaxRate, propTaxIsFlat: propTaxIsFlatFor(cc), hoiAnnual: D.hoiAnnual, pmiRate: D.pmiRate,
        hoaMonthly: D.hoaMonthly, maintPct: D.maintPct, movingCost: D.movingCost, isGB: cc === 'GB', transferTax: cc === 'IE' ? ieStampDuty(price) : undefined });
      return wrap(cc === 'US' ? '/tools/home-buying-cost-calculator/' : `/${cc.toLowerCase()}/tools/home-buying-cost-calculator/`, {
        firstYearCost: Math.round(r.totalYr1), oneOffCosts: Math.round(r.oneTimeTotal), recurringYear: Math.round(r.recurringAnnual), downPayment: Math.round(r.downPayment),
        monthlyPrincipalAndInterest: Math.round(r.monthlyPI), rows: r.rows.map((x) => ({ item: x.key, amount: Math.round(x.value), oneOff: x.oneTime })),
        assumptions: 'Country default fees, tax and insurance unless given; transfer tax only where it is national (GB, IE). Not advice.' }, [], ['US', 'GB', 'CA', 'AU', 'IE'].includes(cc) ? HOME_PLANNER : undefined);
    },
  },
  {
    name: 'emergency_fund_target',
    description: 'How big an emergency fund should be for a household: essential monthly spending times a recommended number of months (3 to 9) that rises with less stable work, a single income and higher health risk; plus the gap to close and how many months it takes at a given monthly saving. Any currency. Use this when someone asks how much emergency savings they need.',
    page: '/tools/emergency-fund-calculator/',
    inputSchema: { type: 'object', properties: {
      essentialMonthly: num('Essential spending a month (housing, food, transport, utilities, insurance, minimum debt payments)'),
      currentSaved: num('Already saved (default 0)'), monthlySaving: num('What you can save each month (default 0)'),
      jobStability: str('Work stability (default good)', ['high', 'good', 'moderate', 'variable', 'freelance']),
      incomeStreams: str('Household income (default single)', ['dual', 'single', 'singleParent']), healthRisk: str('Health or care risk (default low)', ['low', 'moderate', 'high']),
    }, required: ['essentialMonthly'] },
    run: (a) => {
      const r = computeEmergencyFund({ housing: a.essentialMonthly, food: 0, transport: 0, utilities: 0, insurance: 0, minDebt: 0, other: 0, currentSaved: a.currentSaved ?? 0,
        monthlySavingsCapacity: a.monthlySaving ?? 0, jobStability: a.jobStability || 'good', incomeStreams: a.incomeStreams || 'single', healthRisk: a.healthRisk || 'low' });
      return wrap('/tools/emergency-fund-calculator/', { targetMonths: r.targetMonths, target: Math.round(r.target), gap: Math.round(r.gap), funded: r.funded,
        monthsToReach: r.plans.map((p) => ({ monthlySaving: Math.round(p.rate), months: Number.isFinite(p.months) ? p.months : null })),
        assumptions: 'A rule of thumb from job stability, income streams and health risk; not advice.' }, []);
    },
  },
  {
    name: 'fire_number',
    description: 'US: financial independence (FIRE) number and timeline: the portfolio needed to cover yearly spending at a safe withdrawal rate (default 4%), with and without Social Security capitalised, how many years it takes at your saving rate and real return, and whether you reach it by a target age. Use this when someone asks how much they need to retire early or when they could reach FIRE.',
    page: '/tools/fire-calculator/',
    inputSchema: { type: 'object', properties: {
      currentAge: num('Age now'), targetAge: num('Target retirement age'), annualSpend: num('Spending a year in retirement, USD'),
      currentSavings: num('Invested now, USD'), annualSavings: num('Added each year, USD'), returnRate: num('Real return after inflation, % (default 5)'),
      ssMonthly: num('Expected Social Security a month, USD (default 0)'), ssStartAge: num('Social Security start age (default 67)', { enum: [62, 67, 70] }),
      withdrawalRate: num('Safe withdrawal rate, % (default 4)'),
    }, required: ['currentAge', 'annualSpend', 'currentSavings', 'annualSavings'] },
    run: (a) => {
      const r = computeFire({ currentAge: a.currentAge, targetAge: a.targetAge ?? 55, annualSpend: a.annualSpend, currentSavings: a.currentSavings, annualSavings: a.annualSavings,
        returnRate: a.returnRate ?? 5, ssMonthly: a.ssMonthly ?? 0, ssStartAge: [62, 67, 70].includes(a.ssStartAge) ? a.ssStartAge : 67, withdrawalRate: a.withdrawalRate ?? 4, inflationRate: 2.5 });
      const fin = (x: number) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);
      return wrap('/tools/fire-calculator/', { fireNumber: Math.round(r.fireNumber), fireNumberWithSocialSecurity: Math.round(r.fireNumberWithSS), yearsToFire: fin(r.yearsToFire),
        fireAge: fin(r.fireAge), yearsToFireWithSocialSecurity: fin(r.yearsToFireWithSS), portfolioAtTargetAge: Math.round(r.portfolioAtTargetAge), onTrack: r.onTrack,
        assumptions: 'Real (inflation-adjusted) returns; the withdrawal rate is a rule of thumb, not a guarantee.' }, ['https://www.ssa.gov/myaccount/']);
    },
  },
  {
    name: 'wedding_cost_estimate',
    description: 'Estimated wedding cost by country (US, UK, Canada, Australia, Ireland, Switzerland, New Zealand): venue, catering, photography, music, flowers, attire, stationery, officiant, transport and extras for a guest count, style, season, day and region, with the cost per guest and a contingency buffer. Base costs are calibrated to each country\'s largest wedding survey (see the page). Use this when someone asks what a wedding costs or how many guests a budget allows.',
    page: '/tools/wedding-cost-calculator/',
    inputSchema: { type: 'object', properties: {
      country: str('Country (default us)', ['us', 'gb', 'ca', 'au', 'ie', 'ch', 'nz']), guests: num('Number of guests (default: the country\'s survey average)'),
      style: str('Style (default moderate)', ['budget', 'moderate', 'upscale', 'luxury']), season: str('Season (default peak)', ['peak', 'shoulder', 'offpeak']),
      day: str('Day (default saturday)', ['saturday', 'friday', 'sunday', 'weekday']), region: { type: 'string', description: 'Region key from the page (default: the country default)' },
    } },
    run: (a) => {
      const cc = String(a.country || 'us').toUpperCase();
      const P = ((COUNTRY_PACKS as any)[cc] || (COUNTRY_PACKS as any).US)['wedding-cost-calculator'];
      const data = P.data; const D = defaultsFor(cc, 'wedding-cost-calculator');
      const region = a.region && data.regional[a.region] !== undefined ? a.region : (data.defaultRegion || 'national');
      const r = computeWeddingCost({ guests: a.guests ?? D.guestCount, regionalMult: data.regional[region] ?? 1, style: a.style || 'moderate', month: a.season || 'peak', day: a.day || 'saturday', base: data.basePerGuest });
      const rd = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v]));
      const page = cc === 'US' ? '/tools/wedding-cost-calculator/' : `/${cc.toLowerCase()}/tools/wedding-cost-calculator/`;
      return wrap(page, { ...rd, region, assumptions: 'Estimates from per-guest base costs, a regional price level and style/season/day multipliers; quotes vary.' }, [],
        ['US', 'GB', 'CA', 'AU', 'IE', 'CH'].includes(cc) ? { name: `Wedding Budget Planner (spreadsheet, US$${WEDDING_PRICE_USD} one-time)`, url: '/wedding-budget-planner/', what: 'Your budget pre-filled with your country\'s averages, with a payment schedule, quote tracker, guest list and dated checklist.' } : undefined);
    },
  },
  {
    name: 'australia_super_guarantee',
    description: 'Australia: the employer super guarantee (12% of ordinary time earnings from 1 July 2025; paid with each payday under Payday Super from 1 July 2026), per payday and per year, plus salary sacrifice against the $32,500 concessional cap and the 15% contributions tax (ATO). Use this when someone in Australia asks how much super their employer must pay or how much they can salary sacrifice.',
    page: '/tools/australia-super-guarantee-calculator/',
    inputSchema: { type: 'object', properties: {
      salary: num('Ordinary time earnings a year, AUD'), salarySacrifice: num('Salary sacrifice a year, AUD (default 0)'), paydays: num('Paydays a year: 52, 26 or 12 (default 26)', { enum: [52, 26, 12] }),
    }, required: ['salary'] },
    run: (a) => {
      const r = superGuarantee({ salary: a.salary, salarySacrifice: a.salarySacrifice ?? 0, paydays: [52, 26, 12].includes(a.paydays) ? a.paydays : 26 });
      const rd = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 100) / 100 : v]));
      return wrap('/tools/australia-super-guarantee-calculator/', rd, ['https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee', 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps']);
    },
  },
  {
    name: 'cost_of_raising_a_child',
    description: 'What raising a child to 18 costs (US, UK, Canada, Australia, Ireland, Switzerland, New Zealand): everyday costs by age band, pre-school childcare, an optional housing share and inflation, less child benefit where the country pays it. Inputs left out use the country defaults from the calculator page. Use this when someone asks how much it costs to raise a child.',
    page: '/tools/cost-of-raising-a-child-calculator/',
    inputSchema: { type: 'object', properties: {
      country: str('Country (default us)', ['us', 'gb', 'ca', 'au', 'ie', 'ch', 'nz']), children: num('Number of children (default 1)'), level: str('Spending level (default average)', ['low', 'average', 'high']),
      careYears: num('Years of pre-school childcare from age 1'), careType: str('Childcare (default full)', ['none', 'part', 'full']), careAnnual: num('Full-time childcare a year, before subsidy'),
      careSubsidyPct: num('Childcare subsidy, %'), housing: bool('Add a housing share per child (default true)'), inflationPct: num('Inflation, % a year'), includeBenefits: bool('Subtract child benefit (default true)'),
    } },
    run: (a) => {
      const cc = String(a.country || 'us').toUpperCase();
      const P = ((COUNTRY_PACKS as any)[cc] || (COUNTRY_PACKS as any).US)['cost-of-raising-a-child-calculator'];
      const D = defaultsFor(cc, 'cost-of-raising-a-child-calculator');
      const r = computeChildCost({ children: Math.max(1, Math.min(6, Math.round(a.children ?? D.children ?? 1))), level: (['low', 'average', 'high'].includes(a.level) ? a.level : 'average') as ChildLevel,
        careYears: a.careYears ?? D.careYears, careType: (['none', 'part', 'full'].includes(a.careType) ? a.careType : 'full') as ChildCareType, careAnnual: a.careAnnual ?? D.careAnnual,
        careSubsidyPct: a.careSubsidyPct ?? D.careSubsidyPct ?? 0, housing: a.housing ?? !!D.housingOn, housingAnnual: D.housingAnnual ?? 0, inflationPct: a.inflationPct ?? D.inflationPct ?? 2,
        includeBenefits: a.includeBenefits ?? !!D.benefitsOn }, P.data);
      return wrap(cc === 'US' ? '/tools/cost-of-raising-a-child-calculator/' : `/${cc.toLowerCase()}/tools/cost-of-raising-a-child-calculator/`, {
        netTo18: Math.round(r.net), grossTo18: Math.round(r.gross), benefits: Math.round(r.benefits), perYear: Math.round(r.perYear), perMonth: Math.round(r.perMonth),
        netTodaysMoney: Math.round(r.netToday), byPart: Object.fromEntries(Object.entries(r.byPart).map(([k, v]) => [k, Math.round(v as number)])),
        assumptions: 'Nominal totals with inflation; everyday costs by age band from the country pack; not advice.' }, [], LEAVE_PLANNER_ALL);
    },
  },
  {
    name: 'pet_cost_lifetime',
    description: 'What a dog or cat costs (US, UK, Canada, Australia, Ireland, Switzerland, New Zealand): first-year cost (adoption, setup, training), yearly running costs (food by care level, vet, insurance, grooming, toys, boarding, dog walker, an emergency vet reserve) and the lifetime total for the breed size\'s typical lifespan. Inputs left out use the country defaults from the calculator page. Use this when someone asks what a pet costs per year or over its life.',
    page: '/tools/pet-cost-calculator/',
    inputSchema: { type: 'object', properties: {
      country: str('Country (default us)', ['us', 'gb', 'ca', 'au', 'ie', 'ch', 'nz']), pet: str('Pet (default dog_small)', ['dog_large', 'dog_medium', 'dog_small', 'cat']), petAge: num('Age now, years (default 0)'),
      careLevel: str('Care level (default standard)', ['basic', 'standard', 'premium']), insurance: str('Insurance (default basic)', ['none', 'basic', 'comprehensive']),
      acquisitionCost: num('Adoption or purchase price'), dogWalkerMonthly: num('Dog walker or day care a month'), boardingYear: num('Boarding or pet-sitting a year'),
    } },
    run: (a) => {
      const cc = String(a.country || 'us').toUpperCase();
      const data = ((COUNTRY_PACKS as any)[cc] || (COUNTRY_PACKS as any).US)['pet-cost-calculator'].data;
      const D = defaultsFor(cc, 'pet-cost-calculator');
      const type = ['dog_large', 'dog_medium', 'dog_small', 'cat'].includes(a.pet) ? a.pet : 'dog_small';
      const pd = data.petData[type] as number[];
      const insKey = ['none', 'basic', 'comprehensive'].includes(a.insurance) ? a.insurance : 'basic';
      const r = computePetCost({ type, petAge: a.petAge ?? D.petAge ?? 0, careKey: ['basic', 'standard', 'premium'].includes(a.careLevel) ? a.careLevel : 'standard',
        acqCost: a.acquisitionCost ?? D.acquisitionCost ?? 0, walkerAnnual: (a.dogWalkerMonthly ?? D.dogWalker ?? 0) * 12, boarding: a.boardingYear ?? D.boarding ?? 0,
        insurance: data.insurance[insKey] ?? 0, petData: { lifespan: pd[0], foodB: pd[1], foodS: pd[2], foodP: pd[3], vetAnn: pd[4], groomAnn: pd[5], setupOT: pd[6] } });
      const rd = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v]));
      return wrap(cc === 'US' ? '/tools/pet-cost-calculator/' : `/${cc.toLowerCase()}/tools/pet-cost-calculator/`, { ...rd, lifespanYears: pd[0],
        assumptions: 'Typical costs by pet size and country; your vet and insurance quotes will differ.' }, []);
    },
  },
  {
    name: 'chronic_illness_yearly_cost',
    description: 'The yearly cost of living with a chronic condition: insurance premiums, specialist and lab visits, prescriptions, supplies, over-the-counter items, therapy, travel and diet, plus lost work time and productivity on your salary. Inputs left out use the country defaults from the calculator page (US premiums from the KFF 2026 Employer Health Benefits Survey). Use this when someone asks what a chronic illness costs a year.',
    page: '/tools/chronic-illness-cost/',
    inputSchema: { type: 'object', properties: {
      country: str('Country (default us)', ['us', 'gb', 'ca', 'au', 'ie', 'ch', 'nz']), monthlyPremium: num('Your share of health insurance a month'), specialistVisits: num('Specialist visits a year'), specialistCopay: num('Copay per specialist visit'),
      rxMonthly: num('Prescriptions a month'), annualSalary: num('Salary a year'), sickDays: num('Sick days a year'), productivityLoss: num('Productivity loss at work, %'),
    } },
    run: (a) => {
      const cc = String(a.country || 'us').toUpperCase();
      const D = defaultsFor(cc, 'chronic-illness-cost');
      const r = computeChronicIllness({ monthlyPremium: a.monthlyPremium ?? D.monthlyPremium, specialistVisits: a.specialistVisits ?? D.specialistVisits, specialistCopay: a.specialistCopay ?? D.specialistCopay,
        labTests: D.labTests, labCost: D.labCost, rxMonthly: a.rxMonthly ?? D.rxMonthly, suppliesAnnual: D.suppliesAnnual, otcMonthly: D.otcMonthly, annualSalary: a.annualSalary ?? D.annualSalary,
        sickDays: a.sickDays ?? D.sickDays, productivityLoss: a.productivityLoss ?? D.productivityLoss, mentalHealth: D.mentalHealth, mhCopay: D.mhCopay, transport: D.transport, dietExtra: D.dietExtra });
      const rd = Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'maxVal').map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v]));
      return wrap(cc === 'US' ? '/tools/chronic-illness-cost/' : `/${cc.toLowerCase()}/tools/chronic-illness-cost/`, { ...rd,
        assumptions: 'Yearly figures; inputs not given use the country defaults; not medical or financial advice.' }, cc === 'US' ? ['https://www.kff.org/health-costs/2026-employer-health-benefits-survey/'] : []);
    },
  },
  {
    name: 'aging_parent_care_cost',
    description: 'Yearly cost of caring for an aging parent (US by state; also UK, Canada, Australia, Ireland, Switzerland, New Zealand by region): the care itself (for example home health aide, adult day care, assisted living, memory care, nursing home, or family care only) less any coverage, medical costs, home adaptations spread over the years of care, and the income a family caregiver gives up. Inputs left out use the country defaults from the planner page (US: Texas, home health aide). An unknown region or care type falls back to the default and the answer lists the valid keys. Use this when someone asks what caring for an elderly parent costs.',
    page: '/tools/aging-parent-planner/',
    inputSchema: { type: 'object', properties: {
      country: str('Country (default us)', ['us', 'gb', 'ca', 'au', 'ie', 'ch', 'nz']), region: { type: 'string', description: 'US state code (e.g. TX, CA) or the region key for other countries' },
      careType: { type: 'string', description: 'Care type key, e.g. homeHealth, adultDay, assistedLiving, memoryCare, nursingPrivate (US), or family for family care only' },
      years: num('Years of care (default 3)'), coveragePct: num('Share covered by insurance or public funding, %'), medMonthly: num('Medical costs a month'),
      caregiverSalary: num('Family caregiver salary a year'), workReductionHours: num('Hours a week the caregiver cuts from work'),
    } },
    run: (a) => {
      const cc = String(a.country || 'us').toUpperCase();
      const P = ((COUNTRY_PACKS as any)[cc] || (COUNTRY_PACKS as any).US)['aging-parent-planner'];
      const D = defaultsFor(cc, 'aging-parent-planner');
      const costs = P.data.careCosts as Record<string, Record<string, number>>;
      const want = String(a.region || '');
      const region = costs[want] ? want : costs[want.toUpperCase()] ? want.toUpperCase() : (P.data.defaultRegion && costs[P.data.defaultRegion] ? P.data.defaultRegion : Object.keys(costs)[0]);
      const types = Object.keys(costs[region]);
      const careType = a.careType === 'family' ? 'family' : types.includes(a.careType) ? a.careType : types[0];
      const bench = careType === 'family' ? 0 : costs[region][careType];
      const r = computeAgingParent({ baseCare: bench, coveragePct: a.coveragePct ?? D.coveragePct ?? 0, medMonthly: a.medMonthly ?? D.medMonthly,
        doctorVisits: D.doctorVisits, visitCopay: D.visitCopay, adaptationsTotal: D.adaptations, years: a.years ?? D.yearsNeeded, caregiverSalary: a.caregiverSalary ?? D.caregiverSalary,
        workReduction: a.workReductionHours ?? D.workReduction });
      return wrap(cc === 'US' ? '/tools/aging-parent-planner/' : `/${cc.toLowerCase()}/tools/aging-parent-planner/`, { region, careType, careBenchmark: bench,
        totalPerYear: Math.round(r.total), care: Math.round(r.netCare), medical: Math.round(r.medical), adaptationsPerYear: Math.round(r.adaptations), caregiverIncomeLost: Math.round(r.careerImpact),
        validRegions: Object.keys(costs), validCareTypes: [...types, 'family'],
        assumptions: 'Benchmark care costs by region from the country pack; yearly figures; not advice.' }, []);
    },
  },
  {
    name: 'japan_trip_cost',
    description: 'What a trip to Japan costs from the US, UK, Canada, Australia or Ireland, in the traveller\'s currency and in yen: return flights, rooms, daily spending, an optional Japan Rail Pass at the official price, the ¥1,000 departure tax and the Tokyo and Kyoto accommodation taxes (official amounts), at the dated ECB exchange rate. Flights, rooms and daily spending are estimates the caller can override. Use this when someone asks how much a Japan trip costs.',
    page: '/tools/japan-trip-cost-calculator/',
    inputSchema: { type: 'object', properties: {
      origin: str('Travelling from (default US)', ['US', 'GB', 'CA', 'AU', 'IE']), adults: num('Adults (default 2)'), children: num('Children aged 6 to 11 (default 0)'),
      tokyoNights: num('Nights in Tokyo (default 4)'), kyotoNights: num('Nights in Kyoto (default 3)'), otherNights: num('Nights elsewhere (default 0)'),
      style: str('Travel style (default mid)', ['budget', 'mid', 'comfort']), jrPassDays: num('Japan Rail Pass days, 0 for none (default 0)', { enum: [0, 7, 14, 21] }),
      flightPerPerson: num('Return economy flight per person in your currency (default: our estimate)'), roomPerNightJpy: num('Room per night, yen (optional)'), dailyPerAdultJpy: num('Daily spending per adult, yen (optional)'),
    } },
    run: (a) => {
      const origin = (['US', 'GB', 'CA', 'AU', 'IE'].includes(String(a.origin || '').toUpperCase()) ? String(a.origin).toUpperCase() : 'US') as JpOrigin;
      const r = computeJapanTrip({ origin, adults: a.adults ?? 2, children: a.children ?? 0, tokyoNights: a.tokyoNights ?? 4, kyotoNights: a.kyotoNights ?? 3, otherNights: a.otherNights ?? 0,
        style: (['budget', 'mid', 'comfort'].includes(a.style) ? a.style : 'mid') as JpStyle, jrPass: ([0, 7, 14, 21].includes(a.jrPassDays) ? a.jrPassDays : 0) as JpPass,
        flightPerPerson: a.flightPerPerson ?? JP_ORIGINS[origin].flight, roomPerNightJpy: a.roomPerNightJpy, dailyPerAdultJpy: a.dailyPerAdultJpy }, { ...MOVING_FX.perEur, JPY: JPY_PER_EUR });
      return wrap('/tools/japan-trip-cost-calculator/', { currency: JP_ORIGINS[origin].currency, total: Math.round(r.totalHome), perPerson: Math.round(r.perPersonHome), totalJpy: Math.round(r.totalJpy),
        nights: r.nights, people: r.people, rooms: r.rooms, lines: r.lines.map((l) => ({ label: l.label, home: Math.round(l.home), jpy: Math.round(l.jpy), kind: l.kind })),
        assumptions: 'Official: departure tax, JR Pass, Tokyo and Kyoto lodging taxes, visa rules. Estimates: flights, rooms, daily spending.' },
        ['https://www.mlit.go.jp/kankocho/content/001996466.pdf', 'https://japanrailpass.net/en/purchase/price/', 'https://kyoto.travel/en/news/tax-change/', 'https://www.tax.metro.tokyo.lg.jp/shitsumon/tozei/hotel/general_01.html']);
    },
  },
  {
    name: 'rent_vs_buy',
    description: 'Renting vs buying a home (US, UK, Canada, Australia, Ireland, Switzerland or New Zealand): the net cost of each over the years you stay, counting the deposit\'s lost investment return, buying and selling costs, mortgage interest, property tax, maintenance, price growth and rent increases; returns which is cheaper and by how much, and the break-even year. Inputs left out use that country\'s defaults (the calculator page\'s example). Use this when someone asks whether to rent or buy, or when buying beats renting.',
    page: '/tools/rent-vs-buy-calculator/',
    inputSchema: { type: 'object', properties: {
      country: str('Country (default us)', ['us', 'gb', 'ca', 'au', 'ie', 'ch', 'nz']), homePrice: num('Home price'), downPct: num('Deposit, % of price'), mortgageRate: num('Mortgage rate, %'),
      monthlyRent: num('Monthly rent for a comparable home'), yearsToStay: num('Years you expect to stay (default 10)'), homeAppreciation: num('House price growth, % a year'),
      rentIncrease: num('Rent increase, % a year'), investReturn: num('Return on money not put into the home, % a year'),
    } },
    run: (a) => {
      const cc = String(a.country || 'us').toUpperCase();
      const D = defaultsFor(cc, 'rent-vs-buy-calculator');
      const r = computeRentVsBuy({ homePrice: a.homePrice ?? D.homePrice, downPct: a.downPct ?? D.downPct, mortgageRate: a.mortgageRate ?? D.mortgageRate, propTaxRate: D.propTaxRate,
        propTaxIsFlat: propTaxIsFlatFor(cc), hoaMonthly: D.hoaMonthly ?? 0, homeAppreciation: a.homeAppreciation ?? D.homeAppreciation, monthlyRent: a.monthlyRent ?? D.monthlyRent,
        rentIncrease: a.rentIncrease ?? D.rentIncrease, investReturn: a.investReturn ?? D.investReturn, yearsToStay: a.yearsToStay ?? 10, taxBracket: 0,
        closingPct: D.closingPct ?? 3, sellCostPct: D.sellCostPct ?? (cc === 'GB' ? 1.8 : 6), isGB: cc === 'GB' });
      return wrap(cc === 'US' ? '/tools/rent-vs-buy-calculator/' : `/${cc.toLowerCase()}/tools/rent-vs-buy-calculator/`, {
        years: r.years, cheaper: r.buyIsBetterNow ? 'buy' : 'rent', byAmount: Math.round(r.diff), breakEvenYear: r.beYear || null, monthlyMortgage: Math.round(r.monthlyMort),
        assumptions: 'Property tax, fees and selling costs use the country defaults; no tax relief on mortgage interest. Not advice.' }, [], ['US', 'GB', 'CA', 'AU', 'IE'].includes(cc) ? HOME_PLANNER : undefined);
    },
  },
  {
    name: 'netherlands_box3_2026',
    description: 'Netherlands: box 3 tax (income from savings and investments) for tax year 2026 as the Belastingdienst calculates it on the provisional assessment (transitional legislation): notional returns 1.28% on bank balances (provisional), 6.00% on investments and other assets, 2.70% on debts above €3,800 per person; tax-free allowance €59,357 per person (€118,714 for tax partners, base divisible in any proportion); green investments exempt up to €26,715 per person; tax 36%. Returns the taxable return, capital yield tax base, base above the allowance, share %, box 3 income and tax per person, rounded as in the Belastingdienst examples. Notional calculation only (not the actual-return counter-evidence route); 2027 not included (Tax Plan 2027 before parliament). Use this when someone asks how much box 3 tax they pay in the Netherlands for 2026.',
    page: '/tools/netherlands-box-3-calculator/',
    inputSchema: { type: 'object', properties: {
      bank: num('Bank balances on 1 January 2026, EUR'), other: num('Investments and other assets (incl. second home WOZ value), EUR'),
      green: num('Green investments, EUR (default 0)'), debts: num('Box 3 debts, EUR (default 0)'),
      partner: { type: 'boolean', description: 'Has a tax partner (assets entered combined)' }, sharePct: num('Your share of the taxable base with a partner, % (default 50)'),
    }, required: ['bank', 'other'] },
    run: (a) => {
      const r = nlBox3({ bank: a.bank, other: a.other, green: a.green ?? 0, debts: a.debts ?? 0, partner: !!a.partner, sharePct: a.sharePct });
      return wrap('/tools/netherlands-box-3-calculator/', { ...r, assumptions: 'Tax year 2026 provisional-assessment method; bank and debt rates provisional until early 2027; notional return only; green-investment tax credit and foreign-asset relief not included. Not tax advice.' }, [BOX3_SOURCES.calc, BOX3_SOURCES.allowance]);
    },
  },
  {
    name: 'ireland_pension_tax_relief',
    description: 'Ireland: income tax relief on personal pension contributions and AVCs (occupational scheme, PRSA, RAC, PEPP): the age-related limit (under 30 15%, 30-39 20%, 40-49 25%, 50-54 30%, 55-59 35%, 60+ 40% of earnings up to €115,000), relief at the marginal rate (2026 or Budget 2027 bands; no USC or PRSI relief), the net cost and the room left this year.',
    page: '/tools/ireland-pension-tax-relief-calculator/',
    inputSchema: { type: 'object', properties: { year: { type: 'number', enum: [2026, 2027], description: 'Tax year' }, status: str('Tax status', ['single', 'single-parent', 'married-one', 'married-two']), age: num('Age in the tax year'), pay: num('Gross earnings from the job, EUR'), spousePay: num('Spouse gross salary (married-two), EUR'), contributions: num('Own contributions this year incl. AVCs, EUR') }, required: ['age', 'pay', 'contributions'] },
    run: (a) => wrap('/tools/ireland-pension-tax-relief-calculator/', computePensionRelief({ year: a.year === 2027 ? 2027 : 2026, status: a.status ?? 'single', age: a.age, pay: a.pay, spousePay: a.spousePay, contributions: a.contributions }),
      ['https://www.revenue.ie/en/jobs-and-pensions/pension/relief/index.aspx', 'https://www.revenue.ie/en/jobs-and-pensions/pension/relief/tax-relief-limits.aspx']),
  },
  {
    name: 'ireland_can_i_retire',
    description: 'Ireland: can I retire at 60 (or any age)? Year-by-year projection to 95 for one person or a couple: pay and pension contributions until retirement, DC pots drawn at retirement (25% lump sum: first €200,000 tax-free, next €300,000 at 20%; the rest to an ARF with the 4%/5%/6% imputed minimum drawdown), DB pensions, State Pension (Contributory) from 66 (default €309.30 a week, 2027), savings, an optional UK State Pension for UK years (from the UK State Pension age, taxed in Ireland, no USC), a spending target in today’s money, and income tax (age credit, €18,000/€36,000 exemption with marginal relief), USC (none on the State Pension; reduced at 70+) and PRSI (pay only) on the 2027 rules. Growth and inflation are assumptions. Returns the age the money lasts to, bridge years before 66, wealth at retirement, the spending that lasts to 95, retire-at-60/62/65 comparison and key years in today’s money.',
    page: '/tools/ireland-retirement-calculator/',
    inputSchema: { type: 'object', properties: {
      age: num('Your age now'), retireAge: num('Age you stop work'), salary: num('Gross pay a year, EUR'), pensionPot: num('DC pension pots today (occupational DC, PRSA, AVC), EUR'),
      contribPct: num('Your pension contributions, % of pay'), employerPct: num('Employer contributions, % of pay'), statePensionWeekly: num('Expected State Pension a week in 2027 euros (full rate 309.30; 0 if none)'),
      dbPension: num('Defined benefit pension a year, EUR (0 if none)'), dbFromAge: num('Age the DB pension starts'),
      ukQualifyingYears: num('UK National Insurance qualifying years (UK State Pension: 1/35 of £241.30 a week each, 10 minimum)'), ukPensionWeekly: num('UK State Pension forecast a week in pounds (overrides ukQualifyingYears)'),
      savings: num('Savings and investments outside pensions, EUR'), savingsAdd: num('Added to savings each year until retirement, EUR'), spending: num('Household spending a year in retirement after tax, today’s money, EUR'),
      household: str('Household', ['single', 'married', 'cohabiting']), partnerAge: num('Partner age now'), partnerRetireAge: num('Partner retirement age'), partnerSalary: num('Partner gross pay a year, EUR'),
      partnerPensionPot: num('Partner DC pension pots, EUR'), partnerStatePensionWeekly: num('Partner State Pension a week (2027 euros)'), partnerDbPension: num('Partner DB pension a year, EUR'),
      growth: num('Pension/ARF growth % a year after charges (default 4.5, an assumption)'), inflation: num('Inflation % a year (default 2)'),
    }, required: ['age', 'retireAge', 'spending'] },
    run: (a) => {
      const d = IE_DEFAULT.people[0];
      const me = { ...d, age: a.age, retireAge: a.retireAge, drawAge: a.retireAge, salary: a.salary ?? 0, pensionPot: a.pensionPot ?? 0, contribPct: a.contribPct ?? 0, employerPct: a.employerPct ?? 0, statePensionWeekly: a.statePensionWeekly ?? d.statePensionWeekly, dbPension: a.dbPension ?? 0, dbFromAge: a.dbFromAge ?? a.retireAge,
        ukPensionWeekly: a.ukPensionWeekly > 0 ? a.ukPensionWeekly : ukWeeklyFromYears(a.ukQualifyingYears ?? 0) };
      const household = a.household === 'married' || a.household === 'cohabiting' ? a.household : 'single';
      const partner = { ...d, age: a.partnerAge ?? a.age, retireAge: a.partnerRetireAge ?? a.retireAge, drawAge: a.partnerRetireAge ?? a.retireAge, salary: a.partnerSalary ?? 0, pensionPot: a.partnerPensionPot ?? 0, contribPct: 0, employerPct: 0, statePensionWeekly: a.partnerStatePensionWeekly ?? 0, dbPension: a.partnerDbPension ?? 0, dbFromAge: a.partnerRetireAge ?? a.retireAge };
      const plan: PlanInput = { ...IE_DEFAULT, household, people: household === 'single' ? [me] : [me, partner], savings: a.savings ?? 0, savingsAdd: a.savingsAdd ?? 0, spending: a.spending, growth: a.growth ?? IE_DEFAULT.growth, inflation: a.inflation ?? IE_DEFAULT.inflation };
      const r = project(plan, PACKS.ie);
      const today = (v: number, f: number) => Math.round(v / f);
      const key = r.rows.filter((y) => [me.retireAge, 66, 75, 85, 95].includes(y.age1)).map((y) => ({ age: y.age1, year: y.year, incomeAfterTax: today(y.netIncome, y.deflator), spending: today(y.spending, y.deflator), fromSavings: today(y.fromSavings, y.deflator), notCovered: today(y.shortfall, y.deflator), moneyLeft: today(y.savingsEnd + y.arfEnd + y.potEnd, y.deflator) }));
      return wrap('/tools/ireland-retirement-calculator/', {
        moneyLastsToAge: r.runOutAge == null ? 'past 95' : r.runOutAge - 1, firstShortYearAge: r.runOutAge, bridgeYearsBeforeStatePension: r.bridgeYears,
        wealthAtRetirementTodaysMoney: Math.round(r.wealthAtRetirementToday), spendingThatLastsTo95: sustainableSpending(plan, PACKS.ie),
        lumpSums: { gross: Math.round(r.lumpSums.gross), tax: Math.round(r.lumpSums.tax) }, overStandardFundThreshold: r.overThreshold,
        compare: compareRetireAges(plan, PACKS.ie, [60, 62, 65]).map((c) => ({ retireAge: c.retireAge, moneyLastsToAge: c.runOutAge == null ? 'past 95' : c.runOutAge - 1 })),
        keyYearsTodaysMoney: key,
      }, PACKS.ie.sources.map((s) => s.url), RETIREMENT_PLANNER);
    },
  },
  retireIntlTool('gb', 'uk_can_i_retire', 'GBP', {
    statePensionWeekly: num('Expected State Pension a week, GBP (full new State Pension £250.70 from April 2027; 0 if none)'),
    scotland: bool('Scottish taxpayer'), partnerBirthYear: num('Partner year of birth'),
  }, (a) => ({ 'p1-born': a.birthYear ?? (a.age != null ? 2027 - a.age : 1972), 'p1-month': String(a.birthMonth ?? 6), 'p1-sp': a.statePensionWeekly ?? 250.7, region: a.scotland ? 'scotland' : 'rUK', 'p1-lump': 25,
    'p2-born': a.partnerBirthYear ?? (a.partnerAge != null ? 2027 - a.partnerAge : a.birthYear ?? 1972), 'p2-sp': a.partnerStatePensionWeekly ?? 250.7 }),
    'UK: can I retire at 60 with £300k (or any age and pot)? Year by year to 95 for one person or a couple, on the 2027-28 rules after Budget 2026: pay and pension contributions until retirement, pots drawn from the normal minimum pension age (55, 57 from 6 April 2028) with 25% tax-free cash within the £268,275 Lump Sum Allowance and the rest drawn as taxable income, defined benefit pensions, the new State Pension from the State Pension age by date of birth (full £250.70 a week from April 2027), savings, a spending target in today’s money, and income tax (personal allowance tapered over £100,000; England/Wales/NI or Scottish bands, frozen to 2030-31) and National Insurance on pay. Growth and inflation are assumptions. Returns the age the money lasts to, bridge years, wealth at retirement, the spending that lasts to 95, a retire-at-60/62/65 comparison and key years in today’s money.'),
  retireIntlTool('ca', 'canada_can_i_retire', 'CAD', {
    province: str('Province or territory code (Quebec not supported)', CA_PROVINCES.map((p) => p.code)), cppAt65Monthly: num('CPP estimate at 65, a month (max $1,507.65 in 2026)'), cppStartAge: num('Age CPP starts, 60-70'),
    oasYears: num('Years lived in Canada after 18 (40 = full OAS)'), oasStartAge: num('Age OAS starts, 65-70'), ukPensionWeekly: num('UK State Pension forecast a week in pounds (frozen in Canada; 0 if none)'),
  }, (a) => ({ 'p1-age': a.age ?? 55, 'p2-age': a.partnerAge ?? a.age ?? 55, region: a.province && CA_PROVINCES.some((p) => p.code === a.province) ? a.province : 'ON', 'p1-cpp': a.cppAt65Monthly ?? 1100, 'p1-cppage': a.cppStartAge ?? 65,
    'p1-oasyears': a.oasYears ?? 40, 'p1-oasage': a.oasStartAge ?? 65, 'p1-ukweekly': a.ukPensionWeekly ?? '', 'p2-cpp': a.partnerCppAt65Monthly ?? 800 }),
    'Canada: can I retire at 60 with $500k (or any age and pot)? Year by year to 95 for one person or a couple: RRSP contributions until retirement, RRSP to RRIF (by 71) with the RRIF minimum withdrawal, CPP from the chosen age (−0.6%/month before 65, +0.7% after), OAS from 65-70 (years in Canada / 40, +0.6%/month deferred, +10% at 75) with the 15% recovery tax over $95,323, GIS on last year’s income, pension income splitting, an optional UK State Pension (frozen in Canada), and federal plus provincial tax for every province and territory except Quebec (2026 amounts). Returns the age the money lasts to, bridge years, wealth at retirement, the spending that lasts to 95, a retire-at-60/62/65 comparison and key years in today’s money.'),
  retireIntlTool('au', 'australia_can_i_retire', 'AUD', {
    homeowner: bool('Owns their home (Age Pension assets test)'), otherAssets: num('Car, contents and other assets the assets test counts, AUD'), ukPensionWeekly: num('UK State Pension forecast a week in pounds (frozen in Australia; 0 if none)'),
  }, (a) => ({ 'p1-age': a.age ?? 55, 'p2-age': a.partnerAge ?? a.age ?? 55, homeowner: a.homeowner !== false, 'other-assets': a.otherAssets ?? 15000, 'p1-employer': a.employerPct ?? 12, 'p1-ukweekly': a.ukPensionWeekly ?? '' }),
    'Australia: can I retire at 60 with $500k in super (or any age and balance)? Year by year to 95 for one person or a couple: super guarantee and salary sacrifice (15% contributions tax), super from preservation age 60 into a tax-free account-based pension with the minimum drawdowns, the Age Pension from 67 under the income test (deeming, Work Bonus) and assets test (homeowner or not) from 20 September 2026, an optional UK State Pension (frozen in Australia), and tax (14% band from 2027-28, LITO, SAPTO, Medicare levy). Returns the age the money lasts to, bridge years to 67, wealth at retirement, the spending that lasts to 95, a retire-at-60/62/65 comparison and key years in today’s money.'),
  {
    name: 'ireland_landlord_rental_tax',
    description: 'Ireland: tax on residential rental income for an individual landlord: profit after mortgage interest (deductible only for RTB-registered tenancies), other expenses and 12.5% wear and tear, income tax at the marginal rate on top of salary (2026 or Budget 2027 bands), the Residential Premises Rental Income Relief (up to €1,000, 20% of profit), USC with the 3% surcharge on non-PAYE income over €100,000, and PRSI on unearned income over €5,000 for employees under 66.',
    page: '/tools/ireland-landlord-tax-calculator/',
    inputSchema: { type: 'object', properties: { year: { type: 'number', enum: [2026, 2027], description: 'Tax year' }, status: str('Tax status', ['single', 'single-parent', 'married-one', 'married-two']), pay: num('Your gross salary a year, EUR'), spousePay: num('Spouse gross salary (married-two), EUR'), rent: num('Rent received in the year, EUR'), mortgageInterest: num('Mortgage interest for the year, EUR'), rtbRegistered: bool('Tenancy registered with the RTB (default true)'), otherExpenses: num('Other allowable expenses, EUR'), furnishings: num('Cost of furniture and appliances bought in the last 8 years, EUR'), lossesForward: num('Rental losses carried forward, EUR'), over66: bool('66 or older') }, required: ['rent'] },
    run: (a) => wrap('/tools/ireland-landlord-tax-calculator/', computeLandlord({ year: a.year === 2027 ? 2027 : 2026, status: a.status ?? 'single', pay: a.pay ?? 0, spousePay: a.spousePay, rent: a.rent, mortgageInterest: a.mortgageInterest ?? 0, rtbRegistered: a.rtbRegistered !== false, otherExpenses: a.otherExpenses ?? 0, furnishings: a.furnishings ?? 0, lossesForward: a.lossesForward, over66: !!a.over66 }),
      ['https://www.revenue.ie/en/property/rental-income/irish-rental-income/what-expenses-are-allowed.aspx', 'https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/land-and-property/rprir/how-much-can-you-claim.aspx', 'https://www.revenue.ie/en/jobs-and-pensions/usc/other-rates.aspx', 'https://www.citizensinformation.ie/en/social-welfare/irish-social-welfare-system/social-insurance-prsi/social-insurance/']),
  },
  {
    name: 'ireland_sell_or_keep_rental',
    description: 'Ireland: should a landlord sell a rental property now or keep it? Compares wealth after tax year by year over N years (default 10): KEEP = rent (growth capped at 2% or CPI under the rent control from 1 March 2026) less costs, mortgage and Case V tax at the marginal rate, plus growth, valued net of selling costs, CGT and any RPRIR clawback; SELL NOW = price less selling costs, CGT (31% from 7 October 2026, €1,270 exemption, pre-2003 indexation) and the mortgage, invested in State Savings, a deposit (DIRT), an ETF (exit tax, deemed disposal), a pension (age limits) or the home mortgage. Returns the difference, both paths by year, the break-even house-price growth and year-1 income.',
    page: '/tools/ireland-sell-or-keep-rental-calculator/',
    inputSchema: { type: 'object', properties: { value: num('What the property would sell for now, EUR'), purchasePrice: num('Price paid, EUR'), purchaseDate: { type: 'string', description: 'Date bought, YYYY-MM-DD' }, rent: num('Rent a year, EUR'), mortgageBalance: num('Mortgage owed, EUR'), mortgageRate: num('Mortgage rate, %'), mortgageYears: num('Years left on the mortgage'), costs: num('Deductible costs a year, EUR'), pay: num('Your gross salary a year, EUR'), status: str('Tax status', ['single', 'single-parent', 'married-one', 'married-two']), age: num('Your age'), years: num('Years to compare (1-30)'), houseGrowth: num('House-price growth, % a year'), rentGrowth: num('Rent growth, % a year'), investReturn: num('ETF and pension return, % a year'), depositRate: num('Deposit rate, %') }, required: ['value', 'purchasePrice', 'rent'] },
    run: (a) => {
      const ex = SELL_KEEP_EXAMPLE, p0 = ex.properties[0], o0 = ex.owners[0];
      const input = {
        owners: [{ ...o0, status: a.status ?? 'single', pay: a.pay ?? o0.pay, age: a.age ?? o0.age, over66: (a.age ?? o0.age) >= 66, rprirClaimed: 0, rprirFirstYear: null }],
        properties: [{ ...p0, value: a.value, purchasePrice: a.purchasePrice, purchaseDate: a.purchaseDate ?? p0.purchaseDate, buyingCosts: 0, rent: a.rent, mortgageBalance: a.mortgageBalance ?? 0, mortgageRate: a.mortgageRate ?? p0.mortgageRate, mortgageYears: a.mortgageYears ?? p0.mortgageYears, costs: a.costs ?? p0.costs, furnishings: 0 }],
        a: { ...ex.a, years: a.years ?? 10, houseGrowth: a.houseGrowth ?? ex.a.houseGrowth, rentGrowth: a.rentGrowth ?? ex.a.rentGrowth, investReturn: a.investReturn ?? ex.a.investReturn, depositRate: a.depositRate ?? ex.a.depositRate },
      };
      return wrap('/tools/ireland-sell-or-keep-rental-calculator/', roundResult(computeSellOrKeep(input)),
        ['https://www.revenue.ie/en/gains-gifts-and-inheritance/transfering-an-asset/how-to-calculate-cgt.aspx', 'https://www.revenue.ie/en/gains-gifts-and-inheritance/documents/cgtmult.pdf', 'https://rtb.ie/renting/rental-law-changes-from-1-march-2/', 'https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/land-and-property/rprir/clawback.aspx']);
    },
  },
  {
    name: 'uk_stamp_duty_england_ni',
    description: 'UK: Stamp Duty Land Tax for England and Northern Ireland at 2026/27 rates, band by band: standard, first-time buyer relief (nil to £300,000, up to £500,000) or additional property (+5% on every band), plus the 2% non-resident surcharge.',
    page: '/tools/uk-stamp-duty-calculator/',
    inputSchema: { type: 'object', properties: { price: num('Purchase price, GBP'), buyerType: str('Buyer', ['standard', 'firstTimeBuyer', 'additional']), nonResident: bool('Buyer is not UK resident') }, required: ['price', 'buyerType'] },
    run: (a) => wrap('/tools/uk-stamp-duty-calculator/', computeSdlt(a.price, a.buyerType, !!a.nonResident), ['https://www.gov.uk/stamp-duty-land-tax/residential-property-rates']),
  },
  {
    name: 'scotland_lbtt',
    description: 'Scotland: Land and Buildings Transaction Tax at 2026/27 rates, band by band, with first-time buyer relief (nil band to £175,000) or the 8% Additional Dwelling Supplement.',
    page: '/tools/scotland-lbtt-calculator/',
    inputSchema: { type: 'object', properties: { price: num('Purchase price, GBP'), buyerType: str('Buyer', ['standard', 'firstTimeBuyer', 'additional']) }, required: ['price', 'buyerType'] },
    run: (a) => wrap('/tools/scotland-lbtt-calculator/', computeLbtt(a.price, a.buyerType), ['https://revenue.scot/taxes/land-buildings-transaction-tax/residential-property', 'https://revenue.scot/taxes/land-buildings-transaction-tax/additional-dwelling-supplement-ads']),
  },
  {
    name: 'wales_ltt',
    description: 'Wales: Land Transaction Tax at 2026/27 rates, band by band (nil band £225,000 for everyone; no first-time buyer relief) or the higher rates for additional properties.',
    page: '/tools/wales-ltt-calculator/',
    inputSchema: { type: 'object', properties: { price: num('Purchase price, GBP'), buyerType: str('Buyer', ['standard', 'additional']) }, required: ['price', 'buyerType'] },
    run: (a) => wrap('/tools/wales-ltt-calculator/', computeLtt(a.price, a.buyerType), ['https://www.gov.wales/land-transaction-tax-rates-and-bands']),
  },
  {
    name: 'canada_ei_maternity_parental',
    description: 'Canada (outside Quebec): EI maternity and parental benefits for 2026: 55% of insurable earnings up to $729 a week (standard) or 33% up to $437 (extended), 15 weeks maternity, parental weeks, one-week waiting period. Use this for detailed Canadian EI weeks and amounts; for Quebec use quebec_qpip; for a one-line gross comparison across countries use parental_leave_income_gap.',
    page: '/tools/canada-ei-benefit-calculator/',
    inputSchema: { type: 'object', properties: { annualIncome: num('Gross annual insurable earnings, CAD'), includeMaternity: bool('Include the 15 weeks of maternity benefits (birth parent)'), standardParentalWeeks: num('Parental weeks at the standard rate (your share, up to 35)'), extendedParentalWeeks: num('Parental weeks at the extended rate (your share, up to 61)') }, required: ['annualIncome'] },
    run: (a) => wrap('/tools/canada-ei-benefit-calculator/', computeCaEi({ annualIncome: a.annualIncome, includeMaternity: a.includeMaternity ?? true, standardParentalWeeks: a.standardParentalWeeks ?? 35, extendedParentalWeeks: a.extendedParentalWeeks ?? 0 }),
      ['https://www.canada.ca/en/services/benefits/ei/ei-maternity-parental.html', 'https://www.canada.ca/en/services/benefits/ei/ei-maternity-parental/benefit-amount.html'], LEAVE_PLANNER_ALL),
  },
  {
    name: 'quebec_qpip',
    description: 'Quebec: QPIP (RQAP) parental insurance for 2026 for both parents: basic or special plan, birth or adoption, earnings up to $103,000, weekly amounts and totals, with the shareable weeks split between parents. Use this for Quebec residents (not EI); for a one-line gross comparison across countries use parental_leave_income_gap.',
    page: '/tools/quebec-qpip-calculator/',
    inputSchema: { type: 'object', properties: { plan: str('Plan', ['basic', 'special']), event: str('Event', ['birth', 'adoption']), salary1: num('Parent 1 (birth parent) annual insurable earnings, CAD'), salary2: num('Parent 2 annual insurable earnings, CAD'), singleParent: bool('Single parent'), sharedWeeks1: num('Shareable weeks parent 1 takes (parent 2 takes the rest)') }, required: ['salary1'] },
    run: (a) => wrap('/tools/quebec-qpip-calculator/', computeQpip({ plan: a.plan ?? 'basic', event: a.event ?? 'birth', salary1: a.salary1, salary2: a.salary2 ?? 0, singleParent: !!a.singleParent, sharedWeeks1: a.sharedWeeks1 ?? 0 }),
      ['https://www.quebec.ca/en/family-and-support-for-individuals/pregnancy-parenthood/financial-support-pregnant-women-families/quebec-parental-insurance-plan'], LEAVE_PLANNER_ALL),
  },
  {
    name: 'australia_private_health_rebate_mls',
    description: 'Australia: private health insurance rebate (1 April 2026 – 31 March 2027) and Medicare Levy Surcharge for 2026–27 by income tier, single or family, and age band: whether hospital cover saves you tax.',
    page: '/tools/australia-private-health-rebate-calculator/',
    inputSchema: { type: 'object', properties: { income: num('Income for MLS purposes, AUD'), family: str('Single or family', ['single', 'family']), age: str('Age of the oldest person on the policy', ['under65', '65to69', '70plus']), premium: num('Annual hospital premium, AUD'), hasCover: bool('Has private hospital cover'), children: num('Dependent children') }, required: ['income', 'family'] },
    run: (a) => wrap('/tools/australia-private-health-rebate-calculator/', computeAuHealth({ income: a.income, family: a.family, age: a.age ?? 'under65', premium: a.premium ?? 0, hasCover: a.hasCover ?? true, children: a.children ?? 0 }),
      ['https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/private-health-insurance-rebate/income-thresholds-and-rates-for-the-private-health-insurance-rebate', 'https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates']),
  },
  {
    name: 'new_zealand_kiwisaver',
    description: 'New Zealand: KiwiSaver balance at 65 under the 2026 rules (default and employer minimum 3.5%, 4% from April 2028; government contribution 25c per $1 up to $260.72; ESCT on employer contributions; PIR tax on returns). Returns are an assumption you set.',
    page: '/tools/kiwisaver-calculator/',
    inputSchema: { type: 'object', properties: { age: num('Age now'), salary: num('Gross salary a year, NZD'), balance: num('KiwiSaver balance today, NZD'), employeeRate: num('Your contribution rate (0.035, 0.04, 0.06, 0.08 or 0.1); omit for the default rate'), pir: num('Prescribed investor rate (0.105, 0.175 or 0.28)'), grossReturn: num('Return % a year before tax and fees (default 5, an assumption)'), feePct: num('Fund fee % a year (default 0.5)') }, required: ['age', 'salary'] },
    run: (a) => wrap('/tools/kiwisaver-calculator/', summary(computeKiwiSaver({ age: a.age, salary: a.salary, balance: a.balance ?? 0, payGrowth: 2, employeeRate: a.employeeRate ?? 'default', employerRate: 'minimum', pir: a.pir ?? 0.28, grossReturn: a.grossReturn ?? 5, feePct: a.feePct ?? 0.5, feeDollars: 0, inflation: 2 }) as any),
      ['https://www.ird.govt.nz/kiwisaver']),
  },
  {
    name: 'parental_leave_income_gap',
    description: 'Statutory parental leave pay for a birth parent and the income gap against normal pay (gross, before tax) in the UK (Statutory Maternity Pay), Ireland (Maternity Benefit), Canada (EI), Quebec (QPIP), Australia (Parental Leave Pay) or a US state’s paid family and medical leave (us-CA, us-NY, us-NJ, us-WA, us-MA and the rest; us-XX = no state program, FMLA unpaid), with an optional employer top-up. Use this for a quick cross-country comparison of one parent’s gross leave pay; for detailed national rules use the country tools (canada_ei_maternity_parental, quebec_qpip, ireland_maternity_leave_pay, uk_statutory_maternity_pay, australia_parental_leave_pay).',
    page: '/parental-leave-planner/',
    inputSchema: { type: 'object', properties: { country: str('Country, or us- plus the state code', ['gb', 'ie', 'ca', 'qc', 'au', ...US_STATES.map((s) => `us-${s.code}`)]), salary: num('Gross annual pay in local currency'), weeks: num('Weeks of leave (default 52)'), topUp: num('Employer tops pay up to this share of normal pay, 0 to 1'), topUpWeeks: num('Weeks the top-up lasts') }, required: ['country', 'salary'] },
    run: (a) => {
      const r = leaveGap({ country: a.country, salary: a.salary, weeks: a.weeks ?? 52, topUp: a.topUp, topUpWeeks: a.topUpWeeks });
      return wrap('/parental-leave-planner/', { statutory: Math.round(r.statutory), topUp: Math.round(r.topUp), normal: Math.round(r.normal), gap: Math.round(r.gap), paidWeeks: r.paidWeeks },
        ['https://www.gov.uk/maternity-pay-leave/pay', 'https://www.citizensinformation.ie/en/social-welfare/families-and-children/maternity-benefit/', 'https://www.canada.ca/en/services/benefits/ei/ei-maternity-parental.html', 'https://www.quebec.ca/en/family-and-support-for-individuals/pregnancy-parenthood/financial-support-pregnant-women-families/quebec-parental-insurance-plan', 'https://www.servicesaustralia.gov.au/parental-leave-pay', 'https://edd.ca.gov/en/disability/Calculating_PFL_Benefit_Payment_Amounts/', 'https://paidfamilyleave.ny.gov/2026'], LEAVE_PLANNER_ALL);
    },
  },
  {
    name: 'parental_leave_bill_split',
    description: 'How a couple can share the household bills while one parent is on parental leave: the parent on leave’s statutory pay (UK SMP, Ireland Maternity Benefit, Canada EI, Quebec QPIP, Australia Parental Leave Pay or a US state’s paid leave; us-XX = unpaid FMLA) plus any employer top-up, averaged per month before tax, against the partner’s pay; the bills split 50/50, by income during leave, or so both keep the same money; savings the parent on leave would use under 50/50; and the pension contributions they miss.',
    page: '/tools/parental-leave-bill-split-calculator/',
    inputSchema: { type: 'object', properties: { country: str('Country, or us- plus the state code', ['gb', 'ie', 'ca', 'qc', 'au', ...US_STATES.map((s) => `us-${s.code}`)]), leaveSalary: num('Gross annual pay of the parent taking leave, local currency'), weeks: num('Weeks of leave (default 39)'), partnerSalary: num('Partner’s gross annual pay'), billsMonthly: num('Shared bills a month'), topUp: num('Employer tops pay up to this share of normal pay, 0 to 1'), topUpWeeks: num('Weeks the top-up lasts'), pensionRate: num('Pension contributions as a share of pay, 0 to 1 (default 0.08)') }, required: ['country', 'leaveSalary', 'partnerSalary', 'billsMonthly'] },
    run: (a) => {
      const r = billSplit({ country: a.country, leaveSalary: a.leaveSalary, weeks: a.weeks ?? 39, partnerSalary: a.partnerSalary, billsMonthly: a.billsMonthly, topUp: a.topUp, topUpWeeks: a.topUpWeeks, pensionRate: a.pensionRate ?? 0.08 });
      const sh = (x: { leavePays: number; partnerPays: number; leaveLeft: number; partnerLeft: number }) => ({ onLeavePays: Math.round(x.leavePays), partnerPays: Math.round(x.partnerPays), onLeaveLeft: Math.round(x.leaveLeft), partnerLeft: Math.round(x.partnerLeft) });
      return wrap('/tools/parental-leave-bill-split-calculator/', { perMonth: true, beforeTax: true, months: Math.round(r.months * 10) / 10, leaveIncome: Math.round(r.leaveIncome), partnerIncome: Math.round(r.partnerIncome), bills: r.bills, half: sh(r.half), byIncome: sh(r.proportional), sameLeft: sh(r.equal), shareOfBillsBefore: Math.round(r.shareBefore * 100) / 100, shareOfBillsDuring: Math.round(r.shareDuring * 100) / 100, savingsUsedUnderHalf: Math.round(r.halfShortfall), pensionGap: Math.round(r.pensionGap) },
        ['https://www.gov.uk/maternity-pay-leave/pay', 'https://www.citizensinformation.ie/en/social-welfare/families-and-children/maternity-benefit/', 'https://www.canada.ca/en/services/benefits/ei/ei-maternity-parental.html', 'https://www.servicesaustralia.gov.au/parental-leave-pay', 'https://edd.ca.gov/en/disability/Calculating_PFL_Benefit_Payment_Amounts/'], LEAVE_PLANNER_ALL);
    },
  },
  {
    name: 'us_dependent_care_fsa_vs_credit',
    description: 'US, tax year 2026: whether a dependent care FSA (limit $7,500 a household, employer money included) or the child and dependent care credit (50% of up to $3,000 / $6,000 of care costs, phasing to 35% from $15,000 of AGI and to 20% above $75,000, $150,000 joint) saves more, and the FSA amount that saves the most. Federal tax on the 2026 tables with the standard deduction, payroll tax (FICA) and a flat state rate; the credit is limited to the federal tax owed and to the lower earner’s pay.',
    page: '/tools/dependent-care-fsa-vs-credit-calculator/',
    inputSchema: { type: 'object', properties: { status: str('Filing status', ['mfj', 'hoh', 'single']), income: num('Household income before the FSA, USD'), kids: num('Children in paid care: 1, or 2 for two or more'), expenses: num('Care costs for the year, USD'), planLimit: num('Plan limit for your own contributions (default 7500)'), employer: num('Employer FSA contributions, USD'), fsaWages: num('Pay of the person with the FSA (for payroll tax), USD'), lowerEarned: num('Lower earner’s pay if married, or your pay, USD'), stateRate: num('State income tax rate, percent') }, required: ['status', 'income', 'kids', 'expenses'] },
    run: (a) => {
      const r = compareDependentCare({ status: a.status, income: a.income, kids: a.kids >= 2 ? 2 : 1, expenses: a.expenses, planLimit: a.planLimit, employer: a.employer, fsaWages: a.fsaWages, lowerEarned: a.lowerEarned, stateRate: a.stateRate });
      const o = (x: typeof r.best) => ({ fsa: Math.round(x.fsa), federalTaxSaved: Math.round(x.fedTaxSaved), payrollTaxSaved: Math.round(x.ficaSaved), stateTaxSaved: Math.round(x.stateSaved), creditRate: x.creditRate, credit: Math.round(x.credit), creditLostToTaxLimit: Math.round(x.creditLost), total: Math.round(x.total) });
      return wrap('/tools/dependent-care-fsa-vs-credit-calculator/', { taxYear: 2026, verdict: r.verdict, best: o(r.best), creditOnly: o(r.creditOnly), fullFsa: o(r.fsaMax), maxElection: r.maxElection, gainOverCreditAlone: Math.round(r.gainOverCredit) },
        ['https://www.law.cornell.edu/uscode/text/26/21', 'https://www.law.cornell.edu/uscode/text/26/129', 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf'], LEAVE_PLANNER_ALL);
    },
  },
  {
    name: 'us_pension_lump_sum_vs_monthly',
    description: 'US: a defined benefit pension’s lump sum offer against its monthly payments. Returns the interest rate the pension is paying (the discount rate at which the monthly payments, each weighted by the chance of being alive from the SSA 2023 period life table used in the 2026 Trustees Report, equal the lump sum; also the rate if you live exactly to life expectancy), the pension’s value at the user’s expected return, the plain break-even age, the age the lump sum runs out paying the same monthly amount at that return (the break-even once growth counts), life expectancy, the chance of being alive at each age, the payment’s buying power at life expectancy after inflation, and the PBGC maximum monthly guarantee at the start age (2026 and 2027 tables). Supports single life or joint and survivor (spouse age, survivor %) and a yearly COLA; return and inflation are the user’s assumptions; before tax. Use this when someone asks whether to take a pension lump sum or the monthly pension, what interest rate their pension is paying, or the break-even age of a lump sum offer.',
    page: '/tools/pension-lump-sum-vs-monthly-calculator/',
    inputSchema: { type: 'object', properties: { lumpSum: num('Lump sum offered, USD'), monthly: num('Monthly pension for the chosen form, USD'), startAge: num('Age the pension starts'), currentAge: num('Age today (the lump sum is paid now)'), sex: str('Life table to use', ['male', 'female', 'unisex']), form: str('Pension form', ['single', 'joint']), spouseAge: num('Spouse’s age today (joint)'), spouseSex: str('Spouse’s life table (joint)', ['male', 'female', 'unisex']), survivorPct: num('Survivor share of the payment, percent (joint, default 50)'), colaPct: num('Yearly cost-of-living increase, percent (default 0)'), returnPct: num('Expected return on the lump sum, percent a year (default 5)'), inflationPct: num('Inflation, percent a year (default 2.5)') }, required: ['lumpSum', 'monthly', 'startAge', 'currentAge'] },
    run: (a) => {
      const r = compareLumpSum({ lumpSum: a.lumpSum, monthly: a.monthly, startAge: a.startAge, currentAge: a.currentAge, sex: a.sex ?? 'unisex', form: a.form === 'joint' ? 'joint' : 'single', spouseAge: a.spouseAge, spouseSex: a.spouseSex, survivorPct: a.survivorPct, colaPct: a.colaPct ?? 0, returnPct: a.returnPct ?? 5, inflationPct: a.inflationPct ?? 2.5 });
      const r3 = (x: number | null) => (x === null ? null : Math.round(x * 1000) / 1000);
      const r2 = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);
      return wrap('/tools/pension-lump-sum-vs-monthly-calculator/', { impliedRate: r3(r.impliedRate), impliedRateToLifeExpectancy: r3(r.impliedRateToLe), pensionValueAtReturn: Math.round(r.pvAtReturn), pensionMinusLumpSum: Math.round(r.pvGain), breakEvenAge: r2(r.breakEvenAge), lumpSumRunsOutAge: r2(r.runOutAge), lifeExpectancyAge: r2(r.lifeExpectancyAge), spouseLifeExpectancyAge: r2(r.spouseLifeExpectancyAge), chanceAliveAtBreakEven: r2(r.pAliveAtBreakEven), chanceAliveAtRunOut: r2(r.pAliveAtRunOut), chanceEitherAliveAtRunOut: r2(r.pEitherAliveAtRunOut), monthlyAtLifeExpectancyInTodaysDollars: Math.round(r.realMonthlyAtLe), pbgcMaxMonthly: r.pbgc ? { 2026: { straightLife: r.pbgc[2026][0], jointAnd50: r.pbgc[2026][1] }, 2027: { straightLife: r.pbgc[2027][0], jointAnd50: r.pbgc[2027][1] } } : null, under59Half: r.under59Half, beforeTax: true },
        [LUMP_SOURCES.life, LUMP_SOURCES.pbgc, LUMP_SOURCES.rollover, LUMP_SOURCES.early, LUMP_SOURCES.pensions]);
    },
  },
  {
    name: 'us_divorce_asset_split_after_tax',
    description: 'US divorce, tax year 2026: the after-tax value of each asset for the spouse who receives it (transfers are tax-free under 26 U.S.C. 1041 but the receiver keeps the cost basis), with long-term capital gains at the 2026 0/15/20% thresholds and 3.8% NIIT, the $250,000 home sale exclusion (section 121) and selling costs, a 401(k) cashed out under a QDRO (income tax, no 10%) or kept invested (at a retirement tax rate), IRAs (10% if cashed out before 59½), Roth, cash and debts; returns each spouse’s share on paper and after tax and the cash payment that reaches the agreed share.',
    page: '/tools/divorce-asset-split-calculator/',
    inputSchema: { type: 'object', properties: {
      spouseA: { type: 'object', description: 'Spouse A after the divorce', properties: { status: str('Filing status', ['single', 'hoh']), income: num('Income a year, USD'), stateRate: num('State tax rate, percent'), retireRate: num('Tax rate when drawing pre-tax retirement money, percent (default 22)'), over59: bool('59½ or older') }, required: ['status', 'income'] },
      spouseB: { type: 'object', description: 'Spouse B after the divorce', properties: { status: str('Filing status', ['single', 'hoh']), income: num('Income a year, USD'), stateRate: num('State tax rate, percent'), retireRate: num('Tax rate when drawing pre-tax retirement money, percent (default 22)'), over59: bool('59½ or older') }, required: ['status', 'income'] },
      assets: { type: 'array', description: 'Assets and debts (up to 30)', items: { type: 'object', properties: { type: str('Asset type', ['cash', 'brokerage', 'home', 'k401', 'ira', 'roth', 'other', 'debt']), value: num('Market value (home: sale price; debt: balance), USD'), to: str('Who keeps it', ['A', 'B']), basis: num('Cost basis (brokerage, home), USD'), mortgage: num('Home: mortgage balance'), sellPct: num('Home: selling costs % (default 6)'), meetsUse: bool('Home: receiver will meet the 2-of-5-years use test (default true)'), cashOut: bool('401(k)/IRA: cashed out now'), qualified: bool('Roth: qualified (default true)'), label: { type: 'string' } }, required: ['type', 'value', 'to'] } },
      targetShareA: num('Spouse A’s agreed share, 0 to 1 (default 0.5)'),
    }, required: ['spouseA', 'spouseB', 'assets'] },
    run: (a) => {
      const sp = (s: any) => ({ status: s?.status === 'hoh' ? 'hoh' as const : 'single' as const, income: s?.income ?? 0, stateRate: s?.stateRate ?? 0, retireRate: s?.retireRate ?? 22, over59: !!s?.over59 });
      const r = divorceSplit({ A: sp(a.spouseA), B: sp(a.spouseB) }, (Array.isArray(a.assets) ? a.assets : []).slice(0, 30), a.targetShareA ?? 0.5);
      const round = (x: number) => Math.round(x);
      return wrap('/tools/divorce-asset-split-calculator/', { taxYear: 2026, paper: { A: round(r.paper.A), B: round(r.paper.B) }, futureTaxAndCosts: { A: round(r.tax.A), B: round(r.tax.B) }, afterTax: { A: round(r.afterTax.A), B: round(r.afterTax.B) }, paperShareA: Math.round(r.paperShareA * 1000) / 1000, afterTaxShareA: Math.round(r.afterTaxShareA * 1000) / 1000, cashFromAtoB: round(r.equaliser), assets: r.assets.map((x) => ({ label: x.label, to: x.to, paper: round(x.paper), tax: round(x.tax), afterTax: round(x.afterTax), note: x.note })), notLegalAdvice: true },
        ['https://www.law.cornell.edu/uscode/text/26/1041', 'https://www.law.cornell.edu/uscode/text/26/121', 'https://www.irs.gov/taxtopics/tc558', 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf']);
    },
  },
  {
    name: 'uk_voluntary_ni_from_abroad',
    description: 'UK State Pension for people living outside the UK: which gap years (2020–21 to 2026–27) can still be filled with voluntary National Insurance after the 6 April 2026 change, at Class 2 (£3.65/wk, years to 2025–26 only) or Class 3 (£18.40/wk), each year’s cost and 5 April deadline, and the State Pension gain (1/35 of £241.30 a week per year, up to 35 years) with payback.',
    page: '/tools/uk-voluntary-ni-abroad-calculator/',
    inputSchema: { type: 'object', properties: { qualifyingYears: num('Qualifying years already on the UK National Insurance record'), gapYears: { type: 'array', items: { type: 'number' }, description: 'Tax years to fill, by start year (e.g. 2023 = 2023–24); 2020 to 2026' }, ukResidenceYears: num('Longest stretch living in the UK, years in a row'), ukContributionYears: num('Years of UK contributions paid in total'), workedBeforeLeaving: bool('Worked in the UK immediately before leaving'), workedAbroad: bool('Has worked while abroad'), appliedBefore2026: bool('Applied to pay for 2024–25 or 2025–26 on or before 5 April 2026') }, required: ['qualifyingYears', 'gapYears'] },
    run: (a) => wrap('/tools/uk-voluntary-ni-abroad-calculator/', computeNi({ qualifyingYears: a.qualifyingYears, gapYears: Array.isArray(a.gapYears) ? a.gapYears : [], ukResidenceYears: a.ukResidenceYears ?? 10, ukContributionYears: a.ukContributionYears ?? 10, workedBeforeLeaving: !!a.workedBeforeLeaving, workedAbroad: !!a.workedAbroad, appliedBefore2026: !!a.appliedBefore2026 }),
      ['https://www.gov.uk/voluntary-national-insurance-contributions/print', 'https://www.gov.uk/government/publications/voluntary-national-insurance-contributions-for-periods-abroad-from-6-april-2026/voluntary-national-insurance-contributions-abroad-from-6-april-2026', 'https://www.gov.uk/new-state-pension/what-youll-get']),
  },
  {
    name: 'ireland_etf_exit_tax_lots',
    description: 'Ireland: exit tax on ETF purchases (lots): each lot’s 8-year deemed disposal dates, the tax due at each (41% to 2025, 38% in 2026, 35% from 2027 under Budget 2027) and the credit back when you sell. Values not given are grown at the rate you set (an assumption).',
    page: '/tools/ireland-etf-exit-tax-calculator/',
    inputSchema: { type: 'object', properties: {
      lots: { type: 'array', description: 'Purchases (up to 50)', items: { type: 'object', properties: { bought: { type: 'string', description: 'Purchase date YYYY-MM-DD' }, cost: { type: 'number', description: 'Amount paid including fees, EUR' }, values: { type: 'array', items: { type: 'number' }, description: 'Optional known values at the 1st, 2nd… 8-year dates, EUR' }, sold: { type: 'object', properties: { date: { type: 'string' }, value: { type: 'number' } }, description: 'Optional sale: date YYYY-MM-DD and value, EUR' } }, required: ['bought', 'cost'] } },
      growth: num('Growth % a year for values not given (default 5, an assumption)'),
      until: { type: 'string', description: 'Show events up to this date, YYYY-MM-DD (default 20 years from today)' },
    }, required: ['lots'] },
    run: (a) => {
      const today = new Date().toISOString().slice(0, 10);
      const until = typeof a.until === 'string' ? a.until : (Number(today.slice(0, 4)) + 20) + today.slice(4);
      const lots = (Array.isArray(a.lots) ? a.lots : []).slice(0, 50);
      return wrap('/tools/ireland-etf-exit-tax-calculator/', computeEtfLots({ lots, growth: a.growth ?? 5, until }, today),
        ['https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/27-01a-02.pdf', 'https://www.gov.ie/en/department-of-public-expenditure-infrastructure-public-service-reform-and-digitalisation/publications/your-guide-to-budget-2027/'], ETF_TRACKER);
    },
  },
  {
    name: 'uk_stamp_duty_on_date',
    description: 'England and Northern Ireland: Stamp Duty Land Tax on a purchase completed on any date from 1 December 2003 to today, using the rates in force that day (slab system before 4 December 2014, slices after; first-time buyer relief from 22 November 2017; 3% then 5% higher rates for additional homes; 2% non-resident surcharge from 1 April 2021). Returns the GOV.UK page for that period.',
    page: '/articles/uk-stamp-duty-rates-by-year/',
    inputSchema: { type: 'object', properties: { price: num('Purchase price, GBP'), date: { type: 'string', description: 'Completion date YYYY-MM-DD' }, buyer: str('Buyer', ['standard', 'firstTimeBuyer', 'additional']), nonResident: bool('Buyer not UK resident (applies from 1 April 2021)') }, required: ['price', 'date'] },
    run: (a) => {
      const r = computeSdltHistory({ price: a.price, date: String(a.date), buyer: a.buyer ?? 'standard', nonResident: !!a.nonResident });
      const result = { ...r, period: r.period ? { label: r.period.label, from: r.period.from, to: r.period.to, url: r.period.url } : null };
      return wrap('/articles/uk-stamp-duty-rates-by-year/', result, [r.period?.url ?? 'https://www.gov.uk/stamp-duty-land-tax/residential-property-rates', 'https://www.gov.uk/government/publications/rates-and-allowances-stamp-duty-land-tax']);
    },
  },
  {
    name: 'uk_statutory_maternity_pay',
    description: 'UK: Statutory Maternity Pay (2026/27): 90% of average weekly pay for 6 weeks, then £194.32 or 90% if lower for 33 weeks; average pay must be at least £129 a week. Optional employer scheme (full-pay weeks, then half pay plus SMP), and the gap against normal pay before tax.',
    page: '/tools/uk-maternity-pay-calculator/',
    inputSchema: { type: 'object', properties: { weeklyPay: num('Average weekly earnings before tax, GBP'), leaveWeeks: num('Weeks of leave, 1 to 52 (default 39)'), eligible: bool('26 weeks with the employer by the qualifying week (default true)'), employerFullWeeks: num('Weeks the employer pays full pay (SMP counts towards it)'), employerHalfWeeks: num('Weeks after that at half pay plus SMP') }, required: ['weeklyPay'] },
    run: (a) => {
      const { weeks, ...rest } = computeSmp({ weeklyPay: a.weeklyPay, leaveWeeks: a.leaveWeeks ?? 39, eligible: a.eligible ?? true, employerFullWeeks: a.employerFullWeeks, employerHalfWeeks: a.employerHalfWeeks });
      return wrap('/tools/uk-maternity-pay-calculator/', rest, ['https://www.gov.uk/maternity-pay-leave/pay', 'https://www.gov.uk/maternity-pay-leave/eligibility'], LEAVE_PLANNER_ALL);
    },
  },
  {
    name: 'australia_parental_leave_pay',
    description: 'Australia: Parental Leave Pay for one or two parents sharing the 130 days (A$200.94 a day from 1 July 2026, the national minimum wage) with 12% super paid on it, optional employer full-pay weeks, and the gap against normal pay before tax.',
    page: '/tools/australia-parental-leave-pay-calculator/',
    inputSchema: { type: 'object', properties: { parents: { type: 'array', description: 'One or two parents', items: { type: 'object', properties: { weeklyPay: num('Normal weekly pay before tax, AUD'), plpWeeks: num('Weeks of Parental Leave Pay this parent takes (5 days a week)'), employerFullWeeks: num('Weeks of employer-paid leave at full pay') }, required: ['weeklyPay', 'plpWeeks'] } } }, required: ['parents'] },
    run: (a) => wrap('/tools/australia-parental-leave-pay-calculator/', computePlp({ parents: (Array.isArray(a.parents) ? a.parents : []).slice(0, 2) }),
      ['https://www.servicesaustralia.gov.au/more-parental-leave-pay-days-from-1-july-2026'], LEAVE_PLANNER_ALL),
  },
  {
    name: 'ireland_budget_2027_welfare',
    description: 'Ireland: the extra a household gets in social welfare from January 2027 under Budget 2027: core weekly payments +€10, Fuel Allowance +€5 a week (28-week season), Living Alone Allowance +€3, Child Support Payment +€6 per child; Child Benefit unchanged at €140 a month per child.',
    page: '/tools/ireland-budget-2027-calculator/',
    inputSchema: { type: 'object', properties: { corePayments: num('People getting a core weekly payment (State Pension, Jobseeker’s, Carer’s, Disability…)'), fuelAllowance: bool('Gets Fuel Allowance'), livingAlone: bool('Gets Living Alone Allowance'), cspChildren: num('Children with a Child Support Payment'), children: num('Children getting Child Benefit') }, required: ['corePayments'] },
    run: (a) => wrap('/tools/ireland-budget-2027-calculator/', budgetHousehold({ corePayments: a.corePayments ?? 0, fuelAllowance: !!a.fuelAllowance, livingAlone: !!a.livingAlone, cspChildren: a.cspChildren ?? 0, children: a.children ?? 0 }),
      ['https://www.gov.ie/en/department-of-public-expenditure-infrastructure-public-service-reform-and-digitalisation/publications/your-guide-to-budget-2027/']),
  },
  {
    name: 'us_medicaid_spend_down',
    description: 'US nursing-home Medicaid, 2026: savings above the state asset limit (the spend-down), what a spouse at home keeps (CSRA $32,532-$162,660 by the state rule) and their monthly income allowance (MMMNA $2,705-$4,066.50), months the savings pay for care, the look-back penalty (gifts ÷ the state penalty divisor, part months kept), the month Medicaid starts and what the person pays on Medicaid (income less the personal needs allowance, spouse allowance and premiums). State figures are each state’s own (marked official or check); where a state figure was not found, the result says so and the caller can pass it.',
    page: '/tools/medicaid-spend-down-calculator/',
    inputSchema: { type: 'object', properties: {
      state: str('Two-letter state code', US_CARE_STATES.map((x) => x.code)), assets: num('Countable savings and investments, USD (a couple: both together; not the home)'),
      incomeMonthly: num('The person’s gross income a month, USD'), costMonthly: num('Nursing home cost a month, USD (default: the state’s penalty divisor)'),
      married: bool('A spouse still lives at home'), spouseIncomeMonthly: num('Spouse’s own income a month'), spouseShelterMonthly: num('Spouse’s housing costs a month'),
      giftsInLookback: num('Gifts or below-value transfers in the look-back, USD'), premiumsMonthly: num('Health insurance premiums a month'),
      careType: str('Type of care', ['nursing', 'assisted', 'home']), waiver: bool('A Medicaid waiver pays for assisted living or home care'),
      assetLimit: num('State asset limit, if known (overrides ours)'), penaltyDivisor: num('State penalty divisor a month, if known (overrides ours)'),
    }, required: ['state', 'assets', 'incomeMonthly'] },
    run: (a) => {
      const F = usFigures({ state: a.state });
      const cost = a.costMonthly ?? (F.divisor || 0);
      const r = projectUS({ state: a.state, married: !!a.married, assets: a.assets ?? 0, income: a.incomeMonthly ?? 0, spouseIncome: a.spouseIncomeMonthly ?? 0, shelter: a.spouseShelterMonthly ?? 0,
        premiums: a.premiumsMonthly ?? 0, homeEquity: 0, homeProtected: true, careType: a.careType ?? 'nursing', waiver: !!a.waiver, cost, gifts: a.giftsInLookback ?? 0,
        costInflation: 3, incomeGrowth: 2, savingsGrowth: 2, assetLimit: a.assetLimit ?? null, divisor: a.penaltyDivisor ?? null });
      const round = (x: number) => Math.round(x * 100) / 100;
      const s = r.figures.state;
      return wrap('/tools/medicaid-spend-down-calculator/', {
        state: s.name, costMonthlyUsed: round(cost), spendDown: round(r.spendable), spouseKeeps: round(r.csra), spouseIncomeAllowance: round(r.allowance),
        savingsPayMonths: r.savingsMonths, penaltyMonths: round(r.penaltyMonths), medicaidStartsMonth: r.medicaidMonth, payOnMedicaidMonthly: round(r.liability),
        familyPaysFirst3Years: Math.round(r.years.slice(0, 3).reduce((t, y) => t + y.family, 0)),
        stateFigures: { assetLimit: s.asset ? { value: s.asset.v, confidence: s.asset.conf } : 'not found', penaltyDivisor: s.divisor ? { value: s.divisor.v, unit: s.divisor.unit, effective: s.divisor.eff, confidence: s.divisor.conf } : 'not found',
          personalNeedsAllowance: s.pna ? { value: s.pna.v, confidence: s.pna.conf } : 'not found (federal $30 floor used)', source: s.source },
        warnings: [r.overIncomeCap ? 'Income over the state cap: a Qualified Income Trust is needed.' : '', s.code === 'CA' ? 'California looks back 30 months, not before January 2026.' : '', 'Medicare does not pay for long-term care.'].filter(Boolean),
        assumptions: 'Costs +3%/yr, income +2%/yr, savings +2%/yr; not legal advice; no Medicaid planning strategies.',
      }, ['https://www.medicaid.gov/federal-policy-guidance/downloads/cib04272026.pdf', 'https://www.ssa.gov/OP_Home/ssact/title19/1917.htm', s.source], CARE_PLANNER);
    },
  },
  {
    name: 'uk_care_home_fees',
    description: 'UK care home fees, 2026/27, by nation (England, Scotland, Wales, Northern Ireland): weeks until savings (and the home after the 12-week disregard) fall to the upper capital limit (£23,250 England/NI, £36,750 Scotland, £50,000 Wales) and the council helps; then tariff income (£1 a week per £250 between the limits), the person’s weekly contribution (income + tariff − personal allowance), the council’s share and any family top-up above the council rate; NHS-funded nursing care (£267.68 England, £100 NI) and Scotland’s free personal (£260.30) and nursing (£117.10) care.',
    page: '/tools/uk-care-home-fees-calculator/',
    inputSchema: { type: 'object', properties: {
      nation: str('Nation', ['england', 'scotland', 'wales', 'ni']), careType: str('Type of care', ['residential', 'nursing', 'home']),
      feeWeekly: num('Care home fee a week, GBP'), councilRateWeekly: num('Council’s usual rate a week (default: the fee)'), savings: num('Savings and investments, GBP'),
      homeEquity: num('Home value less mortgage, GBP'), homeDisregarded: bool('A partner or qualifying relative still lives in the home'), incomeWeekly: num('Income a week, GBP'),
    }, required: ['nation', 'feeWeekly', 'savings', 'incomeWeekly'] },
    run: (a) => {
      const r = projectUK({ nation: a.nation ?? 'england', careType: a.careType ?? 'residential', fee: a.feeWeekly ?? 0, councilRate: a.councilRateWeekly ?? a.feeWeekly ?? 0, savings: a.savings ?? 0,
        homeEquity: a.homeEquity ?? 0, homeDisregarded: !!a.homeDisregarded, income: a.incomeWeekly ?? 0, personalShare: 100, feeInflation: 4, incomeGrowth: 3, savingsGrowth: 2, homeGrowth: 0, dpaRate: 0 });
      const round = (x: number) => Math.round(x * 100) / 100;
      return wrap('/tools/uk-care-home-fees-calculator/', {
        nation: r.rules.name, upperLimit: r.rules.upper, councilHelpsAfterWeeks: r.councilWeek, nhsOrScottishPaymentsWeekly: round(r.fixedPublicNow),
        atCouncil: r.atCouncil ? { tariffIncomeWeekly: round(r.atCouncil.tariff), personPaysWeekly: round(r.atCouncil.contribution), councilPaysWeekly: round(r.atCouncil.councilPays), familyTopUpWeekly: round(r.atCouncil.topUp) } : null,
        familyPaysFirst5Years: Math.round(r.years.slice(0, 5).reduce((t, y) => t + y.family, 0)),
        assumptions: 'Fees +4%/yr, income +3%/yr, savings +2%/yr; the home counts after 12 weeks unless disregarded and pays through a deferred payment; not advice.',
      }, [r.rules.source, 'https://www.gov.uk/government/publications/care-act-statutory-guidance/care-and-support-statutory-guidance', 'https://www.nhs.uk/social-care-and-support/money-work-and-benefits/nhs-funded-nursing-care/'], CARE_PLANNER);
    },
  },
  {
    name: 'ireland_fair_deal_contribution',
    description: 'Ireland Nursing Homes Support Scheme (Fair Deal): the weekly contribution (80% of assessable income and 7.5% a year of assets over €36,000; a couple 40% of combined income and 3.75% over €72,000), what the HSE pays, the contribution after the 3-year cap on the home, and the Nursing Home Loan balance after 5 years.',
    page: '/tools/ireland-fair-deal-calculator/',
    inputSchema: { type: 'object', properties: {
      costWeekly: num('Nursing home’s agreed weekly price, EUR'), incomeWeekly: num('Assessable income a week, EUR (a couple: combined)'), savings: num('Savings and other assets, EUR'),
      homeEquity: num('Home value less mortgage, EUR'), couple: bool('A spouse or partner still lives at home'), useLoan: bool('Use the Nursing Home Loan (default true)'),
      spncWeekly: num('Maximum State Pension (Non-Contributory) a week, if known (raises the allowance kept)'),
    }, required: ['costWeekly', 'incomeWeekly'] },
    run: (a) => {
      const r = projectIE({ couple: !!a.couple, cost: a.costWeekly ?? 0, extras: 0, income: a.incomeWeekly ?? 0, savings: a.savings ?? 0, homeEquity: a.homeEquity ?? 0, useLoan: a.useLoan !== false,
        spnc: a.spncWeekly ?? 0, costInflation: 3, incomeGrowth: 2, savingsGrowth: 1, cpi: 2 });
      const round = (x: number) => Math.round(x * 100) / 100;
      return wrap('/tools/ireland-fair-deal-calculator/', {
        contributionWeekly: round(r.now.contribution), fromIncomeWeekly: round(r.now.incomeC), fromAssetsWeekly: round(r.now.assetC), hsePaysWeekly: round(r.now.hse),
        contributionAfter3YearCapWeekly: round(r.afterCap.contribution), nursingHomeLoanAfter5Years: Math.round(r.weeks[259].loanEnd),
        note: 'Assets transferred in the 5 years before applying are counted. The HSE assesses each application.',
      }, ['https://www2.hse.ie/services/schemes-allowances/fair-deal-scheme/financial-assessment/', 'https://www2.hse.ie/services/schemes-allowances/fair-deal-scheme/3-year-cap/', 'https://www2.hse.ie/services/schemes-allowances/fair-deal-scheme/nursing-home-loan/'], CARE_PLANNER);
    },
  },
  {
    name: 'home_buying_cash_needed',
    description: 'Buying a home in the US, UK, Canada, Australia or Ireland: the cash needed on the day and the monthly cost. Purchase tax from the official schedules with first-time buyer relief (England and NI SDLT, Scotland LBTT, Wales LTT; Canadian land transfer tax or registration fee by province with first-time buyer refunds; Australian transfer duty with each state’s first home buyer concessions; Irish stamp duty, on the VAT-exclusive price for a new home), the CMHC premium and the sales tax on it (Canada), the First Home Owner Grant and 5% Deposit Scheme (Australia), Help to Buy (Ireland), the GST rebate on a new home (Canada), fees (estimates you can pass), the mortgage payment, PMI (US, until 78%), the lender test of the country (US 28/36 rule of thumb, Canadian stress test GDS/TDS, APRA 3-point buffer, Central Bank 4x/3.5x income, UK 4.5x guide), months of saving until the cash is there and the first year buying beats renting (rent vs buy model). Rules read 9 November 2026.',
    page: '/home-buying-planner/',
    inputSchema: { type: 'object', properties: {
      country: str('Country edition', ['us', 'gb', 'ca', 'au', 'ie']),
      region: { type: 'string', description: `US state code (${HOME_US.map(([c]) => c).join(', ')}); UK nation (${GB_NATIONS.join(', ')}); Canadian province code (${HOME_CA.join(', ')}); Australian state (${AU_STATES.join(', ')}); Ireland: leave out` },
      price: num('Price of the home, local currency'), firstTime: bool('First-time buyer (default true)'), newBuild: bool('Newly built home (Canada, Australia, Ireland)'),
      depositPct: num('Deposit or down payment, % of the price (default 10)'), income: num('Household gross income a year'), savings: num('Saved so far'), monthlySaving: num('Saved each month'),
      rate: num('Mortgage rate, % a year'), term: num('Mortgage term or amortization, years'), rent: num('Rent paid now, a month'),
    }, required: ['country', 'price'] },
    run: (a) => {
      const ed = (['us', 'gb', 'ca', 'au', 'ie'] as const).includes(a.country) ? a.country as 'us' : 'us';
      const d = HOME_DEFAULTS[ed];
      const ok = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
      const regions: Record<string, string[]> = { us: HOME_US.map(([c]) => c), gb: [...GB_NATIONS], ca: HOME_CA, au: AU_STATES, ie: [''] };
      const input: HomePlanInput = {
        ...d, edition: ed, region: regions[ed].includes(a.region) ? a.region : d.region, price: ok(a.price) ? a.price : d.price,
        firstTime: a.firstTime !== false, newBuild: !!a.newBuild, depositPct: ok(a.depositPct) && a.depositPct <= 100 ? a.depositPct : d.depositPct,
        ...(ok(a.income) ? { income1: a.income, income2: 0 } : {}), ...(ok(a.savings) ? { savings: a.savings } : {}), ...(ok(a.monthlySaving) ? { monthlySaving: a.monthlySaving } : {}),
        ...(ok(a.rate) ? { rate: a.rate } : {}), ...(ok(a.term) && a.term > 0 ? { term: a.term } : {}), ...(ok(a.rent) ? { rent: a.rent } : {}),
      };
      const r = computePlan(input);
      const R = (v: number) => Math.round(v);
      const src = { us: [HOME_SOURCES.pmiCfpb, HOME_SOURCES.fannieDti, HOME_SOURCES.taxFoundation, HOME_SOURCES.cfpbFtb], gb: [HOME_SOURCES.sdlt, HOME_SOURCES.lbtt, HOME_SOURCES.ltt, HOME_SOURCES.lisa, HOME_SOURCES.hmlr],
        ca: [HOME_SOURCES.cmhc, HOME_SOURCES.osfi, HOME_SOURCES.gdsTds, HOME_SOURCES.on, HOME_SOURCES.bc, HOME_SOURCES.gstRebate], au: [HOME_SOURCES.deposit5, HOME_SOURCES.apra, HOME_SOURCES.nsw, HOME_SOURCES.vic, HOME_SOURCES.qldHome, HOME_SOURCES.wa],
        ie: [HOME_SOURCES.ieStamp, HOME_SOURCES.htb, HOME_SOURCES.cbi, HOME_SOURCES.lpt, HOME_SOURCES.tailte] }[ed];
      return wrap('/home-buying-planner/', {
        country: ed, region: input.region, cashNeeded: R(r.cashNeeded), deposit: R(r.deposit), purchaseTax: R(r.tax), firstTimeBuyerRelief: R(r.relief), fees: R(r.fees),
        mortgageInsurance: ed === 'ca' ? { premiumAddedToLoan: R(r.premium), salesTaxInCash: R(r.premiumTax) } : ed === 'au' ? { lmiEstimate: R(r.lmi), depositScheme: r.schemeOk } : ed === 'us' ? { pmiFirstYear: R(r.pmi1), pmiMonths: r.pmiMonths } : null,
        helpAtPurchase: R(r.grant), mortgage: R(r.loan), monthlyPayment: R(r.pi), ownMonthlyYearOne: R(r.ownMonthly),
        lenderTest: Object.fromEntries(Object.entries(r.aff).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
        monthsUntilYouCanBuy: r.buyIn ?? 'over 20 years', buyingBeatsRentingFromYear: r.breakEven ?? 'not within 30 years',
        assumptions: 'Fees, moving, insurance, maintenance and growth rates are the planner’s example values unless passed; lenders decide for themselves.',
      }, src, HOME_PLANNER);
    },
  },
];

export const toolByName = (name: string) => AGENT_TOOLS.find((t) => t.name === name);
