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
});
