import { describe, expect, it } from 'vitest';
import { en } from '../../i18n/en';
import { es } from '../../i18n/es';
import type { ActivityExpense, ActivityPayment } from '../activity';
import { dateLabels } from '../dates';
import { exportRows, presetRange, type ExportCouple } from '../exportData';
import { balanceAt, buildPdfHtml, categoryTotals, escapeHtml, periodDates, periodTotals, statement } from '../exportPdf';

const DIEGO = 'user_diego';
const ANA = 'user_ana';
const couple: ExportCouple = { me: { id: DIEGO, name: 'Diego' }, partner: { id: ANA, name: 'Ana' }, currency: 'COP' };
const today = new Date(2026, 9, 19); // 19 Oct 2026

const expense = (over: Partial<ActivityExpense>): ActivityExpense => ({
  id: 'e',
  paidBy: DIEGO,
  amountMinor: 100_000,
  category: 'super',
  description: 'Mercado',
  spentOn: '2026-10-13',
  splitMode: 'half',
  ...over,
});
const payment = (over: Partial<ActivityPayment>): ActivityPayment => ({
  id: 'p',
  fromUser: ANA,
  toUser: DIEGO,
  amountMinor: 30_000,
  method: 'transfer',
  paidOn: '2026-10-14',
  ...over,
});

const expenses = [
  expense({ spentOn: '2026-09-20', amountMinor: 40_000 }), // September: only in the opening balance
  expense({ amountMinor: 100_000 }), // Diego paid, half
  expense({ paidBy: ANA, amountMinor: 60_000, splitMode: 'pct', splitPct: 50, category: 'casa' }),
  expense({ amountMinor: 25_000, splitMode: 'personal', description: 'Corte de pelo', category: 'otros' }),
];
const payments = [payment({})];
const range = presetRange('thisMonth', today);
const rows = exportRows(expenses, payments, range, couple);
const html = (over: Partial<Parameters<typeof buildPdfHtml>[0]> = {}) =>
  buildPdfHtml({ rows, range, couple, allExpenses: expenses, allPayments: payments, m: es, d: dateLabels(es.dates), today, ...over });

describe('periodTotals', () => {
  it('splits shared spending by who paid and whose share it is; personal and payments apart', () => {
    expect(periodTotals(rows, couple)).toEqual({
      sharedMinor: 160_000,
      sharedCount: 2,
      paidByMe: 100_000,
      paidByPartner: 60_000,
      myShare: 80_000,
      partnerShare: 80_000,
      personalMinor: 25_000,
      personalCount: 1,
      paymentsMinor: 30_000,
      paymentsCount: 1,
    });
  });
});

describe('statement', () => {
  it('opening + the period’s expenses + its payments = the closing balance', () => {
    // Sept: Ana owes 20.000. Oct: +50.000 (Diego paid half), −30.000 (Ana paid 50/50 of 60.000), −30.000 (her payment).
    const s = statement(rows, range, expenses, payments, DIEGO);
    expect(s).toEqual({ opening: 20_000, fromExpenses: 20_000, fromPayments: -30_000, closing: 10_000 });
    expect(s.closing).toBe(balanceAt(expenses, payments, range.end, DIEGO));
  });

  it('starts at zero for Todo', () => {
    const all = presetRange('all', today);
    const s = statement(exportRows(expenses, payments, all, couple), all, expenses, payments, DIEGO);
    expect(s.opening).toBe(0);
    expect(s.closing).toBe(10_000);
  });
});

describe('categoryTotals', () => {
  it('ranks shared spending by category, leaves personal out, and gives percentages', () => {
    expect(categoryTotals(rows)).toEqual([
      { category: 'super', amountMinor: 100_000, pct: 63 },
      { category: 'casa', amountMinor: 60_000, pct: 37 },
    ]);
  });

  it('always adds up to exactly 100 %', () => {
    const thirds = exportRows(
      [expense({ category: 'super' }), expense({ category: 'casa' }), expense({ category: 'ocio' })],
      [],
      presetRange('all', today),
      couple,
    );
    const pcts = categoryTotals(thirds).map((c) => c.pct);
    expect(pcts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(pcts).toEqual([34, 33, 33]);
  });

  it('adds up to 100 % when several points were lost to rounding', () => {
    // Seven equal categories: 14.28… each, so flooring loses 2 points.
    const cats = ['super', 'casa', 'ocio', 'comida', 'servicios', 'transporte', 'viajes'] as const;
    const sevenths = exportRows(cats.map((category) => expense({ category })), [], presetRange('all', today), couple);
    const pcts = categoryTotals(sevenths).map((c) => c.pct);
    expect(pcts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(pcts).toEqual([15, 15, 14, 14, 14, 14, 14]);
  });
});

describe('periodDates', () => {
  it('never runs past today, and starts Todo at the first movement', () => {
    expect(periodDates(rows, range, today)).toEqual({ from: '2026-10-01', to: '2026-10-19' });
    expect(periodDates(rows, presetRange('lastMonth', today), today)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    const all = exportRows(expenses, payments, presetRange('all', today), couple);
    expect(periodDates(all, presetRange('all', today), today)).toEqual({ from: '2026-09-20', to: '2026-10-19' });
  });
});

describe('buildPdfHtml', () => {
  it('answers first: the balance in words, then how it got there', () => {
    const out = html();
    expect(out).toContain('Diego y Ana · 1 oct 2026 – 19 oct 2026');
    expect(out).toContain('Saldo al 19 oct 2026');
    expect(out).toContain('Ana le debe $10.000 a Diego');
    expect(out).toContain('Saldo al 30 sep 2026');
    expect(out).toContain('$20.000 a favor de Diego');
    expect(out).toContain('$30.000 a favor de Ana');
  });

  it('shows who paid against their share; the two differences cancel out', () => {
    const out = html();
    expect(out).toContain('+$20.000');
    expect(out).toContain('−$20.000');
  });

  it('has one row per movement, labels payments and personal with words, and groups months only when there are several', () => {
    const out = html();
    expect(out.match(/<tr class="pay">/g)).toHaveLength(1);
    expect(out).toContain('>Pago</span>Transferencia');
    expect(out).toContain('>Personal</span>');
    expect(out).not.toContain('class="month"');
    const all = presetRange('all', today);
    expect(html({ rows: exportRows(expenses, payments, all, couple), range: all })).toContain('Septiembre 2026');
  });

  it('escapes what people typed, so it cannot inject markup', () => {
    const name = { id: DIEGO, name: 'Die"go' };
    const evil = exportRows([expense({ description: '<img src=x onerror=alert(1)>' })], [], range, { ...couple, me: name });
    const out = html({ rows: evil, couple: { ...couple, me: name } });
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(out).toContain('Die&quot;go');
    expect(escapeHtml(`a&b<c>"d'`)).toBe('a&amp;b&lt;c&gt;&quot;d&#39;');
  });

  it('says "Están a mano" at zero, and the other way round when I owe', () => {
    expect(html({ rows: [], allExpenses: [], allPayments: [] })).toContain('Están a mano');
    const owing = [expense({ paidBy: ANA, amountMinor: 100_000 })];
    expect(html({ rows: exportRows(owing, [], range, couple), allExpenses: owing, allPayments: [] })).toContain('Diego le debe $50.000 a Ana');
  });

  it('follows the language', () => {
    const out = html({ m: en, d: dateLabels(en.dates) });
    expect(out).toContain('<html lang="en">');
    expect(out).toContain('Diego and Ana');
    expect(out).toContain('Ana owes Diego $10.000');
  });
});
