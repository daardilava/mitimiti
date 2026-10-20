## What and why

<!-- What does this change, and why is it needed? Link the issue or the PLAN.md item. -->

## How to test

<!-- Steps a reviewer can follow on a phone or with EXPO_PUBLIC_DEV_BYPASS_AUTH=1. -->

## Screenshots

<!-- For UI changes: light and dark mode. -->

## Checklist

- [ ] `npm run typecheck`, `npx expo lint` and `npm test` pass
- [ ] New logic in `src/lib/` has tests; new SQL / RLS behaviour has a test in `supabase/tests/`
- [ ] Split or balance changes keep `splits_parity.test.ts` passing
- [ ] Schema changes are a **new** migration (applied migrations are never edited), deployed before the app code
- [ ] Works in light and dark mode; colours from `useTheme()`; touch targets ≥ 44 × 44
- [ ] New text in `es.ts`, `en.ts` and `de.ts`; Spanish copy is neutral and no-blame
- [ ] New env variables added to `.env.example` and the README
- [ ] PLAN.md acceptance checks ticked if this completes one
