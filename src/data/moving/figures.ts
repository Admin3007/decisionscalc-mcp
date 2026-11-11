/**
 * Moving Abroad cluster: every sourced figure the pair pages use.
 *
 * Mirrors the country packs' provenance rule: each figure carries its source,
 * URL and checked date. `status` records how far it was checked:
 *   official        — read on the official page itself
 *   official-search — the official document was found and quoted via search,
 *                     but not opened (the build session's network blocked it)
 *   to-verify       — secondary sources only, or sources disagree
 *   market          — prices from businesses (removal firms); no official source
 *                     exists, so the range spans several published price guides
 * Pages show the source and date for every line; the status stays internal
 * (TO_VERIFY below and radar/decisionscalc/MOVING-ABROAD-SPEC.md) until each
 * figure is confirmed on the official page.
 *
 * Fee dates to re-check: Australia 1 July, UK April, Canada 30 April and the
 * proof-of-funds table each summer, RTB quarterly, CMHC each December.
 */

export type Currency = 'USD' | 'GBP' | 'EUR' | 'AUD' | 'CAD' | 'CHF' | 'INR';
export type Status = 'official' | 'official-search' | 'to-verify' | 'market' | 'estimate';
/** Destination countries with fee, rent and deposit data. */
export type Dest = 'AU' | 'CA' | 'IE' | 'GB';

export interface Source {
  label: string;
  url: string;
  checked: string; // ISO date
  status: Status;
}

const CHECKED = '2026-10-29';
const src = (label: string, url: string, status: Status): Source => ({ label, url, checked: CHECKED, status });

export const SOURCES = {
  auVisaPages: src('Department of Home Affairs visa pages', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing', 'official'),
  auPricing: src('Home Affairs current visa pricing table (additional applicants)', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/fees-and-charges/current-visa-pricing', 'official'),
  caFees: src('IRCC fee list', 'https://ircc.canada.ca/english/information/fees/fees.asp', 'official'),
  caProofFunds: src('IRCC: Express Entry proof of funds', 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/proof-funds.html', 'official'),
  caBiometrics: src('IRCC: who needs to give biometrics', 'https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/biometrics.html', 'official'),
  ieCsep: src('Department of Enterprise: Critical Skills Employment Permit', 'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/', 'official'),
  ieGep: src('Department of Enterprise: General Employment Permit', 'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/general-employment-permit/', 'official'),
  ieIrp: src('Immigration Service Delivery: registration (IRP) fee', 'https://www.irishimmigration.ie/registering-your-immigration-permission/', 'official'),
  rtb: src('RTB Rent Index Q1 2026 (new tenancies)', 'https://rtb.ie/wp-content/uploads/2026/09/RTB-Rent-Index-Q1-2026.pdf', 'official'),
  cmhc: src('CMHC 2025 Rental Market Report: average turnover-unit rent, 2-bedroom purpose-built, Oct 2025 (Figure 1)', 'https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/market-reports/rental-market-reports-major-centres', 'official'),
  nswBond: src('NSW Rent and Sales Report, rent tables June 2026 quarter (Greater Sydney median, new bonds)', 'https://dcj.nsw.gov.au/about-us/families-and-communities-statistics/housing-rent-and-sales/rent-and-sales-report.html', 'official'),
  vicRent: src('Homes Victoria Rental Report, June quarter 2026 (metro Melbourne median, new lettings)', 'https://www.dffh.vic.gov.au/publications/rental-report', 'official'),
  ieDeposit: src('Residential Tenancies (No.2) Act 2021, s.7', 'https://www.irishstatutebook.ie/eli/2021/act/17/section/7/enacted/en/html', 'official-search'),
  auBondQld: src('Residential Tenancies Authority: rental bond', 'https://www.rta.qld.gov.au/renting/starting-a-tenancy/rental-bond', 'official'),
  auBondNsw: src('NSW Government: paying a rental bond (at most 4 weeks’ rent)', 'https://www.nsw.gov.au/housing-and-construction/renting-a-place-to-live/renting-a-property-nsw/starting-a-lease/paying-a-rental-bond', 'official-search'),
  auBondVic: src('Consumer Affairs Victoria: bond amounts and payments', 'https://www.consumer.vic.gov.au/housing/renting/rent-bond-bills-and-condition-reports/bond/bond-amounts-and-paying-a-bond', 'official'),
  onDeposit: src('Landlord and Tenant Board: A Guide to the Residential Tenancies Act (rent deposits)', 'https://tribunalsontario.ca/documents/ltb/Brochures/Guide%20to%20RTA%20(English).html', 'official'),
  bcDeposit: src('BC Residential Tenancy Branch: deposits and fees', 'https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies/starting-a-tenancy/deposits-fees', 'official'),
  abDeposit: src('Alberta: starting a tenancy (security deposits)', 'https://www.alberta.ca/starting-a-tenancy', 'official'),
  qcDeposit: src('Gouvernement du Québec: requiring a security deposit is illegal (Civil Code of Québec, art. 1904); only the first month’s rent may be required in advance', 'https://www.quebec.ca/nouvelles/actualites/details/exiger-un-depot-de-garantie-est-illegal', 'official'),
  ecb: src('ECB euro reference rates, 28 Oct 2026', 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html', 'official'),
  shipUkAu: src('Mover price guides: Sirelo, PSS Removals, Anglo Pacific', 'https://sirelo.co.uk/container-shipping/shipping-container-uk-to-australia/', 'market'),
  shipUkCa: src('Mover price guides: Sirelo, Shipit, Anglo Pacific', 'https://sirelo.co.uk/container-shipping/shipping-container-uk-to-canada/', 'market'),
  shipUsIe: src('Mover price guides: Sirelo, Jordan River Moving', 'https://sirelo.com/container-shipping/shipping-container-us-to-ireland/', 'market'),
  shipUsCa: src('Mover price guides: ConsumerAffairs, Jordan River Moving, moveBuddha', 'https://www.consumeraffairs.com/movers/international-moving-costs.html', 'market'),
  // Batch 2 (Oct 29, 2026): Ireland and US origins, UK destination.
  auWhm462: src('Home Affairs: Work and Holiday visa (subclass 462)', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-462', 'official'),
  gbFees: src('Home Office: immigration and nationality fees, 8 October 2026 (no change from April)', 'https://www.gov.uk/government/publications/visa-regulations-revised-table', 'official'),
  gbDependants: src('GOV.UK: partners and children pay the same fee per person', 'https://www.gov.uk/skilled-worker-visa/how-much-it-costs', 'official'),
  gbIhs: src('GOV.UK: Immigration Health Surcharge', 'https://www.gov.uk/healthcare-immigration-application/how-much-pay', 'official'),
  gbYms: src('GOV.UK: Youth Mobility Scheme visa eligibility', 'https://www.gov.uk/youth-mobility/eligibility', 'official'),
  gbCta: src('GOV.UK: Common Travel Area guidance', 'https://www.gov.uk/government/publications/common-travel-area-guidance', 'official'),
  ons: src('ONS: Private rent and house prices, UK, October 2026', 'https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/privaterentandhousepricesuk/october2026', 'official'),
  engDeposit: src('GOV.UK: Tenant Fees Act 2019 guidance for tenants', 'https://www.gov.uk/guidance/tenant-fees-act-2019-guidance-for-tenants', 'official'),
  scotDeposit: src('mygov.scot: paying rent and deposit', 'https://www.mygov.scot/rent-private-landlord/paying-rent-and-deposit', 'official'),
  walesDeposit: src('Welsh Government: Renting Homes (Fees etc.) (Wales) Act 2019 guidance (no cap; typically about one month)', 'https://www.gov.wales/sites/default/files/publications/2019-10/tenant-letting-fees-detailed-guidance.pdf', 'official'),
  niDeposit: src('nidirect: Tenancy Deposit Scheme, information for tenants', 'https://www.nidirect.gov.uk/articles/tenancy-deposit-scheme-information-tenants', 'official'),
  shipIeAu: src('Mover price guides: Flyto Relocation (Ireland), Sirelo Australia', 'https://flytorelocation.com/ie/best-international-movers-ireland-2026/', 'market'),
  shipIeCa: src('Mover price guides: AMC Removals, Flyto Relocation (Ireland)', 'https://www.amcremovals.ie/international-relocations/moving-to-canada', 'market'),
  shipUsAu: src('Mover price guides: Exfreight, iContainers (door to door)', 'https://www.exfreight.com/shipping-from-usa-to-australia/', 'market'),
  shipUsUk: src('Mover price guides for the UK–US route (Sirelo, Shipit, PSS); published for moves out of the UK', 'https://sirelo.co.uk/container-shipping/shipping-container-uk-to-usa', 'market'),
  shipCaUk: src('Mover price guides for the UK–Canada route (Shipit, PSS, Sirelo); published for moves out of the UK', 'https://shipit.co.uk/container-shipping-costs/canada', 'market'),
  shipAuUk: src('Mover price guides for the UK–Australia route (Sirelo, PSS, Anglo Pacific); published for moves out of the UK', 'https://sirelo.co.uk/container-shipping/shipping-container-uk-to-australia/', 'market'),
  shipIeUk: src('Mover price guides for UK–Ireland moves (Sirelo, PSS Removals)', 'https://www.pssremovals.com/removals-ireland', 'market'),
  estimate: src('Our estimate: change it', '/methodology/', 'estimate'),
} as const;

/** ECB reference rates: units of each currency per 1 EUR. */
export const FX = {
  date: '2026-10-28',
  perEur: { EUR: 1, USD: 1.1133, GBP: 0.83785, AUD: 1.583, CAD: 1.5638, CHF: 0.9247, INR: 106.0095 } as Record<Currency, number>,
  source: SOURCES.ecb,
};

// ── Visa and permit fees ──────────────────────────────────────────────────
export interface FeeLine {
  id: string;
  label: string;
  currency: Currency;
  main: number;        // main applicant
  extraAdult: number;  // each additional applicant 18+
  child: number;       // each applicant under 18
  /** Cap on the line for the whole family (e.g. Canadian biometrics). */
  familyCap?: number;
  /** The employer usually or sometimes pays this line. */
  employer?: 'usually' | 'sometimes';
  source: Source;
  /** Where the additional-applicant charges come from, when not `source`. */
  familySource?: Source;
}

export interface Route {
  id: string;
  label: string;
  blurb: string;
  lines: FeeLine[];
  /** Visa is for one person only (no family members on the application). */
  singleOnly?: boolean;
  /** Express Entry proof-of-funds check applies (FSW/FST streams). */
  proofOfFunds?: boolean;
  notIncluded: string;
}

const auNotIncluded = 'Not included: skills assessment, English test, health examinations and police certificates, which are paid to other bodies.';

const CA_BIO: FeeLine = { id: 'bio', label: 'Biometrics (fingerprints and photo)', currency: 'CAD', main: 85, extraAdult: 85, child: 85, familyCap: 170, source: SOURCES.caFees };

/** Biometrics are not needed for temporary residence by US nationals (IRCC). */
const CA_WP_LINES = (bio: boolean): FeeLine[] => [
  { id: 'wp', label: 'Work permit (spouse: open work permit, incl. CAD 100 holder fee)', currency: 'CAD', main: 155, extraAdult: 255, child: 0, source: SOURCES.caFees },
  ...(bio ? [CA_BIO] : []),
];
const CA_WP_NOT_INCLUDED = 'Not included: children’s study permits or visitor records (separate fees), and the employer’s Labour Market Impact Assessment fee, which the employer pays.';

const GB_IHS_3Y: FeeLine = { id: 'ihs', label: 'Immigration Health Surcharge, 3 years (£1,035 a year; £776 for children)', currency: 'GBP', main: 3105, extraAdult: 3105, child: 2328, source: SOURCES.gbIhs };
const gbNotIncluded = 'Not included: the Certificate of Sponsorship and Immigration Skills Charge, which the employer pays, and an English test if you need one.';

export const ROUTES: Record<Dest, Route[]> = {
  AU: [
    {
      id: 'au-189', label: 'Skilled Independent (subclass 189)', blurb: 'Permanent, points-tested, no sponsor.',
      lines: [
        { id: 'vac', label: 'Visa application charge', currency: 'AUD', main: 6135, extraAdult: 3070, child: 1540, source: SOURCES.auVisaPages, familySource: SOURCES.auPricing },
      ],
      notIncluded: auNotIncluded,
    },
    {
      id: 'au-482', label: 'Skills in Demand (subclass 482)', blurb: 'Temporary, employer-sponsored.',
      lines: [
        { id: 'vac', label: 'Visa application charge', currency: 'AUD', main: 4015, extraAdult: 4015, child: 1005, employer: 'sometimes', source: SOURCES.auVisaPages, familySource: SOURCES.auPricing },
      ],
      notIncluded: auNotIncluded + ' The employer pays the nomination fee and the Skilling Australians Fund levy.',
    },
    {
      id: 'au-417', label: 'Working Holiday (subclass 417), first visa', blurb: 'Temporary, one person, age limits apply.',
      lines: [
        { id: 'vac', label: 'Visa application charge', currency: 'AUD', main: 840, extraAdult: 0, child: 0, source: SOURCES.auVisaPages },
      ],
      singleOnly: true,
      notIncluded: 'Not included: health examinations if asked for. A second or third Working Holiday visa costs AUD 1,000.',
    },
    {
      id: 'au-462', label: 'Work and Holiday (subclass 462), first visa', blurb: 'Temporary, one person; for US citizens aged 18 to 30, with no ballot.',
      lines: [
        { id: 'vac', label: 'Visa application charge', currency: 'AUD', main: 840, extraAdult: 0, child: 0, source: SOURCES.auWhm462 },
      ],
      singleOnly: true,
      notIncluded: 'Not included: health examinations if asked for. A second or third visa costs AUD 1,000.',
    },
  ],
  CA: [
    {
      id: 'ca-ee', label: 'Express Entry permanent residence', blurb: 'Permanent; the proof-of-funds check applies to the skilled worker and trades streams.',
      lines: [
        { id: 'pr', label: 'Processing fee + right of permanent residence fee', currency: 'CAD', main: 1590, extraAdult: 1590, child: 270, source: SOURCES.caFees },
        CA_BIO,
      ],
      proofOfFunds: true,
      notIncluded: 'Not included: language tests, educational credential assessment, medical exam and police certificates.',
    },
    {
      id: 'ca-wp', label: 'Employer-specific work permit', blurb: 'Temporary; a spouse can apply for an open work permit.',
      lines: CA_WP_LINES(true),
      notIncluded: CA_WP_NOT_INCLUDED,
    },
    {
      id: 'ca-wp-us', label: 'Employer-specific work permit', blurb: 'Temporary; a spouse can apply for an open work permit. US citizens give no biometrics for it.',
      lines: CA_WP_LINES(false),
      notIncluded: CA_WP_NOT_INCLUDED,
    },
    {
      id: 'ca-iec', label: 'International Experience Canada: Working Holiday', blurb: 'Temporary, one person, for citizens of partner countries.',
      lines: [
        { id: 'iec', label: 'IEC participation fee', currency: 'CAD', main: 184.75, extraAdult: 0, child: 0, source: SOURCES.caFees },
        { id: 'owp', label: 'Open work permit holder fee', currency: 'CAD', main: 100, extraAdult: 0, child: 0, source: SOURCES.caFees },
        { id: 'bio', label: 'Biometrics', currency: 'CAD', main: 85, extraAdult: 0, child: 0, source: SOURCES.caFees },
      ],
      singleOnly: true,
      notIncluded: 'Not included: the health insurance IEC requires for your whole stay.',
    },
  ],
  IE: [
    {
      id: 'ie-cta', label: 'No visa needed (British citizen, Common Travel Area)', blurb: 'British citizens can live and work in Ireland without a visa or any permission.',
      lines: [],
      notIncluded: 'No visa, permit or residence registration fee. You still apply for a PPS number (free) to work and use public services.',
    },
    {
      id: 'ie-csep', label: 'Critical Skills Employment Permit', blurb: 'For listed occupations; leads to Stamp 4 after two years.',
      lines: [
        { id: 'permit', label: 'Employment permit fee (90% refunded if refused)', currency: 'EUR', main: 1000, extraAdult: 0, child: 0, employer: 'usually', source: SOURCES.ieCsep },
        { id: 'irp', label: 'Irish Residence Permit registration (adults; under-18s exempt)', currency: 'EUR', main: 300, extraAdult: 300, child: 0, source: SOURCES.ieIrp },
      ],
      notIncluded: 'Not included: an entry visa where your nationality needs one, and the cost of degree or qualification checks.',
    },
    {
      id: 'ie-gep', label: 'General Employment Permit', blurb: 'For most other occupations; a labour market needs test usually applies.',
      lines: [
        { id: 'permit', label: 'Employment permit fee (up to 2 years)', currency: 'EUR', main: 1000, extraAdult: 0, child: 0, employer: 'sometimes', source: SOURCES.ieGep },
        { id: 'irp', label: 'Irish Residence Permit registration (adults; under-18s exempt)', currency: 'EUR', main: 300, extraAdult: 300, child: 0, source: SOURCES.ieIrp },
      ],
      notIncluded: 'Not included: an entry visa where your nationality needs one.',
    },
  ],
  GB: [
    {
      id: 'gb-sw', label: 'Skilled Worker visa (up to 3 years)', blurb: 'Needs a job offer from a licensed sponsor; partners and children can join you.',
      lines: [
        { id: 'visa', label: 'Visa application fee (applying from outside the UK)', currency: 'GBP', main: 819, extraAdult: 819, child: 819, employer: 'sometimes', source: SOURCES.gbFees, familySource: SOURCES.gbDependants },
        GB_IHS_3Y,
      ],
      notIncluded: gbNotIncluded + ' A visa for more than 3 years costs £1,618, plus a surcharge for each year.',
    },
    {
      id: 'gb-hc', label: 'Health and Care Worker visa (up to 3 years)', blurb: 'For eligible health and care jobs; no Immigration Health Surcharge for you or your family.',
      lines: [
        { id: 'visa', label: 'Visa application fee (applying from outside the UK)', currency: 'GBP', main: 324, extraAdult: 324, child: 324, employer: 'sometimes', source: SOURCES.gbFees, familySource: SOURCES.gbDependants },
      ],
      notIncluded: gbNotIncluded + ' A visa for more than 3 years costs £628.',
    },
    {
      id: 'gb-gt', label: 'Global Talent visa (3 years of the surcharge)', blurb: 'For leaders in academia, research, arts, culture or digital technology; no job offer needed.',
      lines: [
        { id: 'visa', label: 'Endorsement and visa fee (£561 + £205)', currency: 'GBP', main: 766, extraAdult: 766, child: 766, source: SOURCES.gbFees, familySource: SOURCES.gbDependants },
        GB_IHS_3Y,
      ],
      notIncluded: 'Not included: costs of preparing the endorsement application. You choose a visa of up to 5 years and pay the surcharge for each year.',
    },
    {
      id: 'gb-yms', label: 'Youth Mobility Scheme visa (2 years)', blurb: 'One person; Australian and Canadian citizens aged 18 to 35 can apply without a ballot.',
      lines: [
        { id: 'visa', label: 'Visa application fee', currency: 'GBP', main: 340, extraAdult: 0, child: 0, source: SOURCES.gbFees },
        { id: 'ihs', label: 'Immigration Health Surcharge, 2 years at £776', currency: 'GBP', main: 1552, extraAdult: 0, child: 0, source: SOURCES.gbIhs },
      ],
      singleOnly: true,
      notIncluded: 'Not a cost, but required: £2,530 in savings when you apply (GOV.UK eligibility page). Australians and Canadians can extend for a third year from inside the UK.',
    },
    {
      id: 'gb-cta', label: 'No visa needed (Irish citizen, Common Travel Area)', blurb: 'Irish citizens can live and work in the UK without a visa or any permission.',
      lines: [],
      notIncluded: 'No visa, health surcharge or registration fee. You still apply for a National Insurance number (free) and register with a GP.',
    },
  ],
};

// ── Rent, deposits and bonds ──────────────────────────────────────────────
export interface City {
  id: string;
  label: string;
  /** Rent as published: monthly, or weekly in Australia. */
  rent: number;
  per: 'month' | 'week';
  measure: string;
  rentSource: Source;
  /** Deposit or bond in months of rent. */
  depositMonths: number;
  depositRule: string;
  depositSource: Source;
}

/** Four weeks' rent expressed in months (4 / (52/12)). */
export const FOUR_WEEKS_IN_MONTHS = 48 / 52;

/** Five weeks' rent expressed in months (England's Tenant Fees Act cap). */
export const FIVE_WEEKS_IN_MONTHS = 60 / 52;

const ENG_RULE = 'Deposit at most 5 weeks’ rent (6 weeks if annual rent is £50,000 or more), and at most 1 month’s rent in advance';
const ONS_MEASURE = 'ONS average private rent, all property types, September 2026 (provisional)';

export const CITIES: Record<Dest, City[]> = {
  IE: [
    { id: 'dublin', label: 'Dublin', rent: 2335, per: 'month', measure: 'average rent on new tenancies, Q1 2026', rentSource: SOURCES.rtb, depositMonths: 1, depositRule: 'Deposit at most 1 month’s rent, and at most 1 month’s rent in advance', depositSource: SOURCES.ieDeposit },
    { id: 'gda', label: 'Greater Dublin Area (outside Dublin)', rent: 1806, per: 'month', measure: 'average rent on new tenancies, Q1 2026', rentSource: SOURCES.rtb, depositMonths: 1, depositRule: 'Deposit at most 1 month’s rent, and at most 1 month’s rent in advance', depositSource: SOURCES.ieDeposit },
    { id: 'galway', label: 'Galway City', rent: 2004, per: 'month', measure: 'average rent on new tenancies, Galway City, Q1 2026', rentSource: SOURCES.rtb, depositMonths: 1, depositRule: 'Deposit at most 1 month’s rent, and at most 1 month’s rent in advance', depositSource: SOURCES.ieDeposit },
    { id: 'limerick', label: 'Limerick City', rent: 1921, per: 'month', measure: 'average rent on new tenancies, Limerick City, Q1 2026', rentSource: SOURCES.rtb, depositMonths: 1, depositRule: 'Deposit at most 1 month’s rent, and at most 1 month’s rent in advance', depositSource: SOURCES.ieDeposit },
    { id: 'cork', label: 'Cork City', rent: 1903, per: 'month', measure: 'average rent on new tenancies, Cork City, Q1 2026', rentSource: SOURCES.rtb, depositMonths: 1, depositRule: 'Deposit at most 1 month’s rent, and at most 1 month’s rent in advance', depositSource: SOURCES.ieDeposit },
    { id: 'rest', label: 'Elsewhere in Ireland (outside Dublin and its commuter counties)', rent: 1432, per: 'month', measure: 'average rent on new tenancies outside the Greater Dublin Area, Q1 2026 (the cities above cost more)', rentSource: SOURCES.rtb, depositMonths: 1, depositRule: 'Deposit at most 1 month’s rent, and at most 1 month’s rent in advance', depositSource: SOURCES.ieDeposit },
  ],
  AU: [
    { id: 'sydney', label: 'Sydney (NSW)', rent: 780, per: 'week', measure: 'median weekly rent on new bonds, Greater Sydney, Apr–Jun 2026', rentSource: SOURCES.nswBond, depositMonths: FOUR_WEEKS_IN_MONTHS, depositRule: 'Bond at most 4 weeks’ rent', depositSource: SOURCES.auBondNsw },
    { id: 'melbourne', label: 'Melbourne (VIC)', rent: 595, per: 'week', measure: 'median weekly rent on new lettings, metro Melbourne, June quarter 2026', rentSource: SOURCES.vicRent, depositMonths: 1, depositRule: 'Bond at most 1 month’s rent when rent is $900 a week or less', depositSource: SOURCES.auBondVic },
  ],
  CA: [
    { id: 'toronto', label: 'Toronto (Ontario)', rent: 2547, per: 'month', measure: 'average 2-bedroom rent paid by new tenants (turnover units), purpose-built rentals, Oct 2025', rentSource: SOURCES.cmhc, depositMonths: 1, depositRule: 'No damage deposit; a last month’s rent deposit (at most 1 month) is allowed', depositSource: SOURCES.onDeposit },
    { id: 'vancouver', label: 'Vancouver (British Columbia)', rent: 2696, per: 'month', measure: 'average 2-bedroom rent paid by new tenants (turnover units), purpose-built rentals, Oct 2025', rentSource: SOURCES.cmhc, depositMonths: 0.5, depositRule: 'Security deposit at most half a month’s rent', depositSource: SOURCES.bcDeposit },
    { id: 'calgary', label: 'Calgary (Alberta)', rent: 1836, per: 'month', measure: 'average 2-bedroom rent paid by new tenants (turnover units), purpose-built rentals, Oct 2025', rentSource: SOURCES.cmhc, depositMonths: 1, depositRule: 'Security deposit at most 1 month’s rent', depositSource: SOURCES.abDeposit },
    { id: 'montreal', label: 'Montréal (Québec)', rent: 1644, per: 'month', measure: 'average 2-bedroom rent paid by new tenants (turnover units), purpose-built rentals, Oct 2025', rentSource: SOURCES.cmhc, depositMonths: 0, depositRule: 'No deposit of any kind allowed; only the first month’s rent in advance', depositSource: SOURCES.qcDeposit },
  ],
  GB: [
    { id: 'london', label: 'London', rent: 2338, per: 'month', measure: ONS_MEASURE, rentSource: SOURCES.ons, depositMonths: FIVE_WEEKS_IN_MONTHS, depositRule: ENG_RULE, depositSource: SOURCES.engDeposit },
    { id: 'england', label: 'Elsewhere in England (England average, London included)', rent: 1466, per: 'month', measure: ONS_MEASURE, rentSource: SOURCES.ons, depositMonths: FIVE_WEEKS_IN_MONTHS, depositRule: ENG_RULE, depositSource: SOURCES.engDeposit },
    { id: 'scotland', label: 'Scotland', rent: 1011, per: 'month', measure: ONS_MEASURE, rentSource: SOURCES.ons, depositMonths: 2, depositRule: 'Deposit at most 2 months’ rent', depositSource: SOURCES.scotDeposit },
    { id: 'wales', label: 'Wales', rent: 848, per: 'month', measure: ONS_MEASURE, rentSource: SOURCES.ons, depositMonths: 1, depositRule: 'No legal cap on the deposit in Wales; we assume 1 month’s rent', depositSource: SOURCES.walesDeposit },
    { id: 'ni', label: 'Northern Ireland', rent: 879, per: 'month', measure: 'ONS average private rent, all property types, July 2026 (latest for Northern Ireland)', rentSource: SOURCES.ons, depositMonths: 1, depositRule: 'Deposit at most 1 month’s rent', depositSource: SOURCES.niDeposit },
  ],
};

// ── Canada: Express Entry proof of funds (not a cost; money you must show) ─
export const PROOF_OF_FUNDS = {
  table: [15263, 19001, 23360, 28362, 32168, 36280, 40392] as number[], // 1..7 family members, CAD
  extraPerPerson: 4112,
  effective: '2025-07-07',
  source: SOURCES.caProofFunds,
};

// ── Our estimates (labelled "our estimate, change it" on every page) ──────
export interface Range { low: number; high: number; currency: Currency; openEnded?: boolean }

/** Monthly spending other than rent: first adult, each extra adult, each child. */
export const LIVING: Record<Dest, { currency: Currency; adult: number; extraAdult: number; child: number }> = {
  IE: { currency: 'EUR', adult: 1000, extraAdult: 550, child: 400 },
  AU: { currency: 'AUD', adult: 1800, extraAdult: 900, child: 600 },
  CA: { currency: 'CAD', adult: 1600, extraAdult: 800, child: 550 },
  GB: { currency: 'GBP', adult: 1000, extraAdult: 550, child: 400 },
};

/** Two weeks' temporary stay, basic furniture and kitchen, phone, local transport: 1–2 people. */
export const SETUP: Record<Dest, Range> = {
  IE: { low: 2500, high: 6000, currency: 'EUR' },
  AU: { low: 4000, high: 9000, currency: 'AUD' },
  CA: { low: 3500, high: 8000, currency: 'CAD' },
  GB: { low: 2000, high: 5000, currency: 'GBP' },
};

// ── Moving Abroad Planner extras (scripts/gen-moving-planner.mjs) ─────────
/** UK Youth Mobility Scheme: savings you must hold when you apply (not a cost). */
export const YMS_SAVINGS = { amount: 2530, currency: 'GBP' as Currency, source: SOURCES.gbYms };

/**
 * Official processing-time trackers. Processing times change weekly, so the
 * planner links to these and never types a time in. URLs not yet opened from
 * the build session (network blocked), hence to-verify.
 */
export const PROCESSING_TRACKERS: Record<Dest, Source[]> = {
  AU: [src('Home Affairs: global visa processing times', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-visa-processing-times', 'official')],
  CA: [src('IRCC: check processing times', 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html', 'official')],
  IE: [src('Department of Enterprise: employment permit processing dates', 'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/current-application-processing-dates/', 'official')],
  GB: [src('GOV.UK: visa processing times, applications outside the UK', 'https://www.gov.uk/guidance/visa-processing-times-applications-outside-the-uk', 'official')],
};
