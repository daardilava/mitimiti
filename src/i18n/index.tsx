// The app's language. Automático follows the phone (Spanish when the phone uses a language the app doesn't have);
// Español / English / Deutsch in Ajustes stay on this phone only. Screens read text with useI18n().
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocales } from 'expo-localization';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { dateLabels, type DateLabels } from '@/lib/dates';
import { de } from './de';
import { en } from './en';
import { es, type Messages } from './es';
import { languageFor, LANGUAGES, type Language, type LanguagePreference } from './languages';

export { languageFor, LANGUAGES };
export type { Language, LanguagePreference, Messages };

export const messages: Record<Language, Messages> = { es, en, de };

const STORAGE_KEY = 'mitimiti.language';

interface I18n {
  language: Language;
  /** Every message in the current language. */
  m: Messages;
  /** Date labels ("Lunes 12 de octubre", "Monday, October 12"…) in the current language. */
  d: DateLabels;
  preference: LanguagePreference;
  setPreference: (p: LanguagePreference) => void;
}

// Built once per language, so screens share them.
const labels: Record<Language, DateLabels> = { es: dateLabels(es.dates), en: dateLabels(en.dates), de: dateLabels(de.dates) };

const I18nContext = createContext<I18n>({ language: 'es', m: es, d: labels.es, preference: 'system', setPreference: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  // Re-renders when the phone's language changes (Android keeps the app running; iOS restarts it).
  const phone = languageFor(useLocales()[0]?.languageCode);
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'es' || saved === 'en' || saved === 'de') setPreferenceState(saved);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<I18n>(() => {
    const language = preference === 'system' ? phone : preference;
    return {
      language,
      m: messages[language],
      d: labels[language],
      preference,
      setPreference: (p) => {
        setPreferenceState(p);
        AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
      },
    };
  }, [preference, phone]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
