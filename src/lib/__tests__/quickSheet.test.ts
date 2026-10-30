import { describe, expect, it } from 'vitest';
import {
  aiDraftSchema,
  MAX_TEXT,
  parseRequestSchema,
  parseResponseSchema,
  SYSTEM_PROMPT,
  userPrompt,
  type AiDraft,
} from '../../../supabase/functions/_shared/quickEntry';
import { parseQuickEntry, type QuickEntryContext } from '../quickEntry';
import { canSaveQuick, draftFromAi, nextCategory, nextDate, nextPayer, nextSplit, recognitionLocale, withChoices } from '../quickSheet';

const ctx: QuickEntryContext = {
  currency: 'COP',
  me: { id: 'me', name: 'Diego' },
  partner: { id: 'partner', name: 'Ana' },
  partnerJoined: true,
  defaultSplit: 'half',
  myDefaultPct: 50,
  today: '2026-10-29',
  language: 'es',
};
const eu: QuickEntryContext = { ...ctx, currency: 'EUR', defaultSplit: 'pct', myDefaultPct: 60 };

const ai = (over: Partial<AiDraft> = {}): AiDraft => ({
  amountText: '45.000',
  currency: null,
  description: 'Cena',
  category: 'comida',
  payer: 'me',
  split: 'default',
  myPct: null,
  spentOn: null,
  sure: true,
  ...over,
});

describe('draftFromAi', () => {
  it('reads the amount text with money.ts, never a number from the model', () => {
    expect(draftFromAi(ai(), ctx)).toMatchObject({ confidence: 'high', draft: { amountMinor: 45_000, paidBy: 'me', splitMode: 'half', spentOn: '2026-10-29' } });
    expect(draftFromAi(ai({ amountText: '20 mil' }), ctx).draft.amountMinor).toBe(20_000);
    expect(draftFromAi(ai({ amountText: '4,50' }), eu).draft.amountMinor).toBe(450);
  });

  it('asks when the amount is missing or could mean two things', () => {
    for (const amountText of [null, '', 'cena', '4,50', '-5.000', '0']) {
      const r = draftFromAi(ai({ amountText }), ctx);
      expect(r.draft.amountMinor, String(amountText)).toBeUndefined();
      expect(r.missing).toContain('amount');
      expect(canSaveQuick(r)).toBe(false);
    }
  });

  it('never converts another currency', () => {
    const r = draftFromAi(ai({ amountText: '20', currency: 'EUR' }), ctx);
    expect(r).toMatchObject({ foreignCurrency: 'EUR', confidence: 'low' });
    expect(r.draft.amountMinor).toBeUndefined();
    expect(draftFromAi(ai({ currency: 'COP' }), ctx).confidence).toBe('high');
  });

  it('maps who paid and how it is split to the stored form', () => {
    expect(draftFromAi(ai({ payer: 'partner', split: 'pct', myPct: 70 }), ctx).draft).toMatchObject({ paidBy: 'partner', splitMode: 'pct', splitPct: 30 });
    expect(draftFromAi(ai({ split: 'all_partner' }), ctx).draft.splitMode).toBe('other');
    expect(draftFromAi(ai({ payer: 'partner', split: 'all_partner' }), ctx).draft.splitMode).toBe('personal');
    expect(draftFromAi(ai({ split: 'all_me' }), ctx).draft.splitMode).toBe('personal');
    expect(draftFromAi(ai(), eu).draft).toMatchObject({ splitMode: 'pct', splitPct: 60 });
    expect(draftFromAi(ai({ split: 'pct', myPct: 140 }), ctx).missing).toContain('split');
  });

  it('asks who paid when the model does not know, or the partner has not joined', () => {
    expect(draftFromAi(ai({ payer: 'unknown' }), ctx).missing).toEqual(['payer']);
    const solo = { ...ctx, partner: { id: '', name: 'Ana' }, partnerJoined: false };
    expect(draftFromAi(ai({ payer: 'partner' }), solo)).toMatchObject({ missing: ['payer'], draft: { paidBy: 'me' } });
  });

  it('keeps dates in the past, and the last year', () => {
    expect(draftFromAi(ai({ spentOn: '2026-10-27' }), ctx).draft.spentOn).toBe('2026-10-27');
    expect(draftFromAi(ai({ spentOn: '2026-11-02' }), ctx).draft.spentOn).toBe('2026-10-29');
    expect(draftFromAi(ai({ spentOn: '2019-01-01' }), ctx).draft.spentOn).toBe('2026-10-29');
    expect(draftFromAi(ai({ spentOn: '27/10/2026' }), ctx).draft.spentOn).toBe('2026-10-29');
  });

  it('asks for a look when the model says it guessed', () => {
    const r = draftFromAi(ai({ sure: false }), ctx);
    expect(r).toMatchObject({ confidence: 'low', missing: ['review'] });
    expect(r.draft.amountMinor).toBe(45_000);
  });
});

describe('chips', () => {
  const typed = (text: string, c = ctx) => parseQuickEntry(text, c);

  it('a tapped chip answers its question', () => {
    const r = typed('cena 90.000 pagué yo, pagó Ana');
    expect(canSaveQuick(r)).toBe(false);
    const fixed = withChoices(r, { payer: 'partner' }, ctx);
    expect(fixed).toMatchObject({ confidence: 'high', draft: { paidBy: 'partner' } });
    expect(canSaveQuick(fixed)).toBe(true);
    expect(withChoices(typed('uber 9.000 ayer el lunes'), { spentOn: '2026-10-28' }, ctx).missing).toEqual([]);
    expect(withChoices(typed('mercado 100.000 a medias personal'), { split: 'half' }, ctx).draft.splitMode).toBe('half');
  });

  it('never fixes a missing amount or another currency', () => {
    expect(canSaveQuick(withChoices(typed('café'), { payer: 'me', split: 'half', spentOn: '2026-10-29' }, ctx))).toBe(false);
    expect(canSaveQuick(withChoices(typed('uber 15 dólares'), { payer: 'me' }, ctx))).toBe(false);
  });

  it('keeps the split meaning when the payer changes', () => {
    const forAna = typed('pizza 48.000 todo de Ana');
    expect(forAna.draft.splitMode).toBe('other');
    expect(withChoices(forAna, { payer: 'partner' }, ctx).draft.splitMode).toBe('personal');
    const ratio = typed('hotel 100.000 60/40');
    expect(withChoices(ratio, { payer: 'partner' }, ctx).draft).toMatchObject({ splitMode: 'pct', splitPct: 40 });
  });

  it('never lets the partner pay before they join', () => {
    const solo = { ...ctx, partner: { id: '', name: 'Ana' }, partnerJoined: false };
    expect(nextPayer('me', solo)).toBe('me');
    expect(withChoices(typed('café 5.000', solo), { payer: 'partner' }, solo).draft.paidBy).toBe('me');
    expect(nextPayer('me', ctx)).toBe('partner');
    expect(nextPayer('partner', ctx)).toBe('me');
  });

  it('cycles the split: half → % → all for the partner → all mine → half', () => {
    let s = nextSplit('half', 'me', ctx);
    expect(s).toEqual({ myPct: 60 });
    s = nextSplit(s, 'me', ctx);
    expect(s).toEqual({ owner: 'partner' });
    s = nextSplit(s, 'me', ctx);
    expect(s).toEqual({ owner: 'me' });
    expect(nextSplit(s, 'me', ctx)).toBe('half');
    expect(nextSplit('default', 'me', eu)).toEqual({ owner: 'partner' }); // default there is 60/40
    expect(nextSplit('half', 'me', eu)).toEqual({ myPct: 60 });
  });

  it('cycles dates and categories', () => {
    expect(nextDate('2026-10-29', '2026-10-29')).toBe('2026-10-28');
    expect(nextDate('2026-10-28', '2026-10-29')).toBe('2026-10-27');
    expect(nextDate('2026-10-27', '2026-10-29')).toBe('2026-10-29');
    expect(nextDate('2026-09-01', '2026-10-29')).toBe('2026-10-29');
    expect(nextCategory('super')).toBe('comida');
    expect(nextCategory('otros')).toBe('super');
  });
});

describe('recognitionLocale', () => {
  it("dictates in the app's language, in the phone's region when it matches", () => {
    expect(recognitionLocale('es', ['es-CO', 'en-US'])).toBe('es-CO');
    expect(recognitionLocale('de', ['en-US', 'de-AT'])).toBe('de-AT');
    expect(recognitionLocale('es', ['de-DE'])).toBe('es-ES');
    expect(recognitionLocale('en', ['en'])).toBe('en-US');
    expect(recognitionLocale('es', ['es_MX'])).toBe('es-MX');
  });
});

describe('parse-expense contract', () => {
  it('accepts a phrase or a receipt, and nothing else', () => {
    expect(parseRequestSchema.safeParse({ mode: 'text', text: 'cena 90 mil', today: '2026-10-29', language: 'es' }).success).toBe(true);
    expect(parseRequestSchema.safeParse({ mode: 'receipt', image: 'AAAA', today: '2026-10-29', language: 'de' }).success).toBe(true);
    for (const bad of [
      { mode: 'text', text: '   ', today: '2026-10-29', language: 'es' },
      { mode: 'text', text: 'x'.repeat(MAX_TEXT + 1), today: '2026-10-29', language: 'es' },
      { mode: 'text', text: 'cena', today: 'hoy', language: 'es' },
      { mode: 'text', text: 'cena', today: '2026-10-29', language: 'fr' },
      { mode: 'voice', text: 'cena', today: '2026-10-29', language: 'es' },
      { mode: 'receipt', image: '', today: '2026-10-29', language: 'es' },
    ]) {
      expect(parseRequestSchema.safeParse(bad).success, JSON.stringify(bad).slice(0, 60)).toBe(false);
    }
  });

  it('rejects a model answer with an amount as a number or an unknown category', () => {
    expect(aiDraftSchema.safeParse(ai()).success).toBe(true);
    expect(aiDraftSchema.safeParse({ ...ai(), amountText: 45000 }).success).toBe(false);
    expect(aiDraftSchema.safeParse({ ...ai(), category: 'restaurante' }).success).toBe(false);
    expect(aiDraftSchema.safeParse({ ...ai(), payer: 'Ana' }).success).toBe(false);
    const { sure: _, ...missingField } = ai();
    expect(aiDraftSchema.safeParse(missingField).success).toBe(false);
  });

  it('reads the function answer, and refuses anything else', () => {
    expect(parseResponseSchema.safeParse({ ok: true, draft: ai(), remaining: 3 }).success).toBe(true);
    expect(parseResponseSchema.safeParse({ ok: false, error: 'limit' }).success).toBe(true);
    expect(parseResponseSchema.safeParse({ ok: false, error: 'boom' }).success).toBe(false);
    expect(parseResponseSchema.safeParse({ ok: true, draft: { ...ai(), amountText: 1 }, remaining: 3 }).success).toBe(false);
  });

  it('gives the model the phrase, the currency and two first names, nothing more', () => {
    const prompt = userPrompt(
      { mode: 'text', text: 'cena 90 mil pagó Ana', today: '2026-10-29', language: 'es' },
      { ok: true, remaining: 10, currency: 'COP', me: 'Diego', partner: 'Ana' },
    );
    expect(prompt).toContain('<expense>cena 90 mil pagó Ana</expense>');
    expect(prompt).toContain('COP');
    expect(prompt).toContain('Today: 2026-10-29');
    expect(prompt).not.toMatch(/balance|saldo/i);
    expect(SYSTEM_PROMPT).toContain('never convert');
  });
});
