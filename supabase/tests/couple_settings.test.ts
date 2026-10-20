// Ajustes: update_couple_settings() and the direct writes it replaces (see 20261018010000_couple_settings.sql).
import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type As } from './db';

const DIEGO = 'user_2settingsDiegoAAAAAAAAAA';
const ANA = 'user_2settingsAnaBBBBBBBBBBBB';
const EVE = 'user_2settingsEveCCCCCCCCCCCC';

let as: As;
let householdId: string;
let joinCode: string;

const household = async (by = DIEGO) =>
  (await as<{ name: string; invited_name: string | null; default_split: string; default_pct: number; currency: string }>(
    by,
    `select name, invited_name, default_split, default_pct, currency from households`,
  ))[0];

beforeAll(async () => {
  ({ as } = await createTestDb());
  const [h] = await as<{ id: string; join_code: string }>(DIEGO, `select id, join_code from create_household('Diego', 'Ana', 'COP', 'half', 50::smallint)`);
  householdId = h.id;
  joinCode = h.join_code;
}, 60_000);

describe('update_couple_settings', () => {
  it('renames me and, before the partner joins, the partner; the couple name follows', async () => {
    await as(DIEGO, `select update_couple_settings(p_my_name => '  Diego A. ', p_partner_name => 'Anita')`);
    expect(await household()).toMatchObject({ name: 'Diego A. y Anita', invited_name: 'Anita' });
    const [me] = await as<{ display_name: string }>(DIEGO, `select display_name from members where user_id = $1`, [DIEGO]);
    expect(me.display_name).toBe('Diego A.');
  });

  it('refuses empty and too-long names', async () => {
    await expect(as(DIEGO, `select update_couple_settings(p_my_name => '   ')`)).rejects.toThrow(/name_required/);
    await expect(as(DIEGO, `select update_couple_settings(p_my_name => $1)`, ['x'.repeat(41)])).rejects.toThrow(/name_too_long/);
  });

  it('can change the currency while there is no money in it', async () => {
    await as(DIEGO, `select update_couple_settings(p_currency => 'EUR')`);
    expect((await household()).currency).toBe('EUR');
  });

  it('stores the proportional default as the owner share, whoever sets it', async () => {
    await as(DIEGO, `select update_couple_settings(p_default_split => 'pct', p_my_pct => 60::smallint)`);
    expect(await household()).toMatchObject({ default_split: 'pct', default_pct: 60 });
    // Any whole share from 1 to 99 % (20261018020000_default_pct_range.sql), like one expense's split.
    await as(DIEGO, `select update_couple_settings(p_my_pct => 80::smallint)`);
    expect((await household()).default_pct).toBe(80);
    await as(DIEGO, `select update_couple_settings(p_my_pct => 1::smallint)`);
    expect((await household()).default_pct).toBe(1);
    for (const bad of [0, 100]) {
      await expect(as(DIEGO, `select update_couple_settings(p_my_pct => $1::smallint)`, [bad])).rejects.toThrow(/invalid_pct/);
    }
    await as(DIEGO, `select update_couple_settings(p_my_pct => 60::smallint)`);
    await expect(as(DIEGO, `select update_couple_settings(p_default_split => 'other')`)).rejects.toThrow(/invalid_split/);

    const [{ r }] = await as<{ r: { ok: boolean } }>(ANA, `select join_household($1, '') as r`, [joinCode]);
    expect(r.ok).toBe(true);
    // Ana wants 45 % for herself, so the owner (Diego) gets 55 %.
    await as(ANA, `select update_couple_settings(p_my_pct => 45::smallint)`);
    expect((await household()).default_pct).toBe(55);
  });

  it("once the partner joined, their name is theirs: I can't change it, they can", async () => {
    await expect(as(DIEGO, `select update_couple_settings(p_partner_name => 'Ana')`)).rejects.toThrow(/partner_joined/);
    await as(ANA, `select update_couple_settings(p_my_name => 'Ana')`);
    expect((await household()).name).toBe('Diego A. y Ana');
  });

  it('locks the currency once there are expenses: amounts are never converted', async () => {
    await as(DIEGO, `select upsert_expense(null, $1, 1050, 'super', 'Pan', '2026-10-18', 'half')`, [DIEGO]);
    await expect(as(ANA, `select update_couple_settings(p_currency => 'COP')`)).rejects.toThrow(/currency_locked/);
    // Saying the same currency again is not a change.
    await as(ANA, `select update_couple_settings(p_currency => 'EUR')`);
    expect((await household()).currency).toBe('EUR');
  });

  it('sets only my own avatar, refuses unknown ones, and goes back to the initial with an empty one', async () => {
    const avatars = async () => Object.fromEntries((await as<{ user_id: string; avatar: string | null }>(DIEGO, `select user_id, avatar from members`)).map((r) => [r.user_id, r.avatar]));
    await as(DIEGO, `select update_couple_settings(p_avatar => 'fox')`);
    await as(ANA, `select update_couple_settings(p_avatar => 'penguin')`);
    expect(await avatars()).toEqual({ [DIEGO]: 'fox', [ANA]: 'penguin' });
    // Leaving it out keeps it.
    await as(DIEGO, `select update_couple_settings(p_my_name => 'Diego A.')`);
    expect((await avatars())[DIEGO]).toBe('fox');
    await expect(as(DIEGO, `select update_couple_settings(p_avatar => 'unicorn')`)).rejects.toThrow(/invalid_avatar/);
    await as(DIEGO, `select update_couple_settings(p_avatar => '')`);
    expect(await avatars()).toEqual({ [DIEGO]: null, [ANA]: 'penguin' });
    // Not by writing the row directly either.
    expect(await as(DIEGO, `update members set avatar = 'cat' where user_id = $1 returning user_id`, [ANA])).toEqual([]);
  });

  it('only changes my own couple', async () => {
    await expect(as(EVE, `select update_couple_settings(p_my_name => 'Eve')`)).rejects.toThrow(/not_in_household/);
  });
});

describe('the direct writes it replaces are closed', () => {
  it('a member cannot move their row into another couple or make themselves owner', async () => {
    await as(EVE, `select create_household('Eve', 'X')`);
    const moved = await as(EVE, `update members set household_id = $1, role = 'owner' where user_id = $2 returning user_id`, [householdId, EVE]);
    expect(moved).toEqual([]);
    expect(await as(DIEGO, `select user_id from members order by user_id`)).toEqual([{ user_id: ANA }, { user_id: DIEGO }]);
  });

  it('a member cannot rewrite the household (currency, join code) directly', async () => {
    const changed = await as(DIEGO, `update households set currency = 'COP', join_code = 'AAAAAA' returning id`);
    expect(changed).toEqual([]);
    expect((await household()).currency).toBe('EUR');
  });
});
