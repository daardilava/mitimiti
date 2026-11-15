// Dictation for Dictar (src/app/expense/dictate.tsx): the phone's own speech recognition turns speech into
// text, which goes through the phrase parser (src/lib/quickEntry.ts). No audio reaches our servers.
//
// Native code (expo-speech-recognition): needs a development build. In Expo Go and on web the module isn't there, so
// dictationAvailable() is false and the sheet hides the mic; typing still works.
import { requireOptionalNativeModule } from 'expo';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';
import type { QuickEntryContext } from '@/lib/quickEntry';
import { recognitionLocale } from '@/lib/quickSheet';

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

const speech = requireOptionalNativeModule<SpeechModule>('ExpoSpeechRecognition');

export function dictationAvailable(): boolean {
  try {
    return !!speech?.isRecognitionAvailable();
  } catch {
    return false;
  }
}

/** True before the first permission dialog: the sheet says why it needs the microphone, then asks. */
export async function dictationNeedsExplanation(): Promise<boolean> {
  if (!speech) return false;
  try {
    const p = await speech.getPermissionsAsync();
    return !p.granted && p.canAskAgain;
  } catch {
    return false;
  }
}

// iOS only recognises some locales (no es-DE): ask once which. Android takes any tag, as before.
let supportedOnce: Promise<string[]> | null = null;
function supportedLocales(): Promise<string[]> {
  if (!speech || Platform.OS !== 'ios') return Promise.resolve([]);
  supportedOnce ??= speech
    .getSupportedLocales({})
    .then((r) => r.locales)
    .catch(() => []);
  return supportedOnce;
}

export type DictationState = 'idle' | 'listening';
/** denied: no microphone or speech permission. none: nothing was heard. failed: anything else. */
export type DictationError = 'denied' | 'none' | 'failed';

const errorOf = (code: ExpoSpeechRecognitionErrorCode): DictationError | null =>
  code === 'aborted' ? null : code === 'not-allowed' ? 'denied' : code === 'no-speech' || code === 'speech-timeout' ? 'none' : 'failed';

/**
 * Tap to talk: start() on the first tap, stop() on the second (or silence ends it). `onText` gets the transcript as it
 * grows (final = true once the phone is done). It listens in the app's `language`, in the region of `phoneTags` (the
 * phone's BCP-47 locales) when the recogniser has it (src/lib/quickSheet.ts › recognitionLocale).
 */
export function useDictation(language: QuickEntryContext['language'], phoneTags: string[], onText: (text: string, final: boolean) => void) {
  const [state, setState] = useState<DictationState>('idle');
  const [error, setError] = useState<DictationError | null>(null);
  const handler = useRef(onText);
  useEffect(() => {
    handler.current = onText;
  });

  useEffect(() => {
    if (!speech) return;
    const subs = [
      speech.addListener('start', () => setState('listening')),
      speech.addListener('end', () => setState('idle')),
      speech.addListener('result', (e) => {
        const text = e.results[0]?.transcript?.trim();
        if (text) handler.current(text, e.isFinal);
      }),
      speech.addListener('error', (e) => {
        const err = errorOf(e.error);
        if (err) setError(err);
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      speech.abort();
    };
  }, []);

  const start = async () => {
    if (!speech) return;
    setError(null);
    // Asked the first time the mic is used; the sheet explains why before the system dialog.
    const permission = await speech.requestPermissionsAsync();
    if (!permission.granted) {
      setError('denied');
      return;
    }
    const lang = recognitionLocale(language, phoneTags, await supportedLocales());
    speech.start({ lang, interimResults: true, continuous: false, addsPunctuation: false });
  };

  const stop = () => speech?.stop();

  return { state, error, start, stop };
}
