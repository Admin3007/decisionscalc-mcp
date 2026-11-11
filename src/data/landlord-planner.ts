/**
 * Irish Landlord Planner: the paid spreadsheet ($19 one-time, editions ie and ie-EXAMPLE).
 * Files: scripts/gen-landlord-planner.mjs -> R2 irish-landlord-planner/v1/<ed>.xlsx (not uploaded yet).
 *
 * CHECKOUT IS CLOSED. TODO (coordinating session / Akash), in this order:
 *  1. Create the Paddle product and a one-time $19 price (standard digital goods, max quantity 1).
 *  2. Add the licence service PRODUCTS entry "landlord-planner" (both wranglers + delivery.js in decisionscalc-apps)
 *     and deploy; add PLANNERS['landlord-planner'] to functions/api/planner/_lib.js and PAGES to functions/d/_files.js.
 *  3. Upload planner-out/irish-landlord-planner/{ie,ie-EXAMPLE}.xlsx to R2 irish-landlord-planner/v1/.
 *  4. Put the price id (pri_...) below. Until then the page says "coming soon" and loads no checkout.
 */

/** Live Paddle price. While it is not a real id the page shows "coming soon" and loads no checkout. */
export const PADDLE_PRICE_ID: string = 'pri_01m6n5rkcaj14rw9gpexgyk8yc';

/** The one switch, derived from the price id so the button can never open a broken checkout. */
export const LANDLORD_ON_SALE = PADDLE_PRICE_ID.startsWith('pri_');

export const LANDLORD_PRICE_USD = 19;

/** Licence PRODUCTS key; must match functions/api/planner/_lib.js once it is added there. */
export const LICENCE_PRODUCT = 'landlord-planner';

export const LANDLORD_EDITIONS = [
  { ed: 'ie', name: 'The planner (.xlsx)' },
  { ed: 'ie-EXAMPLE', name: 'Worked example, filled in (.xlsx)' },
] as const;
