/**
 * Home Buying Planner: every figure the planner and its spreadsheet use, with the official source and the date read.
 * Purchase-tax schedules are NOT retyped here: they come from the free calculators' own modules (uk-stamp-duty,
 * scotland-lbtt, wales-ltt, ca-land-transfer, au-transfer-duty, home-buying ieStampDuty), converted to one table
 * format (DutyRow) that the spreadsheet can evaluate with plain formulas. The spreadsheet's Rules tab is written from
 * this file; tests/contracts/home-buying-planner.test.ts recalculates it and compares it with the engine.
 * Official pages read on 9 November 2026 (see SOURCES).
 */
import { STANDARD as SDLT_STD, FTB as SDLT_FTB } from '../uk-stamp-duty.ts';
import { STANDARD as LBTT_STD, FTB as LBTT_FTB } from '../scotland-lbtt.ts';
import { MAIN as LTT_MAIN } from '../wales-ltt.ts';
import { LTT_BANDS, BC_FTB, ON_FTB_REFUND, TOR_FTB_REBATE, QC_FTB, PE_MIN, PROVINCE_NAMES, marginal, type Province } from '../ca-land-transfer.ts';
import { AU_DUTY, FHB_EXEMPT, type DutyRow, type AuState } from '../au-transfer-duty.ts';
import { HTB_CAP, HTB_RATE, HTB_PRICE_LIMIT, HTB_MIN_LTV } from '../ie-help-to-buy.ts';

export type { DutyRow };
export const CHECKED = '9 November 2026';
export type Edition = 'us' | 'gb' | 'ca' | 'au' | 'ie';

/** Marginal bands -> DutyRow (base = tax on everything below the band, exact amounts). */
export function fromMarginal(bands: readonly { from: number; rate: number }[]): DutyRow[] {
  const b = bands.map((x) => [x.from, x.rate] as [number, number]);
  return b.map(([from, rate]) => ({ from, base: marginal(from, b), at: from, step: 100, per: rate * 100, round: 'none' as const }));
}
const pct = (bands: readonly { from: number; to: number; rate: number }[]) => bands.map((x) => ({ from: x.from, rate: x.rate / 100 }));
const ca = (key: string) => LTT_BANDS[key].map(([from, rate]) => ({ from, rate }));

// ── Sources ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export const SOURCES = {
  sdlt: 'https://www.gov.uk/stamp-duty-land-tax/residential-property-rates',
  lbtt: 'https://revenue.scot/taxes/land-buildings-transaction-tax/residential-property',
  ltt: 'https://www.gov.wales/land-transaction-tax-rates-and-bands',
  lisa: 'https://www.gov.uk/lifetime-isa/withdrawing-money-from-your-lifetime-isa',
  boeLti: 'https://www.bankofengland.co.uk/prudential-regulation/publication/2026/october/high-loan-to-income-lending-policy-statement',
  hmlr: 'https://www.gov.uk/guidance/hm-land-registry-registration-services-fees',
  ctEngland: 'https://www.gov.uk/government/statistics/council-tax-levels-set-by-local-authorities-in-england-2026-to-2027/council-tax-levels-set-by-local-authorities-in-england-2026-to-2027',
  ctWales: 'https://www.gov.wales/council-tax-levels-april-2026-march-2027-html',
  ctScotland: 'https://www.gov.scot/publications/consultation-council-tax-high-value-property-bands-mansion-tax/pages/2/',
  cmhc: 'https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/mortgage-loan-insurance-homeownership-programs/premium-information-for-homeowner-and-small-rental-loans',
  cmhcNotice: 'https://www.cmhc-schl.gc.ca/media-newsroom/notices/2024/cmhc-revises-homeowner-mortgage-loan-insurance-premiums',
  fcacDown: 'https://www.canada.ca/en/financial-consumer-agency/services/mortgages/down-payment.html',
  osfi: 'https://www.osfi-bsif.gc.ca/en/supervision/financial-institutions/banks/minimum-qualifying-rate-uninsured-mortgages',
  gdsTds: 'https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/calculating-gds-tds',
  fhsa: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account/contributing-your-fhsa.html',
  hbp: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/what-home-buyers-plan.html',
  gstRebate: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/19-3-10/first-time-home-buyers-gst-hst-rebate.html',
  pstQc: 'https://www.revenuquebec.ca/en/press-room/tax-news/details/2026-04-09/harmonization-of-the-insurance-premiums-tax-rate-with-the-qst-rate/',
  pstSk: 'https://sets.saskatchewan.ca/rptp/wcm/connect/b9fd728b-b4fc-4a9e-a59e-c542fb87d6f1/PST.073+Insurance+Contracts.pdf',
  pstOn: 'https://www.ontario.ca/document/retail-sales-tax/insurance-and-benefits-plans',
  on: 'https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax',
  onFtb: 'https://www.ontario.ca/document/land-transfer-tax/land-transfer-tax-refunds-first-time-homebuyers',
  tor: 'https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees/',
  bc: 'https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/first-time-home-buyers/current-amount',
  ab: 'https://www.alberta.ca/system/files/sartr-land-titles-and-surveys-common-documents-fee-schedule.pdf',
  qc: 'https://www.quebec.ca/gouvernement/gestion-municipale/finances-fiscalite-municipales/fiscalite/droits-mutations-immobilieres',
  mtl: 'https://montreal.ca/articles/comment-sont-calcules-les-droits-sur-les-mutations-immobilieres-9279',
  qcFtb: 'https://www.quebec.ca/nouvelles/actualites/details/quebec-vient-en-aide-aux-acheteurs-dune-premiere-habitation-69816',
  mb: 'https://www.gov.mb.ca/finance/other/landtransfertax.html',
  nb: 'https://laws.gnb.ca/en/document/cs/R-2.1',
  ns: 'https://novascotia.ca/sns/pdf/ans-property-dtt-rates.pdf',
  pe: 'https://www.princeedwardisland.ca/sites/default/files/legislation/r-05-1-real_property_transfer_tax_act.pdf',
  sk: 'https://www.saskregistries.ca/hubfs/Land-Title-Fees-Table-04-2026.pdf',
  nl: 'https://www.gov.nl.ca/gs/files/forms-files-fees-deed.pdf',
  nsw: 'https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/understanding-transfer-duty/calculate-transfer-duty',
  nswFhb: 'https://www.revenue.nsw.gov.au/grants-schemes/assistance-scheme',
  vic: 'https://www.sro.vic.gov.au/rates-taxes-duties-and-levies/general-land-transfer-duty-property-current-rates',
  vicFhb: 'https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/concessions-exemptions-and-waivers/first-home-buyers/first-home-buyer-duty-exemption-or-concession',
  qld: 'https://qro.qld.gov.au/duties/transfer-duty/calculate/rates/',
  qldHome: 'https://qro.qld.gov.au/duties/transfer-duty/calculate/concession-rates/',
  qldNew: 'https://qro.qld.gov.au/duties/transfer-duty/concessions/homes/first-home-new-home/',
  wa: 'https://www.wa.gov.au/organisation/department-of-treasury-and-finance/transfer-duty-assessment',
  sa: 'https://www.revenuesa.sa.gov.au/stampduty/rate-of-stamp-duty',
  saFhb: 'https://www.revenuesa.sa.gov.au/stamp-duty-land/first-home-buyer-relief',
  tas: 'https://www.sro.tas.gov.au/property-transfer-duties/rates-of-duty',
  tasFhb: 'https://www.sro.tas.gov.au/property-transfer-duties/concessions-exemptions/first-home-buyers-of-established-homes-duty-relief',
  act: 'https://www.revenue.act.gov.au/rates-and-property-charges/conveyance-duty-stamp-duty/conveyance-duty-for-non-commercial-property',
  actHbcs: 'https://www.revenue.act.gov.au/home-buyer-assistance/home-buyer-concession-scheme/about-the-home-buyer-concession-scheme',
  nt: 'https://treasury.nt.gov.au/pms/tro/information/I-SD-002.pdf',
  ntHlp: 'https://nt.gov.au/property/home-owner-assistance/stamp-duty-exemption',
  fhogNsw: 'https://www.revenue.nsw.gov.au/grants-schemes/first-home-owner-new-homes-grant',
  fhogVic: 'https://www.sro.vic.gov.au/buying-property/first-home-owner-grant',
  fhogQld: 'https://qro.qld.gov.au/property-concessions-grants/first-home-grant/eligibility/',
  fhogWa: 'https://www.wa.gov.au/government/publications/about-the-first-home-owner-grant',
  fhogSa: 'https://www.revenuesa.sa.gov.au/FHOG/grant-details',
  fhogTas: 'https://www.sro.tas.gov.au/first-home-owner/eligibility',
  fhogAct: 'https://www.revenue.act.gov.au/home-buyer-assistance/first-home-owner-grant',
  fhogNt: 'https://treasury.nt.gov.au/dtf/territory-revenue-office/homegrown-territory-guide-grants',
  deposit5: 'https://firsthomebuyers.gov.au/australian-government-5-percent-deposit-scheme/property-price-caps',
  apra: 'https://www.apra.gov.au/news-and-publications/apra-maintains-current-macroprudential-policy-settings-highly-uncertain',
  apraDti: 'https://www.apra.gov.au/news-and-publications/activating-debt-income-limits-macroprudential-policy-tool',
  ieStamp: 'https://www.revenue.ie/en/property/stamp-duty/property/stamp-duty-property/rates.aspx',
  ieVat: 'https://www.revenue.ie/en/property/stamp-duty/consideration/vat-exclusive-consideration.aspx',
  htb: 'https://www.revenue.ie/en/property/help-to-buy-incentive/how-much-can-you-claim.aspx',
  htbWho: 'https://www.revenue.ie/en/property/help-to-buy-incentive/who-can-claim-htb.aspx',
  cbi: 'https://www.centralbank.ie/financial-system/financial-stability/macro-prudential-policy/mortgage-measures',
  lpt: 'https://www.revenue.ie/en/property/local-property-tax/valuing-your-property/valuation-bands-rates.aspx',
  tailte: 'https://tailte.ie/land-registration-schedule-of-fees-fees-order-2012/',
  taxFoundation: 'https://taxfoundation.org/data/all/state/property-taxes-by-state-county/',
  pmiCfpb: 'https://www.consumerfinance.gov/ask-cfpb/when-can-i-remove-private-mortgage-insurance-pmi-from-my-loan-en-202/',
  pmiFreddie: 'https://myhome.freddiemac.com/buying/breaking-down-pmi',
  fannieDti: 'https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios',
  cfpbDti: 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/',
  cfpbFtb: 'https://www.consumerfinance.gov/ask-cfpb/where-can-i-find-information-on-programs-for-first-time-home-buyers-en-2156/',
} as const;

// ── United States ────────────────────────────────────────────────────────────────────────────────────────────────────
/** Tax Foundation, Property Taxes by State and County, 2026 (2024 ACS, owner-occupied housing): effective rate, %. */
export const US_STATES: [code: string, name: string, rate: number][] = [
  ['AL', 'Alabama', 0.37], ['AK', 'Alaska', 0.94], ['AZ', 'Arizona', 0.48], ['AR', 'Arkansas', 0.56], ['CA', 'California', 0.70],
  ['CO', 'Colorado', 0.50], ['CT', 'Connecticut', 1.54], ['DE', 'Delaware', 0.54], ['DC', 'District of Columbia', 0.60], ['FL', 'Florida', 0.78],
  ['GA', 'Georgia', 0.79], ['HI', 'Hawaii', 0.29], ['ID', 'Idaho', 0.495], ['IL', 'Illinois', 1.88], ['IN', 'Indiana', 0.76],
  ['IA', 'Iowa', 1.33], ['KS', 'Kansas', 1.21], ['KY', 'Kentucky', 0.74], ['LA', 'Louisiana', 0.55], ['ME', 'Maine', 0.98],
  ['MD', 'Maryland', 0.92], ['MA', 'Massachusetts', 1.00], ['MI', 'Michigan', 1.19], ['MN', 'Minnesota', 1.00], ['MS', 'Mississippi', 0.58],
  ['MO', 'Missouri', 0.89], ['MT', 'Montana', 0.61], ['NE', 'Nebraska', 1.44], ['NV', 'Nevada', 0.50], ['NH', 'New Hampshire', 1.50],
  ['NJ', 'New Jersey', 1.88], ['NM', 'New Mexico', 0.63], ['NY', 'New York', 1.30], ['NC', 'North Carolina', 0.66], ['ND', 'North Dakota', 0.92],
  ['OH', 'Ohio', 1.36], ['OK', 'Oklahoma', 0.79], ['OR', 'Oregon', 0.81], ['PA', 'Pennsylvania', 1.26], ['RI', 'Rhode Island', 1.12],
  ['SC', 'South Carolina', 0.49], ['SD', 'South Dakota', 1.00], ['TN', 'Tennessee', 0.52], ['TX', 'Texas', 1.40], ['UT', 'Utah', 0.48],
  ['VT', 'Vermont', 1.51], ['VA', 'Virginia', 0.78], ['WA', 'Washington', 0.75], ['WV', 'West Virginia', 0.51], ['WI', 'Wisconsin', 1.32],
  ['WY', 'Wyoming', 0.53],
];
export const US = {
  pmiStop: 0.78,        // PMI ends automatically when the balance is scheduled to reach 78% of the original value (CFPB, HPA)
  pmiDefault: 0.6,      // % of the loan a year: Freddie Mac "$30 to $70 a month per $100,000 borrowed" midpoint (estimate)
  front: 0.28, back: 0.36,  // rule of thumb (no CFPB rule): housing 28%, all debts 36% of gross income
  fannieManual: 0.36, fannieMax: 0.45, fannieDu: 0.50,
};

// ── United Kingdom ───────────────────────────────────────────────────────────────────────────────────────────────────
export const GB_NATIONS = ['England', 'Northern Ireland', 'Scotland', 'Wales'] as const;
export const GB = {
  sdltFtbMax: 500000,
  lisaAnnual: 4000, lisaBonus: 0.25, lisaPriceCap: 450000, lisaChargeOverCap: 0.20,
  lti: 4.5,
  /** Average Band D council tax 2026-27 (defaults; your own bill replaces it). NI has domestic rates: our estimate. */
  councilTax: { England: 2392, 'Northern Ireland': 1500, Scotland: 1653, Wales: 2283 } as Record<string, number>,
};
/** HM Land Registry Scale 1, electronic application, whole title (fees from 9 Dec 2024): England and Wales. */
export const HMLR: DutyRow[] = [[0, 20], [80001, 40], [100001, 100], [200001, 150], [500001, 295], [1000001, 500]]
  .map(([from, base]) => ({ from, base, at: 0, step: 1, per: 0, round: 'none' as const }));

// ── Canada ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export const CA_PROVINCES = Object.keys(PROVINCE_NAMES) as Province[];
/** CMHC premium on the total loan by loan-to-value (purchase): [LTV up to, premium]. */
export const CMHC: [number, number][] = [[0.65, 0.006], [0.75, 0.017], [0.80, 0.024], [0.85, 0.028], [0.90, 0.031], [0.95, 0.04]];
export const CA = {
  surcharge30: 0.002,   // amortization over 25 years (CMHC notice, 1 Aug 2024)
  insuredMax: 1500000,  // price must be LESS than this
  minFirst: 500000, minRate1: 0.05, minRate2: 0.10, minUninsured: 0.20,
  pst: { ON: 0.08, 'ON-TOR': 0.08, QC: 0.09975, 'QC-MTL': 0.09975, SK: 0.06 } as Record<string, number>,
  mqrFloor: 5.25, mqrBuffer: 2, gds: 0.39, tds: 0.44, condoShare: 0.5,
  fhsaAnnual: 8000, fhsaLifetime: 40000, hbp: 60000,
  gstRate: 0.05, gstMax: 50000, gstFull: 1000000, gstEnd: 1500000,
  bcFtbMax: Math.round(marginal(BC_FTB.exemptOn, LTT_BANDS.BC.map(([f, r]) => [f, r] as [number, number]))),
};
export { BC_FTB, ON_FTB_REFUND, TOR_FTB_REBATE, QC_FTB, PE_MIN, PROVINCE_NAMES };

// ── Australia ────────────────────────────────────────────────────────────────────────────────────────────────────────
export const AU_STATES: AuState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
export const AU_NAMES: Record<AuState, string> = { NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland', WA: 'Western Australia', SA: 'South Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory' };
/** First Home Owner Grant (new homes only): [amount, value cap (0 = none)]. */
export const FHOG: Record<AuState, [number, number]> = {
  NSW: [10000, 600000], VIC: [10000, 750000], QLD: [30000, 749999], WA: [10000, 800000], SA: [15000, 0], TAS: [20000, 0], ACT: [0, 0], NT: [50000, 0],
};
/** 5% Deposit Scheme price caps: [capital city and regional centres, rest of state]. */
export const DEPOSIT5: Record<AuState, [number, number]> = {
  NSW: [1500000, 800000], VIC: [950000, 650000], QLD: [1000000, 700000], WA: [850000, 600000], SA: [900000, 500000], TAS: [700000, 550000], ACT: [1000000, 1000000], NT: [750000, 600000],
};
export const AU = { buffer: 3, dti: 6, deposit5: 0.05, lmiDefault: 2.0, stress: 0.30, nswFhb: FHB_EXEMPT.NSW!, vicFhb: FHB_EXEMPT.VIC! };

// ── Ireland ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export const IE = {
  vat: 0.135, htbCap: HTB_CAP, htbRate: HTB_RATE, htbPrice: HTB_PRICE_LIMIT, htbLtv: HTB_MIN_LTV,
  ltiFirst: 4, ltiSecond: 3.5, ltv: 0.9,
};
export const IE_STAMP: DutyRow[] = fromMarginal([{ from: 0, rate: 0.01 }, { from: 1000000, rate: 0.02 }, { from: 1500000, rate: 0.06 }]);
/** Tailte Éireann Land Registry, transfer on sale (Fees Order 2012); a mortgage lodged with it pays no extra fee. */
export const IE_REGISTRY: DutyRow[] = [[0, 400], [50001, 600], [200001, 700], [400001, 800]].map(([from, base]) => ({ from, base, at: 0, step: 1, per: 0, round: 'none' as const }));
/** Local Property Tax 2026-2030 (valuation 1 Nov 2025): basic charge by band; above €2.1m 0.0906% to €1.26m + 0.25% to €2.1m + 0.3% above. */
export const LPT: DutyRow[] = [
  ...[[0, 95], [240001, 235], [315001, 333], [420001, 428], [525001, 523], [630001, 618], [735001, 713], [840001, 808], [945001, 903], [1050001, 998],
    [1155001, 1094], [1260001, 1272], [1365001, 1535], [1470001, 1797], [1575001, 2060], [1680001, 2322], [1785001, 2585], [1890001, 2847], [1995001, 3110]]
    .map(([from, base]) => ({ from, base, at: 0, step: 1, per: 0, round: 'none' as const })),
  { from: 2100001, base: 1260000 * 0.000906 + 840000 * 0.0025, at: 2100000, step: 100, per: 0.3, round: 'none' },
];

// ── Every purchase-tax schedule the spreadsheet evaluates (its Rules tab table) ──────────────────────────────────────
export const DUTY: Record<Edition, Record<string, DutyRow[]>> = {
  us: {},
  gb: {
    SDLT: fromMarginal(pct(SDLT_STD)), 'SDLT-FTB': fromMarginal(pct(SDLT_FTB)),
    LBTT: fromMarginal(pct(LBTT_STD)), 'LBTT-FTB': fromMarginal(pct(LBTT_FTB)), LTT: fromMarginal(pct(LTT_MAIN)), HMLR,
  },
  ca: {
    ON: fromMarginal(ca('ON')), TOR: fromMarginal(ca('TOR')), BC: fromMarginal(ca('BC')), QC: fromMarginal(ca('QC')), 'QC-MTL': fromMarginal(ca('QC-MTL')),
    MB: fromMarginal(ca('MB')), NB: fromMarginal(ca('NB')), 'NS-HFX': fromMarginal(ca('NS-HFX')),
    PE: [{ from: 0, base: 0, at: 0, step: 100, per: 0, round: 'none' }, { from: PE_MIN + 1, base: 0, at: 0, step: 100, per: 1, round: 'none' }],
    AB: [{ from: 0, base: 50, at: 0, step: 5000, per: 5, round: 'up' }],
    SK: [{ from: 0, base: 0, at: 0, step: 1, per: 0, round: 'none' }, { from: 501, base: 25, at: 0, step: 1, per: 0, round: 'none' }, { from: 6301, base: 0, at: 0, step: 100, per: 0.4, round: 'none' }],
    NL: [{ from: 0, base: 100, at: 0, step: 1, per: 0, round: 'none' }, { from: 501, base: 100, at: 500, step: 100, per: 0.4, round: 'up' }],
  },
  au: Object.fromEntries(Object.entries(AU_DUTY).map(([k, v]) => [k, [...v]])),
  ie: { STAMP: IE_STAMP, REGISTRY: IE_REGISTRY, LPT },
};

/** What each row of the Rules tab says about a schedule: name and source. */
export const DUTY_INFO: Record<string, [string, string]> = {
  SDLT: ['Stamp Duty Land Tax, England and Northern Ireland', SOURCES.sdlt],
  'SDLT-FTB': ['Stamp Duty Land Tax, first-time buyers (price up to £500,000)', SOURCES.sdlt],
  LBTT: ['Land and Buildings Transaction Tax, Scotland', SOURCES.lbtt],
  'LBTT-FTB': ['LBTT with first-time buyer relief (nil band £175,000)', SOURCES.lbtt],
  LTT: ['Land Transaction Tax, Wales (no first-time buyer relief)', SOURCES.ltt],
  HMLR: ['HM Land Registry fee, England and Wales (electronic, whole title)', SOURCES.hmlr],
  ON: ['Ontario land transfer tax', SOURCES.on], TOR: ['Toronto municipal land transfer tax (luxury rates from 1 April 2026)', SOURCES.tor],
  BC: ['BC property transfer tax', SOURCES.bc], QC: ['Quebec welcome tax (general schedule, 2026)', SOURCES.qc], 'QC-MTL': ['Montreal welcome tax (2026)', SOURCES.mtl],
  MB: ['Manitoba land transfer tax', SOURCES.mb], NB: ['New Brunswick real property transfer tax (1%)', SOURCES.nb], 'NS-HFX': ['Halifax deed transfer tax (1.5%)', SOURCES.ns],
  PE: ['PEI real property transfer tax (1%, none at $30,000 or less)', SOURCES.pe], AB: ['Alberta Land Titles transfer fee ($50 + $5 per $5,000 or part)', SOURCES.ab],
  SK: ['Saskatchewan title transfer fee', SOURCES.sk], NL: ['Newfoundland and Labrador registration fee', SOURCES.nl],
  NSW: ['NSW transfer duty (2026/27)', SOURCES.nsw], VIC: ['Victoria land transfer duty', SOURCES.vic], QLD: ['Queensland transfer duty, general rate', SOURCES.qld],
  'QLD-home': ['Queensland home concession rate (you live in the home)', SOURCES.qldHome], 'QLD-first': ['Queensland first home concession: amount taken off the home-concession duty', SOURCES.qldHome],
  WA: ['WA transfer duty, general rate', SOURCES.wa], 'WA-first': ['WA first home owner rate (from 7 May 2026)', SOURCES.wa],
  SA: ['South Australia stamp duty', SOURCES.sa], TAS: ['Tasmania transfer duty', SOURCES.tas], ACT: ['ACT conveyance duty, owner-occupier', SOURCES.act], NT: ['Northern Territory stamp duty', SOURCES.nt],
  STAMP: ['Stamp duty on residential property', SOURCES.ieStamp], REGISTRY: ['Land Registry fee, transfer on sale', SOURCES.tailte], LPT: ['Local Property Tax 2026-2030, basic charge by valuation band', SOURCES.lpt],
};
