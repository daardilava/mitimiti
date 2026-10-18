// The couple's shared space: create it, join it with a code, and read its invite code.
// With EXPO_PUBLIC_DEV_BYPASS_AUTH=1 everything works on sampleHousehold in memory.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { Currency } from '@/lib/money';
import { sampleHousehold } from '@/lib/sample';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { supabase } from '@/lib/supabase';

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

export function joinErrorMessage(error: unknown): string {
  const reason = error instanceof JoinHouseholdError ? error.reason : null;
  switch (reason) {
    case 'invalid_code':
      return 'Ese código no existe. Revisa que esté bien escrito.';
    case 'expired_code':
      return 'Ese código venció. Pídele a tu pareja uno nuevo en Ajustes › Código de pareja.';
    case 'household_full':
      return 'Esa cuenta ya tiene a sus dos personas.';
    case 'too_many_attempts':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    case 'already_in_household':
      return 'Ya perteneces a una cuenta.';
    default:
      return 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.';
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
