import { describe, expect, it } from 'vitest';
import { budgetStatus, daysLeftInMonth, daysLeftLabel, effectiveLimits, monthBudget, monthBudgetLine, stepLimit, type BudgetRow } from '../budgets';
import { sampleBudgets, sampleExpenses } from '../sample';

describe('Presupuestos for the sample month (UI design, screens 05 and 12)', () => {
  const b = monthBudget(sampleExpenses, sampleBudgets, '2026-10', 'COP');
  const row = (c: string) => b.categories.find((x) => x.category === c)!;

  it('$3.821.900 de $5.300.000 · 72 % · Les quedan $1.478.100', () => {
    expect(b.spentMinor).toBe(3_821_900);
    expect(b.totalLimitMinor).toBe(5_300_000);
    expect(b.pct).toBe(72);
    expect(b.status).toMatchObject({ tone: 'ok', text: 'Quedan $1.478.100' });
    expect(monthBudgetLine(b.spentMinor, b.totalLimitMinor, 'COP')).toBe('Les quedan $1.478.100 este mes');
  });

  it('the month line always says the state in words', () => {
    expect(monthBudgetLine(850, 1_000, 'COP')).toBe('Ojo: les quedan $150 este mes');
    expect(monthBudgetLine(1_000, 1_000, 'COP')).toBe('Llegaron al límite del mes');
    expect(monthBudgetLine(1_200, 1_000, 'COP')).toBe('Se pasaron por $200 este mes');
    expect(monthBudgetLine(500, 0, 'COP')).toMatch(/Aún no tienen límites/);
  });

  it('each category reads like the design', () => {
    expect(row('super').status).toMatchObject({ tone: 'ok', text: 'Quedan $719.000' });
    expect(row('comida').status).toMatchObject({ tone: 'ok', text: 'Quedan $360.000' });
    expect(row('casa').status).toMatchObject({ tone: 'warning', text: 'Ojo: quedan $100.000' });
    expect(row('servicios').status).toMatchObject({ tone: 'warning', text: 'Ojo: quedan $35.100' });
    expect(row('viajes').status).toMatchObject({ tone: 'none', text: 'Sin límite' });
  });

  it('lists every category in the app order, personal spending left out', () => {
    expect(b.categories.map((c) => c.category)).toEqual(['super', 'comida', 'casa', 'servicios', 'transporte', 'ocio', 'viajes', 'regalos', 'otros']);
    expect(row('regalos').spentMinor).toBe(0); // the gift was personal
  });
});

describe('status thresholds (UI kit: green to 79 %, amber from 80 %, red when over)', () => {
  it('79 % ok, 80 % warning, 100 % at the limit, over is red', () => {
    expect(budgetStatus(79, 100, 'COP').tone).toBe('ok');
    expect(budgetStatus(80, 100, 'COP').tone).toBe('warning');
    expect(budgetStatus(100, 100, 'COP')).toMatchObject({ tone: 'warning', text: 'Llegaron al límite' });
    expect(budgetStatus(420_000, 400_000, 'COP')).toMatchObject({ tone: 'over', text: 'Se pasaron por $20.000' });
  });
});

describe('limits carry over to later months', () => {
  const rows: BudgetRow[] = [
    { category: 'super', month: '2026-08-01', limitMinor: 1_000_000 },
    { category: 'super', month: '2026-10-01', limitMinor: 1_200_000 },
    { category: 'casa', month: '2026-10-01', limitMinor: 0 },
  ];

  it('uses the latest limit at or before the month', () => {
    expect(effectiveLimits(rows, '2026-07').get('super')).toBeUndefined();
    expect(effectiveLimits(rows, '2026-09').get('super')).toBe(1_000_000);
    expect(effectiveLimits(rows, '2026-10').get('super')).toBe(1_200_000);
    expect(effectiveLimits(rows, '2027-02').get('super')).toBe(1_200_000);
    expect(effectiveLimits(rows, '2026-10').get('casa')).toBe(0); // set back to none
  });
});

describe('controls', () => {
  it('− / + move by the currency step and never go below zero', () => {
    expect(stepLimit(1_200_000, 1, 'COP')).toBe(1_250_000);
    expect(stepLimit(30_000, -1, 'COP')).toBe(0);
    expect(stepLimit(0, 1, 'EUR')).toBe(1_000);
  });

  it('counts the days left in the month', () => {
    expect(daysLeftInMonth(new Date(2026, 9, 14))).toBe(17);
    expect(daysLeftInMonth(new Date(2026, 1, 28))).toBe(0);
    expect(daysLeftLabel(17)).toBe('Quedan 17 días');
    expect(daysLeftLabel(1)).toBe('Queda 1 día');
    expect(daysLeftLabel(0)).toBe('Último día del mes');
  });
});
