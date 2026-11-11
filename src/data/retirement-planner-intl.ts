/**
 * Retirement Planner for the UK, Canada and Australia: the paid spreadsheet ($15 one-time; all three editions and their
 * worked examples in one purchase). Files: scripts/gen-retirement-planner-intl.mjs -> R2 retirement-planner/v1/<ed>.xlsx.
 *
 * CHECKOUT IS CLOSED until the Paddle product exists. To open it (coordinating session / Akash), see
 * docs/RETIREMENT-PLANNER-INTL.md:
 *  TODO(paddle): create the Paddle product "Retirement Planner (UK, Canada, Australia)" (standard digital goods, tax by
 *    location) with one $15 USD one-time price, quantity 1, and paste the price id (pri_...) below.
 *  TODO(licence): add "retirement-planner-intl" to PRODUCTS in decisionscalc-apps site/wrangler.jsonc and
 *    keyquill-site/wrangler.jsonc and to site/src/delivery.js, and to PLANNERS in functions/api/planner/_lib.js and
 *    functions/d/_files.js (editions below, R2 folder retirement-planner); upload the six files to R2; deploy.
 */

/** Live Paddle price. While it is not a real id the page shows "coming soon" and loads no checkout. */
export const PADDLE_PRICE_ID: string = 'pri_01m6yfcss942z4dh3atgbenyxj';

/** The one switch, derived from the price id so the button can never open a broken checkout. */
export const RETIREMENT_INTL_ON_SALE = PADDLE_PRICE_ID.startsWith('pri_');

export const RETIREMENT_INTL_PRICE_USD = 15;

/** Licence PRODUCTS key; must match functions/api/planner/_lib.js once added there. */
export const LICENCE_PRODUCT = 'retirement-planner-intl';

/** R2: decisionscalc-products/retirement-planner/v1/<ed>.xlsx */
export const R2_FOLDER = 'retirement-planner';

export const RETIREMENT_INTL_EDITIONS = [
  { ed: 'gb', name: 'UK edition (.xlsx)' },
  { ed: 'gb-EXAMPLE', name: 'UK worked example (.xlsx)' },
  { ed: 'ca', name: 'Canada edition (.xlsx)' },
  { ed: 'ca-EXAMPLE', name: 'Canada worked example (.xlsx)' },
  { ed: 'au', name: 'Australia edition (.xlsx)' },
  { ed: 'au-EXAMPLE', name: 'Australia worked example (.xlsx)' },
] as const;
