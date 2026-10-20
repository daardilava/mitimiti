# Contributing

How changes get from an idea to `main`. The goal is a `main` branch that always builds, always passes its
tests, and can be shipped at any time.

## Workflow

1. **Start from an up-to-date `main`.**
   ```bash
   git switch main && git pull
   git switch -c feat/movimientos-calendar
   ```
2. **Keep the change small and focused:** one feature or fix per branch. Follow the current phase in
   [docs/PLAN.md](docs/PLAN.md); don't start work from a later phase unless it was agreed.
3. **Run the checks locally** before pushing:
   ```bash
   npm run typecheck
   npx expo lint
   npm test
   ```
4. **Open a pull request** against `main` and fill in the template. CI must be green.
5. **Squash and merge.** The branch is deleted automatically.

### Branch names

| Prefix | Use |
| --- | --- |
| `feat/` | A new feature or screen |
| `fix/` | A bug fix |
| `db/` | A migration or SQL / RLS change |
| `docs/` | Documentation only |
| `chore/` | Tooling, dependencies, CI |
| `refactor/` | Code change with no behaviour change |

### Commit messages

Imperative mood, short subject (≤ 72 characters), and a body that explains **why** when it isn't obvious.

```
Add calendar picker to Movimientos

Tapping the period title opens a sheet to jump to any day, week or month,
instead of stepping one period at a time with the arrows.
```

## Definition of done

- [ ] Typecheck, lint and tests pass, locally and in CI.
- [ ] New logic in `src/lib/` has tests in `src/lib/__tests__/`.
- [ ] New SQL or RLS behaviour has a test in `supabase/tests/`.
- [ ] Split or balance changes keep `supabase/tests/splits_parity.test.ts` passing.
- [ ] Schema changes are a **new** migration file. Applied migrations are never edited.
- [ ] UI works in light and dark mode, colours come from `useTheme()`, touch targets are at least 44 × 44.
- [ ] New text is in `src/i18n/es.ts`, `en.ts` and `de.ts`. Spanish copy is neutral and no-blame.
- [ ] New environment variables are added to `.env.example` and the README.
- [ ] If the change completes an acceptance check in [docs/PLAN.md](docs/PLAN.md), it is ticked.

## Dependencies

- Add packages with `npx expo install <package>` so the version matches the Expo SDK.
- A library with native code needs a development build (`npx expo run:android|ios` or EAS); Expo Go won't load it.
- Run `npx expo-doctor` after upgrading.

## Database changes

```bash
npx supabase migration new <short_description>   # creates supabase/migrations/<timestamp>_<name>.sql
npm run db:reset                                 # apply locally
npm run db:types                                 # regenerate src/lib/database.types.ts
npm test                                         # SQL tests run on PGlite
```

Deploy the migration to the hosted project **before** the app code that needs it:
`npx supabase db push --dry-run`, review, then `npx supabase db push`.

## Releases

- Version tags follow [SemVer](https://semver.org): `v0.3.0`, `v0.3.1`…
- Native builds: `npx eas-cli@latest build`. JavaScript-only fixes: `npx eas-cli@latest update`.
- Each release gets a GitHub Release with its notes.
