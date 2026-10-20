// Exportar movimientos as a PDF: a statement of a period, built as HTML that expo-print turns into an A4 PDF.
// It reads like a bank statement, answer first:
//   1. The balance at the end of the period, in words ("Ana le debe $337.950 a Diego").
//   2. How it got there: the balance at the start, plus the period's shared expenses, plus its payments.
//   3. Three key figures, who paid what against their share, and where the shared money went (by category).
//   4. Every movement, grouped by month, the table header repeated on each page.
// Pure, so Vitest covers it; the same rows as the CSV (exportRows).
//
// Paper is white, so colours are the light palette's tokens whatever the phone's theme; backgrounds are forced to
// print. Fonts are the system's: the print view can't load the app's bundled ones. Every text a person typed is
// HTML-escaped.
import type { Messages } from '../i18n/es';
import { categoryColors, palettes, type CategoryId } from '../ui/tokens';
import type { ActivityExpense, ActivityPayment } from './activity';
import { paymentTitle } from './activity';
import { addDays, isoDate, monthOf, type DateLabels } from './dates';
import type { ExportCouple, ExportRange, ExportRow } from './exportData';
import { formatMoney } from './money';
import { expenseEffect, netBalance } from './splits';

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// ─── Numbers (pure) ──────────────────────────────────────────────────────

export interface PeriodTotals {
  /** Every expense that isn't personal. */
  sharedMinor: number;
  sharedCount: number;
  /** Of that, what each one paid. */
  paidByMe: number;
  paidByPartner: number;
  /** Of that, what belongs to each one (their shares). */
  myShare: number;
  partnerShare: number;
  personalMinor: number;
  personalCount: number;
  paymentsMinor: number;
  paymentsCount: number;
}

export function periodTotals(rows: ExportRow[], couple: ExportCouple): PeriodTotals {
  const t: PeriodTotals = { sharedMinor: 0, sharedCount: 0, paidByMe: 0, paidByPartner: 0, myShare: 0, partnerShare: 0, personalMinor: 0, personalCount: 0, paymentsMinor: 0, paymentsCount: 0 };
  for (const row of rows) {
    if (row.kind === 'payment') {
      t.paymentsMinor += row.payment.amountMinor;
      t.paymentsCount++;
      continue;
    }
    const e = row.expense;
    if (e.splitMode === 'personal') {
      t.personalMinor += e.amountMinor;
      t.personalCount++;
      continue;
    }
    t.sharedMinor += e.amountMinor;
    t.sharedCount++;
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

/** Opening balance + the period's expenses + its payments = closing balance, all from `me`'s side. */
export interface Statement {
  opening: number;
  fromExpenses: number;
  fromPayments: number;
  closing: number;
}

export function statement(rows: ExportRow[], range: ExportRange, allExpenses: ActivityExpense[], allPayments: ActivityPayment[], me: string): Statement {
  const opening = range.start ? balanceAt(allExpenses, allPayments, addDays(range.start, -1), me) : 0;
  let fromExpenses = 0;
  let fromPayments = 0;
  for (const row of rows) {
    if (row.kind === 'expense') fromExpenses += expenseEffect(row.expense, me);
    else if (row.payment.fromUser === me) fromPayments += row.payment.amountMinor;
    else if (row.payment.toUser === me) fromPayments -= row.payment.amountMinor;
  }
  return { opening, fromExpenses, fromPayments, closing: opening + fromExpenses + fromPayments };
}

/**
 * Shared spending by category, largest first, with each one's share of the total in whole percents. Largest-remainder
 * rounding, so the percents always add up to exactly 100 (63 + 37, never 63 + 38).
 */
export function categoryTotals(rows: ExportRow[]): { category: CategoryId; amountMinor: number; pct: number }[] {
  const sums = new Map<CategoryId, number>();
  for (const row of rows) {
    if (row.kind !== 'expense' || row.expense.splitMode === 'personal') continue;
    sums.set(row.expense.category, (sums.get(row.expense.category) ?? 0) + row.expense.amountMinor);
  }
  const total = [...sums.values()].reduce((a, b) => a + b, 0);
  const ranked = [...sums.entries()].sort((a, b) => b[1] - a[1]);
  if (total === 0) return ranked.map(([category, amountMinor]) => ({ category, amountMinor, pct: 0 }));
  const exact = ranked.map(([, amount]) => (amount * 100) / total);
  const pcts = exact.map(Math.floor);
  // Hand the points lost to flooring to the largest remainders (ties: the larger category).
  const byRemainder = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const missing = 100 - pcts.reduce((a, b) => a + b, 0);
  for (let k = 0; k < missing; k++) pcts[byRemainder[k][1]]++;
  return ranked.map(([category, amountMinor], i) => ({ category, amountMinor, pct: pcts[i] }));
}

/**
 * The period's real dates: its start (or, for Todo, the first movement) and its end, but never after today, so a
 * running month reads "1 – 20 oct", not a 31st that hasn't happened.
 */
export function periodDates(rows: ExportRow[], range: ExportRange, today: Date): { from: string; to: string } {
  const now = isoDate(today);
  const to = range.end < now ? range.end : now;
  return { from: range.start ?? rows[0]?.date ?? to, to };
}

// ─── HTML ────────────────────────────────────────────────────────────────

export interface PdfInput {
  rows: ExportRow[];
  range: ExportRange;
  couple: ExportCouple;
  /** Every expense and payment, not only the period's, for the opening balance. */
  allExpenses: ActivityExpense[];
  allPayments: ActivityPayment[];
  m: Messages;
  d: DateLabels;
  today?: Date;
}

export function buildPdfHtml({ rows, range, couple, allExpenses, allPayments, m, d, today = new Date() }: PdfInput): string {
  const p = m.exportData.pdf;
  const ink = palettes.light;
  const cat = categoryColors.light;
  const esc = escapeHtml;
  const money = (minor: number) => esc(formatMoney(minor, couple.currency));
  const signed = (minor: number) => (minor === 0 ? money(0) : `${minor > 0 ? '+' : '−'}${money(minor)}`);
  const fullDate = (iso: string) => p.dateWithYear(d.shortDate(iso), Number(iso.slice(0, 4)));
  const names: Record<string, string> = { [couple.me.id]: couple.me.name, [couple.partner.id]: couple.partner.name };

  const t = periodTotals(rows, couple);
  const s = statement(rows, range, allExpenses, allPayments, couple.me.id);
  const { from, to } = periodDates(rows, range, today);
  const openingDay = range.start ? addDays(range.start, -1) : null;

  /** A balance from `me`'s side, in words. */
  const owes = (net: number) =>
    net === 0
      ? p.even
      : net > 0
        ? p.owes(couple.partner.name, formatMoney(net, couple.currency), couple.me.name)
        : p.owes(couple.me.name, formatMoney(net, couple.currency), couple.partner.name);
  /** A change from `me`'s side, in words: "+$637.950 a favor de Diego". */
  const favor = (delta: number) =>
    delta === 0 ? esc(p.noChange) : esc(p.inFavorOf(formatMoney(delta, couple.currency), delta > 0 ? couple.me.name : couple.partner.name));

  const statementRows = [
    ...(openingDay ? [[esc(p.balanceAt(fullDate(openingDay))), esc(owes(s.opening))]] : []),
    [esc(p.fromExpenses), favor(s.fromExpenses)],
    [esc(p.payments), favor(s.fromPayments)],
  ];

  const people = [
    { name: couple.me.name, paid: t.paidByMe, share: t.myShare },
    { name: couple.partner.name, paid: t.paidByPartner, share: t.partnerShare },
  ];

  const categories = categoryTotals(rows);

  // Month headings only when the period spans more than one month.
  const months = new Set(rows.map((r) => monthOf(r.date)));
  let lastMonth = '';
  const tableRows = rows
    .map((row) => {
      let heading = '';
      if (months.size > 1 && monthOf(row.date) !== lastMonth) {
        lastMonth = monthOf(row.date);
        const inMonth = rows.filter((r) => monthOf(r.date) === lastMonth).length;
        heading = `<tr class="month"><td colspan="6"><span>${esc(d.monthLabel(lastMonth))}</span><span class="muted">${esc(m.activity.count(inMonth))}</span></td></tr>`;
      }
      const day = esc(d.shortDate(row.date));
      if (row.kind === 'payment') {
        const pay = row.payment;
        return `${heading}<tr class="pay">
          <td class="date">${day}</td>
          <td><div class="desc">${esc(paymentTitle(pay, names, m))}</div><div class="sub"><span class="badge pay-badge">${esc(p.payment)}</span>${esc(m.activity.methods[pay.method])}</div></td>
          <td>${esc(names[pay.fromUser] ?? '')}</td>
          <td class="num strong">${money(pay.amountMinor)}</td>
          <td class="num muted">—</td><td class="num muted">—</td>
        </tr>`;
      }
      const e = row.expense;
      const personal = e.splitMode === 'personal';
      return `${heading}<tr>
        <td class="date">${day}</td>
        <td><div class="desc">${esc(e.description || m.categories[e.category])}</div><div class="sub"><span class="dot" style="background:${cat[e.category].color}"></span>${esc(m.categories[e.category])}${personal ? `<span class="badge">${esc(p.personalBadge)}</span>` : ''}</div></td>
        <td>${esc(names[e.paidBy] ?? '')}</td>
        <td class="num strong">${money(e.amountMinor)}</td>
        <td class="num">${money(row.myShare)}</td>
        <td class="num">${money(row.partnerShare)}</td>
      </tr>`;
    })
    .join('\n');

  // A4 is 210 mm wide; 16 mm side margins leave 178 mm.
  return `<!DOCTYPE html>
<html lang="${m.language.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: A4; margin: 16mm 16mm 18mm; }
  * { box-sizing: border-box; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: -apple-system, "SF Pro Text", "Helvetica Neue", Roboto, Arial, sans-serif; color: ${ink.ink}; font-size: 9.5pt; line-height: 1.45; }
  .num, .figure, .hero-value { font-variant-numeric: tabular-nums; }
  .muted { color: ${ink.textSecondary}; }

  header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10pt; border-bottom: 1px solid ${ink.line}; }
  .brand { display: flex; align-items: center; gap: 6pt; font-weight: 700; font-size: 10.5pt; letter-spacing: -0.01em; }
  .generated { color: ${ink.textSecondary}; font-size: 8.5pt; }
  h1 { font-size: 20pt; letter-spacing: -0.02em; margin: 14pt 0 2pt; }
  .meta { color: ${ink.textSecondary}; font-size: 10pt; margin: 0 0 14pt; }

  .hero { background: ${ink.hero}; color: ${ink.onHero}; border-radius: 12pt; padding: 14pt 16pt; }
  .hero-label { color: ${ink.onInk}; font-size: 9pt; }
  .hero-value { font-size: 17pt; font-weight: 700; letter-spacing: -0.01em; margin-top: 2pt; }
  .how { margin-top: 12pt; border-top: 1px solid ${ink.heroLine}; padding-top: 8pt; }
  .how-title { color: ${ink.onInkMuted}; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4pt; }
  .how-row { display: flex; justify-content: space-between; gap: 12pt; padding: 2pt 0; font-size: 9pt; }
  .how-row span:first-child { color: ${ink.onInk}; }

  .figures { display: flex; gap: 8pt; margin: 12pt 0; }
  .figure { flex: 1; border: 1px solid ${ink.line}; border-radius: 10pt; padding: 9pt 11pt; }
  .figure .label { color: ${ink.textSecondary}; font-size: 8.5pt; }
  .figure .value { font-size: 13pt; font-weight: 700; margin-top: 1pt; }
  .figure .hint { color: ${ink.textSecondary}; font-size: 8pt; }

  .columns { display: flex; gap: 14pt; margin-bottom: 16pt; }
  .columns > section { flex: 1; min-width: 0; }
  h2 { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.06em; color: ${ink.textSecondary}; margin: 0 0 6pt; font-weight: 600; }
  h2 .count { margin-left: 6pt; padding: 0 5pt; border-radius: 6pt; background: ${ink.neutralTint}; letter-spacing: 0; }

  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 8pt; font-weight: 600; color: ${ink.textSecondary}; padding: 0 4pt 5pt; border-bottom: 1px solid ${ink.ink}; }
  td { padding: 6pt 4pt; border-bottom: 1px solid ${ink.line}; vertical-align: top; }
  th.num, td.num { text-align: right; white-space: nowrap; }
  .people td { padding: 5pt 4pt; }
  .strong { font-weight: 600; }

  .bar-row { display: flex; align-items: center; gap: 6pt; padding: 3pt 0; font-size: 9pt; }
  .bar-name { width: 34%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar-track { flex: 1; height: 6pt; border-radius: 3pt; background: ${ink.neutralTint}; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3pt; }
  .bar-value { width: 32%; text-align: right; white-space: nowrap; }
  .bar-value .muted { margin-left: 4pt; }

  .movements thead { display: table-header-group; }
  .movements tr { page-break-inside: avoid; break-inside: avoid; }
  .date { white-space: nowrap; color: ${ink.textSecondary}; width: 13%; }
  .desc { font-weight: 500; }
  .sub { color: ${ink.textSecondary}; font-size: 8pt; margin-top: 1pt; display: flex; align-items: center; gap: 4pt; }
  .dot { display: inline-block; width: 6pt; height: 6pt; border-radius: 3pt; }
  .badge { display: inline-block; border-radius: 4pt; padding: 0 4pt; font-size: 7.5pt; font-weight: 600; background: ${ink.neutralTint}; color: ${ink.textSecondary}; }
  .pay-badge { background: ${ink.positiveTint}; color: ${ink.positiveText}; }
  .month td { border-bottom: none; padding: 12pt 4pt 4pt; font-weight: 700; display: table-cell; }
  .month td span.muted { font-weight: 400; margin-left: 6pt; font-size: 8.5pt; }

  footer { margin-top: 14pt; padding-top: 8pt; border-top: 1px solid ${ink.line}; color: ${ink.textSecondary}; font-size: 8pt; display: flex; justify-content: space-between; gap: 12pt; }
</style>
</head>
<body>
  <header>
    <div class="brand">
      <svg width="22" height="14" viewBox="0 0 140 88" aria-hidden="true"><circle cx="44" cy="44" r="44" fill="${ink.logoBlue}"/><circle cx="96" cy="44" r="44" fill="${ink.partner}" fill-opacity="0.92"/></svg>
      a medias
    </div>
    <div class="generated">${esc(p.generated(fullDate(isoDate(today))))}</div>
  </header>

  <h1>${esc(p.title)}</h1>
  <p class="meta">${esc(p.couple(couple.me.name, couple.partner.name))} · ${esc(p.span(fullDate(from), fullDate(to)))}</p>

  <div class="hero">
    <div class="hero-label">${esc(p.balanceAt(fullDate(to)))}</div>
    <div class="hero-value">${esc(owes(s.closing))}</div>
    <div class="how">
      <div class="how-title">${esc(p.howTitle)}</div>
      ${statementRows.map(([label, value]) => `<div class="how-row"><span>${label}</span><span>${value}</span></div>`).join('')}
    </div>
  </div>

  <div class="figures">
    <div class="figure"><div class="label">${esc(p.shared)}</div><div class="value">${money(t.sharedMinor)}</div><div class="hint">${esc(p.expensesCount(t.sharedCount))}</div></div>
    <div class="figure"><div class="label">${esc(p.payments)}</div><div class="value">${money(t.paymentsMinor)}</div><div class="hint">${esc(p.paymentsCount(t.paymentsCount))}</div></div>
    <div class="figure"><div class="label">${esc(p.personal)}</div><div class="value">${money(t.personalMinor)}</div><div class="hint">${esc(p.personalNote)}</div></div>
  </div>

  <div class="columns">
    <section>
      <h2>${esc(p.whoPaid)}</h2>
      <table class="people">
        <thead><tr><th>${esc(p.person)}</th><th class="num">${esc(p.paid)}</th><th class="num">${esc(p.share)}</th><th class="num">${esc(p.difference)}</th></tr></thead>
        <tbody>
          ${people.map((x) => `<tr><td class="strong">${esc(x.name)}</td><td class="num">${money(x.paid)}</td><td class="num">${money(x.share)}</td><td class="num strong">${signed(x.paid - x.share)}</td></tr>`).join('')}
        </tbody>
      </table>
    </section>
    <section>
      <h2>${esc(p.byCategory)}</h2>
      ${categories
        .map(
          (c) => `<div class="bar-row">
        <span class="bar-name">${esc(m.categories[c.category])}</span>
        <span class="bar-track"><span class="bar-fill" style="display:block;width:${Math.max(c.pct, 2)}%;background:${cat[c.category].color}"></span></span>
        <span class="bar-value">${money(c.amountMinor)}<span class="muted">${c.pct} %</span></span>
      </div>`,
        )
        .join('')}
    </section>
  </div>

  <h2>${esc(p.movements)}<span class="count">${rows.length}</span></h2>
  <table class="movements">
    <thead><tr>
      <th>${esc(m.exportData.csv.date)}</th><th>${esc(m.exportData.csv.description)}</th><th>${esc(m.exportData.csv.paidBy)}</th>
      <th class="num">${esc(m.exportData.csv.amount)}</th><th class="num">${esc(couple.me.name)}</th><th class="num">${esc(couple.partner.name)}</th>
    </tr></thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <footer>
    <span>${esc(p.currencyNote(couple.currency))}</span>
    <span>a medias</span>
  </footer>
</body>
</html>`;
}
