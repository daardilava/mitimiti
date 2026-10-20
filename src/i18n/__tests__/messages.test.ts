// Every language says everything, says it in its own words, and keeps the values it is given.
// (Missing keys and wrong parameters are already caught by the type checker: en and de are typed as Messages.)
import { describe, expect, it } from 'vitest';
import { de } from '../de';
import { en } from '../en';
import { es, type Messages } from '../es';
import { languageFor } from '../languages';

type Leaf = { path: string; value: unknown };

function leaves(obj: unknown, path = ''): Leaf[] {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.entries(obj).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [{ path, value: obj }];
}

const get = (m: Messages, path: string) => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], m);

/** Texts that are rightly the same as in Spanish. */
const SAME_AS_SPANISH: Record<'en' | 'de', string[]> = {
  en: ['balance.personal', 'expense.splitPersonal', 'money.million', 'avatars.panda'],
  de: ['authUi.code', 'avatars.panda'],
};

describe.each([
  ['en', en],
  ['de', de],
] as const)('%s', (lang, m) => {
  it('translates every text and list (nothing left in Spanish)', () => {
    const untranslated = leaves(es)
      .filter(({ path, value }) => typeof value !== 'function' && !SAME_AS_SPANISH[lang].includes(path))
      .filter(({ path, value }) => JSON.stringify(get(m, path)) === JSON.stringify(value))
      .map(({ path }) => path);
    expect(untranslated).toEqual([]);
  });

  it('every phrase with values shows all of them (a name, an amount, a count is never dropped)', () => {
    const dropped: string[] = [];
    for (const { path, value } of leaves(m)) {
      if (typeof value !== 'function') continue;
      const args = Array.from({ length: value.length }, (_, i) => `ARG${i}`);
      const out = String(value(...args));
      for (const a of args) if (!out.toLowerCase().includes(a.toLowerCase())) dropped.push(`${path}(${a})`);
    }
    expect(dropped).toEqual([]);
  });

  it('has twelve months, seven weekdays and seven chart initials', () => {
    expect(m.dates.months).toHaveLength(12);
    expect(m.dates.monthsShort).toHaveLength(12);
    expect(m.dates.weekdays).toHaveLength(7);
    expect(m.dates.weekdayInitials).toHaveLength(7);
  });
});

describe('Spanish keeps its values too', () => {
  it('every phrase with values shows all of them', () => {
    for (const { path, value } of leaves(es)) {
      if (typeof value !== 'function') continue;
      const args = Array.from({ length: value.length }, (_, i) => `ARG${i}`);
      const out = String(value(...args)).toLowerCase();
      for (const a of args) expect(out, path).toContain(a.toLowerCase());
    }
  });
});

describe('language for the phone', () => {
  it('uses the phone language when the app has it, Spanish otherwise', () => {
    expect(languageFor('en')).toBe('en');
    expect(languageFor('de')).toBe('de');
    expect(languageFor('es')).toBe('es');
    expect(languageFor('fr')).toBe('es');
    expect(languageFor(null)).toBe('es');
  });
});
