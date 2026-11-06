// Dictar: phones often write what was said in words ("veinte euros", "twenty euros", "zwanzig Euro"), and the phrase
// parser (src/lib/quickEntry.ts) only reads digits. This turns spoken numbers into digits, but only where the sentence
// says they are an amount, a split or a date offset, so "un café", "los dos" or "el tres de noviembre" stay words:
//   - before a currency word ("veinte euros" → "20 euros"), with its cents ("diez euros con cincuenta" → "10,50 euros");
//   - with a decimal word ("doce coma cincuenta" → "12,50");
//   - two in a row are a price ("doce cincuenta" → "12,50"), or a split when the amount was said apart
//     ("treinta euros, sesenta cuarenta" → "30 euros, 60/40");
//   - before "días" / "days" / "Tage" ("hace tres días" → "hace 3 días");
//   - otherwise, when the sentence has no amount yet and exactly one number was said ("cena veinte" → "cena 20").
// The app's language and English are read (the phone may hear an English amount in any language).
import type { Language } from '../i18n/languages';

type Kind = 'unit' | 'teen' | 'tens' | 'hundreds' | 'hundred' | 'thousand' | 'million' | 'and';
interface Morph {
  kind: Kind;
  value: number;
}

const UNITS_ES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const UNITS_EN = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TEENS_EN = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS_EN = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function words(): Record<'es' | 'en' | 'de', Map<string, Morph>> {
  const es = new Map<string, Morph>();
  UNITS_ES.forEach((w, i) => i && es.set(w, { kind: 'unit', value: i }));
  es.set('un', { kind: 'unit', value: 1 });
  es.set('una', { kind: 'unit', value: 1 });
  ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve'].forEach((w, i) =>
    es.set(w, { kind: 'teen', value: 10 + i }),
  );
  ['veintiuno', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve'].forEach((w, i) =>
    es.set(w, { kind: 'teen', value: 21 + i }),
  );
  es.set('veintiun', { kind: 'teen', value: 21 });
  es.set('veintiuna', { kind: 'teen', value: 21 });
  ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'].forEach((w, i) => w && es.set(w, { kind: 'tens', value: i * 10 }));
  es.set('cien', { kind: 'hundreds', value: 100 });
  es.set('ciento', { kind: 'hundreds', value: 100 });
  ['', '', 'doscient', 'trescient', 'cuatrocient', 'quinient', 'seiscient', 'setecient', 'ochocient', 'novecient'].forEach((w, i) => {
    if (!w) return;
    es.set(`${w}os`, { kind: 'hundreds', value: i * 100 });
    es.set(`${w}as`, { kind: 'hundreds', value: i * 100 });
  });
  es.set('mil', { kind: 'thousand', value: 1000 });
  es.set('millon', { kind: 'million', value: 1e6 });
  es.set('millones', { kind: 'million', value: 1e6 });
  es.set('y', { kind: 'and', value: 0 });

  const en = new Map<string, Morph>();
  UNITS_EN.forEach((w, i) => i && en.set(w, { kind: 'unit', value: i }));
  TEENS_EN.forEach((w, i) => en.set(w, { kind: 'teen', value: 10 + i }));
  TENS_EN.forEach((w, i) => w && en.set(w, { kind: 'tens', value: i * 10 }));
  en.set('hundred', { kind: 'hundred', value: 100 });
  en.set('thousand', { kind: 'thousand', value: 1000 });
  en.set('million', { kind: 'million', value: 1e6 });
  en.set('millions', { kind: 'million', value: 1e6 });
  en.set('and', { kind: 'and', value: 0 });

  const de = new Map<string, Morph>();
  ['', 'eins', 'zwei', 'drei', 'vier', 'funf', 'sechs', 'sieben', 'acht', 'neun'].forEach((w, i) => i && de.set(w, { kind: 'unit', value: i }));
  de.set('ein', { kind: 'unit', value: 1 });
  de.set('eine', { kind: 'unit', value: 1 });
  de.set('zwo', { kind: 'unit', value: 2 });
  ['zehn', 'elf', 'zwolf', 'dreizehn', 'vierzehn', 'funfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'].forEach((w, i) =>
    de.set(w, { kind: 'teen', value: 10 + i }),
  );
  ['', '', 'zwanzig', 'dreissig', 'vierzig', 'funfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'].forEach((w, i) => w && de.set(w, { kind: 'tens', value: i * 10 }));
  de.set('hundert', { kind: 'hundred', value: 100 });
  de.set('tausend', { kind: 'thousand', value: 1000 });
  de.set('million', { kind: 'million', value: 1e6 });
  de.set('millionen', { kind: 'million', value: 1e6 });
  de.set('und', { kind: 'and', value: 0 });
  return { es, en, de };
}

const WORDS = words();

/** German writes numbers as one word ("fünfundzwanzig", "zweihundertfünfzig"): its pieces, longest first. */
const DE_PIECE = new RegExp(
  `^(?:${[...WORDS.de.keys()].sort((a, b) => b.length - a.length).join('|')})`,
);

function fold(word: string): string {
  return word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ß/g, 'ss');
}

/** The pieces of one word, or null when it isn't (all) a number. */
function morphsOf(word: string, language: Language): Morph[] | null {
  const w = fold(word);
  const own = WORDS[language];
  const single = own.get(w) ?? WORDS.en.get(w);
  if (single) return [single];
  // "twenty-five"
  if (w.includes('-')) {
    const parts = w.split('-').map((p) => own.get(p) ?? WORDS.en.get(p));
    return parts.every(Boolean) && parts.length > 1 ? (parts as Morph[]) : null;
  }
  if (language === 'de') {
    const out: Morph[] = [];
    let rest = w;
    while (rest) {
      const m = DE_PIECE.exec(rest);
      if (!m) return null;
      out.push(WORDS.de.get(m[0])!);
      rest = rest.slice(m[0].length);
    }
    return out.length > 1 ? out : null;
  }
  return null;
}

/** Reads a number piece by piece; `push` says false where the next piece can't continue it ("dos tres"). */
class Reader {
  total = 0;
  current = 0;
  last: Kind | 'start' = 'start';
  /** The connector just read ("y", "and", "und"), waiting for its number. */
  pending = false;

  push(m: Morph): boolean {
    const { last, pending } = this;
    const after = (...kinds: (Kind | 'start')[]) => kinds.includes(last);
    switch (m.kind) {
      case 'and':
        // "treinta y cinco", "one hundred and five", "fünfundzwanzig".
        if (pending || !after('tens', 'hundred', 'hundreds', 'thousand', 'unit')) return false;
        this.pending = true;
        return true;
      case 'unit':
        if (pending ? !after('tens', 'hundred', 'hundreds', 'thousand') : !after('start', 'tens', 'hundred', 'hundreds', 'thousand', 'million')) return false;
        this.current += m.value;
        break;
      case 'teen':
        if (!after('start', 'hundred', 'hundreds', 'thousand', 'million')) return false;
        this.current += m.value;
        break;
      case 'tens':
        // German says the unit first: "fünf-und-zwanzig".
        if (pending ? !after('unit', 'hundred', 'hundreds', 'thousand') : !after('start', 'hundred', 'hundreds', 'thousand', 'million')) return false;
        if (pending && last === 'unit' && this.current % 10 === 0) return false;
        this.current += m.value;
        break;
      case 'hundreds':
        if (pending || !after('start', 'thousand', 'million')) return false;
        this.current += m.value;
        break;
      case 'hundred':
        if (pending || !after('start', 'unit', 'teen') || this.current >= 100) return false;
        this.current = (this.current || 1) * 100;
        break;
      case 'thousand':
      case 'million':
        if (pending || after('thousand', 'million') || (m.kind === 'thousand' && this.total % 1e6 !== 0)) return false;
        this.total += (this.current || 1) * m.value;
        this.current = 0;
        break;
    }
    this.pending = false;
    this.last = m.kind;
    return true;
  }

  get value(): number {
    return this.total + this.current;
  }
}

interface Run {
  start: number;
  end: number;
  value: number;
  /** One short word that is usually an article or "both" ("un", "dos", "ein", "two"): never an amount on its own. */
  weak: boolean;
}

const WEAK = new Set(['un', 'una', 'uno', 'one', 'ein', 'eine', 'eins', 'dos', 'two', 'zwei', 'zwo']);
const WORD = /[\p{L}]+(?:-[\p{L}]+)*/gu;

/** The spoken numbers in `text`, in order: each a run of number words with only spaces between them. */
function findRuns(text: string, language: Language): Run[] {
  const tokens = [...text.matchAll(WORD)].map((m) => ({
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
    word: m[0],
    morphs: morphsOf(m[0], language),
  }));
  const adjacent = (a: number, b: number) => /^\s+$/.test(text.slice(tokens[a].end, tokens[b].start));
  const isAnd = (k: number) => tokens[k]?.morphs?.length === 1 && tokens[k].morphs![0].kind === 'and';
  const tryPush = (reader: Reader, k: number): Reader | null => {
    const next = Object.assign(new Reader(), reader);
    return tokens[k]?.morphs && tokens[k].morphs!.every((m) => next.push(m)) ? next : null;
  };

  const runs: Run[] = [];
  let k = 0;
  while (k < tokens.length) {
    const start = isAnd(k) ? null : tryPush(new Reader(), k);
    if (!start) {
      k++;
      continue;
    }
    let reader: Reader = start;
    const first = k;
    let last = k;
    k++;
    while (k < tokens.length && adjacent(last, k)) {
      // "treinta y cinco": take the connector only together with the number after it.
      if (isAnd(k)) {
        const withAnd: Reader | null = k + 1 < tokens.length && adjacent(k, k + 1) ? tryPush(reader, k) : null;
        const after: Reader | null = withAnd ? tryPush(withAnd, k + 1) : null;
        if (!after) break;
        reader = after;
        last = k + 1;
        k += 2;
        continue;
      }
      const next = tryPush(reader, k);
      if (!next) break;
      reader = next;
      last = k;
      k++;
    }
    const words = tokens.slice(first, last + 1);
    runs.push({ start: tokens[first].start, end: tokens[last].end, value: reader.value, weak: words.length === 1 && WEAK.has(fold(words[0].word)) });
  }
  return runs;
}

const CURRENCY = String.raw`(?:euros?|€|eur|pesos?|cop|d[oó]lar(?:es)?|dollars?|bucks|usd|us\$|\$)`;
const CENTS_WORD = String.raw`(?:c[eé]ntimos?|centavos?|cents?)`;
const DECIMAL_WORD = /^\s+(?:coma|punto|point|komma)\s+$/i;
const AND_WORD = String.raw`(?:con|y|and|und)`;

/** Turns spoken numbers into digits where they are an amount, a split or a date offset; everything else untouched. */
export function numbersToDigits(text: string, language: Language): string {
  const runs = findRuns(text, language);
  if (!runs.length) return joinCents(text);
  const out = new Map<Run, string>();
  const used = new Set<Run>();
  const following = (r: Run) => text.slice(r.end);
  const preceding = (r: Run) => text.slice(0, r.start);

  const isAmount = (r: Run) => new RegExp(String.raw`^\s*(?:de\s+)?${CURRENCY}(?![\p{L}])`, 'iu').test(following(r));
  const isCents = (r: Run) => !r.weak && r.value < 100 && new RegExp(String.raw`${CURRENCY}\s+(?:${AND_WORD}\s+)?$`, 'iu').test(preceding(r));
  const isDays = (r: Run) => /^\s*(?:d[ií]as?|days?|tage?n?)\b/iu.test(following(r));
  const take = (r: Run, digits: string) => {
    out.set(r, digits);
    used.add(r);
  };

  // Two numbers in a row. With an amount elsewhere in the sentence, two that add up to 100 are the split
  // ("…30 euros, sesenta cuarenta" → 60/40); with none, they are a price ("doce cincuenta" → 12,50).
  for (let i = 0; i + 1 < runs.length; i++) {
    const [a, b] = [runs[i], runs[i + 1]];
    if (used.has(a) || used.has(b)) continue;
    const between = text.slice(a.end, b.start);
    if (DECIMAL_WORD.test(between) && b.value < 100) {
      take(a, `${a.value},${b.value}`);
      take(b, '');
      continue;
    }
    if (!/^\s*[/-]?\s*$/.test(between) || a.weak) continue;
    const otherAmount = /\d/.test(text) || runs.some((r) => r !== a && r !== b && isAmount(r));
    if (otherAmount && a.value + b.value === 100 && a.value < 100 && b.value < 100) {
      take(a, `${a.value}/${b.value}`);
      take(b, '');
    } else if (!otherAmount && b.value >= 10 && b.value < 100 && a.value < 1000) {
      take(a, `${a.value},${b.value}`);
      take(b, '');
    }
  }

  for (const r of runs) {
    if (!used.has(r) && (isAmount(r) || isCents(r) || isDays(r))) take(r, String(r.value));
  }

  // No amount said in digits or with a currency, and exactly one number in the sentence: that is the amount.
  const hasAmount = /\d/.test(text) || runs.some((r) => used.has(r) && /^\d+(?:,\d+)?$/.test(out.get(r) ?? '') && !isDays(r));
  const left = runs.filter((r) => !used.has(r) && !r.weak);
  if (!hasAmount && left.length === 1) take(left[0], String(left[0].value));

  let result = '';
  let at = 0;
  for (const r of runs) {
    if (!out.has(r)) continue;
    const replacement = out.get(r)!;
    // A run swallowed into the one before it ("…60/40", "…12,50") takes the space before it along.
    const lead = replacement === '' ? text.slice(at, r.start).replace(/\s*(?:coma|punto|point|komma)?\s*$/i, '') : text.slice(at, r.start);
    result += lead + replacement;
    at = r.end;
  }
  result += text.slice(at);

  return joinCents(result);
}

/** "10 euros con 50" / "12 Euro 50" / "20 dollars and 50 cents" → "10,50 euros". */
function joinCents(text: string): string {
  return text.replace(
    new RegExp(String.raw`(\d+)\s*(${CURRENCY})\s+(?:${AND_WORD}\s+)?(\d{1,2})(?:\s*${CENTS_WORD})?(?=\s*(?:$|[.,;:!?]|${CENTS_WORD}))`, 'giu'),
    (_, whole: string, currency: string, cents: string) => `${whole},${cents.padStart(2, '0')} ${currency}`,
  );
}
