# a medias

App for two people who share a life and a budget. It answers one question in under five seconds:
**who owes whom, and how much?**

Expo (React Native + TypeScript) on the phone, **Clerk** for sign-in (and later billing), **Supabase**
(Postgres + Row Level Security + Realtime) for the data. Spanish first. Money in COP by default; EUR and USD
supported, never converted.

> **Current focus: Phase 2 — Core MVP** (Live balance on Home built; Activity next). See [docs/PLAN.md](docs/PLAN.md).

## Docs

| Doc | What's in it |
| --- | --- |
| [docs/PLAN.md](docs/PLAN.md) | Principles, features, roadmap, current phase and its acceptance checks, Clerk setup, billing, open questions |
| [docs/DESIGN.md](docs/DESIGN.md) | The 13 screens and their routes, design system (UI kit v1) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tech stack, how Clerk and Supabase fit together, data model, code layout |
| [CLAUDE.md](CLAUDE.md) | Working rules for Claude Code (loaded automatically each session) |

Sources of truth: *a medias — Project Plan* (scope, data model, roadmap) and *a medias — UI design*
(13 screens + design system "UI kit v1"). Section numbers like `§4` in the code refer to the plan's
Feature breakdown tab.

## Run it

```bash
npm install
cp .env.example .env      # EXPO_PUBLIC_DEV_BYPASS_AUTH=1 lets you click through every screen with sample data
npx expo start            # press w for web, or scan the QR code with Expo Go
```

Sign-in needs a Clerk key (see Set up Clerk in [docs/PLAN.md](docs/PLAN.md)). Google and Apple
open the system browser through Clerk (`useSSO`), which works in Expo Go, on web and in development builds
(`npx expo run:ios|android`).

## Database (needs Docker Desktop)

```bash
npm run db:start          # local Supabase; prints the URL and keys for .env
npm run db:reset          # applies supabase/migrations/*
npm run db:types          # regenerates src/lib/database.types.ts
```

## Checks

Run before declaring any task done:

```bash
npm run typecheck
npx expo lint
npm test                  # money, splits, join codes, dates, email-code flow, and SQL/RLS on PGlite
npm run clerk:check       # the Clerk instance in .env is configured the way the app signs in
```
