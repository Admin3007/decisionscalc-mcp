import { describe, it, expect } from 'vitest';
import { transferDuty as d } from './au-transfer-duty';

describe('Australian transfer duty (official schedules read 8 Nov 2026)', () => {
  it('NSW 2026/27 general rate, each $100 or part', () => {
    expect(d(387000, 'NSW').duty).toBe(1662 + 2840 * 3.5); // $11,602, the next band's base
    expect(d(800000, 'NSW').duty).toBe(11602 + 4130 * 4.5); // $30,187
    expect(d(800050, 'NSW').duty).toBe(Math.round(11602 + 4131 * 4.5)); // part of $100 counts as $100
    expect(d(1290000, 'NSW').duty).toBe(52237);
    expect(d(4000000, 'NSW').duty).toBe(194137 + 1300 * 7);
  });
  it('NSW first home buyers: nothing up to $800,000, general rate above (concession flagged)', () => {
    expect(d(800000, 'NSW', true).duty).toBe(0);
    const r = d(900000, 'NSW', true);
    expect(r.duty).toBe(d(900000, 'NSW').duty);
    expect(r.note).toMatch(/overstates/);
  });
  it('Victoria general rates, including the 5.5% whole-value band', () => {
    expect(d(130000, 'VIC').duty).toBe(2870);
    expect(d(800000, 'VIC').duty).toBe(2870 + 670000 * 0.06); // $43,070
    expect(d(1000000, 'VIC').duty).toBe(55000);
    expect(d(2500000, 'VIC').duty).toBe(110000 + 500000 * 0.065);
    expect(d(500000, 'VIC').note).toMatch(/principal place of residence/);
  });
});

// Queensland Revenue Office "Transfer duty rates" (read 8 Nov 2026).
describe('Queensland transfer duty (general rates)', () => {
  it('QRO example: $850,000 investment property = $17,325 + $13,950 = $31,275', () => {
    expect(d(850000, 'QLD').duty).toBe(31275);
  });
  it('band edges: nil to $5,000; $1,050 at $75,000; $17,325 at $540,000; $38,025 at $1,000,000', () => {
    expect(d(5000, 'QLD').duty).toBe(0);
    expect(d(75000, 'QLD').duty).toBe(1050);
    expect(d(540000, 'QLD').duty).toBe(17325);
    expect(d(1000000, 'QLD').duty).toBe(38025);
    expect(d(1200000, 'QLD').duty).toBe(38025 + 2000 * 5.75);
  });
  it('home concession rate for a home you live in (QRO concession rates, updated 31 July 2026)', () => {
    expect(d(350000, 'QLD', false, { home: true }).duty).toBe(3500);
    expect(d(540000, 'QLD', false, { home: true }).duty).toBe(10150);
    expect(d(1000000, 'QLD', false, { home: true }).duty).toBe(30850);
  });
  it('first home concession: QRO example $730,000 = $6,555; nil to $700,000; full home rate from $800,000', () => {
    expect(d(730000, 'QLD', true).duty).toBe(6555);
    expect(d(700000, 'QLD', true).duty).toBe(0);
    expect(d(800000, 'QLD', true).duty).toBe(d(800000, 'QLD', false, { home: true }).duty);
    expect(d(1500000, 'QLD', true, { newHome: true }).duty).toBe(0);
  });
});

// Other states and territories (official schedules read 8 Nov 2026). Band edges must equal the base of the next band.
describe('WA, SA, TAS, ACT and NT transfer duty', () => {
  it('Territory Revenue Office example: NT $140,000 = $1,288 + $2,100 = $3,388', () => {
    expect(d(140000, 'NT').duty).toBe(3388);
  });
  it('NT: 4.95% of the whole value above $525,000', () => {
    expect(d(600000, 'NT').duty).toBe(29700);
  });
  it('WA band edges: $2,280 at $120,000; $3,135 at $150,000; $11,115 at $360,000; $28,453 at $725,000 (rounded)', () => {
    expect([120000, 150000, 360000].map((v) => d(v, 'WA').duty)).toEqual([2280, 3135, 11115]);
    expect(d(725000, 'WA').duty).toBe(28453);
  });
  it('SA band edges: $2,830 at $100,000; $11,330 at $300,000; $21,330 at $500,000', () => {
    expect([100000, 300000, 500000].map((v) => d(v, 'SA').duty)).toEqual([2830, 11330, 21330]);
    expect(d(600000, 'SA').duty).toBe(21330 + 5500);
  });
  it('TAS: $50 to $3,000; $5,935 at $200,000; $27,810 at $725,000', () => {
    expect([3000, 200000, 725000].map((v) => d(v, 'TAS').duty)).toEqual([50, 5935, 27810]);
  });
  it('ACT owner-occupier: $728 at $260,000; $33,958 at $1,000,000; flat 4.54% above $1,455,000', () => {
    expect([260000, 1000000].map((v) => d(v, 'ACT').duty)).toEqual([728, 33958]);
    expect(d(2000000, 'ACT').duty).toBe(90800);
    expect(d(500000, 'ACT').note).toMatch(/Home Buyer Concession/);
  });
});

// First home buyer rules re-read 9 Nov 2026 (WA from 7 May 2026, SA new homes, ACT HBCS from 1 July 2026, NT house and land).
describe('first home buyer concessions', () => {
  it('WA: nil to $600,000, $16.15 per $100 or part to $800,000, general rate above', () => {
    expect(d(600000, 'WA', true).duty).toBe(0);
    expect(d(700000, 'WA', true).duty).toBe(16150);
    expect(d(900000, 'WA', true).duty).toBe(d(900000, 'WA').duty);
  });
  it('Victoria: nothing to $600,000; general rate (flagged) to $750,000', () => {
    expect(d(600000, 'VIC', true).duty).toBe(0);
    expect(d(700000, 'VIC', true).note).toMatch(/overstates/);
  });
  it('SA and QLD new homes free for first home buyers; established SA homes pay the general rate', () => {
    expect(d(900000, 'SA', true, { newHome: true }).duty).toBe(0);
    expect(d(900000, 'SA', true).duty).toBe(d(900000, 'SA').duty);
  });
  it('ACT Home Buyer Concession Scheme: no duty; NT new house-and-land package: no duty; Tasmania: general rate', () => {
    expect(d(1200000, 'ACT', true).duty).toBe(0);
    expect(d(700000, 'NT', false, { newHome: true }).duty).toBe(0);
    expect(d(500000, 'TAS', true).duty).toBe(d(500000, 'TAS').duty);
  });
});
