import { describe, it, expect } from 'vitest';
import { ie, incomeTaxFor, uscFor, IE_TAX, EXEMPT, LUMP, ARF, SFT, STATE_PENSION, PRSI, IE_SOURCES, UK_PENSION, ukPensionAge } from './ie';
import { MAX_RATE } from '../ie-state-pension';

describe('Ireland rule pack: figures as read on the official pages (4 Nov 2026)', () => {
  it('pins the 2026 and Budget 2027 bands and credits', () => {
    expect(IE_TAX[2026]).toMatchObject({ single: 44000, married: 53000, secondMax: 35000, personal: 2000, employee: 2000, ageSingle: 245, ageMarried: 490 });
    expect(IE_TAX[2027]).toMatchObject({ single: 46500, married: 55500, secondMax: 37500, personal: 2125, employee: 2125, ageSingle: 245, ageMarried: 490 });
    expect(IE_TAX[2026].usc).toEqual([12012, 28700, 70044]);
    expect(IE_TAX[2027].usc).toEqual([12012, 30300, 70044]);
    expect(EXEMPT).toEqual({ single: 18000, married: 36000, child: 575, childAfter2: 830 });
  });

  it('pins lump sum, ARF, SFT and State Pension figures', () => {
    expect([LUMP.free, LUMP.standardTop, LUMP.standardRate, LUMP.maxPct]).toEqual([200000, 500000, 0.2, 0.25]);
    expect([ARF.rate, ARF.rate70, ARF.rateLarge, ARF.large]).toEqual([0.04, 0.05, 0.06, 2000000]);
    expect(SFT[2026]).toBe(2200000);
    expect(SFT[2029]).toBe(2800000);
    expect(STATE_PENSION.max2026).toBe(MAX_RATE['2026-66']);
    expect(STATE_PENSION.max2027).toBe(MAX_RATE['2027-66']);
    expect(STATE_PENSION.age).toBe(66);
  });

  it('every source is an official page with the date it was read', () => {
    for (const s of IE_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/www\.(revenue\.ie|citizensinformation\.ie|gov\.ie|pensionsauthority\.ie|gov\.uk|ecb\.europa\.eu)\//);
      expect(s.read).toMatch(/^2026-11-0[34]$/);
    }
  });
});

describe('UK State Pension for Irish residents (gov.uk, Revenue, ECB; read 4 Nov 2026)', () => {
  it('pins the full rate, 35 years and the ECB rate', () => {
    expect(UK_PENSION).toMatchObject({ fullWeekly: 241.3, fullYears: 35, gbpPerEur: 0.8346 });
  });
  it('UK State Pension age by year of birth (whole years)', () => {
    expect([1958, 1959, 1960, 1961, 1976, 1977, 1990].map(ukPensionAge)).toEqual([66, 66, 67, 67, 67, 68, 68]);
  });
  it('taxed in Ireland with the employee credit, no USC, rising with inflation', () => {
    expect(ie.ukPension).toMatchObject({ indexed: true, earnsCredit: true, secondCharge: false });
  });
});

describe('golden examples from the official pages', () => {
  // Revenue, "Marginal relief": Jim, 68, married, jointly assessed, two children, €38,000; credits €6,490;
  // exemption limit €37,150; tax €1,110 without marginal relief, €340 with it.
  it('Revenue’s marginal relief example (Jim) gives €340', () => {
    const jim = { married: true, incomes: [38000], creditBases: [38000], ages: [68], children: 2 };
    expect(incomeTaxFor({ ...jim, ages: [60] }, 2026)).toBe(1600); // under 65: no age credit, no exemption
    expect(incomeTaxFor({ ...jim, children: 0 }, 2026)).toBeCloseTo(800, 6); // €36,000 limit: 40% of €2,000
    expect(incomeTaxFor(jim, 2026)).toBeCloseTo(340, 6);
  });

  it('Revenue’s figures behind Jim: €6,490 of credits and the normal €1,110', () => {
    // 2026: personal €4,000 + employee €2,000 + age €490; €38,000 × 20% = €7,600; 7,600 - 6,490 = 1,110
    const noRelief = 38000 * 0.2 - (2 * IE_TAX[2026].personal + IE_TAX[2026].employee + IE_TAX[2026].ageMarried);
    expect(noRelief).toBe(1110);
  });

  it('exemption: a single person over 65 on €18,000 or less pays no income tax', () => {
    expect(incomeTaxFor({ married: false, incomes: [18000], creditBases: [0], ages: [65] }, 2027)).toBe(0);
    // just over: marginal relief 40% of €500
    expect(incomeTaxFor({ married: false, incomes: [18500], creditBases: [0], ages: [65] }, 2027)).toBeCloseTo(200, 6);
  });

  // Citizens Information, "Universal Social Charge": €50,000 in 2026 → €60.06 + €333.76 + €639 = €1,032.82.
  it('Citizens Information’s USC example: €50,000 in 2026 is €1,032.82', () => {
    expect(uscFor(50000, 2026, 1, false)).toBeCloseTo(1032.82, 2);
  });

  it('USC: none at €13,000 or less; reduced rates at 70+ up to €60,000', () => {
    expect(uscFor(13000, 2027, 1, false)).toBe(0);
    expect(uscFor(40000, 2027, 1, true)).toBeCloseTo(0.005 * 12012 + 0.02 * (40000 - 12012), 6);
    expect(uscFor(60001, 2027, 1, true)).toBeCloseTo(uscFor(60001, 2027, 1, false), 6);
  });

  it('lump sums: €200,000 free, then 20% to €500,000, then 40% + USC', () => {
    expect(ie.lumpTax(200000)).toBe(0);
    expect(ie.lumpTax(300000)).toBeCloseTo(20000, 6);
    expect(ie.lumpTax(600000)).toBeCloseTo(60000 + 0.48 * 100000, 6);
  });

  it('ARF imputed distribution (Pensions Manual ch. 28): 4% from the year you are 60 all year, 5% at 70 all year, 6% over €2m', () => {
    expect(ie.minDrawdownRate(60, 500000)).toBe(0);    // turns 60 this year
    expect(ie.minDrawdownRate(61, 500000)).toBe(0.04);
    expect(ie.minDrawdownRate(70, 500000)).toBe(0.04); // turns 70 this year
    expect(ie.minDrawdownRate(71, 500000)).toBe(0.05);
    expect(ie.minDrawdownRate(61, 2000001)).toBe(0.06);
  });

  it('PRSI: none on pay below €352 a week, none at 66+ on the State Pension, 4.7% from Oct 2028', () => {
    expect(ie.payContribution(2027, 50, 352 * 52, false)).toBe(0);
    expect(ie.payContribution(2028, 64, 50000, false)).toBeCloseTo(2275, 6); // 4.5% to Sep, 4.7% from Oct 2028
    expect(ie.payContribution(2033, 67, 50000, true)).toBe(0);
    expect(ie.payContribution(2033, 67, 50000, false)).toBeCloseTo(2350, 6); // 4.7% from 2029
    expect(PRSI.rate2027).toBeCloseTo(0.043875, 9);
  });

  it('State Pension pays income tax but no USC; ARF drawdown earns no employee credit', () => {
    const p = (o: object) => ({ exists: true, age: 67, itBase: 0, uscBase: 0, creditBase: 0, medicalCard: false, ...o });
    const none = { exists: false, age: 0, itBase: 0, uscBase: 0, creditBase: 0, medicalCard: false };
    const sp = ie.tax({ year: 2027, idx: 1, household: 'single', people: [p({ itBase: 40000, creditBase: 40000 }), none] }, 0, 0);
    expect(sp.usc).toBe(0);
    expect(sp.incomeTax).toBeCloseTo(8000 - 2125 - 2125 - 245, 6);
    const arf = ie.tax({ year: 2027, idx: 1, household: 'single', people: [p({ itBase: 40000, uscBase: 40000 }), none] }, 0, 0);
    expect(arf.incomeTax).toBeCloseTo(8000 - 2125 - 245, 6);
  });

  it('married couples get the second-income band increase and the €36,000 exemption', () => {
    const p = (age: number, inc: number) => ({ exists: true, age, itBase: inc, uscBase: 0, creditBase: inc, medicalCard: false });
    const married = ie.tax({ year: 2027, idx: 1, household: 'married', people: [p(64, 60000), p(64, 30000)] }, 0, 0).incomeTax;
    // band 55,500 + min(37,500, 30,000) = 85,500; 85,500 × 20% + 4,500 × 40% − (4,250 + 2,125 + 2,125)
    expect(married).toBeCloseTo(17100 + 1800 - 8500, 6);
    const joint = ie.tax({ year: 2027, idx: 1, household: 'married', people: [p(66, 20000), p(66, 15000)] }, 0, 0).incomeTax;
    expect(joint).toBe(0);
  });
});
