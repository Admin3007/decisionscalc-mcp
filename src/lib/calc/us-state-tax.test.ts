import { describe, it, expect } from 'vitest';
import { stateIncomeTax as t, STATE_NAMES, ohioTax } from './us-state-tax';

// Schedules read 8 Nov 2026 from each state's revenue department (see us-state-tax.ts). Each published bracket base
// must equal the tax at the top of the previous bracket, which checks the transcription.
describe('state income tax 2026, single filer, wages only', () => {
  it('no tax on wages in TX, FL, TN, NV, WA', () => {
    for (const s of ['TX', 'FL', 'TN', 'NV', 'WA'] as const) expect(t(s, 120000).tax).toBe(0);
  });
  it('flat states: PA 3.07% with no deduction; IL 4.95% after $2,925; MI 4.25% after $5,900', () => {
    expect(t('PA', 100000).tax).toBe(3070);
    expect(t('IL', 100000).tax).toBe(Math.round((100000 - 2925) * 0.0495 * 100) / 100);
    expect(t('IL', 300000).tax).toBe(14850); // exemption not allowed above $250,000
    expect(t('MI', 100000).tax).toBe(Math.round(94100 * 0.0425 * 100) / 100);
  });
  it('flat states with a standard deduction: GA 4.99% after $15,000; NC 3.99% after $12,750; AZ 2.5% after $15,750; CO 4.4% after the federal $16,100', () => {
    expect(t('GA', 100000).tax).toBe(4241.5);
    expect(t('NC', 100000).tax).toBe(Math.round(87250 * 0.0399 * 100) / 100);
    expect(t('AZ', 100000).tax).toBe(2106.25);
    expect(t('CO', 100000).tax).toBe(Math.round(83900 * 0.044 * 100) / 100);
    expect(t('NC', 100000).note).toMatch(/2025 standard deduction/);
  });
  it('MA: 5% after the $4,400 exemption; 4% surtax only above $1,107,750', () => {
    expect(t('MA', 100000).tax).toBe(4780);
    expect(t('MA', 1200000).tax).toBe(Math.round(((1200000 - 4400) * 0.05 + (1195600 - 1107750) * 0.04) * 100) / 100);
  });
  it('CA bracket bases match the rates (FTB 2026 indexing)', () => {
    // $11,456 x 1% = $114.56; + ($27,157 - $11,456) x 2% = $428.58; ... ; $75,197 base $3,310.88
    expect(Math.round((11456 * 0.01 + (27157 - 11456) * 0.02) * 100) / 100).toBe(428.58);
    expect(Math.round((428.58 + (42861 - 27157) * 0.04 + (59498 - 42861) * 0.06 + (75197 - 59498) * 0.08) * 100) / 100).toBe(3310.88);
  });
  it('CA: $100,000 wages = 9.3% bracket on $94,100 taxable, less the $158 exemption credit', () => {
    expect(t('CA', 100000).tax).toBe(Math.round((3310.88 + (94100 - 75197) * 0.093 - 158) * 100) / 100);
  });
  it('NY: $60,000 wages uses the table ($52,000 taxable); $200,000 wages = flat 5.90% after recapture', () => {
    expect(t('NY', 60000).tax).toBe(Math.round((586 + (52000 - 13900) * 0.054) * 100) / 100);
    expect(t('NY', 200000).tax).toBe(Math.round(192000 * 0.059 * 100) / 100);
    expect(t('NY', 300000).partial).toBe(true);
  });
  it('NY: recapture phases in between NYAGI $107,650 and $157,650', () => {
    const table = 4191 + (124650 - 8000 - 80650) * 0.059;
    const flat = (124650 - 8000) * 0.059;
    const share = Math.round(((124650 - 107650) / 50000) * 10000) / 10000;
    expect(t('NY', 124650).tax).toBe(Math.round((table + (flat - table) * share) * 100) / 100);
  });
  it('NJ: rate x income minus subtraction, $1,000 exemption; nothing at $10,000 or less', () => {
    expect(t('NJ', 10000).tax).toBe(0);
    expect(t('NJ', 101000).tax).toBe(Math.round((100000 * 0.0637 - 2126.25) * 100) / 100);
    // continuity at $75,000: 75,000 x 5.525% - 1,492.50 = 75,000 x 6.37% - 2,126.25
    expect(Math.round((75000 * 0.05525 - 1492.5) * 100)).toBe(Math.round((75000 * 0.0637 - 2126.25) * 100));
  });
  it('VA: 5.75% bracket above $17,000 after $8,750 deduction and $930 exemption', () => {
    expect(t('VA', 100000).tax).toBe(Math.round((720 + (100000 - 9680 - 17000) * 0.0575) * 100) / 100);
  });
  it('Ohio Department of Taxation example (2025 IT 1040 booklet, Mitchell): $68,050 taxable = $342 + $1,155 = $1,497', () => {
    expect(Math.round(ohioTax(68050))).toBe(1497);
  });
  it('Ohio: $80,000 wages, $2,150 exemption; flagged as 2025 rates', () => {
    expect(t('OH', 80000).tax).toBe(Math.round((342 + (77850 - 26050) * 0.0275) * 100) / 100);
    expect(t('OH', 80000).note).toMatch(/2025 rates/);
    expect(t('OH', 25000).tax).toBe(0);
  });
  it('18 states, never NaN', () => {
    expect(Object.keys(STATE_NAMES)).toHaveLength(18);
    for (const s of Object.keys(STATE_NAMES) as (keyof typeof STATE_NAMES)[]) expect(Number.isFinite(t(s, NaN as any).tax)).toBe(true);
  });
});
