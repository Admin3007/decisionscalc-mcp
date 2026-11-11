/**
 * Home Buying Planner: the paid spreadsheet ($15 one-time; editions us, gb, ca, au, ie, each with a worked example).
 * Files: scripts/gen-home-buying-planner.mjs -> R2 home-buying-planner/v1/<ed>.xlsx (not uploaded yet).
 *
 * CHECKOUT IS CLOSED. TODO (coordinating session / Akash), in this order (docs/HOME-BUYING-PLANNER.md):
 *  1. Create the Paddle product "Home Buying Planner" (standard digital goods, tax by location) with one $15 USD
 *     one-time price, max quantity 1.
 *  2. Add the licence service PRODUCTS entry "home-buying-planner" (both wranglers + delivery.js in decisionscalc-apps)
 *     and deploy. PLANNERS / PAGES entries are already in functions/api/planner/_lib.js and functions/d/_files.js.
 *  3. node scripts/xlsx-release-check.mjs, then upload planner-out/home-buying-planner/<ed>.xlsx (10 files) to R2
 *     decisionscalc-products/home-buying-planner/v1/.
 *  4. Put the price id (pri_...) below; set the "homebuy" SHOP editions in scripts/xlsx-brand.py; npm run gates; push.
 */

/** Live Paddle price. While it is not a real id the page shows "coming soon" and loads no checkout. */
export const PADDLE_PRICE_ID: string = 'pri_01m6yeq0z57rk8d79n29g8ee0n';

/** The one switch, derived from the price id so the button can never open a broken checkout. */
export const HOMEBUY_ON_SALE = PADDLE_PRICE_ID.startsWith('pri_');

export const HOMEBUY_PRICE_USD = 15;

/** Licence PRODUCTS key; must match functions/api/planner/_lib.js. */
export const LICENCE_PRODUCT = 'home-buying-planner';

export const HOMEBUY_EDITIONS = [
  { ed: 'us', name: 'United States (.xlsx)' },
  { ed: 'gb', name: 'United Kingdom (.xlsx)' },
  { ed: 'ca', name: 'Canada (.xlsx)' },
  { ed: 'au', name: 'Australia (.xlsx)' },
  { ed: 'ie', name: 'Ireland (.xlsx)' },
  { ed: 'us-EXAMPLE', name: 'Worked example: US' },
  { ed: 'gb-EXAMPLE', name: 'Worked example: UK' },
  { ed: 'ca-EXAMPLE', name: 'Worked example: Canada' },
  { ed: 'au-EXAMPLE', name: 'Worked example: Australia' },
  { ed: 'ie-EXAMPLE', name: 'Worked example: Ireland' },
] as const;
