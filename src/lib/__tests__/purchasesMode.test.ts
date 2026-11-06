import { describe, expect, it } from 'vitest';
import { isTestStoreKey, purchasesModeFor } from '../purchasesMode';

const base = { apiKey: 'goog_abc', devBypass: false, web: false, dev: false };

describe('purchasesModeFor', () => {
  it('a platform key runs the SDK, in development and release builds', () => {
    expect(purchasesModeFor(base)).toBe('native');
    expect(purchasesModeFor({ ...base, apiKey: 'appl_abc' })).toBe('native');
    expect(purchasesModeFor({ ...base, dev: true })).toBe('native');
  });

  it('a Test Store key runs the SDK only in a development build (RevenueCat crashes release builds with one)', () => {
    expect(purchasesModeFor({ ...base, apiKey: 'test_abc', dev: true })).toBe('native');
    expect(purchasesModeFor({ ...base, apiKey: 'test_abc', dev: false })).toBe('unavailable');
  });

  it('no key, or only spaces, means no store', () => {
    expect(purchasesModeFor({ ...base, apiKey: undefined })).toBe('unavailable');
    expect(purchasesModeFor({ ...base, apiKey: '' })).toBe('unavailable');
    expect(purchasesModeFor({ ...base, apiKey: '  ' })).toBe('unavailable');
  });

  it('dev bypass and web never touch the SDK, whatever the key', () => {
    expect(purchasesModeFor({ ...base, devBypass: true })).toBe('fake');
    expect(purchasesModeFor({ ...base, web: true, apiKey: undefined })).toBe('fake');
    expect(purchasesModeFor({ ...base, web: true, apiKey: 'test_abc' })).toBe('fake');
  });
});

describe('isTestStoreKey', () => {
  it('only test_… keys', () => {
    expect(isTestStoreKey('test_abc')).toBe(true);
    expect(isTestStoreKey('goog_test_abc')).toBe(false);
    expect(isTestStoreKey('appl_abc')).toBe(false);
  });
});
