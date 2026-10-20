import { describe, expect, it } from 'vitest';
import { de } from '../../i18n/de';
import { en } from '../../i18n/en';
import type { ActivityExpense, ActivityPayment } from '../activity';
import { buildCsv, csvField, exportFileName, exportRows, exportSummary, presetRange, type ExportCouple } from '../exportData';

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
  amountMinor: 50_000,
  method: 'transfer',
  paidOn: '2026-10-14',
  ...over,
});

/** The CSV without the BOM, split into lines and fields. */
const table = (csv: string, delimiter = ';') =>
  csv
    .replace(/^﻿/, '')
    .trimEnd()
    .split('\r\n')
    .map((line) => line.split(delimiter));

describe('presetRange', () => {
  it('covers whole months and years, inclusive', () => {
    expect(presetRange('thisMonth', today)).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(presetRange('lastMonth', today)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(presetRange('last3Months', today)).toEqual({ start: '2026-08-01', end: '2026-10-31' });
    expect(presetRange('thisYear', today)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
    expect(presetRange('all', today)).toEqual({ start: null, end: '2026-10-31' });
  });

  it('crosses the year in January', () => {
    const january = new Date(2027, 0, 5);
    expect(presetRange('lastMonth', january)).toEqual({ start: '2026-12-01', end: '2026-12-31' });
    expect(presetRange('last3Months', january)).toEqual({ start: '2026-11-01', end: '2027-01-31' });
  });
});

describe('exportRows', () => {
  it('keeps the period only, oldest first, expenses before payments on the same day', () => {
    const rows = exportRows(
      [expense({ id: 'late', spentOn: '2026-10-20' }), expense({ id: 'early', spentOn: '2026-10-02' }), expense({ id: 'sept', spentOn: '2026-09-30' })],
      [payment({ paidOn: '2026-10-20' })],
      presetRange('thisMonth', today),
      couple,
    );
    expect(rows.map((r) => (r.kind === 'expense' ? r.expense.id : 'payment'))).toEqual(['early', 'late', 'payment']);
    expect(exportSummary(rows)).toBe('2 gastos y 1 pago');
  });

  it('gives each person their share; the two always add up to the amount', () => {
    const rows = exportRows(
      [
        expense({ amountMinor: 100_001, splitMode: 'half' }),
        expense({ paidBy: ANA, amountMinor: 100_000, splitMode: 'pct', splitPct: 60 }),
        expense({ amountMinor: 30_000, splitMode: 'other' }),
        expense({ amountMinor: 20_000, splitMode: 'personal' }),
      ],
      [],
      presetRange('all', today),
      couple,
    );
    const shares = rows.map((r) => (r.kind === 'expense' ? [r.myShare, r.partnerShare] : []));
    // The payer keeps the odd peso; Ana paid 60 % for herself.
    expect(shares).toEqual([
      [50_001, 50_000],
      [40_000, 60_000],
      [0, 30_000],
      [20_000, 0],
    ]);
  });
});

describe('buildCsv', () => {
  const rows = exportRows(
    [expense({ splitMode: 'pct', splitPct: 60 }), expense({ spentOn: '2026-10-15', description: 'Cena; con "amigos"', category: 'comida', splitMode: 'other' })],
    [payment({})],
    presetRange('thisMonth', today),
    couple,
  );

  it('starts with a BOM, has a header, one line per movement and CRLF line ends', () => {
    const csv = buildCsv(rows, couple);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(table(csv)[0]).toEqual(['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Pagó', 'Monto', 'Moneda', 'División', 'Parte de Diego', 'Parte de Ana']);
    expect(table(csv)).toHaveLength(1 + 3);
  });

  it('writes expenses and payments in Spanish, with plain amounts', () => {
    const [, first, payment] = table(buildCsv(rows, couple));
    expect(first).toEqual(['2026-10-13', 'Gasto', 'Mercado', 'Súper', 'Diego', '100000', 'COP', 'Diego 60 % · Ana 40 %', '60000', '40000']);
    expect(payment).toEqual(['2026-10-14', 'Pago', 'Ana le pagó a Diego', 'Transferencia', 'Ana', '50000', 'COP', '', '', '']);
  });

  it('quotes a field that holds the delimiter or quotes', () => {
    expect(buildCsv(rows, couple)).toContain(';"Cena; con ""amigos""";Comida fuera;');
  });

  it('uses "," and a decimal point in English, ";" and a decimal comma in German', () => {
    const eur = { ...couple, currency: 'EUR' as const };
    const cents = exportRows([expense({ amountMinor: 123_45 })], [], presetRange('all', today), eur);
    expect(table(buildCsv(cents, eur, en), ',')[1]).toEqual(['2026-10-13', 'Expense', 'Mercado', 'Groceries', 'Diego', '123.45', 'EUR', 'Half and half', '61.73', '61.72']);
    expect(table(buildCsv(cents, eur, de))[1].slice(5, 7)).toEqual(['123,45', 'EUR']);
  });
});

describe('csvField', () => {
  it('stops a description from running as a spreadsheet formula', () => {
    expect(csvField('=HYPERLINK("http://x")', ';')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvField('+57 300', ';')).toBe("'+57 300");
    expect(csvField('@sum', ';')).toBe("'@sum");
  });

  it('leaves numbers and dates alone', () => {
    expect(csvField('-10,50', ';', { text: false })).toBe('-10,50');
    expect(csvField('Mercado', ';')).toBe('Mercado');
  });

  it('quotes newlines', () => {
    expect(csvField('línea 1\nlínea 2', ';')).toBe('"línea 1\nlínea 2"');
  });
});

describe('exportFileName', () => {
  it('names the period', () => {
    expect(exportFileName(presetRange('thisMonth', today), 'csv')).toBe('a-medias-movimientos_2026-10-01_2026-10-31.csv');
    expect(exportFileName(presetRange('all', today), 'csv', en)).toBe('a-medias-activity_2026-10-31.csv');
  });
});
