// Borrar cuenta: the Clerk and Supabase calls behind src/lib/deleteAccount.ts. Clerk only deletes an account after a
// sign-in from the last 10 minutes; older sessions confirm with a code by email (Clerk "reverification").
import { getClerkInstance } from '@clerk/expo';
import { deleteAccount, type DeletionResult } from '@/lib/deleteAccount';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { supabase } from '@/lib/supabase';

/** Thrown when the account has no email to send the confirmation code to. */
export class NoEmailFactorError extends Error {
  constructor() {
    super('no_email_factor');
  }
}

/** Runs the deletion; 'needs_code' means call sendDeletionCode, confirm it, then run this again. */
export async function deleteMyAccount(): Promise<DeletionResult> {
  const finish = () => useSessionStore.setState({ deleting: false, householdId: null, notice: 'accountDeleted' });
  if (DEV_BYPASS_AUTH) {
    finish();
    return 'deleted';
  }
  const clerk = getClerkInstance();
  useSessionStore.setState({ deleting: true });
  try {
    const result = await deleteAccount({
      recentlyVerified: () => clerk.session?.checkAuthorization({ reverification: 'strict' }) ?? false,
      deleteData: async () => {
        const { error } = await supabase.rpc('delete_account');
        if (error) throw error;
      },
      deleteLogin: async () => {
        if (!clerk.user) throw new Error('not_signed_in');
        await clerk.user.delete();
      },
    });
    if (result === 'deleted') finish();
    return result;
  } finally {
    useSessionStore.setState({ deleting: false });
  }
}

/** Sends a code to the account's email to confirm the deletion. Returns the masked address to show. */
export async function sendDeletionCode(): Promise<string> {
  const session = getClerkInstance().session;
  if (!session) throw new Error('not_signed_in');
  const verification = await session.startVerification({ level: 'first_factor' });
  const factor = verification.supportedFirstFactors?.find((f) => f.strategy === 'email_code');
  if (!factor || factor.strategy !== 'email_code') throw new NoEmailFactorError();
  await session.prepareFirstFactorVerification({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
  return factor.safeIdentifier;
}

/** Checks the code from the email; afterwards deleteMyAccount() can delete. */
export async function confirmDeletionCode(code: string): Promise<void> {
  const session = getClerkInstance().session;
  if (!session) throw new Error('not_signed_in');
  const verification = await session.attemptFirstFactorVerification({ strategy: 'email_code', code });
  if (verification.status !== 'complete') throw new Error(`verification_${verification.status}`);
}
