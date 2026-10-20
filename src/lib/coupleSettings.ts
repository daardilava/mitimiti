// Ajustes (§7): the couple's default split as each person sees it, and what update_couple_settings can refuse.
// households.default_pct is the owner's share; each person reads and sets their own. Pure, so Vitest covers it.

import { es, type Messages } from '../i18n/es';

export type MemberRole = 'owner' | 'member';

/** My share of a proportional default can be any whole % in this range, like one expense's split. */
export const DEFAULT_PCT_MIN = 1;
export const DEFAULT_PCT_MAX = 99;

/** One-tap choices for my share in Ajustes (50 % is "Mitad y mitad"). */
export const DEFAULT_PCT_PRESETS = [70, 60, 40, 30] as const;

/** My share typed in "Otra": a whole number 1–99, "%" and spaces allowed. Null when it isn't one. */
export function parseSharePct(text: string): number | null {
  const clean = text.replace(/[%\s]/g, '');
  if (!/^\d{1,2}$/.test(clean)) return null;
  const pct = Number(clean);
  return pct >= DEFAULT_PCT_MIN && pct <= DEFAULT_PCT_MAX ? pct : null;
}

/** "Tú 65 % · Ana 35 %" */
export function shareLabel(myPct: number, partnerName: string, m: Messages = es): string {
  return m.coupleSettings.share(myPct, partnerName, 100 - myPct);
}

/** My share (%) of the proportional default, from the stored owner's share. */
export function myDefaultPct(role: MemberRole, ownerPct: number): number {
  return role === 'owner' ? ownerPct : 100 - ownerPct;
}

/** Spanish message for what update_couple_settings refuses. */
export function settingsErrorMessage(error: unknown, m: Messages = es): string {
  const message = (error as { message?: string } | null)?.message ?? '';
  const e = m.coupleSettings.errors;
  if (message.includes('currency_locked')) return e.currencyLocked;
  if (message.includes('partner_joined')) return e.partnerJoined;
  if (message.includes('name_required')) return e.nameRequired;
  if (message.includes('name_too_long')) return e.nameTooLong;
  if (message.includes('invalid_avatar')) return e.invalidAvatar;
  if (message.includes('invalid_pct')) return e.invalidPct(DEFAULT_PCT_MIN, DEFAULT_PCT_MAX);
  return e.generic;
}
