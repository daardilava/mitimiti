# a medias

App for two people to track shared expenses: who owes whom, settle up, monthly summary and budgets.
Expo (React Native + TypeScript) on the phone, Supabase (Postgres) behind it. Money in COP by default; EUR and USD supported.

The design (13 screens + design system) and the project plan with the feature breakdown live in Claude artifacts;
section numbers like `§4` in the code refer to the plan's Feature breakdown tab.

## Run it

```bash
npm install
cp .env.example .env      # EXPO_PUBLIC_DEV_BYPASS_AUTH=1 lets you click through every screen with sample data
npx expo start            # press w for web, or scan the QR code with Expo Go
```

## Database (needs Docker Desktop)

```bash
npm run db:start          # local Supabase; prints the URL and keys for .env
npm run db:reset          # applies supabase/migrations/*
npm run db:types          # regenerates src/lib/database.types.ts
```

`supabase/migrations/20261015000000_init.sql` has the tables, Row Level Security, the `balance_view` and
`monthly_summary` views, and the RPCs the app writes through (`create_household`, `join_household`,
`upsert_expense`, `delete_expense`, `record_settlement`, `regenerate_join_code`).

## Checks

```bash
npm run typecheck
npx expo lint
npm test                  # money formatting and split/balance math
```

## Layout

| Path | What |
| --- | --- |
| `src/app/` | Expo Router routes — one file per screen. `(onboarding)` for signed-out, `(tabs)` for the main app |
| `src/lib/money.ts` | Format and parse COP / EUR / USD; amounts are integers in minor units |
| `src/lib/splits.ts` | Split modes and balance — mirrors `write_shares()` and `balance_view` in SQL |
| `src/lib/session.ts` | Auth state and the route guard's inputs |
| `src/ui/` | Tokens from the design system, `Icon`, `Screen` and shared buttons |
| `supabase/` | Local config and migrations |

Screens marked **Por construir** are routed placeholders; each names the feature section that builds it.
