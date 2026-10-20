import { describe, expect, it } from 'vitest';
import { en } from '../../i18n/en';
import { es } from '../../i18n/es';
import type { ActivityExpense, ActivityPayment } from '../activity';
import { dateLabels } from '../dates';
import { exportRows, presetRange, type ExportCouple } from '../exportData';
import { balanceAt, buildPdfHtml, escapeHtml, periodTotals } from '../exportPdf';

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
  expense({ spentOn: '2026-09-20', amountMinor: 40_000 }), // September: only in the balance
  expense({ amountMinor: 100_000 }), // Diego paid, half
  expense({ paidBy: ANA, amountMinor: 60_000, splitMode: 'pct', splitPct: 50 }),
  expense({ amountMinor: 25_000, splitMode: 'personal', description: 'Corte de pelo' }),
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
      paidByMe: 100_000,
      paidByPartner: 60_000,
      myShare: 80_000,
      partnerShare: 80_000,
      personalMinor: 25_000,
      paymentsMinor: 30_000,
    });
  });
});

describe('balanceAt', () => {
  it('counts everything up to the date, including before the period', () => {
    // Sept: Ana owes 20.000. Oct: +50.000 (Diego paid), −30.000 (Ana paid 50/50 of 60.000), −30.000 (her payment).
    expect(balanceAt(expenses, payments, '2026-10-31', DIEGO)).toBe(10_000);
    expect(balanceAt(expenses, payments, '2026-09-30', DIEGO)).toBe(20_000);
  });
});

describe('buildPdfHtml', () => {
  it('shows the couple, the period, the totals and the balance in words', () => {
    const out = html();
    expect(out).toContain('Diego y Ana · Del 1 oct 2026 al 31 oct 2026');
    expect(out).toContain('$160.000');
    // The balance is "today" while the period is still running, never a future day.
    expect(out).toContain('Saldo al 19 oct 2026');
    expect(out).toContain('Ana le debe $10.000 a Diego');
    expect(out).toContain('Gastos personales');
  });

  it('has one table row per movement, and marks payments with words, not only colour', () => {
    const out = html();
    expect(out.match(/<tr[ >]/g)).toHaveLength(1 + rows.length);
    expect(out).toContain('Pago · Transferencia');
  });

  it('escapes what people typed, so it cannot inject markup', () => {
    const evil = exportRows([expense({ description: '<img src=x onerror=alert(1)>' })], [], range, { ...couple, me: { id: DIEGO, name: 'Die"go' } });
    const out = html({ rows: evil, couple: { ...couple, me: { id: DIEGO, name: 'Die"go' } } });
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(out).toContain('Die&quot;go');
    expect(escapeHtml(`a&b<c>"d'`)).toBe('a&amp;b&lt;c&gt;&quot;d&#39;');
  });

  it('says "Están a mano" at zero, and the other way round when I owe', () => {
    expect(html({ allExpenses: [], allPayments: [] })).toContain('Están a mano');
    const owing = [expense({ paidBy: ANA, amountMinor: 100_000 })];
    expect(html({ allExpenses: owing, allPayments: [] })).toContain('Diego le debe $50.000 a Ana');
  });

  it('follows the language', () => {
    const out = html({ m: en, d: dateLabels(en.dates) });
    expect(out).toContain('<html lang="en">');
    expect(out).toContain('Diego and Ana');
    expect(out).toContain('Ana owes Diego $10.000');
  });
});
