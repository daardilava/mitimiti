// Sign-in through Clerk: email + password, or Google / Apple in the system browser. Sign-out ends the Clerk session.
// Success only activates the session; useSessionSync then loads the couple and the guards route.
import { getClerkInstance, useSignIn, useSignUp, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import {
  AuthFlowError,
  finishPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  startPasswordReset,
  verifyDevice,
  verifySignUp,
  type SignUpInput,
} from '@/lib/authFlow';

export { authErrorMessage } from '@/lib/authFlow';

// On web the OAuth popup lands back on this app; this closes it and hands the URL to the opener.
WebBrowser.maybeCompleteAuthSession();

export type Provider = 'apple' | 'google';

/** Iniciar sesión: password, then a code by email if Clerk does not know this device yet. */
export function usePasswordSignIn() {
  const { signIn } = useSignIn();
  const start = useCallback((email: string, password: string) => signInWithPassword(signIn, email, password), [signIn]);
  const confirmDevice = useCallback((code: string) => verifyDevice(signIn, code), [signIn]);
  const resendDeviceCode = useCallback(async () => {
    const { error } = await signIn.mfa.sendEmailCode();
    if (error) throw error;
  }, [signIn]);
  return { start, confirmDevice, resendDeviceCode };
}

/** Crea tu cuenta: create it, then confirm the email with the code Clerk sends. */
export function usePasswordSignUp() {
  const { signUp } = useSignUp();
  const start = useCallback((input: SignUpInput) => signUpWithPassword(signUp, input), [signUp]);
  const resendCode = useCallback(async () => {
    const { error } = await signUp.verifications.sendEmailCode();
    if (error) throw error;
  }, [signUp]);
  const verify = useCallback((code: string) => verifySignUp(signUp, code), [signUp]);
  return { start, resendCode, verify };
}

/** ¿Olvidaste tu contraseña?: a code by email, then a new password, then signed in. */
export function usePasswordReset() {
  const { signIn } = useSignIn();
  const start = useCallback((email: string) => startPasswordReset(signIn, email), [signIn]);
  const finish = useCallback((code: string, password: string) => finishPasswordReset(signIn, code, password), [signIn]);
  return { start, finish };
}

/** Google or Apple in the system browser (a popup on web). Resolves false when the person closed it. */
export function useOAuth() {
  const { startSSOFlow } = useSSO();

  return useCallback(
    async (provider: Provider): Promise<boolean> => {
      // Android keeps the browser tab around unless it was warmed up first.
      if (Platform.OS === 'android') await WebBrowser.warmUpAsync();
      try {
        const { createdSessionId, setActive, signUp } = await startSSOFlow({ strategy: `oauth_${provider}` });
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          return true;
        }
        // Back from the browser without a session: either cancelled, or Clerk wants more sign-up fields.
        if (signUp?.status === 'missing_requirements') throw new AuthFlowError('missing_requirements');
        return false;
      } finally {
        if (Platform.OS === 'android') await WebBrowser.coolDownAsync();
      }
    },
    [startSSOFlow],
  );
}

/** Ends the Clerk session on this device. The guards then show Welcome and the root layout clears cached data. */
export async function signOut(): Promise<void> {
  await getClerkInstance().signOut();
}
