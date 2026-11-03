/**
 * "What can I claim? Ireland": one household, every main support, using the tested calculators.
 * Extra official figures (citizensinformation.ie, read 2026-11-03):
 *  - Child Benefit €140 a month per child (under 16, or 16–18 in full-time education); universal.
 *  - New Baby Grant €280 per child, with the first Child Benefit, for births from 1 December 2024.
 *  - Fuel Allowance €38 a week, €43 from the week of 4 January 2027 (Budget 2027); WFP recipients meet its
 *    means test automatically; otherwise for people 66+ or on a qualifying payment, means-tested.
 *  - Rent Tax Credit (Revenue / Budget 2027): €1,000 single / €2,000 couple in 2026, €1,150 / €2,300 in 2027.
 */
import { computeWfp } from './ie-wfp';
import { computeCarer, type Period } from './ie-carers';
import { computeTca, MAX_RATE } from './ie-state-pension';
import { BENEFIT_WEEKLY, MATERNITY_WEEKS } from './ie-parental-leave';
import { RULES, type Year } from './ie-budget-2027';

export const CHILD_BENEFIT_MONTHLY = 140;
export const NEW_BABY_GRANT = 280;
export const FUEL_WEEKLY: Record<Year, number> = { 2026: 38, 2027: 43 };

export interface HouseholdIn {
  year: Year;
  aged66: boolean;
  couple: boolean;
  children: number;           // children getting Child Benefit
  expecting: boolean;
  pay1: number; pay2: number; // gross a year
  hoursFortnight: number;     // combined, for WFP
  caring: boolean;            // full-time carer for someone
  renter: boolean;
  savings: number;
  prsiYears: number;          // paid PRSI years (for State Pension)
}

export interface Item { id: string; name: string; status: 'yes' | 'likely' | 'check' | 'no'; amount: string; detail: string; tool?: string; apply: string }

const eur = (v: number) => `€${v.toLocaleString('en-IE', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

export function checkEntitlements(h: HouseholdIn): { items: Item[]; yearlyTotal: number } {
  const year: Year = h.year === 2027 ? 2027 : 2026;
  const items: Item[] = [];
  let yearly = 0;
  const kids = Math.floor(n(h.children));
  const pay1 = n(h.pay1), pay2 = h.couple ? n(h.pay2) : 0;

  if (kids > 0) {
    const m = CHILD_BENEFIT_MONTHLY * kids;
    yearly += m * 12;
    items.push({ id: 'child-benefit', name: 'Child Benefit', status: 'yes', amount: `${eur(m)} a month`, detail: `€140 a month for each of your ${kids} child${kids > 1 ? 'ren' : ''}. Not means-tested.`, apply: 'https://www.gov.ie/en/service/f14140-child-benefit/' });
  }
  if (h.expecting) {
    items.push({ id: 'new-baby', name: 'New Baby Grant', status: 'yes', amount: eur(NEW_BABY_GRANT), detail: 'Paid with the first month of Child Benefit for the new baby (€560 for twins). Child Benefit for the baby adds €140 a month.', apply: 'https://www.gov.ie/en/service/f14140-child-benefit/' });
    if (pay1 > 0 || pay2 > 0) {
      const total = BENEFIT_WEEKLY[year] * MATERNITY_WEEKS;
      items.push({ id: 'maternity', name: 'Maternity Benefit (and Paternity / Parent’s Benefit)', status: 'likely', amount: `${eur(BENEFIT_WEEKLY[year])} a week`, detail: `For 26 weeks (${eur(total)}) if you have enough PRSI; 2 weeks of Paternity Benefit and 9 weeks of Parent’s Benefit each at the same rate. Taxed, but no USC or PRSI.`, tool: '/tools/ireland-maternity-benefit-calculator/', apply: 'https://services.mywelfare.ie/' });
    }
  }
  let wfpWeekly = 0;
  if (kids > 0 && (pay1 > 0 || pay2 > 0) && !h.aged66) {
    const w = computeWfp({ year, children: kids, couple: h.couple, pay1, pay2, hoursFortnight: h.hoursFortnight });
    wfpWeekly = w.weekly;
    if (w.weekly > 0) { yearly += w.yearly; items.push({ id: 'wfp', name: 'Working Family Payment', status: 'likely', amount: `${eur(w.weekly)} a week`, detail: `Your estimated income of ${eur(w.assessableWeekly)} a week is under the ${eur(w.limit)} limit for your family. Tax-free, paid for 52 weeks. You must apply.`, tool: '/tools/ireland-working-family-payment-calculator/', apply: 'https://services.mywelfare.ie/en/topics/parents-children-family/working-family-payment/' }); }
    else items.push({ id: 'wfp', name: 'Working Family Payment', status: 'no', amount: '—', detail: w.eligibleHours ? `Your estimated income is above the ${eur(w.limit)} a week limit for your family.` : 'You need to work at least 38 hours a fortnight between you.', tool: '/tools/ireland-working-family-payment-calculator/', apply: 'https://services.mywelfare.ie/en/topics/parents-children-family/working-family-payment/' });
  }
  let carerWeekly = 0;
  if (h.caring) {
    const period: Period = year === 2027 ? 'h1-2027' : 'h2-2026';
    const c = computeCarer({ period, aged66: h.aged66, caringForTwoOrMore: false, couple: h.couple, earn1: pay1 / 52, earn2: pay2 / 52, capital: n(h.savings) });
    carerWeekly = c.weekly;
    if (c.weekly > 0) { yearly += c.yearly; items.push({ id: 'carers', name: 'Carer’s Allowance', status: 'likely', amount: `${eur(c.weekly)} a week`, detail: `If you care full-time for someone who needs it. Weekly means assessed: ${eur(c.means)}. You also get the Carer’s Support Grant each June.`, tool: '/tools/ireland-carers-allowance-calculator/', apply: 'https://services.mywelfare.ie/' }); }
    else items.push({ id: 'carers', name: 'Carer’s Allowance', status: 'no', amount: '—', detail: 'Your household means are above the limit. You may still get the Carer’s Support Grant: check with the Department.', tool: '/tools/ireland-carers-allowance-calculator/', apply: 'https://services.mywelfare.ie/' });
  }
  if (h.aged66) {
    const t = computeTca({ paid: n(h.prsiYears) * 52, credits: 0, homeCaring: 0, maxRate: year === 2027 ? MAX_RATE['2027-66'] : MAX_RATE['2026-66'] });
    if (t.qualifies) { yearly += t.yearly; items.push({ id: 'pension', name: 'State Pension (Contributory)', status: 'likely', amount: `${eur(t.weekly)} a week`, detail: `From ${n(h.prsiYears)} years of paid PRSI (${t.pct}% of the maximum). Credits and HomeCaring Periods can raise it.`, tool: '/tools/ireland-state-pension-calculator/', apply: 'https://services.mywelfare.ie/' }); }
    else items.push({ id: 'pension', name: 'State Pension (Contributory)', status: 'check', amount: '—', detail: 'You need at least 10 years of paid PRSI. If you have less, the means-tested State Pension (Non-Contributory) may apply.', tool: '/tools/ireland-state-pension-calculator/', apply: 'https://services.mywelfare.ie/' });
  }
  if (wfpWeekly > 0 || carerWeekly > 0 || h.aged66) {
    items.push({ id: 'fuel', name: 'Fuel Allowance', status: wfpWeekly > 0 ? 'likely' : 'check', amount: `${eur(FUEL_WEEKLY[year])} a week in the heating season`, detail: wfpWeekly > 0 ? 'Getting the Working Family Payment means you meet the Fuel Allowance means test; it is paid automatically if no one else in the home gets it.' : 'You may qualify, subject to a means test and who you live with.', tool: '/tools/ireland-fuel-allowance-calculator/', apply: 'https://www.citizensinformation.ie/en/social-welfare/extra-social-welfare-benefits/fuel-allowance/' });
  }
  if (h.renter && (pay1 > 0 || pay2 > 0)) {
    const credit = h.couple ? RULES[year].rent.couple : RULES[year].rent.single;
    items.push({ id: 'rent-credit', name: 'Rent Tax Credit', status: 'likely', amount: `up to ${eur(credit)} a year`, detail: 'Cuts your income tax if you rent your home: 20% of the rent you pay, up to the limit. You can also claim back for 2022 to 2025; claims for 2022 close on 31 December 2026.', tool: '/tools/ireland-rent-tax-credit-calculator/', apply: 'https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/land-and-property/rent-credit/how-to-claim.aspx' });
  }
  return { items, yearlyTotal: Math.round(yearly) };
}
