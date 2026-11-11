/**
 * Care Costs Planner: the paid spreadsheet ($15 one-time; editions us, gb, ie, each with a filled-in worked example).
 * Files: scripts/gen-care-planner.mjs -> R2 care-costs-planner/v1/<ed>.xlsx (us, gb, ie, us-EXAMPLE, gb-EXAMPLE, ie-EXAMPLE).
 *
 * ON SALE since 9 Nov 2026 (live Paddle price below; licence PRODUCTS "care-planner", prefix CP). Launch steps were:
 *  TODO(paddle): create the Paddle product "Care Costs Planner" (standard digital goods, tax by location) with one
 *    $15 USD one-time price, quantity 1, and paste the price id (pri_...) below.
 *  TODO(licence): add "care-planner" (suggested prefix CP) to PRODUCTS in decisionscalc-apps site/wrangler.jsonc and
 *    keyquill-site/wrangler.jsonc and to site/src/delivery.js (editions us, gb, ie + -EXAMPLE); upload the six files; deploy.
 *  Then set the "care" SHOP editions to {'us', 'gb', 'ie'} in scripts/xlsx-brand.py and re-run the release check.
 */

/** Live Paddle price. While it is not a real id the page shows "coming soon" and loads no checkout. */
export const PADDLE_PRICE_ID: string = 'pri_01m6yp0hces41kztbtevvv4m1x';

/** The one switch, derived from the price id so the button can never open a broken checkout. */
export const CARE_ON_SALE = PADDLE_PRICE_ID.startsWith('pri_');

export const CARE_PRICE_USD = 15;

/** Licence PRODUCTS key; must match functions/api/planner/_lib.js. */
export const LICENCE_PRODUCT = 'care-planner';

export const CARE_EDITIONS = [
  { ed: 'us', name: 'United States edition (.xlsx)' },
  { ed: 'gb', name: 'UK edition (.xlsx)' },
  { ed: 'ie', name: 'Ireland edition (.xlsx)' },
  { ed: 'us-EXAMPLE', name: 'US worked example (.xlsx)' },
  { ed: 'gb-EXAMPLE', name: 'UK worked example (.xlsx)' },
  { ed: 'ie-EXAMPLE', name: 'Ireland worked example (.xlsx)' },
] as const;
