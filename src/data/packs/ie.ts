/**
 * IE (Ireland) data pack — Tier-1 EUR expansion (2026-06).
 * Figures researched against 2025/26 official + reputable sources (CSO, Daft,
 * Citizens Information, Central Bank of Ireland, weddingsonline, PDSA-equivalent).
 * NOT yet live: IE is in PLANNED_COUNTRIES, not BUILD_COUNTRIES — no routes are
 * generated until the owner completes docs/IE-VERIFICATION-CHECKLIST.md.
 * Validated by src/lib/packSchema.ts via src/data/packs/index.ts.
 */
import type { CountryPack } from '../../lib/packSchema';

const REVIEW = 'Figures the source line gives with a date or period were taken from that source; other amounts are our estimates or example inputs for you to change, and have not yet been re-checked against a source. General information, not advice.';

const pack = {
  "aging-parent-planner": {
    "defaults": { "caregiverSalary": 40000, "coveragePct": 0 },
    "data": {
      "careCosts": {
        "dublin": { "homeHealth": 58000, "adultDay": 22000, "assistedLiving": 64000, "memoryCare": 88000, "nursingPrivate": 84000 },
        "rest":   { "homeHealth": 52000, "adultDay": 18000, "assistedLiving": 56000, "memoryCare": 78000, "nursingPrivate": 74000 }
      },
      "regions": [
        { "value": "dublin", "label": "Dublin" },
        { "value": "rest", "label": "Rest of Ireland" }
      ],
      "defaultRegion": "rest",
      "meansTestNote": "The Fair Deal (Nursing Home Support) scheme caps the resident's contribution at 80% of income + 7.5%/yr of assets (principal residence capped at 3 years). HSE Home Support provides funded home-care hours."
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "The **Fair Deal Scheme (Nursing Homes Support Scheme)** sets the contribution: **80% of assessable income plus 7.5% a year of the value of assets**, with the first €36,000 of assets disregarded (€72,000 for a couple).",
        "The family home is assessed for **three years only — a maximum of 22.5% of its value** — and the Nursing Home Loan lets you defer even that until the property is sold. The home is far better protected than most families assume.",
        "Fair Deal covers nursing home care but **not home care**, which has historically been funded through a separate and more limited Home Support Service with waiting lists.",
        "Applications take time to process and the scheme does not backdate to before approval, so applying early rather than at crisis point directly affects what the family pays.",
      ],
    },
    "source": "HSE Fair Deal financial assessment rules; C&AG Special Report 110 (average public nursing home charge €1,564 a week in 2018); HSE Home Support",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "baby-cost-planner": {
    "defaults": { "weeklyPay": 274, "unpaidWeeks": 16, "paidPct": 25 },
    "data": {
      "childcare": { "dublin": 11500, "rest": 9100 },
      "regions": [
        { "value": "dublin", "label": "Dublin" },
        { "value": "rest", "label": "Rest of Ireland" }
      ],
      "defaultRegion": "rest",
      "leaveNote": "Maternity Benefit is €299/week for 26 weeks (from 5 January 2026), with a further 16 weeks unpaid. The National Childcare Scheme (NCS) subsidy reduces fees — enter your net cost. Public maternity care is free."
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "Maternity Benefit is a **flat €299 a week for 26 weeks (2026)**, not a percentage of salary. Whether your employer tops it up to full pay is the single largest variable in an Irish parental budget.",
        "A further 16 weeks of maternity leave is available but **entirely unpaid**, and Parent’s Benefit adds a smaller number of weeks per parent at the same flat rate.",
        "The **National Childcare Scheme** provides a universal subsidy per hour plus an income-assessed subsidy, but Irish childcare remains among the most expensive in the OECD relative to income.",
        "Maternity care is free in the public system under the Maternity and Infant Care Scheme; going private or semi-private buys consultant continuity, not better clinical outcomes for a routine birth.",
      ],
    },
    "source": "gov.ie Budget 2026: Maternity Benefit €299/wk from January 2026; Pobal Early Years Sector Profile (June 2021 survey): full-day care before subsidy €221.57/wk Dublin, €175.24/wk elsewhere (fees largely frozen under Core Funding since 2022)",
    "asOf": "2026-10",
    "reviewedBy": "Maternity Benefit rate checked against the named source on 2026-10-29; childcare defaults (before the NCS subsidy) set from the Pobal sector profile on 2026-11-10. General information, not advice."
  },
  "car-ownership-calculator": {
    "defaults": {
      "purchasePrice": 30000, "downPayment": 4000, "loanRate": 7.5,
      "milesPerYear": 16100, "mpg": 5.9, "fuelPrice": 1.82,
      "annualInsurance": 655, "annualMaint": 700, "salesTaxRate": 0
    },
    "labels": {
      "salesTaxRate": "VRT / VAT (%)"
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "Motor tax is banded on **CO2 emissions for cars registered since 2008** and on engine size for older ones — the difference between bands is large enough to shape which used car is worth buying.",
        "**Vehicle Registration Tax** is charged on importing or first registering a car and is calculated from the open market selling price and emissions. It is the reason UK imports are less of a bargain than they look.",
        "Irish insurance premiums are high by European standards, and the NCT roadworthiness test is required from the fourth year and then periodically.",
        "Fuel carries excise plus VAT plus carbon tax, and the carbon component is on a legislated upward path — so running costs are scheduled to rise independently of oil prices.",
      ],
    },
    "source": "Metric: ~16,100 km/yr, 5.9 L/100km, petrol €1.82/L (GlobalPetrolPrices 2026); Central Bank of Ireland NCID Private Motor Insurance Report 8 (October 2026): average written premium €655 per policy in 2025, up 4%",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "chronic-illness-cost": {
    labels: { rxMonthly: "Monthly prescription costs (€)", otcMonthly: "Monthly pharmacy / supplements (€)", specialistCopay: "Specialist fee / visit (€)" },
    "defaults": {
      "monthlyPremium": 0, "specialistCopay": 60, "labCost": 0,
      "rxMonthly": 80, "otcMonthly": 40, "suppliesAnnual": 200, "annualSalary": 40000
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "The **Drugs Payment Scheme caps what any household pays for approved prescriptions at €80 a month**, regardless of how many items or how expensive. Registering the whole household under one scheme is essential and often overlooked.",
        "A **Long Term Illness Scheme** card provides medicines free of charge for a defined list of conditions — including diabetes and epilepsy — with no means test at all. It is separate from the Medical Card and widely under-claimed.",
        "Medical Cards and GP Visit Cards are means-tested, but assessment can consider medical hardship as well as income, so a refusal on income grounds is not always final.",
        "Private health insurance is **community-rated** — the same plan costs the same regardless of age or health — but a lifetime community rating loading applies for every year you delay taking cover after 35.",
      ],
    },
    "source": "HSE Drugs Payment Scheme cap €80/month (2025); typical GP visit €60; CSO median earnings",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "college-cost-calculator": {
    labels: { roomBoard: "Accommodation & living (€/yr)", transportation: "Transport (€/yr)", schoolType: "Institution type" },
    "defaults": {
      "annualTuition": 2350, "annualGrants": 0, "roomBoard": 11000,
      "booksSupplies": 500, "transportation": 600, "annualLoans": 0,
      "loanRate": 0, "opportunityWage": 24000
    },
    "data": {
      "schoolTypes": {
        "freefees": { "tuition": 2350, "grants": 0 },
        "intl":     { "tuition": 15000, "grants": 0 }
      },
      "schoolOptions": [
        { "value": "freefees", "label": "Free Fees (student contribution €2,350)" },
        { "value": "intl", "label": "Non-EU / private" }
      ],
      "defaultSchoolType": "freefees",
      "loanNote": "Most EU undergrads pay only the Student Contribution (€2,350 for 2026/27 under the Free Fees Initiative: cut from €3,000 to €2,500 in Budget 2026 and by a further €150 in Budget 2027, refunded to anyone who already paid). SUSI grants are means-tested; Ireland has no income-contingent state loan — model living costs, not tuition debt."
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "There are no tuition fees for most EU undergraduates at Irish universities — instead a **Student Contribution Charge, cut to €2,350 for 2026/27 (Budgets 2026 and 2027)**. Tuition is not the problem here.",
        "The **SUSI grant** is means-tested against reckonable household income and can cover the contribution charge in full plus a maintenance grant. Application deadlines are firm and missing one costs a full year.",
        "Living away from home is the dominant cost, and Irish student accommodation is scarce and expensive — in Dublin it routinely exceeds the entire contribution charge several times over.",
        "There is **no income-contingent student loan system** comparable to the UK or Australia. Families fund the gap directly, which is why parental saving matters more in Ireland than in either.",
      ],
    },
    "source": "Citizens Information: third-level fees (Student Contribution €2,350 for 2026/27 after Budget 2027); SUSI",
    "asOf": "2026-10",
    "reviewedBy": "Student Contribution checked against the named source on 2026-11-01 (Budget 2027 cut); accommodation and non-EU fees are not yet checked. General information, not advice."
  },
  "debt-payoff-calculator": {
    "data": {
      "exampleDebts": [
        { "name": "Credit Card", "balance": 3500, "apr": 22.9, "minPay": 90 },
        { "name": "Credit Union Loan", "balance": 8000, "apr": 8.5, "minPay": 180 },
        { "name": "Overdraft", "balance": 1500, "apr": 14.9, "minPay": 50 }
      ]
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "**MABS — the Money Advice and Budgeting Service — is free, State-funded and independent**, and is the correct first call. Commercial debt firms charge for access to the same statutory options.",
        "Credit unions are a major part of Irish consumer lending and often charge materially less than banks on small unsecured loans, with interest calculated on the reducing balance.",
        "Personal insolvency law offers a **Debt Relief Notice, a Debt Settlement Arrangement and a Personal Insolvency Arrangement**, the last of which can restructure mortgage debt while keeping the home.",
        "The Central Credit Register records loans of €500 or more and is visible to every lender, so arrears on a small loan affect a later mortgage application.",
      ],
    },
    "source": "Central Bank of Ireland consumer credit rates 2025; typical Irish card/credit-union APRs",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "emergency-fund-calculator": {
    "defaults": {
      "housing": 1350, "food": 350, "transport": 250, "utilities2": 250,
      "insurance": 100, "minDebt": 150, "other": 250, "currentSaved": 1000
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "Illness Benefit and Jobseeker’s Benefit are paid at **flat weekly rates rather than as a percentage of earnings**, so the higher your salary the larger the drop. There is also a waiting period before the first payment.",
        "Both are contribution-based and require sufficient PRSI contributions in the relevant tax years. Jobseeker’s Allowance, the fallback, is means-tested on household income and savings.",
        "Statutory redundancy is **two weeks per year of service plus one week, capped on weekly earnings**, and requires two years of continuous service — a modest runway by European standards.",
        "Public healthcare is available but access is uneven, and most households carry private health insurance or pay GP fees of around €60 a visit. Budget the medical line even though the system is public.",
      ],
    },
    "source": "CSO Household Budget Survey; RTB Rent Index Q1 2026 (national average rent on new tenancies €1,839/mo; outside the Greater Dublin Area €1,432)",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "fire-calculator": {
    "defaults": { "annualSpend": 38000, "currentSavings": 60000, "annualSavings": 12000, "ssBenefit": 1297 },
    "labels": { "ssBenefit": "Est. State Pension (€/mo)" },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "The State Pension (Contributory) rose to **€299.30 a week from January 2026** and is based on your PRSI record. It is paid from age 66, with an option to defer to 70 for a higher rate.",
        "Pension contributions attract relief at your **marginal rate — up to 40%** — within age-related percentage limits that rise as you get older. This is by far the most efficient wrapper available in Ireland.",
        "A retirement lump sum is **tax-free up to €200,000**, with the next tranche taxed at 20%. Sequencing the lump sum and the drawdown across tax years materially changes the total tax paid.",
        "Auto-enrolment has begun phasing in for employees without an occupational scheme, adding employer and State contributions — check whether you are in it before assuming you have no pension.",
        "Outside a pension the tax drag is severe: see the compound interest tool for exit tax (38%, 35% from 2027) and the eight-year deemed disposal. In Ireland the pension advantage is unusually large as a result.",
      ],
    },
    "source": "State Pension (Contributory) €299.30/wk from January 2026 (Budget 2026; ~€1,297/mo)",
    "asOf": "2026-10",
    "reviewedBy": "Maximum State Pension (Contributory) checked against the named source on 2026-10-29 (also pinned by the later-life page check); the other defaults are illustrative inputs. General information, not advice."
  },
  "home-buying-cost-calculator": {
    "defaults": {
      "purchasePrice": 400000, "downPct": 10, "interestRate": 3.53,
      "closingPct": 1.0, "inspectionCost": 400, "propTaxRate": 333,
      "hoiAnnual": 400, "pmiRate": 0, "hoaMonthly": 0, "maintPct": 1, "movingCost": 1500
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "Central Bank rules cap first-time buyers at **90% loan-to-value and four times gross income** (second and later buyers: 90% and 3.5 times). The income multiple, not the deposit, is what blocks most Dublin purchases — and exemptions are rationed by each lender.",
        "Stamp duty is **1% up to €1 million, 2% to €1.5 million and 6% above**, and the calculator adds it for you. It is low internationally. The Irish barrier is the deposit and the income cap, not the transaction tax.",
        "**Help to Buy refunds up to €35,000** of income tax and DIRT you have already paid over the previous four years — but new builds only. On a €300,000 new build that can cover the entire 10% deposit.",
        "The **First Home Scheme** can bridge up to 30% of the price as shared equity, reduced to 20% when combined with Help to Buy. A service charge applies from year six, so it is patient capital rather than free money.",
        "Mortgage protection insurance and home insurance are **conditions of the loan, not optional**, and Local Property Tax is an ongoing banded charge on the property value.",
      ],
    },
    "source": "CSO Residential Property Price Index, August 2026 (median price of dwellings bought in the year to August: €400,000); Central Bank of Ireland retail interest rates, August 2026 (new mortgage agreements 3.53%); Citizens Information: stamp duty 1% / 2% / 6% and LPT valuation bands 2026–2030 (€400,000 is band 3, basic rate €333); Central Bank mortgage measures",
    "asOf": "2026-10",
    "reviewedBy": "Median price and new-mortgage rate checked on 2026-10-29; stamp duty, LPT band and the Central Bank limits checked on 2026-11-01. Legal fees, insurance and maintenance are typical figures you can change. General information, not advice."
  },
  "pet-cost-calculator": {
    "defaults": { "acquisitionCost": 800, "boarding": 500 },
    "data": {
      "petData": {
        "dog_large":  [11, 750, 1080, 1620, 600, 700, 1080],
        "dog_medium": [12, 600, 870, 1240, 520, 520, 920],
        "dog_small":  [14, 460, 670, 1080, 470, 560, 810],
        "cat":        [15, 300, 460, 740, 410, 0, 600],
        "cat_outdoor":[13, 320, 490, 780, 430, 0, 600],
        "rabbit":     [9, 220, 330, 520, 300, 0, 410],
        "bird":       [8, 120, 185, 260, 150, 0, 320],
        "hamster":    [3, 75, 110, 150, 75, 0, 150]
      },
      "insurance": { "none": 0, "basic": 400, "comprehensive": 780 }
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "An **individual dog licence is legally required** and must be renewed annually; a lifetime licence is also available. Fines apply for keeping a dog without one.",
        "Microchipping and registration on an approved database is compulsory for dogs, and the registered keeper details must be kept current.",
        "Restricted breeds must be muzzled and led in public by someone over 16, and these rules are enforced — insurance and rental agreements often exclude them entirely.",
        "Veterinary fees are high and pet insurance uptake is comparatively low, so most Irish owners self-insure a cost that routinely runs to four figures for a single emergency.",
      ],
    },
    "source": "DSPCA / Irish pet-care cost guides 2025 (UK PDSA scaled to IE prices)",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "remote-work-calculator": {
    labels: { transitCost: "Monthly transport / parking (€)" },
    "defaults": {
      "commuteMiles": 16, "lunchCost": 8, "clothingCost": 500, "utilities": 300,
      "internet": 200, "equipment": 700, "homeCoffee": 3, "salary": 40000
    },
    "data": { "mileageRate": 0.418 },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "Ireland has a specific **Remote Working Relief: you can claim 30% of electricity, heating and broadband costs** for days worked at home, claimed through your annual tax return with receipts.",
        "Employers may instead pay a small daily allowance tax-free. You cannot claim the relief for days already covered by that allowance, so check which your employer operates.",
        "Employees have a **statutory right to request remote working**, and the employer must consider it against a code of practice — a stronger legal position than in most comparable markets.",
        "Commuting saving is genuine, but note the **TaxSaver commuter ticket scheme** loses its value if you stop commuting — it is bought through salary sacrifice and is only worth it above a certain number of journeys.",
      ],
    },
    "source": "Revenue civil service motor rates from 1 Sep 2022: 41.80c/km for the first 1,500 km in a car up to 1,200cc (higher for bigger engines); CSO commute; typical IE costs 2025",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "rent-vs-buy-calculator": {
    "defaults": {
      "closingPct": 2,
      "sellCostPct": 2,
      "homePrice": 400000, "downPct": 10, "mortgageRate": 3.53,
      "propTaxRate": 333, "monthlyRent": 1839
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "Ireland is one of the few markets where **the mortgage can be cheaper than the rent from month one** — in Dublin by roughly €300 a month on average figures (a €500,000 home at 3.53% against €2,335 rent on a new tenancy, RTB Q1 2026). Rents have risen faster than mortgage rates.",
        "That makes the deposit, not the monthly payment, the real obstacle. Saving 10% while paying Dublin rent is the trap the two state schemes exist to break.",
        "Rent Pressure Zones cap in-tenancy rent increases in most urban areas, so a sitting tenant is often paying well below the market rate — which changes the comparison against what you would actually pay to move.",
        "Because buying can win immediately on cash flow, the usual break-even framing matters less here than the question of whether you qualify for Help to Buy and the First Home Scheme at all.",
      ],
    },
    "source": "CSO RPPI, August 2026 (median €400,000); RTB Rent Index Q1 2026 (national standardised average rent on new tenancies €1,839/mo); Central Bank of Ireland new mortgage rate 3.53% (August 2026); Transaction costs: buy-side costs (transfer tax or stamp duty plus legal, survey and lender fees) and sell-side agent commission incl. local VAT",
    "asOf": "2026-10",
    "reviewedBy": "Median price, rent and mortgage rate checked against the named sources on 2026-10-29; growth and return assumptions are yours to change. General information, not advice."
  },
  "salary-negotiation-calculator": {
    "defaults": { "currentOffer": 40000, "targetSalary": 46000, "marketLow": 32000, "marketHigh": 65000 },
    "data": {
      "pensionLabel": "Pension",
      "fields": {
        "tech":        [42000, 60000, 95000],
        "data":        [40000, 56000, 88000],
        "engineering": [36000, 50000, 74000],
        "finance":     [36000, 52000, 90000],
        "nursing":     [33000, 42000, 55000],
        "legal":       [34000, 54000, 100000],
        "marketing":   [32000, 44000, 74000],
        "education":   [36000, 46000, 62000],
        "social":      [32000, 40000, 52000],
        "retail":      [25000, 30000, 40000],
        "custom":      [0, 0, 0]
      }
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "Ireland has an unusually **sharp jump into the higher rate — 40% from €44,000 in 2026, €46,500 from 2027** for a single person, plus USC and PRSI on top. A raise crossing that point is worth much less than the gross figure suggests.",
        "USC is a separate charge with its own bands, so the true marginal deduction on a pay rise is meaningfully above the headline 40%.",
        "Pension contributions get relief at the marginal rate within age-related limits, so **redirecting a raise into a pension is often worth more than taking it as cash** for anyone above the higher-rate threshold.",
        "Joint assessment lets a married couple transfer part of the standard rate band, which can be worth over a thousand euro a year where one partner earns much less.",
      ],
    },
    "source": "CSO Earnings Analysis using Administrative Data Sources 2024 (median annual earnings €44,816); field bands are sector estimates",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "wedding-cost-calculator": {
    "defaults": { "guestCount": 154 },
    "data": {
      "basePerGuest": {
        "venue": 47, "catering": 93, "photo": 22, "music": 14, "flowers": 16,
        "attire": 14, "paper": 4, "officiant": 2, "transport": 4, "misc": 9
      },
      "regional": {
        "dublin": 1.2, "leinster": 1.05, "munster": 0.95, "connacht": 0.9, "national": 1
      },
      "regionOptions": [
        { "value": "national", "label": "Ireland (national avg)" },
        { "value": "dublin", "label": "Dublin" },
        { "value": "leinster", "label": "Leinster (excl. Dublin)" },
        { "value": "munster", "label": "Munster" },
        { "value": "connacht", "label": "Connacht / Ulster" }
      ],
      "defaultRegion": "national"
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "You must give **three months’ notice to a Registrar in person** before the ceremony — a hard legal minimum that shapes every Irish wedding timeline.",
        "Whether religious, civil or secular, the ceremony must be conducted by a **registered solemniser** at a venue approved for the purpose, which narrows the venue list more than couples expect.",
        "Married couples can elect **joint assessment** and transfer part of the standard rate band — genuinely valuable where incomes are uneven, and worth modelling alongside the wedding budget.",
        "Spouses transfer assets between each other free of capital acquisitions tax and inherit free of it entirely, which is the largest financial consequence of marrying in Ireland.",
      ],
    },
    "source": "weddingsonline.ie Irish Wedding Survey 2025: €34,392 average, 154 guests, €93 meal per guest",
    "asOf": "2026-10",
    "reviewedBy": "Headline total checked against the named source on 2026-10-28; the split by category is our model. General information, not advice."
  },
  "compound-interest-calculator": {
    "defaults": { "principal": 10000, "monthly": 200, "rate": 7, "years": 20 },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "Ireland taxes fund and ETF growth through **exit tax: 38% in 2026 (down from 41%) and 35% from 1 January 2027** under Budget 2027, still above the 31% capital gains rate that applies to directly held shares from 7 October 2026.",
        "The **eight-year deemed disposal rule** is the bigger problem: Revenue treats an ETF as sold every eight years even if you do nothing, taxes the gain, resets the cost base and restarts the clock. It breaks compounding in a way that has no equivalent in the UK or US.",
        "Losses on funds **cannot be offset** against other gains, unlike losses on directly held shares. The asymmetry is severe and is a strong argument against fund investing outside a pension.",
        "Deposit interest is taxed at **33% DIRT deducted at source**, while An Post State Savings products are entirely DIRT-free — so a 2% tax-free State Savings return is roughly equivalent to a 3% taxable deposit.",
        "Because every taxable route is heavily taxed, the **pension is disproportionately attractive in Ireland**: relief at the marginal rate, tax-free growth, no exit tax and no deemed disposal.",
      ],
    },
    "source": "Standard compound-interest formula; illustrative default inputs",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },

  // Cost of raising a child (added 2026-10-29). Bands straight from MESL 2025
  // weekly direct costs × 52: pre-school €60 → €3,120, 12+ €158 → €8,216;
  // 5–11 is our midpoint (€109/wk → €5,668).
  "cost-of-raising-a-child-calculator": {
    "defaults": { "children": 1, "careYears": 3, "careAnnual": 9880, "careSubsidyPct": 0, "housingOn": 1, "housingAnnual": 3310, "inflationPct": 2, "benefitsOn": 1 },
    "labels": { "careAnnual": "Creche, full-time (€/yr, before NCS)" },
    "data": {
      "bands": { "early": 3120, "middle": 5668, "teen": 8216 },
      "levels": { "low": 0.8, "average": 1, "high": 1.3 },
      "benefits": [ { "fromAge": 0, "toAge": 17, "first": 1680, "additional": 1680 } ],
      "benefitName": "Child Benefit",
      "benefitNote": "Child Benefit is €140 a month per child (2026, Citizens Information). It is not means-tested. It is paid for children under 16, and to 18 for those in full-time education, which this model assumes.",
      "careNote": "Default is the full-time average of €190 a week (Pobal Early Years Sector Profile 2023/24), before the National Childcare Scheme. NCS subsidies reduce the fee; enter the share they cover.",
      "housingNote": "Our assumption: an extra bedroom's share of rent, taken as 15% of the RTB national average rent on new tenancies (€1,839 a month, Q1 2026) per child.",
      "bandsNote": "Our estimate based on the Minimum Essential Standard of Living 2025 (Vincentian MESL Research Centre): €60 a week for a pre-school child and €158 for a child aged 12 or over, excluding housing and childcare. The 5 to 11 band is our midpoint of the two.",
      "headline": {
        "amount": null,
        "text": "MESL 2025 (Vincentian MESL Research Centre, June 2025): €158 a week in direct costs for a child aged 12 or over, about €60 for a pre-school child, excluding housing and childcare",
        "status": "NGO research used by government; it prices a minimum essential standard, not average spending. There is no official lifetime total; the most-quoted one (€169,373 to 21) is an insurer survey."
      }
    },
    "context": {
      "title": "What changes in Ireland",
      "points": [
        "**Child Benefit is universal and not means-tested**: every family receives the same monthly amount per child, which makes it the one support you can plan around with certainty.",
        "The **National Childcare Scheme** pays a universal hourly subsidy plus an income-assessed one, so two families at the same creche can pay very different net fees. The gross fee is not your cost.",
        "The free pre-school year programme (ECCE) covers a set number of hours for children of pre-school age, which lowers the childcare line in the years just before school starts.",
        "The best non-commercial Irish benchmark, the **Minimum Essential Standard of Living**, prices what a child needs for a minimum acceptable life. It is a floor, and it shows older children costing more than twice as much as pre-schoolers.",
      ]
    },
    "source": "Everyday costs: our estimate based on MESL 2025 (Vincentian MESL Research Centre): €60/wk pre-school, €158/wk aged 12+, excluding housing and childcare; 5-11 is our midpoint. Childcare: Pobal Early Years Sector Profile 2023/24 (full-time average €190/wk). Housing: our assumption of 15% of RTB national average rent (€1,839/mo, Q1 2026) per child. Child Benefit €140/month per child (Citizens Information, 2026)",
    "asOf": "2026-10",
    "reviewedBy": "Child Benefit rate checked against Citizens Information on 2026-10-29; the spending bands, childcare and housing lines are our estimate based on the named sources, not individually verified. General information, not advice."
  },
} as unknown as CountryPack;

export default pack;
