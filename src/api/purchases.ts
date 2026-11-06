// App Store and Google Play purchases through RevenueCat (Phase 6 — Billing, docs/PLAN.md). The phone only buys and
// restores; whether the couple is Premium is Supabase's answer (src/api/plan.ts › usePlan), written by the server.
//
// RevenueCat knows each person by their Clerk id (app_user_id = user_…): usePlanSync() logs in when a session starts
// and out when it ends, whatever ended it (Cerrar sesión, Borrar cuenta, an expired session).
//
// Native code: needs a development build. Expo Go runs the SDK in RevenueCat's Preview API Mode (mocks, no real
// purchases). With EXPO_PUBLIC_DEV_BYPASS_AUTH=1 or on web the SDK is never touched: a fake answers instead.
import { Linking, Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { periodOf, trialDays, type PlanPackage } from '@/lib/offerings';
import { isTestStoreKey, purchasesModeFor, type PurchasesMode } from '@/lib/purchasesMode';
import { setSamplePlan } from '@/lib/sample';
import { DEV_BYPASS_AUTH } from '@/lib/session';

/** The RevenueCat entitlement that is MitiMiti Premium (the same id as supabase/functions/_shared/billing.ts). */
const PREMIUM = 'premium';

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: undefined,
})?.trim();

/** native: the RevenueCat SDK · fake: sample offers (dev bypass, web) · unavailable: no usable API key. */
export const purchasesMode: PurchasesMode = purchasesModeFor({
  apiKey: API_KEY,
  devBypass: DEV_BYPASS_AUTH,
  web: Platform.OS === 'web',
  dev: __DEV__,
});

if (!__DEV__ && API_KEY && isTestStoreKey(API_KEY)) {
  console.error('[purchases] RevenueCat Test Store key in a release build: purchases are off. Use the appl_/goog_ key.');
}

export type PurchaseResult = 'purchased' | 'cancelled';

export class PurchasesUnavailable extends Error {
  constructor() {
    super('purchases_unavailable');
  }
}

let configured = false;

function sdk(): typeof Purchases {
  if (purchasesMode !== 'native') throw new PurchasesUnavailable();
  if (!configured) {
    Purchases.configure({ apiKey: API_KEY! });
    if (__DEV__) Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    configured = true;
  }
  return Purchases;
}

// The last logIn / logOut. Buying, restoring and reading the customer wait for it, so a purchase made right after
// switching accounts never lands on the previous one.
let identity: Promise<void> = Promise.resolve();

/** Follows the session: log in with the Clerk id, or out when signed out. Never fails the caller. */
export function identify(userId: string | null): Promise<void> {
  if (purchasesMode !== 'native') return identity;
  identity = identity.then(async () => {
    try {
      const p = sdk();
      if (userId) await p.logIn(userId);
      else if (!(await p.isAnonymous())) await p.logOut();
    } catch (e) {
      console.warn('[purchases] identify failed', e);
    }
  });
  return identity;
}

/** Whether the store, through RevenueCat, says this person has Premium right now. False when it can't tell. */
export async function premiumInStore(): Promise<boolean> {
  if (purchasesMode !== 'native') return false;
  try {
    await identity;
    return (await sdk().getCustomerInfo()).entitlements.active[PREMIUM] !== undefined;
  } catch (e) {
    console.warn('[purchases] customer info failed', e);
    return false;
  }
}

// The SDK packages behind what getOfferings() returned, to buy the one the person picked.
const packages = new Map<string, PurchasesPackage>();

/** The current offering's monthly and annual plans. */
export async function getOfferings(): Promise<PlanPackage[]> {
  if (purchasesMode === 'fake') return FAKE_OFFERING;
  const offerings = await sdk().getOfferings();
  packages.clear();
  const plans: PlanPackage[] = [];
  for (const pkg of offerings.current?.availablePackages ?? []) {
    const period = periodOf(pkg.packageType);
    if (!period) continue;
    packages.set(pkg.identifier, pkg);
    plans.push({
      id: pkg.identifier,
      period,
      priceString: pkg.product.priceString,
      price: pkg.product.price,
      currencyCode: pkg.product.currencyCode,
      trialDays: trialDays(pkg.product.introPrice),
    });
  }
  return plans;
}

const isCancelled = (e: unknown) => {
  const err = e as { userCancelled?: boolean | null; code?: string };
  return err?.userCancelled === true || err?.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
};

export async function purchase(plan: PlanPackage): Promise<PurchaseResult> {
  if (purchasesMode === 'fake') {
    if (!DEV_BYPASS_AUTH) throw new PurchasesUnavailable(); // web against the real backend: no store to buy from
    setSamplePlan('premium');
    notify();
    return 'purchased';
  }
  const pkg = packages.get(plan.id);
  if (!pkg) throw new Error(`unknown_package:${plan.id}`);
  await identity;
  try {
    await sdk().purchasePackage(pkg);
    return 'purchased';
  } catch (e) {
    if (isCancelled(e)) return 'cancelled';
    throw e;
  }
}

/** Restaurar compras: the store's purchases for this account, attached to the signed-in person again. */
export async function restore(): Promise<void> {
  if (purchasesMode === 'fake') return;
  await identity;
  await sdk().restorePurchases();
}

// The stores' own subscription pages, when RevenueCat has no management URL (Apple: apps.apple.com/account/subscriptions).
const STORE_SUBSCRIPTIONS = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
  default: undefined,
});

/**
 * Administrar suscripción: the store's page for this subscription, where it is cancelled or the payment fixed.
 * RevenueCat's managementURL points at the store it was bought in, even when that is the other platform's.
 * False when there is nowhere to send the person (web).
 */
export async function manageSubscriptions(): Promise<boolean> {
  let url: string | null | undefined = STORE_SUBSCRIPTIONS;
  if (purchasesMode === 'native') {
    try {
      await identity;
      url = (await sdk().getCustomerInfo()).managementURL ?? url;
    } catch (e) {
      console.warn('[purchases] customer info failed', e);
    }
  }
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
let sdkListening = false;

/** Called when the SDK learns something new about this customer (a renewal, a refund, another device). */
export function onCustomerInfo(listener: () => void): () => void {
  listeners.add(listener);
  if (purchasesMode === 'native' && !sdkListening) {
    sdk().addCustomerInfoUpdateListener(notify);
    sdkListening = true;
  }
  return () => {
    listeners.delete(listener);
  };
}

/** The dev fake's offer: the decided prices (2,99 €/month, 19,99 €/year with a 7-day trial). */
const FAKE_OFFERING: PlanPackage[] = [
  { id: '$rc_annual', period: 'annual', priceString: '19,99 €', price: 19.99, currencyCode: 'EUR', trialDays: 7 },
  { id: '$rc_monthly', period: 'monthly', priceString: '2,99 €', price: 2.99, currencyCode: 'EUR', trialDays: null },
];
