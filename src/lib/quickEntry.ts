// Quick entry (docs/QUICK_ENTRY.md, slice 1): turns a typed or spoken phrase, "café 4,50 pagó Ana ayer", into an
// expense draft on the phone, offline and instantly. Pure and deterministic; the AI fallback only runs on 'low'.
// Amounts are read only by parseSpokenAmount() in money.ts, and never converted between currencies.
// Couples mix languages, so every keyword is tried whatever the UI language; `language` only settles words that
// mean different things ("gas", "bar").
import type { Language } from '../i18n/languages';
import type { CategoryId } from '../ui/tokens';
import { addDays } from './dates';
import { parseSpokenAmount, type Currency } from './money';
import type { SplitMode } from './splits';

export interface QuickEntryPerson {
  id: string;
  name: string;
}

/** A `Couple` (from useCouple()) plus today's date and the UI language. */
export interface QuickEntryContext {
  currency: Currency;
  me: QuickEntryPerson;
  partner: QuickEntryPerson;
  partnerJoined: boolean;
  defaultSplit: 'half' | 'pct';
  /** My share (%) when the default is proportional. */
  myDefaultPct: number;
  /** YYYY-MM-DD */
  today: string;
  language: Language;
}

/** What a 'low' result needs from the person before it can be saved. 'review': the AI said it guessed. */
export type QuickEntryGap = 'amount' | 'currency' | 'payer' | 'split' | 'date' | 'review';

/** An ExpenseInput without an id; the amount only when it was read for sure. */
export interface QuickDraft {
  amountMinor?: number;
  description: string;
  category: CategoryId;
  paidBy: string;
  splitMode: SplitMode;
  /** Payer's percentage, only for 'pct'. */
  splitPct: number | null;
  /** YYYY-MM-DD */
  spentOn: string;
}

export interface QuickEntryResult {
  draft: QuickDraft;
  /** The split as it was said, so it can follow the payer when a chip changes who paid. */
  split: SplitChoice;
  /** 'high': safe to save as is. 'low': show the draft and ask about `missing`. */
  confidence: 'high' | 'low';
  missing: QuickEntryGap[];
  /** Set when the phrase names another currency ("20 euros" in a COP couple). Say so; never convert. */
  foreignCurrency?: Currency;
}

export type Who = 'me' | 'partner';

/** A split as people say it ("a medias", "60/40", "todo de Ana", "personal"), before it's turned into the stored form. */
export type SplitChoice = 'default' | 'half' | 'personal' | { myPct: number } | { owner: Who };

/**
 * The stored form, which is from the payer's side: splitPct is the payer's share; 'other' is all for whoever didn't
 * pay, 'personal' all for whoever did. 'default' is the couple's setting (Ajustes › División predeterminada).
 */
export function storedSplit(choice: SplitChoice, payer: Who, ctx: Pick<QuickEntryContext, 'defaultSplit' | 'myDefaultPct'>): { splitMode: SplitMode; splitPct: number | null } {
  const pct = (myPct: number) =>
    myPct === 50 ? { splitMode: 'half' as const, splitPct: null } : { splitMode: 'pct' as const, splitPct: payer === 'me' ? myPct : 100 - myPct };
  if (choice === 'default') return ctx.defaultSplit === 'pct' ? pct(ctx.myDefaultPct) : { splitMode: 'half', splitPct: null };
  if (choice === 'half' || choice === 'personal') return { splitMode: choice, splitPct: null };
  if ('myPct' in choice) return pct(choice.myPct);
  return { splitMode: choice.owner === payer ? 'personal' : 'other', splitPct: null };
}

/** Lowercase without accents, one character per character so indexes still point into the original text. */
function fold(text: string): string {
  return text
    .split('')
    .map((c) => {
      const f = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      return f.length === 1 ? f : c;
    })
    .join('');
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const firstName = (name: string) => fold(name).trim().split(/\s+/)[0] ?? '';

/** The phrase being read. Each rule blanks what it understood, so later rules and the description don't see it. */
interface Phrase {
  original: string;
  text: string;
}

/** Every match of `re` (global) that `keep` accepts, blanked out of the phrase. */
function take(p: Phrase, re: RegExp, keep: (m: RegExpMatchArray) => boolean = () => true): RegExpMatchArray[] {
  const found = [...p.text.matchAll(re)].filter(keep);
  for (const m of found) {
    const start = m.index ?? 0;
    p.text = p.text.slice(0, start) + ' '.repeat(m[0].length) + p.text.slice(start + m[0].length);
  }
  return found;
}

// ─── Amounts ──────────────────────────────────────────────────────────────

const CURRENCY_WORD = String.raw`us\$|\$|€|euros?|eur|usd|dolares|dollars?|pesos?|cop`;
const MULTIPLIER_WORD = String.raw`millones|millon|millionen|millions?|mil|mio\.?|tsd\.?|tausend|thousand|grand|lucas?|k|m`;
const AMOUNT = new RegExp(
  String.raw`(^|[^a-z\d.,])(-\s*)?(?:(${CURRENCY_WORD})\s*)?(\d+(?:[.,]\d+)*(?:\s*(?:${MULTIPLIER_WORD})(?![a-z]))?)(?:\s*(${CURRENCY_WORD})(?![a-z]))?(?![a-z\d%/])`,
  'g',
);

function currencyOf(word: string | undefined, ctx: QuickEntryContext): Currency | null {
  if (!word) return null;
  if (word === '$') return ctx.currency === 'EUR' ? 'USD' : ctx.currency;
  if (/^(us\$|usd|dolares|dollars?)$/.test(word)) return 'USD';
  if (/^(€|euros?|eur)$/.test(word)) return 'EUR';
  return 'COP';
}

// ─── Dates ────────────────────────────────────────────────────────────────

/** 0 = Sunday, like Date.getDay(). */
const WEEKDAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6, sonnabend: 6,
};
const WEEKDAY = new RegExp(
  String.raw`\b(?:(?:el\s+pasado|el|este|on|last|am|letzten|letzter|letztes)\s+)?(${Object.keys(WEEKDAYS).join('|')})(?:\s+pasado)?\b`,
  'g',
);

/** The most recent `weekday` before `today` (1–7 days back): "el lunes" said on a Monday is last week's. */
function lastWeekday(today: string, weekday: number): string {
  const [y, m, d] = today.split('-').map(Number);
  const back = (new Date(y, m - 1, d).getDay() - weekday + 7) % 7 || 7;
  return addDays(today, -back);
}

// ─── Categories ───────────────────────────────────────────────────────────

function categoryKeywords(language: Language): [CategoryId, string[]][] {
  return [
    ['super', ['super', 'supermercado', 'mercado', 'mercar', 'tienda', 'exito', 'd1', 'ara', 'carulla', 'jumbo', 'olimpica', 'makro', 'alkosto', 'mercadona', 'carrefour', 'lidl', 'aldi', 'rewe', 'edeka', 'netto', 'penny', 'kaufland', 'supermarkt', 'einkauf', 'einkaufen', 'lebensmittel', 'groceries', 'grocery', 'supermarket', 'walmart', 'target', 'costco']],
    ['comida', ['cafe', 'tinto', 'restaurante', 'restaurant', 'almuerzo', 'cena', 'desayuno', 'brunch', 'comida', 'pizza', 'sushi', 'hamburguesa', 'burger', 'rappi', 'domicilio', 'helado', 'panaderia', 'empanada', 'coffee', 'lunch', 'dinner', 'breakfast', 'bakery', 'takeout', 'food', 'kaffee', 'essen', 'mittagessen', 'abendessen', 'fruhstuck', 'backerei', 'doner', 'eis']],
    ['casa', ['casa', 'hogar', 'arriendo', 'alquiler', 'administracion', 'mueble', 'limpieza', 'aseo', 'ikea', 'rent', 'furniture', 'cleaning', 'miete', 'wohnung', 'mobel']],
    ['servicios', ['luz', 'agua', 'internet', 'wifi', 'celular', 'movil', 'telefono', 'factura', 'servicio', 'netflix', 'spotify', 'disney', 'hbo', 'claro', 'tigo', 'movistar', 'epm', 'electricity', 'water', 'phone', 'utilities', 'strom', 'wasser', 'handy', 'vodafone', 'telekom', 'o2', 'rundfunk', ...(language === 'en' ? [] : ['gas'])]],
    ['transporte', ['uber', 'taxi', 'didi', 'cabify', 'bolt', 'lyft', 'gasolina', 'gasolinera', 'combustible', 'peaje', 'parqueadero', 'parqueo', 'bus', 'buseta', 'metro', 'transmilenio', 'tren', 'parking', 'train', 'fuel', 'tank', 'benzin', 'bahn', 'ubahn', 'sbahn', 'flixbus', ...(language === 'en' ? ['gas'] : [])]],
    ['ocio', ['cine', 'concierto', 'cerveza', 'fiesta', 'boleta', 'entrada', 'teatro', 'museo', 'rumba', 'discoteca', 'cinema', 'movie', 'concert', 'beer', 'party', 'ticket', 'theater', 'theatre', 'museum', 'club', 'kino', 'konzert', 'bier', ...(language === 'de' ? [] : ['bar'])]],
    ['viajes', ['viaje', 'vuelo', 'avion', 'hotel', 'hostal', 'airbnb', 'booking', 'vacaciones', 'trip', 'flight', 'travel', 'vacation', 'flug', 'reise', 'urlaub']],
    ['regalos', ['regalo', 'cumpleanos', 'flor', 'gift', 'present', 'birthday', 'flower', 'geschenk', 'geburtstag', 'blume']],
  ];
}

/** The category of the first keyword in the phrase (plurals included), or 'otros'. */
function findCategory(text: string, language: Language): CategoryId {
  let best: { id: CategoryId; at: number } = { id: 'otros', at: Infinity };
  for (const [id, words] of categoryKeywords(language)) {
    const m = new RegExp(String.raw`\b(?:${words.join('|')})(?:s|es|n|en|e)?\b`).exec(text);
    if (m && m.index < best.at) best = { id, at: m.index };
  }
  return best.id;
}

// ─── Description ──────────────────────────────────────────────────────────

const FILLER = new Set([
  'a', 'al', 'con', 'de', 'del', 'el', 'en', 'es', 'la', 'las', 'lo', 'los', 'para', 'por', 'un', 'una', 'y',
  'an', 'and', 'at', 'for', 'in', 'of', 'on', 'the',
  'am', 'bei', 'beim', 'das', 'der', 'die', 'fur', 'im', 'mit', 'um', 'und', 'von', 'zu', 'zum', 'zur',
]);

/** What nobody rule understood, as the expense description: "yo pagué el café 4.500" → "Café". */
function describe(p: Phrase): string {
  const left = p.original.split('').map((c, i) => (p.text[i] === ' ' ? ' ' : c)).join('');
  const words = left
    .split(/\s+/)
    .map((w) => w.replace(/^[,;:!?·–—-]+|[,;:!?·–—-]+$/g, ''))
    .filter((w) => w !== '');
  while (words.length && FILLER.has(fold(words[0]))) words.shift();
  while (words.length && FILLER.has(fold(words[words.length - 1]))) words.pop();
  const text = words.join(' ').replace(/\.$/, '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ─── The parser ───────────────────────────────────────────────────────────

export function parseQuickEntry(input: string, ctx: QuickEntryContext): QuickEntryResult {
  const p: Phrase = { original: input, text: fold(input) };
  const missing = new Set<QuickEntryGap>();
  const names = (
    [
      [firstName(ctx.me.name), 'me'],
      [firstName(ctx.partner.name), 'partner'],
    ] as [string, Who][]
  ).filter(([n], _, all) => n !== '' && all.filter(([o]) => o === n).length === 1);
  /** One regex per name: `template` with NAME replaced, tagged with who it is. */
  const forNames = (template: string): [RegExp, Who][] =>
    names.map(([n, who]) => [new RegExp(template.replaceAll('NAME', escapeRegExp(n)), 'g'), who]);

  // Ratios first, before their numbers can pass for amounts: "60/40" is me / partner, like the form's chips.
  const ratios = take(p, /(^|[^\d.,])(\d{1,2})\s*%?\s*[/:-]\s*(\d{1,2})\s*%?(?![\d.,])/g, (m) => {
    const [a, b] = [Number(m[2]), Number(m[3])];
    return a >= 1 && b >= 1 && a + b === 100;
  });

  // Dates with a number, for the same reason.
  const dates = new Set<string>();
  for (const re of [/\bhace\s+(\d{1,2})\s+dias?\b/g, /\b(\d{1,2})\s+days?\s+ago\b/g, /\bvor\s+(\d{1,2})\s+tag(?:en)?\b/g]) {
    for (const m of take(p, re)) dates.add(addDays(ctx.today, -Number(m[1])));
  }

  // Amount: exactly one, in the couple's currency, read for sure.
  let amountMinor: number | undefined;
  let foreignCurrency: Currency | undefined;
  const amounts = take(p, AMOUNT).map((m) => ({
    negative: m[2] !== undefined,
    currency: currencyOf(m[3], ctx) ?? currencyOf(m[5], ctx),
    ...parseSpokenAmount(m[4], ctx.currency),
  }));
  const foreign = amounts.find((a) => a.currency && a.currency !== ctx.currency);
  if (foreign) {
    foreignCurrency = foreign.currency ?? undefined;
    missing.add('currency');
  } else if (amounts.length !== 1 || amounts[0].negative || amounts[0].ambiguous || amounts[0].amountMinor <= 0) {
    missing.add('amount');
  } else {
    amountMinor = amounts[0].amountMinor;
  }

  // Who paid.
  const payers = new Set<Who>();
  const payerRules: [RegExp, Who][] = [
    [/\b(?:yo\s+)?(?:lo\s+)?pague(?:\s+yo)?\b/g, 'me'],
    [/\b(?:lo\s+)?pago\s+yo\b|\byo\s+(?:lo\s+)?pago\b|\bpagado\s+por\s+(?:mi|yo)\b/g, 'me'],
    [/\bi\s+pa(?:id|yed)\b|\bpaid\s+by\s+me\b/g, 'me'],
    [/\bich\s+zahl(?:e|te)\b|\bzahl(?:e|te)\s+ich\b|\bvon\s+mir\s+bezahlt\b|\bbezahlt\s+von\s+mir\b/g, 'me'],
    [/\b(?:lo\s+)?pago\s+ella\b|\bella\s+(?:lo\s+)?pago\b|\b(?:she|he)\s+paid\b|\bpaid\s+by\s+(?:her|him)\b/g, 'partner'],
    ...forNames(String.raw`\b(?:lo\s+)?pago\s+NAME\b|\bNAME\s+(?:lo\s+)?pago\b|\bpagado\s+por\s+NAME\b`),
    ...forNames(String.raw`\bpaid\s+by\s+NAME\b|\bNAME\s+pa(?:id|yed)\b`),
    ...forNames(String.raw`\b(?:von\s+NAME\s+bezahlt|bezahlt\s+von\s+NAME)\b`),
  ];
  for (const [re, who] of payerRules) if (take(p, re).length) payers.add(who);
  // German perfect tense: "ich habe … bezahlt", "Lena hat … bezahlt", "hat sie bezahlt".
  if (/\bbezahlt\b/.test(p.text)) {
    const subjects: [RegExp, Who][] = [
      [/\bich\s+hab(?:e)?\b|\bhab(?:e)?\s+ich\b/g, 'me'],
      [/\b(?:er|sie)\s+hat\b|\bhat\s+(?:er|sie)\b/g, 'partner'],
      ...forNames(String.raw`\bNAME\s+hat\b|\bhat\s+NAME\b`),
    ];
    let found = false;
    for (const [re, who] of subjects) {
      if (take(p, re).length) {
        payers.add(who);
        found = true;
      }
    }
    if (found) take(p, /\bbezahlt\b/g);
  }
  // "pagó" with nobody named: someone else paid, but who is a guess.
  const lonePago = take(p, /\bpago\b/g, (m) => /ó/i.test(input.charAt((m.index ?? 0) + 3)));
  take(p, /\b(?:paid|pagado|bezahlt)\b/g);
  let paidBy = ctx.me.id;
  if (payers.size > 1 || (payers.size === 0 && lonePago.length)) {
    missing.add('payer');
  } else if (payers.has('partner')) {
    // Before the partner joins only I can have paid (same rule as the form).
    if (ctx.partnerJoined && ctx.partner.id) paidBy = ctx.partner.id;
    else missing.add('payer');
  }
  const payer: Who = paidBy === ctx.me.id ? 'me' : 'partner';

  // How it's split. Each signal is turned into the stored form; two different ones are a question.
  const choices: SplitChoice[] = [];
  const owner = (who: Who) => choices.push({ owner: who });
  for (const m of ratios) choices.push({ myPct: Number(m[2]) });
  if (
    take(
      p,
      /\b(?:a\s+medias|(?:la\s+)?mitad(?:\s+y\s+mitad|\s+mitad)?|entre\s+(?:los\s+)?dos|compartido|split(?:\s+it)?(?:\s+evenly)?|half(?:\s+and\s+half)?|fifty[\s-]+fifty|shared|halbe[\s-]+halbe|halb[\s-]+halb|(?:die\s+)?halfte|geteilt|gemeinsam)\b/g,
    ).length
  ) {
    choices.push('half');
  }
  if (take(p, /\b(?:personal|privat|personlich)\b/g).length) choices.push('personal');
  const ownerRules: [RegExp, Who][] = [
    [/\b(?:todo\s+|solo\s+)?mi[oa]\b|\bsolo\s+(?:yo|para\s+mi)\b|\bpara\s+mi\b(?!\s+[a-z])/g, 'me'],
    [/\b(?:all\s+)?(?:just|only)\s+(?:for\s+)?me\b|\b(?:all\s+)?for\s+me\b|\bmine\b/g, 'me'],
    [/\b(?:nur\s+)?fur\s+mich\b|\bnur\s+ich\b|\bmeins\b/g, 'me'],
    [/\bpara\s+ella\b|\bfor\s+(?:her|him)\b|\bfur\s+ihn\b/g, 'partner'],
    ...forNames(String.raw`\btodo\s+(?:de|para)\s+NAME\b|\b(?:all\s+)?for\s+NAME\b|\ball\s+NAME(?:'?s)?\b|\b(?:alles\s+|nur\s+)?fur\s+NAME\b`),
  ];
  for (const [re, who] of ownerRules) if (take(p, re).length) owner(who);
  // "para Ana" alone: for her, unless it's a gift for her (then whose share is it?).
  const forName = forNames(String.raw`\bpara\s+NAME\b`).filter(([re]) => take(p, re).length);

  // When.
  for (const [re, offset] of [
    [/\b(?:day\s+before\s+yesterday|anteayer|antier|antes\s+de\s+ayer|vorgestern)\b/g, -2],
    [/\b(?:ayer|yesterday|gestern)\b/g, -1],
    [/\b(?:hoy|today|heute)\b/g, 0],
  ] as [RegExp, number][]) {
    if (take(p, re).length) dates.add(addDays(ctx.today, offset));
  }
  for (const m of take(p, WEEKDAY)) dates.add(lastWeekday(ctx.today, WEEKDAYS[m[1]]));
  if (dates.size > 1) missing.add('date');
  const spentOn = dates.size === 1 ? [...dates][0] : ctx.today;

  const category = findCategory(p.text, ctx.language);
  if (forName.length) {
    if (category === 'regalos') missing.add('split');
    else for (const [, who] of forName) owner(who);
  }
  // Two signals that end up the same ("personal" and "mío" when I paid) are one answer; different ones are a question.
  const stored = new Map(choices.map((c) => [JSON.stringify(storedSplit(c, payer, ctx)), c]));
  if (stored.size > 1) missing.add('split');
  const split = stored.size === 1 && !missing.has('split') ? [...stored.values()][0] : 'default';
  const { splitMode, splitPct } = storedSplit(split, payer, ctx);

  return {
    draft: { amountMinor, description: describe(p), category, paidBy, splitMode, splitPct, spentOn },
    split,
    confidence: missing.size === 0 ? 'high' : 'low',
    missing: [...missing],
    ...(foreignCurrency ? { foreignCurrency } : {}),
  };
}
