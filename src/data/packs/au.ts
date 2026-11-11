/**
 * AU (Australia) data pack — built from docs/AU-PACK-DRAFT.md (Step 4.0).
 * All figures AUD. Re-verified Aug 2026 against official 2026-27 rates where the
 * rate changes annually (ATO cents-per-km 91c from 1 Jul 2026; Age Pension single
 * max $1,237.70/fortnight from 20 Sep 2026, indexed each 20 Mar and 20 Sep). Other entries remain on their
 * 2025-26 vintage (super guarantee 12% from Jul 2025, PBS ~$25.00/script (Jan 2026),
 * PPL 26 weeks at $200.94/day from 1 Jul 2026 (checked Oct 2026), HECS-HELP indexation capped at lower of CPI/WPI,
 * CoreLogic mean dwelling ~$960k, ABS median FT ~$88k); figures are AI-compiled from
 * public sources and are illustrative estimates, not professionally reviewed.
 */
import type { CountryPack } from '../../lib/packSchema';

const REVIEW = 'Figures the source line gives with a date or period were taken from that source; other amounts are our estimates or example inputs for you to change, and have not yet been re-checked against a source. General information, not advice.';
const AS_OF = '2026-06';

const pack = {
  'aging-parent-planner': {
    defaults: { caregiverSalary: 88000, coveragePct: 40 },
    labels: { coveragePct: '% covered by aged-care subsidies' },
    data: {
      careCosts: {
        national: { homeHealth: 45000, adultDay: 15000, assistedLiving: 55000, memoryCare: 70000, nursingPrivate: 40000 },
        sydney:   { homeHealth: 52000, adultDay: 17000, assistedLiving: 64000, memoryCare: 80000, nursingPrivate: 44000 },
        melbourne:{ homeHealth: 49000, adultDay: 16000, assistedLiving: 60000, memoryCare: 75000, nursingPrivate: 42000 },
        regional: { homeHealth: 38000, adultDay: 12500, assistedLiving: 46000, memoryCare: 58000, nursingPrivate: 35000 },
      },
      regions: [
        { value: 'national', label: 'Australia (national avg)' },
        { value: 'sydney', label: 'Greater Sydney' },
        { value: 'melbourne', label: 'Greater Melbourne' },
        { value: 'regional', label: 'Regional Australia' },
      ],
      defaultRegion: 'national',
      meansTestNote: 'Residential aged care is means-tested (RAD/DAP accommodation payments plus income-tested care fees); Home Care Packages are subsidised with income-tested contributions.',
    },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "Residential aged care is **means-tested on both income and assets**, and the family home is included up to a capped value unless a protected person still lives there.",
        "Accommodation is paid as a **refundable lump sum (RAD), a daily payment (DAP), or a combination** — the RAD is refunded on leaving, so the real cost is the foregone earnings on the capital, not the headline figure.",
        "Annual and lifetime caps limit total means-tested care fees, which puts a ceiling on exposure that families frequently do not realise exists.",
        "Home Care Packages are subsidised and assessed through My Aged Care, but **waiting lists are long** — registering for assessment early matters more than choosing the provider.",
      ],
    },
    source: 'My Aged Care fee schedules; Home Care Package subsidy levels; private retirement-living market reports (2025-26)',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'baby-cost-planner': {
    defaults: { weeklyPay: 1200, unpaidWeeks: 26, paidPct: 60 },
    labels: { weeklyPay: 'Weekly take-home pay ($)', unpaidWeeks: 'Weeks of reduced / unpaid leave', paidPct: 'Leave pay (% of normal pay)' },
    data: {
      childcare: { subsidised: 8000, market: 22000, family: 0 },
      regions: [
        { value: 'subsidised', label: 'With Child Care Subsidy (CCS)' },
        { value: 'market', label: 'Full-fee long day care' },
        { value: 'family', label: 'Family / informal care' },
      ],
      defaultRegion: 'subsidised',
      leaveNote: 'Parental Leave Pay: 26 weeks (130 days) for children born or adopted from 1 July 2026, at $200.94 a day ($1,004.70 for a 5-day week, the national minimum wage), plus any employer scheme. Enter the weeks where your pay is reduced.',
    },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "Government Parental Leave Pay is **26 weeks at the National Minimum Wage rate of $1,004.70 a week (births from 1 July 2026)**, shared between carers. If your normal pay is well above minimum wage, the shortfall is the real cost.",
        "For births and adoptions from 1 July 2025 the ATO also pays **12% superannuation on Parental Leave Pay**, which partly addresses the retirement penalty that time out of work has historically carried.",
        "Childcare cost depends on your **Child Care Subsidy percentage and the activity test** — hours of work, study or volunteering. Two families at the same centre can pay very different gap fees.",
        "Private maternity care carries out-of-pocket obstetrician and hospital gaps of several thousand dollars, and private cover has a **12-month waiting period for pregnancy**, so the decision has to be made about a year ahead.",
      ],
    },
    source: "Child Care Subsidy (Services Australia); Parental Leave Pay 26 weeks at $200.94 a day from 1 July 2026 (Services Australia); public birth via Medicare",
    asOf: "2026-10", reviewedBy: "Parental Leave Pay length and rate checked against the named source (Services Australia) on 2026-10-29; childcare costs are not yet checked. General information, not advice.",
  },
  'car-ownership-calculator': {
    defaults: { purchasePrice: 42000, downPayment: 5000, loanRate: 8.0, milesPerYear: 12900, mpg: 6.9, fuelPrice: 2.36, annualInsurance: 1600, annualMaint: 950, salesTaxRate: 3 },
    labels: { salesTaxRate: 'Stamp duty + rego (%)' },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "Registration bundles **compulsory third-party (CTP) insurance**, and both the cost and the way CTP is sold differ by state — in some you choose an insurer, in others it is bundled with rego.",
        "Vehicle stamp duty is charged on purchase at state-set rates, and the **Luxury Car Tax** adds a further 33% above a threshold — a genuinely punitive step for imported vehicles.",
        "Distances are long and fuel prices swing on a well-documented weekly cycle in most capitals — timing fill-ups to the cycle is worth several hundred dollars a year.",
        "Comprehensive insurance premiums vary widely by postcode, and flood and hail exposure has pushed premiums up sharply in Queensland and northern New South Wales.",
      ],
    },
    source: 'Metric: ~12,900 km/yr, 6.9 L/100km; petrol $2.36/L (ACCC weekly fuel price monitoring report, 23 Oct 2026: 236.2 cpl average regular unleaded across the 5 largest cities on 21 Oct; regional 246.7 cpl); comprehensive + CTP + rego ~$2,000+/yr; vehicle stamp duty ~3% (state-varying) (2025-26)',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'chronic-illness-cost': {
    defaults: { monthlyPremium: 0, specialistCopay: 90, labCost: 0, rxMonthly: 30, otcMonthly: 50, suppliesAnnual: 350, annualSalary: 88000 },
    labels: { otcMonthly: "Monthly pharmacy / supplements ($)", monthlyPremium: 'Private hospital cover ($/mo, 0 if none)', specialistCopay: 'Specialist gap fee ($/visit)', labCost: 'Private test cost ($, 0 bulk-billed)', rxMonthly: 'Prescriptions ($/mo, PBS-capped)' },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "Medicare covers much of the cost but **gap fees are the norm**, particularly for specialists. Bulk-billing rates for specialist care are low, so budget a gap per visit rather than assuming free treatment.",
        "The PBS caps the price of listed prescriptions, and the **PBS Safety Net** lowers or removes the cost once annual spending passes a threshold. Register all family scripts under one Safety Net card — many households never do.",
        "Above the income thresholds, going without private hospital cover triggers the **Medicare Levy Surcharge**. For a chronic condition that usually makes cover worth holding on both health and tax grounds.",
        "**Lifetime Health Cover loading** adds 2% to private hospital premiums for every year you delay taking it out after 31, up to 70%. Deferring cover has a permanent price.",
      ],
    },
    source: 'Medicare bulk-billing; typical specialist gap fees $50–150; PBS co-pay ~$25.00/script (Jan 2026) + safety net (2025-26); ABS median FT salary',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'college-cost-calculator': {
    defaults: { annualTuition: 9880, annualGrants: 0, roomBoard: 15000, booksSupplies: 700, transportation: 900, annualLoans: 9880, loanRate: 2.8, opportunityWage: 50000 },
    labels: { roomBoard: "Accommodation & living ($/yr)", transportation: "Transport ($/yr)", schoolType: "Institution type", loanRate: 'HECS indexation (%, income-contingent)' },
    data: {
      schoolTypes: {
        band1: { tuition: 4908, grants: 0 },
        band2: { tuition: 9880, grants: 0 },
        band4: { tuition: 18025, grants: 0 },
        med: { tuition: 14046, grants: 0 },
        intl: { tuition: 35000, grants: 0 },
      },
      schoolOptions: [
        { value: 'band1', label: 'Lowest rate (nursing, teaching, maths, agriculture)' },
        { value: 'band2', label: 'Middle rate (science, engineering, IT, allied health)' },
        { value: 'band4', label: 'Highest rate (law, commerce, society and culture)' },
        { value: 'med', label: 'Medicine, dentistry, veterinary science' },
        { value: 'intl', label: 'International student' },
      ],
      defaultSchoolType: 'band2',
      loanNote: 'HECS-HELP is income-contingent: repayments start above the income threshold and the balance is indexed annually at the lower of CPI and WPI (2.8% on 1 June 2026).',
    },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "HECS-HELP is **income-contingent, not conventional debt**. Nothing is repayable until income passes $69,528 (2026-27), and repayments come out through the tax system.",
        "The balance is **indexed annually, now capped at the lower of CPI or the Wage Price Index** after the 2024 reform — a change that materially reduced the real cost of a long-held debt.",
        "Student contribution bands differ sharply by field of study, so the same degree length can cost twice as much depending on subject. Choose with the band in mind, not just the course.",
        "Because repayment is income-contingent and indexation is capped, **voluntarily repaying early is often a poor use of money** compared with a mortgage offset account or super.",
      ],
    },
    source: 'Student contribution bands $4,908–$18,025 per EFTSL for 2027, the rates Study Assist currently publishes (cluster 2/3/4 low $4,908; allied health, computing, engineering, science $9,880; medicine, dentistry, veterinary science $14,046; law, commerce, society and culture $18,025); HECS-HELP indexation capped at the lower of CPI or WPI since the 2024 reform',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'debt-payoff-calculator': {
    data: {
      exampleDebts: [
        { name: 'Credit Card', balance: 5500, apr: 21.74, minPay: 140 },
        { name: 'Personal Loan', balance: 10000, apr: 9.5, minPay: 220 },
        { name: 'Car Loan', balance: 18000, apr: 8.0, minPay: 380 },
      ],
    },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "Since 2019, **credit card interest-free days are lost entirely** in any month you carry a balance forward, so partial repayment is far more expensive than it appears.",
        "Buy-now-pay-later sits largely outside the consumer credit rules that govern cards, so it does not always appear on a credit file — but missed payments still trigger fees and can reach collections.",
        "The **National Debt Helpline** offers free, independent financial counselling, and financial hardship provisions require lenders to consider a variation. Both are statutory and free.",
        "Australian mortgages commonly include an **offset account**, which reduces interest without locking the money away. Cash sitting in an offset usually beats paying down other debt at lower rates.",
      ],
    },
    source: 'Example debts for you to replace with your own; for scale, the RBA puts the standard credit card rate at 21.74% (Table F5, October 2026)',
    asOf: AS_OF, reviewedBy: 'Credit card rate checked against RBA Table F5 on 2026-11-02; the personal and car loan rates are examples, as the RBA no longer publishes a personal loan indicator rate. General information, not advice.',
  },
  'emergency-fund-calculator': {
    defaults: { housing: 2400, food: 500, transport: 350, utilities2: 300, insurance: 150, minDebt: 220, other: 300, currentSaved: 2000 },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "JobSeeker is paid at a flat rate well below most working incomes and is **assets- and income-tested on your household, not just you** — a partner earning a normal salary can disqualify you entirely.",
        "There is a **liquid assets waiting period**: savings above a modest threshold delay the first payment by up to 13 weeks. Ironically, having an emergency fund pushes back the date support begins.",
        "Redundancy pay under the National Employment Standards is scaled by service and **caps at 16 weeks**, and employees of small businesses are generally excluded altogether.",
        "Annual leave accrues at four weeks a year and is paid out on termination, often with leave loading — a real cushion that Australian workers frequently forget to count.",
      ],
    },
    source: 'ABS Household Expenditure Survey; capital-city rents ~$600/wk (2025-26)',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'fire-calculator': {
    defaults: { annualSpend: 60000, currentSavings: 90000, annualSavings: 18000, ssBenefit: 1200 },
    labels: { ssBenefit: 'Est. Age Pension ($/mo, means-tested)' },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "Superannuation is **preserved until your preservation age (60 for anyone born after June 1964)**, so early retirement before 60 must be funded entirely from outside super. That constraint, not the total, usually sets the plan.",
        "After 60, withdrawals from a taxed super fund are generally **completely tax-free** — an unusually generous treatment that makes the post-60 portion of a plan go much further than a pre-tax projection suggests.",
        "The Age Pension is **means-tested on both income and assets** and tapers out entirely for comfortable retirees. Treat it as a backstop, not as baseline income, unless your assets are modest.",
        "The Superannuation Guarantee is now **12% of ordinary earnings**, and salary-sacrificed concessional contributions are taxed at 15% rather than your marginal rate — the most efficient accumulation route for most people.",
        "A 50% capital gains discount applies to assets held more than 12 months outside super, and franking credits on Australian dividends can be refundable — both materially improve after-tax drawdown.",
      ],
    },
    source: 'Age Pension single max $1,237.70/fortnight ≈ $2,682/mo (from 20 Sep 2026: basic $1,135.40 + pension supplement $88.20 + energy supplement $14.10; Services Australia, indexed 20 Mar and 20 Sep), heavily means-tested — conservative default',
    asOf: '2026-08', reviewedBy: REVIEW,
  },
  'home-buying-cost-calculator': {
    defaults: { purchasePrice: 800000, downPct: 20, interestRate: 6.24, closingPct: 0.6, inspectionCost: 600, propTaxRate: 2000, hoiAnnual: 1800, pmiRate: 0, hoaMonthly: 0, maintPct: 1.0, movingCost: 2500 },
    labels: { propTaxRate: 'Council rates ($/yr)', closingPct: 'Legal & loan fees (%)', hoaMonthly: 'Strata fees ($/mo)', pmiRate: 'LMI (%/yr equiv., 0 at 20%+ deposit)' },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "Stamp duty is **state-based and is the largest single entry cost**, routinely tens of thousands on a capital-city purchase. Most states now waive or heavily discount it for first home buyers, and from 1 July 2026 the ACT charges eligible first home buyers none at any price.",
        "Below a 20% deposit, **Lenders Mortgage Insurance commonly costs $15,000 to $30,000** and insures the lender, not you. The federal 5% Deposit Scheme exists specifically to let eligible first home buyers avoid it.",
        "That scheme removed **all income caps and annual place limits on 1 October 2025**, so most first home buyers now qualify — property price caps still apply and vary by location.",
        "The First Home Super Saver Scheme lets you save a deposit inside super, taxed at 15% rather than your marginal rate. It needs about a year of lead time to be worth using.",
        "Strata levies on apartments run $3,000 to $8,000 a year and are rising sharply after recent building-defect reforms — check the sinking fund, not just the current levy.",
      ],
    },
    source: 'CoreLogic mean dwelling ~$960k (default modest $800k); RBA lenders\' rates, August 2026: new owner-occupier housing loans 6.24% (Table F6, checked 2026-10-29); council rates ~$2,000/yr; stamp duty additional by state (2025-26)',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'pet-cost-calculator': {
    data: {
      petData: {
        dog_large: [11, 690, 1035, 1725, 690, 690, 1035],
        dog_medium: [12, 520, 805, 1265, 575, 460, 805],
        dog_small: [14, 345, 575, 1035, 520, 575, 690],
        cat: [15, 230, 400, 690, 345, 0, 575],
        cat_outdoor: [12, 290, 460, 805, 400, 0, 575],
        rabbit: [8, 175, 290, 460, 230, 0, 345],
        bird: [7, 92, 150, 230, 115, 0, 290],
        hamster: [2.5, 58, 92, 138, 58, 0, 115],
      },
      insurance: { none: 0, basic: 700, comprehensive: 1300 },
    },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "Microchipping and council registration are **compulsory in most states**, with registration usually cheaper for a desexed animal — often by more than the cost of the procedure.",
        "Councils set their own annual registration fees and some cap the number of animals per property or impose cat curfews.",
        "Tick paralysis is a serious and expensive risk along the eastern seaboard, and preventatives plus emergency treatment make east-coast pet ownership meaningfully dearer than elsewhere.",
        "Pet insurance is widely sold but commonly excludes hereditary and pre-existing conditions, and premiums rise steeply with age — read the product disclosure statement before assuming cover.",
      ],
    },
    source: 'RSPCA/AVA pet-cost guidance (~15% above US baselines, AUD) (2025-26)',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'remote-work-calculator': {
    labels: { transitCost: "Monthly transport / parking ($)" },
    defaults: { commuteMiles: 16, lunchCost: 18, salary: 90000, utilities: 400, internet: 280, equipment: 900, homeCoffee: 4.5 },
    data: { mileageRate: 0.91 }, // ATO 91c/km (2026-27, from 1 Jul 2026) (per km; metric)
    "context": {
      "title": "What changes in Australia",
      "points": [
        "The ATO offers a **fixed-rate method per hour worked from home** covering energy, internet, phone and stationery, or an actual-cost method. The fixed rate is simpler but requires a record of hours actually worked.",
        "You cannot claim occupancy costs — rent, mortgage interest, rates — as an employee, and claiming them can also **jeopardise the capital gains exemption on your main residence**.",
        "Commuting between home and a regular workplace has never been deductible, so remote work saves you real cash but produces no extra deduction for the travel you avoid.",
        "Distances and parking costs in Australian capitals are high, so the commute saving is usually larger here than the transit-based saving in denser markets.",
      ],
    },
    source: 'ATO cents-per-km 91c (2026-27, from 1 Jul 2026; 89c base + one-off 2c uplift); distance in km',
    asOf: '2026-08', reviewedBy: REVIEW,
  },
  'rent-vs-buy-calculator': {
    defaults: { closingPct: 5, sellCostPct: 2.5, homePrice: 800000, downPct: 20, mortgageRate: 6.24, propTaxRate: 2000, monthlyRent: 2600 },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "Australia has the widest rent-versus-buy gap in the developed world. In Sydney a median-house mortgage costs roughly **106% more per month than renting** the same home; in Brisbane about 75% more.",
        "Because of that gap, the case for buying cannot rest on monthly cash flow. It rests on the **main residence capital gains tax exemption**, which is one of the largest tax shelters available to an ordinary household.",
        "Deposits are enormous in absolute terms, so the opportunity cost of the money is unusually large — often more than the annual rent saving. Any honest comparison has to carry that number.",
        "Tenancy laws vary by state and leases are typically short, so Australian renters move more often than their European counterparts. The security premium for owning is genuinely higher here.",
      ],
    },
    source: 'CoreLogic dwelling values; RBA new owner-occupier housing loan rate 6.24% (August 2026, Table F6); capital-city rents ~$600/wk (2025-26); Transaction costs: buy-side costs (transfer tax or stamp duty plus legal, survey and lender fees) and sell-side agent commission incl. local VAT',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'salary-negotiation-calculator': {
    defaults: { currentOffer: 88000, targetSalary: 98000, marketLow: 70000, marketHigh: 130000 },
    labels: { retirement401k: 'Extra super contribution (%)' },
    data: {
      pensionLabel: 'Super',
      fields: {
        tech: [85000, 120000, 180000],
        data: [80000, 115000, 170000],
        engineering: [85000, 110000, 160000],
        finance: [70000, 95000, 150000],
        nursing: [75000, 90000, 115000],
        legal: [65000, 95000, 150000],
        marketing: [60000, 85000, 125000],
        education: [75000, 95000, 120000],
        social: [65000, 80000, 100000],
        retail: [48000, 55000, 70000],
        custom: [0, 0, 0],
      },
    },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "Confirm whether an advertised figure is a **base salary or a package including superannuation** — a 12% difference in how the same number is quoted is the most common source of confusion in Australian offers.",
        "Salary sacrifice into super is taxed at 15% instead of your marginal rate, so for higher earners it is usually worth more per dollar than the equivalent cash.",
        "HECS-HELP repayments start above **$69,528 (2026-27)** and apply marginally at 15% then 17%, which is an extra deduction on a raise that many people fail to model.",
        "Not-for-profit and public health employers can offer **salary packaging of everyday expenses** free of fringe benefits tax — worth thousands, and not available in the private sector.",
      ],
    },
    source: 'ABS Average Weekly Ordinary Time Earnings $2,083.70/wk for full-time adults (May 2026, ≈$108,350/yr). The default uses MEDIAN full-time earnings, which sits below the average; occupation ranges from job-board data',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'wedding-cost-calculator': {
    'defaults': { 'guestCount': 85 },
    data: {
      basePerGuest: { venue: 206, catering: 73, photo: 42, music: 20, flowers: 31, attire: 30, paper: 6, officiant: 10, transport: 8, misc: 24 },
      regional: { sydney: 1.35, melbourne: 1.25, brisbane: 1.0, perth: 0.95, regional: 0.8, national: 1.0 },
      regionOptions: [
        { value: 'national', label: 'Australia (national avg)' },
        { value: 'sydney', label: 'Greater Sydney' },
        { value: 'melbourne', label: 'Greater Melbourne' },
        { value: 'brisbane', label: 'Brisbane / SE QLD' },
        { value: 'perth', label: 'Perth' },
        { value: 'regional', label: 'Regional Australia' },
      ],
      defaultRegion: 'national',
    },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "A **Notice of Intended Marriage must be lodged at least one month and no more than 18 months before the ceremony**, which sets a hard floor on how quickly you can marry.",
        "Australia requires an authorised celebrant, and the large majority of weddings use a civil celebrant rather than a religious one — celebrant fees are a separate line from the venue.",
        "Australia taxes individuals, not couples, so marriage changes little directly. What it does change is **income testing for family payments and the Medicare Levy Surcharge**, which use combined family income.",
        "De facto relationships carry substantially the same property and superannuation consequences as marriage under the Family Law Act, so the financial exposure often predates the wedding.",
      ],
    },
    source: 'Easy Weddings Annual Survey 2026: $38,252 average from 4,000+ couples (venue $17,518, catering $6,177, flowers $2,639)',
    asOf: '2026-10', reviewedBy: 'Headline total checked against the named source on 2026-10-28; the split by category is our model. General information, not advice.',
  },
  'compound-interest-calculator': {
    defaults: { principal: 10000, monthly: 200, rate: 7, years: 20 },
    "context": {
      "title": "What changes in Australia",
      "points": [
        "Superannuation is the most efficient wrapper available: contributions taxed at **15%, earnings taxed at 15%, and withdrawals generally tax-free after 60**. Nothing outside super matches it over a long horizon.",
        "Outside super, assets held more than 12 months attract a **50% capital gains discount**, so holding period changes the after-tax return more than most Australians realise.",
        "Franking credits attached to Australian dividends can be **refundable** — a retiree on a low rate can receive cash back for tax the company already paid, which is rare internationally.",
        "Concessional contributions are capped annually, but **unused cap can be carried forward for five years** if your super balance is under the threshold — useful in a high-income or capital-gain year.",
      ],
    },
    source: 'Standard compound-interest formula; illustrative default inputs',
    asOf: AS_OF, reviewedBy: REVIEW,
  },

  // Cost of raising a child (added 2026-10-29). Bands: AIFS 2023 budget
  // standard, low-paid family, $170/wk per child = $8,840/yr average, spread
  // as 8,840 × 18 ÷ 18.45 = $8,624, × 0.85 / 1 / 1.2.
  "cost-of-raising-a-child-calculator": {
    defaults: { children: 1, careYears: 3, careAnnual: 35100, careSubsidyPct: 80, housingOn: 0, housingAnnual: 4680, inflationPct: 2, benefitsOn: 0 },
    labels: { careAnnual: "Long day care, full-time ($/yr, before CCS)" },
    data: {
      // Child Care Subsidy 2026-27 (Department of Education, from 6 July 2026): 90% up to
      // $88,520 family income, then 1 percentage point less per $5,000 above. The 80% default
      // is a family on about $135,000; 0% overstated childcare for almost every family.
      subsidyHint: 'Child Care Subsidy 2026–27: 90% up to $88,520 family income, then 1% less for each $5,000 above (80% is about $135,000). Hourly fee caps can lower it.',
      bands: { early: 7330, middle: 8620, teen: 10350 },
      levels: { "low": 0.8, "average": 1, "high": 1.3 },
      benefits: [
        { fromAge: 0, toAge: 12, first: 6122.48, additional: 6122.48 },
        { fromAge: 13, toAge: 17, first: 7967.96, additional: 7967.96 },
      ],
      benefitName: "Family Tax Benefit Part A",
      benefitNote: "Family Tax Benefit Part A maximum rate is $235.48 a fortnight per child aged 0 to 12 and $306.46 for 13 to 19 (from 1 July 2026). It is means-tested on family income, so most families receive less than the maximum.",
      careNote: "Default is an average long day care fee of $134.99 a day before subsidy (Care for Kids, industry data; to verify), for 260 days. The Child Care Subsidy can cover up to 90% depending on family income; enter your subsidy percentage.",
      housingNote: "Our assumption: an extra bedroom's share of rent, taken as 15% of a capital-city rent of about $600 a week. Off by default because the AIFS budget standards may already include a housing share (to verify).",
      bandsNote: "Our estimate based on the Australian Institute of Family Studies budget standards (2023): $170 a week per child for a low-paid family ($140 for an unemployed family), spread across the age bands.",
      headline: {
        amount: null,
        text: "AIFS / DSS Updated costs of children using Australian budget standards (2023): $140 a week (unemployed family) and $170 a week (low-paid family) per child",
        status: "official research, but a weekly low-income standard rather than a lifetime total. Lifetime totals quoted in the media range from about $159,000 to $548,000 and are to verify.",
      },
    },
    context: {
      title: "What changes in Australia",
      points: [
        "The **Child Care Subsidy is paid to the provider**, so you only ever see the gap fee. From January 2026 the 3 Day Guarantee gives most families at least 72 subsidised hours a fortnight regardless of activity.",
        "Family Tax Benefit is paid fortnightly or as a lump sum after the tax year and is reconciled against actual income, so an estimate that turns out too low can create a debt to repay.",
        "The most-cited Australian figures are budget standards for **low-income families** from the Australian Institute of Family Studies, not average spending. Commercial lifetime estimates vary several-fold because they use different ages and lifestyles.",
        "Public schooling is free of tuition, but voluntary contributions, uniforms, camps and devices add up, and private schooling changes the teenage years' cost more than any other single choice.",
      ],
    },
    source: "Everyday costs: our estimate based on AIFS / DSS Updated costs of children using Australian budget standards (2023), $170/wk per child (low-paid family). Childcare: average long day care $134.99/day before subsidy (Care for Kids; to verify). Housing (off by default): our assumption of 15% of a ~$600/wk capital-city rent. Family Tax Benefit Part A maximum $235.48 per fortnight aged 0-12, $306.46 aged 13-19 (DSS rates from 1 July 2026)",
    asOf: "2026-10",
    reviewedBy: "Family Tax Benefit Part A rates checked against Services Australia on 2026-10-29; the spending bands, childcare and housing lines are our estimate based on the named sources, not individually verified. General information, not advice.",
  },
} as unknown as CountryPack;

export default pack;
