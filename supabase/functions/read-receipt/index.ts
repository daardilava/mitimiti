// Escanear (docs/PLAN.md › Scan + Dictate): a receipt photo in; the shop, date, currency, lines and total out, as
// printed. The answer is only a reading: the app turns the amounts into minor units with money.ts, shows them, and
// saves through upsert_expense like any other expense. Nothing is stored here: not the image, not what was read.
//
// Who is asking comes from their Clerk session token, checked by Supabase itself (as in billing-sync): the function
// calls claim_receipt_scan() with the caller's token, which refuses anyone outside a couple, takes one scan from the
// couple's daily allowance and says whether the couple is Premium.
// Secrets: ANTHROPIC_API_KEY (`npx supabase secrets set ANTHROPIC_API_KEY=…`). README.md › "Deploy Escanear (read-receipt)".
// RECEIPT_PREMIUM_ONLY=1 makes the server refuse Free couples too; leave it unset while src/lib/premium.ts has
// PREMIUM_ENFORCED = false, and turn both on together.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { createClient } from '@supabase/supabase-js';
import {
  readReceiptRequestSchema,
  receiptAiSchema,
  receiptUserPrompt,
  RECEIPT_SYSTEM_PROMPT,
  scanClaimSchema,
  type ReadReceiptResponse,
} from '../_shared/receipt.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
const keys = (name: string) => JSON.parse(Deno.env.get(name) ?? '{}') as Record<string, string>;
const PUBLISHABLE = keys('SUPABASE_PUBLISHABLE_KEYS').default ?? Deno.env.get('SUPABASE_ANON_KEY')!;
const PREMIUM_ONLY = Deno.env.get('RECEIPT_PREMIUM_ONLY') === '1';

// Sonnet reads every line of a crumpled receipt more reliably than Haiku; one call per photo. No retries: the app has
// its own timeout and offers the form.
const MODEL = 'claude-sonnet-5-5';
const claude = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY'), maxRetries: 0 });

const reply = (status: number, body: ReadReceiptResponse) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'bad_request' });
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return reply(401, { ok: false, error: 'unauthorized' });

  const body = readReceiptRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return reply(400, { ok: false, error: 'bad_request' });

  const asCaller = createClient(URL, PUBLISHABLE, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claimed, error: claimError } = await asCaller.rpc('claim_receipt_scan');
  if (claimError) return reply(401, { ok: false, error: 'unauthorized' });
  if (claimed?.ok === false) {
    const reason = claimed.reason as 'not_in_household' | 'limit';
    return reply(reason === 'limit' ? 429 : 403, { ok: false, error: reason });
  }
  const couple = scanClaimSchema.safeParse(claimed);
  if (!couple.success) return reply(500, { ok: false, error: 'model' });
  if (PREMIUM_ONLY && !couple.data.premium) return reply(403, { ok: false, error: 'not_premium' });

  try {
    const response = await claude.beta.messages.parse(
      {
        model: MODEL,
        max_tokens: 4096,
        system: RECEIPT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: body.data.image } },
              { type: 'text', text: receiptUserPrompt(body.data, couple.data.currency) },
            ],
          },
        ],
        output_config: { effort: 'low', format: betaZodOutputFormat(receiptAiSchema) },
        // If a safety classifier declines a receipt by mistake, the API retries on a fallback model in the same call.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
      { timeout: 25_000 },
    );
    if (response.stop_reason === 'refusal' || !response.parsed_output) return reply(422, { ok: false, error: 'unreadable' });
    // Validated again on the way out: the app relies on this shape.
    const receipt = receiptAiSchema.safeParse(response.parsed_output);
    if (!receipt.success) return reply(422, { ok: false, error: 'unreadable' });
    return reply(200, { ok: true, receipt: receipt.data, remaining: couple.data.remaining });
  } catch (error) {
    // Never log the image or what was read: only what failed.
    if (error instanceof Anthropic.APIError) console.error('Claude answered', error.status, error.name);
    else console.error('Claude call failed', error instanceof Error ? error.name : 'unknown');
    return reply(502, { ok: false, error: 'model' });
  }
});
