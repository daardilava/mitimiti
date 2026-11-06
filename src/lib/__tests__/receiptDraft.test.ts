import { describe, expect, it } from 'vitest';
import { readReceiptResponseSchema, RECEIPT_CATEGORY_IDS, type ReceiptAi } from '../../../supabase/functions/_shared/receipt';
import { CATEGORY_IDS } from '../expenseDraft';
import { canUseTotal, draftFromReading, readingFromAi } from '../receiptDraft';

const espiga: ReceiptAi = {
  merchant: 'Panadería La Espiga',
  date: '2026-11-01',
  currency: 'EUR',
  items: [
    { name: 'Café con leche', qty: 2, total_text: '6,40' },
    { name: 'Croissant', qty: 1, total_text: '2,90' },
    { name: 'Bocadillo', qty: 1, total_text: '13,00' },
    { name: 'Zumo de naranja', qty: 1, total_text: '2,50' },
  ],
  total_text: '24,80',
  category_hint: 'comida',
};
const ctx = { currency: 'EUR' as const, today: '2026-11-02', language: 'es' as const };

describe('readingFromAi', () => {
  it('reads the sample receipt into minor units', () => {
    const r = readingFromAi(espiga, ctx);
    expect(r).toMatchObject({ merchant: 'Panadería La Espiga', date: '2026-11-01', category: 'comida', currency: 'EUR', foreignCurrency: null, totalMinor: 2480, itemsMatchTotal: true });
    expect(r.items.map((i) => i.totalMinor)).toEqual([640, 290, 1300, 250]);
    expect(canUseTotal(r)).toBe(true);
  });

  it('trusts the total when the lines do not add up, and says so', () => {
    const r = readingFromAi({ ...espiga, total_text: '25,80' }, ctx);
    expect(r.totalMinor).toBe(2580);
    expect(r.itemsMatchTotal).toBe(false);
    expect(canUseTotal(r)).toBe(true);
  });

  it('flags another currency and never uses its total as the amount', () => {
    const r = readingFromAi({ ...espiga, currency: 'USD', total_text: '24.80' }, ctx);
    expect(r.foreignCurrency).toBe('USD');
    expect(r.totalMinor).toBe(2480);
    expect(canUseTotal(r)).toBe(false);
    expect(draftFromReading(r, ctx.today, { paidBy: 'me', splitMode: 'half', splitPct: null }).amountMinor).toBeUndefined();
  });

  it('flags a currency the app does not use', () => {
    const r = readingFromAi({ ...espiga, currency: 'gbp' }, ctx);
    expect(r.foreignCurrency).toBe('GBP');
    expect(canUseTotal(r)).toBe(false);
  });

  it('reads COP totals with thousands dots', () => {
    const r = readingFromAi({ ...espiga, currency: 'COP', items: [], total_text: '184.000' }, { ...ctx, currency: 'COP' });
    expect(r.totalMinor).toBe(184000);
    expect(r.itemsMatchTotal).toBe(true);
  });

  it('leaves an unreadable or ambiguous total out', () => {
    expect(readingFromAi({ ...espiga, total_text: null }, ctx).totalMinor).toBeNull();
    expect(readingFromAi({ ...espiga, currency: 'COP', items: [], total_text: '4,50' }, { ...ctx, currency: 'COP' }).totalMinor).toBeNull();
  });

  it('drops a date in the future or not in YYYY-MM-DD', () => {
    expect(readingFromAi({ ...espiga, date: '2026-12-24' }, ctx).date).toBeNull();
    expect(readingFromAi({ ...espiga, date: '01.11.2026' }, ctx).date).toBeNull();
  });

  it('assumes the couple currency when the receipt shows none', () => {
    const r = readingFromAi({ ...espiga, currency: null }, ctx);
    expect(r).toMatchObject({ currency: 'EUR', foreignCurrency: null, totalMinor: 2480 });
  });

  it("guesses the category from the shop when the hint is otros", () => {
    expect(readingFromAi({ ...espiga, merchant: 'Lidl', category_hint: 'otros' }, ctx).category).toBe('super');
  });
});

describe('draftFromReading', () => {
  it('uses the shop as description, the total, the receipt date and the chosen split', () => {
    const d = draftFromReading(readingFromAi(espiga, ctx), ctx.today, { paidBy: 'diego', splitMode: 'pct', splitPct: 60 });
    expect(d).toEqual({ amountMinor: 2480, description: 'Panadería La Espiga', category: 'comida', spentOn: '2026-11-01', paidBy: 'diego', splitMode: 'pct', splitPct: 60 });
  });

  it('falls back to today without a date', () => {
    expect(draftFromReading(readingFromAi({ ...espiga, date: null }, ctx), ctx.today, {}).spentOn).toBe('2026-11-02');
  });
});

describe('read-receipt response', () => {
  it('uses the same 9 category ids as the app', () => {
    expect([...RECEIPT_CATEGORY_IDS]).toEqual([...CATEGORY_IDS]);
  });

  it('accepts a reading and the known errors, and refuses amounts as numbers', () => {
    expect(readReceiptResponseSchema.safeParse({ ok: true, receipt: espiga, remaining: 29 }).success).toBe(true);
    expect(readReceiptResponseSchema.safeParse({ ok: false, error: 'limit' }).success).toBe(true);
    expect(readReceiptResponseSchema.safeParse({ ok: true, receipt: { ...espiga, total_text: 24.8 }, remaining: 1 }).success).toBe(false);
    expect(readReceiptResponseSchema.safeParse({ ok: true, receipt: { ...espiga, category_hint: 'bakery' }, remaining: 1 }).success).toBe(false);
  });
});
