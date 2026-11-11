/**
 * Cost of raising a child (birth to 18) — pure calculation logic.
 *
 * Year-by-year model over the child's ages 0–17 (18 years), in three age
 * bands: 0–4, 5–11, 12–17. Every country figure comes from the data pack
 * (`cost-of-raising-a-child-calculator`); this module holds no country data.
 *
 * Per child, per year of age:
 *   everyday   = band amount (today's money, excl. housing and childcare) × level multiplier
 *   childcare  = full-time annual price × type share × (1 − subsidy) for ages 1..careYears
 *   housing    = housing share per child (when switched on)
 *   benefits   = official child benefit for that age (eldest / each additional child)
 * Each line is inflated by (1 + inflation)^age, so age 0 is today's prices.
 *
 * Children are modelled side by side over the same 18 years, each from birth;
 * spacing between births is not modelled and no economies of scale are applied.
 */

export type Level = 'low' | 'average' | 'high';
export type CareType = 'none' | 'part' | 'full';

export const BAND_AGES = { early: [0, 4], middle: [5, 11], teen: [12, 17] } as const;
export type Band = keyof typeof BAND_AGES;

/** Years of age modelled: 0..17. */
export const YEARS = 18;
/** Share of the full-time price charged for part-time care (our assumption). */
export const PART_TIME_SHARE = 0.5;

/** One official benefit rate, paid for ages fromAge..toAge inclusive (annual amounts). */
export interface BenefitRate { fromAge: number; toAge: number; first: number; additional: number }

export interface ChildCostData {
  /** Annual everyday cost per child at the 'average' level, by band (today's money). */
  bands: Record<Band, number>;
  /** Multipliers applied to the bands for each spending level. */
  levels: Record<Level, number>;
  /** Official child benefit schedule (annual, maximum rate). */
  benefits: BenefitRate[];
}

export interface ChildCostInputs {
  children: number;          // 1..6
  level: Level;
  careYears: number;         // years of pre-school childcare, from age 1 (0..5)
  careType: CareType;
  careAnnual: number;        // full-time childcare price per year, before subsidy
  careSubsidyPct: number;    // 0..100, subsidy / funded hours as a share of the price
  housing: boolean;          // add a housing share per child
  housingAnnual: number;     // housing share per child per year
  inflationPct: number;      // annual, applied from age 1 onwards
  includeBenefits: boolean;
}

export interface ChildCostYear {
  age: number;
  band: Band;
  everyday: number;
  childcare: number;
  housing: number;
  gross: number;
  benefits: number;
  net: number;
}

export interface ChildCostResults {
  rows: ChildCostYear[];      // all children combined, nominal (with inflation)
  gross: number;              // total before benefits, nominal
  benefits: number;           // total benefits offset, nominal
  net: number;                // gross − benefits (benefits only when included)
  perYear: number;            // net / 18
  perMonth: number;           // net / 216
  grossToday: number;         // gross in today's money (no inflation), all children
  netToday: number;
  perChildGrossToday: number; // comparison basis against a published headline
  byPart: { everyday: number; childcare: number; housing: number };
}

export function bandFor(age: number): Band {
  if (age <= BAND_AGES.early[1]) return 'early';
  if (age <= BAND_AGES.middle[1]) return 'middle';
  return 'teen';
}

/** Annual benefit for one child at `age`; `eldest` picks the first-child rate. */
export function benefitAt(schedule: BenefitRate[], age: number, eldest: boolean): number {
  const r = schedule.find((b) => age >= b.fromAge && age <= b.toAge);
  if (!r) return 0;
  return eldest ? r.first : r.additional;
}

function careShare(type: CareType): number {
  return type === 'full' ? 1 : type === 'part' ? PART_TIME_SHARE : 0;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

export function computeChildCost(input: ChildCostInputs, data: ChildCostData): ChildCostResults {
  const children = Math.round(clamp(input.children, 1, 6));
  const careYears = Math.round(clamp(input.careYears, 0, 5));
  const subsidy = clamp(input.careSubsidyPct, 0, 100) / 100;
  const infl = clamp(input.inflationPct, -5, 20) / 100;
  const mult = data.levels[input.level] ?? 1;
  const careYear = Math.max(0, input.careAnnual) * careShare(input.careType) * (1 - subsidy);
  const housingYear = input.housing ? Math.max(0, input.housingAnnual) : 0;

  const rows: ChildCostYear[] = [];
  let grossToday = 0;
  let netToday = 0;
  const byPart = { everyday: 0, childcare: 0, housing: 0 };

  for (let age = 0; age < YEARS; age++) {
    const band = bandFor(age);
    const f = Math.pow(1 + infl, age);
    const everyday1 = data.bands[band] * mult;
    const childcare1 = age >= 1 && age <= careYears ? careYear : 0;
    const benefitTotal = input.includeBenefits
      ? benefitAt(data.benefits, age, true) + (children - 1) * benefitAt(data.benefits, age, false)
      : 0;

    const everyday = everyday1 * children;
    const childcare = childcare1 * children;
    const housing = housingYear * children;
    const grossT = everyday + childcare + housing;

    grossToday += grossT;
    netToday += grossT - benefitTotal;
    byPart.everyday += everyday * f;
    byPart.childcare += childcare * f;
    byPart.housing += housing * f;

    const gross = grossT * f;
    const benefits = benefitTotal * f;
    rows.push({
      age, band,
      everyday: everyday * f, childcare: childcare * f, housing: housing * f,
      gross, benefits, net: gross - benefits,
    });
  }

  const gross = rows.reduce((a, r) => a + r.gross, 0);
  const benefits = rows.reduce((a, r) => a + r.benefits, 0);
  const net = gross - benefits;

  return {
    rows, gross, benefits, net,
    perYear: net / YEARS,
    perMonth: net / (YEARS * 12),
    grossToday, netToday,
    perChildGrossToday: grossToday / children,
    byPart,
  };
}

/**
 * Relative weight of each band when a source gives only an all-age figure
 * (our assumption: every banded source in the research — MESL, CPAG — shows
 * older children costing more). 5×0.85 + 7×1 + 6×1.2 = 18.45 band-years.
 */
export const BAND_WEIGHTS: Record<Band, number> = { early: 0.85, middle: 1, teen: 1.2 };

/** Sum of years × band weight — used to spread an all-in annual average across bands. */
export function bandYears(weights: Record<Band, number>): number {
  return (Object.keys(BAND_AGES) as Band[]).reduce((a, b) => {
    const [lo, hi] = BAND_AGES[b];
    return a + (hi - lo + 1) * weights[b];
  }, 0);
}
