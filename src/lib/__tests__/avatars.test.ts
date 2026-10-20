import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { de } from '../../i18n/de';
import { en } from '../../i18n/en';
import { es } from '../../i18n/es';
import { avatarArt, avatarTiles } from '../../ui/tokens';
import { AVATAR_IDS, isAvatarId, toAvatarId } from '../avatars';

describe('avatars', () => {
  it('reads only known ids; anything else falls back to the initial', () => {
    expect(isAvatarId('fox')).toBe(true);
    expect(toAvatarId('penguin')).toBe('penguin');
    for (const other of [null, undefined, '', 'unicorn', 'FOX', 3]) expect(toAvatarId(other)).toBeNull();
  });

  it('every character has colours, a tile in both modes and a name in every language', () => {
    for (const id of AVATAR_IDS) {
      expect(avatarArt.characters[id]).toBeDefined();
      expect(avatarTiles.light[id]).toMatch(/^#[0-9A-F]{6}$/);
      expect(avatarTiles.dark[id]).toMatch(/^#[0-9A-F]{6}$/);
      for (const m of [es, en, de]) expect(m.avatars[id]).toBeTruthy();
    }
  });

  it('matches the list the database accepts', () => {
    const sql = readFileSync(join(__dirname, '..', '..', '..', 'supabase', 'migrations', '20261019000000_member_avatar.sql'), 'utf8');
    const check = sql.match(/avatar in \(([^)]*)\)/)![1];
    expect(check.split(',').map((s) => s.trim().replace(/'/g, ''))).toEqual([...AVATAR_IDS]);
  });
});
