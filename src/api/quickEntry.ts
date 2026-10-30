// Quick entry with AI (docs/QUICK_ENTRY.md): asks the parse-expense Edge Function to read a phrase the phone's parser
// couldn't, or a receipt photo. Never throws: offline, slow or refused calls come back as a reason, and the sheet keeps
// what the phone already understood.
import { FunctionsHttpError } from '@supabase/supabase-js';
import { parseResponseSchema, type AiDraft, type ParseRequest } from '../../supabase/functions/_shared/quickEntry';
import { DEV_BYPASS_AUTH } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export type AiAnswer =
  | { kind: 'draft'; draft: AiDraft }
  /** Free couple: AI entry is Premium (the server checks it too). */
  | { kind: 'premium' }
  /** Today's allowance for the couple is used up. */
  | { kind: 'limit' }
  /** No connection, or no answer in time. */
  | { kind: 'offline' }
  /** The model couldn't read it (e.g. a blurry receipt). */
  | { kind: 'unreadable' }
  | { kind: 'failed' };

/** A phrase is one sentence; a receipt is an image and takes longer. */
const TIMEOUT_MS = { text: 6_000, receipt: 20_000 } as const;

export async function askAi(request: ParseRequest): Promise<AiAnswer> {
  // Sample data has no backend to ask.
  if (DEV_BYPASS_AUTH) return { kind: 'offline' };
  const { data, error } = await supabase.functions.invoke('parse-expense', {
    method: 'POST',
    body: request,
    timeout: TIMEOUT_MS[request.mode],
  });
  if (error) {
    if (!(error instanceof FunctionsHttpError)) return { kind: 'offline' };
    const body = parseResponseSchema.safeParse(await (error.context as Response).json().catch(() => null));
    if (!body.success || body.data.ok) return { kind: 'failed' };
    switch (body.data.error) {
      case 'not_premium':
        return { kind: 'premium' };
      case 'limit':
        return { kind: 'limit' };
      case 'unreadable':
        return { kind: 'unreadable' };
      default:
        return { kind: 'failed' };
    }
  }
  const body = parseResponseSchema.safeParse(data);
  if (!body.success || !body.data.ok) return { kind: 'failed' };
  return { kind: 'draft', draft: body.data.draft };
}
