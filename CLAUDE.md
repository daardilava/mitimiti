# MitiMiti — guide for Claude

Expo app for two people who share a budget: **who owes whom, and how much?** Clerk for sign-in,
Supabase (Postgres + RLS + Realtime) for data. UI copy in Spanish; code, comments and docs in English.

@AGENTS.md

## Current focus

**Phase 3 — Settle + summary** (Settle up, Monthly summary, split tests, Ajustes and Presupuestos done — gate *Balance is right*
passes; polish next). Phases 1–2 are built; their acceptance
checks are still open. Phase 1 (Auth) is built; its acceptance
checks are still open. One feature at a time; don't start work from a later phase unless asked.
Phase scope, status and acceptance checks: [docs/PLAN.md](docs/PLAN.md). When a task finishes a check
there, tick it (`- [x]`) in the same change.

## Where to look (read only what the task needs)

| Need | File |
| --- | --- |
| Roadmap, phases, acceptance checks, open questions, billing | [docs/PLAN.md](docs/PLAN.md) |
| Screens, routes, design tokens, typography, components | [docs/DESIGN.md](docs/DESIGN.md) |
| Tech stack, Clerk ↔ Supabase wiring, data model, SQL functions | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |

Section numbers like `§4` in code refer to the external *a medias — Project Plan* (Feature breakdown tab).

## Rules that must never break

- **Money is an integer in minor units** (`bigint` / `number` of cents or pesos), never floats.
  Format and parse only through `src/lib/money.ts`. COP has 0 decimals, EUR/USD 2. Never convert currencies.
- **The balance is never stored.** It is always computed from expenses and payments (`balance_view` in SQL,
  `src/lib/splits.ts` in the app — keep both in sync). When a split leaves an odd unit, the payer keeps it.
- Each expense stores each person's `share_minor` in `expense_shares`, not only the split mode.
- **User ids are Clerk ids (`text`, `user_…`), not `uuid`.** In SQL use `requesting_user_id()`
  (= `auth.jwt()->>'sub'`), never `auth.uid()`. Supabase Auth is not used for sign-in.
- Writes touching an expense and its shares go through one Postgres function (one transaction).
- Deletes are soft (`deleted_at`); every change is written to `audit_log`. The one exception is `delete_account()`
  (Borrar cuenta): the right to erasure removes the couple's rows, audit trail included.
- `spent_on` is a `date`, never a timestamp.
- Exactly two members per couple. No groups, no moving money, no web app (Expo web is for dev only).
- Design: colours come from `useTheme()` and styles from `makeStyles()` (`src/ui/theme.tsx`), never raw hex and
  never a static palette: every screen works in light and dark mode. New colour pairs go in
  `src/ui/__tests__/tokens.test.ts` (WCAG contrast, both modes). One primary button per screen.
  Green only for payments/settled, red only for delete/over. Colour is never the only cue — always add text.
  Touch targets ≥ 44 × 44.
- Neutral, no-blame language in Spanish UI copy.

## Commands

```bash
npx expo start            # dev server (EXPO_PUBLIC_DEV_BYPASS_AUTH=1 in .env = sample data, no Clerk)
npm run db:start          # local Supabase (Docker)
npm run db:reset          # apply supabase/migrations/*
npm run db:types          # regenerate src/lib/database.types.ts
```

**Before declaring any task done**, run and make pass:

```bash
npm run typecheck
npx expo lint
npm test                  # Vitest: money, splits, join codes, dates, auth flow, SQL/RLS on PGlite
```

New logic in `src/lib/` gets a test in `src/lib/__tests__/`. New SQL/RLS behaviour gets a case in
`supabase/tests/` (shared PGlite setup in `supabase/tests/db.ts`). Any change to split or balance math, in
`src/lib/splits.ts` or in SQL, must keep `supabase/tests/splits_parity.test.ts` passing. Once a migration has been applied to the hosted Supabase project, never edit it:
add a new file under `supabase/migrations/`.

## Layout

- `src/app/` — Expo Router routes, one file per screen. `(onboarding)` signed-out, `(tabs)` main app
- `src/api/` — calls to Clerk and Supabase
- `src/lib/` — pure logic (money, splits, session, authFlow, joinCode, dates) + tests
- `src/ui/` — tokens (light + dark palettes), theme (`useTheme`, `makeStyles`), Icon, Screen, Avatar, form pieces
- `supabase/` — config, migrations, SQL tests
- Never commit `.env`; add new variables to `.env.example`.
