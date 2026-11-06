import { describe, expect, it } from 'vitest';
import { numbersToDigits } from '../spokenNumbers';

describe('numbersToDigits › amounts with a currency', () => {
  it.each([
    ['veinte euros', '20 euros'],
    ['cena veinte euros', 'cena 20 euros'],
    ['Veinticinco euros', '25 euros'],
    ['treinta y cinco euros', '35 euros'],
    ['cien euros', '100 euros'],
    ['ciento cincuenta euros', '150 euros'],
    ['doscientos cincuenta euros', '250 euros'],
    ['mil quinientos euros', '1500 euros'],
    ['dos mil trescientos euros', '2300 euros'],
    ['veinticinco mil pesos', '25000 pesos'],
    ['ochenta mil pesos', '80000 pesos'],
    ['un millón de pesos', '1000000 de pesos'],
    ['un euro', '1 euro'],
    ['tres euros', '3 euros'],
    ['veinte dólares', '20 dólares'],
  ])('es: %s → %s', (said, digits) => {
    expect(numbersToDigits(said, 'es')).toBe(digits);
  });

  it.each([
    ['twenty euros', '20 euros'],
    ['dinner twenty euros', 'dinner 20 euros'],
    ['twenty-five euros', '25 euros'],
    ['twenty five dollars', '25 dollars'],
    ['one hundred euros', '100 euros'],
    ['a hundred euros', 'a 100 euros'],
    ['one hundred and five euros', '105 euros'],
    ['twelve hundred euros', '1200 euros'],
    ['two thousand five hundred dollars', '2500 dollars'],
  ])('en: %s → %s', (said, digits) => {
    expect(numbersToDigits(said, 'en')).toBe(digits);
  });

  it.each([
    ['zwanzig Euro', '20 Euro'],
    ['Abendessen fünfundzwanzig Euro', 'Abendessen 25 Euro'],
    ['einundzwanzig Euro', '21 Euro'],
    ['hundert Euro', '100 Euro'],
    ['zweihundertfünfzig Euro', '250 Euro'],
    ['tausendfünfhundert Euro', '1500 Euro'],
    ['zwölf Euro', '12 Euro'],
    ['dreißig Euro', '30 Euro'],
  ])('de: %s → %s', (said, digits) => {
    expect(numbersToDigits(said, 'de')).toBe(digits);
  });

  it('reads an English amount in any app language', () => {
    expect(numbersToDigits('cena twenty euros', 'es')).toBe('cena 20 euros');
    expect(numbersToDigits('twenty euros', 'de')).toBe('20 euros');
  });
});

describe('numbersToDigits › cents and decimals', () => {
  it.each([
    ['es', 'diez euros con cincuenta', '10,50 euros'],
    ['es', 'doce euros con cinco céntimos', '12,05 euros'],
    ['es', 'doce coma cincuenta', '12,50'],
    ['es', 'doce coma cincuenta euros', '12,50 euros'],
    ['en', 'twelve euros fifty', '12,50 euros'],
    ['en', 'twenty dollars and fifty cents', '20,50 dollars'],
    ['en', 'twelve point five euros', '12,5 euros'],
    ['es', 'doce cincuenta', '12,50'],
    ['es', 'veinte ochenta euros', '20,80 euros'],
    ['en', 'twelve fifty', '12,50'],
    ['de', 'zwölf fünfzig', '12,50'],
    ['de', 'zwölf Euro fünfzig', '12,50 Euro'],
    ['de', 'zwanzig Euro und fünfzig Cent', '20,50 Euro'],
    ['es', '20 euros con 50', '20,50 euros'],
  ] as const)('%s: %s → %s', (language, said, digits) => {
    expect(numbersToDigits(said, language)).toBe(digits);
  });
});

describe('numbersToDigits › the only number in the sentence', () => {
  it.each([
    ['es', 'cena veinte', 'cena 20'],
    ['es', 'mercado ochenta mil pagó Ana', 'mercado 80000 pagó Ana'],
    ['en', 'lunch fifteen', 'lunch 15'],
    ['de', 'Kaffee vier', 'Kaffee 4'],
  ] as const)('%s: %s → %s', (language, said, digits) => {
    expect(numbersToDigits(said, language)).toBe(digits);
  });
});

describe('numbersToDigits › splits and dates', () => {
  it.each([
    ['es', 'arriendo mil euros sesenta cuarenta', 'arriendo 1000 euros 60/40'],
    ['es', 'cena treinta euros cincuenta cincuenta', 'cena 30 euros 50/50'],
    ['en', 'rent nine hundred dollars sixty forty', 'rent 900 dollars 60/40'],
    ['de', 'Miete tausend Euro sechzig vierzig', 'Miete 1000 Euro 60/40'],
    ['es', 'cena veinte euros hace tres días', 'cena 20 euros hace 3 días'],
    ['en', 'dinner twenty euros three days ago', 'dinner 20 euros 3 days ago'],
    ['de', 'Essen zwanzig Euro vor drei Tagen', 'Essen 20 Euro vor 3 Tagen'],
  ] as const)('%s: %s → %s', (language, said, digits) => {
    expect(numbersToDigits(said, language)).toBe(digits);
  });
});

describe('numbersToDigits › leaves words that are not an amount', () => {
  it.each([
    ['es', 'un café'],
    ['es', 'pagamos los dos'],
    ['es', 'cena 20 euros entre los dos'],
    ['es', 'cena 20 euros el tres de noviembre'],
    ['es', 'pizza y cerveza'],
    ['en', 'a coffee for the two of us'],
    ['en', 'paid once'],
    ['de', 'ein Kaffee'],
    ['de', 'eine Pizza'],
    ['es', 'almuerzo 25.000 pesos'],
    ['es', 'mercado 42,50 pagó Melanie'],
  ] as const)('%s: %s', (language, said) => {
    expect(numbersToDigits(said, language)).toBe(said);
  });

  it('turns the amount into digits and leaves the date in words', () => {
    expect(numbersToDigits('cena veinte euros el tres de noviembre', 'es')).toBe('cena 20 euros el tres de noviembre');
    expect(numbersToDigits('cena veinte euros, pagamos los dos', 'es')).toBe('cena 20 euros, pagamos los dos');
  });

  it('keeps the "y" that joins two things, not two numbers', () => {
    expect(numbersToDigits('veinte euros y una cerveza', 'es')).toBe('20 euros y una cerveza');
  });

  it('does not guess between two numbers without a currency', () => {
    expect(numbersToDigits('cena veinte con treinta invitados', 'es')).toBe('cena veinte con treinta invitados');
  });
});
