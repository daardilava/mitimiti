import { describe, expect, it } from 'vitest';
import { activityView, draftRange, lastDays, pickRangeDay, rangeLength, shiftRange } from '../activity';
import { daysBetween, rangeLabel } from '../dates';
import { ME, names, sampleExpenses } from '../sample';

describe('pickRangeDay (Rango calendar taps)', () => {
  const empty = { start: null, end: null };

  it('the first tap picks the start, the second the end', () => {
    const first = pickRangeDay(empty, '2026-10-05');
    expect(first).toEqual({ start: '2026-10-05', end: null });
    expect(pickRangeDay(first, '2026-10-12')).toEqual({ start: '2026-10-05', end: '2026-10-12' });
  });

  it('an earlier second tap becomes the start, so the order of the taps does not matter', () => {
    expect(pickRangeDay({ start: '2026-10-12', end: null }, '2026-10-05')).toEqual({ start: '2026-10-05', end: '2026-10-12' });
  });

  it('tapping the start again makes a one-day range', () => {
    expect(pickRangeDay({ start: '2026-10-05', end: null }, '2026-10-05')).toEqual({ start: '2026-10-05', end: '2026-10-05' });
  });

  it('a tap after both ends are set starts over', () => {
    expect(pickRangeDay({ start: '2026-10-05', end: '2026-10-12' }, '2026-09-01')).toEqual({ start: '2026-09-01', end: null });
  });
});

describe('draftRange', () => {
  it('is null until a day is picked, and a lone start is that one day', () => {
    expect(draftRange({ start: null, end: null })).toBeNull();
    expect(draftRange({ start: '2026-10-05', end: null })).toEqual({ start: '2026-10-05', end: '2026-10-05' });
    expect(draftRange({ start: '2026-10-05', end: '2026-10-12' })).toEqual({ start: '2026-10-05', end: '2026-10-12' });
  });
});

describe('rangeLength, shiftRange and lastDays', () => {
  it('counts both ends', () => {
    expect(rangeLength({ start: '2026-10-05', end: '2026-10-05' })).toBe(1);
    expect(rangeLength({ start: '2026-10-05', end: '2026-10-11' })).toBe(7);
    expect(rangeLength({ start: '2026-02-20', end: '2026-03-05' })).toBe(14);
  });

  it('the arrows move the whole range by its own length', () => {
    const week = { start: '2026-10-05', end: '2026-10-11' };
    expect(shiftRange(week, -1)).toEqual({ start: '2026-09-28', end: '2026-10-04' });
    expect(shiftRange(week, 1)).toEqual({ start: '2026-10-12', end: '2026-10-18' });
    expect(shiftRange({ start: '2026-10-30', end: '2026-10-30' }, -1)).toEqual({ start: '2026-10-29', end: '2026-10-29' });
  });

  it('moving forward stops at today instead of showing days that have not happened', () => {
    expect(shiftRange({ start: '2026-10-20', end: '2026-10-26' }, 1, '2026-10-30')).toEqual({ start: '2026-10-24', end: '2026-10-30' });
    expect(shiftRange({ start: '2026-10-10', end: '2026-10-16' }, 1, '2026-10-30')).toEqual({ start: '2026-10-17', end: '2026-10-23' });
    expect(shiftRange({ start: '2026-10-24', end: '2026-10-30' }, -1, '2026-10-30')).toEqual({ start: '2026-10-17', end: '2026-10-23' });
  });

  it('Rango starts on the last 7 days, today included', () => {
    expect(lastDays(7, new Date(2026, 9, 30))).toEqual({ start: '2026-10-24', end: '2026-10-30' });
    expect(lastDays(7, new Date(2026, 0, 3))).toEqual({ start: '2025-12-28', end: '2026-01-03' });
  });

  it('a picked range filters Movimientos like any period', () => {
    const range = { start: '2026-10-10', end: '2026-10-12' };
    const view = activityView(sampleExpenses, [], { ...range, me: ME, names });
    expect(view.days.every((d) => d.date >= range.start && d.date <= range.end)).toBe(true);
  });
});

describe('daysBetween and rangeLabel', () => {
  it('counts calendar days, across months, years and daylight-saving changes', () => {
    expect(daysBetween('2026-10-05', '2026-10-05')).toBe(0);
    expect(daysBetween('2026-10-05', '2026-10-12')).toBe(7);
    expect(daysBetween('2026-10-12', '2026-10-05')).toBe(-7);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // DST starts in Europe on 29 Mar 2026
  });

  it('names a range compactly, with the year only when it changes', () => {
    const today = new Date(2026, 9, 30);
    expect(rangeLabel('2026-10-13', '2026-10-19', today)).toBe('13 – 19 oct');
    expect(rangeLabel('2026-09-29', '2026-10-05', today)).toBe('29 sep – 5 oct');
    expect(rangeLabel('2025-12-20', '2026-01-05', today)).toBe('20 dic 2025 – 5 ene 2026');
    expect(rangeLabel('2026-10-30', '2026-10-30', today)).toBe('Hoy, 30 oct');
  });
});
