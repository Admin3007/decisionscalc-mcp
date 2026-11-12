/**
 * Irish farm transfer: CAT, CGT and stamp duty on passing a farm by gift or inheritance, with and without the farm
 * reliefs, the clawback periods to keep them, and the s.104 credit of CGT against CAT. Pure + tested.
 *
 * Rules (decisionscalc-apps radar/decisionscalc/IE-FARM-SUCCESSION-FACTS.md, read 12 Nov 2026; Revenue Tax and Duty
 * Manuals, Finance (No. 2) Bill 2026):
 *  - CAT 33% over the group threshold, aggregated with earlier benefits in the same group since 5 Dec 1991
 *    (thresholds and rate from ./ie-cat.ts: Group A €420,000 from 7 Oct 2026). €3,000 small gift exemption on gifts.
 *  - Agricultural relief (s.89 CATCA): taxable value of agricultural property cut by 90% if (a) agricultural property is
 *    at least 80% of the beneficiary's gross assets on the valuation date (asset test) and (b) they farm it actively for
 *    6 years (qualification or at least 50% of working time) or lease it to someone who does. Clawback if sold within
 *    6 years without reinvesting within 1 year, or if active farming stops.
 *  - CGT on a gift (death is not a disposal): 31% from 7 Oct 2026 (33% before; ./ie-cgt.ts). Retirement relief for a
 *    disponer aged 55+ who owned and used the farm 10 years: s.599 to a child, capped from 1 Jan 2025 at €10m of value
 *    (ages 55-69; tax above it deferrable, falls away unless the child sells within 12 years) or €3m (70+); 2014-2024
 *    unlimited to 65 and €3m from 66. Above the cap CGT is charged as if the consideration were the cap. s.598 to
 *    others: full relief up to €750,000 of lifetime consideration (55-69) or €500,000 (70+); above it the tax is limited
 *    to half the excess. s.599 relief is clawed back from the child on a disposal within 6 years.
 *  - s.104 CATCA: CGT paid on the same event is credited against the CAT on the same property (lost if the property is
 *    disposed of within 2 years).
 *  - Stamp duty on a gift: farmland 7.5% (non-residential); a farmhouse at residential rates (1% to €1m, 2% to €1.5m,
 *    6% above). Consanguinity relief (deeds to 31 Dec 2028): land between related persons at 1% if farmed for 6 years.
 *    Young trained farmer relief (deeds to 31 Dec 2029): transferee under 35 with a qualification (or within 3 years) and
 *    a Teagasc business plan pays no duty on the land and farmhouse, within a €100,000 lifetime State aid cap that
 *    excludes the consanguinity part. Inheritances: no CGT and normally no stamp duty.
 * Not modelled (said on the page): business relief, favourite nephew relief (Group A for a nephew or niece who worked on
 * the farm), development land, partnerships and company shares, the Succession Farm Partnership credit, indexation of
 * the base cost (enter it indexed).
 */
import { RATE as CAT_RATE, SMALL_GIFT, thresholdFor, type Group } from './ie-cat';
import { rateFor } from './ie-cgt';

export type Route = 'gift' | 'inheritance';
/** child = Group A; relative = Group B (brother, sister, nephew, niece, grandchild, parent taking a gift); other = Group C. */
export type Relationship = 'child' | 'relative' | 'other';
export const GROUP: Record<Relationship, Group> = { child: 'A', relative: 'B', other: 'C' };

export const AG_RELIEF = 0.9;
export const ASSET_TEST = 0.8;
export const RESIDENTIAL_BANDS: [number, number][] = [[1_000_000, 0.01], [1_500_000, 0.02], [Infinity, 0.06]];
export const LAND_RATE = 0.075;
export const CONSANGUINITY_RATE = 0.01;
export const CONSANGUINITY_TO = '2028-12-31';
export const YTF_TO = '2029-12-31';
export const YTF_CAP = 100_000;

export interface FarmInput {
  route: Route;
  /** Date of the gift, or the valuation date of the inheritance (ISO). */
  date: string;
  relationship: Relationship;
  /** Farmland, farm buildings, machinery and livestock (market value). */
  landValue: number;
  /** The farmhouse, if it passes with the farm. */
  farmhouseValue?: number;
  /** Anything else in the same gift or inheritance (cash, shares, a rental property). */
  otherValue?: number;
  /** The beneficiary's own assets before the transfer (gross; a mortgage on their own home may be deducted). */
  beneficiaryAssets?: number;
  /** The beneficiary will farm actively for 6 years (qualification or 50% of working time) or lease to an active farmer. */
  activeFarmer: boolean;
  /** Earlier taxable gifts and inheritances in the same group since 5 Dec 1991. */
  priorBenefits?: number;
  /** Gift only: the parent's (or owner's) age on the date of the gift, and the farm's base cost (indexed if bought before 2003). */
  disponerAge?: number;
  baseCost?: number;
  ownedAndUsed10Years?: boolean;
  /** Gift only: earlier transfers to children from 1 Jan 2025 (s.599 cap) or lifetime consideration to others (s.598). */
  priorRelievedTransfers?: number;
  /** Gift only: the transferee is under 35 with a qualification (or getting one within 3 years) and a Teagasc business plan. */
  youngTrainedFarmer?: boolean;
  /** Young trained farmer relief already used (State aid, counts toward the €100,000 cap). */
  priorStateAid?: number;
}

export interface TaxLine { without: number; with: number; note: string }
export interface FarmResult {
  group: Group;
  threshold: number;
  assetTestShare: number;
  agReliefApplies: boolean;
  cat: TaxLine;
  cgt: TaxLine & { relief: 's599' | 's598' | 'none'; deferrable: number };
  s104Credit: number;
  stampDuty: TaxLine & { consanguinity: boolean; ytf: boolean; stateAid: number };
  totalWithout: number;
  totalWith: number;
  saved: number;
  keepFor: { years: number; what: string }[];
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

/** CAT on this benefit, aggregated with earlier benefits in the group. */
function catOn(taxable: number, prior: number, threshold: number): number {
  return r2(CAT_RATE * (Math.max(0, prior + taxable - threshold) - Math.max(0, prior - threshold)));
}

/** s.599 cap (market value relieved) for a disponer of this age on this date; Infinity = unlimited. */
export function s599Cap(age: number, date: string): number {
  if (date < '2014-01-01') return Infinity;
  if (date < '2025-01-01') return age >= 66 ? 3_000_000 : Infinity;
  return age >= 70 ? 3_000_000 : 10_000_000;
}
/** s.598 lifetime consideration threshold. */
export function s598Threshold(age: number, date: string): number {
  if (date < '2025-01-01') return age >= 66 ? 500_000 : 750_000;
  return age >= 70 ? 500_000 : 750_000;
}

export function residentialDuty(value: number): number {
  let due = 0, lo = 0;
  for (const [top, rate] of RESIDENTIAL_BANDS) { if (value > lo) due += (Math.min(value, top) - lo) * rate; lo = top; }
  return r2(due);
}

/** CGT on a gift to a child (s.599) or another person (s.598), with retirement relief. Returns tax due and any deferrable part. */
export function retirementReliefCgt(o: { value: number; gain: number; rate: number; age: number; date: string; toChild: boolean; prior: number; qualifies: boolean }): { due: number; deferrable: number; relief: 's599' | 's598' | 'none' } {
  const full = r2(o.rate * Math.max(0, o.gain));
  if (!o.qualifies || o.age < 55 || o.gain <= 0) return { due: full, deferrable: 0, relief: 'none' };
  if (o.toChild) {
    const cap = s599Cap(o.age, o.date);
    if (cap === Infinity) return { due: 0, deferrable: 0, relief: 's599' };
    const left = Math.max(0, cap - o.prior);
    const due = r2(o.rate * Math.max(0, Math.min(o.gain, o.value - left)));
    // The excess over €10m (ages 55-69, from 2025) can be deferred; the 70+ €3m excess cannot.
    const deferrable = o.date >= '2025-01-01' && o.age < 70 ? due : 0;
    return { due, deferrable, relief: 's599' };
  }
  const threshold = s598Threshold(o.age, o.date);
  const total = o.prior + o.value;
  if (total <= threshold) return { due: 0, deferrable: 0, relief: 's598' };
  return { due: r2(Math.min(full, 0.5 * (total - threshold))), deferrable: 0, relief: 's598' };
}

export function computeFarm(i: FarmInput): FarmResult {
  const land = n(i.landValue), house = n(i.farmhouseValue), other = n(i.otherValue), own = n(i.beneficiaryAssets);
  const agri = land + house;
  const group = GROUP[i.relationship] ?? 'C';
  const threshold = thresholdFor(group, i.date);
  const prior = n(i.priorBenefits);
  const gift = i.route === 'gift';

  // CAT
  const assetTestShare = agri + other + own > 0 ? agri / (agri + other + own) : 0;
  const agReliefApplies = agri > 0 && assetTestShare >= ASSET_TEST && i.activeFarmer;
  const small = gift ? SMALL_GIFT : 0;
  const taxableWithout = Math.max(0, agri + other - small);
  const taxableWith = Math.max(0, agri * (agReliefApplies ? 1 - AG_RELIEF : 1) + other - small);
  const catWithout = catOn(taxableWithout, prior, threshold);
  const catWithBefore = catOn(taxableWith, prior, threshold);

  // CGT (gifts only)
  const cgtRate = rateFor(i.date);
  const gain = gift ? agri - n(i.baseCost) : 0;
  const cgtWithout = gift ? r2(cgtRate * Math.max(0, gain)) : 0;
  const rr = gift
    ? retirementReliefCgt({ value: agri, gain, rate: cgtRate, age: n(i.disponerAge), date: i.date, toChild: i.relationship === 'child', prior: n(i.priorRelievedTransfers), qualifies: i.ownedAndUsed10Years !== false })
    : { due: 0, deferrable: 0, relief: 'none' as const };

  // s.104: CGT on the same event against the CAT on the same property (the farm's share of the CAT).
  const farmShare = taxableWith > 0 ? Math.min(1, (taxableWith - other > 0 ? taxableWith - other : 0) / taxableWith) : 0;
  const s104Credit = r2(Math.min(rr.due, catWithBefore * farmShare));
  const s104Without = r2(Math.min(cgtWithout, catWithout * (taxableWithout > 0 ? Math.min(1, Math.max(0, taxableWithout - other) / taxableWithout) : 0)));
  const catWith = r2(catWithBefore - s104Credit);
  const catWithoutNet = r2(catWithout - s104Without);

  // Stamp duty (gifts only)
  let sdWithout = 0, sdWith = 0, stateAid = 0, consanguinity = false, ytf = false;
  if (gift) {
    const landFull = r2(land * LAND_RATE), houseDuty = residentialDuty(house);
    sdWithout = r2(landFull + houseDuty);
    consanguinity = i.relationship !== 'other' && i.activeFarmer && i.date <= CONSANGUINITY_TO;
    const landDuty = consanguinity ? r2(land * CONSANGUINITY_RATE) : landFull;
    let due = r2(landDuty + houseDuty);
    // Young trained farmer relief needs the transferee to farm the land (at least half their working time) for 5 years.
    if (i.youngTrainedFarmer && i.activeFarmer && i.date <= YTF_TO) {
      stateAid = r2(Math.min(due, Math.max(0, YTF_CAP - n(i.priorStateAid))));
      ytf = stateAid > 0;
      due = r2(due - stateAid);
    }
    sdWith = due;
  }

  const keepFor: { years: number; what: string }[] = [];
  if (agReliefApplies) keepFor.push({ years: 6, what: 'Agricultural relief: keep the land (or reinvest the proceeds in farmland within 1 year) and keep farming it or leasing it to an active farmer for 6 years from the valuation date, or the CAT relieved is clawed back.' });
  if (gift && rr.relief === 's599' && cgtWithout > rr.due) keepFor.push({ years: 6, what: 'CGT retirement relief: if your child sells the farm within 6 years, the CGT relieved on your transfer is charged to them.' });
  if (rr.deferrable > 0) keepFor.push({ years: 12, what: 'The CGT on the value above €10 million is deferred and falls away unless your child sells within 12 years.' });
  if (gift && consanguinity) keepFor.push({ years: 6, what: 'Consanguinity relief: the land must be farmed (by them or a lessee who qualifies) for 6 years, or the full 7.5% is due with interest.' });
  if (ytf) keepFor.push({ years: 5, what: 'Young trained farmer relief: keep the land and farm it at least half your working time for 5 years (the qualification within 3 years).' });
  if (s104Credit > 0) keepFor.push({ years: 2, what: 'The CGT credit against CAT is lost if the farm is disposed of within 2 years.' });

  const totalWithout = r2(catWithoutNet + cgtWithout + sdWithout);
  const totalWith = r2(catWith + rr.due + sdWith);
  return {
    group, threshold, assetTestShare: Math.round(assetTestShare * 1000) / 1000, agReliefApplies,
    cat: { without: catWithoutNet, with: catWith, note: agReliefApplies ? 'Agricultural relief cuts the farm’s taxable value by 90%.' : agri > 0 && !i.activeFarmer ? 'No agricultural relief: the beneficiary must farm actively or lease to an active farmer for 6 years.' : agri > 0 && assetTestShare < ASSET_TEST ? `No agricultural relief: farm assets are ${Math.round(assetTestShare * 100)}% of the beneficiary’s assets, under the 80% test.` : '' },
    cgt: { without: cgtWithout, with: rr.due, relief: rr.relief, deferrable: rr.deferrable, note: !gift ? 'No CGT on an inheritance: death is not a disposal.' : rr.relief === 'none' ? (n(i.disponerAge) < 55 ? 'No retirement relief under 55.' : 'No retirement relief: the farm must have been owned and used for 10 years.') : '' },
    s104Credit,
    stampDuty: { without: sdWithout, with: sdWith, consanguinity, ytf, stateAid, note: gift ? '' : 'No stamp duty in the normal case on an inheritance.' },
    totalWithout, totalWith, saved: r2(totalWithout - totalWith), keepFor,
  };
}

/** The page's worked example: a parent aged 64 gives a €1.5m farm (€1.2m land and buildings, €300,000 farmhouse) to a qualified daughter aged 30. */
export const EXAMPLE: FarmInput = {
  route: 'gift', date: '2026-11-12', relationship: 'child', landValue: 1_200_000, farmhouseValue: 300_000, otherValue: 0,
  beneficiaryAssets: 50_000, activeFarmer: true, priorBenefits: 0, disponerAge: 64, baseCost: 200_000, ownedAndUsed10Years: true,
  priorRelievedTransfers: 0, youngTrainedFarmer: true, priorStateAid: 0,
};
