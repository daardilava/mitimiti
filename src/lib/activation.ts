// After a purchase the store and RevenueCat confirm first; the couple's row in Supabase follows a moment later (the
// app asks the server to sync, and the webhook arrives within seconds). Meanwhile the paywall says "Activando
// Premium…" and checks my_plan() on this schedule, about 20 s in all, before saying it is taking longer.

/** Waits between checks, in ms: quick at first, then backing off. 20 s in total. */
export const ACTIVATION_DELAYS_MS = [500, 1000, 1500, 2000, 3000, 5000, 7000] as const;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Calls `check` once at once, then after each delay, until it says true. Resolves true as soon as it does, false when
 * the schedule runs out. A check that throws (offline for a moment) counts as "not yet".
 */
export async function waitUntil(
  check: () => Promise<boolean>,
  delays: readonly number[] = ACTIVATION_DELAYS_MS,
  sleep: (ms: number) => Promise<void> = pause,
): Promise<boolean> {
  for (let i = 0; i <= delays.length; i++) {
    try {
      if (await check()) return true;
    } catch {
      // Not yet; try again on schedule.
    }
    if (i < delays.length) await sleep(delays[i]);
  }
  return false;
}
