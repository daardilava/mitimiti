import { describe, expect, it } from 'vitest';
import { parseQuickEntry, type QuickEntryContext, type QuickEntryGap, type QuickEntryResult } from '../quickEntry';
import type { SplitMode } from '../splits';
import golden from './quickEntry.golden.json';

interface GoldenPhrase {
  couple: string;
  text: string;
  confidence: 'high' | 'low';
  missing?: QuickEntryGap[];
  amountMinor?: number;
  paidBy?: string;
  splitMode?: SplitMode;
  splitPct?: number | null;
  spentOn?: string;
  category?: string;
}

const couples = golden.couples as Record<string, Omit<QuickEntryContext, 'today'>>;
const phrases = golden.phrases as GoldenPhrase[];
const ctxFor = (couple: string): QuickEntryContext => ({ ...couples[couple], today: golden.today });

/** What is wrong with one result, or [] when it matches the golden phrase. */
function mismatches(p: GoldenPhrase, r: QuickEntryResult): string[] {
  const wrong: string[] = [];
  if (r.confidence !== p.confidence) wrong.push(`confidence ${r.confidence}`);
  const fields = ['amountMinor', 'paidBy', 'splitMode', 'splitPct', 'spentOn', 'category'] as const;
  for (const f of fields) {
    if (p[f] !== undefined && r.draft[f] !== p[f]) wrong.push(`${f} ${JSON.stringify(r.draft[f])} ≠ ${JSON.stringify(p[f])}`);
  }
  for (const gap of p.missing ?? []) if (!r.missing.includes(gap)) wrong.push(`missing lacks ${gap}`);
  return wrong;
}

describe('golden phrases', () => {
  const results = phrases.map((p) => ({ p, r: parseQuickEntry(p.text, ctxFor(p.couple)) }));

  it('has about 150 phrases in the three languages', () => {
    expect(phrases.length).toBeGreaterThanOrEqual(150);
    for (const lang of ['es', 'en', 'de']) {
      expect(phrases.filter((p) => couples[p.couple].language === lang).length).toBeGreaterThan(25);
    }
  });

  it('never reads a wrong amount with high confidence', () => {
    const wrong = results.filter(({ p, r }) => r.confidence === 'high' && r.draft.amountMinor !== p.amountMinor);
    expect(wrong.map(({ p, r }) => `${p.text} → ${r.draft.amountMinor}`)).toEqual([]);
  });

  it('never says high for a phrase that must be asked about', () => {
    const wrong = results.filter(({ p, r }) => p.confidence === 'low' && r.confidence === 'high');
    expect(wrong.map(({ p }) => p.text)).toEqual([]);
  });

  it('parses at least 90 % of the high phrases fully right', () => {
    const high = results.filter(({ p }) => p.confidence === 'high');
    const failures = high.map(({ p, r }) => ({ text: p.text, wrong: mismatches(p, r) })).filter((f) => f.wrong.length);
    const rate = (high.length - failures.length) / high.length;
    expect(rate, JSON.stringify(failures, null, 2)).toBeGreaterThanOrEqual(0.9);
  });

  it('names the gap in every low phrase', () => {
    const failures = results
      .filter(({ p }) => p.confidence === 'low')
      .map(({ p, r }) => ({ text: p.text, wrong: mismatches(p, r) }))
      .filter((f) => f.wrong.length);
    expect(failures).toEqual([]);
  });
});

const co = ctxFor('co');
const eu = ctxFor('eu');

describe('parseQuickEntry rules', () => {
  it('reads 4,50 as 4,50 € but asks in COP', () => {
    expect(parseQuickEntry('4,50', eu).draft.amountMinor).toBe(450);
    const cop = parseQuickEntry('4,50', co);
    expect(cop.confidence).toBe('low');
    expect(cop.draft.amountMinor).toBeUndefined();
    expect(cop.missing).toContain('amount');
  });

  it('reads 4.500 as thousands in both COP and EUR', () => {
    expect(parseQuickEntry('4.500', co).draft.amountMinor).toBe(4_500);
    expect(parseQuickEntry('4.500', eu).draft.amountMinor).toBe(450_000);
  });

  it('never gives a negative or zero amount', () => {
    for (const text of ['-5.000', 'cena -20.000', '0', 'café 0,00']) {
      const r = parseQuickEntry(text, co);
      expect(r.confidence, text).toBe('low');
      expect(r.draft.amountMinor, text).toBeUndefined();
    }
  });

  it('asks when there are two amounts', () => {
    const r = parseQuickEntry('café 4.500 pan 3.000', co);
    expect(r.confidence).toBe('low');
    expect(r.draft.amountMinor).toBeUndefined();
    expect(r.missing).toContain('amount');
  });

  it('matches the partner name ignoring case and accents', () => {
    const accented = { ...co, partner: { id: 'partner', name: 'Ána' } };
    expect(parseQuickEntry('uber 9.000 pagó ana', accented).draft.paidBy).toBe('partner');
    expect(parseQuickEntry('uber 9.000 pagó ÁNA', accented).draft.paidBy).toBe('partner');
    expect(parseQuickEntry('uber 9.000 pagó Ana', accented).draft.paidBy).toBe('partner');
    expect(parseQuickEntry('uber 9.000 ANA PAGÓ', co).draft.paidBy).toBe('partner');
  });

  it('matches the first name of a two-part name', () => {
    const r = parseQuickEntry('cena 80.000 pagó Ana', { ...co, partner: { id: 'partner', name: 'Ana María' } });
    expect(r.draft.paidBy).toBe('partner');
    expect(r.confidence).toBe('high');
  });

  it('keeps me as the payer before the partner joins', () => {
    const solo = ctxFor('solo');
    const r = parseQuickEntry('mercado 50.000 pagó Ana', solo);
    expect(r.draft.paidBy).toBe('me');
    expect(r.confidence).toBe('low');
    expect(r.missing).toEqual(['payer']);
  });

  it('applies the couple default split from the payer side', () => {
    expect(parseQuickEntry('cena 80', eu).draft).toMatchObject({ paidBy: 'me', splitMode: 'pct', splitPct: 60 });
    expect(parseQuickEntry('cena 80 pagó Sofía', eu).draft).toMatchObject({ paidBy: 'partner', splitMode: 'pct', splitPct: 40 });
  });

  it('reads 60/40 as me / partner whoever paid', () => {
    expect(parseQuickEntry('hotel 100.000 60/40', co).draft).toMatchObject({ paidBy: 'me', splitMode: 'pct', splitPct: 60 });
    expect(parseQuickEntry('hotel 100.000 60/40 pagó Ana', co).draft).toMatchObject({ paidBy: 'partner', splitMode: 'pct', splitPct: 40 });
    expect(parseQuickEntry('hotel 100.000 60/30', co).draft.amountMinor).toBeUndefined();
  });

  it('never puts the date in the future', () => {
    // 2026-10-29 is a Thursday: "el jueves" is last week's.
    expect(parseQuickEntry('cena 50.000 el jueves', co).draft.spentOn).toBe('2026-10-22');
    expect(parseQuickEntry('cena 50.000 el miércoles', co).draft.spentOn).toBe('2026-10-28');
    expect(parseQuickEntry('cena 50.000 mañana', co).draft.spentOn).toBe('2026-10-29');
  });

  it('says which other currency was named, without converting', () => {
    const r = parseQuickEntry('taxi 20 euros', co);
    expect(r.foreignCurrency).toBe('EUR');
    expect(r.draft.amountMinor).toBeUndefined();
    expect(parseQuickEntry('taxi 20 dólares', eu).foreignCurrency).toBe('USD');
    expect(parseQuickEntry('taxi 20 euros', eu).foreignCurrency).toBeUndefined();
  });

  it('keeps what is left as the description', () => {
    expect(parseQuickEntry('yo pagué el café 4.500', co).draft.description).toBe('Café');
    expect(parseQuickEntry('vuelo a Cartagena 640.000 60/40', co).draft.description).toBe('Vuelo a Cartagena');
    expect(parseQuickEntry('Ana pagó 70/30 el mercado de 200.000', co).draft.description).toBe('Mercado');
    expect(parseQuickEntry('Ich habe 23,40 bei Edeka bezahlt', ctxFor('de')).draft.description).toBe('Edeka');
    expect(parseQuickEntry('4.500', co).draft.description).toBe('');
  });

  it('falls back to otros and today', () => {
    expect(parseQuickEntry('cosas 10.000', co).draft).toMatchObject({ category: 'otros', spentOn: '2026-10-29', paidBy: 'me', splitMode: 'half' });
  });

  it('handles empty text', () => {
    const r = parseQuickEntry('   ', co);
    expect(r.confidence).toBe('low');
    expect(r.missing).toEqual(['amount']);
  });
});
