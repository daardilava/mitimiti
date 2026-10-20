// Calendar dates as YYYY-MM-DD strings in the phone's local time, with labels in the app's language.
// dateLabels(words) builds the labels for one language (src/i18n gives the words); the plain exports are Spanish.
import { es, type Messages } from '../i18n/es';

export type DateWords = Messages['dates'];

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

/** "2026-10" for a YYYY-MM-DD date, to group by month. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** The "YYYY-MM" month `delta` months away: shiftMonth('2026-01', -1) = '2025-12'. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return monthOf(isoDate(new Date(y, m - 1 + delta, 1)));
}

/** The YYYY-MM-DD date `n` days after `iso` (negative goes back). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = parts(iso);
  return isoDate(new Date(y, m - 1, d + n));
}

/** Monday of the week that holds `iso` (weeks run Monday to Sunday). */
export function weekStart(iso: string): string {
  const [y, m, d] = parts(iso);
  const weekday = new Date(y, m - 1, d).getDay(); // 0 = Sunday
  return addDays(iso, weekday === 0 ? -6 : 1 - weekday);
}

/** Day of the month of a YYYY-MM-DD date. */
export function dayOfMonth(iso: string): number {
  return parts(iso)[2];
}

/**
 * The weeks of a "YYYY-MM" month for a calendar, Monday first: each week has 7 cells, and cells outside the month
 * are null. monthGrid('2026-10') starts [null, null, null, '2026-10-01', …] because 1 Oct 2026 is a Thursday.
 */
export function monthGrid(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const weeks: (string | null)[][] = [];
  for (let monday = weekStart(first); monday <= last; monday = addDays(monday, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => {
      const day = addDays(monday, i);
      return monthOf(day) === month ? day : null;
    }));
  }
  return weeks;
}

/** Every date label in one language. */
export function dateLabels(w: DateWords) {
  const shortDate = (iso: string) => {
    const [, m, d] = parts(iso);
    return w.short(d, w.monthsShort[m - 1]);
  };
  const longDate = (iso: string, today = new Date()) => {
    if (iso === daysAgo(0, today)) return w.relative(w.today, shortDate(iso));
    if (iso === daysAgo(1, today)) return w.relative(w.yesterday, shortDate(iso));
    const [y, m, d] = parts(iso);
    return w.long(w.weekdays[new Date(y, m - 1, d).getDay()], d, w.months[m - 1]);
  };
  const monthLabel = (month: string) => {
    const [y, m] = month.split('-').map(Number);
    return w.monthYear(w.months[m - 1], y);
  };
  return {
    /** "12 oct" · "Oct 12" · "12. Okt." */
    shortDate,
    /** "Hoy" · "Ayer" · "12 oct": for chips. */
    chipDate: (iso: string, today = new Date()) => (iso === daysAgo(0, today) ? w.today : iso === daysAgo(1, today) ? w.yesterday : shortDate(iso)),
    /** "Hoy, 15 oct" · "Ayer, 14 oct" · "Domingo 12 de octubre" */
    longDate,
    /** Day headings in Movimientos: "Hoy" · "Ayer" · "Lunes 12 de octubre". */
    dayHeading: (iso: string, today = new Date()) => (iso === daysAgo(0, today) ? w.today : iso === daysAgo(1, today) ? w.yesterday : longDate(iso, today)),
    /** "Octubre 2026" for a "YYYY-MM" month. */
    monthLabel,
    /** "Octubre 2026" for the month of `d`. */
    monthTitle: (d = new Date()) => monthLabel(monthOf(isoDate(d))),
    /** The month of `d` as used in a sentence: "octubre" / "October" / "Oktober". */
    monthName: (d = new Date()) => w.months[d.getMonth()],
    /** The same, for a "YYYY-MM" month. */
    monthNameOf: (month: string) => w.months[Number(month.split('-')[1]) - 1],
    /** "13 – 19 oct" · "29 sep – 5 oct" for a Monday-to-Sunday week. */
    weekLabel: (monday: string) => {
      const sunday = addDays(monday, 6);
      const [, m1, d1] = parts(monday);
      const [, m2, d2] = parts(sunday);
      return m1 === m2 ? w.sameMonthWeek(d1, d2, w.monthsShort[m2 - 1]) : `${shortDate(monday)} – ${shortDate(sunday)}`;
    },
    /** Short month names, January first: "ene" · "Jan" · "Jan.". */
    monthsShort: w.monthsShort,
    /** One letter per weekday for chart axes, Monday first. */
    weekdayInitials: w.weekdayInitials,
  };
}

export type DateLabels = ReturnType<typeof dateLabels>;

const spanish = dateLabels(es.dates);
export const { shortDate, chipDate, longDate, dayHeading, monthLabel, monthTitle, monthName, monthNameOf, weekLabel } = spanish;
export const WEEKDAY_INITIALS = spanish.weekdayInitials;
