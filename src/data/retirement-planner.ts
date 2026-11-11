/**
 * Irish Retirement Planner: the paid spreadsheet ($15 one-time, edition ie + the worked example).
 * Files: scripts/gen-retirement-planner.mjs -> R2 irish-retirement-planner/v1/ie.xlsx and ie-EXAMPLE.xlsx.
 *
 * CHECKOUT IS CLOSED until the Paddle product exists. To open it (coordinating session / Akash):
 *  TODO(paddle): create the Paddle product "Irish Retirement Planner" (standard digital goods, tax by location)
 *    with one $15 USD one-time price, quantity 1, and paste the price id (pri_...) below.
 *  TODO(licence): add "retirement-planner" to PRODUCTS in decisionscalc-apps site/wrangler.jsonc and keyquill-site/wrangler.jsonc
 *    (with the Paddle product and price ids), to site/src/delivery.js, and to PLANNERS in functions/api/planner/_lib.js
 *    and functions/d/_files.js (editions ie, ie-EXAMPLE); upload both files to R2; deploy.
 *  Then set the "retirement" SHOP editions to {'ie'} in scripts/xlsx-brand.py so the other Irish planners cross-sell it.
 */

/** Live Paddle price. While it is not a real id the page shows "coming soon" and loads no checkout. */
export const PADDLE_PRICE_ID: string = 'pri_01m6n5prhsctbed0p5kvy0vb8x';

/** The one switch, derived from the price id so the button can never open a broken checkout. */
export const RETIREMENT_ON_SALE = PADDLE_PRICE_ID.startsWith('pri_');

export const RETIREMENT_PRICE_USD = 15;

/** Licence PRODUCTS key; must match functions/api/planner/_lib.js once added there. */
export const LICENCE_PRODUCT = 'retirement-planner';

export const RETIREMENT_EDITIONS = [
  { ed: 'ie', name: 'Irish Retirement Planner (.xlsx)' },
  { ed: 'ie-EXAMPLE', name: 'Worked example, filled in (.xlsx)' },
] as const;
