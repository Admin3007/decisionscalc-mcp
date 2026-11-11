/**
 * Retirement projection, year by year from the first year (the pack's base year) to the pack's end age, for one
 * person or a couple. Country rules come from a RulePack (./ie.ts); nothing here is Irish.
 *
 * Each year, in this order (the paid spreadsheet, scripts/gen-retirement-planner.mjs, does exactly the same,
 * and tests/contracts/retirement-planner.test.ts checks the two agree):
 *  1. Pay until retireAge, with own and employer pension contributions into the pot (pot grows, then contributions).
 *  2. At drawAge the pot is drawn: a lump sum (taxed on the person's lifetime lump sums) goes to savings, the rest
 *     to the drawdown fund (ARF). A DB pension starts at its age, with its lump sum.
 *  3. The ARF grows; the minimum (imputed) drawdown is paid out; State Pension from the pack's age.
 *  4. Before person 1 retires, the household lives on its income and adds `savingsAdd` to savings.
 *     From retirement the spending target is paid from income after tax, then savings, then extra ARF drawdown
 *     grossed up for its tax (fixed-point: x = need + tax on x, ITER rounds and one closing step). What cannot be
 *     paid is the shortfall.
 * Money is nominal; `deflator` turns any figure into today's money (base-year euros).
 */
import type { PersonInput, PlanInput, PlanResult, RulePack, TaxPerson, YearRow } from './types';

export const ITER = 8;
/** Closing step divisor: net drawdown rises by at least 1 - top marginal rate (52%) per euro drawn, so /0.45 always covers the rest. */
export const CLOSE = 0.45;

const n = (v: unknown, lo = 0, hi = Infinity) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo;
};

const EMPTY: PersonInput = { age: 0, retireAge: 0, salary: 0, contribPct: 0, employerPct: 0, pensionPot: 0, dbPension: 0, dbFromAge: 0, dbIndex: 0, statePensionWeekly: 0, ukPensionWeekly: 0, ukPensionAge: 99 };

/** Inputs cleaned to safe ranges; a single household ignores any second person. */
export function normalise(p: PlanInput, pack: RulePack): PlanInput {
  const person = (q: PersonInput): PersonInput => {
    const age = Math.round(n(q.age, 18, pack.endAge - 1));
    const retireAge = Math.round(n(q.retireAge, 40, 75));
    return {
      age, retireAge, drawAge: Math.round(n(q.drawAge ?? retireAge, 50, 75)),
      salary: n(q.salary), contribPct: n(q.contribPct, 0, 100), employerPct: n(q.employerPct, 0, 100),
      pensionPot: n(q.pensionPot), arf: n(q.arf), lumpPct: n(q.lumpPct ?? pack.maxLumpPct * 100, 0, pack.maxLumpPct * 100),
      dbPension: n(q.dbPension), dbFromAge: Math.round(n(q.dbFromAge || retireAge, 40, 80)), dbIndex: n(q.dbIndex, 0, 10), dbLumpSum: n(q.dbLumpSum),
      statePensionWeekly: n(q.statePensionWeekly, 0, 2000), medicalCard: !!q.medicalCard,
      ukPensionWeekly: n(q.ukPensionWeekly, 0, 2000), ukPensionAge: Math.round(n(q.ukPensionAge ?? pack.ukPension.age(pack.baseYear - age), 55, 80)),
      ...(q.statePensionAge != null ? { statePensionAge: n(q.statePensionAge, 55, 75) } : {}),
      ...(q.pension2Age != null ? { pension2Age: Math.round(n(q.pension2Age, 65, 70)) } : {}),
      ...(q.pension2Years != null ? { pension2Years: n(q.pension2Years, 0, 40) } : {}),
    };
  };
  const single = p.household === 'single' || p.people.length < 2;
  return {
    household: single ? 'single' : p.household === 'cohabiting' ? 'cohabiting' : 'married',
    people: single ? [person(p.people[0])] : [person(p.people[0]), person(p.people[1])],
    savings: n(p.savings), savingsAdd: n(p.savingsAdd), spending: n(p.spending),
    growth: n(p.growth, -10, 20), savingsGrowth: n(p.savingsGrowth, -10, 20), inflation: n(p.inflation, -5, 20), payGrowth: n(p.payGrowth, -10, 20),
    indexTax: p.indexTax !== false,
    gbpPerEur: n(p.gbpPerEur ?? pack.ukPension.gbpPerEur, 0.1, 10),
    local: { ...(p.local ?? {}), otherAssets: n(p.local?.otherAssets) },
  };
}

/** A person's State Pension age (years, may have a fraction): their own, else the pack's by year of birth, else the pack's. */
export function statePensionAgeOf(q: PersonInput, pack: RulePack): number {
  return q.statePensionAge ?? pack.statePensionAgeFor?.(pack.baseYear - q.age) ?? pack.statePensionAge;
}

export function project(input: PlanInput, pack: RulePack): PlanResult {
  const plan = normalise(input, pack);
  const [P1, P2raw] = plan.people;
  const two = plan.people.length === 2;
  const P = [P1, two ? P2raw : EMPTY];
  const g = plan.growth / 100, sg = plan.savingsGrowth / 100, inf = plan.inflation / 100, pg = plan.payGrowth / 100;
  const years = pack.endAge - P1.age + 1;

  const pot = P.map((q) => q.pensionPot);
  const arf = P.map((q) => q.arf ?? 0);
  const lumpCum = [0, 0];
  let savings = plan.savings;
  const rows: YearRow[] = [];
  let over = false;
  let wealth: { v: number; f: number } | null = null;
  const periods = pack.periods ?? 52;
  const close = pack.close ?? CLOSE;
  const spa = P.map((q) => statePensionAgeOf(q, pack));
  const spFactor = P.map((q, i) => (pack.statePensionFactor ? pack.statePensionFactor(spa[i]) : 1));
  let prev: { income: number; pay: number }[] | null = null;

  for (let t = 0; t < years; t++) {
    const year = pack.baseYear + t;
    const f = Math.pow(1 + inf, t);
    const idx = plan.indexTax ? f : 1;
    const ages = P.map((q) => q.age + t);
    const retired = ages[0] >= P1.retireAge;
    let lumpNet = 0, lumpTax = 0;
    const per = P.map((q, i) => {
      const age = ages[i];
      const salary = i === 1 && !two ? 0 : age < q.retireAge ? q.salary * Math.pow(1 + pg, t) : 0;
      const own = (salary * q.contribPct) / 100;
      const relieved = Math.min(own, pack.reliefPct(age) * Math.min(salary, pack.reliefCap));
      // Pot: drawn at drawAge (lump sum + ARF), otherwise grows and takes this year's contributions.
      let lump = 0;
      const open = arf[i], potOpen = pot[i];
      const due = (age >= (q.drawAge ?? q.retireAge) && (pack.canDraw ? pack.canDraw(age, year) : true)) || (pack.maxDrawAge != null && age >= pack.maxDrawAge);
      if (pot[i] > 0 && due) {
        if (pot[i] > pack.fundThreshold(year)) over = true;
        lump = (pot[i] * (q.lumpPct ?? 0)) / 100;
        if (pack.lumpCap != null) lump = Math.min(lump, Math.max(0, pack.lumpCap - lumpCum[i]));
        arf[i] += pot[i] - lump;
        pot[i] = 0;
      } else if (!due) {
        const paidIn = (salary * (q.contribPct + q.employerPct)) / 100;
        pot[i] = pot[i] * (1 + g) + (pack.contribTax ? paidIn * (1 - pack.contribTax) : paidIn);
      }
      if (q.dbPension > 0 && age === q.dbFromAge) lump += q.dbLumpSum ?? 0;
      if (lump > 0) {
        const tax = pack.lumpTax(lumpCum[i] + lump) - pack.lumpTax(lumpCum[i]);
        lumpCum[i] += lump;
        lumpTax += tax;
        lumpNet += lump - tax;
      }
      const db = q.dbPension > 0 && age >= q.dbFromAge ? q.dbPension * Math.pow(1 + q.dbIndex / 100, age - q.dbFromAge) : 0;
      // State Pension from its age (a fraction of the first year when the age has months), with the pack's start-age adjustment.
      const share = Math.min(1, Math.max(0, age + 1 - spa[i]));
      const sp = share > 0 ? q.statePensionWeekly * periods * f * spFactor[i] * share : 0;
      // UK State Pension: rises with inflation where it is uprated, else frozen at its rate when claimed.
      const ukF = pack.ukPension.indexed ? f : Math.pow(1 + inf, Math.max(0, (q.ukPensionAge ?? 99) - q.age));
      const uk = (q.ukPensionWeekly ?? 0) > 0 && age >= (q.ukPensionAge ?? 99) ? ((q.ukPensionWeekly ?? 0) / plan.gbpPerEur!) * 52 * ukF : 0;
      const sp2 = pack.pension2 && (i === 0 || two) ? pack.pension2(q, age, f) : 0;
      const grown = arf[i] * (1 + g);
      const arfMin = pack.minOnOpening ? Math.min(grown, open * pack.minDrawdownRate(age, open)) : grown * pack.minDrawdownRate(age, grown);
      const prsi = pack.payContribution(year, age, salary, sp > 0, age >= spa[i], { t, f, inf, indexTax: plan.indexTax });
      return { age, salary, own, relieved, db, sp, uk, grown, arfMin, prsi, sp2, open, potOpen };
    });

    const savingsOpen = savings;
    const cur = per.map((x) => ({ income: x.salary + x.db + x.sp + x.uk + x.arfMin, pay: x.salary }));
    const ben: [number, number] = pack.benefit
      ? pack.benefit({
        year, t, f, idx, household: plan.household, two, local: plan.local ?? {}, ages: [ages[0], ages[1]],
        savings: savingsOpen, funds: [per[0].open, per[1].open], pots: [per[0].potOpen, per[1].potOpen],
        income: per.map((x) => ({ salary: x.salary, db: x.db, sp: x.sp, sp2: x.sp2, uk: x.uk, draw: x.arfMin })),
        prev: prev ?? cur,
      })
      : [0, 0];
    if (!two) ben[1] = 0;
    const taxPeople = per.map((x, i): TaxPerson => ({
      exists: i === 0 || two,
      age: x.age,
      itBase: x.salary - x.relieved + x.db + x.sp + x.uk + x.arfMin,
      uscBase: x.salary + x.db + x.arfMin + (pack.ukPension.secondCharge ? x.uk : 0),
      creditBase: x.salary + x.db + x.sp + (pack.ukPension.earnsCredit ? x.uk : 0),
      medicalCard: !!P[i].medicalCard,
      salary: x.salary, relieved: x.relieved, db: x.db, sp: x.sp, sp2: x.sp2, uk: x.uk, draw: x.arfMin, benefit: ben[i],
    })) as [TaxPerson, TaxPerson];
    const ty = { year, idx, household: plan.household, people: taxPeople, t, inf, indexTax: plan.indexTax, local: plan.local };
    const base = pack.tax(ty, 0, 0);
    const prsi = per[0].prsi + per[1].prsi;
    const gross = per.reduce((a, x) => a + x.salary + x.db + x.sp + x.uk + x.arfMin, 0) + (per[0].sp2 + per[1].sp2 + ben[0] + ben[1]);
    const own = per[0].own + per[1].own;
    const net0 = gross - own - base.incomeTax - base.usc - prsi;

    savings = savings * (1 + sg) + lumpNet;
    const spending = retired ? plan.spending * f : 0;
    if (retired && wealth === null) wealth = { v: savings + per[0].grown + per[1].grown + pot[0] + pot[1], f };
    let fromSavings = 0, extra = 0, shortfall = 0, taxNow = base;
    let split = [0, 0];
    if (!retired) savings += plan.savingsAdd * f;
    else if (net0 >= spending) savings += net0 - spending;
    else {
      const need = spending - net0;
      fromSavings = Math.min(savings, need);
      savings -= fromSavings;
      const d2 = need - fromSavings;
      const avail = [per[0].grown - per[0].arfMin, per[1].grown - per[1].arfMin];
      const total = avail[0] + avail[1];
      if (d2 > 0 && total > 0) {
        const s1 = avail[0] / total;
        const extraTax = (x: number) => { const r = pack.tax(ty, x * s1, x * (1 - s1)); return r.incomeTax + r.usc - base.incomeTax - base.usc; };
        let x = Math.min(total, d2);
        for (let k = 0; k < ITER; k++) x = Math.min(total, d2 + extraTax(x));
        x = Math.min(total, x + Math.max(0, d2 - (x - extraTax(x))) / close);
        extra = x;
        const netX = x - extraTax(x);
        if (netX >= d2) savings += netX - d2;
        else shortfall = d2 - netX;
        taxNow = pack.tax(ty, x * s1, x * (1 - s1));
        split = [x * s1, x * (1 - s1)];
      } else shortfall = d2;
    }
    for (let i = 0; i < 2; i++) arf[i] = per[i].grown - per[i].arfMin - split[i];
    prev = cur.map((c, i) => ({ income: c.income + split[i], pay: c.pay }));

    rows.push({
      year, age1: ages[0], age2: two ? ages[1] : null, retired,
      salary: per[0].salary + per[1].salary, contributions: own, db: per[0].db + per[1].db, statePension: per[0].sp + per[1].sp, ukPension: per[0].uk + per[1].uk,
      statePension2: per[0].sp2 + per[1].sp2, benefit: ben[0] + ben[1],
      arfMin: per[0].arfMin + per[1].arfMin, arfExtra: extra, lumpNet, lumpTax,
      incomeTax: taxNow.incomeTax, usc: taxNow.usc, prsi,
      netIncome: gross + extra - own - taxNow.incomeTax - taxNow.usc - prsi,
      spending, fromSavings, shortfall,
      savingsEnd: savings, arfEnd: arf[0] + arf[1], potEnd: pot[0] + pot[1], deflator: f,
    });
  }

  const first = rows.find((r) => r.retired && r.shortfall > 1);
  const retiredRows = rows.filter((r) => r.retired);
  return {
    rows,
    runOutAge: first ? first.age1 : null,
    bridgeYears: retiredRows.filter((r) => r.age1 < (pack.bridgeAge ? pack.bridgeAge(P1) : Math.ceil(spa[0]))).length,
    lumpSums: { gross: rows.reduce((a, r) => a + r.lumpNet + r.lumpTax, 0), tax: rows.reduce((a, r) => a + r.lumpTax, 0) },
    taxInRetirement: retiredRows.reduce((a, r) => a + r.incomeTax + r.usc + r.prsi + r.lumpTax, 0),
    wealthAtRetirement: wealth?.v ?? 0,
    wealthAtRetirementToday: wealth ? wealth.v / wealth.f : 0,
    overThreshold: over,
  };
}

/** Highest spending (today's money, to the nearest 100) that still lasts to the end age. */
export function sustainableSpending(input: PlanInput, pack: RulePack): number {
  let lo = 0, hi = Math.max(20000, input.spending * 3);
  while (project({ ...input, spending: hi }, pack).runOutAge == null && hi < 1e7) hi *= 2;
  for (let i = 0; i < 30 && hi - lo > 50; i++) {
    const mid = (lo + hi) / 2;
    if (project({ ...input, spending: mid }, pack).runOutAge == null) lo = mid; else hi = mid;
  }
  return Math.floor(lo / 100) * 100;
}

/** Tax paid from retirement on (income tax, USC, PRSI, lump sum tax), in today's money. */
export function retirementTaxToday(res: PlanResult): number {
  return res.rows.filter((r) => r.retired).reduce((a, r) => a + (r.incomeTax + r.usc + r.prsi + r.lumpTax) / r.deflator, 0);
}

/** Money-lasts age for several retirement ages for person 1 (the forum's "60, 62 or 65?"). */
export function compareRetireAges(input: PlanInput, pack: RulePack, ages: number[]) {
  return ages.map((retireAge) => {
    const people = input.people.map((q, i) => (i === 0 ? { ...q, retireAge, drawAge: q.drawAge === q.retireAge || q.drawAge == null ? retireAge : q.drawAge } : q));
    const r = project({ ...input, people }, pack);
    return { retireAge, runOutAge: r.runOutAge, wealthAtRetirementToday: r.wealthAtRetirementToday, bridgeYears: r.bridgeYears };
  });
}

/**
 * Earliest retirement age for person 1 at which the plan lasts to the end age, keeping everything else the
 * same (overhaul B4: "what is the earliest I can retire?"). Searches from `from` to `to`; null if none works.
 * Ages run upward, so the first that lasts is the answer even if the curve is not perfectly monotonic.
 */
export function earliestRetireAge(input: PlanInput, pack: RulePack, from = 50, to = 70): number | null {
  const start = Math.max(from, Math.ceil(input.people[0].age));
  if (start > to) return null;
  const ages = Array.from({ length: to - start + 1 }, (_, i) => start + i);
  for (const c of compareRetireAges(input, pack, ages)) if (c.runOutAge == null) return c.retireAge;
  return null;
}
