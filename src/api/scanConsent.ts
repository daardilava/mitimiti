import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { hasScanConsent, scanConsentKey, scanConsentValue } from '@/lib/scanConsent';

export type ScanConsent = 'loading' | 'ask' | 'granted';

/**
 * Whether this account agreed, on this phone, to send receipt photos to Anthropic (src/lib/scanConsent.ts).
 * Storage that can't be read counts as no answer, so the question is asked again rather than skipped.
 */
export function useScanConsent(userId: string) {
  // Which account the answer belongs to: a different account reads as loading until its own answer arrives.
  const [answer, setAnswer] = useState<{ userId: string; granted: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(scanConsentKey(userId))
      .then((stored) => live && setAnswer({ userId, granted: hasScanConsent(stored) }))
      .catch(() => live && setAnswer({ userId, granted: false }));
    return () => {
      live = false;
    };
  }, [userId]);

  // The answer applies now even if it can't be saved; then it's simply asked again next time.
  const grant = useCallback(() => {
    setAnswer({ userId, granted: true });
    AsyncStorage.setItem(scanConsentKey(userId), scanConsentValue()).catch(() => {});
  }, [userId]);

  const state: ScanConsent = answer?.userId !== userId ? 'loading' : answer.granted ? 'granted' : 'ask';
  return { state, grant };
}
