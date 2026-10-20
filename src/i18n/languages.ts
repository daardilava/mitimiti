// The app's languages, without React or native modules, so Vitest can cover the choice.
export type Language = 'es' | 'en' | 'de';
export type LanguagePreference = 'system' | Language;

export const LANGUAGES: Language[] = ['es', 'en', 'de'];

/** The app's language for a phone language code: one we have, else Spanish (the app is Spanish-first). */
export function languageFor(code: string | null | undefined): Language {
  return (LANGUAGES as string[]).includes(code ?? '') ? (code as Language) : 'es';
}
