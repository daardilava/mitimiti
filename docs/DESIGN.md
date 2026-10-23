# MitiMiti — Screens and design system

External source of truth: *a medias — UI design* (13 screens + design system "UI kit v1"; the design file keeps the
app's former name), with the MitiMiti brand on top (board *Color, tipografía y voz*).

## Screens

The design's 13 numbered screens, plus the auth, legal, export, account and paywall screens added since: 4 tabs, the
rest reached from them. Home is the hub; every screen is at most two taps away.

| # | Screen (UI title) | Route | Reached from | Main actions |
| --- | --- | --- | --- | --- |
| 1 | Welcome — MitiMiti, "Gastos compartidos, cuentas claras y cero discusiones." | `(onboarding)/welcome` | Launch, sign-out | Crear cuenta · Tengo una invitación de mi pareja · Iniciar sesión (link) |
| — | Crea tu cuenta (Clerk) | `(onboarding)/sign-up` | Welcome (either button), an invite link | Name, email, password, terms and privacy → code by email · Google · Apple |
| — | Iniciar sesión — "Hola de nuevo" (Clerk) | `(onboarding)/sign-in` | Welcome "Iniciar sesión", Crea tu cuenta "¿Ya tienes cuenta?" | Email, password, ¿Olvidaste tu contraseña? · Google · Apple; code by email on a new device |
| — | ¿Olvidaste tu contraseña? | `(onboarding)/forgot-password` | Iniciar sesión | Code by email + new password → Guardar y entrar |
| — | Términos y condiciones | `terms` (outside the guards) | Crea tu cuenta, Ajustes › Información legal, Paywall | Read; Escribirnos (email) |
| — | Política de privacidad | `privacy` (outside the guards) | Crea tu cuenta, Ajustes › Información legal, Paywall | Read; Escribirnos (email) |
| 2 | Create account — "Armemos su cuenta" (Paso 1 de 2) | `(onboarding)/setup` | Crear cuenta, after sign-up | Names, currency, usual split → Continuar · Tengo una invitación de mi pareja · Borrar cuenta |
| 3 | Invite partner — "Invita a Ana" (Paso 2 de 2) | `invite` | Setup, Ajustes › Código de pareja | Copiar · Enviar por WhatsApp · Otras apps · Ir a la app; Generar un código nuevo when expired (7 days) |
| 4 | Join with code — "Únete a tu pareja" | `(onboarding)/join` | Tengo una invitación de mi pareja, Setup, an invite link (`mitimiti://join?code=AM482X`, code filled in) | 6-char code, validated as typed → Unirme |
| 5 | Home (Inicio) | `(tabs)/index` | After onboarding | Saldar cuentas, Presupuesto del mes card, Ver todos, open expense, + |
| 6 | New / edit expense — "Nuevo gasto" / "Editar gasto" | `expense/new`, `expense/[id]/edit` (modal) | + button, Editar gasto | Agregar gasto / Guardar cambios (footer previews the new balance) |
| 7 | Expense detail — "Detalle del gasto" | `expense/[id]` | Any expense row | Editar gasto, Eliminar gasto (confirmation) |
| 8 | Activity (Movimientos) | `(tabs)/activity` | Tab, "Ver todos" | Día / Semana / Mes, chart, search, filters, calendar, open expense, + |
| 9 | Settle up (Saldar cuentas) | `settle/index` | Home balance card | Todo / La mitad / custom (never more than owed), ¿Cómo se pagó? → Registrar pago |
| 10 | Payment recorded (Pago registrado) | `settle/done` | Settle up | Volver al inicio · Ver movimientos |
| 11 | Summary (Resumen) | `(tabs)/summary` | Tab | Month switcher, Ver presupuestos |
| 12 | Budgets (Presupuestos) | `budgets` | Home, Resumen (Premium) | − / + in steps of $50.000 (10 € / US$10) |
| 13 | Settings (Ajustes) | `(tabs)/settings` | Tab | In order: Tu avatar (12 characters or the initial, `src/ui/AvatarArt.tsx`); Ustedes (names, Código de pareja); Tu plan; División predeterminada; Moneda; Apariencia; Idioma; Recordatorios y avisos (Pronto); Exportar movimientos; Información legal; Cuenta (Cerrar sesión, Borrar cuenta) |
| — | Exportar movimientos | `export` | Ajustes › Exportar movimientos (Premium) | Periodo (5 presets) · Formato CSV / PDF → Exportar (share sheet) |
| — | Borrar tu cuenta | `delete-account` (outside the guards) | Ajustes › Cuenta, Setup | What is deleted (partner too), the subscription note → tick → Borrar cuenta (red); code by email if the sign-in is older than 10 min |
| — | Premium para los dos (paywall) | `paywall` (modal, `?from=history\|budgets\|export`) | Ajustes › Tu plan › Ver Premium, every Premium lock | Benefits, Anual / Mensual → Probar 7 días gratis / Suscribirme · Restaurar compras · Términos · Privacidad |

The `+` in the tab bar always opens a new expense. Every routed screen is built; `Todo` in
[src/ui/Screen.tsx](../src/ui/Screen.tsx) remains for marking a future placeholder with the feature section that builds it.

## Brand

Implemented in [src/ui/tokens.ts](../src/ui/tokens.ts) and [src/lib/miti.ts](../src/lib/miti.ts); sources in
[assets/brand](../assets/brand). Same meanings as the UI kit, brand look: Tinta for action, blue for you, Coral Miti
for your partner, green only for what is settled.

- **Name:** MitiMiti (formerly "a medias", taken on Google Play). App id `com.mitimiti.app`, link scheme
  `mitimiti://`. The EAS slug stays `a-medias`, tied to the EAS project id.
- **Logo:** Miti, the two-colour mascot (markup in `src/lib/miti.ts`, drawn by `Miti` in
  [src/ui/Miti.tsx](../src/ui/Miti.tsx) and in the PDF), and the `Wordmark` "MitiMiti" in Fredoka 600: "Miti" in
  green, "Miti" in coral. Miti is decorative (hidden from screen readers); the wordmark carries the name.
- **Brand colours** (`MITI_COLORS` in `src/lib/miti.ts`): Verde Miti `#0E8C7A`, Coral Miti `#FF7A59`, Tinta
  `#1A2238`. On dark surfaces the wordmark uses `wordmarkGreen` `#3DC4A6` (Verde Miti lifted to read on Tinta) and
  `wordmarkCoral` `#FF7A59`; on white (the PDF) Verde Miti and Coral texto `#E4572E` (`WORDMARK_ON_LIGHT`).
- **App icon:** Miti on Tinta (`assets/icon.png`); Android adaptive icon with Tinta background and a monochrome layer
  for themed icons; Google Play icon `assets/store/play-icon-512.png`; favicon for web (development only). All
  rendered from the SVGs by `python scripts/brand-assets.py` (needs Pillow and Google Chrome).
- **Splash:** Miti (`assets/splash-icon.png`) on Niebla `#F3F5F4` in light mode and Tinta `#1A2238` in dark,
  configured in `app.json` › `expo-splash-screen`. It stays up until fonts and the session are ready, then fades
  (`src/app/_layout.tsx`). Expo Go shows the app icon instead; check it in a development or release build.
- **Welcome** is the brand screen: Tinta (`brandInk`) in both modes with a light status bar, Miti (176) and the
  wordmark (44) centred, the slogan in `onBrandInk`, the coral `kind="brand"` button for Crear cuenta (Tinta text),
  an outline button for Tengo una invitación de mi pareja, and Iniciar sesión as an underlined link in
  `wordmarkGreen`.
- **PDF export:** Miti and the wordmark in the header and footer, the balance card in Tinta. Titles and figures use
  the rounded system face (SF Pro Rounded on iPhone), the closest to Fredoka a print engine has.
- **Voice:** "tú" for the person, "ustedes" for the couple; neutral, no blame (see `src/i18n/es.ts`).

## Design system (UI kit v1)

Red and green are never the only cue: always with text.

### Light and dark mode

- The app follows the phone (`userInterfaceStyle: "automatic"` in `app.json`; `expo-system-ui` makes Android honour
  it). **Ajustes › Apariencia** can fix it to Claro or Oscuro on that phone; the choice is stored on the device and
  passed to `Appearance.setColorScheme`, so keyboards and alerts match.
- `tokens.ts` has a light palette and a dark one with the **same token names**, plus dark category colours. The dark
  palette keeps the brand's hues: lighter blue / coral / green / red for text and marks on deep navy (background
  `#0E1220`, surface `#181E30`), deeper tints for tiles and notices.
- Tokens by job, so each mode can treat them differently: `ink` (text, primary buttons; light in dark mode) with
  `onPrimary` on it; `hero` (balance, Presupuestos' month; Tinta in light mode, `#1F2740` in dark so it still reads
  as a card) with `onHero` / `onInk` / `onInkMuted`; `positive` (fills) vs `positiveText`; `danger` (delete button)
  vs `negative` (text, bars); bars on hero cards `inkTrack` / `positiveOnInk` / `warningOnInk` / `negativeOnInk`;
  Welcome's `brandInk` / `brandCoral` / `onBrandCoral` / `brandLine` / `onBrandInk` (same in both modes); `scrim`.
- Button kinds (`NavButton` in [src/ui/Screen.tsx](../src/ui/Screen.tsx)): `primary` (Tinta), `secondary`,
  `outline` (on hero surfaces), `payment` (green, recording payments only), `inverse` (white with dark text on hero
  cards, both modes), `danger` (red, deleting only), `brand` (coral, Welcome only).
- [src/ui/__tests__/tokens.test.ts](../src/ui/__tests__/tokens.test.ts) checks every text and mark pair per mode
  against WCAG (4.5:1 text, 3:1 icons and bars), every category icon on its tile, and the wordmark and Welcome
  colours. Known exception from the UI kit: Coral Miti is 2.6:1 on white, so the partner's marks always come with a
  legend and amounts (text uses `partnerText`).
- Screens read colours with `useTheme()` and build styles with `makeStyles()` ([src/ui/theme.tsx](../src/ui/theme.tsx)).

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| Ink (Tinta) | `#1A2238` | `#ECEEF1` | Text, primary button |
| Hero | `#1A2238` | `#1F2740` | Balance card, Presupuestos' month card |
| Background (Niebla) | `#F3F5F4` | `#0E1220` | App background |
| Surface | `#FFFFFF` | `#181E30` | Cards, sheets, fields |
| Line | `#E3E6E8` | `#283049` | Card borders, dividers |
| Text secondary | `#5A6275` | `#A3A9B3` | Labels, metadata |
| Disabled | `#9AA0A8` | `#5F656E` | Off radios / switches; inactive tab `#6B7079` / `#8C929C` |
| You / bg | `#1F4FB8` / `#DCE5FA` | `#86A8F5` / `#22304F` | What you pay or owe; your avatar's initial (until a character is picked) |
| Partner (Coral Miti) / bg | `#FF7A59` / `#FFE3DA` (text `#9E3418`) | `#FF8C6E` / `#45261F` (text `#FFB8A6`) | What your partner pays or owes; their avatar's initial |
| Positive | `#0F7B6C` (text `#0B6E60`) | `#13806F` (text `#4CC9AF`) | "Te deben", payments, settled, budget OK |
| Warning | `#B7791F` (text `#8A5A00`) | `#C9922C` (text `#E9B95C`) | Budget from 80 % |
| Negative / danger | `#B4232C` | `#F07A82` / `#C2303A` | "Debes", over budget, the delete button |

Categories (light): Súper `#2E7D5B` · Comida fuera `#B4501F` · Casa `#3E4BA0` · Servicios `#8A6100` ·
Transporte `#22668A` · Salidas `#83347F` · Viajes `#17706F` · Regalos `#A8304F` · Otros `#4D525C`. Dark mode uses
lighter hues on deep tiles (`categoryColors.dark`).

- **Type:** Fredoka 700 for figures and titles (balance 52, hero 44, screen title 32, heading 20); Fredoka 600 only
  for the wordmark; DM Sans for UI (top bar 17/700, row & button 16/600–700, body 16/400 at 1.5, label 13/600,
  balance effect 12/700, tab 11/700). Figures use tabular numbers.
- **Space & shape:** 4 px scale, 20 px side margins, every touch target ≥ 44 × 44. Radii: 12 category icon,
  14 button/field, 16 option/notice, 20 card, 24 balance card/sheet, 28 chip/FAB.
- **Components:** one primary button per screen. Green is reserved for recording payments; red for deleting.
  Budgets: green up to 79 %, amber from 80 %, red when over; text always says the state. Premium locks say
  **Premium** in text, never only with an icon ([src/ui/Premium.tsx](../src/ui/Premium.tsx)).
- **Icons:** 24 × 24 canvas, 1.8 px stroke, round caps.
