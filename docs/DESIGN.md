# a medias — Screens and design system

External source of truth: *a medias — UI design* (13 screens + design system "UI kit v1").

## Screens

13 screens: 4 onboarding, 4 tabs, 5 reached from them. Home is the hub; every screen is at most two taps away.

| # | Screen (UI title) | Route | Reached from | Main actions |
| --- | --- | --- | --- | --- |
| 1 | Welcome — "Cuentas claras entre los dos." | `(onboarding)/welcome` | Launch, sign-out | Crear nuestra cuenta · Tengo un código de invitación |
| — | Crea tu cuenta (Clerk) | `(onboarding)/sign-up` | Welcome (either button) | Name, email, password, terms → code by email · Google · Apple |
| — | Términos y condiciones | `terms` (outside the guards) | Crea tu cuenta, Ajustes › Información legal | Read; Escribirnos (email) |
| — | Iniciar sesión (Clerk) | `(onboarding)/sign-in` | Welcome "¿Ya tienes cuenta?" | Email, password, ¿Olvidaste tu contraseña? · Google · Apple |
| — | ¿Olvidaste tu contraseña? | `(onboarding)/forgot-password` | Iniciar sesión | Code by email + new password → signed in |
| 2 | Create account — "Armemos su cuenta" (Paso 1 de 2) | `(onboarding)/setup` | Sign-in | Names, currency, usual split → Continuar |
| 3 | Invite partner — "Invita a Ana" (Paso 2 de 2) | `invite` | Setup, Settings | Copiar · Compartir · Ir a la app |
| 4 | Join with code — "Únete a tu pareja" | `(onboarding)/join` | Sign-in | 6-char code, validated as typed → Unirme |
| 5 | Home (Inicio) | `(tabs)/index` | After onboarding | Saldar cuentas, Ver todos, open expense, + |
| 6 | New / edit expense | `expense/new`, `expense/[id]/edit` (modal) | + button, Edit | Agregar gasto (footer previews new balance) |
| 7 | Expense detail | `expense/[id]` | Any expense row | Editar, eliminar (confirmation) |
| 8 | Activity (Movimientos) | `(tabs)/activity` | Tab, "Ver todos" | Open expense, + |
| 9 | Settle up (Saldar cuentas) | `settle/index` | Home balance card | Todo / La mitad / custom (never more than owed), method → Registrar pago |
| 10 | Payment recorded | `settle/done` | Settle up | Volver al inicio · Ver movimientos |
| 11 | Summary (Resumen) | `(tabs)/summary` | Tab | See budgets |
| 12 | Budgets (Presupuestos) | `budgets` | Home, Summary | − / + in steps of $50.000 |
| 13 | Settings (Ajustes) | `(tabs)/settings` | Tab | Tu avatar (12 characters or the initial, `src/ui/AvatarArt.tsx`), names, couple code, default split, currency, reminders, Export CSV, Cerrar sesión |

The `+` in the tab bar always opens a new expense. Screens marked **Por construir** are routed placeholders;
each names the feature section that builds it.

## Design system (UI kit v1)

Implemented in [src/ui/tokens.ts](../src/ui/tokens.ts). Near-black ink for action, blue for you, orange for
your partner, green only for what is settled. Red and green are never the only cue: always with text.

### Light and dark mode

- The app follows the phone (`userInterfaceStyle: "automatic"` in `app.json`; `expo-system-ui` makes Android honour
  it). **Ajustes › Apariencia** can fix it to Claro or Oscuro on that phone; the choice is stored on the device and
  passed to `Appearance.setColorScheme`, so keyboards and alerts match.
- `tokens.ts` has a light palette (the UI kit below) and a dark one with the **same token names**, plus dark
  category colours. The UI kit only defines light; the dark palette keeps its hues: lighter blue / orange / green /
  red for text and marks on near-black, deeper tints for tiles and notices.
- Tokens by job, so each mode can treat them differently: `ink` (text, primary buttons; light in dark mode) with
  `onPrimary` on it; `hero` (balance, Presupuestos' month, Welcome; stays dark in both) with `onHero` / `onInk`;
  `positive` (fills) vs `positiveText`; `danger` (delete button) vs `negative` (text, bars); `scrim`.
- Buttons on hero cards use `kind="inverse"` (white with dark text in both modes).
- [src/ui/__tests__/tokens.test.ts](../src/ui/__tests__/tokens.test.ts) checks ~30 text and mark pairs per mode
  against WCAG (4.5:1 text, 3:1 icons and bars) and every category icon on its tile. Known exception from the UI
  kit: light orange is 2.6:1 on white, so the partner's marks always come with a legend and amounts.
- Screens read colours with `useTheme()` and build styles with `makeStyles()` ([src/ui/theme.tsx](../src/ui/theme.tsx)).

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#16181D` | Text, primary button (the balance card is `hero`, same hex in light mode) |
| Background | `#F2F4F3` | App background |
| Surface | `#FFFFFF` | Cards, sheets, fields |
| Line | `#E3E6E8` | Card borders, dividers |
| Text secondary | `#5B606B` | Labels, metadata |
| Disabled | `#9AA0A8` | Off radios / switches; inactive tab `#6B7079` |
| You / bg | `#1F4FB8` / `#DCE5FA` | What you pay or owe; your avatar's initial (until a character is picked) |
| Partner / bg | `#E8873A` / `#FBE1CC` (text `#8A3A0C`) | What your partner pays or owes; their avatar |
| Positive | `#0F7B6C` | "Te deben", payments, budget OK |
| Negative | `#B4232C` | "Debes", over budget, delete |

Categories: Súper `#2E7D5B` · Comida fuera `#B4501F` · Casa `#3E4BA0` · Servicios `#8A6100` ·
Transporte `#22668A` · Salidas `#83347F` · Viajes `#17706F` · Regalos `#A8304F` · Otros `#4D525C`.

- **Type:** Bricolage Grotesque 700 for figures and titles (balance 52, welcome 44, screen title 32, heading 20);
  DM Sans for UI (top bar 17/700, row & button 16/600–700, body 15–16/400 at 1.5, label 13/600,
  balance effect 12/700, tab 11/700). Figures use tabular numbers.
- **Space & shape:** 4 px scale, 20 px side margins, every touch target ≥ 44 × 44. Radii: 12 category icon,
  14 button/field, 16 option/notice, 20 card, 24 balance card/sheet, 28 chip/FAB.
- **Components:** one primary button per screen. Green is reserved for recording payments; red for deleting.
  Budgets: green up to 79 %, amber from 80 %, red when over; text always says the state.
- **Icons:** 24 × 24 canvas, 1.8 px stroke, round caps.
