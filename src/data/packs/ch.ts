/**
 * CH (Switzerland) data pack — Tier-1 CHF expansion (2026-06).
 * Figures researched against 2025/26 official + reputable sources (FSO/BFS,
 * moneyland, comparis, UBS, federal statistics). NOT yet live: CH is in
 * PLANNED_COUNTRIES, not BUILD_COUNTRIES — no routes are generated until the
 * owner completes docs/CH-VERIFICATION-CHECKLIST.md.
 * Validated by src/lib/packSchema.ts via src/data/packs/index.ts.
 */
import type { CountryPack } from '../../lib/packSchema';

const REVIEW = 'Figures the source line gives with a date or period were taken from that source; other amounts are our estimates or example inputs for you to change, and have not yet been re-checked against a source. General information, not advice.';

const pack = {
  "aging-parent-planner": {
    "defaults": { "caregiverSalary": 84000, "coveragePct": 0 },
    "data": {
      "careCosts": {
        "zurich": { "homeHealth": 75000, "adultDay": 32000, "assistedLiving": 90000, "memoryCare": 125000, "nursingPrivate": 115000 },
        "rest":   { "homeHealth": 65000, "adultDay": 28000, "assistedLiving": 80000, "memoryCare": 110000, "nursingPrivate": 104000 }
      },
      "regions": [
        { "value": "zurich", "label": "Zurich / Geneva" },
        { "value": "rest", "label": "Rest of Switzerland" }
      ],
      "defaultRegion": "rest",
      "meansTestNote": "Nursing homes average about CHF 10,400/month (FSO, 2023: CHF 10,446); the resident pays accommodation + care contribution. Supplementary benefits (Ergänzungsleistungen / EL) and the AHV/IV helplessness allowance reduce the net cost for those who qualify."
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Long-term care is funded from a mix of **basic health insurance, the patient, and cantonal contributions** — insurance pays a defined nursing tariff, while accommodation and daily living costs fall on the resident.",
        "Where income and assets are insufficient, **supplementary benefits (Ergänzungsleistungen / EL)** cover the shortfall. These are a legal entitlement, not discretionary assistance, and are widely under-claimed.",
        "Care home costs are set **cantonally and vary sharply**, and the split between the nursing element and the hotel element differs by canton.",
        "Adult children can in principle be asked to contribute under relatives-support obligations, but only above **substantial income and wealth thresholds** — it applies to comparatively few families.",
      ],
    },
    "source": "Swiss Federal Statistical Office (FSO) nursing-home cost CHF 10,446/mo (2023, published 12 Nov 2024); Spitex home care",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "baby-cost-planner": {
    "defaults": { "weeklyPay": 1200, "unpaidWeeks": 10, "paidPct": 80 },
    "data": {
      "childcare": { "zurich": 36000, "rest": 28000 },
      "regions": [
        { "value": "zurich", "label": "Zurich / Geneva" },
        { "value": "rest", "label": "Rest of Switzerland" }
      ],
      "defaultRegion": "rest",
      "leaveNote": "Maternity allowance is 14 weeks at 80% of salary, capped at CHF 220/day (~CHF 1,540/week). There is no statutory paid leave beyond 14 weeks. Full-time Kita places run CHF 2,300–3,000/month before any cantonal subsidy."
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Maternity leave is **14 weeks at 80% of earnings, capped at CHF 220 a day**. It is among the shortest in Western Europe, and the cap bites for higher earners.",
        "Paternity or second-parent leave is **two weeks**, also at 80% of earnings with the same daily cap.",
        "Childcare is **expensive and lightly subsidised by international standards** — full-time crèche places commonly run CHF 2,000 to 3,000 a month per child, with subsidy rules set by canton and commune rather than nationally.",
        "The newborn joins your household **health insurance with its own premium and franchise**, so factor a third policy in from birth rather than from the first birthday.",
        "Family allowances (Kinderzulagen) are cantonal, typically **CHF 200 to 300 a month per child**, which offsets only a fraction of childcare.",
      ],
    },
    "source": "ch.ch maternity allowance 14 wks @80% (cap CHF 220/day); kizi.ch Kita costs 2026",
    "asOf": "2026-10",
    "reviewedBy": "Maternity allowance (14 weeks at 80%, capped at CHF 220 a day) checked against the named source on 2026-10-29; Kita costs are not yet checked. General information, not advice."
  },
  "car-ownership-calculator": {
    "defaults": {
      "purchasePrice": 35000, "downPayment": 5000, "loanRate": 6.0,
      "milesPerYear": 14500, "mpg": 6.2, "fuelPrice": 1.92,
      "annualInsurance": 900, "annualMaint": 900, "salesTaxRate": 0
    },
    "labels": {
      "salesTaxRate": "VAT (%)"
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Vehicle tax is **cantonal** and assessed on different bases depending where you live — engine capacity, weight or emissions — so the same car costs materially different amounts across cantonal borders.",
        "A **motorway vignette is compulsory, CHF 40 a year**, and is required for any use of the national motorway network.",
        "Fuel is expensive and third-party liability insurance is compulsory; **comprehensive cover is effectively obligatory** while a car is financed or leased.",
        "Public transport is dense, punctual and heavily used. A **half-fare travelcard or GA** is a genuine substitute for a second car in most of the country, which is why Swiss car ownership per household is lower than the income level would predict.",
      ],
    },
    "source": "Metric: ~14,500 km/yr, 6.2 L/100km, petrol CHF 1.92/L (GlobalPetrolPrices 2026); comparis avg motor premium (liability+partial casco)",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "chronic-illness-cost": {
    labels: { rxMonthly: "Monthly prescription costs (CHF)", otcMonthly: "Monthly pharmacy / supplements (CHF)", specialistCopay: "Specialist fee / visit (CHF)" },
    "defaults": {
      "monthlyPremium": 465, "specialistCopay": 0, "labCost": 0,
      "rxMonthly": 0, "otcMonthly": 40, "suppliesAnnual": 700, "annualSalary": 84000
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Basic insurance (KVG/LAMal) is compulsory and covers a defined catalogue of treatment, so the question is rarely whether you are covered — it is **how much of the first tranche you pay yourself**.",
        "Your annual exposure is the **franchise you chose (CHF 300 to CHF 2,500), then 10% coinsurance capped at CHF 700** for adults. Above that, basic insurance pays. A chronic condition almost always means hitting the cap every year.",
        "If you reliably hit the cap, the **lowest franchise is usually cheapest overall** despite the higher premium — the standard advice to take a high franchise only works for people who rarely claim.",
        "Premiums are set per canton and per insurer and can be changed annually, so **switching insurer at the year end is routine** and often worth several hundred francs.",
        "Cantonal **premium subsidies (Prämienverbilligung)** are means-tested and widely under-claimed; eligibility thresholds differ by canton.",
      ],
    },
    "source": "FOPH average basic health insurance premium for adults CHF 464.80/mo in 2026 (CHF 487.60 from January 2027, +22.80, FOPH press release 29 Sep 2026, checked 2026-10-30; averages across all models and deductibles); deductible (franchise) + 10% retention cap ~CHF 700/yr",
    "asOf": "2026-10",
    "reviewedBy": "Average adult premium checked against the named source on 2026-10-29; deductible and other defaults are illustrative. General information, not advice."
  },
  "college-cost-calculator": {
    labels: { roomBoard: "Accommodation & living (CHF/yr)", transportation: "Transport (CHF/yr)", schoolType: "Institution type" },
    "defaults": {
      "annualTuition": 1500, "annualGrants": 0, "roomBoard": 16000,
      "booksSupplies": 600, "transportation": 800, "annualLoans": 0,
      "loanRate": 0, "opportunityWage": 50000
    },
    "data": {
      "schoolTypes": {
        "public": { "tuition": 1500, "grants": 0 },
        "intl":   { "tuition": 4400, "grants": 0 }
      },
      "schoolOptions": [
        { "value": "public", "label": "Public university (Swiss/EU)" },
        { "value": "intl", "label": "Higher international fee (e.g. ETH)" }
      ],
      "defaultSchoolType": "public",
      "loanNote": "Swiss public tuition is low (~CHF 1,000–1,500/yr); the real cost is living expenses. Cantonal scholarships (Stipendien) are means-tested; there is no large income-contingent state loan — model living costs."
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Swiss public university tuition is **very low by international standards — roughly CHF 500 to 2,000 per semester** even at ETH and the large cantonal universities. Tuition is not the problem here.",
        "The real cost is **living expenses**, which in Zurich, Geneva or Basel dominate the total and can exceed CHF 20,000 a year.",
        "There is no student loan system comparable to the US or UK. Support is through **cantonal grants and loans (Stipendien)**, means-tested against parental income and administered differently in each canton.",
        "The **vocational route (apprenticeship) is the mainstream path**, taken by roughly two thirds of young people, and it pays a wage while training rather than accruing debt — it belongs in any honest comparison of the cost of education.",
      ],
    },
    "source": "UZH/ETH tuition ~CHF 1,460/yr (intl higher from 2025); cantonal scholarships",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "debt-payoff-calculator": {
    "data": {
      "exampleDebts": [
        { "name": "Credit Card", "balance": 4000, "apr": 11.9, "minPay": 120 },
        { "name": "Personal Loan", "balance": 10000, "apr": 7.9, "minPay": 230 },
        { "name": "Car Loan", "balance": 6000, "apr": 6.9, "minPay": 180 }
      ]
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Consumer credit interest is **capped by law** — the maximum rate is set by the federal government and sits well below typical US or UK credit card rates: from 1 January 2026, **10% for cash loans and 12% for credit cards and overdrafts**.",
        "Lenders must run an **affordability assessment** before granting consumer credit, and an agreement made without one can be unenforceable.",
        "Swiss consumer debt is dominated by **leasing and instalment purchase** rather than revolving card balances, so list the leases explicitly — they often carry the largest balances.",
        "Unpaid debts enter the **debt enforcement register (Betreibungsregister)**, which landlords and employers routinely check. In Switzerland the reputational cost of arrears is unusually direct.",
      ],
    },
    "source": "Legal maximum rates from 1 January 2026: 10% for cash loans and leasing, 12% for credit cards and overdrafts (Federal Department of Justice and Police ordinance on the consumer credit maximum rate, announced 31 October 2025); the three debts are examples",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "emergency-fund-calculator": {
    "defaults": {
      "housing": 1700, "food": 600, "transport": 300, "utilities2": 250,
      "insurance": 400, "minDebt": 150, "other": 400, "currentSaved": 2000
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Health insurance is compulsory but **privately billed, not deducted from salary** — budget roughly CHF 465 a month per adult (2026 average; CHF 487.60 from 2027) as a fixed outgoing that continues whether or not you are working.",
        "You also carry an annual **franchise (deductible) of CHF 300 to CHF 2,500** plus 10% coinsurance up to a CHF 700 cap. If you chose a high franchise to cut your premium, your emergency fund has to be able to absorb it in a bad year.",
        "Notice periods are generally **one to three months** depending on years of service, which is shorter than many European countries — a shorter runway argues for a larger buffer, not a smaller one.",
        "Unemployment insurance (ALV) typically replaces **70 to 80% of insured salary**, but only after a waiting period and only if you have contributed for at least 12 months in the last two years.",
      ],
    },
    "source": "FSO household budget; avg net rent ~CHF 1,700/mo (not yet re-checked); mandatory health insurance: FOPH adult average CHF 464.80/mo (2026; CHF 487.60 from Jan 2027)",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "fire-calculator": {
    "defaults": { "annualSpend": 70000, "currentSavings": 100000, "annualSavings": 20000, "ssBenefit": 1800 },
    "labels": { "ssBenefit": "Est. AHV pension (CHF/mo)" },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Retirement income comes from **three pillars**: AHV state pension, the compulsory BVG occupational pension through your employer, and voluntary pillar 3a. Your FIRE number should be sized against the gap those leave, not against zero.",
        "AHV alone pays a **maximum of CHF 2,520 a month** for a single person (CHF 3,780 for a married couple, capped at 150% of the single maximum). From 2026 a **13th AHV payment** is made each December.",
        "Pillar 3a contributions are deductible from taxable income — **CHF 7,258 in 2026** with a pension fund, or 20% of net income up to CHF 36,288 without one. From 2026 you can also buy in retroactively — but only for gaps arising after 1 January 2025, so in 2026 that means the 2025 year alone. The ten-year window builds up from there.",
        "Switzerland levies **no capital gains tax on private securities**, which materially improves long-run drawdown compared with most countries — but cantonal **wealth tax** applies to the portfolio itself.",
        "Drawing pillar 2 or 3a capital triggers a one-off withdrawal tax. **Staggering withdrawals across several tax years**, and across more than one 3a account, reduces it.",
      ],
    },
    "source": "AHV (1st pillar) 2026: max CHF 2,520/mo, min CHF 1,260/mo for a full contribution record; a 13th AHV pension (one twelfth of the year’s pensions) is paid from December 2026",
    "asOf": "2026-10",
    "reviewedBy": "AHV maximum and minimum checked against the named source on 2026-10-29; the default is an illustrative partial pension. General information, not advice."
  },
  "home-buying-cost-calculator": {
    "defaults": {
      "purchasePrice": 1000000, "downPct": 20, "interestRate": 2.0,
      "closingPct": 0.5, "inspectionCost": 1000, "propTaxRate": 2000,
      "hoiAnnual": 600, "pmiRate": 0, "hoaMonthly": 0, "maintPct": 1, "movingCost": 2000
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "You need a **20% deposit, and at least half of it must be genuine cash or pillar 3a** — no more than 10% of the price can come from your pillar 2 occupational pension. This is the rule that stops most Swiss households buying, not the monthly payment.",
        "Lenders apply an **affordability test at an imputed ~5% interest rate**, not the rate you are actually offered. Mortgage interest, amortisation and maintenance together must stay under roughly a third of gross income at that imputed rate.",
        "The mortgage must be **paid down to two-thirds of the purchase price within 15 years** (or by retirement, whichever comes first). That obligatory repayment is a real monthly cost most calculators omit.",
        "Once you own, the **imputed rental value (Eigenmietwert)** is added to your taxable income as if you were renting the home to yourself — offset by deductions for mortgage interest and maintenance. Owning changes your tax bill, not just your housing cost.",
        "Property transfer tax, notary and land registry fees are **cantonal and vary widely**, from near zero in some cantons to several per cent of the price in others.",
      ],
    },
    "source": "FSO/JLL apartment ~CHF 9,224/m² (2025); min 20% down (≥10% cash); 5-yr fixed 2.03% (SNB mean of new mortgages, September 2026, published 2 Nov 2026; 1.70% in April); imputed rental value taxed",
    "asOf": "2026-10",
    "reviewedBy": "The 5-year fixed rate checked against the named sources on 2026-10-29; the price and running costs are not yet checked. General information, not advice."
  },
  "pet-cost-calculator": {
    "defaults": { "acquisitionCost": 1500, "boarding": 800 },
    "data": {
      "petData": {
        "dog_large":  [11, 1050, 1500, 2250, 850, 950, 1500],
        "dog_medium": [12, 850, 1200, 1730, 720, 720, 1280],
        "dog_small":  [14, 640, 930, 1500, 650, 780, 1130],
        "cat":        [15, 420, 630, 1020, 570, 0, 830],
        "cat_outdoor":[13, 450, 680, 1080, 600, 0, 830],
        "rabbit":     [9, 300, 450, 720, 420, 0, 570],
        "bird":       [8, 165, 255, 360, 210, 0, 450],
        "hamster":    [3, 105, 150, 210, 105, 0, 210]
      },
      "insurance": { "none": 0, "basic": 600, "comprehensive": 1100 }
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Dogs must be **registered in the national AMICUS database and microchipped**, and a cantonal dog tax applies annually — typically CHF 100 to 200, set by canton and commune.",
        "Third-party liability insurance for dogs is **compulsory in many cantons** and strongly advised everywhere.",
        "Swiss animal welfare law is unusually prescriptive: **social species such as guinea pigs and budgerigars may not be kept alone**, which doubles the baseline cost for those animals.",
        "Veterinary fees are high by international standards, so pet insurance is more often worth its premium here than in lower-cost markets.",
      ],
    },
    "source": "comparis.ch: a dog costs ~CHF 1,200+/yr ongoing (~CHF 14,900 lifetime); UK PDSA scaled to CH prices",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "remote-work-calculator": {
    labels: { transitCost: "Monthly transport / parking (CHF)" },
    "defaults": {
      "commuteMiles": 19, "lunchCost": 20, "clothingCost": 800, "utilities": 400,
      "internet": 300, "equipment": 1000, "homeCoffee": 4, "salary": 84000
    },
    "data": { "mileageRate": 0.70 },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Commuting deductions are **capped at CHF 3,000 a year for federal tax**, with cantons setting their own limits — so the tax value of giving up a commute is smaller than the raw cost saved.",
        "Public transport rather than driving is the typical Swiss commute, so the saving from working at home is usually a **GA or half-fare travelcard** rather than fuel and parking.",
        "Cross-border remote work has real consequences: working from France, Germany or Italy for a Swiss employer can change **which country taxes you and where your social security is due**, and the day thresholds are strict.",
        "Employers are generally expected to contribute to necessary home-working costs where remote work is required rather than merely permitted.",
      ],
    },
    "source": "TCS full running cost ~CHF 0.70/km (per km; metric); typical CH lunch ~CHF 20; FSO median salary",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "rent-vs-buy-calculator": {
    "defaults": {
      "closingPct": 3,
      "sellCostPct": 3,
      "homePrice": 1000000, "downPct": 20, "mortgageRate": 2.0,
      "propTaxRate": 2000, "monthlyRent": 1700
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Switzerland has the **lowest homeownership rate in Europe, around 36%**, and that is a rational response to the rules rather than a cultural quirk — the 20% deposit with a 10% cash floor and the 5% affordability test exclude most households.",
        "Because mortgages are rarely repaid in full — only down to two-thirds of the purchase price — Swiss owners typically **carry debt for life and deduct the interest**, which makes the buy case behave very differently from the UK or US.",
        "The **imputed rental value** is taxed as income, so part of the benefit of owning is taxed away. A rent-versus-buy comparison that ignores it overstates the case for buying.",
        "Tenant protection is strong and leases are typically open-ended, so renting in Switzerland carries far less insecurity than it does in markets where fixed short terms are the norm.",
      ],
    },
    "source": "FSO net rent ~CHF 1,700/mo; apartment ~CHF 1m; 5-yr fixed ~2.0% (SNB, September 2026: 2.03%); imputed rental value tax; Transaction costs: buy-side costs (transfer tax or stamp duty plus legal, survey and lender fees) and sell-side agent commission incl. local VAT",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "salary-negotiation-calculator": {
    "defaults": { "currentOffer": 84000, "targetSalary": 95000, "marketLow": 65000, "marketHigh": 140000 },
    "data": {
      "pensionLabel": "Pension (2nd pillar)",
      "fields": {
        "tech":        [90000, 115000, 160000],
        "data":        [88000, 110000, 150000],
        "engineering": [80000, 100000, 135000],
        "finance":     [90000, 125000, 200000],
        "nursing":     [72000, 88000, 110000],
        "legal":       [85000, 120000, 190000],
        "marketing":   [75000, 95000, 140000],
        "education":   [80000, 100000, 130000],
        "social":      [70000, 85000, 105000],
        "retail":      [54000, 62000, 78000],
        "custom":      [0, 0, 0]
      }
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Many Swiss contracts pay a **13th month salary**, so an advertised annual figure may be divided into 13 payments rather than 12. Always confirm which basis a quoted salary uses before comparing offers.",
        "Income tax is levied **federally, cantonally and communally**, and the cantonal spread is large enough that **moving commune can outweigh a pay rise**. Compare offers on take-home in the actual place you would live.",
        "Employer pension (BVG) contributions rise with age and are a real part of total compensation — two offers with identical salary can differ materially once the pension split is compared.",
        "Foreign nationals without a C permit are usually taxed at source (Quellensteuer) at a flat cantonal rate, which changes the net calculation compared with ordinary assessment.",
      ],
    },
    "source": "FSO Earnings Structure 2024 (median CHF 7,024/mo ≈ CHF 84,000/yr); sector medians (pharma/banking high)",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },
  "wedding-cost-calculator": {
    "defaults": { "guestCount": 80 },
    "data": {
      "basePerGuest": {
        "venue": 110, "catering": 150, "photo": 40, "music": 25, "flowers": 28,
        "attire": 24, "paper": 7, "officiant": 4, "transport": 7, "misc": 17
      },
      "regional": {
        "zurich": 1.2, "geneva": 1.2, "rest": 0.95, "national": 1
      },
      "regionOptions": [
        { "value": "national", "label": "Switzerland (national avg)" },
        { "value": "zurich", "label": "Zurich" },
        { "value": "geneva", "label": "Geneva / Lake Geneva" },
        { "value": "rest", "label": "Rest of Switzerland" }
      ],
      "defaultRegion": "national"
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "The legally binding step is the **civil ceremony at the Zivilstandsamt**; any religious or symbolic ceremony has no legal effect and is an additional cost, not a substitute.",
        "Civil ceremony and preparatory procedure fees are **cantonal**, typically a few hundred francs, and higher where a foreign national is marrying.",
        "Switzerland taxes married couples **jointly**, which for two similar incomes can produce a higher combined bill than filing separately would — the long-debated \"marriage penalty\". Model the tax change alongside the wedding budget.",
        "Venue and catering costs are high relative to neighbouring countries, which is why cross-border weddings in France, Italy or Germany are common and can cut the total substantially.",
      ],
    },
    "source": "Swiss wedding guides (MySwitzerland: CHF 40,000-50,000 for about 80 guests; swissinfo: CHF 30,000-40,000 excluding attire); no official national survey",
    "asOf": "2026-10",
    "reviewedBy": "Headline total checked against the named source on 2026-10-28; the split by category is our model. General information, not advice."
  },
  "compound-interest-calculator": {
    "defaults": { "principal": 10000, "monthly": 200, "rate": 7, "years": 20 },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "Switzerland levies **no capital gains tax on private securities**, so growth in an ordinary taxable account compounds without the drag that applies in most countries — provided you are not classed as a professional trader.",
        "Dividends and interest **are** taxed as income, and 35% withholding tax is deducted at source on Swiss dividends and bank interest. It is reclaimable through your tax return, but only if you declare the holding.",
        "Cantonal **wealth tax** applies to the portfolio balance itself each year, so a Swiss investor faces a small recurring charge on assets rather than a charge on gains.",
        "Pillar 3a is the most efficient wrapper available: contributions are deductible, and growth inside it is exempt from income and wealth tax until withdrawal.",
      ],
    },
    "source": "Standard compound-interest formula; illustrative default inputs",
    "asOf": "2026-06",
    "reviewedBy": REVIEW
  },

  // Cost of raising a child (added 2026-10-29). Bands: Zurich child-cost table
  // ~CHF 1,633/mo = CHF 19,596/yr average (to verify), spread as
  // 19,596 × 18 ÷ 18.45 = CHF 19,118, × 0.85 / 1 / 1.2.
  "cost-of-raising-a-child-calculator": {
    "defaults": { "children": 1, "careYears": 3, "careAnnual": 31800, "careSubsidyPct": 0, "housingOn": 0, "housingAnnual": 3060, "inflationPct": 1, "benefitsOn": 1 },
    "labels": { "careAnnual": "Kita, full-time (CHF/yr, before subsidy)" },
    "data": {
      "bands": { "early": 16250, "middle": 19120, "teen": 22940 },
      "levels": { "low": 0.8, "average": 1, "high": 1.3 },
      "benefits": [
        { "fromAge": 0, "toAge": 15, "first": 2580, "additional": 2580 },
        { "fromAge": 16, "toAge": 17, "first": 3216, "additional": 3216 }
      ],
      "benefitName": "Family allowance",
      "benefitNote": "The federal minimum family allowance is CHF 215 a month per child and CHF 268 a month education allowance from 16 (Federal Social Insurance Office). Cantons set their own rates, many above the minimum, so check your canton's family allowance office.",
      "careNote": "Default is the midpoint of CHF 2,300 to 3,000 a month for a full-time Kita place before cantonal or municipal subsidy (kizi.ch; to verify). Subsidies are income-based and set locally; enter the share yours covers.",
      "housingNote": "Our assumption: an extra bedroom's share of rent, taken as 15% of an average net rent of about CHF 1,700 a month. Off by default because the Zurich table already includes a housing share (to verify).",
      "bandsNote": "Our estimate based on the Zurich child-cost table (Zürcher Kinderkosten-Tabelle), about CHF 1,633 a month per child in direct costs excluding childcare (to verify), spread across the age bands.",
      "headline": {
        "amount": 352800,
        "text": "Zurich child-cost table (Zürcher Kinderkosten-Tabelle): about CHF 1,633 a month, or CHF 352,800 to age 18, in direct costs excluding childcare",
        "status": "to verify: the current edition was not located. The Federal Statistical Office's own estimate (CHF 819 a month per child, 2009) is out of date."
      }
    },
    "context": {
      "title": "What changes in Switzerland",
      "points": [
        "**Family allowances are paid through the employer** (or the compensation fund if self-employed) and set by each canton above a federal minimum, so the same child brings different support in Geneva and in Zurich.",
        "Childcare is the largest swing factor: full-time Kita fees are among the highest in Europe and subsidies are income-based and set by the municipality, so the net fee depends on where you live as much as on what you earn.",
        "Children need their own **compulsory health insurance**. Premiums for children are reduced and many cantons pay premium reductions for families on modest incomes, but it is a fixed monthly cost from birth.",
        "Swiss child-cost tables such as Zurich's are used to set maintenance payments, which is why they are detailed and age-banded; they describe typical direct costs, not what any one family spends.",
      ]
    },
    "source": "Everyday costs: our estimate based on the Zurich child-cost table (Zürcher Kinderkosten-Tabelle), ~CHF 1,633/mo per child excluding childcare (to verify). Childcare: Kita CHF 2,300-3,000/mo full-time before subsidy (kizi.ch; to verify). Housing (off by default): our assumption of 15% of ~CHF 1,700/mo net rent. Family allowance federal minimum CHF 215/mo per child, CHF 268/mo education allowance (BSV, checked 2026-10-29)",
    "asOf": "2026-10",
    "reviewedBy": "Family allowance minimums checked against the Federal Social Insurance Office (BSV) on 2026-10-29; the spending bands, childcare and housing lines are our estimate based on the named sources, not individually verified. General information, not advice."
  },
} as unknown as CountryPack;

export default pack;
