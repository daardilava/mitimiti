// Keeps both phones in step: Supabase Realtime announces every change to the couple's expenses, payments and budgets,
// and coming back to the app refetches in case the socket slept in the background. RLS decides what each phone hears.
import { focusManager, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { balanceKeys } from './balance';
import { budgetKeys } from './budgets';
import { coupleKey, expenseKeys } from './expenses';

/** Mount once while the app's tabs are shown. */
export function useLiveHousehold() {
  const client = useQueryClient();
  const householdId = useSessionStore((s) => s.householdId);

  useEffect(() => {
    if (DEV_BYPASS_AUTH || !householdId) return;
    const refresh = () => {
      client.invalidateQueries({ queryKey: expenseKeys.all });
      client.invalidateQueries({ queryKey: balanceKeys.balance });
      client.invalidateQueries({ queryKey: balanceKeys.settlements });
      // A first change from the partner is also how we learn they joined.
      client.invalidateQueries({ queryKey: coupleKey });
    };
    const filter = `household_id=eq.${householdId}`;
    const channel = supabase
      .channel(`household:${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements', filter }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter }, () => client.invalidateQueries({ queryKey: budgetKeys.all }))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [client, householdId]);

  // TanStack Query refetches stale data on focus; on native, "focus" is the app coming to the foreground.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);
}
