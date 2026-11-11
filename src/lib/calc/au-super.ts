/**
 * Australian super guarantee and concessional contributions, 2026-27 (held A5 title for the AU hub: "Super"). ATO,
 * read 8 Nov 2026: "Super guarantee" (updated 17 Apr 2026): 12% from 1 July 2025; from 1 July 2026 (Payday Super) paid
 * each payday on qualifying earnings, up to an annual maximum contribution base of $270,830 for 2026-27 (concessional
 * cap x 100 / 12%, rounded down to $10). "Contributions caps" (updated 11 Sep 2026): concessional cap $32,500 for
 * 2026-27 ($30,000 for 2025-26). Contributions tax: 15% in the fund (Division 293 adds 15% above $250,000 of income:
 * flagged, not modelled). Unused cap carry-forward is not modelled.
 */
export const SG_RATE = 0.12;
export const MAX_BASE_2026_27 = 270830;
export const CONCESSIONAL_CAP_2026_27 = 32500;
export const CONTRIBUTIONS_TAX = 0.15;
export const DIV293_THRESHOLD = 250000;

export interface SuperInput { salary: number; salarySacrifice: number; paydays: number; }
export interface SuperResult {
  sg: number;              // employer super guarantee a year
  perPayday: number;
  concessional: number;    // SG + salary sacrifice
  capLeft: number;         // room under the $32,500 cap (0 if over)
  overCap: number;         // amount above the cap
  contributionsTax: number;
  intoFund: number;        // concessional contributions after 15% tax
  div293: boolean;
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const pos = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

export function superGuarantee(i: SuperInput): SuperResult {
  const salary = pos(i.salary), sacrifice = pos(i.salarySacrifice);
  const paydays = Math.max(1, Math.round(pos(i.paydays) || 26));
  const sg = r2(Math.min(salary, MAX_BASE_2026_27) * SG_RATE);
  const concessional = r2(sg + sacrifice);
  const tax = r2(Math.min(concessional, CONCESSIONAL_CAP_2026_27) * CONTRIBUTIONS_TAX);
  return {
    sg, perPayday: r2(sg / paydays), concessional,
    capLeft: r2(Math.max(0, CONCESSIONAL_CAP_2026_27 - concessional)),
    overCap: r2(Math.max(0, concessional - CONCESSIONAL_CAP_2026_27)),
    contributionsTax: tax, intoFund: r2(concessional - tax),
    div293: salary + sacrifice > DIV293_THRESHOLD,
  };
}
