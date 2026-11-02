import { describe, expect, it } from 'vitest';
import { expenseDraftSchema, mapCategory, readDraft } from '../expenseDraft';

describe('expenseDraftSchema', () => {
  it('accepts an empty draft and a full one', () => {
    expect(readDraft({})).toEqual({});
    const full = { amountMinor: 2480, description: 'Panadería La Espiga', category: 'comida', spentOn: '2026-11-01', paidBy: 'user_1', splitMode: 'pct', splitPct: 60 };
    expect(readDraft(full)).toEqual(full);
  });

  it('refuses amounts that are not whole, positive minor units', () => {
    for (const amountMinor of [24.8, 0, -100, '2480']) expect(readDraft({ amountMinor })).toBeUndefined();
  });

  it('refuses unknown categories, split modes, timestamps and out-of-range percentages', () => {
    expect(readDraft({ category: 'food' })).toBeUndefined();
    expect(readDraft({ splitMode: 'thirds' })).toBeUndefined();
    expect(readDraft({ spentOn: '2026-11-01T10:00:00Z' })).toBeUndefined();
    expect(readDraft({ splitMode: 'pct', splitPct: 100 })).toBeUndefined();
    expect(readDraft({ splitMode: 'pct', splitPct: 0 })).toBeUndefined();
  });

  it('needs a percentage for a pct split', () => {
    expect(expenseDraftSchema.safeParse({ splitMode: 'pct' }).success).toBe(false);
    expect(expenseDraftSchema.safeParse({ splitMode: 'pct', splitPct: null }).success).toBe(false);
    expect(expenseDraftSchema.safeParse({ splitMode: 'half', splitPct: null }).success).toBe(true);
  });

  it('refuses a description longer than the form allows', () => {
    expect(readDraft({ description: 'x'.repeat(81) })).toBeUndefined();
  });

  it('is undefined for anything that is not an object', () => {
    for (const raw of [null, undefined, 'draft', 42]) expect(readDraft(raw)).toBeUndefined();
  });
});

describe('mapCategory', () => {
  it('keeps the 9 ids, whatever the case or accents', () => {
    for (const id of ['super', 'comida', 'casa', 'servicios', 'transporte', 'ocio', 'viajes', 'regalos', 'otros']) {
      expect(mapCategory(id)).toBe(id);
      expect(mapCategory(id.toUpperCase())).toBe(id);
    }
    expect(mapCategory('Súper')).toBe('super');
  });

  it('maps labels in es / en / de', () => {
    expect(mapCategory('Comida fuera')).toBe('comida');
    expect(mapCategory('Salidas')).toBe('ocio');
    expect(mapCategory('Groceries', 'en')).toBe('super');
    expect(mapCategory('Eating out', 'en')).toBe('comida');
    expect(mapCategory('Utilities', 'en')).toBe('servicios');
    expect(mapCategory('Lebensmittel', 'de')).toBe('super');
    expect(mapCategory('Freizeit', 'de')).toBe('ocio');
    expect(mapCategory('Geschenke', 'de')).toBe('regalos');
  });

  it("guesses from a shop's name or free text with the parser's keywords", () => {
    expect(mapCategory('Panadería La Espiga')).toBe('comida');
    expect(mapCategory('REWE Markt GmbH', 'de')).toBe('super');
    expect(mapCategory('Uber trip', 'en')).toBe('transporte');
    expect(mapCategory('Netflix')).toBe('servicios');
  });

  it('falls back to otros, or to the fallback given', () => {
    expect(mapCategory('Ferretería Pérez')).toBe('otros');
    expect(mapCategory('', 'es', 'comida')).toBe('comida');
    expect(mapCategory(null)).toBe('otros');
    expect(mapCategory('zzz', 'en', 'casa')).toBe('casa');
  });
});
