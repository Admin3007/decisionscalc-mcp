/**
 * US state income tax on wages, single filer, no dependants, tax year 2026 (overhaul C9 remainder). Read 8 Nov 2026
 * from each state's revenue department (sources in STATE_TAX_SOURCES). An estimate for comparing job offers: wages
 * only, the standard deduction / personal exemption a single filer gets, no credits beyond those, no local income
 * taxes (flagged per state), no payroll taxes such as California SDI.
 *  - CA: FTB "2026 Indexing" (Tax News Oct 2026): brackets, $5,900 standard deduction, $158 exemption credit. The
 *    credit phases out at high AGI (2026 threshold not yet published; not modelled). 1% Behavioral Health Services
 *    Tax above $1,000,000 taxable.
 *  - NY: IT-2105-I (2026) rate schedule, $8,000 standard deduction. Above NYAGI $107,650 the lower-bracket benefit is
 *    recaptured (worksheet 7: the whole taxable income at 5.90% once NYAGI reaches $157,650, phased in over $50,000);
 *    taxable income above $215,400 uses further worksheets that are not modelled (result flagged `partial`).
 *  - NJ: Table A (2020 and after): rate x income minus subtraction; $1,000 exemption; no tax at $10,000 or less.
 *  - VA: 2026 Form 760ES brackets; $8,750 standard deduction; $930 exemption.
 *  - Flat: PA 3.07% (no deduction); IL 4.95% (exemption $2,925, none above $250,000 AGI); MI 4.25% ($5,900 exemption);
 *    MA 5% ($4,400 exemption; 4% surtax above $1,107,750); NC 3.99% ($12,750 standard deduction, the 2025 amount);
 *    GA 4.99% ($15,000 standard deduction); AZ 2.5% ($15,750 standard deduction, the 2025 amount); CO 4.4% of federal
 *    taxable income (federal standard deduction $16,100 for 2026; the high-income addback is not modelled).
 *  - No tax on wages: TX, FL, TN, NV, WA (WA taxes only long-term capital gains).
 *  - OH: Ohio has not published 2026 rates (tax.ohio.gov "Annual Tax Rates" lists 2005-2025 when read 8 Nov 2026), so the
 *    2025 schedule is used and flagged: 0% to $26,050; $342 + 2.75% over $26,050; $2,394.32 + 3.125% over $100,000;
 *    exemption by MAGI ($2,400 to $40,000, $2,150 to $80,000, $1,900 to $749,999, none above); $20 exemption credit when
 *    MAGI less exemptions is under $30,000. 2025 IT 1040 booklet example (Mitchell, $68,050 taxable): $1,497.
 * Not modelled: the other states.
 */
export type StateCode = 'OH' | 'CA' | 'NY' | 'NJ' | 'VA' | 'PA' | 'IL' | 'MI' | 'MA' | 'NC' | 'GA' | 'AZ' | 'CO' | 'TX' | 'FL' | 'TN' | 'NV' | 'WA';

export const STATE_NAMES: Record<StateCode, string> = {
  AZ: 'Arizona', CA: 'California', CO: 'Colorado', FL: 'Florida', GA: 'Georgia', IL: 'Illinois', MA: 'Massachusetts',
  MI: 'Michigan', NV: 'Nevada', NJ: 'New Jersey', OH: 'Ohio', NY: 'New York', NC: 'North Carolina', PA: 'Pennsylvania',
  TN: 'Tennessee', TX: 'Texas', VA: 'Virginia', WA: 'Washington',
};

export const STATE_TAX_SOURCES: Record<StateCode, string> = {
  OH: 'https://tax.ohio.gov/individual/resources/annual-tax-rates',
  CA: 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2026/10.html',
  NY: 'https://www.tax.ny.gov/pdf/2026/inc/it2105i_2026.pdf',
  NJ: 'https://www.nj.gov/treasury/taxation/pdf/current/njtaxratesch.pdf',
  VA: 'https://www.tax.virginia.gov/sites/default/files/taxforms/individual-income-tax/2026/760es-2026.pdf',
  PA: 'https://www.pa.gov/agencies/revenue/resources/tax-rates/personal-income-tax-rates',
  IL: 'https://tax.illinois.gov/research/publications/bulletins/fy-2026-15.html',
  MI: 'https://www.michigan.gov/treasury',
  MA: 'https://www.mass.gov/info-details/massachusetts-tax-rates',
  NC: 'https://www.ncdor.gov/taxes-forms/individual-income-tax',
  GA: 'https://dor.georgia.gov/important-tax-updates',
  AZ: 'https://azdor.gov/forms/individual/form-140es-individual-estimated-tax-payment-booklet',
  CO: 'https://tax.colorado.gov/sites/default/files/documents/DR_0104EP_2026.pdf',
  TX: 'https://comptroller.texas.gov/taxes/',
  FL: 'https://floridarevenue.com/',
  TN: 'https://www.tn.gov/revenue/taxes/hall-income-tax.html',
  NV: 'https://tax.nv.gov/about-nevada-department-of-taxation/income-tax-in-nevada/',
  WA: 'https://dor.wa.gov/taxes-rates/other-taxes/capital-gains-tax',
};

const LOCAL: Partial<Record<StateCode, string>> = {
  NY: 'New York City and Yonkers add local income tax.',
  PA: 'Most Pennsylvania municipalities add a local earned income tax (Philadelphia has its own wage tax).',
  MI: 'Some Michigan cities (e.g. Detroit) add a city income tax.',
  OH: 'Most Ohio cities and many school districts add their own income tax.',
  CO: 'Denver, Aurora and a few other cities charge a small occupational privilege tax.',
  CA: 'California also withholds State Disability Insurance (a payroll deduction, not income tax).',
};
const LAST_YEAR: Partial<Record<StateCode, string>> = {
  NC: 'Uses the 2025 standard deduction ($12,750); the 2026 amount is published in January 2027.',
  OH: 'Uses Ohio’s 2025 rates and exemption: the 2026 schedule was not published when read (a 2025 law may make 2026 a flat 2.75% above $26,050).',
  AZ: 'Uses the 2025 standard deduction ($15,750); Arizona has not published the 2026 amount.',
};

type Bracket = [over: number, base: number, rate: number];
const sched = (x: number, t: Bracket[]) => {
  let r = 0;
  for (const [over, base, rate] of t) if (x > over) r = base + (x - over) * rate;
  return x > 0 ? r : 0;
};
const CA: Bracket[] = [[0, 0, 0.01], [11456, 114.56, 0.02], [27157, 428.58, 0.04], [42861, 1056.74, 0.06], [59498, 2054.96, 0.08], [75197, 3310.88, 0.093], [384109, 32039.70, 0.103], [460927, 39951.95, 0.113], [768213, 74675.27, 0.123]];
const NY: Bracket[] = [[0, 0, 0.039], [8500, 332, 0.044], [11700, 473, 0.0515], [13900, 586, 0.054], [80650, 4191, 0.059], [215400, 12141, 0.0685], [1077550, 71198, 0.0965], [5000000, 449714, 0.103], [25000000, 2509714, 0.109]];
const OH: Bracket[] = [[0, 0, 0], [26050, 342, 0.0275], [100000, 2394.32, 0.03125]];
export function ohioTax(taxable: number): number { return taxable > 26050 ? sched(taxable, OH) : 0; }
const ohExemption = (magi: number) => (magi <= 40000 ? 2400 : magi <= 80000 ? 2150 : magi < 750000 ? 1900 : 0);
const VA: Bracket[] = [[0, 0, 0.02], [3000, 60, 0.03], [5000, 120, 0.05], [17000, 720, 0.0575]];
const NJ: [upTo: number, rate: number, subtract: number][] = [[20000, 0.014, 0], [35000, 0.0175, 70], [40000, 0.035, 682.5], [75000, 0.05525, 1492.5], [500000, 0.0637, 2126.25], [1000000, 0.0897, 15126.25], [Infinity, 0.1075, 32926.25]];

export interface StateTaxResult { tax: number; taxable: number; effectiveRate: number; note: string; partial: boolean; }
const r2 = (n: number) => Math.round(n * 100) / 100;

function nyTax(taxable: number, agi: number): { tax: number; partial: boolean } {
  const table = sched(taxable, NY);
  if (agi <= 107650 || taxable > 215400) return { tax: table, partial: taxable > 215400 };
  // Worksheet 7: taxable income at the 5.90% bracket rate, phased in over NYAGI $107,650 to $157,650.
  const flat = taxable * 0.059;
  if (agi >= 157650) return { tax: flat, partial: false };
  const share = Math.round(((agi - 107650) / 50000) * 10000) / 10000;
  return { tax: table + (flat - table) * share, partial: false };
}

/** State income tax on a year's wages (salary + bonus), single filer. */
export function stateIncomeTax(state: StateCode, wages: number): StateTaxResult {
  const w = Math.max(0, Number.isFinite(wages) ? wages : 0);
  let taxable = w, tax = 0, partial = false;
  switch (state) {
    case 'CA': taxable = Math.max(0, w - 5900); tax = Math.max(0, sched(taxable, CA) - 158) + Math.max(0, taxable - 1000000) * 0.01; break;
    case 'NY': { taxable = Math.max(0, w - 8000); const n = nyTax(taxable, w); tax = n.tax; partial = n.partial; break; }
    case 'NJ': { taxable = Math.max(0, w - 1000); if (w <= 10000) { tax = 0; break; } const b = NJ.find(([upTo]) => taxable <= upTo)!; tax = Math.max(0, taxable * b[1] - b[2]); break; }
    case 'VA': taxable = Math.max(0, w - 8750 - 930); tax = sched(taxable, VA); break;
    case 'OH': { const ex = ohExemption(w); taxable = Math.max(0, w - ex); tax = Math.max(0, ohioTax(taxable) - (taxable < 30000 ? 20 : 0)); break; }
    case 'PA': tax = w * 0.0307; break;
    case 'IL': taxable = Math.max(0, w - (w > 250000 ? 0 : 2925)); tax = taxable * 0.0495; break;
    case 'MI': taxable = Math.max(0, w - 5900); tax = taxable * 0.0425; break;
    case 'MA': taxable = Math.max(0, w - 4400); tax = taxable * 0.05 + Math.max(0, taxable - 1107750) * 0.04; break;
    case 'NC': taxable = Math.max(0, w - 12750); tax = taxable * 0.0399; break;
    case 'GA': taxable = Math.max(0, w - 15000); tax = taxable * 0.0499; break;
    case 'AZ': taxable = Math.max(0, w - 15750); tax = taxable * 0.025; break;
    case 'CO': taxable = Math.max(0, w - 16100); tax = taxable * 0.044; break;
    default: taxable = 0; tax = 0;
  }
  const notes = [state === 'TX' || state === 'FL' || state === 'TN' || state === 'NV' || state === 'WA' ? `${STATE_NAMES[state]} has no state income tax on wages.` : '', LAST_YEAR[state] ?? '', LOCAL[state] ?? '', partial ? 'New York taxable income above $215,400 uses recapture worksheets we have not modelled: the tax shown is too low.' : ''].filter(Boolean);
  return { tax: r2(tax), taxable: r2(taxable), effectiveRate: w > 0 ? r2((tax / w) * 100) : 0, note: notes.join(' '), partial };
}
