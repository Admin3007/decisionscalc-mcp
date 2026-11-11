import { describe, it, expect } from 'vitest';
import { budgetHousehold } from './ie-budget-household';
import { FUEL_RATE } from './ie-fuel';

describe('Budget 2027 household payments (overhaul B6)', () => {
  it('the Fuel Allowance rise matches the fuel module (€38 → €43)', () => { expect(FUEL_RATE['2027'] - FUEL_RATE['2026']).toBe(5); });
  it('a pensioner couple on two State Pensions with Fuel Allowance: €1,040 + €140 a year more', () => {
    const r = budgetHousehold({ corePayments: 2, fuelAllowance: true, livingAlone: false, cspChildren: 0, children: 0 });
    expect(r.core).toBe(1040);
    expect(r.fuel).toBe(140);
    expect(r.total).toBe(1180);
  });
  it('one parent on a core payment with two children: €520 + €624 a year more; Child Benefit unchanged at €3,360', () => {
    const r = budgetHousehold({ corePayments: 1, fuelAllowance: false, livingAlone: false, cspChildren: 2, children: 2 });
    expect(r.total).toBe(520 + 624);
    expect(r.childBenefit).toBe(3360);
  });
  it('living alone adds €156 a year', () => { expect(budgetHousehold({ corePayments: 1, fuelAllowance: false, livingAlone: true, cspChildren: 0, children: 0 }).livingAlone).toBe(156); });
});
