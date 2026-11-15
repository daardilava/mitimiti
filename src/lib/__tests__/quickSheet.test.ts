import { describe, expect, it } from 'vitest';
import { recognitionLocale } from '../quickSheet';

describe('recognitionLocale', () => {
  it("dictates in the app's language, in the phone's region when it matches", () => {
    expect(recognitionLocale('es', ['es-CO', 'en-US'])).toBe('es-CO');
    expect(recognitionLocale('de', ['en-US', 'de-AT'])).toBe('de-AT');
    expect(recognitionLocale('es', ['de-DE'])).toBe('es-ES');
    expect(recognitionLocale('en', ['en'])).toBe('en-US');
    expect(recognitionLocale('es', ['es_MX'])).toBe('es-MX');
  });

  it('keeps to a locale the phone can recognise (iOS has no es-DE)', () => {
    const ios = ['de-DE', 'en-US', 'es-CO', 'es-ES', 'es-MX', 'es-US'];
    expect(recognitionLocale('es', ['es-DE', 'de-DE'], ios)).toBe('es-ES');
    expect(recognitionLocale('es', ['es-CO'], ios)).toBe('es-CO');
    expect(recognitionLocale('es', ['es-419', 'es-MX'], ios)).toBe('es-MX');
    expect(recognitionLocale('es', ['es_CO'], ['es_CO', 'es_ES'])).toBe('es-CO');
    expect(recognitionLocale('es', ['es-DE'], ['es-MX', 'en-US'])).toBe('es-MX');
    expect(recognitionLocale('de', ['de-CH'], ['de_DE'])).toBe('de-DE');
    expect(recognitionLocale('es', ['es-DE'], ['en-US'])).toBe('es-ES');
  });
});
