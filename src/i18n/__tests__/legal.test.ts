// The legal texts say the same thing in every language: no section or paragraph dropped, the provider and the
// contact address in each. Spanish is the binding version, so the others are checked against it.
import { describe, expect, it } from 'vitest';
import { termsDe } from '../legal/terms.de';
import { termsEn } from '../legal/terms.en';
import { termsEs } from '../legal/terms.es';
import { LEGAL_CONTACT, type LegalDoc } from '../legal/types';

const shape = (doc: LegalDoc) => doc.sections.map((s) => s.paragraphs.length);

describe.each([
  ['en', termsEn],
  ['de', termsDe],
] as const)('Terms in %s', (_, doc) => {
  it('has the same sections and paragraphs as the Spanish text', () => {
    expect(shape(doc)).toEqual(shape(termsEs));
    // Same numbering: "1. …", "2. …"
    expect(doc.sections.map((s) => s.heading.split('.')[0])).toEqual(termsEs.sections.map((s) => s.heading.split('.')[0]));
  });
});

describe.each([
  ['es', termsEs],
  ['en', termsEn],
  ['de', termsDe],
] as const)('Terms in %s', (_, doc) => {
  it('names the provider and the contact address', () => {
    const text = doc.sections.flatMap((s) => s.paragraphs).join(' ');
    expect(text).toContain(LEGAL_CONTACT.owner);
    expect(text).toContain(LEGAL_CONTACT.email);
  });

  it('says the Spanish version prevails', () => {
    expect(doc.sections.at(-1)!.paragraphs.join(' ')).toMatch(/español|Spanish|spanische/);
  });
});
