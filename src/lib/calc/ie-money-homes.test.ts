import { describe, it, expect } from 'vitest';
import { computeHomes, exitTaxFor, DIRT, CGT, CGT_EXEMPTION, STATE_SAVINGS, POSB } from './ie-money-homes';

const base = { amount: 10000, years: 10, growth: 5, depositRate: 2.5, marginalRate: 40, retirementRate: 20 };
const get = (r: ReturnType<typeof computeHomes>, id: string) => r.homes.find((h) => h.id === id)!;

describe('Where should my money go? Ireland (official rates read 2026-11-02)', () => {
  it('pins the official rates', () => {
    expect(DIRT).toBe(0.33);
    expect(CGT).toBe(0.31);
    expect(CGT_EXEMPTION).toBe(1270);
    expect(STATE_SAVINGS.map((p) => [p.years, p.aer])).toEqual([[10, 0.0266], [5, 0.0229], [3, 0.0196]]);
    expect(POSB).toBe(0.0125);
    expect([exitTaxFor(2025), exitTaxFor(2026), exitTaxFor(2027), exitTaxFor(2040)]).toEqual([0.41, 0.38, 0.35, 0.35]);
  });

  it('State Savings: 10-year bond, tax-free (hand: 10,000 × 1.0266^10 = 13,002; NTMA: 30% over 10 years)', () => {
    const s = get(computeHomes(base), 'state');
    expect(s.net).toBe(13002);
    expect(s.tax).toBe(0);
  });

  it('under 3 years falls back to the POSB deposit less DIRT', () => {
    const s = get(computeHomes({ ...base, years: 2 }), 'state');
    expect(s.net).toBe(Math.round(10000 * (1 + 0.0125 * 0.67) ** 2));
    expect(s.tax).toBeGreaterThan(0);
  });

  it('deposit: interest less 33% DIRT each year (hand: 10,000 × 1.01675^10 = 11,807)', () => {
    expect(get(computeHomes(base), 'deposit').net).toBe(11807);
  });

  it('shares: 31% CGT on the gain above €1,270 (hand: gain 6,289; tax 1,556; net 14,733)', () => {
    const s = get(computeHomes(base), 'shares');
    expect(s.gross).toBe(16289);
    expect(s.tax).toBe(1556);
    expect(s.net).toBe(14733);
  });

  it('ETF: deemed disposal at year 8 at 35% (2034), credit on the final sale (hand: net 13,976)', () => {
    // y8 value 14,774.55; tax 4,774.55 × 35% = 1,671.09 paid from the fund; y10 value 14,446.57;
    // final: (14,446.57 + 1,671.09 − 10,000) × 35% − 1,671.09 = 470.09; net 13,976.48.
    expect(get(computeHomes(base), 'etf').net).toBe(13976);
  });

  it('ETF under 8 years: one exit tax charge on the sale', () => {
    const e = get(computeHomes({ ...base, years: 5 }), 'etf');
    const g = 10000 * 1.05 ** 5;
    expect(e.net).toBe(Math.round(g - (g - 10000) * 0.35));
  });

  it('pension: 40% relief grosses €10,000 up to €16,667; 25% lump sum tax-free; rest at 20% (hand: net 23,076)', () => {
    const p = get(computeHomes(base), 'pension');
    expect(p.gross).toBe(27148);
    expect(p.net).toBe(23076);
  });

  it('lump sum tax-free part is capped at €200,000', () => {
    const p = get(computeHomes({ ...base, amount: 600000, years: 20, growth: 7 }), 'pension');
    const pot = (600000 / 0.6) * 1.07 ** 20;
    expect(p.net).toBe(Math.round(200000 + (pot - 200000) * 0.8));
  });

  it('ranks the best home and survives bad input', () => {
    expect(computeHomes(base).best).toBe('pension');
    const r = computeHomes({ amount: NaN as any, years: -3, growth: NaN as any, depositRate: -1, marginalRate: 0 });
    expect(r.homes.every((h) => Number.isFinite(h.net))).toBe(true);
  });
});
