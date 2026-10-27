# Security

## Reporting a vulnerability

Don't open an issue. Contact the repository owner, [@daardilava](https://github.com/daardilava), privately with a
description and the steps to reproduce. You'll get an answer within 72 hours.

## How the app protects data

- **Authentication** is handled by Clerk. The app never sees or stores passwords. Session tokens are kept in
  the device's secure storage (`expo-secure-store`).
- **Authorization** is enforced in the database. Every table has Row Level Security keyed on the Clerk user id
  (`requesting_user_id()`), so a member can only read and write rows of their own couple, whatever the app
  sends. RLS isolation is covered by tests in `supabase/tests/`.
- **Writes that touch money** go through `security definer` Postgres functions that validate their input and
  run in one transaction. Direct table writes are limited by RLS.
- **Deletes are soft.** Deleting an expense or a payment sets `deleted_at`, and every change is written to `audit_log`.
  The one exception is **Borrar cuenta** (`delete_account()`): for the right to erasure it removes the couple's rows,
  audit trail and billing events included, after confirming a recent sign-in.
- **Premium** is decided on the server: only the RevenueCat webhook and `billing-sync` (service role) write a
  couple's `subscriptions` row; the app only reads it. The webhook checks a shared secret in constant time.
- The app **never moves money**, never connects to bank accounts, and never sees card data: purchases go through
  the App Store and Google Play.

## Keys and secrets

| Key | Where it lives | Secret? |
| --- | --- | --- |
| Supabase publishable / anon key | `.env` → bundled in the app | No, public by design. RLS is the guard |
| Clerk publishable key | `.env` → bundled in the app | No, public by design |
| Supabase service-role key, database password | Supabase dashboard; GitHub Actions secrets if ever needed | **Yes**: never in the app, never in the repo |
| Clerk secret key | Clerk dashboard; server-side only | **Yes**: never in the app, never in the repo |
| RevenueCat public SDK keys (`appl_…`, `goog_…`) | `.env` → bundled in the app | No, public by design |
| `REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_SECRET_API_KEY` (`sk_…`) | Supabase secrets (`npx supabase secrets set`) | **Yes**: never in the app, never in the repo |
| `EXPO_TOKEN` (EAS) | GitHub Actions secrets | **Yes** |

Rules:

- `.env` is git-ignored. Only `.env.example`, with placeholder values, is committed.
- Every `EXPO_PUBLIC_*` variable ships inside the app, so it must never hold a secret.
- If a secret is ever committed, **rotate it immediately**. Removing it from history is not enough.
