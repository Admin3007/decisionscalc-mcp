/**
 * Pack schema validator — CONTRACTS §3.
 *
 * Every country pack (src/data/packs/<cc>.ts) is validated against this shape
 * at build time (imported by the packs index) and in tests/contracts. Keep it
 * dependency-free (hand-rolled, no zod) so it runs anywhere.
 *
 * Shape per tool entry:
 *   defaults?:        Record<inputId, number>   applied on load (dc-runtime)
 *   labels?:          Record<inputId, string>   visible label overrides
 *   fieldVisibility?: Record<inputId, boolean>  false = hide the field
 *   data?:            Record<string, unknown>   tool-specific tables (debt rows,
 *                                               pet tuples, pay ranges, region
 *                                               cost maps…) consumed by the
 *                                               tool's own script
 *   source:           string  (required)        primary source, human-readable
 *   asOf:             'YYYY-MM' (required)      drives freshness gate + stamp
 *   reviewedBy:       string  (required)        who verified the figures
 */

export const TOOL_IDS = [
  'aging-parent-planner',
  'baby-cost-planner',
  'car-ownership-calculator',
  'chronic-illness-cost',
  'college-cost-calculator',
  'debt-payoff-calculator',
  'emergency-fund-calculator',
  'fire-calculator',
  'home-buying-cost-calculator',
  'pet-cost-calculator',
  'remote-work-calculator',
  'rent-vs-buy-calculator',
  'salary-negotiation-calculator',
  'wedding-cost-calculator',
  'compound-interest-calculator',
  'cost-of-raising-a-child-calculator',
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export interface PackEntry {
  defaults?: Record<string, number>;
  labels?: Record<string, string>;
  fieldVisibility?: Record<string, boolean>;
  data?: Record<string, unknown>;
  source: string;
  asOf: string; // 'YYYY-MM'
  reviewedBy: string;
  /**
   * Optional country context: the local RULES that change how this calculator's
   * answer should be read — not a restatement of the numbers.
   *
   * Swapping the currency and the defaults is not localisation. Measured against
   * their US originals, the /ch/ tool pages were only 19-33% different, and
   * Google filed several under "Crawled - currently not indexed" (GSC,
   * 2026-09-25). A Swiss reader needs to know that health cover is billed
   * privately rather than deducted from salary, or that at least half the
   * deposit must be cash — facts no currency swap conveys.
   *
   * `title` heads the block; each `points` entry is one substantive rule.
   * Rendered by BaseLayout above the sources line.
   */
  context?: { title: string; points: string[] };
}

export type CountryPack = Record<ToolId, PackEntry>;

const AS_OF_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Throws with a precise message on the first violation. `notLocalised` lists
 * tools the country deliberately excludes (locale.js NOT_LOCALISED): they must
 * have NO entry, so a half-researched entry can never slip in unnoticed.
 */
export function validatePack(cc: string, pack: Record<string, unknown>, notLocalised: readonly string[] = []): asserts pack is CountryPack {
  for (const id of TOOL_IDS) {
    if (notLocalised.includes(id)) {
      if (pack[id] !== undefined) throw new Error(`[pack:${cc}] ${id} is excluded (NOT_LOCALISED) but has an entry`);
      continue;
    }
    const e = pack[id] as PackEntry | undefined;
    if (!e || typeof e !== 'object') throw new Error(`[pack:${cc}] missing tool entry '${id}'`);
    if (typeof e.source !== 'string' || !e.source.trim()) throw new Error(`[pack:${cc}] ${id}: 'source' is required`);
    if (typeof e.asOf !== 'string' || !AS_OF_RE.test(e.asOf)) throw new Error(`[pack:${cc}] ${id}: 'asOf' must be 'YYYY-MM', got '${e.asOf}'`);
    if (typeof e.reviewedBy !== 'string' || !e.reviewedBy.trim()) throw new Error(`[pack:${cc}] ${id}: 'reviewedBy' is required`);
    for (const [k, v] of Object.entries(e.defaults ?? {})) {
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`[pack:${cc}] ${id}: defaults.${k} must be a finite number`);
    }
    for (const [k, v] of Object.entries(e.labels ?? {})) {
      if (typeof v !== 'string') throw new Error(`[pack:${cc}] ${id}: labels.${k} must be a string`);
    }
    for (const [k, v] of Object.entries(e.fieldVisibility ?? {})) {
      if (typeof v !== 'boolean') throw new Error(`[pack:${cc}] ${id}: fieldVisibility.${k} must be boolean`);
    }
    if (e.context !== undefined) {
      const c = e.context as PackEntry['context'];
      if (!c || typeof c.title !== 'string' || !c.title.trim()) {
        throw new Error(`[pack:${cc}] ${id}: context.title must be a non-empty string`);
      }
      if (!Array.isArray(c.points) || c.points.length === 0) {
        throw new Error(`[pack:${cc}] ${id}: context.points must be a non-empty array`);
      }
      for (const [i, pt] of c.points.entries()) {
        if (typeof pt !== 'string' || pt.trim().length < 40) {
          throw new Error(`[pack:${cc}] ${id}: context.points[${i}] must be a substantive string (40+ chars)`);
        }
      }
    }
  }
  const extra = Object.keys(pack).filter((k) => !(TOOL_IDS as readonly string[]).includes(k));
  if (extra.length) throw new Error(`[pack:${cc}] unknown tool keys: ${extra.join(', ')}`);
}

/** Months since an 'YYYY-MM' stamp, relative to now. */
export function monthsSince(asOf: string, now = new Date()): number {
  const [y, m] = asOf.split('-').map(Number);
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
}
