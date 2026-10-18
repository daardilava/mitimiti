# a medias — Plan

Scope, roadmap and the acceptance checks for each phase. External source of truth: *a medias — Project Plan*.

## Product principles

- **Two people, not a group.** Every screen assumes exactly two members; no group management.
- **Fair, not just 50/50.** Percentage splits (30/70 … 70/30), "all for the other person" and personal expenses are first-class.
- **Fast to log.** A new expense in < 10 s and three taps after the amount.
- **The app records, it never moves money.** Settling up registers a payment made outside the app.
- **No blame.** Neutral language and colours; the balance is a fact, not a debt collector.

**Non-goals for v1:** groups of 3+, bank connections or moving money, investments / savings goals,
a web app (mobile only), converting between currencies.

## Features

| Feature | What it does | Release |
| --- | --- | --- |
| Couple account | Sign in with email + password, Google or Apple via **Clerk**; one shared space with a 6-character invite code and its currency | MVP |
| Log an expense | Amount, description, who paid, category (9), date (today, yesterday, pick) | MVP |
| Flexible splits | Half and half, by percentage, all for the other person, personal | MVP |
| Live balance | "Ana te debe $337.950", computed from every expense and payment, real time for both | MVP |
| Edit and delete | Change any field; delete with confirmation; balance recalculates | MVP |
| History | Grouped by day, search, filters (who paid, payments), month switcher | MVP |
| Settle up | Full or partial payment by transfer, cash or other | MVP |
| Monthly summary | Total shared, by category, who paid, each one's share | MVP |
| Budgets | Monthly limit per category, warning at 80 %, over-limit alert | v1.1 |
| Notifications | "Ana agregó un gasto"; Sunday reminder when a balance is open | v1.1 |
| Default split and currency | Per-couple setting used for every new expense | v1.1 |
| CSV export | All expenses and payments for a date range | v1.1 |
| Subscription (Clerk Billing) | Paid plan, see [Billing](#billing-later-phase) | TBD |
| Offline logging | Save without signal, sync later | v1.2 |
| Recurring expenses | Rent, internet, subscriptions added each month | v1.2 |
| Receipt photo / widget | Picture on an expense; home-screen balance + quick add | Later |

### Balance rules (the core logic)

- Each expense stores how much belongs to each person (`expense_shares.share_minor`), not only the split mode.
- My balance from one expense = what I paid − my share. Personal expenses have no effect.
- A payment from her to me lowers what she owes by its amount; from me to her does the opposite.
- The balance is **never stored**: it is always the sum of expenses and payments (`balance_view`).
- Amounts are integers in the currency's smallest unit; when a split leaves an odd unit, the payer keeps it.

---

## Roadmap

One feature in focus at a time. A phase is done when lint, typecheck and tests pass and its acceptance
checks are ticked.

| Phase | Scope | Gate |
| --- | --- | --- |
| 1. Auth (Clerk) — built, checks open | Sign-in, session, sign-out, Supabase linked to Clerk, couple create/join behind auth | Both of us can sign in on real phones and land in the same couple |
| **2. Core MVP** ← now | Add, edit, delete expenses; live balance on Home; Activity | — |
| 3. Settle + summary | Settle up, monthly summary, split tests, polish | **Balance is right:** all split tests pass |
| 4. Private beta | TestFlight + Play internal, both of us daily | — |
| 5. v1.1 | Budgets, notifications, defaults, CSV | **We trust it:** 2 weeks, 0 corrections |
| 6. Billing (Clerk Billing) | Paid plan, entitlements | Decision on mobile payment flow (below) |

When a phase starts, give it a section below with goal, tasks as `- [ ]` and acceptance checks.

### Phase 1 — Auth with Clerk (built; acceptance checks open)

**Goal:** a person opens the app, signs up or in (email + password, Google or Apple), and either creates a couple or joins one
with a code. Signing out returns to Welcome with nothing cached.

**Flow**

```
Welcome ─▶ Sign-in (Clerk) ─┬─ "Crear nuestra cuenta" ─▶ Setup (Paso 1) ─▶ Invite (Paso 2) ─▶ Home
                            └─ "Tengo un código"      ─▶ Join            ─────────────────▶ Home
Signed in + already in a couple ─▶ Home directly
Settings ▸ Cerrar sesión ─▶ Clerk signOut ─▶ Welcome (query cache cleared)
```

**What is built** (code done; the live checks below need a Clerk key)

| Piece | Where |
| --- | --- |
| `ClerkProvider` + SecureStore token cache; app refuses to start without a key unless `EXPO_PUBLIC_DEV_BYPASS_AUTH=1` | [src/app/_layout.tsx](../src/app/_layout.tsx) |
| Session store follows Clerk's `useAuth()` (`userId` = Clerk id), then looks up the couple | [src/lib/session.ts](../src/lib/session.ts) |
| Supabase client sends Clerk's session token (`accessToken`); no Supabase Auth | [src/lib/supabase.ts](../src/lib/supabase.ts) |
| Password sign-in (+ code on a new device), sign-up (+ code to verify the email), password reset, Google / Apple via `useSSO`, sign-out | [src/api/auth.ts](../src/api/auth.ts), [src/lib/authFlow.ts](../src/lib/authFlow.ts) |
| Screens: Iniciar sesión, Crea tu cuenta, ¿Olvidaste tu contraseña?, Términos (placeholder) | [src/app/(onboarding)/](../src/app/(onboarding)/), [src/ui/Auth.tsx](../src/ui/Auth.tsx) |
| Browser comes back to `amedias://sso-callback` | [src/app/sso-callback.tsx](../src/app/sso-callback.tsx) |
| User ids are `text` Clerk ids; RLS and RPCs use `requesting_user_id()` = `auth.jwt()->>'sub'` | [supabase/migrations/](../supabase/migrations/) |
| Supabase trusts Clerk (`[auth.third_party.clerk]`, domain from `CLERK_DOMAIN`) | [supabase/config.toml](../supabase/config.toml) |

**Set up Clerk (once)** — then run `npm run clerk:check`, which reads the instance's public settings and
fails on anything the app cannot handle.

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com). Copy the **publishable key**
   (`pk_test_…`) into `.env` as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and set `EXPO_PUBLIC_DEV_BYPASS_AUTH=0`.
2. **User & authentication › Email:** sign-in with email on, verify at sign-up with **Email verification code**.
   **Password:** "Sign-up with password" **on**. **Name / username / phone:** off or optional (the app keeps
   the name the person types in Crea tu cuenta and prefills "Tu nombre" with it).
3. **SSO connections:** add **Google** (and **Apple**), "Enable for sign-up and sign-in". On a development
   instance Clerk's shared credentials work, so no Google Cloud project is needed until production.
4. **Native applications:** enable the **Native API**. If Clerk rejects the redirect after Google, add
   `amedias://sso-callback` (development build) to the mobile SSO redirect allowlist; in Expo Go the redirect
   is `exp://<your-ip>:8081/--/sso-callback`.
5. **Integrations › Supabase:** activate it (adds `role: authenticated` to session tokens) and copy the Clerk
   domain. Put it in `[auth.third_party.clerk] domain` in `supabase/config.toml` (local), and in Supabase ›
   Authentication › Sign In / Providers › Third-party auth › Clerk (hosted).

**Proofs that run without Clerk** (`npm test`)

- `src/lib/__tests__/authFlow.test.ts`: right / wrong password, unknown email, new-device code; sign-up sends the
  name and terms, verifies the email, refuses a taken email; password reset signs in and closes other sessions,
  and a rejected new password can be fixed without re-checking the code.
- `supabase/tests/clerk_rls.test.ts`: runs the real migrations on PGlite (in-process Postgres) with Clerk-style
  tokens: signed-out calls are refused, the couple is created for the token's `sub`, the partner joins and gets
  their share, a third user sees no row and cannot write, settle-up and audit carry Clerk ids, join is rate-limited.

**Acceptance checks** (live, need the Clerk key)

- [ ] `npm run clerk:check` passes.
- [ ] Web (`npx expo start --web`): Crea tu cuenta (code by email), Iniciar sesión, ¿Olvidaste tu contraseña? and Google all reach Setup.
- [ ] Android / iOS development build: Google returns to the app signed in; Apple on iOS.
- [ ] Session survives an app restart (token in SecureStore).
- [ ] New user → Setup → Invite shows a 6-character code; partner joins with it and sees the same couple.
- [ ] A signed-in user already in a couple opens straight to Home.
- [ ] Sign-out returns to Welcome and no data from the previous couple is visible.

### Phase 2 — Core MVP (current)

**Goal:** both of us log every shared expense and always see the same, correct balance, updated live.

**Tasks**

- [x] Add, edit, delete an expense (form, detail, `upsert_expense` / `delete_expense`) — built before this phase.
- [x] **Live balance on Home (§5)** — [src/app/(tabs)/index.tsx](../src/app/(tabs)/index.tsx)
  - Balance card from `balance_view` ([src/api/balance.ts](../src/api/balance.ts)): "Ana te debe $337.950", what it
    considers ("9 gastos compartidos y 1 pago registrado"), Saldar cuentas when not zero.
  - "Gastado juntos en octubre": shared expenses of the month by who paid, blue / orange bar.
  - Recientes: last 4 expenses ([src/ui/ExpenseRow.tsx](../src/ui/ExpenseRow.tsx)), "Ver todos", empty state.
  - Live: Realtime on `expenses` and `settlements` + refetch on app focus ([src/api/live.ts](../src/api/live.ts)).
  - Before the partner joins: their name is the one typed in Setup, and they cannot be picked as payer.
  - Wording and month math in [src/lib/balance.ts](../src/lib/balance.ts); its tests reproduce the design's sample
    month ($3.821.900 · Diego $2.812.900 · Ana $1.009.000 · Ana te debe $337.950).
  - Budget bar: placeholder until v1.1.
- [ ] **Activity (§6, Movimientos)** — expenses and payments by day, search, filters (todo / pagó cada uno /
  pagos entre ustedes), month switcher, empty state. Reuses `ExpenseRow`.

**Acceptance checks**

- [ ] Home shows the same balance on both phones, and it matches the sum of expenses and payments.
- [ ] One phone adds, edits or deletes an expense → the other phone's Home updates within seconds, without reloading.
- [ ] "Gastado juntos" counts only this month's shared expenses (not personal ones), split by who paid.
- [ ] Before the partner joins: Home shows the invited name, and only you can be picked as payer.
- [ ] Activity lists every expense and payment of the month by day, with search and filters.

### Billing (later phase)

Clerk Billing is the planned billing layer, but it has constraints that must be resolved before we build it:

- **Checkout is web-only** (including Expo web). Native iOS/Android can *read* plans and subscriptions
  but there is no native checkout.
- **Stripe only, USD only.** Fine for a subscription price, independent from the couple's COP/EUR/USD currency.
- **No Apple In-App Purchase or Google Play Billing.** Stores generally require their own billing for digital
  subscriptions sold inside the app; check the current App Review Guidelines and Play Payments policy.

Options to decide on: (a) subscribe on a web page and unlock in the app by checking the plan with Clerk's
`has({ plan })`; (b) use store billing (e.g. RevenueCat / `expo-iap`) on mobile and keep Clerk for identity.
Which plan is per **couple** (B2B-style, one subscription for both) vs. per **person** is also open.

## Open questions

- Default split 50/50 or proportional to income? If proportional, which ratio?
- One currency per couple enough, or do trips need a second one?
- Import past expenses from the current spreadsheet / notes?
- Should a settle-up need confirmation from the person receiving the money?
- What is paid vs. free, and is the subscription per couple or per person?
- App name and icon: keep "a medias"?
