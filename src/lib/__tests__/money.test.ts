import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyCompact, parseMoneyInput, parseSpokenAmount, toDecimalText, toInputText } from '../money';

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

describe('parseSpokenAmount', () => {
  const read = (text: string, currency: 'COP' | 'EUR' | 'USD') => parseSpokenAmount(text, currency);

  it('reads plain numbers like the amount field', () => {
    expect(read('4500', 'COP')).toEqual({ amountMinor: 4_500, ambiguous: false });
    expect(read('4.500', 'COP')).toEqual({ amountMinor: 4_500, ambiguous: false });
    expect(read('4,500', 'COP')).toEqual({ amountMinor: 4_500, ambiguous: false });
    expect(read('2.400.000', 'COP')).toEqual({ amountMinor: 2_400_000, ambiguous: false });
    expect(read('4,50', 'EUR')).toEqual({ amountMinor: 450, ambiguous: false });
    expect(read('4.500', 'EUR')).toEqual({ amountMinor: 450_000, ambiguous: false });
    expect(read('1.234,50', 'EUR')).toEqual({ amountMinor: 123_450, ambiguous: false });
    expect(read('1,234.50', 'USD')).toEqual({ amountMinor: 123_450, ambiguous: false });
    expect(read('2,400', 'USD')).toEqual({ amountMinor: 240_000, ambiguous: false });
  });

  it('takes a dot or a comma before 1–2 digits as decimals in EUR and USD', () => {
    expect(read('4.50', 'EUR').amountMinor).toBe(450);
    expect(read('4,50', 'USD').amountMinor).toBe(450);
    expect(read('7,5', 'EUR').amountMinor).toBe(750);
  });

  it('flags what could mean two amounts', () => {
    expect(read('4,50', 'COP').ambiguous).toBe(true); // COP has no cents
    expect(read('4.50', 'COP').ambiguous).toBe(true);
    expect(read('4,500', 'EUR').ambiguous).toBe(true); // 4,5 € or 4.500 €?
    expect(read('4.500', 'USD').ambiguous).toBe(true);
    expect(read('12,345', 'EUR').ambiguous).toBe(true);
    expect(read('1.2.3', 'COP').ambiguous).toBe(true);
  });

  it('allows zero cents in COP', () => {
    expect(read('20.000,00', 'COP')).toEqual({ amountMinor: 20_000, ambiguous: false });
  });

  it('reads thousands and millions in words', () => {
    expect(read('20 mil', 'COP').amountMinor).toBe(20_000);
    expect(read('20k', 'COP').amountMinor).toBe(20_000);
    expect(read('20 lucas', 'COP').amountMinor).toBe(20_000);
    expect(read('1,2 M', 'COP').amountMinor).toBe(1_200_000);
    expect(read('1.5 millones', 'COP').amountMinor).toBe(1_500_000);
    expect(read('1,2 mil', 'EUR').amountMinor).toBe(120_000);
    expect(read('2 Tsd.', 'EUR').amountMinor).toBe(200_000);
    expect(read('1,5 Mio.', 'EUR').amountMinor).toBe(150_000_000);
    expect(read('1.2k', 'USD').amountMinor).toBe(120_000);
    expect(read('1.2k', 'USD').ambiguous).toBe(false);
  });

  it('ignores currency symbols and words around the number', () => {
    expect(read('$20.000', 'COP').amountMinor).toBe(20_000);
    expect(read('$ 20.000 pesos', 'COP').amountMinor).toBe(20_000);
    expect(read('12,40 €', 'EUR').amountMinor).toBe(1_240);
    expect(read('18 euros', 'EUR').amountMinor).toBe(1_800);
    expect(read('US$64.20', 'USD').amountMinor).toBe(6_420);
  });

  it('never returns a negative or zero amount', () => {
    expect(read('0', 'COP').amountMinor).toBe(0);
    expect(read('-5.000', 'COP').amountMinor).toBe(0);
    expect(read('', 'EUR').amountMinor).toBe(0);
    expect(read('café', 'EUR').amountMinor).toBe(0);
  });
});

describe('toInputText', () => {
  it('round-trips through parseMoneyInput', () => {
    for (const [minor, currency] of [[337_950, 'COP'], [78_650, 'EUR'], [1_999, 'USD']] as const) {
      expect(parseMoneyInput(toInputText(minor, currency), currency)).toBe(minor);
    }
  });
});

describe('formatMoneyCompact', () => {
  it('shortens axis labels per currency', () => {
    expect(formatMoneyCompact(0, 'COP')).toBe('$0');
    expect(formatMoneyCompact(200_000, 'COP')).toBe('$200 mil');
    expect(formatMoneyCompact(1_500_000, 'COP')).toBe('$1,5 M');
    expect(formatMoneyCompact(120_000, 'EUR')).toBe('1,2 mil €');
    expect(formatMoneyCompact(250_000, 'USD')).toBe('US$2.5K');
    expect(formatMoneyCompact(50_00, 'USD')).toBe('US$50');
  });
});

describe('toDecimalText', () => {
  it('writes plain numbers a spreadsheet can sum: no symbol, no grouping', () => {
    expect(toDecimalText(2_400_000, 'COP')).toBe('2400000');
    expect(toDecimalText(123_450, 'EUR')).toBe('1234.50');
    expect(toDecimalText(123_450, 'EUR', ',')).toBe('1234,50');
    expect(toDecimalText(5, 'USD')).toBe('0.05');
    expect(toDecimalText(100, 'USD')).toBe('1.00');
    expect(toDecimalText(0, 'EUR')).toBe('0.00');
  });

  it('keeps the sign', () => {
    expect(toDecimalText(-1_050, 'EUR', ',')).toBe('-10,50');
    expect(toDecimalText(-184_000, 'COP')).toBe('-184000');
  });
});
