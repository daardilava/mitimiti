// Legal documents (Términos y condiciones, and next the Política de privacidad), one file per language.
// The Spanish text is the binding version; English and German are translations of it.

/** Who offers the app and how to reach them. Shown in the texts and used by the contact button. */
export const LEGAL_CONTACT = {
  owner: 'Diego Armando Ardila Vargas',
  email: 'diegoab2010@gmail.com',
} as const;

/** Change `effective` in every language whenever a text changes. */
export interface LegalDoc {
  /** "Vigentes desde el 20 de octubre de 2026" */
  effective: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
  /** Label of the button that writes to LEGAL_CONTACT.email. */
  contact: string;
}
