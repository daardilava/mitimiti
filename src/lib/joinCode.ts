// Invite codes. Mirrors new_join_code() in supabase/migrations/20261015000000_init.sql:
// 6 characters from an alphabet without 0/O and 1/I, so a code read aloud can't be mistyped.

export const JOIN_CODE_LENGTH = 6;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** What the code field keeps from what was typed or pasted: letters and digits, upper-cased, at most 6. */
export function normalizeJoinCode(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, JOIN_CODE_LENGTH);
}

export type JoinCodeStatus =
  | { kind: 'incomplete'; missing: number }
  | { kind: 'ambiguous' }
  | { kind: 'ready' };

/** Live validation for the Join screen; expects normalized input. */
export function joinCodeStatus(code: string): JoinCodeStatus {
  if ([...code].some((c) => !ALPHABET.includes(c))) return { kind: 'ambiguous' };
  if (code.length < JOIN_CODE_LENGTH) return { kind: 'incomplete', missing: JOIN_CODE_LENGTH - code.length };
  return { kind: 'ready' };
}
