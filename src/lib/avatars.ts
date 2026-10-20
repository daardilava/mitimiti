// Ajustes › Tu avatar: the characters each person can pick. members.avatar stores one of these ids, or null for the
// initial in a circle. The list must match the check in 20261019000000_member_avatar.sql. Pure, so Vitest covers it.

export const AVATAR_IDS = ['fox', 'cat', 'bear', 'panda', 'owl', 'frog', 'bunny', 'penguin', 'pig', 'tiger', 'dog', 'mouse'] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && (AVATAR_IDS as readonly string[]).includes(value);
}

/** What the database returned, as an avatar id; anything unknown (an id from a newer app) falls back to the initial. */
export function toAvatarId(value: unknown): AvatarId | null {
  return isAvatarId(value) ? value : null;
}
