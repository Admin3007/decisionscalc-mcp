/**
 * The paid spreadsheet planners, in one place, for cross-sell cards on tools, guides, hubs and the footer
 * (overhaul plan A1/A2). Prices come from each product's own constant where one exists, so a price change
 * stays a one-line edit on the product's data file and every card follows.
 */
import { LEAVE_PRICE_USD } from './leave-planner';
import { RETIREMENT_PRICE_USD } from './retirement-planner';
import { RETIREMENT_INTL_PRICE_USD, RETIREMENT_INTL_ON_SALE } from './retirement-planner-intl';
import { LANDLORD_PRICE_USD } from './landlord-planner';
import { PLANNER_PRICE_USD as MOVING_PRICE_USD } from './moving/planner';
import { CARE_PRICE_USD, CARE_ON_SALE } from './care-planner';
import { HOMEBUY_PRICE_USD, HOMEBUY_ON_SALE } from './home-buying-planner';

// The wedding planner and ETF tracker pages hard-code $15 in their Product schema; keep these in step.
export const WEDDING_PRICE_USD = 15;
export const ETF_PRICE_USD = 15;

export type PlannerId = 'wedding' | 'leave' | 'moving' | 'etf' | 'retirement' | 'landlord' | 'retirementIntl' | 'homebuy' | 'care';

export interface Planner {
  id: PlannerId;
  name: string;
  url: string;
  price: number;
  /** Country codes the planner has an edition for (or, for moving, the destinations it covers). */
  countries: string[];
  editionsNote: string;
  /** False while the sales page says "coming soon" (no checkout, no schema offer). Unset = on sale. */
  onSale?: boolean;
  pitch: string;
  /** Country-specific pitch (e.g. no 'Medicaid' on UK or Irish pages). */
  pitchBy?: Partial<Record<string, string>>;
  thumb: { src: string; w: number; h: number; alt: string };
  /** Not on sale yet: the sales page says "coming soon". */
  soon?: boolean;
}

export const PLANNERS: Record<PlannerId, Planner> = {
  wedding: {
    id: 'wedding', name: 'Wedding Budget Planner', url: '/wedding-budget-planner/', price: WEDDING_PRICE_USD,
    countries: ['US', 'GB', 'CA', 'AU', 'IE', 'CH'], editionsNote: 'US, UK, Canada, Australia, Ireland and Switzerland editions',
    pitch: 'Your budget pre-filled with your country’s averages, with a payment schedule, quote tracker, guest list and dated checklist.',
    thumb: { src: '/img/products/inside/wedding-budget-planner-1-sm.jpg', w: 800, h: 916, alt: 'Wedding Budget Planner dashboard' },
  },
  leave: {
    id: 'leave', name: 'Parental Leave Planner', url: '/parental-leave-planner/', price: LEAVE_PRICE_USD,
    countries: ['US', 'GB', 'CA', 'AU', 'IE'], editionsNote: 'US, UK, Canada, Australia and Ireland editions',
    pitch: 'Both parents’ leave week by week: state pay, employer top-ups, the household income gap and a savings target.',
    thumb: { src: '/img/products/inside/parental-leave-planner-1-sm.jpg', w: 800, h: 575, alt: 'Parental Leave Planner dashboard' },
  },
  moving: {
    id: 'moving', name: 'Moving Abroad Planner', url: '/moving-abroad-planner/', price: MOVING_PRICE_USD,
    countries: ['US', 'GB', 'CA', 'AU', 'IE', 'NZ', 'CH'], editionsNote: 'moves to Australia, Canada, Ireland or the UK',
    pitch: 'Moving costs, a month-by-month timeline, a savings target and a checklist, with sourced figures for Australia, Canada, Ireland and the UK.',
    thumb: { src: '/img/products/inside/moving-abroad-planner-1-sm.jpg', w: 800, h: 582, alt: 'Moving Abroad Planner dashboard' },
  },
  etf: {
    id: 'etf', name: 'Irish ETF Exit Tax Tracker', url: '/irish-etf-tax-tracker/', price: ETF_PRICE_USD,
    countries: ['IE'], editionsNote: 'Irish rules: 41%, 38% and 35% exit tax',
    pitch: 'Every ETF purchase with its 8-year deemed disposal date and exit tax, plus sale credits, refunds and distributions.',
    thumb: { src: '/img/products/inside/irish-etf-tax-tracker-1-sm.jpg', w: 800, h: 567, alt: 'Irish ETF Exit Tax Tracker dashboard' },
  },
  retirement: {
    id: 'retirement', name: 'Irish Retirement Planner', url: '/irish-retirement-planner/', price: RETIREMENT_PRICE_USD,
    countries: ['IE'], editionsNote: 'Irish State Pension, tax and USC',
    pitch: 'Your retirement year by year to 95, alone or as a couple: lump sum tax, ARF drawdown, State Pension at 66, income tax, USC and PRSI.',
    thumb: { src: '/img/products/inside/irish-retirement-planner-1-sm.jpg', w: 800, h: 583, alt: 'Irish Retirement Planner dashboard' },
  },
  retirementIntl: {
    id: 'retirementIntl', name: 'Retirement Planner', url: '/retirement-planner/', price: RETIREMENT_INTL_PRICE_USD, onSale: RETIREMENT_INTL_ON_SALE,
    countries: ['GB', 'CA', 'AU'], editionsNote: 'UK, Canada and Australia editions',
    pitch: 'Your retirement year by year to 95, alone or as a couple: pensions, State Pension or CPP and OAS or the Age Pension, drawdown and every tax line, with three scenarios.',
    thumb: { src: '/img/products/inside/retirement-planner-1-sm.jpg', w: 800, h: 571, alt: 'Retirement Planner dashboard' },
  },
  landlord: {
    id: 'landlord', name: 'Irish Landlord Planner', url: '/irish-landlord-planner/', price: LANDLORD_PRICE_USD,
    countries: ['IE'], editionsNote: 'Irish rental income tax, USC and PRSI',
    pitch: 'Sell or keep each rental after tax, a Form 11 rental income ledger by year and owner, and every RTB registration and rent review date.',
    thumb: { src: '/img/products/inside/irish-landlord-planner-1-sm.jpg', w: 800, h: 587, alt: 'Irish Landlord Planner dashboard' },
  },
  care: {
    id: 'care', name: 'Care Costs Planner', url: '/care-costs-planner/', price: CARE_PRICE_USD, onSale: CARE_ON_SALE,
    countries: ['US', 'GB', 'IE'], editionsNote: 'US (every state), UK (England, Scotland, Wales, Northern Ireland) and Ireland (Fair Deal) editions',
    pitch: 'A parent’s long-term care: how long savings last, when Medicaid, the council or Fair Deal starts paying, what the family pays and how siblings split it.',
    pitchBy: {
      GB: 'A parent’s long-term care: how long savings and the home last before the council starts paying, what the family pays and how siblings split it.',
      IE: 'A parent’s long-term care under Fair Deal: what they pay each week, when the 3-year cap ends the home’s share, what the HSE pays and how siblings split the rest.',
      US: 'A parent’s long-term care: how long savings last, when Medicaid starts paying, what the family pays and how siblings split it.',
    },
    thumb: { src: '/img/products/inside/care-costs-planner-1-sm.jpg', w: 800, h: 600, alt: 'Care Costs Planner dashboard' },
  },
  homebuy: {
    id: 'homebuy', name: 'Home Buying Planner', url: '/home-buying-planner/', price: HOMEBUY_PRICE_USD, soon: !HOMEBUY_ON_SALE,
    countries: ['US', 'GB', 'CA', 'AU', 'IE'], editionsNote: 'US, UK, Canada, Australia and Ireland editions',
    pitch: 'The cash you need on the day with your country’s purchase tax and first-buyer relief, a month-by-month deposit plan, what lenders allow, and owning vs renting over 30 years.',
    thumb: { src: '/img/products/inside/home-buying-planner-1-sm.jpg', w: 800, h: 586, alt: 'Home Buying Planner dashboard' },
  },
};

/** The 2-3 planners shown on a country's hubs (REDESIGN-PLAN v2 §10). */
export const HUB_PLANNERS: Record<string, PlannerId[]> = {
  IE: ['etf', 'retirement', 'landlord', 'homebuy', 'care'],
  US: ['homebuy', 'wedding', 'leave', 'care'],
  GB: ['retirementIntl', 'homebuy', 'wedding', 'leave', 'moving', 'care'],
  CA: ['retirementIntl', 'homebuy', 'leave', 'wedding'],
  AU: ['retirementIntl', 'homebuy', 'wedding', 'leave', 'moving'],
  NZ: ['moving'],
  CH: ['wedding', 'moving'],
};

export const plannersFor = (cc: string): Planner[] => (HUB_PLANNERS[cc] ?? HUB_PLANNERS.US).map((id) => PLANNERS[id]);
export const ALL_PLANNERS: Planner[] = Object.values(PLANNERS).filter((p) => p.onSale !== false);

/**
 * Which planner a calculator page offers (overhaul plan A1). Universal tools only offer it on routes where
 * the planner has an edition for that country.
 */
// One planner, or several in order: the first one sold in the visitor's country is shown.
const TOOL_PLANNER: Record<string, PlannerId | PlannerId[]> = {
  'wedding-cost-calculator': 'wedding',
  'baby-cost-planner': 'leave',
  'us-paid-family-leave-calculator': 'leave',
  'canada-ei-benefit-calculator': 'leave',
  'quebec-qpip-calculator': 'leave',
  'ireland-maternity-benefit-calculator': 'leave',
  'uk-maternity-pay-calculator': 'leave',
  'australia-parental-leave-pay-calculator': 'leave',
  'ireland-landlord-tax-calculator': 'landlord',
  'ireland-sell-or-keep-rental-calculator': 'landlord',
  'ireland-state-pension-calculator': 'retirement',
  'ireland-pension-tax-relief-calculator': 'retirement',
  'ireland-myfuturefund-calculator': 'retirement',
  'ireland-retirement-calculator': 'retirement',
  'ireland-severance-tax-calculator': 'retirement',
  'ireland-budget-2027-calculator': 'retirement',
  'ireland-cgt-calculator': 'etf',
  'ireland-savings-investment-calculator': 'etf',
  'ireland-investment-account-calculator': 'etf',
  'ireland-overpay-mortgage-or-invest-calculator': 'etf',
  'ireland-etf-exit-tax-calculator': 'etf',
  'uk-voluntary-ni-abroad-calculator': 'moving',
  'medicaid-spend-down-calculator': 'care',
  'uk-care-home-fees-calculator': 'care',
  'ireland-fair-deal-calculator': 'care',
  'ireland-carers-allowance-calculator': 'care',
  'aging-parent-planner': 'care',
  'dependent-care-fsa-vs-credit-calculator': 'leave',
  'uk-pension-drawdown-calculator': 'retirementIntl',
  'home-buying-cost-calculator': 'homebuy',
  'rent-vs-buy-calculator': 'homebuy',
  'uk-stamp-duty-calculator': 'homebuy',
  'scotland-lbtt-calculator': 'homebuy',
  'wales-ltt-calculator': 'homebuy',
  'ireland-help-to-buy-calculator': 'homebuy',
  'uk-retirement-calculator': 'retirementIntl',
  'canada-retirement-calculator': 'retirementIntl',
  'australia-retirement-calculator': 'retirementIntl',
  // Busy general pages (Cloudflare 30-day loads, 10 Nov): savings growth -> the retirement planner for the reader's country.
  'compound-interest-calculator': ['retirement', 'retirementIntl'],
};

export function plannerForTool(slug: string, cc: string): Planner | null {
  const ids = TOOL_PLANNER[slug];
  if (!ids) return null;
  for (const id of Array.isArray(ids) ? ids : [ids]) {
    const p = PLANNERS[id];
    if (p.onSale !== false && p.countries.includes(cc)) return p;
  }
  return null;
}
