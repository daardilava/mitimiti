// What Dictar and saving share from quick entry: where an expense came from, and the dictation language.
import type { QuickEntryContext } from './quickEntry';

/** How the expense was entered (Escrito, Dictar, Escanear); saved as expenses.source. */
export type EntrySource = 'text' | 'voice' | 'receipt';

const FALLBACK_LOCALE: Record<QuickEntryContext['language'], string> = { es: 'es-ES', en: 'en-US', de: 'de-DE' };

/**
 * The dictation language: the app's, in the phone's region when the phone speaks it too (es-CO keeps Colombian
 * Spanish), else a common default. `phoneTags` are the phone's BCP-47 locales, preferred first.
 */
export function recognitionLocale(language: QuickEntryContext['language'], phoneTags: string[]): string {
  return phoneTags.find((tag) => tag.toLowerCase().split(/[-_]/)[0] === language && /[-_]/.test(tag))?.replace('_', '-') ?? FALLBACK_LOCALE[language];
}
