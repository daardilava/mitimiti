export type Currency = 'COP' | 'EUR' | 'USD';

export const CURRENCIES: Currency[] = ['COP', 'EUR', 'USD'];

/** Minor units per major unit. COP is stored in whole pesos; EUR and USD in cents. */
const MINOR_FACTOR: Record<Currency, number> = { COP: 1, EUR: 100, USD: 100 };

export const CURRENCY_SYMBOL: Record<Currency, string> = { COP: '$', EUR: '€', USD: 'US$' };

/** $2.400.000 · 1.234,50 € · US$1,234.50 — sign is dropped; callers word it ("Debes", "Te deben"). */
export function formatMoney(amountMinor: number, currency: Currency): string {
  const major = Math.abs(amountMinor) / MINOR_FACTOR[currency];
  if (currency === 'COP') {
    return '$' + groupDigits(Math.round(major).toString(), '.');
  }
  const hasCents = Math.round(major * 100) % 100 !== 0;
  const [whole, cents] = major.toFixed(2).split('.');
  if (currency === 'EUR') {
    return groupDigits(whole, '.') + (hasCents ? ',' + cents : '') + ' €';
  }
  return 'US$' + groupDigits(whole, ',') + (hasCents ? '.' + cents : '');
}

/** Parses what a person typed in the amount field into minor units. Returns 0 when nothing valid was typed. */
export function parseMoneyInput(text: string, currency: Currency): number {
  let raw = text;
  if (currency === 'COP') raw = raw.replace(/[^0-9]/g, '');
  else if (currency === 'EUR') raw = raw.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  else raw = raw.replace(/,/g, '').replace(/[^0-9.]/g, '');
  const major = Number.parseFloat(raw);
  if (!Number.isFinite(major) || major <= 0) return 0;
  return Math.round(major * MINOR_FACTOR[currency]);
}

/** Decimal separator of each currency as typed in the amount field (COP has none). */
const DECIMAL_SEPARATOR: Record<Currency, ',' | '.' | null> = { COP: null, EUR: ',', USD: '.' };

/** Words for thousand / million in es / en / de, and "lucas" (Colombian slang for a thousand pesos). */
const MULTIPLIERS: [RegExp, number][] = [
  [/^(millones|millon|millionen|millions?|mio\.?|m)$/, 1_000_000],
  [/^(mil|k|lucas?|tsd\.?|tausend|thousand|grand)$/, 1_000],
];

/**
 * Reads an amount as a person writes or says it, for quick entry: "4,50", "$20.000", "20 mil", "20k", "20 lucas",
 * "1,2 M", "2 Tsd.", "18 euros". Currency symbols and words are ignored here (the caller checks them; amounts are
 * never converted). `ambiguous` is true when the text could mean two different amounts, e.g. "4,50" in COP (no
 * cents) or "4,500" in EUR (4,5 € or 4.500 €): the caller must ask instead of saving. 0 means no valid amount.
 */
export function parseSpokenAmount(text: string, currency: Currency): { amountMinor: number; ambiguous: boolean } {
  const none = { amountMinor: 0, ambiguous: false };
  const match = /(-?)(\d+(?:[.,]\d+)*)\s*([a-z]+\.?)?/.exec(
    text.toLowerCase().replace(/us\$|[$€]|\b(?:usd|eur|euros?|cop|pesos?|d[oó]lares|dollars?)\b/g, ' '),
  );
  if (!match || match[1] === '-') return none;
  const [, , number, word] = match;
  const multiplier = (word && MULTIPLIERS.find(([re]) => re.test(word))?.[1]) || 1;

  const separators = number.match(/[.,]/g) ?? [];
  const groups = number.split(/[.,]/);
  const last = groups[groups.length - 1];
  const lastSep = separators[separators.length - 1];
  const grouped = (gs: string[]) => gs[0].length <= 3 && gs.slice(1).every((g) => g.length === 3);
  let whole: string;
  let fraction = '';
  let ambiguous = false;

  if (!lastSep) {
    whole = number;
  } else if (new Set(separators).size > 1) {
    // "1.234,50" or "1,234.50": the last separator is the decimal one, the others group thousands.
    if (separators.slice(0, -1).some((s) => s === lastSep) || !grouped(groups.slice(0, -1)) || last.length > 2) {
      return { amountMinor: 0, ambiguous: true };
    }
    whole = groups.slice(0, -1).join('');
    fraction = last;
  } else if (separators.length > 1 || last.length === 3) {
    // "2.400.000" or "4.500": thousands, unless it's this currency's decimal separator ("4,500 €"), or a multiplier
    // follows ("1.500 mil").
    if (!grouped(groups)) return { amountMinor: 0, ambiguous: true };
    whole = groups.join('');
    ambiguous = separators.length === 1 && (lastSep === DECIMAL_SEPARATOR[currency] || multiplier !== 1);
  } else if (last.length <= 2) {
    whole = groups[0];
    fraction = last;
  } else {
    return { amountMinor: 0, ambiguous: true };
  }

  // Integer arithmetic on the digits, so "1,2 M" never picks up float noise.
  const scale = 10 ** fraction.length;
  const exact = (Number(whole) * scale + Number(fraction || 0)) * multiplier * MINOR_FACTOR[currency];
  // Cents in COP ("4,50") or fractions of a cent: not an amount we can take as typed.
  if (exact % scale !== 0) return { amountMinor: Math.round(exact / scale), ambiguous: true };
  const amountMinor =
    multiplier === 1 && fraction === '' ? parseMoneyInput(whole, currency) : exact / scale;
  return { amountMinor: amountMinor > 0 ? amountMinor : 0, ambiguous: amountMinor > 0 && ambiguous };
}

/** Minor units back to editable text for the amount field. */
export function toInputText(amountMinor: number, currency: Currency): string {
  const major = amountMinor / MINOR_FACTOR[currency];
  if (currency === 'COP') return String(Math.round(major));
  const text = Number.isInteger(major) ? String(major) : major.toFixed(2);
  return currency === 'EUR' ? text.replace('.', ',') : text;
}

/**
 * A plain number for spreadsheets (CSV export): 184000 · 1234.50, or 1234,50 with a decimal comma. No symbol, no
 * grouping, sign kept. Integer arithmetic only, so cents never pick up float noise.
 */
export function toDecimalText(amountMinor: number, currency: Currency, decimalSeparator: '.' | ',' = '.'): string {
  const factor = MINOR_FACTOR[currency];
  const sign = amountMinor < 0 ? '-' : '';
  const abs = Math.abs(amountMinor);
  if (factor === 1) return sign + String(abs);
  return `${sign}${Math.floor(abs / factor)}${decimalSeparator}${String(abs % factor).padStart(2, '0')}`;
}

function groupDigits(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Short amounts for chart axes: $200 mil · $1,5 M · 1,2 mil € · US$1.2K. Only for labels, never for totals.
 * `units` are the language's words for thousand / million (es: mil / M, en: K / M, de: Tsd. / Mio.); US$ keeps K / M.
 */
export function formatMoneyCompact(amountMinor: number, currency: Currency, units: { thousand: string; million: string } = { thousand: 'mil', million: 'M' }): string {
  const major = Math.abs(amountMinor) / MINOR_FACTOR[currency];
  const words = currency === 'USD' ? { thousand: 'K', million: 'M' } : units;
  const [value, unit] = major >= 1_000_000 ? [major / 1_000_000, words.million] : major >= 1_000 ? [major / 1_000, words.thousand] : [major, ''];
  const rounded = Math.round(value * 10) / 10;
  const digits = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  const number = currency === 'USD' ? digits : digits.replace('.', ',');
  if (currency === 'COP') return unit ? `$${number} ${unit}` : `$${number}`;
  if (currency === 'EUR') return unit ? `${number} ${unit} €` : `${number} €`;
  return `US$${number}${unit}`;
}
