/**
 * Country data packs — single source of truth (Step 1.4, CONTRACTS §3).
 *
 * Each pack is validated at module load, so an invalid pack FAILS THE BUILD
 * (this module is imported by BaseLayout). Add a country by creating
 * packs/<cc>.ts and registering it here; the pack-completeness and freshness
 * gates in tests/contracts enforce coverage and recency for LIVE countries.
 */
import us from './us';
import gb from './gb';
import ca from './ca';
import au from './au';
import ie from './ie';
import ch from './ch';
import nz from './nz';
import { validatePack, type CountryPack, type PackEntry } from '../../lib/packSchema';
import { NOT_LOCALISED } from '../../lib/locale.js';

validatePack('US', us);
validatePack('GB', gb);
validatePack('CA', ca);
validatePack('AU', au);
// IE/CH: live as of 2026-06-15 (BUILD_COUNTRIES). Figures are AI-researched and
// illustrative pending ongoing owner verification (docs/<CC>-VERIFICATION-CHECKLIST.md).
validatePack('IE', ie);
validatePack('CH', ch);
// NZ: live from 2026-11 with official-source figures only; tools without one
// are excluded (NOT_LOCALISED) and must have no entry.
validatePack('NZ', nz, NOT_LOCALISED.NZ.tools);

export const PACKS: Record<string, CountryPack> = { US: us, GB: gb, CA: ca, AU: au, IE: ie, CH: ch, NZ: nz as CountryPack };

/**
 * Trimmed projection embedded as JSON in tool pages for dc-runtime: only
 * non-US countries and only the fields the runtime applies on load
 * (defaults + labels). Keeps the per-page payload small — the bulky `data`
 * tables are imported directly by each tool's script instead.
 */
function project(pack: CountryPack): Record<string, Pick<PackEntry, 'defaults' | 'labels'>> {
  const out: Record<string, Pick<PackEntry, 'defaults' | 'labels'>> = {};
  for (const [tool, e] of Object.entries(pack)) {
    if (e.defaults || e.labels) out[tool] = { ...(e.defaults && { defaults: e.defaults }), ...(e.labels && { labels: e.labels }) };
    else out[tool] = {}; // marker: tool is localised (suppresses the US-data notice)
  }
  return out;
}

export const RUNTIME_PACKS: Record<string, ReturnType<typeof project>> = { GB: project(gb), CA: project(ca), AU: project(au), IE: project(ie), CH: project(ch), NZ: project(nz as CountryPack) };

/**
 * Merged input defaults for a country+tool: the US pack is the complete base
 * set; country packs are sparse OVERRIDES on top of it (CONTRACTS §3). Tool
 * components must use this (not a raw pack lookup) so fields a country
 * doesn't override keep their US values instead of rendering empty.
 */
export function defaultsFor(cc: string, tool: string): Record<string, number> {
  const base = PACKS.US[tool as keyof typeof us]?.defaults ?? {};
  const over = PACKS[cc]?.[tool as keyof typeof us]?.defaults ?? {};
  return { ...base, ...over };
}
