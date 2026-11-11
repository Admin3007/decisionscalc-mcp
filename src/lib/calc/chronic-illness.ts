/**
 * Chronic Illness true annual cost — pure calculation logic.
 *
 * Extracted from src/pages/tools/chronic-illness-cost.astro (CONTRACTS §4).
 * Country differences (NHS = £0 direct care) are expressed purely through the
 * input values (the page's data pack sets premiums/copays to 0 for the UK), so
 * no country branching is needed here. Includes indirect work/income impact
 * (absenteeism + presenteeism), the cost people most often overlook.
 */

export interface ChronicIllnessInputs {
  monthlyPremium: number;
  specialistVisits: number;
  specialistCopay: number;
  labTests: number;
  labCost: number;
  rxMonthly: number;
  suppliesAnnual: number;
  otcMonthly: number;
  annualSalary: number;
  sickDays: number;
  productivityLoss: number; // percent
  mentalHealth: number;     // visits
  mhCopay: number;
  transport: number;
  dietExtra: number;        // monthly
}

export interface ChronicIllnessResults {
  premiums: number;
  specialists: number;
  labs: number;
  rx: number;
  supplies: number;
  otc: number;
  absenteeism: number;
  presenteeism: number;
  workImpact: number;
  mhCost: number;
  transport: number;
  diet: number;
  total: number;
  maxVal: number;
}

const WORK_DAYS = 260;

export function computeChronicIllness(input: ChronicIllnessInputs): ChronicIllnessResults {
  const premiums = input.monthlyPremium * 12;
  const specialists = input.specialistVisits * input.specialistCopay;
  const labs = input.labTests * input.labCost;
  const rx = input.rxMonthly * 12;
  const supplies = input.suppliesAnnual;
  const otc = input.otcMonthly * 12;
  const mhCost = input.mentalHealth * input.mhCopay;
  const diet = input.dietExtra * 12;

  const dailyRate = input.annualSalary / WORK_DAYS;
  const absenteeism = input.sickDays * dailyRate;
  const presenteeism = input.annualSalary * (input.productivityLoss / 100) * 0.5;
  const workImpact = absenteeism + presenteeism;

  const values = [premiums, specialists, labs, rx, supplies, otc, workImpact, mhCost, input.transport, diet];
  const total = values.reduce((a, b) => a + b, 0);
  const maxVal = Math.max(...values, 1);

  return {
    premiums, specialists, labs, rx, supplies, otc, absenteeism, presenteeism, workImpact,
    mhCost, transport: input.transport, diet, total, maxVal,
  };
}
