// The store's Premium offer in the app's own shape, so the paywall never depends on the RevenueCat SDK's types and
// the dev fake (src/api/purchases.ts) can produce the same thing. Prices are always the store's localized strings.

export interface PlanPackage {
  /** RevenueCat package identifier ($rc_monthly, $rc_annual…). */
  id: string;
  period: 'monthly' | 'annual';
  /** The store's localized price, shown as is: "19,99 €", "US$19.99", "$79.900". */
  priceString: string;
  /** Only for comparing the two plans (savings); never shown. */
  price: number;
  currencyCode: string;
  /** Length of a free trial in days, when the store offers one to this person. */
  trialDays: number | null;
}

const DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/** A free introductory period → its length in days; a paid intro price, or none, is not a trial. */
export function trialDays(intro: { price: number; periodUnit: string; periodNumberOfUnits: number } | null | undefined): number | null {
  if (!intro || intro.price !== 0) return null;
  const unit = DAYS[intro.periodUnit.toUpperCase()];
  return unit && intro.periodNumberOfUnits > 0 ? unit * intro.periodNumberOfUnits : null;
}

/** RevenueCat's package types for the two plans; anything else in the offering is left out. */
export function periodOf(packageType: string): PlanPackage['period'] | null {
  return packageType === 'MONTHLY' ? 'monthly' : packageType === 'ANNUAL' ? 'annual' : null;
}
