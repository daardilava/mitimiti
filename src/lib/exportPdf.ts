// Exportar movimientos as a PDF: a one-file report of a period, built as HTML that expo-print turns into a PDF.
// Header (couple, period), totals (shared spending, who paid it, each one's share, personal, payments), the balance
// at the end of the period, and every movement in a table that repeats its header on each page. Pure, so Vitest
// covers it; the same rows as the CSV (exportRows).
//
// Paper is always white, so the colours are the light palette's tokens, never the phone's current theme. Fonts are
// the system's: the print view can't load the app's bundled fonts. Every text a person typed is HTML-escaped.
import type { Messages } from '../i18n/es';
import { palettes } from '../ui/tokens';
import type { ActivityExpense, ActivityPayment } from './activity';
import { paymentTitle } from './activity';
import type { DateLabels } from './dates';
import { isoDate } from './dates';
import type { ExportCouple, ExportRange, ExportRow } from './exportData';
import { formatMoney } from './money';
import { netBalance } from './splits';

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export interface PeriodTotals {
  /** Every expense that isn't personal. */
  sharedMinor: number;
  /** Of that, what each one paid. */
  paidByMe: number;
  paidByPartner: number;
  /** Of that, what belongs to each one (their shares). */
  myShare: number;
  partnerShare: number;
  personalMinor: number;
  paymentsMinor: number;
}

export function periodTotals(rows: ExportRow[], couple: ExportCouple): PeriodTotals {
  const t: PeriodTotals = { sharedMinor: 0, paidByMe: 0, paidByPartner: 0, myShare: 0, partnerShare: 0, personalMinor: 0, paymentsMinor: 0 };
  for (const row of rows) {
    if (row.kind === 'payment') {
      t.paymentsMinor += row.payment.amountMinor;
      continue;
    }
    const e = row.expense;
    if (e.splitMode === 'personal') {
      t.personalMinor += e.amountMinor;
      continue;
    }
    t.sharedMinor += e.amountMinor;
    if (e.paidBy === couple.me.id) t.paidByMe += e.amountMinor;
    else t.paidByPartner += e.amountMinor;
    t.myShare += row.myShare;
    t.partnerShare += row.partnerShare;
  }
  return t;
}

/** The balance with everything recorded up to `end` (inclusive), from `me`'s side: positive, the partner owes me. */
export function balanceAt(expenses: ActivityExpense[], payments: ActivityPayment[], end: string, me: string): number {
  return netBalance(
    expenses.filter((e) => e.spentOn <= end),
    payments.filter((p) => p.paidOn <= end),
    me,
  );
}

export interface PdfInput {
  rows: ExportRow[];
  range: ExportRange;
  couple: ExportCouple;
  /** Every expense and payment, not only the period's, for the balance at its end. */
  allExpenses: ActivityExpense[];
  allPayments: ActivityPayment[];
  m: Messages;
  d: DateLabels;
  today?: Date;
}

export function buildPdfHtml({ rows, range, couple, allExpenses, allPayments, m, d, today = new Date() }: PdfInput): string {
  const p = m.exportData.pdf;
  const c = m.exportData.csv;
  const c0 = palettes.light;
  const money = (minor: number) => escapeHtml(formatMoney(minor, couple.currency));
  const date = (iso: string) => escapeHtml(p.dateWithYear(d.shortDate(iso), Number(iso.slice(0, 4))));
  const names: Record<string, string> = { [couple.me.id]: couple.me.name, [couple.partner.id]: couple.partner.name };

  const t = periodTotals(rows, couple);
  const net = balanceAt(allExpenses, allPayments, range.end, couple.me.id);
  // Never later than today: "Saldo al 31 oct" on the 19th would claim days that haven't happened.
  const balanceDay = range.end < isoDate(today) ? range.end : isoDate(today);
  const balance =
    net === 0
      ? escapeHtml(p.even)
      : net > 0
        ? escapeHtml(p.owes(couple.partner.name, formatMoney(net, couple.currency), couple.me.name))
        : escapeHtml(p.owes(couple.me.name, formatMoney(net, couple.currency), couple.partner.name));

  const period = range.start ? p.range(date(range.start), date(range.end)) : p.until(date(balanceDay));

  const stat = (label: string, value: string) => `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div></div>`;

  const rowHtml = (row: ExportRow) => {
    if (row.kind === 'payment') {
      const pay = row.payment;
      return `<tr class="payment">
        <td class="date">${date(row.date)}</td>
        <td><div>${escapeHtml(paymentTitle(pay, names, m))}</div><div class="sub">${escapeHtml(c.payment)} · ${escapeHtml(m.activity.methods[pay.method])}</div></td>
        <td>${escapeHtml(names[pay.fromUser] ?? '')}</td>
        <td class="num">${money(pay.amountMinor)}</td>
        <td class="num muted">—</td><td class="num muted">—</td>
      </tr>`;
    }
    const e = row.expense;
    return `<tr>
      <td class="date">${date(row.date)}</td>
      <td><div>${escapeHtml(e.description || m.categories[e.category])}</div><div class="sub">${escapeHtml(m.categories[e.category])}${e.splitMode === 'personal' ? ` · ${escapeHtml(m.expense.splitPersonal)}` : ''}</div></td>
      <td>${escapeHtml(names[e.paidBy] ?? '')}</td>
      <td class="num">${money(e.amountMinor)}</td>
      <td class="num">${money(row.myShare)}</td>
      <td class="num">${money(row.partnerShare)}</td>
    </tr>`;
  };

  return `<!DOCTYPE html>
<html lang="${m.language.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Helvetica Neue", Roboto, Arial, sans-serif; color: ${c0.ink}; font-size: 10.5pt; line-height: 1.4; }
  .brand { font-weight: 700; color: ${c0.textSecondary}; font-size: 9pt; letter-spacing: 0.02em; }
  h1 { font-size: 22pt; margin: 4pt 0 2pt; }
  .meta { color: ${c0.textSecondary}; margin: 0 0 14pt; }
  .stats { display: flex; flex-wrap: wrap; gap: 8pt; margin-bottom: 10pt; }
  .stat { flex: 1 1 30%; border: 1px solid ${c0.line}; border-radius: 8pt; padding: 8pt 10pt; }
  .label { color: ${c0.textSecondary}; font-size: 9pt; }
  .value { font-weight: 700; font-size: 13pt; margin-top: 2pt; }
  .balance { background: ${c0.neutralTint}; border-radius: 8pt; padding: 10pt 12pt; margin-bottom: 16pt; }
  .balance .value { font-size: 14pt; }
  .note { color: ${c0.textSecondary}; font-size: 8.5pt; margin-top: 2pt; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { text-align: left; font-size: 8.5pt; color: ${c0.textSecondary}; font-weight: 600; border-bottom: 1.5px solid ${c0.ink}; padding: 5pt 4pt; }
  td { border-bottom: 1px solid ${c0.line}; padding: 5pt 4pt; vertical-align: top; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  .num { text-align: right; white-space: nowrap; }
  th.num { text-align: right; }
  .date { white-space: nowrap; }
  .sub, .muted { color: ${c0.textSecondary}; font-size: 8.5pt; }
  .payment td { background: ${c0.positiveTint}; }
  footer { margin-top: 14pt; color: ${c0.textSecondary}; font-size: 8.5pt; }
</style>
</head>
<body>
  <div class="brand">a medias</div>
  <h1>${escapeHtml(p.title)}</h1>
  <p class="meta">${escapeHtml(p.couple(couple.me.name, couple.partner.name))} · ${period}</p>

  <div class="stats">
    ${stat(escapeHtml(p.shared), money(t.sharedMinor))}
    ${stat(escapeHtml(p.paid(couple.me.name)), money(t.paidByMe))}
    ${stat(escapeHtml(p.paid(couple.partner.name)), money(t.paidByPartner))}
    ${stat(escapeHtml(c.shareOf(couple.me.name)), money(t.myShare))}
    ${stat(escapeHtml(c.shareOf(couple.partner.name)), money(t.partnerShare))}
    ${stat(escapeHtml(p.payments), money(t.paymentsMinor))}
    ${t.personalMinor > 0 ? stat(escapeHtml(p.personal), money(t.personalMinor)) : ''}
  </div>

  <div class="balance">
    <div class="label">${escapeHtml(p.balanceAt(p.dateWithYear(d.shortDate(balanceDay), Number(balanceDay.slice(0, 4)))))}</div>
    <div class="value">${balance}</div>
    <div class="note">${escapeHtml(p.balanceNote)}</div>
  </div>

  <table>
    <thead><tr>
      <th>${escapeHtml(c.date)}</th><th>${escapeHtml(c.description)}</th><th>${escapeHtml(c.paidBy)}</th>
      <th class="num">${escapeHtml(c.amount)}</th><th class="num">${escapeHtml(c.shareOf(couple.me.name))}</th><th class="num">${escapeHtml(c.shareOf(couple.partner.name))}</th>
    </tr></thead>
    <tbody>
      ${rows.map(rowHtml).join('\n')}
    </tbody>
  </table>

  <footer>${escapeHtml(p.generated(p.dateWithYear(d.shortDate(isoDate(today)), today.getFullYear())))}</footer>
</body>
</html>`;
}
