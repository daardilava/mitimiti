// The legal texts say the same thing in every language: no section or paragraph dropped, the provider and the
// contact address in each. Spanish is the binding version, so the others are checked against it.
import { describe, expect, it } from 'vitest';
import { privacyDe } from '../legal/privacy.de';
import { privacyEn } from '../legal/privacy.en';
import { privacyEs } from '../legal/privacy.es';
import { termsDe } from '../legal/terms.de';
import { termsEn } from '../legal/terms.en';
import { termsEs } from '../legal/terms.es';
import { LEGAL_CONTACT, type LegalDoc } from '../legal/types';

const shape = (doc: LegalDoc) => doc.sections.map((s) => s.paragraphs.length);
const numbers = (doc: LegalDoc) => doc.sections.map((s) => s.heading.split('.')[0]);
const text = (doc: LegalDoc) => doc.sections.flatMap((s) => s.paragraphs).join(' ');

const docs = {
  Terms: { es: termsEs, en: termsEn, de: termsDe },
  Privacy: { es: privacyEs, en: privacyEn, de: privacyDe },
};

describe.each(Object.entries(docs))('%s', (_, { es, en, de }) => {
  it.each([
    ['en', en],
    ['de', de],
  ] as const)('in %s has the same sections and paragraphs as the Spanish text', (_, doc) => {
    expect(shape(doc)).toEqual(shape(es));
    expect(numbers(doc)).toEqual(numbers(es));
  });

  it.each([
    ['es', es],
    ['en', en],
    ['de', de],
  ] as const)('in %s names the provider and the contact address, and says Spanish prevails', (_, doc) => {
    expect(text(doc)).toContain(LEGAL_CONTACT.owner);
    expect(text(doc)).toContain(LEGAL_CONTACT.email);
    expect(doc.sections.at(-1)!.paragraphs.join(' ')).toMatch(/español|Spanish|spanische/);
  });
});

describe.each([
  ['es', privacyEs],
  ['en', privacyEn],
  ['de', privacyDe],
] as const)('Privacy in %s', (_, doc) => {
  // Decreto 1377 de 2013: the controller's domicile; and the processors that actually hold the data, and where.
  it('names the controller’s domicile, both processors and where the data is hosted', () => {
    expect(text(doc)).toContain(LEGAL_CONTACT.city);
    expect(text(doc)).toMatch(/Clerk/);
    expect(text(doc)).toMatch(/Supabase/);
    expect(text(doc)).toMatch(/Irlanda|Ireland|Irland/);
  });
});
