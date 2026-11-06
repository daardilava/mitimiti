import { Redirect } from 'expo-router';
import { useSessionStore } from '@/lib/session';

// Any URL no screen matches lands where this person starts. That includes `/` while signed out: Inicio sits behind the
// couple guard, so a cold start before sign-in (and the OAuth return, sso-callback → `/`, before there is a couple)
// would otherwise show Expo Router's Unmatched Route screen.
export default function NotFound() {
  const signedIn = useSessionStore((s) => s.userId !== null);
  const hasHousehold = useSessionStore((s) => s.householdId !== null);

  if (hasHousehold) return <Redirect href="/" />;
  return <Redirect href={signedIn ? '/setup' : '/welcome'} />;
}
