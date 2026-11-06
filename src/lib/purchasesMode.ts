// Which purchases backend the app runs (src/api/purchases.ts). Pure, so the rules are tested without the native SDK.
//
// RevenueCat's Test Store keys (test_…) are for development builds only: the SDK crashes a release build configured
// with one, on purpose, and the whole app goes down with it. Here a test key outside __DEV__ means "no store" instead,
// so a misconfigured build still opens and only the paywall says the store is unavailable. docs/BILLING.md § 0.

/** native: the RevenueCat SDK · fake: sample offers (dev bypass, web) · unavailable: no usable API key. */
export type PurchasesMode = 'native' | 'fake' | 'unavailable';

export const isTestStoreKey = (key: string) => key.startsWith('test_');

export function purchasesModeFor(opts: {
  apiKey: string | undefined;
  devBypass: boolean;
  web: boolean;
  /** __DEV__: a development build, where RevenueCat allows Test Store keys. */
  dev: boolean;
}): PurchasesMode {
  if (opts.devBypass || opts.web) return 'fake';
  const key = opts.apiKey?.trim();
  if (!key) return 'unavailable';
  if (isTestStoreKey(key) && !opts.dev) return 'unavailable';
  return 'native';
}
