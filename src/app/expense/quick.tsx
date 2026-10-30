// Quick entry (docs/QUICK_ENTRY.md): one line, "almuerzo 25.000 pagó Ana", and the expense is logged.
// The phone reads the phrase as it's typed or dictated (src/lib/quickEntry.ts); the draft card shows exactly what will
// be saved, and any field changes in place (src/ui/QuickDraftCard.tsx). Only when the phone isn't sure, a Premium
// couple's phrase goes to the AI (src/api/quickEntry.ts), which also reads receipt photos. Nothing is saved without a
// tap on Agregar gasto; it goes through upsert_expense like the form. Formulario (top right) opens the full form.
import { useQueryClient } from '@tanstack/react-query';
import { useLocales } from 'expo-localization';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
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
import { parseQuickEntry, type QuickEntryContext, type QuickEntryResult } from '@/lib/quickEntry';
import { canSaveQuick, draftFromAi, recognitionLocale, withChoices, type ChipChoices, type EntrySource } from '@/lib/quickSheet';
import { readQuickStart } from '@/lib/shortcuts';
import { Callout, Field } from '@/ui/Form';
import { Icon, type IconName } from '@/ui/Icon';
import { openPaywall } from '@/ui/Premium';
import { QuickDraftCard, type DraftOrigin } from '@/ui/QuickDraftCard';
import { Loading, NavButton } from '@/ui/Screen';
import { showToast } from '@/ui/Toast';
import { font, noFocusRing, radius, space, touch } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

/** Example amounts for the placeholder and the "Prueba con" lines, in each currency's own format. */
const EXAMPLES: Record<Currency, { small: string; medium: string; large: string }> = {
  COP: { small: '4.500', medium: '85.000', large: '2,4 M' },
  EUR: { small: '3,80', medium: '42,50', large: '1.200' },
  USD: { small: '4.50', medium: '42.50', large: '1,800' },
};
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
  const { m, language } = useI18n();
  const { color, type, categories } = useTheme();
  const styles = useStyles();
  const client = useQueryClient();
  const save = useUpsertExpense();
  const aiAllowed = canUseFeature(usePlan().gate, 'aiEntry');
  const phoneLocales = useLocales();

  const today = daysAgo(0);
  const ctx = useMemo<QuickEntryContext>(() => ({ ...couple, today, language }), [couple, today, language]);
  const examples = EXAMPLES[couple.currency];
  const input = useRef<TextInput>(null);

  const [text, setText] = useState('');
  const [source, setSource] = useState<EntrySource>('text');
  const [choices, setChoices] = useState<ChipChoices>({});
  // The AI's reading of one exact text; typing on makes it stale and the phone's reading shows again.
  const [ai, setAi] = useState<{ text: string; result: QuickEntryResult } | null>(null);
  // A receipt's reading and its photo; typing a phrase replaces it.
  const [receipt, setReceipt] = useState<{ result: QuickEntryResult | null; uri: string } | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const asked = useRef(0);

  const local = useMemo(() => parseQuickEntry(text, ctx), [text, ctx]);
  const fromAi = !receipt && ai?.text === text;
  const base: QuickEntryResult = receipt?.result ?? (fromAi && ai ? ai.result : local);
  const result = withChoices(base, choices, ctx);
  const ready = canSaveQuick(result);
  const reading = aiStatus === 'reading';
  const hasDraft = text.trim() !== '' || receipt !== null;

  // The AI only when the phone isn't sure, and never for another currency (it can't change that).
  const worthAsking = !receipt && local.confidence === 'low' && text.trim().length >= 3 && local.missing.some((g) => g !== 'currency');
  // A receipt being read shows whatever is typed; an answer about an older text doesn't.
  const shownStatus: AiStatus = reading || worthAsking ? aiStatus : 'idle';
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
    // Typing starts a new expense: a receipt read before is dropped, and so are the choices made for an empty draft.
    if (receipt) {
      setReceipt(null);
      setChoices({});
      setSource('text');
    }
    if (value.trim() === '') {
      setChoices({});
      setSource('text');
    }
  };
  // An example fills the field and keeps the keyboard up, so it can be edited straight away.
  const tryExample = (example: string) => {
    onChangeText(example);
    input.current?.focus();
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
  const listening = dictation.state === 'listening';
  const toggleDictation = async () => {
    if (listening) return dictation.stop();
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
    setText('');
    setAi(null);
    setChoices({});
    setSource('receipt');
    setReceipt({ result: null, uri: picked.uri });
    setAiStatus('reading');
    const answer = await askAi({ mode: 'receipt', image: picked.base64, today, language });
    if (answer.kind !== 'draft') {
      setReceipt(null);
      setSource('text');
      return setAiStatus(answer.kind);
    }
    setReceipt({ result: draftFromAi(answer.draft, ctx), uri: picked.uri });
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
  const removeReceipt = () => {
    setReceipt(null);
    setChoices({});
    setSource('text');
  };

  // Inicio's Escanear / Dictar shortcuts open this sheet already asking for the photo or listening, once.
  const start = readQuickStart(useLocalSearchParams<{ start?: string }>().start);
  const started = useRef(false);
  const startWith = useEffectEvent((how: 'receipt' | 'voice') => {
    if (how === 'receipt') openReceipt();
    else if (canDictate) void toggleDictation();
  });
  useEffect(() => {
    if (started.current || !start) return;
    started.current = true;
    startWith(start);
  }, [start]);

  // ─── Save, or hand over to the form ───
  const { draft } = result;
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
    if (!ready || draft.amountMinor === undefined || save.isPending || reading) return;
    const expense: ExpenseInput = {
      paidBy: draft.paidBy,
      amountMinor: draft.amountMinor,
      category: draft.category,
      description: draft.description || categories[draft.category].name,
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
    if (!hasDraft || reading) return router.replace('/expense/new');
    router.replace({ pathname: '/expense/new', params: { draft: JSON.stringify(draft), source } });
  };

  // ─── What to say: one blocking question first, then what the AI or the phone reports ───
  const gap = result.missing.find((g) => g !== 'review');
  const gapLine = !hasDraft || reading || !gap
    ? null
    : gap === 'currency' && result.foreignCurrency
      ? m.quick.gaps.currency(result.foreignCurrency, couple.currency)
      : gap === 'currency'
        ? m.quick.gaps.amount
        : m.quick.gaps[gap];
  const reviewLine = receipt?.result ? m.quick.receiptReview : hasDraft && result.missing.includes('review') ? m.quick.gaps.review : null;
  const statusLine =
    shownStatus === 'premium' ? m.quick.aiUpsell
      : shownStatus === 'limit' ? m.quick.aiLimit
        : shownStatus === 'offline' ? m.quick.aiOffline
          : shownStatus === 'unreadable' ? m.quick.aiUnreadable
            : shownStatus === 'failed' ? m.quick.aiFailed
              : null;
  const micLine =
    dictation.error === 'denied' ? m.quick.micDenied
      : dictation.error === 'none' ? m.quick.micNone
        : dictation.error === 'failed' ? m.quick.micFailed
          : null;
  const messages = [save.isError ? m.expense.saveFailed : null, notice, micLine, gapLine, reviewLine, statusLine].filter((l): l is string => !!l);
  const origin: DraftOrigin = receipt ? 'receipt' : fromAi ? 'ai' : source === 'voice' ? 'voice' : 'text';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={m.ui.close} onPress={() => router.back()} style={styles.iconButton}>
            <Icon name="close" size={22} color={color.ink} />
          </Pressable>
          <Text style={[type.bar, styles.flex]} accessibilityRole="header">
            {m.quick.title}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={m.quick.formA11y} onPress={openForm} style={styles.headerAction}>
            <Text style={styles.headerActionText}>{m.quick.form}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label={m.quick.inputLabel} hint={hasDraft || listening ? undefined : m.quick.inputHint}>
            <View style={[styles.composer, listening && styles.composerOn]}>
              <TextInput
                ref={input}
                accessibilityLabel={m.quick.inputA11y}
                accessibilityHint={m.quick.inputHint}
                value={text}
                onChangeText={onChangeText}
                placeholder={m.quick.placeholder(examples.medium, couple.partner.name)}
                placeholderTextColor={color.textSecondary}
                autoFocus
                autoCorrect={false}
                maxLength={MAX_TEXT}
                returnKeyType="done"
                submitBehavior={ready ? 'blurAndSubmit' : 'submit'}
                onSubmitEditing={submit}
                style={styles.input}
              />
              {canDictate && (
                <ToolButton
                  icon="mic"
                  label={listening ? m.quick.stopDictatingA11y : m.quick.dictateA11y}
                  on={listening}
                  onPress={() => void toggleDictation()}
                />
              )}
              <ToolButton icon="camera" label={m.quick.receiptA11y} busy={reading} onPress={openReceipt} />
            </View>
          </Field>
          {listening && (
            <Text style={styles.listening} accessibilityLiveRegion="polite">
              {m.quick.listening}
            </Text>
          )}

          {!hasDraft && !listening && (
            <View style={styles.examples}>
              <Text style={styles.examplesLabel}>{m.quick.tryLabel}</Text>
              <View style={styles.exampleChips}>
                {[m.quick.example1(examples.small), m.quick.example2(examples.medium, couple.partner.name), m.quick.example3(examples.large)].map((e) => (
                  <Pressable
                    key={e}
                    accessibilityRole="button"
                    accessibilityLabel={m.quick.exampleA11y(e)}
                    onPress={() => tryExample(e)}
                    style={({ pressed }) => [styles.example, pressed && styles.examplePressed]}
                  >
                    <Text style={styles.exampleText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {messages.length > 0 && (
            <View style={{ gap: space[2] }} accessibilityLiveRegion="polite">
              {messages.map((line) => (
                <Callout key={line} icon="bell" tone={line === gapLine ? 'info' : 'neutral'}>
                  {line}
                </Callout>
              ))}
              {shownStatus === 'premium' && <NavButton label={m.premium.see} kind="secondary" onPress={() => openPaywall('aiEntry')} />}
            </View>
          )}

          {(hasDraft || reading) && (
            <QuickDraftCard
              couple={couple}
              result={result}
              origin={origin}
              today={today}
              photoUri={receipt?.uri}
              reading={reading}
              thinking={shownStatus === 'thinking'}
              onChoose={(choice) => setChoices((c) => ({ ...c, ...choice }))}
              onRemoveReceipt={receipt?.result ? removeReceipt : undefined}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          <NavButton
            label={save.isPending ? m.expenseForm.saving : m.quick.save}
            disabled={!ready || reading}
            loading={save.isPending}
            onPress={submit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ToolButton({ icon, label, on, busy, onPress }: { icon: IconName; label: string; on?: boolean; busy?: boolean; onPress: () => void }) {
  const { color } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!busy, selected: !!on }}
      disabled={busy}
      onPress={onPress}
      style={[styles.tool, on && styles.toolOn, busy && { opacity: 0.4 }]}
    >
      <Icon name={icon} size={22} color={on ? color.onPrimary : color.ink} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[2],
    backgroundColor: color.surface,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  iconButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  headerAction: { minHeight: touch, minWidth: touch, paddingHorizontal: space[3], alignItems: 'center', justifyContent: 'center' },
  headerActionText: { ...type.row, color: color.ink, fontFamily: font.bodyBold, textDecorationLine: 'underline' },
  content: { padding: space[5], gap: space[4] },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingLeft: space[4],
    paddingRight: space[1],
    gap: space[1],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    backgroundColor: color.surface,
  },
  composerOn: { borderColor: color.ink, borderWidth: 2 },
  input: { ...type.body, flex: 1, fontSize: 18, minHeight: 56, color: color.ink, ...noFocusRing },
  tool: { width: touch, height: touch, borderRadius: touch / 2, alignItems: 'center', justifyContent: 'center' },
  toolOn: { backgroundColor: color.ink },
  listening: { ...type.label, color: color.ink, fontFamily: font.bodyBold },
  examples: { gap: space[2] },
  examplesLabel: { ...type.label, color: color.textSecondary },
  exampleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  example: {
    minHeight: touch,
    paddingHorizontal: space[4],
    borderRadius: touch / 2,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    backgroundColor: color.surface,
    justifyContent: 'center',
  },
  examplePressed: { backgroundColor: color.neutralTint },
  exampleText: { ...type.row, color: color.ink },
  footer: { paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[3], backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.line },
}));
