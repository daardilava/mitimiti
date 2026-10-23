// Light and dark mode. The app follows the phone's appearance unless the person picks Claro or Oscuro in Ajustes;
// that choice is kept on this device and handed to the native side (Appearance.setColorScheme), so keyboards,
// alerts and system sheets match the app too. Screens read colours with useTheme() and build styles with makeStyles().
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import { useI18n } from '@/i18n';
import { categoryColors, categoryInfo, palettes, textStyles, type Categories, type CategoryId, type Palette, type Scheme, type TextStyles } from './tokens';

export type AppearancePreference = 'system' | Scheme;

const STORAGE_KEY = 'mitimiti.appearance';

export interface Theme {
  scheme: Scheme;
  color: Palette;
  type: TextStyles;
  categories: Categories;
  preference: AppearancePreference;
  setPreference: (p: AppearancePreference) => void;
}

function buildTheme(scheme: Scheme) {
  const color = palettes[scheme];
  return { scheme, color, type: textStyles(color) };
}

/** Category icons and colours for the scheme, with names in the app's language. */
function buildCategories(scheme: Scheme, names: Record<CategoryId, string>): Categories {
  return Object.fromEntries(
    (Object.keys(categoryInfo) as CategoryId[]).map((id) => [id, { ...categoryInfo[id], ...categoryColors[scheme][id], name: names[id] }]),
  ) as Categories;
}

// Built once per scheme, so every screen shares the same objects and memoised styles stay valid.
const themes = { light: buildTheme('light'), dark: buildTheme('dark') };

const ThemeContext = createContext<Theme>({
  ...themes.light,
  categories: buildCategories('light', Object.fromEntries((Object.keys(categoryInfo) as CategoryId[]).map((id) => [id, categoryInfo[id].name])) as Record<CategoryId, string>),
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  // Category names follow the language; this provider sits inside I18nProvider.
  const names = useI18n().m.categories;
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');

  // Restore the saved choice. Until it loads, the system's appearance is used, which is the default anyway.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') {
          setPreferenceState(saved);
          applyNative(saved);
        }
      })
      .catch(() => {});
  }, []);

  const value = useMemo<Theme>(() => {
    // On native, Appearance.setColorScheme makes useColorScheme report the override; on web it doesn't, so the
    // preference is applied here as well.
    const scheme: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      ...themes[scheme],
      categories: buildCategories(scheme, names),
      preference,
      setPreference: (p) => {
        setPreferenceState(p);
        applyNative(p);
        AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
      },
    };
  }, [preference, system, names]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Tell the OS which appearance the app wants, so native UI (keyboard, alerts) follows. 'unspecified' = system. */
function applyNative(p: AppearancePreference) {
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(p === 'system' ? 'unspecified' : p);
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Styles that depend on the theme, created once per scheme:
 *   const useStyles = makeStyles(({ color }) => ({ card: { backgroundColor: color.surface } }));
 *   const styles = useStyles();
 */
export function makeStyles<T>(factory: (theme: Pick<Theme, 'color' | 'type' | 'scheme'>) => T): () => T {
  const cache: Partial<Record<Scheme, T>> = {};
  return function useStyles() {
    const theme = useTheme();
    return (cache[theme.scheme] ??= factory(theme));
  };
}
