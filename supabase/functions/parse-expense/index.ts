// Quick entry with AI (docs/QUICK_ENTRY.md, slices 3 and 5): a phrase the phone's parser couldn't read, or a receipt
// photo, in; a draft out. The draft is only a proposal: the app reads the amount with money.ts, shows it, and saves
// through upsert_expense like any other expense. Nothing is stored here: not the text, not the image.
//
// Who is asking comes from their Clerk session token, checked by Supabase itself (as in billing-sync): the function
// calls claim_ai_call() with the caller's token, which also says whether the couple is Premium, takes one call from
// today's allowance, and returns the only context the model gets (currency, two first names).
// Secrets: ANTHROPIC_API_KEY (`npx supabase secrets set ANTHROPIC_API_KEY=…`). README.md › "Deploy quick entry".
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { createClient } from '@supabase/supabase-js';
import { aiDraftSchema, claimSchema, parseRequestSchema, SYSTEM_PROMPT, userPrompt, type ParseResponse } from '../_shared/quickEntry.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
const keys = (name: string) => JSON.parse(Deno.env.get(name) ?? '{}') as Record<string, string>;
const PUBLISHABLE = keys('SUPABASE_PUBLISHABLE_KEYS').default ?? Deno.env.get('SUPABASE_ANON_KEY')!;

// Small and fast: one sentence or one receipt. No retries: the app has its own timeout and keeps the local draft.
const MODEL = 'claude-haiku-5-5';
const claude = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY'), maxRetries: 0 });

const reply = (status: number, body: ParseResponse) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'bad_request' });
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return reply(401, { ok: false, error: 'unauthorized' });

  const body = parseRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return reply(400, { ok: false, error: 'bad_request' });

  const asCaller = createClient(URL, PUBLISHABLE, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claimed, error: claimError } = await asCaller.rpc('claim_ai_call');
  if (claimError) return reply(401, { ok: false, error: 'unauthorized' });
  if (claimed?.ok === false) {
    const reason = claimed.reason as 'not_in_household' | 'not_premium' | 'limit';
    return reply(reason === 'limit' ? 429 : 403, { ok: false, error: reason });
  }
  const couple = claimSchema.safeParse(claimed);
  if (!couple.success) return reply(500, { ok: false, error: 'model' });

  const request = body.data;
  const content: Anthropic.ContentBlockParam[] = [{ type: 'text', text: userPrompt(request, couple.data) }];
  if (request.mode === 'receipt') {
    content.unshift({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: request.image } });
  }

  try {
    const response = await claude.messages.parse(
      {
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
        output_config: { effort: 'low', format: zodOutputFormat(aiDraftSchema) },
      },
      { timeout: request.mode === 'receipt' ? 20_000 : 8_000 },
    );
    if (response.stop_reason === 'refusal' || !response.parsed_output) return reply(422, { ok: false, error: 'unreadable' });
    return reply(200, { ok: true, draft: response.parsed_output, remaining: couple.data.remaining });
  } catch (error) {
    // Never log the text or the image: only what failed.
    if (error instanceof Anthropic.APIError) console.error('Claude answered', error.status, error.name);
    else console.error('Claude call failed', error instanceof Error ? error.name : 'unknown');
    return reply(502, { ok: false, error: 'model' });
  }
});
