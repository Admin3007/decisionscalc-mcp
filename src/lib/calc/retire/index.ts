/**
 * "Can I retire at X?": year-by-year retirement engine (./engine.ts) with country rule packs (./ie.ts).
 * Add a country by writing its RulePack and registering it in PACKS; the engine and page code stay the same.
 */
import { ie, STATE_PENSION } from './ie';
import { gb } from './gb';
import { ca } from './ca';
import { au } from './au';
import type { PersonInput, PlanInput, RulePack } from './types';

export { project, compareRetireAges, earliestRetireAge, sustainableSpending, retirementTaxToday, normalise, statePensionAgeOf, ITER, CLOSE } from './engine';
export { GB_DEFAULT, GB_PARTNER } from './gb';
export { CA_DEFAULT, CA_PARTNER } from './ca';
export { AU_DEFAULT, AU_PARTNER } from './au';
export * from './types';

export const PACKS: Record<string, RulePack> = { ie, gb, ca, au };

/** A partner's starting values when couple mode is switched on. */
export const IE_PARTNER: PersonInput = {
  age: 55, retireAge: 60, salary: 40000, contribPct: 5, employerPct: 5, pensionPot: 80000, arf: 0,
  dbPension: 0, dbFromAge: 60, dbIndex: 0, dbLumpSum: 0, statePensionWeekly: STATE_PENSION.max2027,
};

/** The page's starting plan: a 55-year-old asking "can I retire at 60?" (askaboutmoney's most common question). */
export const IE_DEFAULT: PlanInput = {
  household: 'single',
  people: [{
    age: 55, retireAge: 60, salary: 70000, contribPct: 10, employerPct: 5, pensionPot: 350000, arf: 0,
    dbPension: 0, dbFromAge: 60, dbIndex: 0, dbLumpSum: 0, statePensionWeekly: STATE_PENSION.max2027,
  }],
  savings: 60000,
  savingsAdd: 5000,
  spending: 35000,
  growth: 4.5,
  savingsGrowth: 2.5,
  inflation: 2,
  payGrowth: 2.5,
  indexTax: true,
};
