// Escanear and Dictar are Premium (docs/PLAN.md › Scan + Dictate). While store billing is being tested the gate is
// off: both screens open for everyone and the crown is only a label. This is the one switch: set PREMIUM_ENFORCED to
// true (and RECEIPT_PREMIUM_ONLY=1 on the read-receipt function) and the plan from my_plan() decides, through
// canUseFeature() in plans.ts, which stays the single place that says what each plan allows.
import { canUseFeature, type Plan } from './plans';

export const PREMIUM_ENFORCED = false;

export type PremiumFeature = 'scan' | 'dictate';

export function canUse(feature: PremiumFeature, plan: Plan, enforced: boolean = PREMIUM_ENFORCED): boolean {
  return !enforced || canUseFeature(plan, feature);
}
