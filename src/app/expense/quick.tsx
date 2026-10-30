// Quick entry (docs/QUICK_ENTRY.md, slices 2–5): one line, "almuerzo 25.000 pagó Ana", and the expense is logged.
// The phone reads the phrase as it is typed or dictated (src/lib/quickEntry.ts); chips show what it understood and
// change with one tap. Only when the phone isn't sure, a Premium couple's phrase goes to the AI (src/api/quickEntry.ts),
// which also reads receipt photos. Nothing is saved without a tap; saving goes through upsert_expense like the form.
import { useQueryClient } from '@tanstack/react-query';
import { useLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MAX_TEXT } from '../../../supabase/functions/_shared/quickEntry';
import { deleteExpense, forgetExpense, useCouple, useUpsertExpense, type Couple, type ExpenseInput } from '@/api/expenses';
import { usePlan } from '@/api/plan';
import { askAi } from '@/api/quickEntry';
import { pickReceipt } from '@/api/receipt';
import { dictationAvailable, dictationNeedsExplanation, useDictation } from '@/api/voice';
import { daysAgo } from '@/lib/dates';
import { formatMoney, type Currency } from '@/lib/money';
import { canUseFeature } from '@/lib/plans';
import { parseQuickEntry, type QuickEntryContext, type QuickEntryResult, type Who } from '@/lib/quickEntry';
import { canSaveQuick, draftFromAi, nextCategory, nextDate, nextPayer, nextSplit, recognitionLocale, withChoices, type ChipChoices, type EntrySource } from '@/lib/quickSheet';
import { Icon, type IconName } from '@/ui/Icon';
import { openPaywall } from '@/ui/Premium';
import { Loading, NavButton } from '@/ui/Screen';
import { showToast } from '@/ui/Toast';
import { font, noFocusRing, radius, space, touch } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

const EXAMPLE_AMOUNT: Record<Currency, string> = { COP: '25.000', EUR: '12,50', USD: '12.50' };
/** Ask the AI once typing pauses, not on every key. */
const AI_DELAY_MS = 900;

type AiStatus = 'idle' | 'thinking' | 'reading' | 'premium' | 'limit' | 'offline' | 'failed' | 'unreadable';

export default function QuickExpense() {
  const { m } = useI18n();
  const couple = useCouple();
  if (!couple.data) return <Loading title={m.quick.title} error={couple.error} />;
  return <QuickSheet couple={couple.data} />;
}

function QuickSheet({ couple }: { couple: Couple }) {
  const { m, d: dl, language } = useI18n();
  const { color, type, categories } = useTheme();
  const styles = useStyles();
  const client = useQueryClient();
  const save = useUpsertExpense();
  const aiAllowed = canUseFeature(usePlan().gate, 'aiEntry');
  const phoneLocales = useLocales();

  const today = daysAgo(0);
  const ctx = useMemo<QuickEntryContext>(() => ({ ...couple, today, language }), [couple, today, language]);

  const [text, setText] = useState('');
  const [source, setSource] = useState<EntrySource>('text');
  const [choices, setChoices] = useState<ChipChoices>({});
  // The AI's reading of one exact text; typing on makes it stale and the phone's reading shows again.
  const [ai, setAi] = useState<{ text: string; result: QuickEntryResult } | null>(null);
  // A receipt's reading; while it's there, the field edits its description.
  const [receipt, setReceipt] = useState<QuickEntryResult | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const input = useRef<TextInput>(null);
  const asked = useRef(0);

  const local = useMemo(() => parseQuickEntry(text, ctx), [text, ctx]);
  const base: QuickEntryResult = receipt
    ? { ...receipt, draft: { ...receipt.draft, description: text.trim() || receipt.draft.description } }
    : ai?.text === text
      ? ai.result
      : local;
  const result = withChoices(base, choices, ctx);
  const ready = canSaveQuick(result);
  const hasInput = text.trim() !== '' || receipt !== null;

  // The AI only when the phone isn't sure, and never for another currency (it can't change that).
  const worthAsking = !receipt && local.confidence === 'low' && text.trim().length >= 3 && local.missing.some((g) => g !== 'currency');
  // A receipt being read shows whatever is typed; an answer about an older text doesn't.
  const shownStatus: AiStatus = aiStatus === 'reading' || worthAsking ? aiStatus : 'idle';
  useEffect(() => {
    const trimmed = text.trim();
    if (!worthAsking) {
      asked.current++;
      return;
    }
    if (ai?.text === text) return;
    const id = ++asked.current;
    const timer = setTimeout(async () => {
      if (!aiAllowed) return setAiStatus('premium');
      setAiStatus('thinking');
      const answer = await askAi({ mode: 'text', text: trimmed, today, language });
      if (id !== asked.current) return;
      if (answer.kind === 'draft') {
        setAi({ text, result: draftFromAi(answer.draft, ctx) });
        setAiStatus('idle');
      } else {
        setAiStatus(answer.kind === 'unreadable' ? 'failed' : answer.kind);
      }
    }, AI_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, worthAsking, ai, aiAllowed, today, language, ctx]);

  const onChangeText = (value: string) => {
    setText(value);
    setNotice(null);
    if (value.trim() === '') {
      setReceipt(null);
      setChoices({});
      setSource('text');
    }
  };

  // ─── Voice ───
  const canDictate = useMemo(() => dictationAvailable(), []);
  const locale = recognitionLocale(language, phoneLocales.map((l) => l.languageTag));
  const dictation = useDictation(locale, (heard) => {
    setReceipt(null);
    setSource('voice');
    setText(heard);
    setNotice(null);
  });
  const toggleDictation = async () => {
    if (dictation.state === 'listening') return dictation.stop();
    if (await dictationNeedsExplanation()) {
      Alert.alert(m.quick.micTitle, m.quick.micWhy, [
        { text: m.quick.cancel, style: 'cancel' },
        { text: m.quick.micContinue, onPress: () => void dictation.start() },
      ]);
    } else {
      void dictation.start();
    }
  };

  // ─── Receipt ───
  const readReceipt = async (from: 'camera' | 'library') => {
    setNotice(null);
    const picked = await pickReceipt(from);
    if (picked.kind === 'denied') return setNotice(m.quick.receiptDenied);
    if (picked.kind === 'failed') return setNotice(m.quick.receiptFailed);
    if (picked.kind === 'cancelled') return;
    setAiStatus('reading');
    const answer = await askAi({ mode: 'receipt', image: picked.base64, today, language });
    if (answer.kind !== 'draft') return setAiStatus(answer.kind);
    const read = draftFromAi(answer.draft, ctx);
    setReceipt(read);
    setText(read.draft.description);
    setSource('receipt');
    setChoices({});
    setAi(null);
    setAiStatus('idle');
  };
  const openReceipt = () => {
    if (!aiAllowed) return openPaywall('aiEntry');
    Alert.alert(m.quick.receiptTitle, m.quick.receiptWhy, [
      { text: m.quick.cancel, style: 'cancel' },
      { text: m.quick.receiptCamera, onPress: () => void readReceipt('camera') },
      { text: m.quick.receiptLibrary, onPress: () => void readReceipt('library') },
    ]);
  };

  // ─── Save, or hand over to the form ───
  const { draft } = result;
  const category = categories[draft.category];
  const undo = async (id: string) => {
    try {
      await deleteExpense(id);
      await forgetExpense(client, id);
      showToast(m.quick.toast.undone);
    } catch {
      showToast(m.quick.toast.undoFailed);
    }
  };
  const submit = () => {
    if (!ready || draft.amountMinor === undefined || save.isPending) return;
    const expense: ExpenseInput = {
      paidBy: draft.paidBy,
      amountMinor: draft.amountMinor,
      category: draft.category,
      description: draft.description || category.name,
      spentOn: draft.spentOn,
      splitMode: draft.splitMode,
      splitPct: draft.splitPct,
      source,
    };
    save.mutate(expense, {
      onSuccess: (saved) => {
        router.back();
        showToast(m.quick.toast.added(saved.description, formatMoney(saved.amountMinor, couple.currency)), [
          { label: m.quick.toast.undo, onPress: () => void undo(saved.id) },
          { label: m.quick.toast.edit, onPress: () => router.push({ pathname: '/expense/[id]/edit', params: { id: saved.id } }) },
        ]);
      },
    });
  };
  const openForm = () => {
    if (!hasInput) return router.replace('/expense/new');
    router.replace({ pathname: '/expense/new', params: { draft: JSON.stringify(draft), source } });
  };

  // ─── What the chips say ───
  const payer: Who = draft.paidBy === couple.partner.id && couple.partner.id ? 'partner' : 'me';
  const payerName = payer === 'me' ? couple.me.name : couple.partner.name;
  const otherName = payer === 'me' ? couple.partner.name : couple.me.name;
  const myPct = draft.splitPct == null ? null : payer === 'me' ? draft.splitPct : 100 - draft.splitPct;
  const splitLabel =
    draft.splitMode === 'half'
      ? m.expense.splitHalf
      : draft.splitMode === 'pct' && myPct != null
        ? `${couple.me.name} ${myPct}% · ${couple.partner.name} ${100 - myPct}%`
        : draft.splitMode === 'other'
          ? m.expense.splitOther(otherName)
          : m.expenseForm.personal(payerName);
  const amountLabel = draft.amountMinor !== undefined ? formatMoney(draft.amountMinor, couple.currency) : m.quick.amountMissing;
  const asks = new Set(hasInput ? result.missing : []);

  const gap = result.missing[0];
  const gapLine = !hasInput || !gap
    ? null
    : gap === 'currency' && result.foreignCurrency
      ? m.quick.gaps.currency(result.foreignCurrency, couple.currency)
      : gap === 'currency'
        ? m.quick.gaps.amount
        : m.quick.gaps[gap];
  const aiLine =
    shownStatus === 'thinking' ? m.quick.thinking
      : shownStatus === 'reading' ? m.quick.readingReceipt
        : shownStatus === 'premium' ? m.quick.aiUpsell
          : shownStatus === 'limit' ? m.quick.aiLimit
            : shownStatus === 'offline' ? m.quick.aiOffline
              : shownStatus === 'unreadable' ? m.quick.aiUnreadable
                : shownStatus === 'failed' ? m.quick.aiFailed
                  : null;
  const micLine =
    dictation.state === 'listening' ? m.quick.listening
      : dictation.error === 'denied' ? m.quick.micDenied
        : dictation.error === 'none' ? m.quick.micNone
          : dictation.error === 'failed' ? m.quick.micFailed
            : null;
  const lines = [save.isError ? m.expense.saveFailed : null, notice, micLine, gapLine, aiLine].filter((l): l is string => !!l);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={m.ui.close} onPress={() => router.back()} style={styles.iconButton}>
            <Icon name="close" size={22} color={color.ink} />
          </Pressable>
          <Text style={type.bar} accessibilityRole="header">
            {m.quick.title}
          </Text>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            ref={input}
            accessibilityLabel={m.quick.inputA11y}
            accessibilityHint={m.quick.hint}
            value={text}
            onChangeText={onChangeText}
            placeholder={m.quick.placeholder(m.quick.example, EXAMPLE_AMOUNT[couple.currency], couple.partner.name)}
            placeholderTextColor={color.disabled}
            autoFocus
            autoCorrect={false}
            maxLength={MAX_TEXT}
            returnKeyType="done"
            submitBehavior={ready ? 'blurAndSubmit' : 'submit'}
            onSubmitEditing={submit}
            style={styles.input}
          />
          {!hasInput && <Text style={styles.hint}>{m.quick.hint}</Text>}

          <View style={styles.tools}>
            {canDictate && (
              <Tool
                icon="mic"
                label={dictation.state === 'listening' ? m.quick.stopDictating : m.quick.dictate}
                a11y={dictation.state === 'listening' ? m.quick.stopDictatingA11y : m.quick.dictateA11y}
                on={dictation.state === 'listening'}
                onPress={() => void toggleDictation()}
              />
            )}
            <Tool icon="camera" label={m.quick.receipt} a11y={m.quick.receiptA11y} busy={aiStatus === 'reading'} onPress={openReceipt} />
          </View>

          {hasInput && (
            <View style={styles.chips}>
              <Chip
                label={amountLabel}
                a11y={draft.amountMinor !== undefined ? m.quick.amountA11y(amountLabel) : m.quick.amountMissingA11y}
                ask={asks.has('amount') || asks.has('currency')}
                onPress={() => input.current?.focus()}
              />
              <Chip
                label={category.name}
                a11y={m.quick.categoryA11y(category.name)}
                icon={<View style={[styles.catTile, { backgroundColor: category.tint }]}><Icon name={category.icon as IconName} size={16} color={category.color} /></View>}
                onPress={() => setChoices((c) => ({ ...c, category: nextCategory(draft.category) }))}
              />
              <Chip
                label={m.quick.payer(payerName)}
                a11y={m.quick.payerA11y(payerName)}
                hint={couple.partnerJoined ? undefined : m.expenseForm.partnerNotYet}
                ask={asks.has('payer')}
                onPress={() => setChoices((c) => ({ ...c, payer: nextPayer(payer, ctx) }))}
              />
              <Chip
                label={splitLabel}
                a11y={m.quick.splitA11y(splitLabel)}
                ask={asks.has('split')}
                onPress={() => setChoices((c) => ({ ...c, split: nextSplit(result.split, payer, ctx) }))}
              />
              <Chip
                label={dl.chipDate(draft.spentOn)}
                a11y={m.quick.dateA11y(dl.longDate(draft.spentOn))}
                ask={asks.has('date')}
                onPress={() => setChoices((c) => ({ ...c, spentOn: nextDate(draft.spentOn, today) }))}
              />
            </View>
          )}

          {lines.length > 0 && (
            <View style={styles.lines} accessibilityLiveRegion="polite">
              {lines.map((line) => (
                <Text key={line} style={styles.line}>
                  {line}
                </Text>
              ))}
              {shownStatus === 'premium' && (
                <Pressable accessibilityRole="button" onPress={() => openPaywall('aiEntry')} style={styles.link}>
                  <Text style={styles.linkText}>{m.premium.see}</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <NavButton
            label={save.isPending ? m.expenseForm.saving : ready ? m.quick.save : m.quick.review}
            disabled={!hasInput || aiStatus === 'reading'}
            loading={save.isPending}
            onPress={ready ? submit : openForm}
          />
          <Pressable accessibilityRole="button" onPress={openForm} style={styles.link}>
            <Text style={styles.linkText}>{m.quick.more}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** One tap changes it. A chip that needs an answer has a heavier border, and the line below says why in words. */
function Chip({ label, a11y, hint, icon, ask, onPress }: { label: string; a11y: string; hint?: string; icon?: React.ReactNode; ask?: boolean; onPress: () => void }) {
  const { type } = useTheme();
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} accessibilityHint={hint} onPress={onPress} style={[styles.chip, ask && styles.chipAsk]}>
      {icon}
      <Text style={[type.label, styles.chipText]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Tool({ icon, label, a11y, on, busy, onPress }: { icon: IconName; label: string; a11y: string; on?: boolean; busy?: boolean; onPress: () => void }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ busy: !!busy, selected: !!on }}
      disabled={busy}
      onPress={onPress}
      style={[styles.tool, on && styles.toolOn, busy && { opacity: 0.5 }]}
    >
      <Icon name={icon} size={20} color={on ? color.onPrimary : color.ink} />
      <Text style={[type.label, styles.toolText, on && { color: color.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[2],
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  iconButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  content: { padding: space[5], gap: space[4] },
  input: {
    ...type.body,
    fontSize: 20,
    minHeight: 56,
    borderBottomWidth: 2,
    borderBottomColor: color.ink,
    paddingVertical: space[2],
    color: color.ink,
    ...noFocusRing,
  },
  hint: { ...type.label, color: color.textSecondary, fontFamily: font.body },
  tools: { flexDirection: 'row', gap: space[2] },
  tool: {
    minHeight: touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    borderRadius: touch / 2,
    borderWidth: 1,
    borderColor: color.fieldBorder,
  },
  toolOn: { backgroundColor: color.ink, borderColor: color.ink },
  toolText: { color: color.ink, fontFamily: font.bodyBold, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    minHeight: touch,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: 14,
    borderRadius: radius.option,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  chipAsk: { borderWidth: 2, borderColor: color.ink, borderStyle: 'dashed' },
  chipText: { color: color.ink, fontFamily: font.bodyBold, fontSize: 14, flexShrink: 1 },
  catTile: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  lines: { gap: space[1] },
  line: { ...type.label, color: color.textSecondary, fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  link: { minHeight: touch, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: space[3] },
  linkText: { ...type.label, color: color.ink, fontFamily: font.bodyBold, textDecorationLine: 'underline' },
  footer: { paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[3], gap: space[1], borderTopWidth: 1, borderTopColor: color.line },
}));
