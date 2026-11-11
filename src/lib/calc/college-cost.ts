/**
 * College True Cost — pure calculation logic.
 *
 * Extracted from src/pages/tools/college-cost-calculator.astro (CONTRACTS §4).
 * No DOM. The country-aware school-type defaults (schoolDefaults) stay in the
 * page for now and move to the data pack in Step 1.4. `roomBoard` is resolved
 * by the page (0 if living at home) before being passed here.
 *
 * Includes the often-ignored opportunity cost of foregone earnings and a
 * 10-year standard loan amortization on the balance-at-graduation.
 */

export interface CollegeInputs {
  years: number;
  annualTuition: number;
  annualGrants: number;
  roomBoard: number;        // per year; page passes 0 when living at home
  booksSupplies: number;
  transportation: number;
  annualLoans: number;
  loanRate: number;         // annual percent
  opportunityWage: number;  // foregone annual income while studying
}

export interface CollegeResults {
  totalTuition: number;
  totalRoomBoard: number;
  totalBooks: number;
  totalTransportation: number;
  totalOpportunityCost: number;
  totalInterest: number;
  totalLoanBalance: number;
  loanAtGrad: number;
  monthlyPayment: number;
  total: number;
  directCost: number;       // excludes opportunity cost
  maxVal: number;
  oppShare: number;         // opportunity cost as % of total
  debtToSalary: number;     // loan balance ÷ expected annual salary
}

const REPAYMENT_MONTHS = 120; // 10-year standard

export function computeCollegeCost(input: CollegeInputs): CollegeResults {
  const { years, annualTuition, annualGrants, roomBoard, booksSupplies, transportation, annualLoans, opportunityWage } = input;
  const loanRate = input.loanRate / 100;

  const netTuition = Math.max(0, annualTuition - annualGrants);
  const totalTuition = netTuition * years;
  const totalRoomBoard = roomBoard * years;
  const totalBooks = booksSupplies * years;
  const totalTransportation = transportation * years;
  const totalOpportunityCost = opportunityWage * years;

  // Loan: capitalize in-school interest, then amortize over 10 years.
  const totalLoanBalance = annualLoans * years;
  const inSchoolInterest = totalLoanBalance * loanRate * (years / 2);
  const loanAtGrad = totalLoanBalance + inSchoolInterest;
  const mr = loanRate / 12;
  const monthlyPayment = mr === 0
    ? loanAtGrad / REPAYMENT_MONTHS
    : loanAtGrad * (mr * Math.pow(1 + mr, REPAYMENT_MONTHS)) / (Math.pow(1 + mr, REPAYMENT_MONTHS) - 1);
  const totalRepaid = monthlyPayment * REPAYMENT_MONTHS;
  const totalInterest = totalRepaid - loanAtGrad;

  const values = [totalTuition, totalRoomBoard, totalBooks, totalTransportation, totalInterest, totalOpportunityCost];
  const total = values.reduce((a, b) => a + b, 0);
  const directCost = totalTuition + totalRoomBoard + totalBooks + totalTransportation;
  const maxVal = Math.max(...values, 1);
  const oppShare = total > 0 ? Math.round((totalOpportunityCost / total) * 100) : 0;
  const debtToSalary = opportunityWage > 0 ? totalLoanBalance / opportunityWage : Infinity;

  return {
    totalTuition, totalRoomBoard, totalBooks, totalTransportation, totalOpportunityCost,
    totalInterest, totalLoanBalance, loanAtGrad, monthlyPayment, total, directCost, maxVal,
    oppShare, debtToSalary,
  };
}

/**
 * Overhaul C10: what the same course costs when it starts `yearsUntil` years from now, if costs grow `growthPct` a
 * year. Each study year is grown to the year it is paid: sum of perYear × (1 + g)^(yearsUntil + i).
 */
export function projectCollegeCost(perYear: number, years: number, yearsUntil: number, growthPct: number): number {
  const g = growthPct / 100;
  let total = 0;
  for (let i = 0; i < years; i++) total += perYear * Math.pow(1 + g, Math.max(0, yearsUntil) + i);
  return Math.round(total);
}
