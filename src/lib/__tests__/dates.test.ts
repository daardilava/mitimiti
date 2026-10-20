import { describe, expect, it } from 'vitest';
import { chipDate, daysAgo, longDate, monthGrid, shortDate } from '../dates';

const today = new Date(2026, 9, 15); // 15 Oct 2026, a Thursday

describe('dates', () => {
  it('counts back across month boundaries', () => {
    expect(daysAgo(0, today)).toBe('2026-10-15');
    expect(daysAgo(15, today)).toBe('2026-09-30');
  });

  it('labels chips as Hoy, Ayer or a short date', () => {
    expect(chipDate('2026-10-15', today)).toBe('Hoy');
    expect(chipDate('2026-10-14', today)).toBe('Ayer');
    expect(chipDate('2026-10-13', today)).toBe('13 oct');
    expect(shortDate('2026-01-02')).toBe('2 ene');
  });

  it('writes long dates in Spanish', () => {
    expect(longDate('2026-10-15', today)).toBe('Hoy, 15 oct');
    expect(longDate('2026-10-11', today)).toBe('Domingo 11 de octubre');
  });

  it('lays out a month in Monday-first weeks for the calendar', () => {
    const october = monthGrid('2026-10'); // 1 Oct 2026 is a Thursday, 31 Oct a Saturday
    expect(october).toHaveLength(5);
    expect(october[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(october[4]).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
    expect(october.flat().filter(Boolean)).toHaveLength(31);
    // February 2027 starts on a Monday and fills exactly four weeks.
    expect(monthGrid('2027-02')).toHaveLength(4);
    expect(monthGrid('2027-02')[0][0]).toBe('2027-02-01');
    // A month starting on Sunday needs six rows.
    expect(monthGrid('2026-11')).toHaveLength(6);
  });
});
