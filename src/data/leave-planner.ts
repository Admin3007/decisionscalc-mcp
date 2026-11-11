/**
 * Parental Leave Planner: the paid spreadsheet ($19 one-time, editions gb, au, ie, ca, us).
 * Files: scripts/gen-leave-planner.mjs -> R2 parental-leave-planner/v1/<ed>.xlsx.
 * Go live: create the Paddle product and price, add the licence PRODUCTS entry "leave-planner"
 * (both wranglers + delivery.js), upload the four files to R2, then put the price id here.
 */

/** Live Paddle price. While it is not a real id the page shows "coming soon" and loads no checkout. */
export const PADDLE_PRICE_ID: string = 'pri_01m6ew64zjnw0vcv6pepvy6vw3';

/** The one switch, derived from the price id so the button can never open a broken checkout. */
export const LEAVE_ON_SALE = PADDLE_PRICE_ID.startsWith('pri_');

export const LEAVE_PRICE_USD = 19;

/** Licence PRODUCTS key; must match functions/api/planner/_lib.js. */
export const LICENCE_PRODUCT = 'leave-planner';

/** Editions, in the order the generator writes them (file = R2 key and edition param). */
export const LEAVE_EDITIONS = [
  { ed: 'gb', name: 'United Kingdom' },
  { ed: 'au', name: 'Australia' },
  { ed: 'ie', name: 'Ireland' },
  { ed: 'ca', name: 'Canada (EI and Quebec QPIP)' },
  { ed: 'us', name: 'United States (state paid leave)' },
] as const;
