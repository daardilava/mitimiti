// Presupuestos: the budgets table is written directly by members (RLS), with the upsert the app uses.
import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type As } from './db';

const DIEGO = 'user_2budgetDiegoAAAAAAAAAAAA';
const ANA = 'user_2budgetAnaBBBBBBBBBBBBBB';
const EVE = 'user_2budgetEveCCCCCCCCCCCCCC';

let as: As;
let ours: string;
let theirs: string;

const upsert = (by: string, household: string, category: string, month: string, limit: number) =>
  as(
    by,
    `insert into budgets (household_id, category, month, limit_minor) values ($1, $2, $3, $4)
     on conflict (household_id, category, month) do update set limit_minor = excluded.limit_minor returning limit_minor::text`,
    [household, category, month, limit],
  );

beforeAll(async () => {
  ({ as } = await createTestDb());
  const [h] = await as<{ id: string; join_code: string }>(DIEGO, `select id, join_code from create_household('Diego', 'Ana')`);
  ours = h.id;
  await as(ANA, `select join_household($1, '')`, [h.join_code]);
  const [e] = await as<{ id: string }>(EVE, `select id from create_household('Eve', 'X')`);
  theirs = e.id;
}, 60_000);

describe('budgets', () => {
  it('either member sets and changes a limit with the upsert the app sends', async () => {
    expect(await upsert(DIEGO, ours, 'super', '2026-10-01', 1_200_000)).toEqual([{ limit_minor: '1200000' }]);
    expect(await upsert(ANA, ours, 'super', '2026-10-01', 1_250_000)).toEqual([{ limit_minor: '1250000' }]);
    const rows = await as(ANA, `select category, month::text, limit_minor::text from budgets`);
    expect(rows).toEqual([{ category: 'super', month: '2026-10-01', limit_minor: '1250000' }]);
  });

  it('nobody else can read or write them', async () => {
    expect(await as(EVE, `select * from budgets`)).toEqual([]);
    await expect(upsert(EVE, ours, 'casa', '2026-10-01', 1)).rejects.toThrow(/row-level security/);
    await expect(upsert(DIEGO, theirs, 'casa', '2026-10-01', 1)).rejects.toThrow(/row-level security/);
  });

  it('a row cannot be moved into another couple', async () => {
    await expect(as(DIEGO, `update budgets set household_id = $1`, [theirs])).rejects.toThrow(/row-level security/);
  });

  it('limits are never negative and always start on the first of a month', async () => {
    await expect(upsert(DIEGO, ours, 'casa', '2026-10-01', -1)).rejects.toThrow(/check constraint/);
    await expect(upsert(DIEGO, ours, 'casa', '2026-10-15', 1)).rejects.toThrow(/check constraint/);
  });
});
