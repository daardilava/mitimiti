import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, useFonts } from '@expo-google-fonts/dm-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { DEV_BYPASS_AUTH, useSessionStore, useSessionSync } from '@/lib/session';
import { color } from '@/ui/tokens';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
});

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export default function RootLayout() {
  // Sample-data mode never talks to Clerk, so it runs without a key.
  if (DEV_BYPASS_AUTH) return <App />;
  if (!clerkPublishableKey) throw new Error('Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env (Clerk Dashboard › API keys), or EXPO_PUBLIC_DEV_BYPASS_AUTH=1.');

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <SessionSync />
      <App />
    </ClerkProvider>
  );
}

function SessionSync() {
  useSessionSync();
  return null;
}

function App() {
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
      <StatusBar style="dark" />
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
    </QueryClientProvider>
  );
}
