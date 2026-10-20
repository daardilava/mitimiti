// Exportar movimientos (Ajustes): the expenses and payments of a period as rows, and those rows as a CSV file for
// Excel, Google Sheets or Numbers. Pure, so Vitest covers it; src/api/exportFile.ts writes and shares the file.
//
// The file follows what spreadsheets expect in each language: Spanish and German use ";" between fields and a decimal
// comma, English "," and a decimal point. It starts with a UTF-8 BOM so Excel keeps the accents, and ends lines with
// CRLF (RFC 4180). Amounts are plain numbers (toDecimalText), so the columns can be summed.
import { es, type Messages } from '../i18n/es';
import { paymentTitle, type ActivityExpense, type ActivityPayment } from './activity';
import { addDays, isoDate, monthOf, shiftMonth } from './dates';
import { toDecimalText, type Currency } from './money';
import { splitShares } from './splits';

export type ExportPreset = 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear' | 'all';

export const EXPORT_PRESETS: ExportPreset[] = ['thisMonth', 'lastMonth', 'last3Months', 'thisYear', 'all'];

/** First and last day (YYYY-MM-DD, inclusive). `start: null` means from the very first movement. */
export interface ExportRange {
  start: string | null;
  end: string;
}

const lastDayOf = (month: string) => addDays(`${shiftMonth(month, 1)}-01`, -1);

export function presetRange(preset: ExportPreset, today = new Date()): ExportRange {
  const month = monthOf(isoDate(today));
  switch (preset) {
    case 'thisMonth':
      return { start: `${month}-01`, end: lastDayOf(month) };
    case 'lastMonth': {
      const last = shiftMonth(month, -1);
      return { start: `${last}-01`, end: lastDayOf(last) };
    }
    case 'last3Months':
      return { start: `${shiftMonth(month, -2)}-01`, end: lastDayOf(month) };
    case 'thisYear':
      return { start: `${month.slice(0, 4)}-01-01`, end: `${month.slice(0, 4)}-12-31` };
    case 'all':
      return { start: null, end: lastDayOf(month) };
  }
}

const inRange = (date: string, r: ExportRange) => (r.start === null || date >= r.start) && date <= r.end;

export interface ExportCouple {
  me: { id: string; name: string };
  partner: { id: string; name: string };
  currency: Currency;
}

export type ExportRow =
  | { kind: 'expense'; date: string; expense: ActivityExpense; myShare: number; partnerShare: number }
  | { kind: 'payment'; date: string; payment: ActivityPayment };

/** The period's expenses and payments, oldest first; on the same day, expenses before payments. */
export function exportRows(expenses: ActivityExpense[], payments: ActivityPayment[], range: ExportRange, couple: ExportCouple): ExportRow[] {
  const rows: ExportRow[] = [
    ...expenses.filter((e) => inRange(e.spentOn, range)).map((expense): ExportRow => {
      const { payer, partner } = splitShares(expense);
      const iPaid = expense.paidBy === couple.me.id;
      return { kind: 'expense', date: expense.spentOn, expense, myShare: iPaid ? payer : partner, partnerShare: iPaid ? partner : payer };
    }),
    ...payments.filter((p) => inRange(p.paidOn, range)).map((payment): ExportRow => ({ kind: 'payment', date: payment.paidOn, payment })),
  ];
  const order = { expense: 0, payment: 1 };
  return rows.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind]);
}

/** "12 gastos y 2 pagos" */
export function exportSummary(rows: ExportRow[], m: Messages = es): string {
  const expenses = rows.filter((r) => r.kind === 'expense').length;
  return m.exportData.summary(expenses, rows.length - expenses);
}

/** ";" and a decimal comma for Spanish and German; "," and a decimal point for English. */
export function csvDialect(m: Messages): { delimiter: ',' | ';'; decimal: '.' | ',' } {
  return m.language.locale === 'en' ? { delimiter: ',', decimal: '.' } : { delimiter: ';', decimal: ',' };
}

/**
 * One CSV field. Text that a spreadsheet would run as a formula (starting with = + - @, tab or CR) gets a leading
 * apostrophe, so a description like "=HYPERLINK(…)" stays text. Quoted when it holds the delimiter, a quote or a newline.
 */
export function csvField(value: string, delimiter: string, { text = true } = {}): string {
  const safe = text && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return safe.includes(delimiter) || /["\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildCsv(rows: ExportRow[], couple: ExportCouple, m: Messages = es): string {
  const { delimiter, decimal } = csvDialect(m);
  const c = m.exportData.csv;
  const names: Record<string, string> = { [couple.me.id]: couple.me.name, [couple.partner.id]: couple.partner.name };
  const amount = (minor: number) => toDecimalText(minor, couple.currency, decimal);

  const splitLabel = (e: ActivityExpense) => {
    const payer = names[e.paidBy] ?? '';
    const other = e.paidBy === couple.me.id ? couple.partner.name : couple.me.name;
    switch (e.splitMode) {
      case 'half':
        return m.expense.splitHalf;
      case 'pct':
        return c.splitPct(payer, e.splitPct ?? 0, other, 100 - (e.splitPct ?? 0));
      case 'other':
        return m.expense.splitOther(other);
      case 'personal':
        return m.expense.splitPersonal;
    }
  };

  const header: string[] = [c.date, c.type, c.description, c.category, c.paidBy, c.amount, c.currency, c.split, c.shareOf(couple.me.name), c.shareOf(couple.partner.name)];
  const lines = [header.map((h) => csvField(h, delimiter)).join(delimiter)];
  for (const row of rows) {
    // [value, whether it is free text and so needs the formula guard]
    const cells: [string, boolean][] =
      row.kind === 'expense'
        ? [
            [row.date, false],
            [c.expense, true],
            [row.expense.description, true],
            [m.categories[row.expense.category], true],
            [names[row.expense.paidBy] ?? '', true],
            [amount(row.expense.amountMinor), false],
            [couple.currency, false],
            [splitLabel(row.expense), true],
            [amount(row.myShare), false],
            [amount(row.partnerShare), false],
          ]
        : [
            [row.date, false],
            [c.payment, true],
            [paymentTitle(row.payment, names, m), true],
            [m.activity.methods[row.payment.method], true],
            [names[row.payment.fromUser] ?? '', true],
            [amount(row.payment.amountMinor), false],
            [couple.currency, false],
            ['', false],
            ['', false],
            ['', false],
          ];
    lines.push(cells.map(([value, text]) => csvField(value, delimiter, { text })).join(delimiter));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** "a-medias-movimientos_2026-10-01_2026-10-31.csv", or only the end date for Todo: "…_2026-10-31.csv". */
export function exportFileName(range: ExportRange, extension: 'csv' | 'pdf', m: Messages = es): string {
  const dates = range.start ? `${range.start}_${range.end}` : range.end;
  return `${m.exportData.fileName}_${dates}.${extension}`;
}
