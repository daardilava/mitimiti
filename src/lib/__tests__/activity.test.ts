import { describe, expect, it } from 'vitest';
import { activityView, countLabel, dailySpend, fold, isCurrentOrLater, niceTicks, paymentTitle, periodLabel, periodRange, shiftPeriod, type ActivityPayment } from '../activity';
import { addDays, dayHeading, monthLabel, monthNameOf, shiftMonth, weekLabel, weekStart } from '../dates';
import { ME, names, PARTNER, sampleExpenses, sampleSettlements } from '../sample';

const payments: ActivityPayment[] = sampleSettlements.map((s, i) => ({ ...s, id: `s${i}`, method: 'transfer', paidOn: '2026-10-03' }));
const october = (opts: Partial<Parameters<typeof activityView>[2]> = {}) =>
  activityView(sampleExpenses, payments, { ...periodRange('month', '2026-10-18'), me: ME, names, ...opts });
const descriptions = (m: ReturnType<typeof october>) =>
  m.days.flatMap((d) => d.items.map((i) => (i.kind === 'expense' ? i.expense.description : paymentTitle(i.payment, names))));

describe('Movimientos for the sample month (UI design, screen 08)', () => {
  it('counts 11 movimientos · $3.941.900 en gastos (personal included, payments not summed)', () => {
    const m = october();
    expect(countLabel(m.count)).toBe('11 movimientos');
    expect(m.expensesTotalMinor).toBe(3_941_900);
  });

  it('groups by day, newest first, keeping the order within a day', () => {
    const m = october();
    expect(m.days.map((d) => d.date)).toEqual(['2026-10-13', '2026-10-12', '2026-10-11', '2026-10-09', '2026-10-07', '2026-10-06', '2026-10-05', '2026-10-03', '2026-10-01']);
    expect(m.days[2].items.map((i) => i.kind === 'expense' && i.expense.description)).toEqual(['Taxi al concierto', 'Boletas del concierto']);
    expect(m.days[7].items[0].kind).toBe('payment');
  });

  it('filters by who paid; payments between them only under Todo and Pagos', () => {
    expect(october({ filter: 'mine' }).days.flatMap((d) => d.items).every((i) => i.kind === 'expense' && i.expense.paidBy === ME)).toBe(true);
    expect(october({ filter: 'theirs' }).days.flatMap((d) => d.items).every((i) => i.kind === 'expense' && i.expense.paidBy === PARTNER)).toBe(true);
    expect(descriptions(october({ filter: 'payments' }))).toEqual(['Ana le pagó a Diego']);
    // Filters narrow the list, not the month's totals.
    expect(october({ filter: 'payments' }).count).toBe(11);
  });

  it('searches description and category, ignoring case and accents', () => {
    expect(descriptions(october({ query: 'CONCIERTO' }))).toEqual(['Taxi al concierto', 'Boletas del concierto']);
    expect(descriptions(october({ query: 'super' }))).toEqual(['Mercado de la semana', 'Mercado']);
    expect(descriptions(october({ query: 'transferencia' }))).toEqual(['Ana le pagó a Diego']);
    expect(october({ query: 'nada parecido' }).days).toEqual([]);
  });

  it('is empty for a month without activity', () => {
    const m = activityView(sampleExpenses, payments, { ...periodRange('month', '2026-09-10'), me: ME });
    expect(m).toEqual({ count: 0, expensesTotalMinor: 0, days: [] });
  });
});

describe('month and day labels', () => {
  const today = new Date(2026, 9, 14);

  it('moves between months across years', () => {
    expect(shiftMonth('2026-10', -1)).toBe('2026-09');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(monthLabel('2026-09')).toBe('Septiembre 2026');
    expect(monthNameOf('2026-09')).toBe('septiembre');
  });

  it('heads each day like the design', () => {
    expect(dayHeading('2026-10-14', today)).toBe('Hoy');
    expect(dayHeading('2026-10-13', today)).toBe('Ayer');
    expect(dayHeading('2026-10-12', today)).toBe('Lunes 12 de octubre');
  });

  it('folds text for search', () => {
    expect(fold('  Súper Café ')).toBe('super cafe');
  });
});

describe('day / week / month periods', () => {
  const today = new Date(2026, 9, 18); // Sunday 18 Oct 2026

  it('weeks run Monday to Sunday, across months', () => {
    expect(weekStart('2026-10-18')).toBe('2026-10-12');
    expect(weekStart('2026-10-12')).toBe('2026-10-12');
    expect(periodRange('week', '2026-10-01')).toEqual({ start: '2026-09-28', end: '2026-10-04' });
    expect(weekLabel('2026-10-12')).toBe('12 – 18 oct');
    expect(weekLabel('2026-09-28')).toBe('28 sep – 4 oct');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('ranges, steps and labels each period', () => {
    expect(periodRange('day', '2026-10-13')).toEqual({ start: '2026-10-13', end: '2026-10-13' });
    expect(periodRange('month', '2026-02-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(shiftPeriod('day', '2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftPeriod('week', '2026-10-15', -1)).toBe('2026-10-05');
    expect(shiftPeriod('month', '2026-10-18', -1)).toBe('2026-09-01');
    expect(periodLabel('day', '2026-10-18', today)).toBe('Hoy, 18 oct');
    expect(periodLabel('week', '2026-10-14', today)).toBe('12 – 18 oct');
    expect(periodLabel('month', '2026-10-14', today)).toBe('Octubre 2026');
  });

  it('never moves into the future', () => {
    expect(isCurrentOrLater('day', '2026-10-18', today)).toBe(true);
    expect(isCurrentOrLater('day', '2026-10-17', today)).toBe(false);
    expect(isCurrentOrLater('week', '2026-10-12', today)).toBe(true);
    expect(isCurrentOrLater('week', '2026-10-05', today)).toBe(false);
    expect(isCurrentOrLater('month', '2026-09-30', today)).toBe(false);
  });

  it('a week shows only its days: 5 to 11 Oct of the sample', () => {
    const week = activityView(sampleExpenses, payments, { ...periodRange('week', '2026-10-08'), me: ME, names });
    expect(week.days.map((d) => d.date)).toEqual(['2026-10-11', '2026-10-09', '2026-10-07', '2026-10-06', '2026-10-05']);
  });
});

describe('chart data', () => {
  it('spends per day by who paid, shared only, with empty days as zeros', () => {
    const week = dailySpend(sampleExpenses, '2026-10-05', '2026-10-11', ME);
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ date: '2026-10-05', mineMinor: 99_900, theirsMinor: 48_000 });
    expect(week[2]).toEqual({ date: '2026-10-07', mineMinor: 0, theirsMinor: 0 }); // the gift was personal
    expect(week[6]).toEqual({ date: '2026-10-11', mineMinor: 28_000, theirsMinor: 360_000 });
  });

  it('the month chart adds up to "Gastado juntos" on Home', () => {
    const month = dailySpend(sampleExpenses, '2026-10-01', '2026-10-31', ME);
    expect(month).toHaveLength(31);
    expect(month.reduce((s, d) => s + d.mineMinor, 0)).toBe(2_812_900);
    expect(month.reduce((s, d) => s + d.theirsMinor, 0)).toBe(1_009_000);
  });

  it('rounds axis ticks to clean numbers', () => {
    expect(niceTicks(388_000)).toEqual([0, 200_000, 400_000]);
    expect(niceTicks(2_400_000)).toEqual([0, 1_000_000, 2_000_000, 3_000_000]);
    expect(niceTicks(0)).toEqual([0]);
  });
});
