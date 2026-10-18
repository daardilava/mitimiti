// Calendar dates as YYYY-MM-DD strings in the phone's local time, with Spanish labels.

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today minus `days`, as YYYY-MM-DD. */
export function daysAgo(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - days);
  return isoDate(d);
}

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

/** "12 oct" */
export function shortDate(iso: string): string {
  const [, m, d] = parts(iso);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/** "Hoy", "Ayer" or "12 oct" — for chips. */
export function chipDate(iso: string, today = new Date()): string {
  if (iso === daysAgo(0, today)) return 'Hoy';
  if (iso === daysAgo(1, today)) return 'Ayer';
  return shortDate(iso);
}

/** "Hoy, 15 oct" · "Ayer, 14 oct" · "Domingo 12 de octubre" */
export function longDate(iso: string, today = new Date()): string {
  if (iso === daysAgo(0, today)) return `Hoy, ${shortDate(iso)}`;
  if (iso === daysAgo(1, today)) return `Ayer, ${shortDate(iso)}`;
  const [y, m, d] = parts(iso);
  const day = DAYS[new Date(y, m - 1, d).getDay()];
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} ${d} de ${MONTHS[m - 1]}`;
}

/** "2026-10" for a YYYY-MM-DD date, to group by month. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** "Octubre 2026" for the month of `d`. */
export function monthTitle(d = new Date()): string {
  return monthLabel(monthOf(isoDate(d)));
}

/** "octubre" for the month of `d`, for sentences like "Gastado juntos en octubre". */
export function monthName(d = new Date()): string {
  return MONTHS[d.getMonth()];
}

/** "Octubre 2026" for a "YYYY-MM" month. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const name = MONTHS[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

/** "septiembre" for a "YYYY-MM" month. */
export function monthNameOf(month: string): string {
  return MONTHS[Number(month.split('-')[1]) - 1];
}

/** The "YYYY-MM" month `delta` months away: shiftMonth('2026-01', -1) = '2025-12'. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return monthOf(isoDate(new Date(y, m - 1 + delta, 1)));
}

/** Day headings in Movimientos: "Hoy" · "Ayer" · "Lunes 12 de octubre". */
export function dayHeading(iso: string, today = new Date()): string {
  if (iso === daysAgo(0, today)) return 'Hoy';
  if (iso === daysAgo(1, today)) return 'Ayer';
  return longDate(iso, today);
}
