import type { Session } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { create } from 'zustand';
import { supabase } from './supabase';

export const DEV_BYPASS_AUTH = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === '1';

interface SessionState {
  loading: boolean;
  session: Session | null;
  householdId: string | null;
  setHousehold: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  loading: !DEV_BYPASS_AUTH,
  session: null,
  householdId: null,
  setHousehold: (householdId) => set({ householdId }),
}));

/** Keeps the store in sync with Supabase Auth and the user's couple. Mount once in the root layout. */
export function useSessionSync() {
  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;

    const load = async (session: Session | null) => {
      let householdId: string | null = null;
      if (session) {
        const { data } = await supabase.from('members').select('household_id').eq('user_id', session.user.id).maybeSingle();
        householdId = data?.household_id ?? null;
      }
      useSessionStore.setState({ loading: false, session, householdId });
    };

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
}
