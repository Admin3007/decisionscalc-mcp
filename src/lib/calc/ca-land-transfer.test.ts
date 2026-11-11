import { describe, it, expect } from 'vitest';
import { landTransferTax as ltt } from './ca-land-transfer';

// Figures from our land transfer tax guide (official pages read 2 Nov 2026) and the provinces' own formulas.
describe('Canadian land transfer tax', () => {
  it('Ontario: the $4,000 first-time buyer refund covers homes up to about $368,000', () => {
    expect(ltt(368000, 'ON').tax).toBe(275 + 1950 + 1770); // $3,995
    expect(ltt(368000, 'ON', true).net).toBe(0);
    expect(ltt(500000, 'ON').tax).toBe(275 + 1950 + 2250 + 2000); // $6,475
    expect(ltt(500000, 'ON', true).net).toBe(6475 - 4000);
  });
  it('Toronto pays the Ontario tax twice, with both rebates for first-time buyers', () => {
    expect(ltt(500000, 'ON-TOR').tax).toBe(6475 * 2);
    expect(ltt(500000, 'ON-TOR', true).net).toBe(6475 * 2 - 4000 - 4475);
    expect(ltt(3500000, 'ON-TOR').note).toMatch(/luxury/);
    // toronto.ca (from 1 April 2026): 4.40% from $3m to $4m
    expect(ltt(3500000, 'ON-TOR').parts[1].amount).toBe(Math.round(275 + 1950 + 2250 + 32000 + 25000 + 500000 * 0.044));
  });
  it('BC: 1% / 2% / 3% plus 2% above $3m; first-time buyers save up to $8,000, phased out to $860,000', () => {
    expect(ltt(500000, 'BC').tax).toBe(2000 + 6000);
    expect(ltt(500000, 'BC', true).net).toBe(0);
    expect(ltt(800000, 'BC', true).net).toBe(2000 + 12000 - 8000);
    expect(ltt(847500, 'BC', true).rebate).toBe(4000); // halfway through the phase-out
    expect(ltt(900000, 'BC', true).rebate).toBe(0);
    expect(ltt(3500000, 'BC').tax).toBe(2000 + 36000 + 30000 + 25000);
  });
  it('Alberta: no tax, only the $50 + $5 per $5,000 title fee', () => {
    expect(ltt(500000, 'AB').net).toBe(550);
    expect(ltt(665600, 'AB').net).toBe(720);
  });
  it('Quebec 2026: 0.5% / 1% / 1.5%; first-time buyer credit up to $5,875 on homes to $750,000', () => {
    expect(ltt(500000, 'QC').tax).toBe(Math.round(62900 * 0.005 + 252100 * 0.01 + 185000 * 0.015)); // $5,610
    expect(ltt(500000, 'QC', true).rebate).toBe(5000 + Math.round(0.25 * 610));
    expect(ltt(700000, 'QC', true).rebate).toBe(5875);
    expect(ltt(900000, 'QC', true).rebate).toBe(0);
    expect(ltt(800000, 'QC-MTL').tax).toBe(Math.round(62900 * 0.005 + 252100 * 0.01 + 237300 * 0.015 + 247700 * 0.02));
  });
  it('Manitoba, New Brunswick, Halifax, PEI, Saskatchewan, Newfoundland and Labrador', () => {
    expect(ltt(300000, 'MB').tax).toBe(300 + 600 + 750 + 2000);
    expect(ltt(300000, 'NB').tax).toBe(3000);
    expect(ltt(300000, 'NS-HFX').tax).toBe(4500);
    expect(ltt(300000, 'PE', true).net).toBe(0);
    expect(ltt(300000, 'SK').tax).toBe(1200);
    expect(ltt(300000, 'NL').tax).toBe(100 + 0.4 * 2995);
  });
});
