// What Dictar and saving share from quick entry: where an expense came from, and the dictation language.
import type { QuickEntryContext } from './quickEntry';

/** How the expense was entered (Escrito, Dictar, Escanear); saved as expenses.source. */
export type EntrySource = 'text' | 'voice' | 'receipt';

const FALLBACK_LOCALE: Record<QuickEntryContext['language'], string> = { es: 'es-ES', en: 'en-US', de: 'de-DE' };

const norm = (tag: string) => tag.replace(/_/g, '-');
const langOf = (tag: string) => tag.toLowerCase().split(/[-_]/)[0];

/**
 * The dictation language: the app's, in the phone's region when the phone speaks it too (es-CO keeps Colombian
 * Spanish), else a common default. `phoneTags` are the phone's BCP-47 locales, preferred first.
 *
 * `supported` (iOS: the recogniser's locales) keeps the choice to one the phone can recognise: Apple has no es-DE, so
 * Spanish on a phone set to Germany would fail before recording. Then the default, then any locale of the language.
 */
export function recognitionLocale(language: QuickEntryContext['language'], phoneTags: string[], supported: string[] = []): string {
  const fromPhone = phoneTags.filter((tag) => langOf(tag) === language && /[-_]/.test(tag)).map(norm);
  if (supported.length === 0) return fromPhone[0] ?? FALLBACK_LOCALE[language];
  const available = supported.map(norm);
  const find = (tag: string) => available.find((s) => s.toLowerCase() === tag.toLowerCase());
  for (const tag of [...fromPhone, FALLBACK_LOCALE[language]]) {
    const hit = find(tag);
    if (hit) return hit;
  }
  return available.find((s) => langOf(s) === language) ?? FALLBACK_LOCALE[language];
}
