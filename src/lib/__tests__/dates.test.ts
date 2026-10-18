import { describe, expect, it } from 'vitest';
import { chipDate, daysAgo, longDate, shortDate } from '../dates';

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
});
