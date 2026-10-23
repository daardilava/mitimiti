// Every text and mark pair the screens draw, in both palettes, against WCAG 2.x contrast:
// 4.5:1 for text, 3:1 for icons, bars and other graphics (1.4.11). Change a token → this says if it still reads.
import { describe, expect, it } from 'vitest';
import { avatarArt, avatarTiles, categoryColors, palettes, type CategoryId, type Palette, type Scheme } from '../tokens';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Pair = [fg: keyof Palette, bg: keyof Palette, min: number, where: string];

const TEXT = 4.5;
const GRAPHIC = 3;

const pairs: Pair[] = [
  ['ink', 'background', TEXT, 'titles and rows on the app background'],
  ['ink', 'surface', TEXT, 'text on cards and fields'],
  ['textSecondary', 'surface', TEXT, 'labels and metadata on cards'],
  ['textSecondary', 'background', TEXT, 'day headings, hints on the background'],
  ['textSecondary', 'neutralTint', TEXT, 'neutral notices'],
  ['tabInactive', 'surface', TEXT, 'inactive tab labels'],
  ['me', 'surface', TEXT, 'links ("Ver todos"), my avatar letter'],
  ['me', 'meTint', TEXT, 'my avatar'],
  ['partnerText', 'partnerTint', TEXT, "partner's avatar"],
  ['positiveText', 'surface', TEXT, '"Te deben", "Pago"'],
  ['positiveText', 'positiveTint', TEXT, 'balance effect notice'],
  ['warningText', 'surface', TEXT, '"Ojo: quedan"'],
  ['negative', 'surface', TEXT, '"Debes", errors'],
  ['negative', 'negativeTint', TEXT, '"le debes" notice'],
  ['negative', 'background', TEXT, 'errors under forms'],
  ['info', 'infoTint', TEXT, 'info notices'],
  ['onPrimary', 'ink', TEXT, 'primary buttons, selected chips'],
  ['onPositive', 'positive', TEXT, '"Registrar pago"'],
  ['onDanger', 'danger', TEXT, '"Eliminar gasto"'],
  ['onHero', 'hero', TEXT, 'balance, Welcome title'],
  ['hero', 'onHero', TEXT, 'white buttons on hero cards (Saldar cuentas, Crear nuestra cuenta)'],
  ['onInk', 'hero', TEXT, 'text on hero cards'],
  ['onInkMuted', 'hero', TEXT, '"Considera 9 gastos…" on the balance card'],
  ['wordmarkGreen', 'hero', TEXT, '"Miti" of the wordmark on Welcome'],
  ['wordmarkCoral', 'hero', TEXT, 'second "Miti" of the wordmark'],
  ['wordmarkGreen', 'brandInk', TEXT, 'Welcome: wordmark, "Iniciar sesión" link'],
  ['wordmarkCoral', 'brandInk', TEXT, 'Welcome: wordmark'],
  ['onBrandCoral', 'brandCoral', TEXT, 'Welcome: "Crear cuenta"'],
  ['onHero', 'brandInk', TEXT, 'Welcome: outline button label'],
  ['onBrandInk', 'brandInk', TEXT, 'Welcome: slogan'],
  ['brandLine', 'brandInk', 1.5, 'Welcome: outline button border (the label carries it)'],
  ['positive', 'surface', GRAPHIC, 'bars, check circle'],
  ['warning', 'surface', GRAPHIC, 'budget bars from 80 %'],
  ['negative', 'surface', GRAPHIC, 'over-budget bars'],
  ['me', 'surface', GRAPHIC, 'my part of the who-paid bars and chart'],
  ['positiveOnInk', 'hero', GRAPHIC, 'month budget bar'],
  ['warningOnInk', 'hero', GRAPHIC, 'month budget bar from 80 %'],
  ['negativeOnInk', 'hero', GRAPHIC, 'month budget bar over'],
];

for (const scheme of ['light', 'dark'] as Scheme[]) {
  describe(`${scheme} palette`, () => {
    const c = palettes[scheme];
    it.each(pairs)('%s on %s ≥ %s:1 (%s)', (fg, bg, min) => {
      expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(min);
    });

    it('category icons read on their tile and bars on a card (3:1)', () => {
      for (const id of Object.keys(categoryColors[scheme]) as CategoryId[]) {
        const { color, tint } = categoryColors[scheme][id];
        expect(contrast(color, tint), `${id} icon on its tile`).toBeGreaterThanOrEqual(GRAPHIC);
        expect(contrast(color, c.surface), `${id} bar on a card`).toBeGreaterThanOrEqual(GRAPHIC);
      }
    });

    it('avatar heads stand out from their tile (decorative, so a softer 1.4:1; the name always rides along)', () => {
      for (const [id, { fur }] of Object.entries(avatarArt.characters) as [keyof typeof avatarArt.characters, { fur: string }][]) {
        expect(contrast(fur, avatarTiles[scheme][id]), `${id} on its tile`).toBeGreaterThanOrEqual(1.4);
      }
    });

    it('hero cards stand apart from the background', () => {
      // In light mode they are near-black on near-white; in dark a lighter step than the background.
      expect(contrast(c.hero, c.background)).toBeGreaterThanOrEqual(scheme === 'light' ? 10 : 1.2);
    });
  });
}

describe('known exception, kept from the UI kit', () => {
  it("light partner coral is under 3:1 on white, so it never draws alone: legends and amounts carry it", () => {
    expect(contrast(palettes.light.partner, palettes.light.surface)).toBeLessThan(3);
    expect(contrast(palettes.dark.partner, palettes.dark.surface)).toBeGreaterThanOrEqual(GRAPHIC);
  });
});
