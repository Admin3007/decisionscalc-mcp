/**
 * Moving Abroad Planner: the paid spreadsheet ($15 one-time, all 4 editions; $29 until 4 Nov 2026).
 * Files: scripts/gen-moving-planner.mjs -> R2 moving-abroad-planner/v1/<ed>.xlsx.
 * Go-live steps (Paddle product, licence PRODUCTS entry, R2 upload, this flag):
 * docs/MOVING-PLANNER.md.
 */

/** The one switch: false shows "coming soon" copy and loads no checkout. */
export const PLANNER_ON_SALE = true;

export const PLANNER_PRICE_USD = 15;

/**
 * Live Paddle product "Moving Abroad Planner" ($15 one-time since 4 Nov 2026, was $29; standard digital goods,
 * tax by location), created Oct 29, 2026. The same ids are in the licence service
 * PRODUCTS ("moving-planner", prefix MP) in decisionscalc-apps site/wrangler.jsonc and
 * keyquill-site/wrangler.jsonc.
 */
export const PADDLE_PRODUCT_ID = 'pro_01m639ehhpt0nmsp4gpab7h8nh';
export const PADDLE_PRICE_ID = 'pri_01m639h91qdtc8e6b5xbm4m4rb';
/** Licence PRODUCTS key; must match functions/api/planner/_lib.js. */
export const LICENCE_PRODUCT = 'moving-planner';

/** Editions, in the order the generator writes them (file = R2 key and edition param). */
export const PLANNER_EDITIONS = [
  { dest: 'AU', ed: 'au', name: 'Australia' },
  { dest: 'CA', ed: 'ca', name: 'Canada' },
  { dest: 'IE', ed: 'ie', name: 'Ireland' },
  { dest: 'GB', ed: 'gb', name: 'United Kingdom' },
] as const;
