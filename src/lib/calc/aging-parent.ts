/**
 * Aging Parent care cost — pure calculation logic.
 *
 * Extracted from src/pages/tools/aging-parent-planner.astro (CONTRACTS §4).
 * Regional care-cost tables (STATE_COSTS / UK_COSTS) and labels stay in the
 * page and move to the data pack in Step 1.4 — the page resolves `baseCare`
 * (the annual cost for the chosen care type/region, or 0 for family care) and
 * passes it in. `coveragePct` represents insurance / Medicaid / NHS / local-
 * authority funding that offsets the base cost.
 */

export interface AgingParentInputs {
  baseCare: number;        // resolved annual facility/care cost (0 for family care)
  coveragePct: number;     // percent covered by insurer / NHS / local authority
  medMonthly: number;
  doctorVisits: number;
  visitCopay: number;
  adaptationsTotal: number; // one-time home adaptations (amortized over years)
  years: number;
  caregiverSalary: number;
  workReduction: number;    // hours/week reduced
}

export interface AgingParentResults {
  netCare: number;
  medical: number;
  adaptations: number;     // annualized
  careerImpact: number;
  total: number;           // annual
  maxVal: number;
}

export function computeAgingParent(input: AgingParentInputs): AgingParentResults {
  const netCare = input.baseCare * (1 - input.coveragePct / 100);
  const medical = input.medMonthly * 12 + input.doctorVisits * input.visitCopay;
  const adaptations = input.adaptationsTotal / Math.max(input.years, 1);
  const careerImpact = input.caregiverSalary > 0
    ? (input.workReduction / 40) * input.caregiverSalary
    : 0;

  const values = [netCare, medical, adaptations, careerImpact];
  const total = values.reduce((a, b) => a + b, 0);
  const maxVal = Math.max(...values, 1);

  return { netCare, medical, adaptations, careerImpact, total, maxVal };
}
