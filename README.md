# DecisionsCalc MCP server

Calculators built on **official rules**, for AI agents. Free, no key, read-only.

- **Endpoint:** `https://decisionscalc.com/mcp` (Model Context Protocol, Streamable HTTP, JSON responses)
- **Official MCP Registry:** `com.decisionscalc/calculators`
- **Docs for agents:** https://decisionscalc.com/for-agents/
- **Server card:** https://decisionscalc.com/.well-known/mcp/server-card.json

Every result includes the calculator page a person can open and the **official sources** (gov.ie, Revenue, Citizens
Information, GOV.UK, Canada.ca, Québec.ca, ATO, IRD…) it is based on, so an agent can cite them. Rates are dated and
re-checked when budgets change.

## Use it

```json
{ "mcpServers": { "decisionscalc": { "type": "http", "url": "https://decisionscalc.com/mcp" } } }
```

Example call:

```bash
curl -s https://decisionscalc.com/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ireland_rent_tax_credit","arguments":{"monthlyRent":1500}}}'
```

## Tools

| Tool | What it does | Calculator |
|---|---|---|
| `ireland_what_can_i_claim` | Ireland: list the social welfare payments and tax credits a household may get (Child Benefit, New Baby Grant, Working Family Payment, Maternity Benefit, Carer’s Allowance, State Pension, Fuel Allowance, Rent Tax Credit) with estimated amounts, using official 2026/2027 rates. | [page](https://decisionscalc.com/tools/ireland-what-can-i-claim/) |
| `ireland_working_family_payment` | Ireland: estimate the Working Family Payment (weekly, tax-free) for a family, from gross pay, number of children and hours worked, using the official income limits (2026, and +€30 from January 2027) and the 60% rule. | [page](https://decisionscalc.com/tools/ireland-working-family-payment-calculator/) |
| `ireland_rent_tax_credit` | Ireland: how much Rent Tax Credit a renter can claim for each year 2022–2026 (20% of rent, capped per year), including back-claims. Claims for 2022 must be made by 31 December 2026 (Revenue four-year rule). | [page](https://decisionscalc.com/tools/ireland-rent-tax-credit-calculator/) |
| `ireland_carers_allowance` | Ireland: estimate the weekly Carer’s Allowance from the official means test (income disregard €1,000/€2,000 from July 2026, €1,150/€2,300 from July 2027; savings bands; Department rate table). | [page](https://decisionscalc.com/tools/ireland-carers-allowance-calculator/) |
| `ireland_fuel_allowance` | Ireland: check the Fuel Allowance means test (66+: €534 a week single, €640.80 from January 2027; under 66 needs a qualifying payment) and the 2026/27 season amount (€38, then €43 a week; €1,134 in lump sums). | [page](https://decisionscalc.com/tools/ireland-fuel-allowance-calculator/) |
| `ireland_state_pension_contributory` | Ireland: estimate the State Pension (Contributory) weekly rate under the Department’s Total Contributions Approach (paid PRSI + up to 520 credits + HomeCaring Periods; 2,080 for the full rate). | [page](https://decisionscalc.com/tools/ireland-state-pension-calculator/) |
| `ireland_budget_2027_take_home` | Ireland: take-home pay in 2026 against 2027 after Budget 2027 (income tax bands and credits, USC, PRSI, rent credit), line by line. | [page](https://decisionscalc.com/tools/ireland-budget-2027-calculator/) |
| `ireland_maternity_leave_pay` | Ireland: each parent’s take-home pay in the year of maternity/paternity/parent’s leave against a normal year (Maternity Benefit €299 a week in 2026, €309 from 2027; taxed but no USC or PRSI), the household gap and a monthly saving target. | [page](https://decisionscalc.com/tools/ireland-maternity-benefit-calculator/) |
| `ireland_help_to_buy` | Ireland: Help to Buy refund for a first-time buyer of a new build or self-build: the lesser of €35,000 (contracts from 7 October 2026; €30,000 before), 10% of the price, or income tax + DIRT paid in the previous 4 years; price limit €500,000; mortgage at least 70% of the price. Scheme runs to the end of 2029. | [page](https://decisionscalc.com/tools/ireland-help-to-buy-calculator/) |
| `ireland_capital_gains_tax` | Ireland: capital gains tax on a disposal (shares, crypto, property other than your home): 31% for disposals from 7 October 2026 (33% before), 33% on development land, €1,270 annual exemption, losses, and the payment deadline (15 December for January–November disposals). Not for Irish/EU ETFs or funds, which pay exit tax. | [page](https://decisionscalc.com/tools/ireland-cgt-calculator/) |
| `ireland_inheritance_gift_tax` | Ireland: Capital Acquisitions Tax (CAT) on a gift or inheritance: group threshold by relationship (A child €420,000, B sibling/niece/nephew/grandchild/parent €44,000, C everyone else €22,000 from 7 October 2026; €400,000/€40,000/€20,000 before), 33% above the unused threshold after earlier benefits in the same group since 5 December 1991, the €3,000 small gift exemption, whether an IT38 return is needed (above 80% of the threshold) and the 31 October pay-and-file date. Spouses and civil partners are exempt; reliefs (dwelling house, agricultural, business, favourite nephew) are not applied. | [page](https://decisionscalc.com/tools/ireland-inheritance-tax-calculator/) |
| `ireland_myfuturefund_pension` | Ireland: MyFutureFund (pension auto-enrolment, started January 2026): what you, your employer and the State pay in (1.5/1.5/0.5% rising to 6/6/2% by year 10, on pay up to €80,000) and the projected pot at retirement. | [page](https://decisionscalc.com/tools/ireland-myfuturefund-calculator/) |
| `ireland_where_to_put_savings` | Ireland: compare where a lump sum ends up after tax over a number of years: State Savings (tax-free), a bank deposit (DIRT 33%), ETFs (exit tax with 8-year deemed disposal), shares (CGT 31%) and a pension (tax relief). Growth for market products is an assumption you set. | [page](https://decisionscalc.com/tools/ireland-savings-investment-calculator/) |
| `ireland_pension_tax_relief` | Ireland: income tax relief on personal pension contributions and AVCs (occupational scheme, PRSA, RAC, PEPP): the age-related limit (under 30 15%, 30-39 20%, 40-49 25%, 50-54 30%, 55-59 35%, 60+ 40% of earnings up to €115,000), relief at the marginal rate (2026 or Budget 2027 bands; no USC or PRSI relief), the net cost and the room left this year. | [page](https://decisionscalc.com/tools/ireland-pension-tax-relief-calculator/) |
| `ireland_landlord_rental_tax` | Ireland: tax on residential rental income for an individual landlord: profit after mortgage interest (deductible only for RTB-registered tenancies), other expenses and 12.5% wear and tear, income tax at the marginal rate on top of salary (2026 or Budget 2027 bands), the Residential Premises Rental Income Relief (up to €1,000, 20% of profit), USC with the 3% surcharge on non-PAYE income over €100,000, and PRSI on unearned income over €5,000 for employees under 66. | [page](https://decisionscalc.com/tools/ireland-landlord-tax-calculator/) |
| `uk_stamp_duty_england_ni` | UK: Stamp Duty Land Tax for England and Northern Ireland at 2026/27 rates, band by band: standard, first-time buyer relief (nil to £300,000, up to £500,000) or additional property (+5% on every band), plus the 2% non-resident surcharge. | [page](https://decisionscalc.com/tools/uk-stamp-duty-calculator/) |
| `scotland_lbtt` | Scotland: Land and Buildings Transaction Tax at 2026/27 rates, band by band, with first-time buyer relief (nil band to £175,000) or the 8% Additional Dwelling Supplement. | [page](https://decisionscalc.com/tools/scotland-lbtt-calculator/) |
| `wales_ltt` | Wales: Land Transaction Tax at 2026/27 rates, band by band (nil band £225,000 for everyone; no first-time buyer relief) or the higher rates for additional properties. | [page](https://decisionscalc.com/tools/wales-ltt-calculator/) |
| `canada_ei_maternity_parental` | Canada (outside Quebec): EI maternity and parental benefits for 2026: 55% of insurable earnings up to $729 a week (standard) or 33% up to $437 (extended), 15 weeks maternity, parental weeks, one-week waiting period. | [page](https://decisionscalc.com/tools/canada-ei-benefit-calculator/) |
| `quebec_qpip` | Quebec: QPIP (RQAP) parental insurance for 2026 for both parents: basic or special plan, birth or adoption, earnings up to $103,000, weekly amounts and totals, with the shareable weeks split between parents. | [page](https://decisionscalc.com/tools/quebec-qpip-calculator/) |
| `australia_private_health_rebate_mls` | Australia: private health insurance rebate (1 April 2026 – 31 March 2027) and Medicare Levy Surcharge for 2026–27 by income tier, single or family, and age band: whether hospital cover saves you tax. | [page](https://decisionscalc.com/tools/australia-private-health-rebate-calculator/) |
| `new_zealand_kiwisaver` | New Zealand: KiwiSaver balance at 65 under the 2026 rules (default and employer minimum 3.5%, 4% from April 2028; government contribution 25c per $1 up to $260.72; ESCT on employer contributions; PIR tax on returns). Returns are an assumption you set. | [page](https://decisionscalc.com/tools/kiwisaver-calculator/) |
| `parental_leave_income_gap` | Statutory parental leave pay for a birth parent and the income gap against normal pay (gross, before tax) in the UK (Statutory Maternity Pay), Ireland (Maternity Benefit), Canada (EI), Quebec (QPIP), Australia (Parental Leave Pay) or a US state’s paid family and medical leave (us-CA, us-NY, us-NJ, us-WA, us-MA and the rest; us-XX = no state program, FMLA unpaid), with an optional employer top-up. | [page](https://decisionscalc.com/parental-leave-planner/) |
| `uk_voluntary_ni_from_abroad` | UK State Pension for people living outside the UK: which gap years (2020–21 to 2026–27) can still be filled with voluntary National Insurance after the 6 April 2026 change, at Class 2 (£3.65/wk, years to 2025–26 only) or Class 3 (£18.40/wk), each year’s cost and 5 April deadline, and the State Pension gain (1/35 of £241.30 a week per year, up to 35 years) with payback. | [page](https://decisionscalc.com/tools/uk-voluntary-ni-abroad-calculator/) |

## What is in this repository

- `src/lib/agent-tools.ts`: the tool definitions (input schemas, which calculation each runs, sources).
- `src/lib/mcp-server.ts` + `functions/mcp.ts`: the stateless MCP server (JSON-RPC: initialize, tools/list, tools/call, ping)
  running as a Cloudflare Pages Function.
- `src/lib/webmcp.ts`: the same tools registered for in-browser agents (WebMCP) on decisionscalc.com.
- `src/lib/calc/*.ts`: the calculations, each with its official sources in the header and a test file reproducing the
  government's own worked examples where one exists. Run `npm install && npm test`.

This is a read-only mirror of the code running on decisionscalc.com, published so it can be audited.
Licence: source available, all rights reserved (see `LICENSE.md`). Using the hosted endpoint is free.

Results are general information, not financial, tax or legal advice. The relevant government department decides.
