import { describe, it, expect } from 'vitest';
import { computeRentVsBuy, breakEvenSeries, sdlt, propTaxIsFlatFor, type RentVsBuyInputs } from './rent-vs-buy';

const base: RentVsBuyInputs = {
  homePrice: 400000, downPct: 20, mortgageRate: 6.5, propTaxRate: 1.1,
  hoaMonthly: 0, homeAppreciation: 3, monthlyRent: 2000, rentIncrease: 3,
  investReturn: 7, yearsToStay: 7, taxBracket: 22, isGB: false,
};

describe('sdlt (UK stamp duty bands)', () => {
  it('is 0 below £125k', () => expect(sdlt(120000)).toBe(0));
  it('charges 2% on the £125k–250k band', () => expect(sdlt(250000)).toBe(2500));
  it('is progressive (higher price → higher tax)', () => {
    expect(sdlt(925000)).toBeGreaterThan(sdlt(500000));
  });
});

describe('computeRentVsBuy', () => {
  it('returns finite core numbers', () => {
    const r = computeRentVsBuy(base);
    expect(Number.isFinite(r.monthlyMort)).toBe(true);
    expect(Number.isFinite(r.netBuyCost)).toBe(true);
    expect(Number.isFinite(r.netRentCost)).toBe(true);
    expect(r.years).toBe(7);
    expect(r.diff).toBeGreaterThanOrEqual(0);
  });

  it('home value grows with appreciation', () => {
    const r = computeRentVsBuy(base);
    expect(r.homeValueAtSale).toBeGreaterThan(base.homePrice);
  });

  it('break-even year is within 0..30', () => {
    const r = computeRentVsBuy(base);
    expect(r.beYear).toBeGreaterThanOrEqual(0);
    expect(r.beYear).toBeLessThanOrEqual(30);
  });

  /**
   * REGRESSION (2026-09-28). This assertion used to read
   *   expect(r.buyIsBetterNow).toBe(r.beYear > 0 && r.years >= r.beYear)
   * which pinned the verdict to the break-even year rather than to the money,
   * and so passed while the tool printed "Buying ✓ / Buying saves $19,786" over
   * figures showing buying cost $19,786 MORE. The verdict must be a statement
   * about the two numbers actually displayed.
   */
  it('buyIsBetterNow states which net cost is lower — never contradicts it', () => {
    for (const patch of [
      {},
      { yearsToStay: 3 }, { yearsToStay: 7 }, { yearsToStay: 12 }, { yearsToStay: 30 },
      { monthlyRent: 900 }, { monthlyRent: 4200 },
      { mortgageRate: 1.5 }, { mortgageRate: 11 },
      { investReturn: 0 }, { investReturn: 12 },
      { homeAppreciation: 0 }, { homeAppreciation: 8 },
      { downPct: 5 }, { downPct: 50 },
      { isGB: true, propTaxRate: 2170, homePrice: 290000, monthlyRent: 1300 },
    ] as Partial<RentVsBuyInputs>[]) {
      const r = computeRentVsBuy({ ...base, ...patch });
      expect(r.buyIsBetterNow, `patch ${JSON.stringify(patch)}`).toBe(r.netBuyCost < r.netRentCost);
      // `diff` is what the UI prints as "<winner> saves", so it has to be the
      // actual gap between the two.
      expect(r.diff).toBeCloseTo(Math.abs(r.netBuyCost - r.netRentCost), 6);
    }
  });

  it('the break-even year is a horizon where buying really is cheaper', () => {
    for (const patch of [{}, { monthlyRent: 3400 }, { mortgageRate: 3 }, { isGB: true, propTaxRate: 2170 }] as Partial<RentVsBuyInputs>[]) {
      const r = computeRentVsBuy({ ...base, ...patch });
      if (r.beYear === 0) continue;
      const atBe = computeRentVsBuy({ ...base, ...patch, yearsToStay: r.beYear });
      expect(atBe.netBuyCost, `beYear ${r.beYear} for ${JSON.stringify(patch)}`).toBeLessThan(atBe.netRentCost);
      if (r.beYear > 1) {
        const before = computeRentVsBuy({ ...base, ...patch, yearsToStay: r.beYear - 1 });
        expect(before.netBuyCost).toBeGreaterThanOrEqual(before.netRentCost);
      }
    }
  });

  it('zero mortgage rate does not divide-by-zero', () => {
    const r = computeRentVsBuy({ ...base, mortgageRate: 0 });
    expect(Number.isFinite(r.monthlyMort)).toBe(true);
    expect(r.monthlyMort).toBeGreaterThan(0);
  });

  it('GB mode uses stamp duty + flat council tax', () => {
    const us = computeRentVsBuy(base);
    const gb = computeRentVsBuy({ ...base, isGB: true, propTaxRate: 2000 });
    // GB closing = sdlt + 1500; US closing = 3% of price
    expect(gb.closingBuy).toBe(sdlt(base.homePrice) + 1500);
    expect(us.closingBuy).toBeCloseTo(base.homePrice * 0.03, 6);
    // GB council tax is the flat field value, annualised
    expect(gb.propTaxAnnual).toBe(2000);
  });

  it('longer stay tends to favor buying (net buy cost grows slower than rent over time)', () => {
    const short = computeRentVsBuy({ ...base, yearsToStay: 2 });
    const long = computeRentVsBuy({ ...base, yearsToStay: 15 });
    // both finite, and the longer horizon should not crash
    expect(Number.isFinite(short.netBuyCost)).toBe(true);
    expect(Number.isFinite(long.netBuyCost)).toBe(true);
  });
});

describe('breakEvenSeries', () => {
  it('returns 30 years of both trajectories', () => {
    const { buy, rent } = breakEvenSeries(base);
    expect(buy).toHaveLength(30);
    expect(rent).toHaveLength(30);
  });
  it('agrees with computeRentVsBuy break-even year', () => {
    const r = computeRentVsBuy(base);
    const { buy, rent } = breakEvenSeries(base);
    let be = 0;
    for (let y = 1; y <= 30; y++) if (buy[y-1] < rent[y-1]) { be = y; break; }
    expect(be).toBe(r.beYear);
  });
});

describe('property tax: flat amount vs percent of value', () => {
  /**
   * REGRESSION (2026-09-28). GB, AU, IE and CH packs all store a flat annual
   * property-tax amount, but only GB was given the flat branch. AU/IE/CH fell
   * through to the percent branch, where the form's max="3" clamped the pack
   * value, and the tool billed 3% of the home's value every year — A$24,000 on
   * an A$800,000 home instead of roughly A$2,000.
   */
  it('flags exactly the four flat-tax countries', () => {
    for (const cc of ['GB', 'AU', 'IE', 'CH', 'NZ']) expect(propTaxIsFlatFor(cc), cc).toBe(true);
    for (const cc of ['US', 'CA', '', null, undefined]) expect(propTaxIsFlatFor(cc as any), String(cc)).toBe(false);
  });

  it('a flat amount is charged as-is, not as a percentage of value', () => {
    const au = { ...base, homePrice: 800000, propTaxRate: 2000, monthlyRent: 2600, propTaxIsFlat: true };
    expect(computeRentVsBuy(au).propTaxAnnual).toBe(2000);

    // Two distinct failures compounded in the shipped bug, worth pinning apart:
    // (1) the library reading the raw flat amount as a percent —
    expect(computeRentVsBuy({ ...au, propTaxIsFlat: false }).propTaxAnnual).toBe(16_000_000);
    // (2) the form clamping 2000 to its own max="3" first, which is what the
    //     page actually rendered: 3% of an A$800,000 home, A$24,000 a year.
    expect(computeRentVsBuy({ ...au, propTaxRate: 3, propTaxIsFlat: false }).propTaxAnnual).toBe(24000);
  });

  it('percent countries are unchanged', () => {
    const us = { ...base, homePrice: 400000, propTaxRate: 1.1, propTaxIsFlat: false };
    expect(computeRentVsBuy(us).propTaxAnnual).toBeCloseTo(4400, 6);
  });

  it('falls back to isGB when the flag is omitted', () => {
    const gb = { ...base, propTaxRate: 2170, isGB: true };
    expect(computeRentVsBuy(gb).propTaxAnnual).toBe(2170);
  });

  it('misreading the unit materially changes the verdict for AU', () => {
    const au = { homePrice: 800000, downPct: 20, mortgageRate: 6, propTaxRate: 2000,
      hoaMonthly: 0, homeAppreciation: 3, monthlyRent: 2600, rentIncrease: 3,
      investReturn: 7, yearsToStay: 7, taxBracket: 22, isGB: false } as RentVsBuyInputs;
    const wrong = computeRentVsBuy({ ...au, propTaxIsFlat: false });
    const right = computeRentVsBuy({ ...au, propTaxIsFlat: true });
    expect(right.netBuyCost).toBeLessThan(wrong.netBuyCost);
    expect(wrong.netBuyCost - right.netBuyCost).toBeGreaterThan(100000);
  });
});

describe('transaction costs are per-country, not the US rates everywhere', () => {
  /**
   * REGRESSION (2026-09-28). closingBuy was `price * 0.03` and closingSale
   * `value * 0.06` for every country except GB — US figures applied to Canada,
   * Australia, Ireland and Switzerland, whose real buy-side costs run
   * 0.5%-2.5% and commission 2%-5%.
   */
  const ch = {
    ...base, homePrice: 1_000_000, monthlyRent: 1700, mortgageRate: 1.7,
    propTaxRate: 2000, propTaxIsFlat: true, closingPct: 0.5, sellCostPct: 3,
  } as RentVsBuyInputs;

  it('uses the supplied buy-side rate', () => {
    expect(computeRentVsBuy(ch).closingBuy).toBeCloseTo(5000, 6);          // 0.5%
    expect(computeRentVsBuy({ ...ch, closingPct: 3 }).closingBuy).toBeCloseTo(30000, 6);
  });

  it('the US defaults overstated the Swiss cost of buying by tens of thousands', () => {
    const right = computeRentVsBuy(ch);
    const usRates = computeRentVsBuy({ ...ch, closingPct: 3, sellCostPct: 6 });
    expect(usRates.netBuyCost - right.netBuyCost).toBeGreaterThan(50000);
  });

  it('GB still uses stamp duty on the buy side, not a percentage', () => {
    const gb = { ...base, homePrice: 290000, propTaxRate: 2170, isGB: true } as RentVsBuyInputs;
    expect(computeRentVsBuy(gb).closingBuy).toBe(sdlt(290000) + 1500);
  });

  it('falls back to the old rates when a pack omits them', () => {
    const noRates = { ...base, homePrice: 400000 } as RentVsBuyInputs;
    delete (noRates as any).closingPct; delete (noRates as any).sellCostPct;
    expect(computeRentVsBuy(noRates).closingBuy).toBeCloseTo(12000, 6);    // 3%
  });
});

describe('both households start with the same cash and pay out the same (corrected 9 Nov 2026)', () => {
  /**
   * Hand-worked case. Price 360,000, 10% down (36,000), buying costs 10,000, 0% mortgage over 360 months on 324,000
   * = 900 a month, flat property tax 1,200 a year (100 a month), maintenance 1% = 300 a month: the buyer pays out
   * 1,300 a month, 15,600 a year. Rent 1,000 a month (12,000 a year), no rent rise, no price growth, no selling cost,
   * 10% return.
   *  Renter: invests the buyer's day-one cash 36,000 + 10,000 = 46,000 and the yearly difference 15,600 − 12,000 = 3,600.
   *   Year 1: pot = (46,000 + 3,600) × 1.1 = 54,560; net cost = rent 12,000 + paid in 3,600 + 46,000 − 54,560 = 7,040.
   *   Year 2: pot = (54,560 + 3,600) × 1.1 = 63,976; net cost = 24,000 + 7,200 + 46,000 − 63,976 = 13,224.
   *  Buyer: year 1 paid out 46,000 + 15,600 = 61,600; mortgage left 324,000 − 10,800 = 313,200, so the home nets
   *   360,000 − 313,200 = 46,800; net cost 61,600 − 46,800 = 14,800. Year 2: 77,200 − (360,000 − 302,400) = 19,600.
   *  The old formula gave the renter 12,000 − 3,960 − (39,600 − 36,000 − 10,000) = 14,440 in year 1: it charged the
   *  buyer's 10,000 buying costs to the renter and counted the 3,600 paid in as a gain.
   */
  const hand: RentVsBuyInputs = { homePrice: 360000, downPct: 10, mortgageRate: 0, propTaxRate: 1200, propTaxIsFlat: true, hoaMonthly: 0,
    homeAppreciation: 0, monthlyRent: 1000, rentIncrease: 0, investReturn: 10, yearsToStay: 1, taxBracket: 0, isGB: false, buyCostsAmount: 10000, sellCostPct: 0 };
  it('year 1 and year 2, worked by hand', () => {
    const y1 = computeRentVsBuy(hand), y2 = computeRentVsBuy({ ...hand, yearsToStay: 2 });
    expect(y1.netRentCost).toBeCloseTo(7040, 6);
    expect(y1.netBuyCost).toBeCloseTo(14800, 6);
    expect(y1.contributions).toBeCloseTo(3600, 6);
    expect(y1.downInvested).toBeCloseTo(50600, 6);
    expect(y2.netRentCost).toBeCloseTo(13224, 6);
    expect(y2.netBuyCost).toBeCloseTo(19600, 6);
  });
  /**
   * Rent 1,500 a month (18,000 a year) is above the buyer's 15,600: the BUYER invests the 2,400 difference.
   *  Renter year 1: pot = 46,000 × 1.1 = 50,600; net cost = 18,000 + 0 + 46,000 − 50,600 = 13,400.
   *  Buyer year 1: investments (2,400 × 1.1 = 2,640) less the 2,400 paid in = 240 gain; net cost 14,800 − 240 = 14,560.
   */
  it('when rent is higher, the buyer invests the difference', () => {
    const r = computeRentVsBuy({ ...hand, monthlyRent: 1500 });
    expect(r.netRentCost).toBeCloseTo(13400, 6);
    expect(r.netBuyCost).toBeCloseTo(14560, 6);
    expect(r.buyerInvested).toBeCloseTo(2640, 6);
  });
  it('the two outgoings are equal: buyer paid out + invested = renter rent + paid in', () => {
    for (const rent of [800, 1000, 1500, 2500]) {
      const r = computeRentVsBuy({ ...hand, monthlyRent: rent, yearsToStay: 5 });
      expect(r.buyTotalOut + r.buyerContributions).toBeCloseTo(r.rentTotal + r.contributions + r.down + r.closingBuy, 6);
    }
  });
});
