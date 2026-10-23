# MitiMiti

[![CI](https://github.com/daardilava/mitimiti/actions/workflows/ci.yml/badge.svg)](https://github.com/daardilava/mitimiti/actions/workflows/ci.yml)
![Expo SDK 57](https://img.shields.io/badge/Expo_SDK-57-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_RLS-3FCF8E?logo=supabase&logoColor=white)

**A shared-budget app for couples.** It answers one question in under five seconds:
**who owes whom, and how much?**

Two people log what they spend together, choose how each expense is split, and see one live balance on both
phones. When they settle up outside the app, they record the payment and the balance goes back to zero.

> **Status:** private beta in preparation. Phase 3 (*Settle + summary*) is built; Phase 6 (*Billing*) has started.
> Roadmap and acceptance checks: [docs/PLAN.md](docs/PLAN.md).

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Database and migrations](#database-and-migrations)
- [Engineering rules](#engineering-rules)
- [Contributing](#contributing)
- [Documentation](#documentation)
- [License](#license)

---

## What it does

| Feature | Description | Status |
| --- | --- | --- |
| Couple account | Sign in with email + password, Google or Apple (Clerk); one shared space joined with a 6-character code | Built |
| Log an expense | Amount, description, who paid, category, date; a new expense in under 10 seconds | Built |
| Flexible splits | Half and half, by percentage (1–99 %), all for the other person, or personal | Built |
| Live balance | "Ana te debe $337.950", computed from every expense and payment, synced in real time | Built |
| Movimientos | A day, week or month of activity with a spending chart, search, filters and a calendar picker | Built |
| Settle up | Record a full or partial payment by transfer, cash or other; never more than what is owed | Built |
| Monthly summary | Shared total by category, who paid, each person's share, personal spending | Built |
| Budgets | Monthly limit per category, warning at 80 %, over-limit state | Built |
| Settings | Names, avatar, default split, currency, appearance (light / dark), language (es / en / de) | Built |
| Export | The expenses and payments of a period as a CSV for spreadsheets, or a PDF report with totals and the balance, through the share sheet | Built |
| Notifications | Partner activity, Sunday reminder | Planned (v1.1) |
| Offline logging, recurring expenses | Save without signal; rent and subscriptions each month | Planned (v1.2) |
| Premium | One subscription per couple in the App Store / Google Play: full history, budgets, export | In progress (Phase 6) |

**Product principles:** two people, never a group · fair, not just 50/50 · fast to log · the app records
payments, it never moves money · neutral, no-blame language.

## Tech stack

| Layer | Choice |
| --- | --- |
| App | [Expo](https://expo.dev) SDK 57, React Native 0.86, React 19, TypeScript (strict) |
| Navigation | Expo Router (file-based, typed routes) |
| Auth | [Clerk](https://clerk.com) (`@clerk/expo`): email + password, Google, Apple |
| Data | [Supabase](https://supabase.com): Postgres, Row Level Security, Realtime |
| Server state | TanStack Query |
| Validation | Zod |
| Tests | Vitest, with SQL and RLS tests running on [PGlite](https://pglite.dev) (Postgres in WebAssembly) |
| Delivery | EAS Build / Submit / Update, GitHub Actions |

## Architecture

```mermaid
flowchart LR
  subgraph Phone["Phone (Expo app)"]
    UI["Screens<br/>src/app"] --> API["Data layer<br/>src/api (TanStack Query)"]
    UI --> LIB["Pure logic<br/>src/lib (money, splits, dates…)"]
  end
  Phone -- "sign in" --> Clerk[(Clerk)]
  Clerk -- "session JWT<br/>sub = user_…" --> Phone
  API -- "supabase-js<br/>Authorization: Clerk JWT" --> PG[(Supabase Postgres)]
  PG -- "RLS: requesting_user_id()<br/>= auth.jwt()->>'sub'" --> PG
  PG -- "Realtime changes" --> API
```

- **Clerk owns identity; Supabase owns data.** Supabase trusts Clerk as a third-party auth provider, and every
  row is protected by RLS keyed on the Clerk user id. Supabase Auth is not used for sign-in.
- **The balance is never stored.** It is computed from expenses and payments in SQL (`balance_view`) and,
  identically, in the app (`src/lib/splits.ts`). A parity test keeps both in sync.
- **Every write that touches money is one Postgres function** (one transaction), e.g. `upsert_expense`,
  `record_settlement`. Deletes are soft and every change is written to `audit_log`.
- **Both phones stay in sync** through Supabase Realtime plus a refetch when the app returns to the foreground.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Getting started

### Prerequisites

- **Node.js 24** (see [`.nvmrc`](.nvmrc)) and npm
- **Expo Go** on a phone, or an Android emulator / iOS simulator
- **Docker Desktop**, only to run Supabase locally

### 1. Install

```bash
git clone https://github.com/daardilava/mitimiti.git
cd mitimiti
npm install
cp .env.example .env
```

### 2. Run with sample data (no backend needed)

Set `EXPO_PUBLIC_DEV_BYPASS_AUTH=1` in `.env`. Sign-in is skipped and every screen is reachable with built-in
sample data.

```bash
npx expo start            # scan the QR code with Expo Go, or press a / i / w
```

### 3. Run against a real backend

1. Start Supabase locally (or use the hosted project's URL and publishable key):
   ```bash
   npm run db:start       # prints the local URL and keys for .env
   npm run db:reset       # applies supabase/migrations/*
   ```
2. Add your Clerk publishable key to `.env`. The Clerk instance must have the Supabase integration enabled
   (see *Set up Clerk* in [docs/PLAN.md](docs/PLAN.md)). Verify it with `npm run clerk:check`.
3. Set `EXPO_PUBLIC_DEV_BYPASS_AUTH=0` and run `npx expo start`.

Google and Apple sign-in open the system browser through Clerk (`useSSO`). This works in Expo Go, on web
and in development builds (`npx expo run:android` / `run:ios`).

> Add packages with `npx expo install <package>`, never `npm install <package>`: it picks the version
> that matches the Expo SDK.

## Environment variables

All variables are `EXPO_PUBLIC_*`, which means they are **bundled into the app and public by design**.
Never put a secret (service-role key, Clerk secret key) in `.env`. Template: [`.env.example`](.env.example).

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (`http://127.0.0.1:54321` locally) |
| `EXPO_PUBLIC_SUPABASE_KEY` | Supabase publishable / anon key. Safe in the app: RLS guards every row |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_test_…` in development) |
| `EXPO_PUBLIC_DEV_BYPASS_AUTH` | `1` = skip sign-in and use sample data. Development only |

## Scripts

| Command | What it does |
| --- | --- |
| `npx expo start` | Start the dev server |
| `npm run typecheck` | TypeScript, no emit |
| `npx expo lint` | ESLint (Expo config) |
| `npm test` | All Vitest suites, app logic and SQL |
| `npm run clerk:check` | Check that the Clerk instance in `.env` is configured the way the app signs in |
| `npm run db:start` | Start local Supabase (Docker) |
| `npm run db:reset` | Recreate the local database from `supabase/migrations` |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` from the local schema |

## Project structure

```
src/
  app/              Expo Router routes, one file per screen
    (onboarding)/   Signed-out flow: welcome, sign-in/up, setup, join
    (tabs)/         Main app: Inicio, Movimientos, Resumen, Ajustes
  api/              Clerk and Supabase calls, TanStack Query hooks, Realtime
  lib/              Pure, tested logic: money, splits, balance, dates, activity, budgets, settle…
    __tests__/
  ui/               Design tokens (light + dark), theme, icons, shared components
  i18n/             Messages in Spanish (source of truth), English and German
supabase/
  migrations/       Schema, RLS policies and SQL functions, in order
  tests/            SQL / RLS tests on PGlite, and app ↔ SQL split parity
docs/               Plan, design and architecture
scripts/            Tooling (Clerk configuration check)
```

## Testing

```bash
npm test
```

| Suite | Covers |
| --- | --- |
| `src/lib/__tests__` | Money formatting and parsing, splits and balance, dates, activity, budgets, settle up, summary, auth flow |
| `src/ui/__tests__` | WCAG contrast of every colour pair, in light and dark mode |
| `src/i18n/__tests__` | Every language has every message |
| `supabase/tests` | Migrations applied to PGlite: RLS isolation between couples, every SQL function, and **split parity**: the SQL and the app compute the same balance for every split mode |

The balance must never be wrong, so any change to split or balance math, in SQL or TypeScript, must keep
`supabase/tests/splits_parity.test.ts` passing. CI runs typecheck, lint and tests on every push and pull request.

## Database and migrations

- Migrations live in `supabase/migrations/` and are applied in filename order.
- **A migration that has been applied to the hosted project is never edited.** Add a new file instead:
  ```bash
  npx supabase migration new <short_description>
  ```
- Every new SQL or RLS behaviour gets a test in `supabase/tests/` (shared setup in `supabase/tests/db.ts`).
- Ship to the hosted project:
  ```bash
  npx supabase migration list --linked   # what the hosted project is missing
  npx supabase db push --dry-run         # review
  npx supabase db push                   # apply
  ```
  Ship the migration **before** the app code that depends on it, and keep the app tolerant of the previous
  schema until every phone has updated.

## Engineering rules

These are not style preferences. Breaking one is a bug.

- **Money is an integer in minor units** (pesos, cents), never a float. Format and parse only through
  `src/lib/money.ts`. COP has 0 decimals, EUR and USD 2. Currencies are never converted.
- **The balance is never stored**, always computed. When a split leaves an odd unit, the payer keeps it.
- **User ids are Clerk ids** (`text`, `user_…`), not `uuid`. In SQL use `requesting_user_id()`, never `auth.uid()`.
- **Expense writes are atomic:** an expense and its shares change in one Postgres function.
- **Soft deletes and an audit trail:** `deleted_at`, plus a row in `audit_log` for every change. The one exception is
  deleting an account (`delete_account()`), which erases the couple's rows for the right to erasure.
- **`spent_on` is a `date`**, never a timestamp, so time zones never move an expense to another day.
- **Exactly two members per couple.**
- **Design:** colours only from `useTheme()`, styles from `makeStyles()`. No raw hex. Every screen works in
  light and dark mode. Colour is never the only cue. Touch targets are at least 44 × 44. One primary button per screen.
- **Copy:** UI text in Spanish first (`src/i18n/es.ts`), neutral and no-blame. Code, comments and docs in English.

## Contributing

Work happens on short-lived branches and lands on `main` through pull requests with green CI.
See [CONTRIBUTING.md](CONTRIBUTING.md) for branch names, commit style and the review checklist.

## Documentation

| Document | Contents |
| --- | --- |
| [docs/PLAN.md](docs/PLAN.md) | Product principles, features, roadmap, phase acceptance checks, Clerk setup, billing, open questions |
| [docs/DESIGN.md](docs/DESIGN.md) | The 13 screens and their routes, design system (UI kit v1) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, Clerk ↔ Supabase wiring, data model, code layout |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to propose and review changes |
| [SECURITY.md](SECURITY.md) | Keys, data protection, reporting a vulnerability |
| [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) | Working rules for AI coding assistants |

## License

Proprietary. Copyright © 2026 Diego Armando Ardila Vargas. All rights reserved. See [LICENSE](LICENSE).
