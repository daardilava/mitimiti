import { describe, expect, it } from 'vitest';
import { ACTIVATION_DELAYS_MS, waitUntil } from '../activation';

/** A clock that records each wait instead of waiting. */
const fakeSleep = () => {
  const waits: number[] = [];
  return { waits, sleep: async (ms: number) => void waits.push(ms) };
};

describe('waitUntil', () => {
  it('the schedule backs off and adds up to about 20 s', () => {
    const total = ACTIVATION_DELAYS_MS.reduce((a, b) => a + b, 0);
    expect(total).toBe(20_000);
    expect([...ACTIVATION_DELAYS_MS]).toEqual([...ACTIVATION_DELAYS_MS].sort((a, b) => a - b));
  });

  it('stops at the first yes, without waiting more', async () => {
    const { waits, sleep } = fakeSleep();
    let calls = 0;
    expect(await waitUntil(async () => ++calls === 3, ACTIVATION_DELAYS_MS, sleep)).toBe(true);
    expect(calls).toBe(3);
    expect(waits).toEqual([500, 1000]);
  });

  it('already active: no wait at all', async () => {
    const { waits, sleep } = fakeSleep();
    expect(await waitUntil(async () => true, ACTIVATION_DELAYS_MS, sleep)).toBe(true);
    expect(waits).toEqual([]);
  });

  it('gives up after the last check, once the schedule runs out', async () => {
    const { waits, sleep } = fakeSleep();
    let calls = 0;
    expect(await waitUntil(async () => (++calls, false), ACTIVATION_DELAYS_MS, sleep)).toBe(false);
    expect(calls).toBe(ACTIVATION_DELAYS_MS.length + 1);
    expect(waits).toEqual([...ACTIVATION_DELAYS_MS]);
  });

  it('a check that throws counts as not yet', async () => {
    const { sleep } = fakeSleep();
    let calls = 0;
    const flaky = async () => {
      calls++;
      if (calls === 1) throw new Error('offline');
      return calls === 2;
    };
    expect(await waitUntil(flaky, ACTIVATION_DELAYS_MS, sleep)).toBe(true);
  });
});
