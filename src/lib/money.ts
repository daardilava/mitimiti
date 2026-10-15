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

function groupDigits(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}
