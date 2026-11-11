import { describe, it, expect } from 'vitest';
import { computeJapanTrip, bandTax, type JapanTripInput } from './japan-trip';
import {
  DEPARTURE_TAX_JPY, JR_PASS, JPY_PER_EUR, KYOTO_TAX_BANDS, TOKYO_TAX_BANDS, ORIGINS, STYLES, JAPAN_SOURCES,
} from '../../data/travel/japan';
import { FX } from '../../data/moving/figures';

const rates = { ...FX.perEur, JPY: JPY_PER_EUR };
const base: JapanTripInput = {
  origin: 'US', adults: 2, children: 0, tokyoNights: 4, kyotoNights: 3, otherNights: 0,
  style: 'mid', jrPass: 0, flightPerPerson: 1200,
};

describe('official figures (pinned: change only with a dated source)', () => {
  it('departure tax, JR Pass, Tokyo and Kyoto bands, visa fees, ECB rate', () => {
    expect(DEPARTURE_TAX_JPY).toBe(3000);
    expect(JR_PASS[7]).toEqual({ adult: 50000, child: 25000 });
    expect(JR_PASS[14]).toEqual({ adult: 80000, child: 40000 });
    expect(JR_PASS[21]).toEqual({ adult: 100000, child: 50000 });
    expect(TOKYO_TAX_BANDS.map((b) => b.tax)).toEqual([0, 100, 200]);
    expect(KYOTO_TAX_BANDS.map((b) => b.tax)).toEqual([200, 400, 1000, 4000, 10000]);
    for (const o of ['US', 'GB', 'CA', 'AU', 'IE'] as const) expect(ORIGINS[o].visaPerPerson).toBe(0);
    expect(JPY_PER_EUR).toBe(175.86);
    expect(FX.date).toBe('2026-10-28'); // same ECB day as the yen rate
    for (const s of Object.values(JAPAN_SOURCES)) expect(s.checked).toMatch(/^2026-\d\d-\d\d$/);
  });
});

describe('bandTax', () => {
  it('uses the exclusive upper bound of each band', () => {
    expect(bandTax(9999, TOKYO_TAX_BANDS)).toBe(0);
    expect(bandTax(10000, TOKYO_TAX_BANDS)).toBe(100);
    expect(bandTax(15000, TOKYO_TAX_BANDS)).toBe(200);
    expect(bandTax(5999, KYOTO_TAX_BANDS)).toBe(200);
    expect(bandTax(6000, KYOTO_TAX_BANDS)).toBe(400);
    expect(bandTax(100000, KYOTO_TAX_BANDS)).toBe(10000);
  });
});

describe('computeJapanTrip', () => {
  it('adds every line, and the total is the sum of the lines', () => {
    const r = computeJapanTrip(base, rates);
    expect(r.nights).toBe(7);
    expect(r.rooms).toBe(1);
    const sumHome = r.lines.reduce((a, l) => a + l.home, 0);
    expect(r.totalHome).toBe(sumHome);
    const ids = r.lines.map((l) => l.id);
    expect(ids).toEqual(['flights', 'stay', 'daily', 'citytax', 'departure']);
    // Mid-range room ¥25,000 shared by 2 = ¥12,500 per person: Tokyo ¥100, Kyoto ¥400 per person per night.
    expect(r.lines.find((l) => l.id === 'citytax')!.jpy).toBe(4 * 2 * 100 + 3 * 2 * 400);
    expect(r.lines.find((l) => l.id === 'departure')!.jpy).toBe(6000);
    expect(r.lines.find((l) => l.id === 'stay')!.jpy).toBe(25000 * 7);
    expect(r.lines.find((l) => l.id === 'daily')!.jpy).toBe(STYLES.mid.dailyJpy * 8 * 2);
    expect(r.lines.find((l) => l.id === 'flights')!.home).toBe(2400);
  });

  it('converts at the ECB cross rate', () => {
    const r = computeJapanTrip(base, rates);
    expect(r.homePerJpy).toBeCloseTo(FX.perEur.USD / JPY_PER_EUR, 10);
    const stay = r.lines.find((l) => l.id === 'stay')!;
    expect(stay.home).toBe(Math.round(stay.jpy * r.homePerJpy));
  });

  it('JR Pass and children; no visa line for visa-exempt origins', () => {
    const r = computeJapanTrip({ ...base, origin: 'GB', children: 1, jrPass: 7, flightPerPerson: 900 }, rates);
    expect(r.people).toBe(3);
    expect(r.lines.find((l) => l.id === 'jrpass')!.jpy).toBe(2 * 50000 + 25000);
    expect(r.lines.some((l) => l.id === 'visa')).toBe(false);
    expect(r.lines.find((l) => l.id === 'departure')!.jpy).toBe(9000);
    expect(r.lines.find((l) => l.id === 'flights')!.home).toBe(2700);
  });

  it('cheap rooms in Tokyo pay no city tax; odd adult counts need an extra room', () => {
    const r = computeJapanTrip({ ...base, adults: 3, style: 'budget', kyotoNights: 0 }, rates);
    expect(r.rooms).toBe(2);
    expect(r.lines.some((l) => l.id === 'citytax')).toBe(false); // ¥24,000 / 3 = ¥8,000 per person
  });

  it('survives bad input', () => {
    const r = computeJapanTrip({ ...base, adults: NaN, tokyoNights: -3, kyotoNights: 0, otherNights: 0, flightPerPerson: NaN }, rates);
    expect(r.people).toBe(1);
    expect(r.nights).toBe(0);
    expect(Number.isFinite(r.totalHome)).toBe(true);
  });
});
