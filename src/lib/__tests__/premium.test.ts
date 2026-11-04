import { describe, expect, it } from 'vitest';
import { canUse, PREMIUM_ENFORCED } from '../premium';

describe('canUse', () => {
  it('is on: Escanear and Dictar open only to Premium couples', () => {
    expect(PREMIUM_ENFORCED).toBe(true);
    for (const feature of ['scan', 'dictate'] as const) {
      expect(canUse(feature, 'free')).toBe(false);
      expect(canUse(feature, 'premium')).toBe(true);
    }
  });

  it('switched off, opens them to everyone', () => {
    for (const feature of ['scan', 'dictate'] as const) {
      expect(canUse(feature, 'free', false)).toBe(true);
      expect(canUse(feature, 'premium', false)).toBe(true);
    }
  });
});
