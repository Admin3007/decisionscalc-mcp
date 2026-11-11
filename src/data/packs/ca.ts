/**
 * CA (Canada) data pack — built from docs/CA-PACK-DRAFT.md (Step 4.0).
 * All figures CAD. Re-verified Aug 2026 against official 2026 rates where the rate
 * changes annually (CRA automobile allowance $0.73/km from 1 Jan 2026; CPP max
 * $1,507.65/mo Jan 2026 and avg-at-65 $858.34/mo Jul 2026; OAS $762.50/mo age
 * 65-74 for Oct-Dec 2026, indexed quarterly). Other entries remain on their 2025-26 vintage (CREA ~$700k,
 * StatCan median FT ~$62k, Canada Student Loans federal interest-free since 2023,
 * CWELCC rollout);
 * figures are AI-compiled from public sources and are illustrative estimates, not professionally reviewed.
 * Validated by src/lib/packSchema.ts via src/data/packs/index.ts.
 */
import type { CountryPack } from '../../lib/packSchema';

const REVIEW = 'Figures the source line gives with a date or period were taken from that source; other amounts are our estimates or example inputs for you to change, and have not yet been re-checked against a source. General information, not advice.';
const AS_OF = '2026-06';

const pack = {
  'aging-parent-planner': {
    defaults: { caregiverSalary: 62000, coveragePct: 30 },
    labels: { coveragePct: '% covered by provincial programs' },
    data: {
      // LTC is provincially subsidized (ON private room ~$2,900/mo); retirement
      // homes are private (~$3,800–5,000/mo). National draft averages, $/yr.
      careCosts: {
        national: { homeHealth: 50000, adultDay: 15000, assistedLiving: 50000, memoryCare: 62000, nursingPrivate: 36000 },
        toronto:  { homeHealth: 56000, adultDay: 17000, assistedLiving: 58000, memoryCare: 72000, nursingPrivate: 38000 },
        vancouver:{ homeHealth: 55000, adultDay: 16500, assistedLiving: 56000, memoryCare: 70000, nursingPrivate: 37000 },
        prairies: { homeHealth: 44000, adultDay: 13000, assistedLiving: 44000, memoryCare: 55000, nursingPrivate: 33000 },
        atlantic: { homeHealth: 42000, adultDay: 12500, assistedLiving: 42000, memoryCare: 52000, nursingPrivate: 32000 },
      },
      regions: [
        { value: 'national', label: 'Canada (national avg)' },
        { value: 'toronto', label: 'Greater Toronto' },
        { value: 'vancouver', label: 'Metro Vancouver' },
        { value: 'prairies', label: 'Prairies' },
        { value: 'atlantic', label: 'Atlantic Canada' },
      ],
      defaultRegion: 'national',
      meansTestNote: 'Long-term care is provincially subsidized (income-tested co-pay, e.g. ON private room ~$2,900/mo); retirement homes and home care top-ups are private.',
    },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Long-term care is **provincially regulated and income-tested**, with a subsidised co-payment for a standard room and market rates for private rooms. What a family actually pays depends far more on province than on care needs.",
        "Retirement homes are private and unsubsidised, while long-term care homes are publicly funded with waitlists that commonly run months or years. The two are often confused and cost very differently.",
        "Home and community care is publicly funded but **rationed by assessed need, not by what the family wants**, so most households top up privately. Budget for the gap rather than the allocation.",
        "The Disability Tax Credit and the Canada Caregiver Credit both reduce tax for supporting family members, and unused DTC amounts can be transferred to a supporting relative. Both are widely unclaimed.",
      ],
    },
    source: 'Provincial LTC co-pay schedules; CMHC seniors housing reports; Home & Community Care programs (2025-26)',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'baby-cost-planner': {
    defaults: { weeklyPay: 900, unpaidWeeks: 35, paidPct: 55 },
    labels: { weeklyPay: 'Weekly take-home pay ($)', unpaidWeeks: 'Weeks of reduced / unpaid leave', paidPct: 'EI benefit (% of pay, capped)' },
    data: {
      // CWELCC $10/day where rolled out (waitlists common); market rate where not;
      // Québec long-standing subsidized system.
      childcare: { cwelcc: 3500, market: 14000, quebec: 2300 },
      regions: [
        { value: 'cwelcc', label: '$10/day program spot (CWELCC)' },
        { value: 'market', label: 'Market-rate childcare' },
        { value: 'quebec', label: 'Québec subsidized' },
      ],
      defaultRegion: 'market',
      leaveNote: 'EI maternity/parental benefits replace 55% of average insurable earnings, up to $729 a week in 2026 (maximum insurable earnings $68,900); many employers top up. Enter the weeks where your pay is reduced.',
    },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "EI maternity and parental benefits replace about **55% of earnings up to the insurable maximum**, or roughly 33% if you choose the extended 18-month option — the same total money spread over longer.",
        "Quebec runs its own **QPIP** instead, with higher replacement rates, a lower entry threshold and dedicated paternity weeks. If you are in Quebec, the federal EI figures do not apply to you.",
        "Childcare cost depends on whether you get a **$10-a-day CWELCC space**. Where the rollout has reached, costs fall dramatically; where it has not, or where waitlists are long, you pay market rate — a difference of over $10,000 a year.",
        "The Canada Child Benefit is income-tested, non-taxable and paid monthly. It is calculated from your prior-year return, so a parental-leave year usually raises the following year payment.",
      ],
    },
    source: "CWELCC provincial rollout; EI maternity/parental rates (Service Canada: 55%, maximum $729/week in 2026); public delivery via provincial medicare",
    asOf: "2026-10", reviewedBy: "EI benefit rate and 2026 maximum checked against the named source (Canada.ca) on 2026-10-29; childcare costs are not yet checked. General information, not advice.",
  },
  'car-ownership-calculator': {
    defaults: { purchasePrice: 38000, downPayment: 4000, loanRate: 7.5, milesPerYear: 15300, mpg: 7.1, fuelPrice: 1.67, annualInsurance: 1700, annualMaint: 900, salesTaxRate: 13 },
    labels: { salesTaxRate: 'Sales tax / HST (%)' },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Auto insurance is **publicly run in British Columbia, Saskatchewan, Manitoba and Quebec** and private elsewhere. Premiums differ by a factor of two or more between provinces for an identical driver.",
        "Sales tax on a vehicle purchase ranges from 5% GST alone in Alberta to nearly 15% in the Atlantic provinces — thousands of dollars of difference on the same car.",
        "Winter tyres are **legally required in Quebec and effectively necessary in most of the country**, so budget a second set of tyres and seasonal changeovers as a standing cost.",
        "Cold-weather running costs are real: battery life is shorter, block heaters draw power, and fuel economy drops materially below freezing.",
      ],
    },
    source: "Metric: ~15,300 km/yr, 7.1 L/100km; regular gasoline 167.0¢/L national average, 30 Jun 2026 (Kalibrate, industry); ON HST 13% (provinces 5–14.975%); insurance varies by province (ON ~$1,700, QC ~$900)",
    asOf: "2026-10", reviewedBy: "Fuel price checked against the named source on 2026-10-29 (industry data; Statistics Canada monthly pump prices not reached); insurance and maintenance are not yet checked. General information, not advice.",
  },
  'chronic-illness-cost': {
    defaults: { monthlyPremium: 0, specialistCopay: 0, labCost: 0, rxMonthly: 60, otcMonthly: 45, suppliesAnnual: 300, annualSalary: 62000 },
    labels: { monthlyPremium: 'Private/extended cover ($/mo, 0 if none)', specialistCopay: 'Private specialist fee ($, 0 on medicare)', labCost: 'Private test cost ($, 0 on medicare)', rxMonthly: 'Prescriptions ($/mo)' },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Provincial medicare covers physician and hospital care, so the costs that bite are the ones it excludes: **prescription drugs, dental, vision, physiotherapy and mental health**.",
        "There is **no universal pharmacare**. Drug coverage depends on your province, your age and your employer plan, and out-of-pocket exposure varies enormously across the country for the same condition.",
        "Most provinces run a catastrophic drug programme with an income-based deductible, but these are generally **claim-based rather than automatic** — many eligible households never apply.",
        "The Disability Tax Credit is a gateway benefit: qualifying unlocks the Registered Disability Savings Plan and other supports. It requires medical certification and is frequently not pursued.",
      ],
    },
    source: 'Provincial medicare covers visits/labs; no universal pharmacare — average OOP drug costs (2025-26); StatCan median salary',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'college-cost-calculator': {
    defaults: { annualTuition: 8021, annualGrants: 2000, roomBoard: 12000, booksSupplies: 800, transportation: 800, annualLoans: 6000, loanRate: 0, opportunityWage: 35000 },
    labels: { loanRate: 'Student loan interest (%, federal portion 0)' },
    data: {
      schoolTypes: {
        university: { tuition: 8021, grants: 2000 },
        college: { tuition: 4500, grants: 1500 },
        outofprovince: { tuition: 9000, grants: 2000 },
        intl: { tuition: 38000, grants: 2000 },
      },
      schoolOptions: [
        { value: 'university', label: 'University (in-province)' },
        { value: 'college', label: 'College / polytechnic' },
        { value: 'outofprovince', label: 'University (out-of-province)' },
        { value: 'intl', label: 'International student' },
      ],
      defaultSchoolType: 'university',
      loanNote: 'The federal portion of Canada Student Loans is interest-free (since Apr 2023); provincial portions vary.',
    },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Canadian tuition is **low by North American standards** and the difference between in-province, out-of-province and international rates is large — for domestic students, living costs usually exceed tuition.",
        "The **federal portion of Canada Student Loans has been interest-free since 2023**, which changes the maths of repaying early: there is often no reason to rush the federal part. Provincial portions still vary.",
        "An RESP attracts the Canada Education Savings Grant — a **20% match on the first $2,500 contributed each year, worth up to $500 annually** and $7,200 in a lifetime. It is the highest guaranteed return available to a Canadian family and unused room carries forward only partially.",
        "RESP withdrawals of grant and growth are taxed **in the student hands**, usually at or near zero. Contributions come back tax-free. Sequencing the withdrawal correctly is worth real money.",
      ],
    },
    source: 'StatCan Tuition and Living Accommodation Costs survey, table 37-10-0045-01, released 16 Sep 2026: average Canadian undergraduate tuition $8,021 for 2026/27 (graduate $8,106); Canada Student Loans interest-free federal portion',
    asOf: AS_OF, reviewedBy: "Average undergraduate tuition ($8,021, 2026/27) read from StatCan table 37-10-0045-01 (CSV) on 2026-11-10; the college, out-of-province and international fees are not yet checked. General information, not advice.",
  },
  'debt-payoff-calculator': {
    data: {
      exampleDebts: [
        { name: 'Credit Card', balance: 6000, apr: 20.99, minPay: 150 },
        { name: 'Line of Credit', balance: 9000, apr: 9.45, minPay: 180 },
        { name: 'Car Loan', balance: 16000, apr: 7.9, minPay: 330 },
      ],
    },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Canadian credit cards commonly sit near **20% APR** while a secured line of credit tracks close to prime. Consolidating unsecured balances into secured credit can cut the rate sharply — at the cost of putting your home behind the debt.",
        "A **consumer proposal** is a formal, legally binding settlement administered by a Licensed Insolvency Trustee. It is far less damaging than bankruptcy and is the route most Canadians in serious difficulty should look at first.",
        "Only a Licensed Insolvency Trustee can file a proposal or a bankruptcy. Firms advertising debt help who are not LITs charge to refer you to one.",
        "CRA tax debt is not ordinary credit — it carries compounding interest and strong collection powers including wage garnishment without a court order. Clear it ahead of consumer debt.",
      ],
    },
    source: 'Typical CA credit-card ~20.99%, LOC ~prime+0.5, car loans ~7.9% (2025-26)',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'emergency-fund-calculator': {
    defaults: { housing: 1850, food: 420, transport: 320, utilities2: 260, insurance: 130, minDebt: 200, other: 260, currentSaved: 1500 },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Employment Insurance replaces **55% of insured earnings up to a maximum insurable amount of $68,900 (2026)**, so higher earners face a much bigger income drop than the headline percentage suggests.",
        "EI requires enough insured hours in the qualifying period and carries a waiting period before the first payment, so there is a gap to bridge even when you do qualify.",
        "Provincial health insurance removes catastrophic medical risk, but **prescription drugs, dental and vision are largely private** — usually through an employer plan that ends when the job does. Losing work means losing cover at the moment you can least afford it.",
        "Severance and notice entitlements are set provincially and by common law, and can be substantially more than the statutory minimum. Do not size a buffer on the statutory figure alone without advice.",
      ],
    },
    source: "StatCan Survey of Household Spending; CMHC Rental Market Report, Oct 2025 (purpose-built 2-bedroom average $1,550); asking rents on new leases about $2,130 (StatCan Q2 2026)",
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'fire-calculator': {
    defaults: { annualSpend: 50000, currentSavings: 70000, annualSavings: 14000, ssBenefit: 1621 },
    labels: { ssBenefit: 'Est. CPP + OAS ($/mo)' },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Retirement income stacks CPP, OAS and your own savings. **Maximum CPP is $1,507.65 a month but the average pension at 65 is $858.34** — plan on the average unless you have 39 years of maximum contributions.",
        "OAS is subject to a **recovery tax (clawback)** once net income passes a threshold, which effectively adds 15 percentage points to your marginal rate in that band. Drawdown order matters enormously because of it.",
        "Deferring CPP past 65 increases it by 0.7% a month to age 70 — a permanent, inflation-indexed, roughly 42% uplift. For anyone with other assets to spend first, deferral is usually the best-value annuity available.",
        "TFSA withdrawals are **completely tax-free and do not count toward the OAS clawback**, while RRSP withdrawals are fully taxable income and do. Which account you draw from changes your tax bill and your OAS.",
        "Only **50% of a capital gain is included in income**, so non-registered investment growth is taxed more lightly than interest or RRSP withdrawals — worth sequencing around.",
      ],
    },
    source: 'CPP max $1,507.65/mo (Jan 2026) and average at 65 $858.34/mo (Jul 2026), Canada.ca; OAS $762.50/mo age 65-74 (Oct-Dec 2026, indexed quarterly) — default = average CPP + max OAS',
    asOf: '2026-08', reviewedBy: REVIEW,
  },
  'home-buying-cost-calculator': {
    defaults: { purchasePrice: 666538, downPct: 20, interestRate: 4.9, closingPct: 2.5, inspectionCost: 550, propTaxRate: 0.9, hoiAnnual: 1400, pmiRate: 0, hoaMonthly: 0, maintPct: 1.0, movingCost: 2500 },
    labels: { closingPct: 'Closing + land transfer tax (%)', hoaMonthly: 'Condo fees ($/mo)', pmiRate: 'CMHC premium (%/yr equiv., 0 at 20%+ down)' },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "The minimum down payment is tiered: **5% on the first $500,000, 10% from $500,000 to $1.5 million, and 20% above $1.5 million**, where no insured mortgage is available at all.",
        "Below 20% down, **CMHC mortgage default insurance is mandatory** — 4.00% of the loan at 5 to 9.99% down. It insures the lender, not you, and is normally added to the principal so you pay interest on it for decades.",
        "Land transfer tax is the largest regional swing in Canadian closing costs: **nothing in Alberta or Saskatchewan, roughly $10,000 in Ontario, and about double that in Toronto**, which charges a municipal tax on top of the provincial one.",
        "You must qualify at the **stress test rate — the greater of your contract rate plus two percentage points or 5.25%** — not the rate you are offered. This is why buyers who can afford the payment still get declined.",
        "An FHSA gives a deduction going in and tax-free growth and withdrawal for a first home, and the RRSP Home Buyers Plan can be used alongside it in the same purchase. Using both is usually better than either alone.",
      ],
    },
    source: "CREA national average sale price, September 2026 ($666,538; industry association, no official national price series); 5-yr fixed ~4.9% (not yet re-checked); closing incl. land transfer tax (ON ~1.5–2%, Toronto doubled)",
    asOf: "2026-10", reviewedBy: "Average price checked against the named source on 2026-10-29; the mortgage rate, closing and running costs are not yet checked. General information, not advice.",
  },
  'pet-cost-calculator': {
    data: {
      // ~10% above US baselines, CAD (OVMA/CVMA cost surveys)
      petData: {
        dog_large: [11, 660, 990, 1650, 660, 660, 990],
        dog_medium: [12, 495, 770, 1210, 550, 440, 770],
        dog_small: [14, 330, 550, 990, 495, 550, 660],
        cat: [15, 220, 385, 660, 330, 0, 550],
        cat_outdoor: [12, 275, 440, 770, 385, 0, 550],
        rabbit: [8, 165, 275, 440, 220, 0, 330],
        bird: [7, 88, 143, 220, 110, 0, 275],
        hamster: [2.5, 55, 88, 132, 55, 0, 110],
      },
      insurance: { none: 0, basic: 600, comprehensive: 1100 },
    },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Licensing is **municipal, not national** — most cities require an annual dog licence and some require cat licensing, with fines for non-compliance.",
        "Rabies vaccination requirements and leash and breed rules vary by province and municipality, and some municipalities still enforce breed-specific legislation.",
        "Veterinary costs are high and rising, and pet insurance penetration in Canada is low — meaning most owners self-insure a risk that routinely runs to thousands of dollars for a single emergency.",
        "Cold-climate costs are genuine: paw protection, winter coats for short-haired breeds, and higher indoor-boarding rates during winter travel.",
      ],
    },
    source: 'OVMA/CVMA pet-cost guidance (~10% above US baselines, CAD) (2025-26)',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'remote-work-calculator': {
    defaults: { commuteMiles: 15, lunchCost: 15, salary: 75000, utilities: 350, internet: 240, equipment: 800, homeCoffee: 3 },
    data: { mileageRate: 0.73 }, // CRA automobile allowance $0.73/km (per km; metric)
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Claiming home-office expenses requires a signed **Form T2200 from your employer**. The simplified flat-rate method used during the pandemic has ended, so claims now need the form and detailed records.",
        "Employees can only deduct a limited set of costs — a share of rent, utilities and internet — and **not mortgage interest, property tax or insurance**, which the self-employed can claim.",
        "Distances are large and transit coverage outside the major centres is thin, so for many Canadians remote work removes a genuine second-car requirement rather than just a transit pass.",
        "Working remotely from another province can change **which province taxes you**, since residency on 31 December determines provincial tax. The difference is thousands of dollars on the same income.",
      ],
    },
    source: 'CRA automobile allowance $0.73/km first 5,000 km (2026, effective 1 Jan 2026); distance in km',
    asOf: '2026-08', reviewedBy: REVIEW,
  },
  'rent-vs-buy-calculator': {
    defaults: { closingPct: 2.5, sellCostPct: 5, homePrice: 666538, downPct: 20, mortgageRate: 5.0, propTaxRate: 0.9, monthlyRent: 2130 },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Renting is still cheaper month-to-month in most large Canadian markets, and **average asking rents have fallen for 22 consecutive months** — the first sustained softening in years.",
        "With prices down year-over-year, the leveraged-appreciation argument that carried Canadian buying through the 2010s is doing no work at the moment. If the case for buying rests on price growth, it is weaker now than it has been in a long time.",
        "Your principal residence is **exempt from capital gains tax**, which is the single largest financial advantage of owning in Canada and is often left out of rent-versus-buy comparisons entirely.",
        "Exit costs are heavy — roughly 5% in realtor commission plus legal fees — so a purchase generally needs four to six years to break even, and longer in Toronto or Vancouver.",
      ],
    },
    source: "CREA national average sale price, September 2026 ($666,538); Statistics Canada Quarterly Rent Statistics, Q2 2026 (average asking rent for a 2-bedroom, $2,130); Transaction costs: buy-side costs (transfer tax or stamp duty plus legal, survey and lender fees) and sell-side agent commission incl. local VAT",
    asOf: "2026-10", reviewedBy: "Average price and asking rent checked against the named sources on 2026-10-29; the mortgage rate and growth assumptions are not yet checked. General information, not advice.",
  },
  'salary-negotiation-calculator': {
    defaults: { currentOffer: 62000, targetSalary: 70000, marketLow: 50000, marketHigh: 95000 },
    labels: { retirement401k: 'RRSP contribution (%)' },
    data: {
      pensionLabel: 'RRSP',
      fields: {
        tech: [70000, 105000, 160000],
        data: [65000, 95000, 150000],
        engineering: [70000, 95000, 140000],
        finance: [55000, 80000, 130000],
        nursing: [65000, 85000, 110000],
        legal: [50000, 75000, 120000],
        marketing: [50000, 70000, 110000],
        education: [55000, 75000, 100000],
        social: [50000, 65000, 85000],
        retail: [35000, 45000, 65000],
        custom: [0, 0, 0],
      },
    },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Combined federal and provincial rates vary widely, so **the same gross salary produces materially different take-home across provinces**. Compare offers on net pay where you would actually live.",
        "RRSP contribution room accrues at **18% of earned income up to $33,810 (2026)**, so a higher salary also buys more tax-deferred capacity — part of the real value of a raise.",
        "Employer pension type is a large and frequently ignored part of total compensation. A defined-benefit plan or a generous matched RRSP can be worth more than the salary difference between two offers.",
        "Health and dental benefits are employer-provided and not universal, so their value is real cash. Price the gap before accepting a higher salary at an employer with thinner coverage.",
      ],
    },
    source: 'StatCan median FT ~$62k (2024); occupation ranges from job-board data',
    asOf: AS_OF, reviewedBy: REVIEW,
  },
  'wedding-cost-calculator': {
    'defaults': { 'guestCount': 100 },
    data: {
      basePerGuest: { venue: 95, catering: 112, photo: 33, music: 17, flowers: 22, attire: 18, paper: 5, officiant: 3, transport: 4, misc: 8 },
      regional: { toronto: 1.35, vancouver: 1.3, montreal: 0.95, prairies: 0.85, atlantic: 0.8, national: 1.0 },
      regionOptions: [
        { value: 'national', label: 'Canada (national avg)' },
        { value: 'toronto', label: 'Greater Toronto' },
        { value: 'vancouver', label: 'Metro Vancouver' },
        { value: 'montreal', label: 'Montréal' },
        { value: 'prairies', label: 'Prairies' },
        { value: 'atlantic', label: 'Atlantic Canada' },
      ],
      defaultRegion: 'national',
    },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "Marriage licences are **provincial**, with different fees and waiting periods, and some provinces require the ceremony within a set window of issue.",
        "Canada taxes individuals, not couples, but marriage or common-law status changes eligibility for income-tested benefits including the Canada Child Benefit and the GST credit — sometimes reducing them.",
        "Common-law status arises automatically after a qualifying period of cohabitation for **tax and federal benefit purposes**, but property rights on separation are provincial and differ sharply from marriage in most provinces.",
        "Spouses can transfer assets at cost with no immediate tax and can pool medical expenses and donation credits — the real financial effects of marrying show up on the tax return, not the wedding invoice.",
      ],
    },
    source: 'RBC 2025 (about $32,000 average) and WeddingWire Canada / The Knot 2025 Global Report ($30,000-$42,000); 100 guests is illustrative, as no national guest-count survey exists',
    asOf: '2026-10', reviewedBy: 'Headline total checked against the named source on 2026-10-28; the split by category is our model. General information, not advice.',
  },
  'compound-interest-calculator': {
    defaults: { principal: 10000, monthly: 200, rate: 7, years: 20 },
    "context": {
      "title": "What changes in Canada",
      "points": [
        "The TFSA is the simplest tax shelter in Canada: **$7,000 of new room in 2026, $109,000 cumulative** if you were 18 in 2009 and never contributed. Growth and withdrawals are entirely tax-free, and withdrawn room returns the following January.",
        "An RRSP defers rather than eliminates tax — you deduct going in and pay full income tax coming out. It wins when your retirement rate is lower than your contribution rate; the TFSA wins when it is not.",
        "In a non-registered account, **only 50% of a capital gain is taxable**, while interest is taxed in full at your marginal rate. Holding interest-bearing assets inside registered accounts and equities outside is usually the more efficient split.",
        "Canadian dividends attract the dividend tax credit, making them more efficient than foreign dividends — which also suffer non-recoverable withholding tax in a TFSA.",
      ],
    },
    source: 'Standard compound-interest formula; illustrative default inputs',
    asOf: AS_OF, reviewedBy: REVIEW,
  },

  // Cost of raising a child (added 2026-10-29). Bands: ~$293,000 birth–17
  // (RBC Feb 2026, attributed to StatCan; to verify) less our housing (18 ×
  // $3,830) and childcare (3 × 50% × $2,600) defaults, ÷ 18.45 = $11,933/yr.
  "cost-of-raising-a-child-calculator": {
    defaults: { children: 1, careYears: 3, careAnnual: 2600, careSubsidyPct: 0, housingOn: 1, housingAnnual: 3830, inflationPct: 2, benefitsOn: 0 },
    labels: { careAnnual: "Daycare, full-time ($/yr, your fee)" },
    data: {
      bands: { early: 10140, middle: 11930, teen: 14320 },
      levels: { "low": 0.8, "average": 1, "high": 1.3 },
      benefits: [
        { fromAge: 0, toAge: 5, first: 8157, additional: 8157 },
        { fromAge: 6, toAge: 17, first: 6883, additional: 6883 },
      ],
      benefitName: "Canada Child Benefit",
      benefitNote: "The Canada Child Benefit maximum is $8,157 a year per child under 6 and $6,883 aged 6 to 17 for July 2026 to June 2027. It is income-tested and falls as family net income rises; these are maximums (canada.ca, checked 2026-10-29).",
      careNote: "Default is the $10-a-day target under the Canada-wide early learning and child care agreements (about $2,600 a year full-time). Not every family has a $10-a-day space yet and market fees are far higher, so enter what you actually pay.",
      housingNote: "Our assumption: an extra bedroom's share of rent, taken as 15% of Statistics Canada's average asking rent for a 2-bedroom ($2,130 a month, Q2 2026) per child.",
      bandsNote: "Our estimate based on the ~$293,000 birth-to-17 figure for a middle-income two-parent family reported by RBC (February 2026) and attributed to Statistics Canada, after removing our housing and childcare defaults. The Statistics Canada table behind it is still to verify. Because the bands are calibrated to it, the default scenario lands on that total by construction — the match is not an independent check.",
      headline: {
        amount: 293000,
        text: "About $293,000 from birth to 17 for a middle-income two-parent family, as reported by RBC (February 2026) and attributed to Statistics Canada",
        status: "to verify: the Statistics Canada table was not located, and other figures in circulation range from about $254,000 to over $320,000",
      },
    },
    context: {
      title: "What changes in Canada",
      points: [
        "The **Canada Child Benefit is tax-free and income-tested**: it is recalculated each July from the previous year's family net income, so the amount you receive changes with your tax return, not with the child's needs.",
        "The Canada-wide early learning and child care agreements aim for **$10-a-day regulated childcare**, but spaces are rationed and waitlists are long. Whether you get a space matters far more than which province you live in.",
        "Provinces add their own child benefits and childcare rules on top of the federal ones, so the same family can receive noticeably different support in Quebec, Ontario or British Columbia.",
        "Saving through an **RESP** attracts the Canada Education Savings Grant on contributions, which is the one government top-up most families can capture on money they are setting aside for the child anyway.",
      ],
    },
    source: "Everyday costs: our estimate based on ~$293,000 birth to 17 (RBC, February 2026, attributed to Statistics Canada; to verify). Childcare: CWELCC $10-a-day target (to verify; market fees vary). Housing: our assumption of 15% of Statistics Canada average 2-bedroom asking rent ($2,130/mo, Q2 2026) per child. Canada Child Benefit maximum $8,157 under 6 / $6,883 aged 6-17 (July 2026-June 2027; canada.ca, checked 2026-10-29)",
    asOf: "2026-10",
    reviewedBy: "Canada Child Benefit maximums checked against canada.ca on 2026-10-29; the spending bands, childcare and housing lines are our estimate based on the named sources, not individually verified. General information, not advice.",
  },
} as unknown as CountryPack;

export default pack;
