import { describe, expect, it } from 'vitest';
import { canUse, PREMIUM_ENFORCED } from '../premium';

describe('canUse', () => {
  it('opens Escanear and Dictar to everyone while the gate is off', () => {
    expect(PREMIUM_ENFORCED).toBe(false);
    for (const feature of ['scan', 'dictate'] as const) {
      expect(canUse(feature, 'free')).toBe(true);
      expect(canUse(feature, 'premium')).toBe(true);
    }
  });

  it('once enforced, opens them only to Premium couples', () => {
    for (const feature of ['scan', 'dictate'] as const) {
      expect(canUse(feature, 'free', true)).toBe(false);
      expect(canUse(feature, 'premium', true)).toBe(true);
    }
  });
});
