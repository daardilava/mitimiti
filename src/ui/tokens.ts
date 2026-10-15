// Design tokens from the "Sistema de diseño" board on the canvas.
// Screens use these; no raw hex values or font sizes in components.

export const color = {
  ink: '#16181D',
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
  positive: '#0F7B6C',
  positiveText: '#0B6E60',
  positiveTint: '#DDF1EC',
  warning: '#B7791F',
  warningText: '#8A5A00',
  negative: '#B4232C',
  negativeTint: '#FBE4E5',
  info: '#1A3F94',
  infoTint: '#E3E9F8',
  neutralTint: '#E8EAED',
} as const;

export type CategoryId = 'super' | 'comida' | 'casa' | 'servicios' | 'transporte' | 'ocio' | 'viajes' | 'regalos' | 'otros';

export const categories: Record<CategoryId, { name: string; icon: string; color: string; tint: string }> = {
  super: { name: 'Súper', icon: 'cart', color: '#2E7D5B', tint: '#E1F1E8' },
  comida: { name: 'Comida fuera', icon: 'food', color: '#B4501F', tint: '#FBE6DA' },
  casa: { name: 'Casa', icon: 'home', color: '#3E4BA0', tint: '#E3E6F7' },
  servicios: { name: 'Servicios', icon: 'bolt', color: '#8A6100', tint: '#F7EDCF' },
  transporte: { name: 'Transporte', icon: 'car', color: '#22668A', tint: '#DDEDF5' },
  ocio: { name: 'Salidas', icon: 'ticket', color: '#83347F', tint: '#F3E1F2' },
  viajes: { name: 'Viajes', icon: 'plane', color: '#17706F', tint: '#DAF0EF' },
  regalos: { name: 'Regalos', icon: 'gift', color: '#A8304F', tint: '#F8E0E6' },
  otros: { name: 'Otros', icon: 'dots', color: '#4D525C', tint: '#E8EAED' },
};

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;

export const radius = { tile: 12, control: 14, option: 16, card: 20, sheet: 24, pill: 28 } as const;

export const font = {
  display: 'BricolageGrotesque_700Bold',
  body: 'DMSans_400Regular',
  bodySemi: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
} as const;

export const type = {
  balance: { fontFamily: font.display, fontSize: 52, letterSpacing: -1.5 },
  hero: { fontFamily: font.display, fontSize: 44, letterSpacing: -1.1 },
  screenTitle: { fontFamily: font.display, fontSize: 32, letterSpacing: -0.6 },
  heading: { fontFamily: font.display, fontSize: 20 },
  bar: { fontFamily: font.bodyBold, fontSize: 17 },
  row: { fontFamily: font.bodySemi, fontSize: 16 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: font.bodySemi, fontSize: 13 },
  effect: { fontFamily: font.bodyBold, fontSize: 12 },
  tab: { fontFamily: font.bodyBold, fontSize: 11 },
} as const;

/** Minimum touch target in px. */
export const touch = 44;
