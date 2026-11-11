/**
 * NZ (New Zealand) data pack — launched 2026-11 as a measured market test.
 *
 * Rule for this pack: every NZ figure comes from an official or primary source
 * (Stats NZ, IRD, RBNZ, MBIE Tenancy Services, Work and Income, QV), read on
 * the date given in `reviewedBy`. A calculator whose result depends on a figure
 * no such source publishes is EXCLUDED for NZ (EXCLUDED_TOOLS in
 * src/lib/locale.js) instead of guessed: it gets no entry here and its
 * /nz/tools/ page is a noindex pointer to the general calculator.
 *
 * Inputs that describe the user's own life (lunch spend, savings, years) keep
 * the base example values; they are examples to overwrite, not NZ data.
 */
import type { PackEntry } from '../../lib/packSchema';

const READ = 'read on 2026-11-03';
const EXAMPLES = 'The other inputs are example values for you to change, not New Zealand data. General information, not advice.';

// Figures (each pinned by published-figures.nz.test.ts):
//  NZ Super single living alone $1,294.74/fortnight gross from 1 April 2026 (Work and Income) → $2,805/month.
//  Stats NZ median weekly earnings from wages and salaries $1,419, June 2026 quarter → $73,788/yr.
//  QV national average residential value $892,580, September 2026.
//  RBNZ B30: new 2-year fixed mortgages 5.09% (September 2026, released 5 Nov 2026). RBNZ B3: credit card rate on interest-bearing debt 20.0% (July 2026).
//  MBIE Tenancy Services bond data: national median rent $595/week, bonds lodged August 2026 → $2,578/month.
//  Stats NZ HES year ended June 2023 (average weekly household spend): food $299.50, transport $251.60,
//    household energy $49.10 + telecommunication services $33.70, local authority rates $43.90 (all households).
//  IRD kilometre rates 2025-26: petrol Tier 2 (running costs, beyond 14,000 km) 37c/km.
const pack: Record<string, PackEntry> = {
  'fire-calculator': {
    defaults: { ssBenefit: 2805 },
    labels: { ssBenefit: 'Est. NZ Super ($/mo, before tax)' },
    context: {
      title: 'What changes in New Zealand',
      points: [
        '**NZ Super is paid from 65 and is not means-tested**: what you earned or saved does not reduce it. From 1 April 2026 a single person living alone gets **$1,294.74 a fortnight before tax** ($1,110.30 after tax at the M code); each partner in a couple gets $984.28.',
        'Eligibility depends on **residence, not contributions**: you generally need to have lived in New Zealand for a set number of years after age 20, so recent arrivals should check before counting on it.',
        '**KiwiSaver is locked until 65** except for a first home, serious hardship, serious illness or permanent emigration, so an early retirement has to be bridged from savings held outside it.',
        'New Zealand has no general capital gains tax. Managed funds are usually **PIEs taxed at your prescribed investor rate (10.5%, 17.5% or 28%)**, and offshore shares costing over $50,000 fall under the foreign investment fund rules.',
      ],
    },
    source: 'Work and Income: NZ Super rates from 1 April 2026 ($1,294.74/fortnight gross, single living alone ≈ $2,805/month)',
    asOf: '2026-11',
    reviewedBy: `NZ Super rate ${READ} against the named source. ${EXAMPLES}`,
  },

  'compound-interest-calculator': {
    defaults: { principal: 10000, monthly: 200, rate: 7, years: 20 },
    context: {
      title: 'What changes in New Zealand',
      points: [
        'Most New Zealand managed funds and KiwiSaver funds are **portfolio investment entities (PIEs)**, taxed inside the fund at your **prescribed investor rate: 10.5%, 17.5% or 28%**. Giving the fund the wrong rate, or none, means 28% by default.',
        'Offshore shares held directly are taxed under the **foreign investment fund (FIF) rules once their total cost exceeds $50,000**: above that, all of them are taxed on a deemed return each year, not just the excess.',
        'There is **no general capital gains tax**, so the growth on a long-held New Zealand share portfolio is usually untaxed when you sell, unless you are a trader or bought to resell.',
        'Bank interest is taxed at your income tax rate (resident withholding tax is deducted at source), while a PIE term deposit caps the tax at 28%, which helps anyone on the 30%, 33% or 39% income tax rates.',
      ],
    },
    source: 'IRD: PIR rates 10.5% / 17.5% / 28% (IR861, March 2026); FIF $50,000 cost threshold (IRD FIF exemptions); income tax rates from 1 April 2025',
    asOf: '2026-11',
    reviewedBy: `Tax rules ${READ} against the named IRD sources. The growth rate and amounts are example inputs, not a forecast. General information, not advice.`,
  },

  'debt-payoff-calculator': {
    defaults: { marginalRate: 30 },
    data: {
      exampleDebts: [
        { name: 'Credit Card', balance: 4000, apr: 20.0, minPay: 120 },
        { name: 'Student Loan (NZ-based)', balance: 20000, apr: 0, minPay: 250 },
      ],
    },
    context: {
      title: 'What changes in New Zealand',
      points: [
        'The average rate on interest-bearing credit card debt was **20.0% in July 2026** (Reserve Bank). Paying that down beats almost any investment return.',
        '**A student loan is interest-free while you live in New Zealand**, and repayments of 12% of income above $24,128 come out of your pay automatically. Paying it off early earns nothing, so it belongs last in any payoff order.',
        'Moving overseas changes that: overseas-based borrowers are charged interest, so the order flips if you leave.',
        'Income tax rates are 10.5%, 17.5%, 30%, 33% and 39% (from 1 April 2025); the 30% default is the rate on income between $53,501 and $78,100, which includes the median wage.',
      ],
    },
    source: 'RBNZ B3: effective credit card rate on interest-bearing debt 20.0% (July 2026); IRD: student loans interest-free for NZ-based borrowers, repayment threshold $24,128; IRD income tax rates from 1 April 2025',
    asOf: '2026-11',
    reviewedBy: `Rates ${READ} against the named sources; the balances are examples. General information, not advice.`,
  },

  'remote-work-calculator': {
    labels: { transitCost: 'Monthly public transport / parking ($)' },
    defaults: { salary: 73788 },
    data: { mileageRate: 0.37 },
    context: {
      title: 'What changes in New Zealand',
      points: [
        'The calculator prices driving at **37 cents a km, IRD’s 2025-26 Tier 2 rate for petrol cars**, which covers running costs only. IRD’s Tier 1 rate ($1.20 a km for the first 14,000 km) also includes fixed costs you pay whether or not you commute.',
        'Employees cannot deduct home-office costs from salary or wage income in New Zealand. An employer can pay a **tax-free allowance** for them instead, so ask before assuming the costs are yours.',
        'The default salary is **Stats NZ’s median weekly earnings from wages and salaries, $1,419 in the June 2026 quarter** (about $73,800 a year).',
      ],
    },
    source: 'IRD kilometre rates 2025-26 (petrol Tier 2 37c/km); Stats NZ Labour market statistics (income), June 2026 quarter (median weekly earnings $1,419)',
    asOf: '2026-11',
    reviewedBy: `Kilometre rate and median earnings ${READ} against the named sources. ${EXAMPLES}`,
  },

  'rent-vs-buy-calculator': {
    defaults: {
      homePrice: 892580, downPct: 20, mortgageRate: 5.09, propTaxRate: 2283, monthlyRent: 2578,
      closingPct: 2, sellCostPct: 2,
    },
    context: {
      title: 'What changes in New Zealand',
      points: [
        'There is **no stamp duty** on buying a home in New Zealand, so the upfront cost of buying is mostly the deposit, legal fees and any lender fees.',
        'The Reserve Bank’s loan-to-value rules let banks make only **25% of new owner-occupier lending above 80% LVR**, so a 20% deposit is the normal starting point, and debt-to-income limits apply above six times income.',
        'Rents have been close to flat: Stats NZ’s flow measure of rents rose **0.9% in the year to September 2026**, so the rent-increase input is worth setting from your own lease.',
        'Selling a home you have lived in is outside the bright-line test, so a gain on your main home is not taxed.',
      ],
    },
    source: 'QV House Price Index, September 2026 (national average value $892,580); RBNZ B30 new 2-year fixed rate 5.09% (September 2026); MBIE Tenancy Services bond data, August 2026 (national median rent $595/week ≈ $2,578/month); Stats NZ HES year ended June 2023 (local authority rates $43.90/week averaged over all households ≈ $2,283/yr); RBNZ LVR settings (14 August 2026); Transaction costs: buy-side closing (legal, survey, lender fees; excludes transfer tax/stamp duty) and sell-side agent commission incl. local GST',
    asOf: '2026-11',
    reviewedBy: `Price, rate, rent, rates and the 20% deposit ${READ} against the named sources. The rates figure is an all-household average, so an owner’s bill is usually higher. Transaction costs, growth and return are example assumptions for you to change. General information, not advice.`,
  },

  'home-buying-cost-calculator': {
    defaults: { purchasePrice: 892580, downPct: 20, interestRate: 5.09, propTaxRate: 2283, pmiRate: 0, closingPct: 1 },
    context: {
      title: 'What changes in New Zealand',
      points: [
        '**No stamp duty or transfer tax** applies when you buy a home in New Zealand; the closing line is legal fees, a building report and any lender fees.',
        'Under the Reserve Bank’s rules banks may make only **25% of new owner-occupier lending above 80% loan-to-value**, and **20% above a debt-to-income ratio of 6**. A deposit under 20% usually means a low-equity margin or fee.',
        'First-home buyers can usually **withdraw KiwiSaver savings for a deposit** after three years of membership, leaving at least $1,000 in the account.',
        'Council rates are set by each council and vary widely; the default is Stats NZ’s average across all households, so check your council’s rates for the property.',
      ],
    },
    source: 'QV House Price Index, September 2026 (national average value $892,580); RBNZ B30 new 2-year fixed rate 5.09% (September 2026); RBNZ LVR settings (14 August 2026) and DTI explainer (updated 23 December 2025); Stats NZ HES year ended June 2023 (local authority rates ≈ $2,283/yr, all households)',
    asOf: '2026-11',
    reviewedBy: `Price, rate, deposit and lending rules ${READ} against the named sources. Legal fees, insurance, maintenance and moving costs are example inputs for you to change, not NZ data. General information, not advice.`,
  },

  'emergency-fund-calculator': {
    defaults: { housing: 2578, food: 1298, transport: 1090, utilities2: 359 },
    context: {
      title: 'What changes in New Zealand',
      points: [
        'New Zealand has **no earnings-related unemployment insurance**: Jobseeker Support is a flat, income-tested benefit, and a partner’s income can reduce it to nothing. Your own savings carry more of the load than in most comparable countries.',
        'Redundancy pay is not required by law; it is only owed if your employment agreement says so. Check your agreement before assuming you will get any.',
        'The default housing cost is the **national median rent of $595 a week** (MBIE bond data, August 2026); the food, transport and utilities lines are Stats NZ averages for all households.',
      ],
    },
    source: 'MBIE Tenancy Services bond data, August 2026 (median rent $595/week ≈ $2,578/month); Stats NZ Household Expenditure Statistics, year ended June 2023 (average weekly household spend: food $299.50, transport $251.60, household energy $49.10 + telecommunication services $33.70)',
    asOf: '2026-11',
    reviewedBy: `Rent and household averages ${READ} against the named sources (the household survey is the latest available, for the year to June 2023). ${EXAMPLES}`,
  },
};

export default pack;
