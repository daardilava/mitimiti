# MitiMiti — Architecture

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Mobile app | Expo SDK 57 + React Native + TypeScript | iOS and Android from one codebase; OTA updates with EAS |
| Navigation | Expo Router | File-based routes that mirror the 13 screens |
| **Auth** | **Clerk** (`@clerk/expo`) — email + password, Google, Apple | Session management, email verification, password reset |
| **Billing** | **RevenueCat** (App Store + Google Play subscriptions) + a Supabase webhook | Store billing is required for digital subscriptions on mobile; one Premium per couple, stored in Supabase; see [PLAN.md](PLAN.md#phase-6--billing-current) |
| Server state | TanStack Query | Caching, retries, optimistic updates |
| UI state | Zustand | Form drafts and filters only |
| Validation | Zod | Same schemas in the app and in Edge Functions |
| Database | Supabase Postgres | Balances and summaries are plain SQL |
| Security | Row Level Security, keyed on the **Clerk user id** | A member only reads/writes rows of their own couple |
| Realtime | Supabase Realtime | Partner's screen updates within seconds |
| Server logic | Supabase Edge Functions + pg_cron | Join by code, push, Sunday reminder |
| Push | Expo Notifications | One API for APNs and FCM |
| Offline (v1.2) | PowerSync on top of Supabase | Log without signal |
| Testing | Vitest (balance math), Maestro (E2E) | The balance logic must never be wrong |
| Monitoring | Sentry, PostHog | Crashes and success metrics |
| Delivery | EAS Build + Submit, GitHub Actions | CI runs tests and type checks on every PR |

## How Clerk and Supabase fit together

```
Phone ──sign in──▶ Clerk ──session JWT (sub = user_…, role = authenticated)──▶ Phone
Phone ──supabase-js with accessToken: () => getToken()──▶ Supabase (third-party auth: Clerk)
                                                           RLS: auth.jwt()->>'sub'
```

- Supabase trusts Clerk as a **third-party auth provider** (`[auth.third_party.clerk]` in
  `supabase/config.toml`, and the Clerk integration enabled in the Supabase dashboard). Supabase Auth itself
  is no longer used for sign-in.
- Clerk session tokens must carry `role: "authenticated"` (enable the Supabase integration in the Clerk dashboard).
- The Supabase client takes the Clerk token on every request: `createClient(url, key, { accessToken: async () => (await getToken()) ?? null })`.
- **User ids are Clerk ids (`text`, e.g. `user_2x…`), not `uuid`.** Every `auth.uid()` becomes
  `auth.jwt()->>'sub'`, and every `uuid references auth.users` column becomes `text`.

## How billing fits together

```
Phone ──purchase (Apple / Google)──▶ Store ──receipt──▶ RevenueCat   (app_user_id = Clerk id, user_…)
RevenueCat ──webhook, Authorization: <secret>──▶ Edge Function revenuecat-webhook (service role)
                                                   billing_events (idempotent) ─▶ subscriptions (one row per couple)
Both phones ──my_plan() RPC + Realtime on subscriptions──▶ usePlan() ──▶ src/lib/plans.ts decides what Free allows
```

- **Supabase decides**, not the phone: `subscriptions` has no insert/update/delete policy, so only the webhook
  (service role) writes it; members of the couple read it, and `my_plan()` answers for the signed-in person.
- **One row per couple**: whoever buys, both members are Premium. RevenueCat knows the buyer by their Clerk id;
  the webhook finds the couple through `members.user_id`. An event for someone without a couple yet waits in
  `billing_events` until the couple exists.
- **Free never changes the balance**: limits are applied by the app's screens and queries (`src/lib/plans.ts`),
  not by RLS, so `balance_view` and `monthly_summary` always see every expense.
- After a purchase the store and RevenueCat confirm first; the webhook may take a few seconds, so the app polls
  `my_plan()` briefly ("Activando Premium…"). The partner's phone updates through Realtime.

## Data model

| Table | Key columns |
| --- | --- |
| households | id, name, currency, join_code, default_split, created_at |
| members | household_id, user_id (**text**, Clerk id), display_name, role, avatar (character id or null; set via `update_couple_settings`) |
| expenses | id, household_id, paid_by, amount_minor, category, description, spent_on (date), split_mode, split_pct, created_by, updated_by, deleted_at |
| expense_shares | expense_id, user_id, share_minor |
| settlements | id, household_id, from_user, to_user, amount_minor, method, paid_on, created_by, deleted_at |
| budgets | household_id, category, month, limit_minor |
| push_tokens | user_id, token |
| audit_log | household_id, actor, action, entity, before, after, at |

- Money is always an integer in minor units (`bigint`), never floats.
- `spent_on` is a `date`, so time zones never move an expense to another day.
- Deletes are soft (`deleted_at`) and every change goes to `audit_log`.
- Writes that touch an expense and its shares run in one Postgres function (one transaction):
  `create_household`, `join_household`, `upsert_expense`, `delete_expense`, `record_settlement`, `regenerate_join_code`.
- **Account deletion** (`delete_account()`, Ajustes › Cuenta) is the one hard delete: it erases the couple's
  household (cascading to members, expenses, shares, settlements, budgets) and its `audit_log` rows, plus the caller's
  profile, push tokens and join attempts. The app first confirms a recent sign-in (Clerk reverification, a code by
  email), then calls it, then deletes the Clerk user ([src/lib/deleteAccount.ts](../src/lib/deleteAccount.ts)). The
  partner's phone notices the couple is gone on its next fetch and returns to Welcome with a notice.

| Currency | Display (es) | Decimals |
| --- | --- | --- |
| COP (default) | $184.000 | 0 |
| EUR | 1.234,50 € | 2 |
| USD | US$1,234.50 | 2 |

## Code layout

| Path | What |
| --- | --- |
| `src/app/` | Expo Router routes, one file per screen. `(onboarding)` for signed-out, `(tabs)` for the main app |
| `src/api/` | Calls to Clerk and Supabase (`auth.ts`, `household.ts`, `expenses.ts`, `balance.ts`, `budgets.ts`); `live.ts` keeps both phones in sync (Realtime + refetch on focus) |
| `src/lib/money.ts` | Format and parse COP / EUR / USD; amounts are integers in minor units |
| `src/lib/splits.ts` | Split modes and balance; mirrors `write_shares()` and `balance_view` in SQL |
| `src/lib/session.ts` | Clerk auth state (`userId`) and the route guard's inputs |
| `src/lib/authFlow.ts` | Password sign-in / sign-up / reset steps and Spanish auth errors, testable without React |
| `src/lib/activity.ts` | Movimientos: a day / week / month of expenses and payments, filtered, searched and grouped by day; per-day spending for the chart |
| `src/lib/coupleSettings.ts` | Ajustes: each person's share of the default split, settings error messages |
| `src/lib/budgets.ts` | Presupuestos: limits that carry over, status per category (80 % warning), − / + steps |
| `src/lib/summary.ts` | Resumen: a month by category, who paid, each one's share, personal total |
| `src/lib/exportData.ts` | Exportar movimientos: period presets, rows with each one's share, CSV in the language's dialect (`;` + decimal comma for es/de), formula-safe fields; `src/lib/exportPdf.ts` builds the PDF statement as HTML: the balance first, then how it got there (opening + the period's expenses + its payments = closing), key figures, who paid against their share, spending by category (percents always total 100), and the movements grouped by month; HTML-escaped; `src/api/exportFile.ts` writes the CSV, prints the PDF (`expo-print`, A4) and opens the share sheet |
| `src/lib/settle.ts` | Saldar cuentas: who pays whom, half / full, never more than owed, confirmation wording |
| `src/lib/balance.ts` | Balance wording ("Ana te debe", "Te deben $X") and the month's shared spending by who paid |
| `src/lib/joinCode.ts`, `dates.ts` | Invite code validation; date labels ("Ayer", "Lunes 12 de octubre") |
| `src/ui/` | Design tokens, `Icon`, `Screen`, `Avatar`, form pieces, auth pieces, `ExpenseRow` / `PaymentRow`, `SearchField`, `SpendChart`, `PeriodNav` and shared buttons |
| `supabase/` | Local config, migrations, and SQL tests on PGlite (`supabase/tests`: RLS and RPCs, and app ↔ database split parity) |
| `scripts/check-clerk.mjs` | `npm run clerk:check` |
