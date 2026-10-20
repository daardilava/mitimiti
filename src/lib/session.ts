import { useAuth, useUser } from '@clerk/expo';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { create } from 'zustand';
import { suggestedFirstName } from './authFlow';
import { supabase } from './supabase';

export const DEV_BYPASS_AUTH = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === '1';

/** Which onboarding step comes after signing in: create a couple, or join one with a code. */
export type NextStep = 'setup' | 'join';

interface SessionState {
  loading: boolean;
  /** Clerk user id (`user_…`) of whoever is signed in; the same value RLS reads from the token's `sub`. */
  userId: string | null;
  /** First name from the sign-up form or Google / Apple, to prefill "Tu nombre". */
  suggestedName: string | null;
  /** The signed-in account's email, shown in Ajustes next to Cerrar sesión. */
  email: string | null;
  householdId: string | null;
  /** Where to go once the app's screens unlock; the root layout follows it after the guard switches. */
  pendingRoute: Href | null;
  setHousehold: (id: string | null, then?: Href) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  loading: !DEV_BYPASS_AUTH,
  userId: null,
  suggestedName: null,
  email: null,
  householdId: null,
  pendingRoute: null,
  setHousehold: (householdId, then) => set({ householdId, pendingRoute: then ?? null }),
}));

/** Keeps the store in sync with Clerk and the user's couple. Mount once, inside ClerkProvider. */
export function useSessionSync() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const signedInAs = isLoaded && isSignedIn ? userId : null;
  const suggestedName = signedInAs ? suggestedFirstName(user) : null;
  const email = signedInAs ? (user?.primaryEmailAddress?.emailAddress ?? null) : null;

  useEffect(() => {
    useSessionStore.setState({ suggestedName, email });
  }, [suggestedName, email]);

  useEffect(() => {
    if (!isLoaded) return;
    let stale = false;

    // userId and householdId are set together, so screens never see a user without their lookup done.
    (async () => {
      let householdId: string | null = null;
      if (signedInAs) {
        const { data, error } = await supabase.from('members').select('household_id').eq('user_id', signedInAs).maybeSingle();
        if (error) console.warn('[session] household lookup failed', error.message);
        householdId = data?.household_id ?? null;
      }
      if (!stale) useSessionStore.setState({ loading: false, userId: signedInAs, householdId });
    })();

    return () => {
      stale = true;
    };
  }, [isLoaded, signedInAs]);
}

/**
 * On the sign-in screens: once someone is signed in but has no couple yet, continue to the chosen step.
 * Someone who already has a couple never needs this; the root layout's guards take them to Home.
 */
export function useContinueAfterSignIn(next: NextStep | undefined) {
  const signedIn = useSessionStore((s) => s.userId !== null);
  const hasHousehold = useSessionStore((s) => s.householdId !== null);
  useEffect(() => {
    if (signedIn && !hasHousehold) router.replace(next === 'join' ? '/join' : '/setup');
  }, [signedIn, hasHousehold, next]);
}
