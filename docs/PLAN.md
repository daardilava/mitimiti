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
| Budgets | Monthly limit per category, warning at 80 %, over-limit alert | v1.1 → built early (the alert as a notification stays v1.1) |
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
| 2. Core MVP — built, checks open | Add, edit, delete expenses; live balance on Home; Activity | — |
| **3. Settle + summary** ← now | Settle up ✅, monthly summary ✅, split tests ✅, polish | **Balance is right:** all split tests pass ✅ |
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

### Phase 2 — Core MVP (built; acceptance checks open)

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
- [x] **Activity (§6, Movimientos)** — [src/app/(tabs)/activity.tsx](../src/app/(tabs)/activity.tsx)
  - Month switcher with "11 movimientos · $3.941.900 en gastos" (all of the month, personal included; filters
    don't change it). No months after the current one.
  - Search by description or category, ignoring case and accents ("super" finds Súper).
  - Filters: Todo · Pagó (tú) · Pagó (tu pareja) · Pagos entre ustedes. Payments only show under Todo and Pagos.
  - Days newest first ("Hoy", "Ayer", "Lunes 12 de octubre"), expenses (`ExpenseRow`, opens the detail) and
    payments (`PaymentRow`: "Ana le pagó a Diego · Transferencia · 3 oct", green "Pago").
  - Empty states: an empty month, and nothing matching the search or filter.
  - Logic in [src/lib/activity.ts](../src/lib/activity.ts); its tests reproduce the design's October (screen 08).
  - **Día · Semana · Mes** switch: the arrows step one day, week (Mon–Sun) or month; never into the future.
  - **Chart** ([src/ui/SpendChart.tsx](../src/ui/SpendChart.tsx)): shared spending per day stacked by who paid
    (blue / orange), totals in the legend, tap or drag to read one day. Día shows the who-paid bar instead of a
    one-column chart. Built with the dataviz rules (≤ 24 px columns, 2 px gaps, round ticks, legend with values
    because orange is under 3:1 on white; the list below is the table view). Checked in screenshots at 390 px.

**Acceptance checks**

- [ ] Home shows the same balance on both phones, and it matches the sum of expenses and payments.
- [ ] One phone adds, edits or deletes an expense → the other phone's Home updates within seconds, without reloading.
- [ ] "Gastado juntos" counts only this month's shared expenses (not personal ones), split by who paid.
- [ ] Before the partner joins: Home shows the invited name, and only you can be picked as payer.
- [ ] Activity lists every expense and payment of the day / week / month by day, with search and filters, and
  its chart adds up to the legend totals.

### Phase 3 — Settle + summary (current)

**Goal:** settling up is a habit (≥ 1 per month) and the month can be reviewed at a glance; the balance is right.

**Tasks**

- [x] **Settle up (§4, screens 09 + 10)** — [src/app/settle/index.tsx](../src/app/settle/index.tsx),
  [src/app/settle/done.tsx](../src/app/settle/done.tsx)
  - "Ana le paga a Diego. Pendiente: $337.950" from the live balance; whoever owes pays the other, and either of
    them can record it. Amount prefilled with everything owed; *Todo* / *La mitad* chips; never more than what is
    owed (checked in the app and again by `record_settlement`). Transferencia / Efectivo / Otro.
  - "Esto solo registra el pago en la app. No mueve dinero entre sus cuentas." Green button (payments only).
  - Pago registrado: "Ana le pagó $168.975 a Diego en efectivo." and the new balance; Volver al inicio /
    Ver movimientos. Home and Movimientos update (and the partner's phone, through Realtime).
  - Before the partner joins: explained, and the button stays off.
  - Logic in [src/lib/settle.ts](../src/lib/settle.ts) with tests; SQL tests: too much, even, the creditor recording.
    Checked in screenshots at 390 px.
- [x] **Monthly summary (§6, screen 11)** — [src/app/(tabs)/summary.tsx](../src/app/(tabs)/summary.tsx)
  - Month switcher (shared with Movimientos: [src/ui/PeriodNav.tsx](../src/ui/PeriodNav.tsx)); never past this month.
  - Gastos compartidos (total, count); Por categoría, largest first, % of the month and a bar relative to the
    largest; Quién pagó (Diego 74 % · Ana 26 %); Lo que le tocaba a cada uno, from each expense's split, with
    "Este mes, Diego puso $637.950 más que su parte"; Gastos personales (not in the balance); Ver presupuestos.
  - Computed in the app from the expenses already loaded (same split rule as `write_shares()`), so it updates
    live with Home and Movimientos.
  - Logic in [src/lib/summary.ts](../src/lib/summary.ts); its tests reproduce the design's October (63 / 13 / 9 /
    7 / 6 / 1 / 1 %, 74 / 26 %) and check paid − share − payments equals Home's balance. Checked in screenshots.
- [x] **Split tests for every mode — gate *Balance is right*: passing.**
  [supabase/tests/splits_parity.test.ts](../supabase/tests/splits_parity.test.ts) runs ~550 seeded expenses through
  the real RPCs and checks after every step that `expense_shares` = `splitShares` and `balance_view` =
  `netBalance` to the unit, for both people: half, every percentage 1–99, all for the other person, personal;
  1-unit, odd, round, cents and trillion-sized amounts; before and after the partner joins (backfill); edits of
  any field; deletes; partial and full payments by either; and Resumen vs the `monthly_summary` view. A planted
  rounding bug (`ceil` instead of `floor`) fails 8 of its 11 tests, so it does catch drift.
  - Found and fixed on the way: two phones recording a payment at the same moment could both pass the
    "not more than owed" check. [20261018000000_settle_lock.sql](../supabase/migrations/20261018000000_settle_lock.sql)
    locks the couple's row in `record_settlement`. **Needs `npx supabase db push`** on the hosted project.
- [x] **Ajustes (§7, screen 13)** — [src/app/(tabs)/settings.tsx](../src/app/(tabs)/settings.tsx)
  - Names: mine always; the partner's only until they join (then it is theirs to change). Saved on leaving the field.
  - Couple code with copy, and Compartir / Generar uno nuevo through Invite; "Ana ya se unió" once both are in.
  - División predeterminada (Mitad y mitad / Proporcional with my share 30–70 %). New expenses now start from it
    (it was a hard-coded 60 % in the form). This pulls the v1.1 "Default split and currency" setting forward.
  - Moneda: can change only while there are no expenses or payments, since amounts are never converted.
  - Recordatorios y avisos, Exportar CSV: shown as **Pronto** (v1.1: they need push tokens, a scheduled Edge
    Function and file export), not as switches that do nothing.
  - Cerrar sesión asks once more and shows which account is signed in.
  - **Security fix:** the RLS policies "update own member row" and "members update household" let a member move
    their row into another couple without a code (and past the two-member limit) or change the currency after
    expenses exist. [20261018010000_couple_settings.sql](../supabase/migrations/20261018010000_couple_settings.sql)
    drops them; Ajustes writes only through `update_couple_settings()`, which validates each field.
    [supabase/tests/couple_settings.test.ts](../supabase/tests/couple_settings.test.ts) covers it (and fails with the
    old policies). **Needs `npx supabase db push`.**
- [x] **Presupuestos (screen 12), pulled forward from v1.1** — [src/app/budgets.tsx](../src/app/budgets.tsx)
  - Month card: "Octubre · quedan 13 días", "$3.821.900 de $5.300.000", bar, "Les quedan $1.478.100 este mes".
  - Every category: "$481.000 de $1.200.000", − / + by $50.000 (10 € / US$10 in EUR / USD), holding repeats; saved
    600 ms after the last change (one write), optimistically. Quedan (green, < 80 %) · Ojo: quedan (amber, from
    80 %) · Llegaron al límite · Se pasaron por (red). The text always says the state. Sin límite when 0.
  - A limit holds for the following months until changed (one row per change; past months keep theirs).
  - Home: "Presupuesto del mes 72 % ›" card, replacing the placeholder. Live on the partner's phone (Realtime).
  - Logic in [src/lib/budgets.ts](../src/lib/budgets.ts); tests reproduce the design's month (72 %, every
    category's line). [supabase/tests/budgets.test.ts](../supabase/tests/budgets.test.ts): either member writes,
    nobody else reads or writes, rows can't move to another couple, no negative limits. No migration needed.
  - Colours on the dark card are new tokens validated with the dataviz script. Note: the UI kit's green
    `#0F7B6C` is just under the script's chroma floor (reads slightly grey); kept, since it always comes with text.
  - Not here yet: the over-limit *alert* as a notification (needs push, v1.1 Notifications).
- [x] **Dark mode, whole app** — follows the phone, or Ajustes › Apariencia (Automático / Claro / Oscuro). Dark
  palette with contrast tests in both modes; every screen moved to `useTheme()` / `makeStyles()`; navigation,
  status bar and the native root background follow. Checked in screenshots of all main screens in both modes.
  Needs a new development build (adds `expo-system-ui`, a native module) to follow the system on Android.
- [x] **División predeterminada: presets and a typed share** — Ajustes offers Mitad y mitad, 70/30 · 60/40 ·
  40/60 · 30/70 (read as "Tú / Ana") and Otra: any whole share typed by hand, with a live "Tú 65 % · Ana 35 %"
  preview. The range is now 1–99 %, like one expense's split
  ([20261018020000_default_pct_range.sql](../supabase/migrations/20261018020000_default_pct_range.sql) only widens
  that check in `update_couple_settings`). New expenses start from it, and the form adds a chip for any value that
  isn't one of its five. Setup (*Armemos su cuenta*) still offers 30–70 % in steps of 5. **Needs `npx supabase db push`.**
- [ ] Polish.

**Acceptance checks**

- [ ] Recording a full payment leaves both phones at "Están a mano"; a partial one leaves the rest pending.
- [ ] Neither phone can record more than what is owed, even if both try at once.
- [ ] The payment shows in Movimientos under Todo and Pagos entre ustedes, on both phones.
- [ ] Resumen shows the same totals on both phones, and its categories add up to Gastos compartidos.
- [ ] Ajustes: renaming myself shows on the partner's phone; the proportional default is each one's own share.
- [ ] Presupuestos: a limit changed on one phone shows on the other; next month starts with the same limits.

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
