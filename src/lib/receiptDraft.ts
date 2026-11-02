// Escanear: what read-receipt read (amounts as printed text), into what the review screen shows and saves. Amounts
// are read only by parseSpokenAmount() in money.ts and never converted: a receipt in another currency keeps its
// numbers for display, and its total never becomes the expense's amount.
import type { ReceiptAi } from '../../supabase/functions/_shared/receipt';
import type { Language } from '../i18n/languages';
import type { CategoryId } from '../ui/tokens';
import { mapCategory, type ExpenseDraft } from './expenseDraft';
import { CURRENCIES, parseSpokenAmount, type Currency } from './money';

export interface ReceiptLine {
  name: string;
  qty: number;
  /** In the receipt's currency; null when the line's amount couldn't be read for sure. */
  totalMinor: number | null;
}

export interface ReceiptReading {
  /** The shop as printed, or '' when the receipt doesn't say. */
  merchant: string;
  /** YYYY-MM-DD, never after today; null when the receipt has no readable date. */
  date: string | null;
  category: CategoryId;
  /** The currency the amounts are in: the receipt's when the app knows it, else the couple's. */
  currency: Currency;
  /** Set when the receipt is in another currency than the couple's (an ISO code, possibly one the app doesn't use). */
  foreignCurrency: string | null;
  items: ReceiptLine[];
  /** In `currency`; null when the total couldn't be read for sure. */
  totalMinor: number | null;
  /** The total as printed, for receipts in a currency the app can't format. */
  totalText: string | null;
  /** False when the lines don't add up to the total: the total is what counts, and the screen says so. */
  itemsMatchTotal: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function readAmount(text: string | null, currency: Currency): number | null {
  if (!text) return null;
  const { amountMinor, ambiguous } = parseSpokenAmount(text, currency);
  return amountMinor > 0 && !ambiguous ? amountMinor : null;
}

export function readingFromAi(ai: ReceiptAi, ctx: { currency: Currency; today: string; language: Language }): ReceiptReading {
  const code = ai.currency?.trim().toUpperCase() || null;
  const known = CURRENCIES.find((c) => c === code);
  const foreignCurrency = code && code !== ctx.currency ? code : null;
  // Amounts in a currency the app doesn't know are parsed with the couple's rules only for the lines' check; the
  // total is never used for the expense in that case.
  const currency = known ?? ctx.currency;
  const items = ai.items
    .filter((i) => i.name.trim() !== '')
    .map((i) => ({ name: i.name.trim(), qty: Math.max(1, i.qty), totalMinor: readAmount(i.total_text, currency) }));
  const totalMinor = readAmount(ai.total_text, currency);
  const sum = items.reduce((s, i) => s + (i.totalMinor ?? 0), 0);
  const allRead = items.length > 0 && items.every((i) => i.totalMinor !== null);
  const date = ai.date && ISO_DATE.test(ai.date) && ai.date <= ctx.today ? ai.date : null;
  const merchant = ai.merchant?.trim() ?? '';
  return {
    merchant,
    date,
    // The model's hint, unless it gave up (otros): then the shop's name through the parser's keywords.
    category: ai.category_hint !== 'otros' ? mapCategory(ai.category_hint, ctx.language) : mapCategory(merchant, ctx.language),
    currency,
    foreignCurrency,
    items,
    totalMinor,
    totalText: ai.total_text,
    // No lines, or a total that couldn't be read: nothing to compare, so nothing to flag.
    itemsMatchTotal: !allRead || totalMinor === null || sum === totalMinor,
  };
}

/** True when the total can be saved as the expense's amount: read for sure, and in the couple's currency. */
export function canUseTotal(r: ReceiptReading): boolean {
  return r.totalMinor !== null && r.foreignCurrency === null;
}

/**
 * The expense the review screen saves (or hands to the form with Editar): the shop as description, the total as
 * amount when it can be used, the receipt's date or today. Who paid and the split come from the screen's pickers.
 */
export function draftFromReading(r: ReceiptReading, today: string, choice: Pick<ExpenseDraft, 'paidBy' | 'splitMode' | 'splitPct'>): ExpenseDraft {
  return {
    ...(canUseTotal(r) ? { amountMinor: r.totalMinor! } : {}),
    ...(r.merchant ? { description: r.merchant.slice(0, 80) } : {}),
    category: r.category,
    spentOn: r.date ?? today,
    ...choice,
  };
}
