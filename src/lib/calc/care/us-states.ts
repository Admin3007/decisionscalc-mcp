/**
 * Nursing-home Medicaid figures by state, 2026. Every figure comes from decisionscalc-apps
 * radar/decisionscalc/CARE-COSTS-FACTS-2026-11.md (researched 9 Nov 2026) and carries its confidence:
 *  - 'O': read on the official state page or PDF.
 *  - 'O-search': the URL is official but the figure was seen only in a search snippet (state site blocked):
 *    used, with a visible "check with your state" note.
 * Figures that were secondary-only, missing, stale with a conflict, or unclear are left out (null): the person
 * enters their state's figure (the calculator and the planner both say so and link the agency).
 * Not used: Genworth/CareScout cost data (copyright). The penalty divisor is, by statute (42 U.S.C. 1396p(c)(1)(E)(i)),
 * the state's average monthly private-pay nursing facility cost, so it doubles as the default nursing home cost.
 */
export type Conf = 'O' | 'O-search';
export interface Fig { v: number; conf: Conf; note?: string }
/** cap = 300% special income level (a Qualified Income Trust above it); mn = medically needy spend-down, no cap; cap+mn = both routes. */
export type IncomeRule = 'cap' | 'mn' | 'cap+mn';
/** half = half the couple's countable assets, between the state minimum and the federal maximum; max = the federal maximum; min = the federal minimum. */
export type CsraMethod = 'half' | 'max' | 'min';
export interface StateCare {
  code: string;
  name: string;
  asset: Fig | null;
  income: { rule: IncomeRule; cap: number; conf: Conf } | null;
  csra: { method: CsraMethod; stateMin?: number; conf: Conf } | null;
  /** Transfer penalty divisor as the state publishes it (monthly or daily) and when it took effect. */
  divisor: { v: number; unit: 'month' | 'day'; eff: string; conf: Conf; note?: string } | null;
  equity: Fig | null;
  pna: Fig | null;
  /** The state gives every community spouse the maximum MMMNA ($4,066.50). */
  mmmnaMax?: boolean;
  source: string;
  note?: string;
}

const CAP = 2982;
const S = (code: string, name: string, o: Partial<StateCare> & { source: string }): StateCare =>
  ({ code, name, asset: null, income: null, csra: null, divisor: null, equity: null, pna: null, ...o });
const O = (v: number, note?: string): Fig => ({ v, conf: 'O', ...(note ? { note } : {}) });
const OS = (v: number, note?: string): Fig => ({ v, conf: 'O-search', ...(note ? { note } : {}) });

export const US_CARE_STATES: StateCare[] = [
  S('AL', 'Alabama', { asset: O(2000), income: { rule: 'cap', cap: CAP, conf: 'O-search' }, source: 'https://medicaid.alabama.gov/content/3.0_Apply/3.2_Qualifying/3.2.4_Medicaid_Nursing_Home.aspx' }),
  S('AK', 'Alaska', { asset: O(2000), income: { rule: 'cap', cap: CAP, conf: 'O' }, csra: { method: 'max', conf: 'O' }, equity: O(752000), pna: O(200), mmmnaMax: true,
    source: 'http://dpaweb.hss.state.ak.us/manuals/adltc/addenda/addendum_1.htm', note: 'Alaska has no single penalty divisor: it uses the average private-pay cost in your community.' }),
  S('AZ', 'Arizona', { asset: OS(2000), income: { rule: 'cap', cap: CAP, conf: 'O-search' }, csra: { method: 'half', conf: 'O-search' },
    divisor: { v: 8666.72, unit: 'month', eff: '2025-10-01', conf: 'O-search', note: 'Maricopa, Pima and Pinal; $8,132.22 in other counties. Published to 30 Sep 2026: a newer rate may apply.' },
    pna: OS(149.1, '15% of the SSI rate'), source: 'https://www.azahcccs.gov/Members/Downloads/Publications/DE-817_english.pdf' }),
  S('AR', 'Arkansas', { asset: O(2000), income: { rule: 'cap', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' }, divisor: { v: 9110, unit: 'month', eff: '2026-04-01', conf: 'O' },
    equity: O(752000), pna: O(40), source: 'https://humanservices.arkansas.gov/wp-content/uploads/Medical-Quick-Reference-Chart-2026-Final-without-BHSS.pdf' }),
  S('CA', 'California', { asset: OS(130000, '$130,000 per person from 1 Jan 2026 (+$65,000 per extra household member)'), csra: { method: 'max', conf: 'O-search' },
    divisor: { v: 14440, unit: 'month', eff: '2026-01-01', conf: 'O-search' }, mmmnaMax: true,
    source: 'https://www.dhcs.ca.gov/wp-content/uploads/2026/04/26-03.pdf', note: 'California looks back 30 months, not 60, and months before January 2026 are not reviewed (ACWDL 25-18). A lower asset limit is proposed from 2027.' }),
  S('CO', 'Colorado', { asset: OS(2000), income: { rule: 'cap', cap: CAP, conf: 'O' }, csra: { method: 'max', conf: 'O' }, divisor: { v: 10814, unit: 'month', eff: '2026-01-01', conf: 'O' },
    equity: O(1130000), pna: O(110.36), source: 'https://hcpf.colorado.gov/sites/hcpf/files/HCPF%20OM%2025-073%202026%20Social%20Security%20Cost%20of%20Living%20Adjustments.pdf' }),
  S('CT', 'Connecticut', { asset: O(1600), csra: { method: 'half', conf: 'O' }, equity: O(1130000), pna: O(75),
    source: 'https://portal.ct.gov/OPM/PDPD-HHS-Long-Term-Care/Consumer/Partnership-Consumer-Government-Programs', note: 'No official 2026 penalty divisor was found: enter it from the Department of Social Services.' }),
  S('DE', 'Delaware', { asset: O(2000), income: { rule: 'cap', cap: 2485, conf: 'O' }, csra: { method: 'half', conf: 'O' }, pna: O(75),
    source: 'https://dhss.delaware.gov/dss/ltcfinancialeligibility/', note: 'Delaware’s income limit is 250% of the SSI rate.' }),
  S('DC', 'District of Columbia', { asset: O(4000), income: { rule: 'cap+mn', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O-search' }, pna: OS(109), mmmnaMax: true,
    source: 'https://dhcf.dc.gov/service/long-term-care-ltc' }),
  S('FL', 'Florida', { asset: O(2000), income: { rule: 'cap', cap: CAP, conf: 'O' }, csra: { method: 'max', conf: 'O' }, divisor: { v: 10645, unit: 'month', eff: '2025-04-01', conf: 'O' },
    equity: O(752000), pna: O(160), source: 'https://ffic.myflfamilies.com/manual/essfiles/30451.pdf' }),
  S('GA', 'Georgia', { asset: O(2000), income: { rule: 'cap', cap: CAP, conf: 'O' }, csra: { method: 'max', conf: 'O' }, divisor: { v: 11122, unit: 'month', eff: '2026-04-01', conf: 'O' },
    equity: O(752000), pna: O(70), mmmnaMax: true, source: 'https://pamms.dhs.ga.gov/dfcs/medicaid/appendix-a1/2026-abd-limits/' }),
  S('HI', 'Hawaii', { asset: OS(2000), income: { rule: 'mn', cap: CAP, conf: 'O-search' }, pna: OS(50), source: 'https://medquest.hawaii.gov/content/medquest/en/faq.html' }),
  S('ID', 'Idaho', { asset: O(2000), income: { rule: 'cap', cap: 3002, conf: 'O' }, csra: { method: 'half', conf: 'O' },
    source: 'https://healthandwelfare.idaho.gov/medicaid-program-income-limits', note: 'Idaho lists $3,002 for long-term facility care (300% of SSI plus the $20 disregard).' }),
  S('IL', 'Illinois', { source: 'https://hfs.illinois.gov/' }),
  S('IN', 'Indiana', { source: 'https://www.in.gov/medicaid/' }),
  S('IA', 'Iowa', { source: 'https://hhs.iowa.gov/' }),
  S('KS', 'Kansas', { source: 'https://www.kancare.ks.gov/' }),
  S('KY', 'Kentucky', { asset: O(2000), income: { rule: 'cap', cap: CAP, conf: 'O-search' }, csra: { method: 'half', conf: 'O' }, equity: O(752000), pna: O(60),
    source: 'https://apps.legislature.ky.gov/law/kar/titles/907/020/035/' }),
  S('LA', 'Louisiana', { asset: OS(2000), income: { rule: 'cap+mn', cap: CAP, conf: 'O-search' }, csra: { method: 'max', conf: 'O' },
    divisor: { v: 7200, unit: 'month', eff: '2024-09-01', conf: 'O-search', note: 'Latest seen; may have been updated.' }, equity: OS(752000), source: 'https://ldh.la.gov/assets/medicaid/MedicaidEligibilityPolicy/Z-800.pdf' }),
  S('ME', 'Maine', { asset: O(2000, 'Up to $8,000 in savings is also excluded'), income: { rule: 'cap', cap: CAP, conf: 'O' }, csra: { method: 'max', conf: 'O' },
    divisor: { v: 13339, unit: 'month', eff: '2026-06-01', conf: 'O' }, pna: O(40), source: 'https://www.maine.gov/dhhs/sites/maine.gov.dhhs/files/inline-files/2026%20MaineCare%20Eligibility%20Guidelines%206.23..26_1.pdf' }),
  S('MD', 'Maryland', { asset: O(2500, 'Medically needy resource standard'), income: { rule: 'mn', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' },
    divisor: { v: 12501, unit: 'month', eff: '2025-07-01', conf: 'O' }, equity: O(752000), pna: O(106), source: 'https://health.maryland.gov/mmcp/Medicaid%20Manual/Appendix%20schedules%202026%20Eff%201_1_2026%20updates.docx.pdf' }),
  S('MA', 'Massachusetts', { asset: O(2000), income: { rule: 'mn', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' }, divisor: { v: 469, unit: 'day', eff: '2026-11-01', conf: 'O' },
    equity: O(1130000), pna: O(72.8), source: 'https://www.mass.gov/info-details/program-financial-guidelines-for-certain-masshealth-applicants-and-members' }),
  S('MI', 'Michigan', { asset: O(9950), income: { rule: 'mn', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' }, divisor: { v: 12216, unit: 'month', eff: '2026-01-01', conf: 'O' },
    equity: O(752000), pna: O(60), source: 'https://mdhhs-pres-prod.michigan.gov/olmweb/ex/BP/Public/BEM/400.pdf' }),
  S('MN', 'Minnesota', { asset: OS(3000), income: { rule: 'mn', cap: CAP, conf: 'O-search' }, divisor: { v: 11869, unit: 'month', eff: '2026-07-01', conf: 'O' },
    equity: O(752000), pna: O(132), source: 'https://hcopub.dhs.state.mn.us/epm/appendix_f.htm' }),
  S('MS', 'Mississippi', { asset: OS(4000), income: { rule: 'cap', cap: CAP, conf: 'O-search' }, csra: { method: 'max', conf: 'O-search' }, equity: OS(752000), pna: OS(44),
    source: 'https://medicaid.ms.gov/wp-content/uploads/2025/12/LTC-ABD-Nursing-Home.January-2026.pdf' }),
  S('MO', 'Missouri', { csra: { method: 'half', conf: 'O-search' }, source: 'https://dssmanuals.mo.gov/wp-content/uploads/2022/07/mhabd-appendix-j.pdf',
    note: 'Missouri’s published 2026 asset figure ($6,220.50) and divisor could not be confirmed: enter them.' }),
  S('MT', 'Montana', { asset: O(2000), income: { rule: 'mn', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' },
    divisor: { v: 9315.71, unit: 'month', eff: '2024-07-01', conf: 'O', note: 'Not updated since July 2024 in the current manual.' }, pna: OS(50), source: 'https://dphhs.mt.gov/assets/hcsd/fmamanual/CMA404.2.pdf' }),
  S('NE', 'Nebraska', { asset: O(4000), csra: { method: 'half', conf: 'O' }, pna: O(75), source: 'https://dhhs.ne.gov/Guidance%20Docs/Medicaid%20Income%20Levels,%20Federal%20Poverty%20Levels,%20and%20Resources.pdf' }),
  S('NV', 'Nevada', { asset: OS(2000), income: { rule: 'cap', cap: CAP, conf: 'O' }, csra: { method: 'min', conf: 'O-search' },
    divisor: { v: 9949.26, unit: 'month', eff: '2024-04-01', conf: 'O-search' }, pna: O(154), source: 'https://dss.nv.gov/siteassets/dwss.nv.gov/content/medical/Appendix_C_MAABD_INCOME_CHART.pdf' }),
  S('NH', 'New Hampshire', { income: { rule: 'cap+mn', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' }, divisor: { v: 12892.6, unit: 'month', eff: '2026-01-01', conf: 'O-search' },
    equity: O(752000), pna: OS(93), source: 'https://www.dhhs.nh.gov/programs-services/adult-aging-care/nursing-home-care', note: 'New Hampshire’s pages give $2,500 and $7,500 as the nursing facility asset limit: enter the one your caseworker uses.' }),
  S('NJ', 'New Jersey', { income: { rule: 'cap', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' }, divisor: { v: 420.67, unit: 'day', eff: '2026-04-01', conf: 'O' }, pna: OS(50),
    source: 'https://www.nj.gov/humanservices/dmahs/documents/providers-stakeholders/resources/medicaid/2026/26-04_Increase_in_the_Penalty_Divisor-Effective_April-1-2026.pdf' }),
  S('NM', 'New Mexico', { asset: OS(2000), income: { rule: 'cap', cap: CAP, conf: 'O-search' }, pna: OS(100), source: 'https://www.hca.nm.gov/wp-content/uploads/Eligibility-Pamphlet-7.1.2026.pdf' }),
  S('NY', 'New York', { asset: O(33038), income: { rule: 'mn', cap: CAP, conf: 'O' }, csra: { method: 'half', stateMin: 74820, conf: 'O' },
    divisor: { v: 15282, unit: 'month', eff: '2026-01-01', conf: 'O', note: 'New York City. Other regions: Long Island $15,193, Northern Metro $15,024, Northeastern $14,783, Rochester $15,675, Central $14,146, Western $13,765.' },
    equity: O(1130000), pna: O(50), source: 'https://www.health.ny.gov/health_care/medicaid/publications/docs/gis/26ma05.pdf' }),
  S('NC', 'North Carolina', { asset: O(2000), income: { rule: 'mn', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' }, divisor: { v: 11904, unit: 'month', eff: '2025-01-01', conf: 'O' },
    pna: O(70), source: 'https://policies.ncdhhs.gov/wp-content/uploads/MA-2240-Transfer-of-Assets-3.pdf' }),
  S('ND', 'North Dakota', { asset: O(3000), income: { rule: 'mn', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' }, equity: O(752000), pna: O(118),
    source: 'https://www.nd.gov/dhs/policymanuals/51005/510_05_70_15.htm' }),
  S('OH', 'Ohio', { income: { rule: 'cap', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' },
    divisor: { v: 7787, unit: 'month', eff: '2024-09-01', conf: 'O', note: 'Latest official figure; Ohio updates it every two years, so a 2026 figure may exist.' }, equity: O(752000),
    source: 'https://dam.assets.ohio.gov/image/upload/medicaid.ohio.gov/About%20Us/PoliciesGuidelines/MEPL/MEPL_191_-_2026_COLA.pdf' }),
  S('OK', 'Oklahoma', { source: 'https://oklahoma.gov/ohca/individuals/programs/long-term-services-and-supports/applying-for-help-with-long-term-care-expenses.html' }),
  S('OR', 'Oregon', { csra: { method: 'half', conf: 'O' }, equity: O(752000), source: 'https://www.oregon.gov/odhs/transmittals/APDTransmittals/im26009.pdf' }),
  S('PA', 'Pennsylvania', { asset: O(8000, '$2,000 plus a $6,000 disregard when income is at or below $2,982; $2,400 if medically needy'), income: { rule: 'cap+mn', cap: CAP, conf: 'O' },
    csra: { method: 'half', conf: 'O' }, divisor: { v: 12811.5, unit: 'month', eff: '2026-01-01', conf: 'O' }, equity: O(752000), pna: O(60),
    source: 'http://services.dpw.state.pa.us/oimpolicymanuals/ltc/468_Eligibility_and_Payment/468_Appendix_A.htm' }),
  S('RI', 'Rhode Island', { asset: O(4000), income: { rule: 'cap+mn', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' }, divisor: { v: 12106, unit: 'month', eff: '2026-04-01', conf: 'O' },
    equity: OS(752000), pna: O(75), source: 'https://rules.sos.ri.gov/regulations/part/210-50-00-6' }),
  S('SC', 'South Carolina', { source: 'https://www.scdhhs.gov/' }),
  S('SD', 'South Dakota', { asset: O(2000), income: { rule: 'cap', cap: CAP, conf: 'O' }, pna: O(100), source: 'https://sdlegislature.gov/Rules/Administrative/67:46:05' }),
  S('TN', 'Tennessee', { source: 'https://www.tn.gov/tenncare.html' }),
  S('TX', 'Texas', { asset: O(2000), income: { rule: 'cap', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' }, divisor: { v: 262.37, unit: 'day', eff: '2025-09-01', conf: 'O' },
    equity: O(752000), pna: O(75), mmmnaMax: true, source: 'https://fhb.hhs.texas.gov/handbooks/medicaid-elderly-people-disabilities-handbook/appendix-xxxi-budget-reference-chart' }),
  S('UT', 'Utah', { source: 'https://medicaid.utah.gov/' }),
  S('VT', 'Vermont', { source: 'https://dvha.vermont.gov/' }),
  S('VA', 'Virginia', { asset: O(2000), income: { rule: 'cap+mn', cap: CAP, conf: 'O' }, csra: { method: 'half', conf: 'O' },
    divisor: { v: 7324, unit: 'month', eff: '2025-01-01', conf: 'O', note: 'All localities except Northern Virginia, which uses $9,703.' }, equity: O(752000), pna: O(40),
    source: 'https://www.dmas.virginia.gov/media/hksogjdf/chapter-m14-long-term-care.pdf' }),
  S('WA', 'Washington', { asset: O(2000), income: { rule: 'cap', cap: CAP, conf: 'O' }, csra: { method: 'half', stateMin: 72529, conf: 'O' }, divisor: { v: 14059, unit: 'month', eff: '2025-10-01', conf: 'O' },
    equity: O(1130000), pna: O(108.74), source: 'https://www.hca.wa.gov/assets/free-or-low-cost/income-standards-20260701.pdf' }),
  S('WV', 'West Virginia', { source: 'https://dhhr.wv.gov/bms/' }),
  S('WI', 'Wisconsin', { income: { rule: 'cap', cap: CAP, conf: 'O-search' }, divisor: { v: 352.06, unit: 'day', eff: '2025-01-01', conf: 'O', note: 'Wisconsin DHS divestment page: the current rate took effect 1 January 2025.' },
    equity: OS(752000), pna: OS(55), source: 'https://www.emhandbooks.wisconsin.gov/meh-ebd/policy_files/17/17.3.htm' }),
  S('WY', 'Wyoming', { source: 'https://health.wyo.gov/healthcarefin/medicaid/' }),
];

export const stateByCode = (code: string): StateCare => US_CARE_STATES.find((s) => s.code === code) ?? US_CARE_STATES.find((s) => s.code === 'FL')!;

/** Days in an average month, to turn a daily divisor (NJ, MA, TX, WI) into a monthly one. */
export const DAYS_PER_MONTH = 365 / 12;
export const monthlyDivisor = (s: StateCare): number | null => (s.divisor ? (s.divisor.unit === 'day' ? s.divisor.v * DAYS_PER_MONTH : s.divisor.v) : null);
