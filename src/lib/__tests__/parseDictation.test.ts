import { describe, expect, it } from 'vitest';
import { amountSpan, parseDictation } from '../parseDictation';
import type { QuickEntryContext } from '../quickEntry';

const ctx = (over: Partial<QuickEntryContext> = {}): QuickEntryContext => ({
  currency: 'EUR',
  me: { id: 'diego', name: 'Diego' },
  partner: { id: 'melanie', name: 'Melanie' },
  partnerJoined: true,
  defaultSplit: 'half',
  myDefaultPct: 50,
  today: '2026-11-02',
  language: 'es',
  ...over,
});

describe('parseDictation · es', () => {
  it('reads the mockup sentence: amount, category, me as payer, the default split', () => {
    const r = parseDictation('Almuerzo con Melanie, 25 euros', ctx());
    expect(r.draft).toMatchObject({ amountMinor: 2500, category: 'comida', paidBy: 'diego', splitMode: 'half', spentOn: '2026-11-02' });
    expect(r.draft.description).toMatch(/^Almuerzo/);
    expect(r.heard).toMatchObject({ amountMinor: 2500, category: 'comida', payer: 'me', split: 'default' });
    expect(r.foreignCurrency).toBeUndefined();
  });

  it('reads decimals with a comma or a point', () => {
    expect(parseDictation('café 25,50', ctx()).draft.amountMinor).toBe(2550);
    expect(parseDictation('café 25.50 euros', ctx()).draft.amountMinor).toBe(2550);
    expect(parseDictation('mercado 184.000 pesos', ctx({ currency: 'COP' })).draft.amountMinor).toBe(184000);
  });

  it('reads who paid', () => {
    expect(parseDictation('mercado 40 euros pagué yo', ctx()).draft.paidBy).toBe('diego');
    const r = parseDictation('mercado 40 euros pagó Melanie', ctx());
    expect(r.draft.paidBy).toBe('melanie');
    expect(r.heard.payer).toBe('partner');
  });

  it('reads the split: mitad, a medias, todo para, personal, 60/40', () => {
    expect(parseDictation('cena 30 euros a medias', ctx({ defaultSplit: 'pct', myDefaultPct: 70 })).draft).toMatchObject({ splitMode: 'half', splitPct: null });
    expect(parseDictation('cena 30 euros mitad y mitad', ctx({ defaultSplit: 'pct', myDefaultPct: 70 })).draft.splitMode).toBe('half');
    expect(parseDictation('flores 20 euros todo para Melanie', ctx()).draft.splitMode).toBe('other');
    expect(parseDictation('camisa 35 euros personal', ctx()).draft.splitMode).toBe('personal');
    expect(parseDictation('arriendo 900 euros 60/40', ctx()).draft).toMatchObject({ splitMode: 'pct', splitPct: 60 });
  });

  it("uses the couple's default split when none is said", () => {
    const r = parseDictation('súper 50 euros', ctx({ defaultSplit: 'pct', myDefaultPct: 60 }));
    expect(r.draft).toMatchObject({ splitMode: 'pct', splitPct: 60 });
    expect(r.heard.split).toBe('default');
  });

  it('flags another currency and never converts it', () => {
    const r = parseDictation('taxi 20 dólares', ctx());
    expect(r.foreignCurrency).toBe('USD');
    expect(r.draft.amountMinor).toBeUndefined();
    expect(r.heard.amountMinor).toBeNull();
  });

  it('leaves the amount out when none was said, and nothing is a category guess', () => {
    const r = parseDictation('pagué yo', ctx());
    expect(r.draft.amountMinor).toBeUndefined();
    expect(r.heard.category).toBeNull();
    expect(r.amountSpan).toBeNull();
  });
});

describe('parseDictation · en', () => {
  it('reads amount, payer and split', () => {
    const r = parseDictation('groceries 42.80 paid by Melanie split evenly', ctx({ language: 'en', currency: 'USD' }));
    expect(r.draft).toMatchObject({ amountMinor: 4280, category: 'super', paidBy: 'melanie', splitMode: 'half' });
  });

  it('reads dollars as the couple currency and euros as foreign', () => {
    expect(parseDictation('lunch 25 dollars', ctx({ language: 'en', currency: 'USD' })).draft.amountMinor).toBe(2500);
    expect(parseDictation('lunch 25 euros', ctx({ language: 'en', currency: 'USD' })).foreignCurrency).toBe('EUR');
  });
});

describe('parseDictation · de', () => {
  it('reads "hat bezahlt" and Euro', () => {
    const r = parseDictation('Abendessen 30 Euro Melanie hat bezahlt', ctx({ language: 'de' }));
    expect(r.draft).toMatchObject({ amountMinor: 3000, category: 'comida', paidBy: 'melanie' });
  });

  it('reads "ich habe bezahlt" and halbe-halbe', () => {
    const r = parseDictation('Supermarkt 25,50 Euro ich habe bezahlt halbe-halbe', ctx({ language: 'de', defaultSplit: 'pct', myDefaultPct: 70 }));
    expect(r.draft).toMatchObject({ amountMinor: 2550, category: 'super', paidBy: 'diego', splitMode: 'half' });
  });
});

describe('amountSpan', () => {
  it('finds the amount with its currency word, for the highlight', () => {
    const text = 'Almuerzo con Melanie, 25 euros';
    const span = amountSpan(text)!;
    expect(text.slice(...span)).toBe('25 euros');
    const t2 = 'café 4,50 € pagó Ana';
    expect(t2.slice(...amountSpan(t2)!)).toBe('4,50 €');
  });
});
