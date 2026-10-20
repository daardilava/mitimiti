/// <reference types="node" />
// A fresh in-process Postgres (PGlite) with the real migrations and a small stand-in for what Supabase provides:
// the anon / authenticated roles, auth.jwt() reading the verified token's claims, and its default grants.
// `as(user, sql)` runs a query the way PostgREST would for a request carrying that Clerk user's session token.
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrations = join(__dirname, '..', 'migrations');

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  grant usage on schema auth to anon, authenticated;
  -- Supabase's auth.jwt(): the claims of the token PostgREST verified (here, a Clerk session token).
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  grant execute on function auth.jwt() to anon, authenticated;
  create publication supabase_realtime;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

export type As = <T = Record<string, unknown>>(userId: string | null, sql: string, params?: unknown[]) => Promise<T[]>;

export async function createTestDb(): Promise<{ db: PGlite; as: As }> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(migrations).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrations, file), 'utf8'));
  }

  const as: As = async (userId, sql, params = []) => {
    const claims = userId ? { sub: userId, role: 'authenticated' } : { role: 'anon' };
    await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(claims)]);
    await db.exec(`set role ${userId ? 'authenticated' : 'anon'}`);
    try {
      return (await db.query(sql, params)).rows as never;
    } finally {
      await db.exec('reset role');
    }
  };
  return { db, as };
}
