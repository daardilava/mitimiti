// The couple's shared space: create it, join it with a code, and read its invite code.
// With EXPO_PUBLIC_DEV_BYPASS_AUTH=1 everything works on sampleHousehold in memory.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { es, type Messages } from '@/i18n/es';
import type { AvatarId } from '@/lib/avatars';
import type { Currency } from '@/lib/money';
import { avatars, ME, names, PARTNER, sampleExpenses, sampleHousehold, sampleSettlements } from '@/lib/sample';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { coupleKey } from './expenses';

export type DefaultSplit = 'half' | 'pct';

export interface Household {
  id: string;
  currency: Currency;
  defaultSplit: DefaultSplit;
  /** The owner's share (%) when defaultSplit is 'pct'. */
  defaultPct: number;
  /** Null once the partner joined. */
  joinCode: string | null;
  joinCodeExpiresAt: string | null;
  /** The partner's name as the owner typed it, shown until they join. */
  invitedName: string | null;
  members: { userId: string; displayName: string; role: 'owner' | 'member' }[];
}

export const createHouseholdSchema = z.object({
  myName: z.string().trim().min(1).max(40),
  partnerName: z.string().trim().min(1).max(40),
  currency: z.enum(['COP', 'EUR', 'USD']),
  defaultSplit: z.enum(['half', 'pct']),
  defaultPct: z.number().int().min(30).max(70),
});
export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;

export type JoinError = 'invalid_code' | 'expired_code' | 'household_full' | 'too_many_attempts' | 'already_in_household';

/** Thrown by joinHousehold for the answers join_household returns instead of raising. */
export class JoinHouseholdError extends Error {
  constructor(readonly reason: JoinError) {
    super(reason);
  }
}

// ─── Plain functions ──────────────────────────────────────────────────────

export async function getHousehold(): Promise<Household> {
  if (DEV_BYPASS_AUTH) return { ...sampleHousehold, members: sampleHousehold.members.map((m) => ({ ...m })) };
  const { householdId } = useSessionStore.getState();
  if (!householdId) throw new Error('not_in_household');
  const { data, error } = await supabase
    .from('households')
    .select('id, currency, default_split, default_pct, join_code, join_code_expires_at, invited_name, members(user_id, display_name, role)')
    .eq('id', householdId)
    .single();
  if (error) throw error;
  return fromRow(data as unknown as HouseholdRow);
}

/** Returns the new household's id. The caller stores it in the session, which switches the app to the tabs. */
export async function createHousehold(input: CreateHouseholdInput): Promise<string> {
  const v = createHouseholdSchema.parse(input);
  if (DEV_BYPASS_AUTH) {
    Object.assign(sampleHousehold, {
      currency: v.currency,
      defaultSplit: v.defaultSplit,
      defaultPct: v.defaultPct,
      invitedName: v.partnerName,
      members: [{ ...sampleHousehold.members[0], displayName: v.myName }],
    });
    return sampleHousehold.id;
  }
  const { data, error } = await supabase.rpc('create_household', {
    p_my_name: v.myName,
    p_partner_name: v.partnerName,
    p_currency: v.currency,
    p_default_split: v.defaultSplit,
    p_default_pct: v.defaultPct,
  });
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Returns the household's id, or throws JoinHouseholdError with the reason. */
export async function joinHousehold(code: string): Promise<string> {
  if (DEV_BYPASS_AUTH) {
    if (code !== sampleHousehold.joinCode) throw new JoinHouseholdError('invalid_code');
    return sampleHousehold.id;
  }
  // The partner's name comes from the one the owner typed (households.invited_name).
  const { data, error } = await supabase.rpc('join_household', { p_code: code, p_display_name: '' });
  if (error) throw error;
  const result = data as { ok: boolean; error?: JoinError; household_id?: string };
  if (!result.ok || !result.household_id) throw new JoinHouseholdError(result.error ?? 'invalid_code');
  return result.household_id;
}

/** A fresh 7-day code, for when the previous one expired before the partner joined. */
export async function regenerateJoinCode(): Promise<string> {
  if (DEV_BYPASS_AUTH) {
    sampleHousehold.joinCodeExpiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    return sampleHousehold.joinCode!;
  }
  const { data, error } = await supabase.rpc('regenerate_join_code');
  if (error) throw error;
  return data as string;
}

/** Any of these left out stays as it is. `myPct` is my own share of the proportional default. */
export interface CoupleSettingsInput {
  myName?: string;
  /** Only before the partner joins; afterwards their name is theirs to change. */
  partnerName?: string;
  defaultSplit?: DefaultSplit;
  myPct?: number;
  currency?: Currency;
  /** My own character; null goes back to the initial. */
  avatar?: AvatarId | null;
}

/** Saves Ajustes through update_couple_settings, which validates every field (see its migration). */
export async function updateCoupleSettings(input: CoupleSettingsInput): Promise<void> {
  if (DEV_BYPASS_AUTH) {
    if (input.currency && input.currency !== sampleHousehold.currency && (sampleExpenses.length > 0 || sampleSettlements.length > 0)) {
      throw new Error('currency_locked');
    }
    if (input.myName !== undefined) names[ME] = input.myName.trim();
    if (input.partnerName !== undefined) names[PARTNER] = input.partnerName.trim();
    if (input.avatar !== undefined) avatars[ME] = input.avatar;
    Object.assign(sampleHousehold, {
      ...(input.defaultSplit && { defaultSplit: input.defaultSplit }),
      ...(input.myPct !== undefined && { defaultPct: input.myPct }),
      ...(input.currency && { currency: input.currency }),
    });
    return;
  }
  const { error } = await supabase.rpc('update_couple_settings', {
    p_my_name: input.myName ?? null,
    p_partner_name: input.partnerName ?? null,
    p_default_split: input.defaultSplit ?? null,
    p_my_pct: input.myPct ?? null,
    p_currency: input.currency ?? null,
    // Only sent when changing it ('' = back to the initial), so the other settings still save on a database
    // without the avatar migration.
    ...(input.avatar !== undefined && { p_avatar: input.avatar ?? '' }),
  });
  if (error) throw error;
}

export function joinErrorMessage(error: unknown, m: Messages = es): string {
  const e = m.joinErrors;
  const reason = error instanceof JoinHouseholdError ? error.reason : null;
  switch (reason) {
    case 'invalid_code':
      return e.invalidCode;
    case 'expired_code':
      return e.expiredCode;
    case 'household_full':
      return e.householdFull;
    case 'too_many_attempts':
      return e.tooManyAttempts;
    case 'already_in_household':
      return e.alreadyInHousehold;
    default:
      return e.generic;
  }
}

// ─── React Query hooks ────────────────────────────────────────────────────

export const householdKey = ['household'] as const;

export function useHousehold() {
  return useQuery({ queryKey: householdKey, queryFn: getHousehold });
}

/** On success the session gets the household, which swaps the onboarding stack for the app and opens Invite. */
export function useCreateHousehold() {
  return useMutation({
    mutationFn: createHousehold,
    onSuccess: (id) => useSessionStore.getState().setHousehold(id, { pathname: '/invite', params: { from: 'setup' } }),
  });
}

/** On success the app opens on Home, with the history the partner already logged. */
export function useJoinHousehold() {
  return useMutation({
    mutationFn: joinHousehold,
    onSuccess: (id) => useSessionStore.getState().setHousehold(id, '/'),
  });
}

/** After saving, every screen that shows names, the default split or the currency refetches. */
export function useUpdateCoupleSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateCoupleSettings,
    onSettled: () => Promise.all([client.invalidateQueries({ queryKey: coupleKey }), client.invalidateQueries({ queryKey: householdKey })]),
  });
}

export function useRegenerateJoinCode() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: regenerateJoinCode,
    onSuccess: () => client.invalidateQueries({ queryKey: householdKey }),
  });
}

// ─── Mapping ──────────────────────────────────────────────────────────────

interface HouseholdRow {
  id: string;
  currency: Currency;
  default_split: DefaultSplit;
  default_pct: number;
  join_code: string | null;
  join_code_expires_at: string | null;
  invited_name: string | null;
  members: { user_id: string; display_name: string; role: 'owner' | 'member' }[];
}

function fromRow(r: HouseholdRow): Household {
  return {
    id: r.id,
    currency: r.currency,
    defaultSplit: r.default_split,
    defaultPct: r.default_pct,
    joinCode: r.join_code,
    joinCodeExpiresAt: r.join_code_expires_at,
    invitedName: r.invited_name,
    members: r.members.map((m) => ({ userId: m.user_id, displayName: m.display_name, role: m.role })),
  };
}
