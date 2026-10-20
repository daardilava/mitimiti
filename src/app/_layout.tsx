import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, useFonts } from '@expo-google-fonts/dm-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider as NavigationThemeProvider, type Theme as NavigationTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { DEV_BYPASS_AUTH, useSessionStore, useSessionSync } from '@/lib/session';
import { I18nProvider } from '@/i18n';
import { ThemeProvider, useTheme } from '@/ui/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
});

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export default function RootLayout() {
  // Sample-data mode never talks to Clerk, so it runs without a key.
  if (DEV_BYPASS_AUTH) {
    return (
      <I18nProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </I18nProvider>
    );
  }
  if (!clerkPublishableKey) throw new Error('Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env (Clerk Dashboard › API keys), or EXPO_PUBLIC_DEV_BYPASS_AUTH=1.');

  // Language outside theme: category names in the theme follow the language.
  return (
    <I18nProvider>
      <ThemeProvider>
        <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
          <SessionSync />
          <App />
        </ClerkProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

function SessionSync() {
  useSessionSync();
  return null;
}

function App() {
  const { color, scheme } = useTheme();
  // React Navigation draws stack and tab backgrounds itself; give it our palette so nothing flashes white in dark.
  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, primary: color.ink, background: color.background, card: color.surface, text: color.ink, border: color.line, notification: color.negative } };
  }, [scheme, color]);

  // The native root view shows behind the keyboard and during transitions (Android in particular).
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(color.background).catch(() => {});
  }, [color.background]);

  const [fontsLoaded] = useFonts({ BricolageGrotesque_700Bold, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold });
  const loading = useSessionStore((s) => s.loading);
  const hasHousehold = useSessionStore((s) => s.householdId !== null);
  const pendingRoute = useSessionStore((s) => s.pendingRoute);

  // Creating or joining a couple flips the guards below; navigate only after that render committed.
  useEffect(() => {
    if (!hasHousehold || !pendingRoute) return;
    useSessionStore.setState({ pendingRoute: null });
    router.replace(pendingRoute);
  }, [hasHousehold, pendingRoute]);

  // Signing out: nothing cached from this couple may show to whoever signs in next.
  useEffect(() => {
    if (!hasHousehold) queryClient.clear();
  }, [hasHousehold]);

  if (!fontsLoaded || loading) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }}>
          <Stack.Protected guard={hasHousehold}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="invite" />
            <Stack.Screen name="expense/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="expense/[id]/index" />
            <Stack.Screen name="expense/[id]/edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settle/index" />
            <Stack.Screen name="settle/done" options={{ gestureEnabled: false }} />
            <Stack.Screen name="budgets" />
          </Stack.Protected>
          <Stack.Protected guard={!hasHousehold}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Screen name="sso-callback" />
        </Stack>
      </NavigationThemeProvider>
    </QueryClientProvider>
  );
}
