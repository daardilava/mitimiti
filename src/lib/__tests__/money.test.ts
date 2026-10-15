import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoneyInput, toInputText } from '../money';

describe('formatMoney', () => {
  it('formats COP without decimals and with dot grouping', () => {
    expect(formatMoney(2_400_000, 'COP')).toBe('$2.400.000');
    expect(formatMoney(337_950, 'COP')).toBe('$337.950');
    expect(formatMoney(0, 'COP')).toBe('$0');
  });

  it('formats EUR with comma decimals and the symbol after', () => {
    expect(formatMoney(123_450, 'EUR')).toBe('1.234,50 €');
    expect(formatMoney(5_000, 'EUR')).toBe('50 €');
  });

  it('formats USD with the US$ prefix', () => {
    expect(formatMoney(123_450, 'USD')).toBe('US$1,234.50');
    expect(formatMoney(100_000_000, 'USD')).toBe('US$1,000,000');
  });

  it('drops the sign', () => {
    expect(formatMoney(-142_500, 'COP')).toBe('$142.500');
  });
});

describe('parseMoneyInput', () => {
  it('reads COP with or without grouping', () => {
    expect(parseMoneyInput('285.000', 'COP')).toBe(285_000);
    expect(parseMoneyInput('285000', 'COP')).toBe(285_000);
  });

  it('reads EUR with comma decimals', () => {
    expect(parseMoneyInput('1.234,50', 'EUR')).toBe(123_450);
    expect(parseMoneyInput('12,5', 'EUR')).toBe(1_250);
  });

  it('reads USD with dot decimals', () => {
    expect(parseMoneyInput('1,234.50', 'USD')).toBe(123_450);
  });

  it('returns 0 for empty or zero input', () => {
    expect(parseMoneyInput('', 'COP')).toBe(0);
    expect(parseMoneyInput('0', 'USD')).toBe(0);
  });
});

describe('toInputText', () => {
  it('round-trips through parseMoneyInput', () => {
    for (const [minor, currency] of [[337_950, 'COP'], [78_650, 'EUR'], [1_999, 'USD']] as const) {
      expect(parseMoneyInput(toInputText(minor, currency), currency)).toBe(minor);
    }
  });
});
