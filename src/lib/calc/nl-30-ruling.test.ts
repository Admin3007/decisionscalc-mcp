import { describe, it, expect } from 'vitest';
import { box1Tax2026, ruling, rulingParams, BOX1_2026 } from './nl-30-ruling';

describe('box 1 2026 tables (Belastingdienst provisional assessment 2026)', () => {
  it('tables join up: each credit band meets the next, phase-outs end at the published nil points', () => {
    const ak = (y: number) => box1Tax2026(y).ak;
    expect(ak(11964.99)).toBeCloseTo(996, 0);
    expect(ak(25844.99)).toBeCloseTo(5300, 0);
    expect(ak(45591.99)).toBeCloseTo(5685, 0);
    expect(ak(132920)).toBe(0);
    expect(box1Tax2026(29736).ahk).toBe(BOX1_2026.ahk.max);
    expect(box1Tax2026(78426).ahk).toBeLessThan(5);
  });
  it('€100,000 wage: tax before credits €39,432, labour credit €2,143, no general credit, tax €37,289', () => {
    const t = box1Tax2026(100000);
    expect(Math.round(t.gross)).toBe(39432);
    expect(t.ahk).toBe(0);
    expect(Math.round(t.ak)).toBe(2143);
    expect(Math.round(t.tax)).toBe(37289);
  });
  it('credits never make the tax negative', () => {
    expect(box1Tax2026(10000).tax).toBe(0);
  });
});

describe('30% ruling', () => {
  it('2026, €100,000: full €30,000 allowance, taxable €70,000, saves €16,336 a year', () => {
    const r = ruling({ salary: 100000, year: 2026, start: '2025-or-later' });
    expect(r.allowance).toBe(30000);
    expect(r.taxable).toBe(70000);
    expect(Math.round(r.with.tax)).toBe(20953);
    expect(r.saving).toBe(16336);
    expect(r.limitedBy).toBe('none');
    expect(r.fullFrom).toBe(68590);
  });
  it('2026, €60,000: the allowance is cut so the taxable salary stays at the €48,013 norm', () => {
    const r = ruling({ salary: 60000, year: 2026, start: '2025-or-later' });
    expect(r.allowance).toBe(11987);
    expect(r.taxable).toBe(48013);
    expect(r.limitedBy).toBe('norm');
  });
  it('2026, €45,000: below the norm, no ruling; under 30 with a master\'s the norm is €36,497', () => {
    expect(ruling({ salary: 45000, year: 2026, start: '2025-or-later' }).eligible).toBe(false);
    const y = ruling({ salary: 45000, year: 2026, start: '2025-or-later', youngMasters: true });
    expect(y.allowance).toBe(8503);
    expect(y.limitedBy).toBe('norm');
  });
  it('2026 cap: €300,000 salary -> €78,600 (30% of €262,000)', () => {
    const r = ruling({ salary: 300000, year: 2026, start: '2025-or-later' });
    expect(r.allowance).toBe(78600);
    expect(r.limitedBy).toBe('cap');
  });
  it('2027: 27% and the higher norm for rulings from 2025; 2024 starters 27% on the old norm; pre-2024 keep 30%', () => {
    expect(rulingParams(2027, '2025-or-later')).toMatchObject({ rate: 0.27, norm: 52521, cap: 73710 });
    expect(rulingParams(2027, '2024')).toMatchObject({ rate: 0.27, norm: 48013, cap: 73710 });
    expect(rulingParams(2027, 'before-2024')).toMatchObject({ rate: 0.3, cap: 81900 });
    const r = ruling({ salary: 100000, year: 2027, start: '2025-or-later' });
    expect(r.allowance).toBe(27000);
    expect(r.saving).toBeLessThan(16336);
    expect(r.saving).toBeGreaterThan(14000);
  });
  it('bad input never gives NaN', () => {
    const r = ruling({ salary: Number.NaN, year: 2026, start: '2025-or-later' });
    expect(r.saving).toBe(0);
    expect(r.eligible).toBe(false);
  });
});
