/**
 * UK State Pension from Abroad Planner: the paid spreadsheet ($15 one-time; edition gb + a filled-in worked example).
 * Files: scripts/gen-uk-sp-abroad-planner.mjs -> R2 uk-sp-abroad-planner/v1/<ed>.xlsx (gb, gb-EXAMPLE). Spec:
 * docs/UK-SP-ABROAD-PLANNER.md.
 *
 * ON SALE since 12 Nov 2026: Paddle product pro_01m76w1edrejyq4z3tsmhrkpw8, price below (US$15 with local prices
 * €15 euro area, £13 UK, A$25 AU, C$22 CA); licence PRODUCTS "uk-sp-abroad-planner" (prefix SA). Launch steps were:
 *  TODO(paddle): create the Paddle product "UK State Pension from Abroad Planner" (standard digital goods, tax by
 *    location) with one $15 USD one-time price, quantity 1, and paste the price id (pri_...) below.
 *  TODO(licence): add "uk-sp-abroad-planner" (prefix SA) to PRODUCTS in decisionscalc-apps site/wrangler.jsonc and
 *    keyquill-site/wrangler.jsonc and to site/src/delivery.js (editions gb, gb-EXAMPLE); upload both files; deploy.
 *  Then set the "ukspa" SHOP editions to None in scripts/xlsx-brand.py, re-run the release check, and run the $0 live test.
 */

/** Live Paddle price. While it is not a real id the page shows "coming soon" and loads no checkout. */
export const PADDLE_PRICE_ID: string = 'pri_01m76w8d4vg02wrp1h7pbzsb9m';

/** The one switch, derived from the price id so the button can never open a broken checkout. */
export const UKSPA_ON_SALE = PADDLE_PRICE_ID.startsWith('pri_');

export const UKSPA_PRICE_USD = 15;

/** Licence PRODUCTS key; must match functions/api/planner/_lib.js. */
export const LICENCE_PRODUCT = 'uk-sp-abroad-planner';

export const UKSPA_EDITIONS = [
  { ed: 'gb', name: 'The planner (.xlsx)' },
  { ed: 'gb-EXAMPLE', name: 'Worked example (.xlsx)' },
] as const;
