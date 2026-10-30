// The quick-add sheet's rules (docs/QUICK_ENTRY.md, slices 2–5), pure so Vitest covers them: what the AI's answer
// means as a draft, what one tap on a chip changes, and when the draft can be saved without the full form.
// The AI only proposes: its amount is text read here with parseSpokenAmount(), like a typed one.
import type { AiDraft } from '../../supabase/functions/_shared/quickEntry';
import type { CategoryId } from '../ui/tokens';
import { addDays } from './dates';
import { parseSpokenAmount } from './money';
import { storedSplit, type QuickEntryContext, type QuickEntryGap, type QuickEntryResult, type SplitChoice, type Who } from './quickEntry';

/** How the expense was entered in the sheet; saved as expenses.source. */
export type EntrySource = 'text' | 'voice' | 'receipt';

/** Categories in the form's order, for the category chip. */
export const CATEGORY_ORDER: CategoryId[] = ['super', 'comida', 'casa', 'servicios', 'transporte', 'ocio', 'viajes', 'regalos', 'otros'];

/** What the person set by tapping a chip. It wins over what the text says, and stays while they keep typing. */
export interface ChipChoices {
  payer?: Who;
  split?: SplitChoice;
  spentOn?: string;
  category?: CategoryId;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The model's answer as a draft, by the same rules as the phone's parser. */
export function draftFromAi(ai: AiDraft, ctx: QuickEntryContext): QuickEntryResult {
  const missing = new Set<QuickEntryGap>();

  let amountMinor: number | undefined;
  const foreignCurrency = ai.currency && ai.currency !== ctx.currency ? ai.currency : undefined;
  if (foreignCurrency) {
    missing.add('currency');
  } else {
    const read = ai.amountText ? parseSpokenAmount(ai.amountText, ctx.currency) : null;
    if (read && read.amountMinor > 0 && !read.ambiguous) amountMinor = read.amountMinor;
    else missing.add('amount');
  }

  let payer: Who = 'me';
  if (ai.payer === 'unknown') missing.add('payer');
  else if (ai.payer === 'partner') {
    if (ctx.partnerJoined && ctx.partner.id) payer = 'partner';
    else missing.add('payer');
  }

  let split: SplitChoice = 'default';
  if (ai.split === 'half') split = 'half';
  else if (ai.split === 'all_me') split = { owner: 'me' };
  else if (ai.split === 'all_partner') split = { owner: 'partner' };
  else if (ai.split === 'pct') {
    if (ai.myPct != null && ai.myPct >= 1 && ai.myPct <= 99) split = { myPct: ai.myPct };
    else missing.add('split');
  }

  // A date after today, or one that isn't a date, is today (a receipt's date can be misread).
  const spentOn = ai.spentOn && ISO_DATE.test(ai.spentOn) && ai.spentOn <= ctx.today && ai.spentOn >= addDays(ctx.today, -366) ? ai.spentOn : ctx.today;

  // The model said it guessed: the person looks at the draft before it's saved.
  if (!ai.sure) missing.add('review');
  return {
    draft: {
      amountMinor: missing.has('amount') ? undefined : amountMinor,
      description: ai.description.trim().slice(0, 80),
      category: ai.category,
      paidBy: payer === 'me' ? ctx.me.id : ctx.partner.id,
      ...storedSplit(split, payer, ctx),
      spentOn,
    },
    split,
    confidence: missing.size === 0 ? 'high' : 'low',
    missing: [...missing],
    ...(foreignCurrency ? { foreignCurrency } : {}),
  };
}

/** The draft with the chips the person tapped. A tapped chip answers its question (who paid, split, date). */
export function withChoices(result: QuickEntryResult, choices: ChipChoices, ctx: QuickEntryContext): QuickEntryResult {
  const missing = new Set(result.missing);
  let payer: Who = result.draft.paidBy === ctx.partner.id && ctx.partner.id ? 'partner' : 'me';
  if (choices.payer && (choices.payer === 'me' || (ctx.partnerJoined && ctx.partner.id))) {
    payer = choices.payer;
    missing.delete('payer');
  }
  const split = choices.split ?? result.split;
  if (choices.split) missing.delete('split');
  if (choices.spentOn) missing.delete('date');
  return {
    ...result,
    draft: {
      ...result.draft,
      paidBy: payer === 'me' ? ctx.me.id : ctx.partner.id,
      ...storedSplit(split, payer, ctx),
      spentOn: choices.spentOn ?? result.draft.spentOn,
      category: choices.category ?? result.draft.category,
    },
    split,
    confidence: missing.size === 0 ? 'high' : 'low',
    missing: [...missing],
  };
}

/** Saved straight from the sheet: an amount read for sure and nothing left to ask. Otherwise the full form opens. */
export function canSaveQuick(result: QuickEntryResult): boolean {
  return result.draft.amountMinor !== undefined && result.missing.length === 0;
}

// ─── One tap per chip ─────────────────────────────────────────────────────

export function nextPayer(current: Who, ctx: Pick<QuickEntryContext, 'partnerJoined' | 'partner'>): Who {
  if (!ctx.partnerJoined || !ctx.partner.id) return 'me';
  return current === 'me' ? 'partner' : 'me';
}

/** Half → by percentage → all for the partner → all mine → half. */
export function nextSplit(current: SplitChoice, payer: Who, ctx: Pick<QuickEntryContext, 'defaultSplit' | 'myDefaultPct'>): SplitChoice {
  const { splitMode } = storedSplit(current, payer, ctx);
  const other: Who = payer === 'me' ? 'partner' : 'me';
  const kind = splitMode === 'pct' ? 'pct' : splitMode === 'other' ? other : splitMode === 'personal' ? payer : 'half';
  const myPct = ctx.myDefaultPct !== 50 ? ctx.myDefaultPct : 60;
  if (kind === 'half') return { myPct };
  if (kind === 'pct') return { owner: 'partner' };
  if (kind === 'partner') return { owner: 'me' };
  return 'half';
}

/** Today → yesterday → the day before → today. */
export function nextDate(spentOn: string, today: string): string {
  if (spentOn === today) return addDays(today, -1);
  if (spentOn === addDays(today, -1)) return addDays(today, -2);
  return today;
}

export function nextCategory(current: CategoryId): CategoryId {
  return CATEGORY_ORDER[(CATEGORY_ORDER.indexOf(current) + 1) % CATEGORY_ORDER.length];
}

const FALLBACK_LOCALE: Record<QuickEntryContext['language'], string> = { es: 'es-ES', en: 'en-US', de: 'de-DE' };

/**
 * The dictation language: the app's, in the phone's region when the phone speaks it too (es-CO keeps Colombian
 * Spanish), else a common default. `phoneTags` are the phone's BCP-47 locales, preferred first.
 */
export function recognitionLocale(language: QuickEntryContext['language'], phoneTags: string[]): string {
  return phoneTags.find((tag) => tag.toLowerCase().split(/[-_]/)[0] === language && /[-_]/.test(tag))?.replace('_', '-') ?? FALLBACK_LOCALE[language];
}
