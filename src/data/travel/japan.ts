/**
 * Japan trip cost: every official amount with its source and the date we read it,
 * and our estimates, labelled as estimates. Change a figure here and
 * src/lib/calc/japan-trip.test.ts pins it.
 *
 * Dates to re-check (CORRECTIONS-CALENDAR): Tokyo moves to a flat 3% accommodation tax
 * from 1 April 2027; JR Pass prices; the ECB rate (moving/figures.ts FX date).
 */
export type Origin = 'US' | 'GB' | 'CA' | 'AU' | 'IE';
export type Style = 'budget' | 'mid' | 'comfort';
export type PassDays = 0 | 7 | 14 | 21;

export interface TravelSource { label: string; url: string; checked: string; status: 'official' | 'official-search' | 'estimate' }

export const JAPAN_SOURCES = {
  departureTax: { label: 'Japan Tourism Agency: International Tourist Tax, ¥3,000 per departure from 1 July 2026', url: 'https://www.mlit.go.jp/kankocho/content/001996466.pdf', checked: '2026-11-02', status: 'official' },
  jrPass: { label: 'Japan Rail Pass official website: prices (online purchase)', url: 'https://japanrailpass.net/en/purchase/price/', checked: '2026-11-02', status: 'official' },
  kyotoTax: { label: 'Kyoto City official guide: accommodation tax from 1 March 2026', url: 'https://kyoto.travel/en/news/tax-change/', checked: '2026-11-02', status: 'official' },
  tokyoTax: { label: 'Tokyo Metropolitan Tax Bureau: accommodation tax rates', url: 'https://www.tax.metro.tokyo.lg.jp/shitsumon/tozei/hotel/general_01.html', checked: '2026-11-02', status: 'official' },
  visaExempt: { label: 'Ministry of Foreign Affairs of Japan: visa exemption arrangements (short stays)', url: 'https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html', checked: '2026-11-02', status: 'official' },
  ecb: { label: 'ECB euro reference rates, 28 Oct 2026 (JPY 175.86 per euro)', url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html', checked: '2026-10-28', status: 'official' },
  estimate: { label: 'Our estimate: change it', url: '/methodology/', checked: '2026-11-02', status: 'estimate' },
} satisfies Record<string, TravelSource>;

/** ECB reference rate, same date as the moving calculator's FX table. */
export const JPY_PER_EUR = 175.86;

export const DEPARTURE_TAX_JPY = 3000;

/** Exchange-order prices bought on the official website (overseas agents charge ¥53,000 / ¥84,000 / ¥105,000 for adults). */
export const JR_PASS: Record<7 | 14 | 21, { adult: number; child: number }> = {
  7: { adult: 50000, child: 25000 },
  14: { adult: 80000, child: 40000 },
  21: { adult: 100000, child: 50000 },
};

/** Per person per night, by room rate per person (yen, excluding meals and tax). `below` is exclusive. */
export const TOKYO_TAX_BANDS = [
  { below: 10000, tax: 0 },
  { below: 15000, tax: 100 },
  { below: Infinity, tax: 200 },
] as const;
export const KYOTO_TAX_BANDS = [
  { below: 6000, tax: 200 },
  { below: 20000, tax: 400 },
  { below: 50000, tax: 1000 },
  { below: 100000, tax: 4000 },
  { below: Infinity, tax: 10000 },
] as const;

/**
 * Our estimates by travel style, in yen: a double room per night, and per adult per day for
 * food, local trains and buses, and entry fees. Children (6–11) count as `childShare` of an adult.
 */
export const STYLES: Record<Style, { label: string; roomJpy: number; dailyJpy: number; childShare: number }> = {
  budget: { label: 'Budget (business hotels, convenience stores, set lunches)', roomJpy: 12000, dailyJpy: 6000, childShare: 0.6 },
  mid: { label: 'Mid-range (3–4 star hotels, restaurants)', roomJpy: 25000, dailyJpy: 11000, childShare: 0.6 },
  comfort: { label: 'Comfort (upscale hotels, a ryokan night, guided tours)', roomJpy: 50000, dailyJpy: 20000, childShare: 0.6 },
};

/**
 * Origins: currency, our estimate of a return economy flight per person to Tokyo, and the visa fee
 * per person in the home currency (0 = visa-exempt short stay; all five origins are exempt for 90 days).
 */
export const ORIGINS: Record<Origin, { label: string; currency: 'USD' | 'GBP' | 'CAD' | 'AUD' | 'EUR'; flight: number; visaPerPerson: number; visaNote: string }> = {
  US: { label: 'United States', currency: 'USD', flight: 1200, visaPerPerson: 0, visaNote: 'No visa for a tourist stay of up to 90 days.' },
  GB: { label: 'United Kingdom', currency: 'GBP', flight: 900, visaPerPerson: 0, visaNote: 'No visa for a tourist stay of up to 90 days.' },
  CA: { label: 'Canada', currency: 'CAD', flight: 1500, visaPerPerson: 0, visaNote: 'No visa for a tourist stay of up to 90 days.' },
  AU: { label: 'Australia', currency: 'AUD', flight: 1300, visaPerPerson: 0, visaNote: 'No visa for a tourist stay of up to 90 days.' },
  IE: { label: 'Ireland', currency: 'EUR', flight: 1000, visaPerPerson: 0, visaNote: 'No visa for a tourist stay of up to 90 days.' },
};
