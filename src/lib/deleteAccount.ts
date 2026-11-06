// Borrar cuenta (Ajustes › Cuenta). The steps run in this order, so a failure never erases the couple's data while
// Clerk still refuses to delete the login:
//   1. Clerk only deletes an account after a sign-in from the last 10 minutes; if it's older, confirm with a code.
//   2. delete_account() erases the couple's space in Supabase. It needs the Clerk session token, so it goes first.
//   3. Delete the Clerk account, which also ends the session.
// If step 3 fails after step 2, trying again is safe: delete_account() does nothing the second time.
// The Clerk and Supabase calls are passed in, so Vitest covers the order without React or a network.
import { es, type Messages } from '../i18n/es';
import { authErrorMessage, clerkErrorCode } from './authFlow';

export interface DeletionSteps {
  /** Whether Clerk accepts deleting the account right now (signed in or verified in the last 10 minutes). */
  recentlyVerified: () => boolean;
  deleteData: () => Promise<void>;
  deleteLogin: () => Promise<void>;
}

/** needs_code: confirm with a code by email, then run again. */
export type DeletionResult = 'deleted' | 'needs_code';

export class DeletionError extends Error {
  constructor(
    readonly step: 'data' | 'login',
    readonly cause: unknown,
  ) {
    super(`delete_account_failed:${step}`);
  }
}

export async function deleteAccount(steps: DeletionSteps): Promise<DeletionResult> {
  if (!steps.recentlyVerified()) return 'needs_code';
  try {
    await steps.deleteData();
  } catch (e) {
    throw new DeletionError('data', e);
  }
  try {
    await steps.deleteLogin();
  } catch (e) {
    // The 10 minutes ran out between the check and the call: confirm with a code, then run again.
    if (clerkErrorCode(e) === 'session_reverification_required') return 'needs_code';
    throw new DeletionError('login', e);
  }
  return 'deleted';
}

/** A failed deletion, or a failed code, in the app's language. */
export function deletionErrorMessage(error: unknown, m: Messages = es): string {
  if (error instanceof DeletionError) return error.step === 'data' ? m.deleteAccount.errors.data : m.deleteAccount.errors.login;
  return authErrorMessage(error, m);
}
