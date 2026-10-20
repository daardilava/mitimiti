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
