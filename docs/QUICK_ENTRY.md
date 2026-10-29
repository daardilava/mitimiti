# Quick entry with AI — plan

Goal: **logging an expense takes about 3 seconds** from intent to saved, by typing, speaking, photographing a
receipt or tapping a home-screen shortcut. Fits the product principle *Fast to log* (today: < 10 s, three taps
after the amount) and tightens it. Linked from [PLAN.md](PLAN.md).

**Status:** Slice 1 (local parser) built. Slices 2–6 not started.

---

## Ground rules (decided before any code)

These follow `CLAUDE.md`; the AI must never bend them.

1. **AI proposes, the app decides.** The model only returns a *draft* (`amountText`, `currency`, `description`,
   `category`, `payer`, `splitMode`, `splitPct`, `spentOn`, `confidence`). Saving always goes through the existing
   `useUpsertExpense` → `upsert_expense` RPC. **No new write path, no AI in SQL.**
2. **Money never comes from the model as a number.** The model returns the amount *as text* ("4,50", "20 mil");
   `src/lib/money.ts` turns it into minor units. A new `parseSpokenAmount()` lives there, with tests.
3. **Never convert currencies.** If the text or receipt is in a different currency from the couple's, stop and say
   so; don't guess a rate.
4. **Local first, AI as fallback.** A deterministic parser on the phone handles the common phrases instantly,
   offline and for free. The network/AI path is only used when the local parser isn't confident, for voice
   transcription and for receipts. This is what makes 3 seconds possible: a model round trip alone is 1–2 s.
5. **No API key in the app.** `EXPO_PUBLIC_*` values ship inside the bundle. Model calls go through a Supabase Edge
   Function that checks the Clerk JWT (`requesting_user_id()` is in a couple), holds the key as a Supabase secret,
   and is rate-limited per couple.
6. **Defaults fill the gaps.** Payer = me, split = the couple's default (Ajustes › División predeterminada),
   date = today, category = learned/keyword or `otros`. A phrase only needs an amount.
7. **Always a way back.** Saved → toast "Gasto agregado · Deshacer · Editar". Deshacer = `delete_expense`
   (soft delete + audit, already exists). Editar = the full form, prefilled.
8. **Privacy.** Only the typed text / audio / receipt image goes to the model, never balances or names beyond
   the two first names needed to resolve "pagó Ana". Receipt images are not stored (v1). Mention the AI
   processor in the privacy policy (users in Germany: GDPR, data-processing agreement with the model provider).

### Open decisions (answer before slice 3)

- [ ] Model provider and model (a small, fast model is enough for text; receipts need vision).
- [ ] Is AI entry free, or part of the paid plan (see *Billing*)? Each call costs money; rate limit either way.
- [ ] Voice: on-device speech recognition (fast, private, needs a dev build) or cloud transcription?
- [ ] Should we record `source` (manual / text / voice / receipt / widget) on each expense to measure adoption?
  If yes it's a new migration + `upsert_expense` parameter, and `splits_parity.test.ts` must keep passing.

---

## Slices

Each slice ships on its own, leaves the app working, and ends with `npm run typecheck`, `npx expo lint`,
`npm test` passing.

### Slice 1 — Local parser (no AI, no UI) — built

`src/lib/quickEntry.ts`, pure, tested in `src/lib/__tests__/quickEntry.test.ts`.

```ts
parseQuickEntry(text: string, ctx: {
  currency: Currency; me: Person; partner: Person; partnerJoined: boolean;
  defaultSplit: 'half' | 'pct'; myDefaultPct: number; today: string; language: 'es' | 'en' | 'de';
}): { draft: QuickDraft; confidence: 'high' | 'low'; missing: QuickEntryGap[]; foreignCurrency?: Currency }
```

`ctx` takes a `Couple` (from `useCouple()`) plus `today` and `language`. `missing` lists what a `low` result needs
from the person: `amount`, `currency` (a different currency was named — `foreignCurrency` says which), `payer`,
`split`, `date`.

Must understand (es / en / de):

| Part | Examples |
| --- | --- |
| Amount | `4,50` `4.50` `$20.000` `20 mil` `20k` `20 lucas` `1,2 M` `2 Tsd.` `zwanzig`? (words: later) |
| Payer | `yo pagué` `pagué yo` `pagó Ana` `Ana pagó` `pagado por Ana` `I paid` `Ana paid` `ich habe bezahlt` `Ana hat bezahlt` |
| Split | `a medias` `mitad` `50/50` `60/40` `todo de Ana` `para Ana` `personal` `mío` `solo yo` `split` `für mich` |
| Date | `ayer` `anteayer` `el lunes` `hace 3 días` `yesterday` `2 days ago` `gestern` `vor 2 Tagen` (never in the future) |
| Category | keyword map per language: café → comida, Rewe/Éxito/D1/Lidl → super, Uber/gasolina/Tank → transporte, arriendo/Miete → casa… |

Rules to test explicitly:

- `4,50` is 450 in EUR, ambiguous in COP (→ `low`, ask). `4.500` in COP is 4500; in EUR it's 4500,00 (thousands).
- Never a negative or zero amount; two amounts in one phrase → `low`.
- The partner's real name (from `couple`) is matched ignoring case and accents ("ana" = "Ána").
- Before the partner joins, payer can only be me (same rule as the form).
- A **golden file** of ~150 real phrases in the three languages with the expected draft; target ≥ 90 % `high`
  and correct, 0 wrong amounts. This file is also the eval set for slice 3.

`parseSpokenAmount()` goes in `src/lib/money.ts` (+ cases in `money.test.ts`), reusing `parseMoneyInput`.

Decisions taken while building it:

- `60/40` is always *me / partner*, like the form's chips ("Diego 60% · Ana 40%"), whoever paid.
- A weekday ("el lunes", "on Monday", "am Montag") is the most recent one *before* today: said on a Monday it
  means a week ago (today is "hoy").
- A lone "pagó" with no name, a gift "para Ana" (regalo para Ana: whose share?), and the partner paying before
  they joined all come back `low` with the gap named, instead of guessing.
- Golden file: `src/lib/__tests__/quickEntry.golden.json`. The phrases were written from the examples above, not
  collected from use; add real phrases as they come (and every phrase the parser got wrong).

### Slice 2 — Quick-add sheet (still no AI)

- New route `src/app/expense/quick.tsx` (modal sheet). The tab bar's **+** opens it; "Más opciones" opens the
  current `/expense/new` with the draft.
- One autofocused field, placeholder from i18n ("café 4,50 yo pagué"). Chips under it update **as you type**:
  amount · category · who paid · split · date. Tapping a chip changes it (one tap, no form).
- Return key / one primary button saves when the draft is `high` and has an amount. `low` → the missing chip
  pulses and the button reads "Revisar".
- Save = `useUpsertExpense` with an **optimistic** insert into the expenses cache, then close; toast with
  Deshacer / Editar (needs a small `Toast` in `src/ui/`).
- `ExpenseForm` gains a `draft?: Partial<ExpenseInput>` prop (today `initial` requires a saved `Expense` with id).
- i18n: every new string in `es.ts`, `en.ts`, `de.ts`; `messages.test.ts` keeps them in sync.
- a11y: chips are buttons with labels that say the value; ≥ 44 × 44; works in dark mode (`useTheme` /
  `makeStyles`, no raw hex).
- Works with `EXPO_PUBLIC_DEV_BYPASS_AUTH=1` (sample data).

**Check:** 20 entries typed by hand on a real phone, median ≤ 3 s from opening the sheet to the toast.

### Slice 3 — AI fallback for text

- `supabase/functions/parse-expense/` (Deno Edge Function):
  verify the Clerk JWT, confirm the caller is in a couple, rate-limit (e.g. N calls / couple / day in a small
  table → new migration + RLS + test in `supabase/tests/`), call the model with **structured output** constrained
  to the draft schema, validate with **Zod**, return the draft. Timeout ~3 s.
- Shared Zod schema `src/lib/quickEntrySchema.ts` (ARCHITECTURE: same schemas in the app and Edge Functions).
- The app calls it only when the local parser returns `low` (debounced, after typing stops), shows a subtle
  "pensando…" on the chips, and keeps the local draft if the call fails or times out. Offline = local only.
- The model prompt gets: the phrase, the couple's currency, the 9 category ids, both first names, today's date,
  the UI language. Not the balance, not other expenses.
- Tests: schema accepts/rejects; the function with a mocked model (bad JSON, wrong category, amount as number,
  timeout); run the golden file against the real model in a manual script (`scripts/eval-quick-entry.mjs`),
  not in CI.
- New secret documented in `.env.example` comments / README (`supabase secrets set …`), never committed.

### Slice 4 — Voice

- Mic button in the quick sheet: press, speak, release → transcript goes through **the same** `parseQuickEntry`
  (+ AI fallback). One pipeline for text and voice.
- Preferred: on-device speech recognition (fast, private, works offline on most phones; native module → needs
  a development build). Fallback: record with `expo-audio`, transcribe in the Edge Function.
- Before choosing a library, check it against **Expo SDK 57** docs (`CLAUDE.md`: Expo has changed); add with
  `npx expo install`, permissions and usage strings via `app.json` config plugins (never edit `ios/` / `android/`).
- Microphone permission asked the first time the mic is tapped, with a sentence explaining why; denied →
  the field still works.
- Locale of recognition = the app's language.

### Slice 5 — Receipt photo

- Camera button in the quick sheet → take or pick a photo → shrink it on the phone (~1024 px, JPEG) → Edge
  Function `parse-receipt` (vision model) → draft with total, merchant as description, date, currency.
- **Always opens the confirm chips, never auto-saves** (receipts are easy to misread).
- Different currency from the couple's → explain, don't convert. Date in the future → today.
- Image not stored in v1 (storing receipts = Supabase Storage bucket + RLS + migration; that's the PLAN's
  "Receipt photo" item, later).
- Camera permission like the mic. Same rate limit table as slice 3.

### Slice 6 — Home-screen shortcuts and widget

Do it in this order (cheapest first):

1. **Deep link** `mitimiti://expense/quick?mode=text|voice|camera` opens the sheet in that mode (Expo Router route
   already handles the scheme). Test it with `npx uri-scheme` / `adb`.
2. **App icon quick actions** (long-press the icon: "Agregar gasto", "Dictar gasto", "Foto de recibo") —
   small, no widget code.
3. **Widget** — native code: iOS WidgetKit (Swift) and Android App Widget, added through config plugins / a
   target-generation tool compatible with SDK 57 and Continuous Native Generation. v1 widget = buttons that open
   the deep links. Showing the balance on the widget needs shared storage between app and widget (App Group on
   iOS) and a refresh policy — a separate, later step.

---

## Acceptance checks

- [x] Golden phrases: ≥ 90 % parsed locally with the right amount, payer and split; **0 wrong amounts saved**.
  (168 phrases, 142/142 `high` right, every `low` names its gap; enforced by `quickEntry.test.ts`.)
- [ ] Median time to log on a real phone ≤ 3 s for text, ≤ 5 s for voice (20 tries each).
- [ ] Airplane mode: typing still logs (local parser), AI/voice-cloud/receipt explain they need a connection.
- [ ] Deshacer removes the expense on both phones (Realtime); balance returns to the previous value.
- [ ] The partner's phone shows the new expense within seconds, like any other.
- [ ] No model key in the app bundle (`grep` the built JS); calls without a valid Clerk token are refused.
- [ ] Rate limit reached → a clear message, the manual form still works.
- [ ] es / en / de: placeholder, chips, errors and toast all translated.
- [ ] Widget / quick actions open the right mode on iOS and Android.

## Risks

| Risk | Mitigation |
| --- | --- |
| Wrong amount saved silently | Amount parsed only by `money.ts`; `low` confidence never auto-saves; undo toast |
| COP vs EUR decimal confusion | Currency-aware parsing + explicit tests; ambiguous → ask |
| AI latency kills the 3 s goal | Local parser first; AI only on `low`; 3 s timeout |
| Cost / abuse | Server-side key, per-couple rate limit, possibly a paid feature |
| Native modules break Expo Go | Voice and widget need a development build; note it in the PR like dark mode did |
