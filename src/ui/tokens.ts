// Design tokens from the "Sistema de diseño" board on the canvas, in a light and a dark palette with the same names.
// Screens read colours through useTheme() (src/ui/theme.tsx), never from here directly; no raw hex in components.
// The dark palette is derived from the UI kit's hues; src/ui/__tests__/tokens.test.ts checks every text and mark
// pair in both palettes against WCAG (4.5:1 text, 3:1 large text and graphics).

const light = {
  /** Text and the primary action (buttons, selected chips). */
  ink: '#16181D',
  /** Text and icons on `ink` fills. */
  onPrimary: '#FFFFFF',
  background: '#F2F4F3',
  surface: '#FFFFFF',
  line: '#E3E6E8',
  fieldBorder: '#D5D9DD',
  textSecondary: '#5B606B',
  tabInactive: '#6B7079',
  disabled: '#9AA0A8',
  me: '#1F4FB8',
  meTint: '#DCE5FA',
  partner: '#E8873A',
  partnerTint: '#FBE1CC',
  partnerText: '#8A3A0C',
  /** Payments and "settled": fills (button, check, bars); `positiveText` for text. */
  positive: '#0F7B6C',
  onPositive: '#FFFFFF',
  positiveText: '#0B6E60',
  positiveTint: '#DDF1EC',
  warning: '#B7791F',
  warningText: '#8A5A00',
  /** "Debes", errors, over budget: text and bars. */
  negative: '#B4232C',
  negativeTint: '#FBE4E5',
  /** The delete button's fill, and its text. */
  danger: '#B4232C',
  onDanger: '#FFFFFF',
  info: '#1A3F94',
  infoTint: '#E3E9F8',
  neutralTint: '#E8EAED',
  /** The near-black cards that stay dark in both modes: balance, Presupuestos' month, Welcome. */
  hero: '#16181D',
  onHero: '#FFFFFF',
  /** Borders on hero surfaces (the outline button on Welcome). */
  heroLine: '#4A4E57',
  /** Text on hero cards: secondary, then tertiary. */
  onInk: '#C9CDD3',
  onInkMuted: '#AEB3BB',
  /** Bars on hero cards: track, and the three states. Validated with the dataviz script on #16181D (lightness band,
   * ≥ 3:1); red↔amber is 7.4 for deutan, so the status text always rides along. */
  inkTrack: '#3A3E47',
  positiveOnInk: '#2F9E86',
  warningOnInk: '#B8861A',
  negativeOnInk: '#E5486A',
  /** Welcome logo's blue circle, lighter than `me` so the overlap reads on ink. */
  logoBlue: '#4A78E0',
  /** Behind sheets and dialogs. */
  scrim: '#000000',
};

export type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  ink: '#ECEEF1',
  onPrimary: '#16181D',
  background: '#0F1114',
  surface: '#1A1D22',
  line: '#2B2F36',
  fieldBorder: '#3A3F47',
  textSecondary: '#A3A9B3',
  tabInactive: '#8C929C',
  disabled: '#5F656E',
  me: '#86A8F5',
  meTint: '#22304F',
  partner: '#F0A063',
  partnerTint: '#41301F',
  partnerText: '#F7C08F',
  positive: '#13806F',
  onPositive: '#FFFFFF',
  positiveText: '#4CC9AF',
  positiveTint: '#173A33',
  warning: '#C9922C',
  warningText: '#E9B95C',
  negative: '#F07A82',
  negativeTint: '#3D2124',
  danger: '#C2303A',
  onDanger: '#FFFFFF',
  info: '#9DB7F5',
  infoTint: '#1D2945',
  neutralTint: '#262A31',
  // A step above the dark background, so the hero cards still read as cards.
  hero: '#22262E',
  onHero: '#FFFFFF',
  heroLine: '#4A4F59',
  onInk: '#C9CDD3',
  onInkMuted: '#A9AEB6',
  inkTrack: '#3E434C',
  positiveOnInk: '#2F9E86',
  warningOnInk: '#B8861A',
  negativeOnInk: '#E5486A',
  logoBlue: '#4A78E0',
  scrim: '#000000',
};

export type Scheme = 'light' | 'dark';

export const palettes: Record<Scheme, Palette> = { light, dark };

export type CategoryId = 'super' | 'comida' | 'casa' | 'servicios' | 'transporte' | 'ocio' | 'viajes' | 'regalos' | 'otros';

/** Names and icons; the colours per scheme are in `categoryColors` (and merged by useTheme()). */
export const categoryInfo: Record<CategoryId, { name: string; icon: string }> = {
  super: { name: 'Súper', icon: 'cart' },
  comida: { name: 'Comida fuera', icon: 'food' },
  casa: { name: 'Casa', icon: 'home' },
  servicios: { name: 'Servicios', icon: 'bolt' },
  transporte: { name: 'Transporte', icon: 'car' },
  ocio: { name: 'Salidas', icon: 'ticket' },
  viajes: { name: 'Viajes', icon: 'plane' },
  regalos: { name: 'Regalos', icon: 'gift' },
  otros: { name: 'Otros', icon: 'dots' },
};

/** `color` draws the icon and bars; `tint` is the icon's tile. Dark: lighter hues on deep tints. */
export const categoryColors: Record<Scheme, Record<CategoryId, { color: string; tint: string }>> = {
  light: {
    super: { color: '#2E7D5B', tint: '#E1F1E8' },
    comida: { color: '#B4501F', tint: '#FBE6DA' },
    casa: { color: '#3E4BA0', tint: '#E3E6F7' },
    servicios: { color: '#8A6100', tint: '#F7EDCF' },
    transporte: { color: '#22668A', tint: '#DDEDF5' },
    ocio: { color: '#83347F', tint: '#F3E1F2' },
    viajes: { color: '#17706F', tint: '#DAF0EF' },
    regalos: { color: '#A8304F', tint: '#F8E0E6' },
    otros: { color: '#4D525C', tint: '#E8EAED' },
  },
  dark: {
    super: { color: '#5CBF8E', tint: '#173327' },
    comida: { color: '#EF8A57', tint: '#3B2419' },
    casa: { color: '#97A3F2', tint: '#232846' },
    servicios: { color: '#D9A92E', tint: '#36301A' },
    transporte: { color: '#5FB0DA', tint: '#162E3B' },
    ocio: { color: '#D584D0', tint: '#35203A' },
    viajes: { color: '#4DBDB9', tint: '#14322F' },
    regalos: { color: '#EE7F9B', tint: '#3A1E27' },
    otros: { color: '#A3A9B3', tint: '#2A2E35' },
  },
};

export type Categories = Record<CategoryId, { name: string; icon: string; color: string; tint: string }>;

/** Light category names, icons and colours, for pure code (src/lib) that only needs the names. */
export const categories: Categories = Object.fromEntries(
  (Object.keys(categoryInfo) as CategoryId[]).map((id) => [id, { ...categoryInfo[id], ...categoryColors.light[id] }]),
) as Categories;

/**
 * The avatar characters (src/ui/AvatarArt.tsx). `fur` is the head, `accent` ears / markings, `light` muzzle, belly
 * or face, `detail` a nose, beak or snout. They stay the same in both modes; only the tile behind them changes.
 * Decorative: every avatar sits next to the person's name, so none of these carries meaning on its own.
 */
export const avatarArt = {
  /** Pupils, noses, mouths and whiskers. */
  ink: '#23252B',
  /** Eye whites and highlights. */
  white: '#FFFFFF',
  cheek: '#FF8FA3',
  tongue: '#F4677F',
  characters: {
    fox: { fur: '#F2853A', accent: '#3B2A22', light: '#FFF4E8', detail: '#23252B' },
    cat: { fur: '#9AA3B5', accent: '#6E7891', light: '#EEF1F6', detail: '#F49AAE' },
    bear: { fur: '#A86B3F', accent: '#7E4C2A', light: '#E7BE93', detail: '#3B2A22' },
    panda: { fur: '#F7F7F5', accent: '#2C2D33', light: '#FFFFFF', detail: '#2C2D33' },
    owl: { fur: '#8466DA', accent: '#5F44B3', light: '#D5C8FA', detail: '#F5A631' },
    frog: { fur: '#5BC466', accent: '#3F9E4A', light: '#D3F2B6', detail: '#2E7A38' },
    bunny: { fur: '#F1E9EE', accent: '#D9C9D3', light: '#FFFFFF', detail: '#F49AAE' },
    penguin: { fur: '#33425F', accent: '#24304A', light: '#FFFFFF', detail: '#F5A631' },
    pig: { fur: '#F7AFC0', accent: '#EA8BA3', light: '#FCD3DD', detail: '#C9607C' },
    tiger: { fur: '#F7A533', accent: '#2C2D33', light: '#FFF6E6', detail: '#2C2D33' },
    dog: { fur: '#DDAA70', accent: '#8C5A33', light: '#F6E3C8', detail: '#23252B' },
    mouse: { fur: '#A4AABA', accent: '#F7B3C2', light: '#E6E9EF', detail: '#F28AA2' },
  },
} as const;

/** The tile behind each character: soft in light mode, deep in dark mode, so the head stands out in both. */
export const avatarTiles: Record<Scheme, Record<keyof typeof avatarArt.characters, string>> = {
  light: {
    fox: '#CFE6F7',
    cat: '#FBE3C4',
    bear: '#D7EDC9',
    panda: '#9ED3AE',
    owl: '#FCE2A6',
    frog: '#C9DBF8',
    bunny: '#C7B4F0',
    penguin: '#BFE7F2',
    pig: '#D5EFC6',
    tiger: '#CFE0F5',
    dog: '#CDE6F2',
    mouse: '#F9D9A8',
  },
  dark: {
    fox: '#183447',
    cat: '#3D2E1A',
    bear: '#1F3A1C',
    panda: '#1C3D2A',
    owl: '#3B3017',
    frog: '#1C2B47',
    bunny: '#2E2450',
    penguin: '#2F6A80',
    pig: '#22381C',
    tiger: '#1A2B45',
    dog: '#173544',
    mouse: '#3D2D18',
  },
};

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;

export const radius = { tile: 12, control: 14, option: 16, card: 20, sheet: 24, pill: 28 } as const;

export const font = {
  display: 'BricolageGrotesque_700Bold',
  body: 'DMSans_400Regular',
  bodySemi: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
} as const;

/**
 * Text styles. Each carries the palette's ink as its colour: React Native has no inherited text colour, so a Text
 * without one would be black, which disappears in dark mode. A colour set after it still wins.
 */
export function textStyles(c: Palette) {
  return {
    balance: { fontFamily: font.display, fontSize: 52, letterSpacing: -1.5, color: c.ink },
    hero: { fontFamily: font.display, fontSize: 44, letterSpacing: -1.1, color: c.ink },
    screenTitle: { fontFamily: font.display, fontSize: 32, letterSpacing: -0.6, color: c.ink },
    heading: { fontFamily: font.display, fontSize: 20, color: c.ink },
    bar: { fontFamily: font.bodyBold, fontSize: 17, color: c.ink },
    row: { fontFamily: font.bodySemi, fontSize: 16, color: c.ink },
    body: { fontFamily: font.body, fontSize: 16, lineHeight: 24, color: c.ink },
    label: { fontFamily: font.bodySemi, fontSize: 13, color: c.ink },
    effect: { fontFamily: font.bodyBold, fontSize: 12, color: c.ink },
    // Slightly tight so "Movimientos" fits a fifth of a 390 px phone without an ellipsis.
    tab: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: -0.2 },
  } as const;
}

export type TextStyles = ReturnType<typeof textStyles>;

/**
 * For inputs that draw their own border or underline: on web, Chrome's focus ring uses `outline-style: auto`, which
 * ignores `outline-width`, so it has to be turned off by style. React Native's types don't list 'none'; native ignores it.
 */
export const noFocusRing = { outlineStyle: 'none' } as unknown as { outlineWidth: number };

/** Minimum touch target in px. */
export const touch = 44;
