import 'react-native-url-polyfill/auto';
import { getClerkInstance } from '@clerk/expo';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

// Clerk signs people in; Supabase trusts Clerk's session token (third-party auth) and RLS reads its `sub`.
// getToken() returns a cached token and refreshes it before it expires.
export const supabase = createClient(url, key, { accessToken: clerkToken });

/** Null (anonymous) until ClerkProvider has loaded Clerk: supabase-js asks once at startup, for Realtime. */
async function clerkToken(): Promise<string | null> {
  try {
    // On web this is undefined before ClerkProvider mounts; on native it throws until then.
    return (await getClerkInstance()?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}
