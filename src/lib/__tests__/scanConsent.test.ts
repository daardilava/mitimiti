import { describe, expect, it } from 'vitest';
import { SCAN_CONSENT_VERSION, hasScanConsent, scanConsentKey, scanConsentValue } from '../scanConsent';

describe('scan consent', () => {
  it('is kept per account', () => {
    expect(scanConsentKey('user_a')).not.toBe(scanConsentKey('user_b'));
  });

  it('counts only an answer to the current version', () => {
    expect(hasScanConsent(scanConsentValue())).toBe(true);
    expect(hasScanConsent(String(SCAN_CONSENT_VERSION - 1))).toBe(false);
    expect(hasScanConsent(null)).toBe(false);
    expect(hasScanConsent(undefined)).toBe(false);
    expect(hasScanConsent('true')).toBe(false);
  });
});
