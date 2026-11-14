// Escanear sends the receipt photo to Anthropic (an AI provider), so each person agrees once, on each phone, before
// the first photo leaves it (App Review 5.1.2(i); Privacidad §3 says the same). The answer is kept per account, so
// another account signing in on the same phone is asked again.
//
// Bump SCAN_CONSENT_VERSION when what is sent, or to whom, changes: everyone is asked again.
export const SCAN_CONSENT_VERSION = 1;

export const scanConsentKey = (userId: string) => `mitimiti.scanConsent.${userId}`;

/** True only for an answer given to the current version of the question. */
export const hasScanConsent = (stored: string | null | undefined) => stored === String(SCAN_CONSENT_VERSION);

export const scanConsentValue = () => String(SCAN_CONSENT_VERSION);
