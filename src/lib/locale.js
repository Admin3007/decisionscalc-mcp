/**
 * Country registry — single source of truth for country identity.
 * See docs/CONTRACTS.md §2.
 *
 * `status`:
 *   'live'    — fully localised + owner-verified data pack; routes generated.
 *   'planned' — declared for forward-compat, but NOT yet launched. GB/CA/AU
 *               flip to 'live' in Phase 4 as each pack is owner-verified;
 *               IE/NZ are a later wave (no routes generated in this plan).
 *
 * IMPORTANT: this registry handles identity + formatting metadata only. The
 * underlying DATA (averages, tax rules, benchmarks) lives in per-country packs
 * (src/data/packs/*) — switching country must swap data, not just the symbol.
 */
export const COUNTRIES = {
  US: {
    code: 'US', name: 'United States', pathPrefix: '',
    currency: 'USD', locale: 'en-US', symbol: '$',
    status: 'live',
    regulator: 'SEC/FINRA',
    privacyLaw: 'CCPA/CPRA + US state laws',
    disclaimerLine: 'This is general information, not regulated financial advice.',
  },
  GB: {
    code: 'GB', name: 'United Kingdom', pathPrefix: '/gb',
    currency: 'GBP', locale: 'en-GB', symbol: '£',
    status: 'live', // reviewed vs 2026/27 official rates (AI review 2026-06-11; owner spot-check via docs/GB-VERIFICATION-CHECKLIST.md)
    regulator: 'FCA',
    privacyLaw: 'UK-GDPR + PECR',
    disclaimerLine: 'This is general information, not regulated financial advice (FCA).',
  },
  CA: {
    code: 'CA', name: 'Canada', pathPrefix: '/ca',
    currency: 'CAD', locale: 'en-CA', symbol: '$',
    status: 'live', // reviewed vs 2024-25 official rates (AI review 2026-06-11; owner spot-check via docs/CA-VERIFICATION-CHECKLIST.md)
    regulator: 'CIRO',
    privacyLaw: 'PIPEDA + provincial',
    disclaimerLine: 'This is general information, not regulated financial advice.',
  },
  AU: {
    code: 'AU', name: 'Australia', pathPrefix: '/au',
    currency: 'AUD', locale: 'en-AU', symbol: '$',
    status: 'live', // reviewed vs 2024-25 official rates (AI review 2026-06-11; owner spot-check via docs/AU-VERIFICATION-CHECKLIST.md)
    regulator: 'ASIC',
    privacyLaw: 'Privacy Act 1988',
    disclaimerLine: 'This is general information, not regulated financial advice (ASIC).',
  },
  IE: {
    code: 'IE', name: 'Ireland', pathPrefix: '/ie',
    currency: 'EUR', locale: 'en-IE', symbol: '€',
    status: 'live', // figures AI-researched 2026-06, operator-approved launch 2026-06-15 (illustrative — see disclaimer)
    regulator: 'CBI',
    privacyLaw: 'GDPR + ePrivacy',
    disclaimerLine: 'This is general information, not regulated financial advice (CBI).',
  },
  NZ: {
    code: 'NZ', name: 'New Zealand', pathPrefix: '/nz',
    currency: 'NZD', locale: 'en-NZ', symbol: '$',
    status: 'live', // launched 2026-11 as a market test: official-source figures only, unlocalised tools excluded (NOT_LOCALISED)
    regulator: 'FMA',
    privacyLaw: 'Privacy Act 2020',
    disclaimerLine: 'This is general information, not regulated financial advice (FMA).',
  },
  CH: {
    code: 'CH', name: 'Switzerland', pathPrefix: '/ch',
    // English-language Swiss audience; CHF formatting via en-CH. Tier-1 EUR/CHF
    // expansion (2026-06).
    currency: 'CHF', locale: 'en-CH', symbol: 'CHF',
    status: 'live', // figures AI-researched 2026-06, operator-approved launch 2026-06-15 (illustrative — see disclaimer)
    regulator: 'FINMA',
    privacyLaw: 'revFADP (nFADP)',
    disclaimerLine: 'This is general information, not regulated financial advice (FINMA).',
  },
  NL: {
    code: 'NL', name: 'Netherlands', pathPrefix: '/nl',
    currency: 'EUR', locale: 'en-NL', symbol: '€',
    // Market test from 2026-11 (radar/decisionscalc/NEW-COUNTRY-RESEARCH-2026-11-10.md): root-only Dutch tools built from
    // Belastingdienst / SVB sources. NOT in BUILD_COUNTRIES, so no /nl/ country routes are generated.
    status: 'live',
    regulator: 'AFM',
    privacyLaw: 'GDPR (UAVG)',
    disclaimerLine: 'This is general information, not regulated financial advice (AFM).',
  },
};

export const DEFAULT_COUNTRY = 'US';

/** Countries routes are generated for (US/UK/CA/AU + Tier-1 EUR/CHF: IE/CH, + NZ from 2026-11). */
export const BUILD_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'IE', 'CH', 'NZ'];

/** Fully launched countries (status === 'live'). Starts as just US. */
export const LIVE_COUNTRIES = Object.keys(COUNTRIES).filter((c) => COUNTRIES[c].status === 'live');

/** Declared but not yet launched in any wave. */
export const PLANNED_COUNTRIES = [];

/**
 * Country routes that exist but are NOT localised, because no official source
 * publishes the figures they depend on (NZ launch rule: exclude, never guess).
 * Their pages are still built so every in-site link resolves, but they are
 * noindex, carry no hreflang alternate and are left out of the sitemap, the
 * tools index, the homepage grid and search. A tool page becomes a pointer to
 * the general calculator; a life-stage page keeps its honest US-example notice.
 */
export const NOT_LOCALISED = {
  NZ: {
    tools: [
      'aging-parent-planner',            // only the residential-care maximum contribution is official; home and day care are not
      'baby-cost-planner',               // no official childcare fee figure
      'car-ownership-calculator',        // no official per-litre fuel price or insurance figure readable (MBIE blocked)
      'chronic-illness-cost',            // no official GP or specialist fee figure
      'college-cost-calculator',         // no official average tuition or living-cost figure
      'pet-cost-calculator',             // no official source
      'salary-negotiation-calculator',   // no official pay ranges by field
      'wedding-cost-calculator',         // no official source
      'cost-of-raising-a-child-calculator', // no official spending bands by age
    ],
    stages: ['starting-out', 'growing-family', 'building-wealth', 'career-decisions', 'later-life'],
  },
};

/**
 * Whether a country route is localised. `basePath` is the path without the
 * country prefix, e.g. '/tools/fire-calculator/' or '/life-stages/later-life/'.
 */
export function isLocalised(cc, basePath) {
  const nl = NOT_LOCALISED[String(cc).toUpperCase()];
  if (!nl) return true;
  const m = String(basePath).match(/^\/(tools|life-stages)\/([a-z0-9-]+)\/?$/);
  if (!m) return true;
  return !(m[1] === 'tools' ? nl.tools : nl.stages).includes(m[2]);
}

/** Back-compat alias (was the picker/SEO list). */
export const TIER1 = BUILD_COUNTRIES;

export function resolveCountry(code) {
  return COUNTRIES[code] || COUNTRIES[DEFAULT_COUNTRY];
}

/**
 * Country code for a pathname (CONTRACTS §1: the route is the source of
 * truth). '/gb/tools/x/' → 'GB'; anything unprefixed → DEFAULT_COUNTRY.
 */
export function countryFromPath(pathname) {
  const firstSeg = '/' + (String(pathname).split('/')[1] || '');
  const cc = BUILD_COUNTRIES.find(
    (c) => c !== DEFAULT_COUNTRY && COUNTRIES[c].pathPrefix === firstSeg
  );
  return cc || DEFAULT_COUNTRY;
}
