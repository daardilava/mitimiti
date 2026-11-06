// An expense that isn't saved yet: what Dictar and Escanear hand to the form (src/app/expense/new.tsx) or save
// directly through useUpsertExpense. Every field is optional; the form fills the rest with its usual defaults. The
// schema checks a draft before it seeds the form, so a broken one starts the form empty instead of half-filled.
import { z } from 'zod';
import type { Language } from '../i18n/languages';
import type { CategoryId } from '../ui/tokens';
import { guessCategory } from './quickEntry';

export const CATEGORY_IDS = ['super', 'comida', 'casa', 'servicios', 'transporte', 'ocio', 'viajes', 'regalos', 'otros'] as const satisfies readonly CategoryId[];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const expenseDraftSchema = z
  .object({
    /** Minor units of the couple's currency (src/lib/money.ts). Never a float, never another currency. */
    amountMinor: z.number().int().positive().optional(),
    description: z.string().max(80).optional(),
    category: z.enum(CATEGORY_IDS).optional(),
    /** YYYY-MM-DD */
    spentOn: z.string().regex(ISO_DATE).optional(),
    /** A member's Clerk id (or the sample id with dev bypass). */
    paidBy: z.string().min(1).optional(),
    splitMode: z.enum(['half', 'pct', 'other', 'personal']).optional(),
    /** Payer's percentage, only for 'pct'. */
    splitPct: z.number().int().min(1).max(99).nullable().optional(),
  })
  .refine((d) => d.splitMode !== 'pct' || d.splitPct != null, { message: 'pct_required', path: ['splitPct'] });

export type ExpenseDraft = z.infer<typeof expenseDraftSchema>;

/** A draft if `raw` is a valid one, else undefined. */
export function readDraft(raw: unknown): ExpenseDraft | undefined {
  const parsed = expenseDraftSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Category labels as people or a model write them, in es / en / de, mapped to the app's 9 ids. */
const LABELS: Record<string, CategoryId> = {
  // Spanish names shown in the app
  'comida fuera': 'comida', salidas: 'ocio',
  // English
  groceries: 'super', grocery: 'super', supermarket: 'super', food: 'comida', restaurant: 'comida', restaurants: 'comida', dining: 'comida', 'eating out': 'comida',
  home: 'casa', house: 'casa', housing: 'casa', household: 'casa', utilities: 'servicios', bills: 'servicios', services: 'servicios', subscriptions: 'servicios',
  transport: 'transporte', transportation: 'transporte', entertainment: 'ocio', leisure: 'ocio', 'going out': 'ocio', travel: 'viajes', trips: 'viajes',
  gifts: 'regalos', gift: 'regalos', other: 'otros', others: 'otros', misc: 'otros',
  // German
  lebensmittel: 'super', essen: 'comida', 'essen gehen': 'comida', haushalt: 'casa', wohnen: 'casa', nebenkosten: 'servicios', vertrage: 'servicios',
  verkehr: 'transporte', freizeit: 'ocio', ausgehen: 'ocio', reisen: 'viajes', geschenke: 'regalos', sonstiges: 'otros',
};

/**
 * Free text or an AI's answer onto one of the 9 category ids: an id or a label as is ("super", "Groceries",
 * "Freizeit"), else the parser's keywords ("Panadería La Espiga" → comida), else `fallback` (otros).
 */
export function mapCategory(text: string | null | undefined, language: Language = 'es', fallback: CategoryId = 'otros'): CategoryId {
  if (!text) return fallback;
  const key = fold(text);
  const id = CATEGORY_IDS.find((c) => c === key);
  if (id) return id;
  if (LABELS[key]) return LABELS[key];
  const guessed = guessCategory(key, language);
  return guessed === 'otros' ? fallback : guessed;
}
