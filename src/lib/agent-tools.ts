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
import { computeTca, MAX_RATE } from './calc/ie-state-pension';
import { compareBudget } from './calc/ie-budget-2027';
import { householdLeave } from './calc/ie-parental-leave';
import { checkEntitlements } from './calc/ie-entitlements';
import { computeHtb } from './calc/ie-help-to-buy';
import { computeIeCgt } from './calc/ie-cgt';
import { computeMff } from './calc/ie-mff';
import { computeHomes } from './calc/ie-money-homes';
import { computeSdlt } from './calc/uk-stamp-duty';
import { computeLbtt } from './calc/scotland-lbtt';
import { computeLtt } from './calc/wales-ltt';
import { computeCaEi } from './calc/ca-ei-benefit';
import { computeQpip } from './calc/ca-qpip';
import { computeAuHealth } from './calc/au-health-rebate';
import { computeKiwiSaver } from './calc/nz-kiwisaver';
import { leaveGap } from './calc/parental-leave-gap';
import { computeNi } from './calc/uk-voluntary-ni';

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
const LEAVE_PLANNER_ALL = { ...LEAVE_PLANNER, what: 'Week-by-week leave pay for both parents, employer top-ups, each week’s dated rate and a monthly savings target; UK, Ireland, Australia and Canada (EI and QPIP) editions.' };
const ETF_TRACKER = { name: 'Irish ETF Exit Tax Tracker (spreadsheet, US$15 one-time)', url: '/irish-etf-tax-tracker/', what: 'Every ETF purchase’s 8-year deemed disposal date and exit tax due each year (38% in 2026, 35% from 2027), with credit on sale. Free one-holding calculator on the page.' };
const str = (description: string, values: string[]) => ({ type: 'string', enum: values, description });
/** Drop year-by-year arrays: agents get the summary, the page has the detail. */
const summary = <T extends Record<string, unknown>>(r: T) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'years'));

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
    name: 'ireland_fuel_allowance',
    description: 'Ireland: check the Fuel Allowance means test (66+: €534 a week single, €640.80 from January 2027; under 66 needs a qualifying payment) and the 2026/27 season amount (€38, then €43 a week; €1,134 in lump sums).',
    page: '/tools/ireland-fuel-allowance-calculator/',
    inputSchema: { type: 'object', properties: { period: { type: 'string', enum: ['2026', '2027'] }, aged66: bool('Applicant is 66 or over'), couple: bool('Lives with a partner'), partner66: bool('Partner is 66 or over'), qualifyingPayment: bool('Under 66: gets a qualifying social welfare payment'), householdOk: bool('Lives alone or only with people the rules allow'), incomeWeekly: num('Gross weekly income that counts, EUR'), capital: num('Savings, EUR') }, required: ['incomeWeekly'] },
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
    inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['single', 'single-parent', 'married-one', 'married-two'] }, pay1: num('Gross pay a year, EUR'), pay2: num('Partner gross pay a year, EUR (married-two)'), selfEmployed: bool('Self-employed'), renter: bool('Claims the rent tax credit'), homeCarer: bool('Home carer credit (married-one)') }, required: ['status', 'pay1'] },
    run: (a) => wrap('/tools/ireland-budget-2027-calculator/', compareBudget({ status: a.status, pay1: a.pay1, pay2: a.pay2, selfEmployed: !!a.selfEmployed, renter: !!a.renter, homeCarer: !!a.homeCarer }),
      ['https://www.gov.ie/en/department-of-public-expenditure-infrastructure-public-service-reform-and-digitalisation/publications/your-guide-to-budget-2027/']),
  },
  {
    name: 'ireland_maternity_leave_pay',
    description: 'Ireland: each parent’s take-home pay in the year of maternity/paternity/parent’s leave against a normal year (Maternity Benefit €299 a week in 2026, €309 from 2027; taxed but no USC or PRSI), the household gap and a monthly saving target.',
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
    description: 'Canada (outside Quebec): EI maternity and parental benefits for 2026: 55% of insurable earnings up to $729 a week (standard) or 33% up to $437 (extended), 15 weeks maternity, parental weeks, one-week waiting period.',
    page: '/tools/canada-ei-benefit-calculator/',
    inputSchema: { type: 'object', properties: { annualIncome: num('Gross annual insurable earnings, CAD'), includeMaternity: bool('Include the 15 weeks of maternity benefits (birth parent)'), standardParentalWeeks: num('Parental weeks at the standard rate (your share, up to 35)'), extendedParentalWeeks: num('Parental weeks at the extended rate (your share, up to 61)') }, required: ['annualIncome'] },
    run: (a) => wrap('/tools/canada-ei-benefit-calculator/', computeCaEi({ annualIncome: a.annualIncome, includeMaternity: a.includeMaternity ?? true, standardParentalWeeks: a.standardParentalWeeks ?? 35, extendedParentalWeeks: a.extendedParentalWeeks ?? 0 }),
      ['https://www.canada.ca/en/services/benefits/ei/ei-maternity-parental.html', 'https://www.canada.ca/en/services/benefits/ei/ei-maternity-parental/benefit-amount.html'], LEAVE_PLANNER_ALL),
  },
  {
    name: 'quebec_qpip',
    description: 'Quebec: QPIP (RQAP) parental insurance for 2026 for both parents: basic or special plan, birth or adoption, earnings up to $103,000, weekly amounts and totals, with the shareable weeks split between parents.',
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
    description: 'Statutory parental leave pay for a birth parent and the income gap against normal pay (gross, before tax) in the UK (Statutory Maternity Pay), Ireland (Maternity Benefit), Canada (EI), Quebec (QPIP) or Australia (Parental Leave Pay), with an optional employer top-up.',
    page: '/parental-leave-planner/',
    inputSchema: { type: 'object', properties: { country: str('Country', ['gb', 'ie', 'ca', 'qc', 'au']), salary: num('Gross annual pay in local currency'), weeks: num('Weeks of leave (default 52)'), topUp: num('Employer tops pay up to this share of normal pay, 0 to 1'), topUpWeeks: num('Weeks the top-up lasts') }, required: ['country', 'salary'] },
    run: (a) => {
      const r = leaveGap({ country: a.country, salary: a.salary, weeks: a.weeks ?? 52, topUp: a.topUp, topUpWeeks: a.topUpWeeks });
      return wrap('/parental-leave-planner/', { statutory: Math.round(r.statutory), topUp: Math.round(r.topUp), normal: Math.round(r.normal), gap: Math.round(r.gap), paidWeeks: r.paidWeeks },
        ['https://www.gov.uk/maternity-pay-leave/pay', 'https://www.citizensinformation.ie/en/social-welfare/families-and-children/maternity-benefit/', 'https://www.canada.ca/en/services/benefits/ei/ei-maternity-parental.html', 'https://www.quebec.ca/en/family-and-support-for-individuals/pregnancy-parenthood/financial-support-pregnant-women-families/quebec-parental-insurance-plan', 'https://www.servicesaustralia.gov.au/parental-leave-pay'], LEAVE_PLANNER_ALL);
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
];

export const toolByName = (name: string) => AGENT_TOOLS.find((t) => t.name === name);
