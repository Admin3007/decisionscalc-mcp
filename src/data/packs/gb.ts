/**
 * GB (United Kingdom) data pack — generated in Step 1.4 (CONTRACTS §3) from the live
 * tool defaults and the country tables previously inline in src/pages/tools/*.
 * Validated by src/lib/packSchema.ts via src/data/packs/index.ts.
 * Figures are AI-compiled from public sources and are illustrative estimates, not professionally reviewed.
 */
import type { CountryPack } from '../../lib/packSchema';

const pack = {
  "aging-parent-planner": {
    "defaults": {
      "caregiverSalary": 41000,
      "coveragePct": 0
    },
    "data": {
      "careCosts": {
        "london": {
          "homeHealth": 30000,
          "adultDay": 22000,
          "assistedLiving": 66000,
          "memoryCare": 78000,
          "nursingPrivate": 84000
        },
        "southeast": {
          "homeHealth": 27000,
          "adultDay": 20000,
          "assistedLiving": 60000,
          "memoryCare": 70000,
          "nursingPrivate": 76000
        },
        "rest": {
          "homeHealth": 24000,
          "adultDay": 17000,
          "assistedLiving": 52000,
          "memoryCare": 62000,
          "nursingPrivate": 68000
        }
      },
      "regions": [
        { "value": "london", "label": "London" },
        { "value": "southeast", "label": "South East" },
        { "value": "rest", "label": "Rest of UK" }
      ],
      "defaultRegion": "rest",
      "meansTestNote": "Local authorities fund care if assets are below £23,250 (England, means-tested). NHS Continuing Healthcare covers some health-led care."
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "Council-funded care is **means-tested against both capital and income**, and the thresholds differ across England, Scotland, Wales and Northern Ireland. Above the upper capital limit you self-fund entirely.",
        "The value of the home is usually disregarded while a spouse or dependent relative still lives there, and a **deferred payment agreement** can let the council secure fees against the property instead of forcing a sale.",
        "Deliberately giving away assets to fall under the threshold is treated as **deprivation of assets** and the council can assess as though you still held them. There is no time limit on looking back.",
        "Attendance Allowance is not means-tested and is not taxed, yet is heavily under-claimed by older people who assume savings disqualify them. NHS Continuing Healthcare, where needs are primarily clinical, covers the full cost.",
      ],
    },
    "source": "LaingBuisson / Carehome.co.uk 2025; local authority means test £23,250 (England)",
    "asOf": "2026-06",
    "reviewedBy": "The £23,250 upper capital limit (England, frozen for 2026/27) checked against the named source (DHSC charging circular) on 2026-10-29; regional care costs are not yet checked. General information, not advice."
  },
  "baby-cost-planner": {
    "defaults": {
      "weeklyPay": 560,
      "unpaidWeeks": 20,
      "paidPct": 25
    },
    "data": {
      "childcare": {
        "london": 13200,
        "southeast": 11800,
        "rest": 11000,
        "scotland": 13500,
        "wales": 16900
      },
      "regions": [
        { "value": "london", "label": "London" },
        { "value": "southeast", "label": "South East" },
        { "value": "rest", "label": "Rest of England" },
        { "value": "scotland", "label": "Scotland" },
        { "value": "wales", "label": "Wales" }
      ],
      "defaultRegion": "rest",
      "leaveNote": "UK Statutory Maternity Pay: 90% of pay for 6 weeks, then £194.32/week in 2026/27 (or 90% if lower) for 33 weeks. Enter the weeks where your pay is reduced/unpaid."
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "Statutory Maternity Pay is **90% of earnings for six weeks, then a flat £194.32 a week (2026/27) for 33 weeks** — 39 weeks paid out of 52 weeks leave. The final 13 weeks are unpaid.",
        "Shared Parental Leave lets parents split the balance, but take-up is low because it is opt-in and administratively awkward. Check your employer occupational scheme first — it often dwarfs the statutory minimum.",
        "Funded childcare hours are available for eligible working parents, but the hours are **term-time weighted and providers frequently charge for extras**, so the headline entitlement overstates the real saving.",
        "The High Income Child Benefit Charge claws Child Benefit back through the tax return once one parent earns above the threshold. Claim it anyway — registering protects your National Insurance record even if you opt out of payments.",
      ],
    },
    "source": "Coram Childcare Survey 2026 (nursery, under-2, 50 hours a week for 52 weeks. England: with the 30 funded hours for working parents spread over the year, about 22 a week; families without funded hours pay about 80% more. Scotland £259.10 and Wales £325.12 a week, no equivalent entitlement); NHS free delivery; SMP £194.32/wk (2026/27)",
    "asOf": "2026-10",
    "reviewedBy": "Statutory Maternity Pay checked against the named source on 2026-10-29; childcare re-modelled on the Coram 2026 source (regional rates, Table 3) on 2026-11-01. General information, not advice."
  },
  "car-ownership-calculator": {
    "defaults": {
      "purchasePrice": 25000,
      "downPayment": 3000,
      "loanRate": 9.5,
      "milesPerYear": 7000,
      "mpg": 40,
      "fuelPrice": 1.74,
      "annualInsurance": 560,
      "annualMaint": 700,
      "salesTaxRate": 0
    },
    "labels": {
      "fuelPrice": "Fuel price (£/litre)",
      "salesTaxRate": "Purchase tax / VAT (%)"
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "Vehicle Excise Duty depends on CO2 emissions and registration date, and cars above a list price threshold pay an **expensive-car supplement for five years** from the second licence — often overlooked when buying new.",
        "Insurance carries Insurance Premium Tax on top of the quoted premium, and UK premiums are high relative to Europe, particularly for drivers under 25.",
        "An annual MOT is compulsory from the third year, and clean-air charges — the London ULEZ and city Clean Air Zones — apply daily to non-compliant vehicles, which can exceed the fuel cost for a regular commuter.",
        "Fuel duty plus VAT makes up a large share of the pump price, so fuel economy moves the total cost of ownership here more than it does in low-duty markets.",
      ],
    },
    "source": "DESNZ weekly road fuel prices: petrol 174.07p/L, week of 26 Oct 2026; RAC/ABI/NimbleFins 2025-26 for insurance and maintenance",
    "asOf": "2026-10",
    "reviewedBy": "Fuel price checked against the named source on 2026-10-29; insurance and maintenance defaults are not yet checked. General information, not advice."
  },
  "chronic-illness-cost": {
    labels: { rxMonthly: "Monthly prescription costs (£)", otcMonthly: "Monthly pharmacy / supplements (£)", specialistCopay: "Specialist fee / visit (£)" },
    "defaults": {
      "monthlyPremium": 0,
      "specialistCopay": 0,
      "labCost": 0,
      "rxMonthly": 10,
      "otcMonthly": 40,
      "suppliesAnnual": 200,
      "annualSalary": 41000
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "NHS treatment is free at the point of use, so the US model of deductibles and co-insurance does not apply. The real costs here are prescriptions, travel, equipment and lost income.",
        "Prescription charges apply in **England only** — they are free in Scotland, Wales and Northern Ireland. In England, a Prescription Prepayment Certificate caps the annual cost and pays for itself at a handful of items a month.",
        "Personal Independence Payment is assessed on **how a condition affects you, not on the diagnosis**, and it is not means-tested or taxed. It is widely under-claimed by people who assume their savings disqualify them.",
        "Waiting lists are the hidden cost: many people pay privately for a single diagnostic step to re-enter the NHS pathway sooner. Budget for that possibility rather than for ongoing private treatment.",
      ],
    },
    "source": "NHS prescription charges 2025 (PPC £114.50/yr); ONS median salary",
    "asOf": "2026-06",
    "reviewedBy": "Prescription charges (£9.90 an item, PPC £114.50 a year, frozen for 2026/27) and the ASHE median checked against the named sources on 2026-10-29; other defaults are illustrative. General information, not advice."
  },
  "college-cost-calculator": {
    labels: { roomBoard: "Accommodation & living (£/yr)", transportation: "Transport (£/yr)", schoolType: "Institution type" },
    "defaults": {
      "annualTuition": 9790,
      "annualGrants": 0,
      "roomBoard": 11000,
      "booksSupplies": 400,
      "transportation": 600,
      "annualLoans": 9790,
      "loanRate": 4.1,
      "opportunityWage": 22000
    },
    "data": {
      "schoolTypes": {
        "england": {
          "tuition": 9790,
          "grants": 0
        },
        "scotland": {
          "tuition": 1820,
          "grants": 0
        },
        "intl": {
          "tuition": 22000,
          "grants": 0
        }
      },
      "schoolOptions": [
        { "value": "england", "label": "England (£9,790 cap, 2026/27)" },
        { "value": "scotland", "label": "Scotland (Scottish student)" },
        { "value": "intl", "label": "International / private" }
      ],
      "defaultSchoolType": "england",
      "loanNote": "UK loans are income-contingent: repaid at 9% of income over the threshold, written off after ~40 years (Plan 5)."
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "UK student loans are **income-contingent, not conventional debt**. You repay a percentage of income above the threshold and the balance is written off — 30 years on Plan 2, 40 years on Plan 5 — so the headline balance is a poor guide to what you will actually pay.",
        "Which plan you are on matters more than how much you borrow. **Plan 2 repays above £29,385 and writes off after 30 years; Plan 5 repays above £25,000 and runs for 40 years** at lower interest.",
        "Because repayment is income-contingent, many graduates never clear the balance. Voluntarily overpaying only helps people who will realistically repay in full before write-off — for everyone else it is money given away.",
        "Maintenance loans are means-tested against household income, and the assessed parental contribution is **assumed rather than guaranteed**. That gap, not tuition, is what leaves most students short.",
      ],
    },
    "source": "GOV.UK / Department for Education: tuition fee cap £9,790 in England for 2026/27; Student Loans Company: Plan 5 interest = RPI, 4.1% from 1 Sep 2026; UK student maintenance",
    "asOf": "2026-10",
    "reviewedBy": "Tuition cap and Plan 5 interest rate checked against the named sources on 2026-10-29; accommodation, books and the Scottish and international fees are not yet checked. General information, not advice."
  },
  "debt-payoff-calculator": {
    "data": {
      "exampleDebts": [
        {
          "name": "Credit Card",
          "balance": 3500,
          "apr": 24.9,
          "minPay": 90
        },
        {
          "name": "Store Card",
          "balance": 1200,
          "apr": 29.9,
          "minPay": 35
        },
        {
          "name": "Personal Loan",
          "balance": 8000,
          "apr": 9.9,
          "minPay": 190
        }
      ]
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "A **0% balance transfer** is the standard UK lever and can cut the interest cost to a transfer fee — but only if the balance is genuinely cleared before the promotional period ends, and only if you stop spending on the card.",
        "**Breathing Space** gives 60 days of legal protection from interest, fees and enforcement while you take debt advice. It is free, statutory, and far less damaging than missing payments.",
        "Free regulated debt advice is available from StepChange, National Debtline and Citizens Advice. Commercial debt-management firms charge for the same statutory options.",
        "Priority debts — rent, mortgage, council tax, energy — carry far harsher consequences than credit cards and must be cleared first, regardless of which balance carries the highest interest rate.",
      ],
    },
    "source": "Example debts for you to replace with your own; Breathing Space (up to 60 days) from gov.uk",
    "asOf": "2026-06",
    "reviewedBy": "Breathing Space checked on gov.uk on 2026-11-02; the three debts and their rates are examples, not published averages. General information, not advice."
  },
  "emergency-fund-calculator": {
    "defaults": {
      "housing": 1100,
      "food": 310,
      "transport": 250,
      "utilities2": 200,
      "insurance": 90,
      "minDebt": 150,
      "other": 200,
      "currentSaved": 1000
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "Statutory Sick Pay is the floor, not a safety net — it is a flat weekly amount paid for up to 28 weeks, and for most earners it replaces a small fraction of normal pay. Check whether your contract offers occupational sick pay on top; the gap between the two is what your buffer has to cover.",
        "Statutory redundancy pay depends on age and length of service and is capped, so long service does not translate into a long runway. Under two years of service usually means no statutory entitlement at all.",
        "Universal Credit carries a **five-week wait** for the first payment, and the advance offered to bridge it is a loan repaid from later awards. Five weeks of essential costs is a sensible minimum buffer for that reason alone.",
        "The NHS removes the catastrophic medical risk that dominates US emergency-fund advice, so UK targets can reasonably sit at the lower end of the three-to-six-month range if your income is stable.",
      ],
    },
    "source": "ONS Family Spending; Ofgem energy price cap £1,723/yr typical dual-fuel direct debit (Oct-Dec 2026). Utilities default is a composite of energy, water and broadband, so it sits above the energy cap alone",
    "asOf": "2026-06",
    "reviewedBy": "Ofgem price cap checked against the named source on 2026-10-29; the spending defaults are illustrative, not yet checked against ONS Family Spending. General information, not advice."
  },
  "fire-calculator": {
    "defaults": {
      "annualSpend": 35000,
      "currentSavings": 60000,
      "annualSavings": 12000,
      "ssBenefit": 1046
    },
    "labels": {
      "ssBenefit": "Est. State Pension (£/mo)"
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "The new State Pension is **£241.30 a week in 2026/27**, and you need roughly 35 qualifying years for the full amount. Check your forecast and your National Insurance record before assuming it.",
        "Private pensions cannot normally be accessed until **55, rising to 57 from 2028**. Anyone planning to retire before then needs a separate bridge of ISAs or taxable savings — the pension pot alone cannot do it.",
        "Usually **25% of a pension can be taken tax-free**, with the rest taxed as income. Sequencing withdrawals across tax years to stay inside a lower band materially changes how long a pot lasts.",
        "The **ISA allowance is £20,000 a year** and growth inside it is free of income tax and capital gains tax entirely. For early retirement the ISA is the bridge and the pension is the destination.",
        "Pension contributions attract relief at your marginal rate, so a higher-rate taxpayer effectively pays £60 for £100 in the pot — the largest single return available to most UK savers.",
      ],
    },
    "source": "GOV.UK State Pension rates 2026/27 (full new State Pension £241.30/wk)",
    "asOf": "2026-10",
    "reviewedBy": "Full new State Pension (£241.30 a week, 2026/27) checked against the named source (GOV.UK) on 2026-09-30 and pinned by the statutory-figures test; the other defaults are illustrative inputs. General information, not advice."
  },
  "home-buying-cost-calculator": {
    "defaults": {
      "purchasePrice": 273000,
      "downPct": 15,
      "interestRate": 4.63,
      "closingPct": 0.6,
      "inspectionCost": 600,
      "propTaxRate": 2392,
      "hoiAnnual": 300,
      "pmiRate": 0,
      "hoaMonthly": 0,
      "maintPct": 1,
      "movingCost": 1200
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "Stamp Duty Land Tax applies in **England and Northern Ireland only** — Scotland charges LBTT and Wales charges LTT, with different bands and thresholds. Check the system for where you are buying, not where you live.",
        "First-time buyer relief means **no SDLT up to £300,000** (on purchases up to £500,000), which removes the single largest transaction cost. It fell from £425,000 on 1 April 2025, so older guides overstate it.",
        "An additional property attracts a **5% surcharge on every band**, and a non-UK resident adds a further 2% on top. The two stack, so an overseas buy-to-let purchase pays standard rates plus 7%.",
        "Budget for conveyancing, searches, a survey and removals — typically £2,500 to £4,000 — none of which can be added to the mortgage. Leasehold flats add service charges and ground rent as permanent costs.",
        "Lenders price in bands by loan-to-value. Getting from a 10% to a 15% or 20% deposit usually cuts the rate more than shopping between lenders at the same LTV does.",
      ],
    },
    "source": "GOV.UK SDLT 2026/27; ONS UK House Price Index, August 2026 (UK average £273,000); Bank of England effective rate on newly drawn mortgages, September 2026 (4.63%); MHCLG average Band D council tax, England 2026-27 (£2,392)",
    "asOf": "2026-10",
    "reviewedBy": "House price, mortgage rate and council tax checked against the named sources on 2026-10-29; closing, survey, insurance and moving costs are our estimates. General information, not advice."
  },
  "pet-cost-calculator": {
    "defaults": {
      "acquisitionCost": 800,
      "boarding": 500
    },
    "data": {
      "petData": {
        "dog_large": [
          11,
          700,
          1000,
          1500,
          550,
          650,
          1000
        ],
        "dog_medium": [
          12,
          550,
          800,
          1150,
          480,
          480,
          850
        ],
        "dog_small": [
          14,
          420,
          620,
          1000,
          430,
          520,
          750
        ],
        "cat": [
          15,
          280,
          420,
          680,
          380,
          0,
          550
        ],
        "cat_outdoor": [
          13,
          300,
          450,
          720,
          400,
          0,
          550
        ],
        "rabbit": [
          9,
          200,
          300,
          480,
          280,
          0,
          380
        ],
        "bird": [
          8,
          110,
          170,
          240,
          140,
          0,
          300
        ],
        "hamster": [
          3,
          70,
          100,
          140,
          70,
          0,
          140
        ]
      },
      "insurance": {
        "none": 0,
        "basic": 360,
        "comprehensive": 720
      }
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "Microchipping is **compulsory for both dogs and cats** in England, and keeping the registered details current is a legal obligation, not an optional extra.",
        "Third-party liability for dogs is not separately compulsory but is usually bundled into pet insurance or covered by home contents cover — check, because owner liability under the Dangerous Dogs Act is strict.",
        "Pet insurance premiums rise steeply with age and most policies exclude pre-existing conditions, so the lifetime cost is heavily back-loaded. A **lifetime policy taken out early** is materially cheaper than switching later.",
        "Veterinary costs have risen well above general inflation following consolidation of UK practices, which the CMA has been investigating — budget above historic averages.",
      ],
    },
    "source": "Our cost model (food, vet, grooming, set-up and lifespan by animal), with example inputs; not survey averages",
    "asOf": "2026-06",
    "reviewedBy": "The per-item amounts are our estimates for you to adjust to your own quotes, not published figures. General information, not advice."
  },
  "remote-work-calculator": {
    labels: { transitCost: "Monthly transport / parking (£)" },
    "defaults": {
      "commuteMiles": 9,
      "lunchCost": 8,
      "clothingCost": 500,
      "utilities": 300,
      "internet": 200,
      "equipment": 700,
      "homeCoffee": 3,
      "salary": 40000
    },
    "data": {
      "mileageRate": 0.55
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "**Employees cannot claim tax relief for working from home for the 2026–27 tax year** (gov.uk). For earlier years it was only available where your employer **required** you to work at home — choosing to work remotely never qualified.",
        "The main saving is usually the rail season ticket or fuel and parking, and UK rail fares are high enough that commuting is often the largest single line in a working budget.",
        "Employers must still meet their health-and-safety duties for home workstations, and many will fund equipment — ask, because it is frequently available and rarely advertised.",
        "Hybrid patterns often mean paying for a flexible or part-time season ticket, which is priced far less favourably per journey than an annual one. Model the actual travel pattern, not the extremes.",
      ],
    },
    "source": "HMRC approved mileage rate 55p a mile for the first 10,000 miles (from 6 April 2026, gov.uk); 9-mile commute and the other defaults are example inputs",
    "asOf": "2026-06",
    "reviewedBy": "Mileage rate and the working-from-home relief rule checked on gov.uk on 2026-11-02; the other defaults are example inputs for you to change. General information, not advice."
  },
  "rent-vs-buy-calculator": {
    "defaults": {
      "closingPct": 0.6,
      "sellCostPct": 1.8,
      "homePrice": 273000,
      "downPct": 15,
      "mortgageRate": 4.63,
      "propTaxRate": 2392,
      "monthlyRent": 1406
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "The answer is strongly regional. Renting is currently cheaper across **London and the South East**, while roughly 40% of UK homes are cheaper to buy than rent — concentrated in the North, the Midlands and Scotland.",
        "Buying and selling costs — SDLT, conveyancing, survey and later the estate agent commission — are sunk the day you transact. Under three years they rarely amortise, which makes length of stay the decisive variable.",
        "Most UK fixes run two or five years, so a purchase today means re-pricing into an unknown market. A rent-versus-buy comparison built on today rate alone ignores the single biggest risk in the buy case.",
        "Assured shorthold tenancies give far weaker security than long European leases, so the non-financial value of owning is genuinely higher here than in markets with strong tenant protection.",
      ],
    },
    "source": "GOV.UK SDLT 2026/27; ONS Private rent and house prices, UK: October 2026 (average rent £1,406/mo, September 2026; average house price £273,000, August 2026); Bank of England effective rate on newly drawn mortgages, September 2026 (4.63%); MHCLG average Band D council tax 2026-27 (£2,392); Transaction costs: buy-side Stamp Duty Land Tax at 2026/27 rates plus £1,500 legal and survey fees and sell-side agent commission incl. local VAT",
    "asOf": "2026-10",
    "reviewedBy": "House price, rent, mortgage rate and council tax checked against the named sources on 2026-10-29; transaction costs, growth and returns are assumptions you can change. General information, not advice."
  },
  "salary-negotiation-calculator": {
    "defaults": {
      "currentOffer": 38000,
      "targetSalary": 44000,
      "marketLow": 30000,
      "marketHigh": 60000
    },
    "data": {
      "pensionLabel": "Pension",
      "fields": {
        "tech": [
          38000,
          52000,
          85000
        ],
        "data": [
          37000,
          50000,
          80000
        ],
        "engineering": [
          33000,
          45000,
          66000
        ],
        "finance": [
          32000,
          45000,
          82000
        ],
        "nursing": [
          29000,
          37000,
          48000
        ],
        "legal": [
          30000,
          48000,
          92000
        ],
        "marketing": [
          28000,
          38000,
          68000
        ],
        "education": [
          30000,
          40000,
          56000
        ],
        "social": [
          27000,
          34000,
          46000
        ],
        "retail": [
          21000,
          24000,
          33000
        ],
        "custom": [
          0,
          0,
          0
        ]
      }
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "Between roughly £100,000 and £125,140 the personal allowance tapers away, creating an **effective marginal rate of about 60%**. A raise into that band is worth far less than it looks, and a pension contribution out of it is worth far more.",
        "Salary sacrifice into a pension avoids both income tax and National Insurance, and many employers pass on their NI saving too. From April 2029 the NI saving is capped at £2,000 of sacrificed pay a year; the income tax saving is not. Pound for pound it is usually the most valuable thing to negotiate after base pay.",
        "Scotland sets its own income tax bands, so the same gross salary produces a different take-home north and south of the border. Compare offers on net pay in the actual place you will be taxed.",
        "Student loan repayments act as an extra marginal deduction above the plan threshold — **£29,385 on Plan 2, £25,000 on Plan 5** — which should be modelled as part of the real value of a raise.",
      ],
    },
    "source": "ONS ASHE 2026 provisional (median full-time £40,911)",
    "asOf": "2026-06",
    "reviewedBy": "ONS ASHE 2026 provisional median checked against the named source on 2026-11-07; field bands are our banding, not ONS figures. General information, not advice."
  },
  "wedding-cost-calculator": {
    "defaults": { "guestCount": 80 },
    "data": {
      "basePerGuest": {
        "venue": 64,
        "catering": 95,
        "photo": 28,
        "music": 15,
        "flowers": 18,
        "attire": 16,
        "paper": 4,
        "officiant": 2,
        "transport": 4,
        "misc": 11
      },
      "regional": {
        "london": 1.45,
        "southeast": 1.25,
        "midlands": 1,
        "north": 0.82,
        "scotland": 0.83,
        "wales": 0.8,
        "national": 1
      },
      "regionOptions": [
        { "value": "national", "label": "UK (national avg)" },
        { "value": "london", "label": "London" },
        { "value": "southeast", "label": "South East" },
        { "value": "midlands", "label": "Midlands" },
        { "value": "north", "label": "North of England" },
        { "value": "scotland", "label": "Scotland" },
        { "value": "wales", "label": "Wales" }
      ],
      "defaultRegion": "national"
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "You must give **notice at a register office at least 28 days before the ceremony**, and both parties must have lived in the district. Venue fees and registrar attendance are charged separately from that notice fee.",
        "The UK taxes individuals, not couples, so marriage changes little — the exception is **Marriage Allowance**, which lets a non-taxpayer transfer part of their personal allowance to a basic-rate partner.",
        "Marriage revokes an existing will unless it was made in contemplation of that marriage. Updating the will is a small cost that is almost universally forgotten in the wedding budget.",
        "Spouses transfer assets between themselves free of capital gains tax and inheritance tax, and an unused inheritance tax nil-rate band passes to the survivor — the real financial effect of marrying is at the estate, not the wedding.",
      ],
    },
    "source": "Bridebook UK Wedding Report 2026: £20,604 average (excluding ring and honeymoon), about 80 guests",
    "asOf": "2026-10",
    "reviewedBy": "Headline total checked against the named source on 2026-10-28; the split by category is our model. General information, not advice."
  },
  "compound-interest-calculator": {
    "defaults": { "principal": 10000, "monthly": 200, "rate": 7, "years": 20 },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "The **ISA allowance is £20,000 a year** and everything inside is free of income tax and capital gains tax, with no tax on withdrawal. For most UK savers the first question is not what to buy but whether it is inside an ISA.",
        "Outside an ISA the **capital gains annual exempt amount and the dividend allowance have both been cut sharply** in recent years, so ordinary taxable accounts now generate tax bills at balances that used to be safe.",
        "A Lifetime ISA adds a 25% government bonus on up to £4,000 a year for a first home or retirement, but withdrawing for anything else incurs a penalty that can leave you worse off than you started.",
        "Pension contributions get relief at your marginal rate, so for a higher-rate taxpayer the pension usually beats the ISA on pure maths — the ISA wins on access, not on return.",
      ],
    },
    "source": "Standard compound-interest formula; illustrative default inputs. ISA allowance £20,000 and Lifetime ISA limit £4,000 for 2026-27 (gov.uk)",
    "asOf": "2026-06",
    "reviewedBy": "ISA and Lifetime ISA limits checked on gov.uk on 2026-11-02; the defaults are example inputs for you to change. General information, not advice."
  },

  // Cost of raising a child (added 2026-10-29). Bands: CPAG 2025 basic cost for
  // a couple, £167,700 to 18 excl. rent, childcare and council tax (the figure
  // our UK article publishes; the research note only had the 2021-era £81,772)
  // ÷ 18.45 band-years (BAND_WEIGHTS in child-cost.ts) = £9,089/yr × 0.85 / 1 / 1.2.
  "cost-of-raising-a-child-calculator": {
    "defaults": { "children": 1, "careYears": 3, "careAnnual": 18876, "careSubsidyPct": 0, "housingOn": 1, "housingAnnual": 2530, "inflationPct": 2, "benefitsOn": 1 },
    "labels": { "careAnnual": "Nursery, full-time (£/yr, before funded hours)" },
    "data": {
      "bands": { "early": 7730, "middle": 9090, "teen": 10910 },
      "levels": { "low": 0.8, "average": 1, "high": 1.3 },
      "benefits": [ { "fromAge": 0, "toAge": 17, "first": 1406.6, "additional": 930.8 } ],
      "benefitName": "Child Benefit",
      "benefitNote": "Child Benefit is £27.05 a week for the eldest or only child and £17.90 for each additional child (2026/27, gov.uk). The High Income Child Benefit Charge claws it back from £60,000 of adjusted net income, so a higher earner may keep little or none of it.",
      "careNote": "Coram Childcare Survey 2026: 25 hours a week of nursery for a child under 2 in England averages £188.75 a week (£9,438 a year) with no funded hours; full-time here is our doubling of that. Funded hours for working parents can cover much of this, so enter the share they cover as the subsidy.",
      "housingNote": "Our assumption: an extra bedroom's share of rent, taken as 15% of the ONS average UK rent (£1,406 a month, September 2026) per child.",
      "bandsNote": "Our estimate based on CPAG's 2025 basic cost of a child for a couple (about £167,700 to 18, excluding rent, childcare and council tax), spread across the age bands. CPAG prices a minimum acceptable standard, so typical spending can be higher.",
      "headline": {
        "amount": 250000,
        "text": "CPAG Cost of a Child 2025 (Loughborough University Minimum Income Standard, October 2025): £250,000 for a couple and £290,000 for a lone parent, to age 18, including rent and childcare",
        "status": "charity and university research, the de-facto UK benchmark; there is no government figure. It prices a minimum acceptable standard of living, not average spending."
      }
    },
    "context": {
      "title": "What changes in the UK",
      "points": [
        "**Child Benefit is universal to claim but not to keep**: the High Income Child Benefit Charge recovers it through tax once one parent's adjusted net income passes £60,000. Claiming still protects the non-earning parent's National Insurance record, so it is usually worth claiming even when the charge takes it all back.",
        "Funded childcare hours in England now reach working parents of children from **9 months old**, but they are term-time hours with eligibility rules and providers may charge for meals and extras. The funded share, not the headline price, is what decides the childcare line.",
        "Scotland and Wales run separate childcare offers and prices differ by nation: Coram's 2026 survey puts the same 25 hours for an under-2 lower in Scotland and Wales than in England.",
        "The best-known UK figure, CPAG's Cost of a Child, measures what a child adds to a **minimum** acceptable budget. It is a floor built by Loughborough University researchers with parents, not a measure of what families typically spend."
      ]
    },
    "source": "Everyday costs: our estimate based on CPAG Cost of a Child 2025 basic cost for a couple (~£167,700 to 18 excluding rent, childcare and council tax; to verify against the report). Childcare: Coram Childcare Survey 2026 (25 hours a week, under 2, England, £188.75/wk). Housing: our assumption of 15% of ONS average rent (£1,406/mo, September 2026) per child. Child Benefit £27.05/wk eldest, £17.90/wk each additional (gov.uk, 2026/27)",
    "asOf": "2026-10",
    "reviewedBy": "Child Benefit rates checked against gov.uk (pinned in the statutory-figures test, 2026-09-30); the spending bands, childcare and housing lines are our estimate based on the named sources, not individually verified. General information, not advice."
  },
} as unknown as CountryPack;

export default pack;
