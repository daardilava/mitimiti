// Escanear and Dictar are Premium (docs/PLAN.md › Scan + Dictate): a Free couple who taps them gets the paywall.
// This is the one switch (with RECEIPT_PREMIUM_ONLY=1 on the read-receipt function, so the server refuses Free couples
// too); the plan from my_plan() decides through canUseFeature() in plans.ts, the single place that says what each
// plan allows. Set it to false only to open both to everyone again.
import { canUseFeature, type Plan } from './plans';

export const PREMIUM_ENFORCED = true;

export type PremiumFeature = 'scan' | 'dictate';

export function canUse(feature: PremiumFeature, plan: Plan, enforced: boolean = PREMIUM_ENFORCED): boolean {
  return !enforced || canUseFeature(plan, feature);
}
