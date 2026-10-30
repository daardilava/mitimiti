// Runs the quick-entry golden phrases (src/lib/__tests__/quickEntry.golden.json) through the real model, with the
// same prompt and schema as the parse-expense Edge Function (supabase/functions/_shared/quickEntry.ts), and reports
// how often it reads the amount, the payer and the date right. Manual, never in CI: every run costs money.
//   ANTHROPIC_API_KEY=… npm run eval:quick-entry            all phrases
//   ANTHROPIC_API_KEY=… npm run eval:quick-entry -- --low   only the ones the phone's parser must ask about
// Amounts are scored the way the app reads them: the model's amount text through parseSpokenAmount() (money.ts).
// Node 24 runs the two TypeScript files directly (type stripping).
// process.exitCode instead of process.exit(): exiting right after fetch() crashes Node on Windows.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { readFileSync } from 'node:fs';
import { aiDraftSchema, SYSTEM_PROMPT, userPrompt } from '../supabase/functions/_shared/quickEntry.ts';
import { parseSpokenAmount } from '../src/lib/money.ts';

const MODEL = 'claude-haiku-5-5';

process.exitCode = await main();

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Set ANTHROPIC_API_KEY (the same key as the Supabase secret).');
    return 1;
  }
  const golden = JSON.parse(readFileSync(new URL('../src/lib/__tests__/quickEntry.golden.json', import.meta.url), 'utf8'));
  const onlyLow = process.argv.includes('--low');
  const phrases = golden.phrases.filter((p) => !onlyLow || p.confidence === 'low');
  const client = new Anthropic();
  const score = { amount: 0, payer: 0, date: 0, category: 0, scored: 0, unsure: 0, failed: 0 };
  const wrong = [];

  for (const p of phrases) {
    const couple = golden.couples[p.couple];
    const claim = { ok: true, remaining: 0, currency: couple.currency, me: couple.me.name.split(' ')[0], partner: couple.partner.name.split(' ')[0] };
    const request = { mode: 'text', text: p.text, today: golden.today, language: couple.language };
    let draft;
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt(request, claim) }],
        output_config: { effort: 'low', format: zodOutputFormat(aiDraftSchema) },
      });
      draft = response.parsed_output;
    } catch (error) {
      console.error(`✗ ${p.text}: ${error instanceof Error ? error.message : error}`);
    }
    if (!draft) {
      score.failed++;
      continue;
    }
    if (!draft.sure) score.unsure++;
    // Only phrases with a known answer are scored; the rest show what the model said.
    if (p.amountMinor === undefined) {
      console.log(`· ${p.text} → ${JSON.stringify(draft)}`);
      continue;
    }
    score.scored++;
    const read = draft.amountText ? parseSpokenAmount(draft.amountText, couple.currency) : { amountMinor: 0, ambiguous: true };
    const checks = {
      amount: !draft.currency || draft.currency === couple.currency ? !read.ambiguous && read.amountMinor === p.amountMinor : false,
      payer: p.paidBy === undefined || draft.payer === p.paidBy,
      date: p.spentOn === undefined || (draft.spentOn ?? golden.today) === p.spentOn,
      category: p.category === undefined || draft.category === p.category,
    };
    for (const [k, ok] of Object.entries(checks)) if (ok) score[k]++;
    const bad = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
    if (bad.length) wrong.push(`${p.text} — ${bad.join(', ')} — ${JSON.stringify(draft)}`);
  }

  const pct = (n) => `${Math.round((100 * n) / Math.max(score.scored, 1))} %`;
  console.log(`\n${phrases.length} phrases, ${score.scored} scored, ${score.failed} failed, ${score.unsure} marked not sure`);
  console.log(`amount ${pct(score.amount)} · payer ${pct(score.payer)} · date ${pct(score.date)} · category ${pct(score.category)}`);
  if (wrong.length) console.log(`\nWrong:\n${wrong.join('\n')}`);
  return score.failed ? 1 : 0;
}
