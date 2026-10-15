import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, useFonts } from '@expo-google-fonts/dm-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSessionStore, useSessionSync } from '@/lib/session';
import { color } from '@/ui/tokens';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BricolageGrotesque_700Bold, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold });
  useSessionSync();
  const loading = useSessionStore((s) => s.loading);
  const hasHousehold = useSessionStore((s) => s.householdId !== null);

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
      </Stack>
    </QueryClientProvider>
  );
}
