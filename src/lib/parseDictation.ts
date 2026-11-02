// Dictar: a spoken sentence ("almuerzo con Melanie, 25 euros, pagué yo, a medias") into an expense draft, on the
// phone, with no network. The rules are quick entry's parser (src/lib/quickEntry.ts, its golden phrases in es / en /
// de), so typing and speaking understand the same things; this adds what the Dictar screen draws: the chips and the
// part of the transcript that is the amount.
import type { CategoryId } from '../ui/tokens';
import { mapCategory, type ExpenseDraft } from './expenseDraft';
import type { Currency } from './money';
import { parseQuickEntry, type QuickEntryContext, type SplitChoice, type Who } from './quickEntry';

export interface DictationResult {
  /** What the form starts from. The amount only when it was heard for sure and in the couple's currency. */
  draft: ExpenseDraft;
  /** Chips: what was understood so far. `null` for what wasn't said (the default applies). */
  heard: {
    amountMinor: number | null;
    category: CategoryId | null;
    payer: Who;
    /** 'default' when no split was said: the couple's default split applies. */
    split: SplitChoice;
  };
  /** Set when another currency was said ("20 dólares" in a EUR couple). Say so; never convert. */
  foreignCurrency?: Currency;
  /** [start, end) of the amount in the transcript, to highlight it; null when there is none. */
  amountSpan: [number, number] | null;
}

const AMOUNT_SPAN =
  /(?:us\$|\$|€)?\s?\d+(?:[.,]\d+)*(?:\s?(?:mil|k|lucas?|tsd\.?|tausend))?(?:\s?(?:euros?|€|d[oó]lares|dollars?|pesos?|eur|usd|cop))?/i;

/** Where the amount is in what was said. Display only: the amount itself comes from the parser. */
export function amountSpan(text: string): [number, number] | null {
  const m = AMOUNT_SPAN.exec(text);
  if (!m) return null;
  const lead = m[0].length - m[0].trimStart().length;
  return [m.index + lead, m.index + m[0].trimEnd().length];
}

export function parseDictation(transcript: string, ctx: QuickEntryContext): DictationResult {
  const result = parseQuickEntry(transcript, ctx);
  const { draft } = result;
  // The keywords found nothing in the sentence: try the description alone (a shop's name, a label).
  const category = draft.category !== 'otros' ? draft.category : mapCategory(draft.description, ctx.language);
  const heardCategory = category !== 'otros' ? category : null;
  return {
    draft: {
      ...(draft.amountMinor !== undefined ? { amountMinor: draft.amountMinor } : {}),
      ...(draft.description ? { description: draft.description.slice(0, 80) } : {}),
      category,
      spentOn: draft.spentOn,
      paidBy: draft.paidBy,
      splitMode: draft.splitMode,
      splitPct: draft.splitPct,
    },
    heard: {
      amountMinor: draft.amountMinor ?? null,
      category: heardCategory,
      payer: draft.paidBy === ctx.me.id ? 'me' : 'partner',
      split: result.split,
    },
    ...(result.foreignCurrency ? { foreignCurrency: result.foreignCurrency } : {}),
    amountSpan: amountSpan(transcript),
  };
}
