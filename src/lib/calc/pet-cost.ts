/**
 * Pet Cost (year one / annual / lifetime) — pure calculation logic.
 *
 * Extracted from src/pages/tools/pet-cost-calculator.astro (CONTRACTS §4).
 * Country tables (PET_DATA_SETS, INS_SETS) stay in the page and move to the
 * data pack in Step 1.4 — the page resolves the per-species data tuple and the
 * insurance figure and passes them in. CARE (care-level multipliers) is a
 * methodology constant and lives here. The page owns the year1/annual/lifetime
 * tab presentation; this module returns the numeric components.
 */

export const CARE: Record<string, number> = { basic: 0.75, standard: 1.0, premium: 1.45 };

export interface PetData {
  lifespan: number;
  foodB: number;   // basic food / yr
  foodS: number;   // standard
  foodP: number;   // premium
  vetAnn: number;
  groomAnn: number;
  setupOT: number; // one-time setup
}

export interface PetInputs {
  type: string;
  petAge: number;
  careKey: string;
  acqCost: number;
  walkerAnnual: number;   // dog walker / daycare, annualized
  boarding: number;
  insurance: number;      // resolved annual premium for the active country
  petData: PetData;
}

export interface PetResults {
  food: number;
  grooming: number;
  vet: number;
  insurance: number;
  toysMisc: number;
  emergency: number;
  training: number;
  setupOT: number;
  annualRecur: number;
  yearOne: number;
  yearsLeft: number;
  lifetime: number;
}

export function computePetCost(input: PetInputs): PetResults {
  const { type, petAge, careKey, acqCost, walkerAnnual, boarding, insurance, petData } = input;
  const careMult = CARE[careKey] ?? 1.0;

  const foodMap: Record<string, number> = { basic: petData.foodB, standard: petData.foodS, premium: petData.foodP };
  const food = (foodMap[careKey] || petData.foodS) * careMult;
  const grooming = petData.groomAnn * careMult;
  const vet = petData.vetAnn;
  const toysMisc = type.startsWith('dog') ? 300 * careMult : type === 'cat' ? 150 : 80;
  const emergency = type.startsWith('dog') ? 400 : type.includes('cat') ? 300 : 100;
  const training = (type.startsWith('dog') && petAge < 2) ? 400 : 0;

  const annualRecur = food + grooming + vet + insurance + toysMisc + walkerAnnual + boarding + emergency;
  const yearOne = annualRecur + acqCost + petData.setupOT + training;
  const yearsLeft = Math.max(1, petData.lifespan - petAge);
  const lifetime = yearOne + annualRecur * (yearsLeft - 1);

  return {
    food, grooming, vet, insurance, toysMisc, emergency, training, setupOT: petData.setupOT,
    annualRecur, yearOne, yearsLeft, lifetime,
  };
}
