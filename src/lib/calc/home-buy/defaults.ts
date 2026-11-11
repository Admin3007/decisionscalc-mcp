/**
 * Home Buying Planner: the blank spreadsheet's starting values per edition, as engine inputs. Example inputs for the
 * buyer to change (prices, rates and fees are not official figures). Used by the generator, the MCP tool and the tests.
 */
import type { PlanInput } from './engine.ts';

type Defaults = Omit<PlanInput, 'edition'>;
const common: Pick<Defaults, 'buyers' | 'savingsRate' | 'term' | 'rentGrowth' | 'priceGrowth' | 'investReturn' | 'maintPct' | 'hoa' | 'newBuild' | 'firstTime' | 'depositPct'> = { buyers: 2, savingsRate: 3, term: 30, rentGrowth: 3, priceGrowth: 3, investReturn: 5, maintPct: 1, hoa: 0, newBuild: false, firstTime: true, depositPct: 10 };

export const DEFAULTS: Record<'us' | 'gb' | 'ca' | 'au' | 'ie', Defaults> = {
  us: { ...common, region: 'NC', price: 400000, income1: 70000, income2: 45000, debts: 400, savings: 30000, monthlySaving: 1500, savingsRate: 4,
    rate: 7, rent: 2000, sellCostPct: 6, legal: 3000, survey: 900, lenderFees: 4000, moving: 2000, furniture: 3000, insurance: 1800, pmiPct: 0.6 },
  gb: { ...common, region: 'England', price: 300000, income1: 40000, income2: 32000, debts: 200, savings: 20000, monthlySaving: 800, savingsRate: 4,
    rate: 4.5, rent: 1300, sellCostPct: 1.8, legal: 1800, survey: 600, lenderFees: 999, moving: 800, furniture: 2000, insurance: 400, lisaMonthly: 400 },
  ca: { ...common, region: 'ON', price: 650000, income1: 85000, income2: 65000, debts: 500, savings: 40000, monthlySaving: 2000,
    rate: 4.5, term: 25, rent: 2400, sellCostPct: 5, legal: 2000, survey: 600, lenderFees: 500, moving: 2000, furniture: 3000, insurance: 1400,
    propTax: 0.9, heating: 100, fhsaAnnual: 16000, marginalRate: 30, hbp: 0 },
  au: { ...common, region: 'NSW', price: 750000, income1: 90000, income2: 70000, debts: 300, savings: 50000, monthlySaving: 2000, savingsRate: 4.5,
    rate: 6, rent: 2600, sellCostPct: 2.5, legal: 1800, survey: 600, lenderFees: 600, moving: 2000, furniture: 4000,
    insurance: 1800, propTax: 2000, capital: true, useScheme: true, lmiPct: 2 },
  ie: { ...common, region: '', price: 400000, income1: 55000, income2: 45000, debts: 0, savings: 25000, monthlySaving: 1500, savingsRate: 2,
    rate: 3.8, rent: 1900, sellCostPct: 2.5, legal: 2500, survey: 500, lenderFees: 300, moving: 800, furniture: 3000, insurance: 450,
    propTax: 0, taxPaid: 40000 },
};

