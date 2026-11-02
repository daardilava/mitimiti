import { useLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCouple, type Couple } from '@/api/expenses';
import { usePlan } from '@/api/plan';
import { dictationAvailable, dictationNeedsExplanation, useDictation } from '@/api/voice';
import { daysAgo } from '@/lib/dates';
import { handDraft } from '@/lib/draftStore';
import { formatMoney } from '@/lib/money';
import { parseDictation } from '@/lib/parseDictation';
import { canUse } from '@/lib/premium';
import type { QuickEntryContext } from '@/lib/quickEntry';
import { recognitionLocale } from '@/lib/quickSheet';
import { PremiumGate, splitLabel } from '@/ui/Capture';
import { Icon } from '@/ui/Icon';
import { Miti } from '@/ui/Miti';
import { NavButton, Loading } from '@/ui/Screen';
import { font, radius, space, touch } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// Dictar (docs/PLAN.md › Scan + Dictate), Premium: speak the expense, see it understood live, stop, and the form opens
// with it filled in. Speech is recognised on the phone (src/api/voice.ts) and read by parseDictation(), offline; no
// audio leaves the phone. Nothing is saved here: the person confirms in the form.
export default function Dictate() {
  const { m } = useI18n();
  const couple = useCouple();
  const { gate } = usePlan();
  const styles = useStyles();

  if (!couple.data) return <Loading title={m.capture.dictate.title} error={couple.error} />;
  if (!canUse('dictate', gate)) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header />
        <View style={styles.centered}>
          <PremiumGate feature="dictate" />
        </View>
      </SafeAreaView>
    );
  }
  return <Listening couple={couple.data} />;
}

function Header() {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={m.ui.close} onPress={() => router.back()} style={styles.iconButton}>
        <Icon name="close" size={22} color={color.ink} />
      </Pressable>
      <Text style={[type.bar, styles.headerTitle]} accessibilityRole="header">
        {m.capture.dictate.title}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={m.capture.writeA11y} onPress={() => router.replace('/expense/new')} style={styles.headerAction}>
        <Text style={styles.headerActionText}>{m.capture.write}</Text>
      </Pressable>
    </View>
  );
}

type Stage = 'explain' | 'unavailable' | 'live';

function Listening({ couple }: { couple: Couple }) {
  const { m, language } = useI18n();
  const { color, type, categories } = useTheme();
  const styles = useStyles();
  const phoneLocales = useLocales();
  const t = m.capture.dictate;
  const today = daysAgo(0);
  const ctx = useMemo<QuickEntryContext>(() => ({ ...couple, today, language }), [couple, today, language]);

  const [transcript, setTranscript] = useState('');
  const available = useMemo(() => dictationAvailable(), []);
  const [stage, setStage] = useState<Stage | null>(available ? null : 'unavailable');
  const locale = recognitionLocale(language, phoneLocales.map((l) => l.languageTag));
  const dictation = useDictation(locale, (text) => setTranscript(text));
  const listening = dictation.state === 'listening';
  const result = useMemo(() => (transcript ? parseDictation(transcript, ctx) : null), [transcript, ctx]);

  // Explain the microphone before the first system dialog, then start listening right away.
  useEffect(() => {
    if (!available) return;
    let alive = true;
    dictationNeedsExplanation().then((explain) => {
      if (!alive) return;
      setStage(explain ? 'explain' : 'live');
      if (!explain) void dictation.start();
    });
    return () => {
      alive = false;
    };
    // Once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  // Listening ended (the stop button, or silence) with something heard: hand the draft to the form.
  const done = useRef(false);
  const wasListening = useRef(false);
  useEffect(() => {
    if (listening) wasListening.current = true;
    else if (wasListening.current && result && !done.current) {
      done.current = true;
      handDraft(result.draft, 'voice');
      router.replace('/expense/new');
    }
  }, [listening, result]);

  const press = () => {
    if (listening) dictation.stop();
    else {
      setTranscript('');
      wasListening.current = false;
      void dictation.start();
    }
  };

  // Chips: what was understood so far.
  const chips: string[] = [];
  if (result) {
    const { heard, draft } = result;
    if (heard.category) chips.push(categories[heard.category].name);
    if (heard.amountMinor !== null) chips.push(formatMoney(heard.amountMinor, couple.currency));
    chips.push(t.paidBy(heard.payer === 'me' ? couple.me.name : couple.partner.name));
    chips.push(splitLabel(m, couple, draft.paidBy ?? couple.me.id, draft.splitMode ?? 'half', draft.splitPct));
  }

  const errorText =
    dictation.error === 'denied' ? m.quick.micDenied : dictation.error === 'none' ? m.quick.micNone : dictation.error === 'failed' ? m.quick.micFailed : null;

  return (
    <SafeAreaView style={styles.safe}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        {stage === 'unavailable' ? (
          <View style={styles.notice}>
            <Text style={[type.body, { color: color.textSecondary, textAlign: 'center' }]}>{t.unavailable}</Text>
            <NavButton label={m.capture.locked.write} onPress={() => router.replace('/expense/new')} />
          </View>
        ) : stage === 'explain' ? (
          <View style={styles.notice}>
            <Text style={[type.heading, { textAlign: 'center' }]} accessibilityRole="header">
              {m.quick.micTitle}
            </Text>
            <Text style={[type.body, { color: color.textSecondary, textAlign: 'center' }]}>{m.quick.micWhy}</Text>
            <NavButton
              label={m.quick.micContinue}
              onPress={() => {
                setStage('live');
                void dictation.start();
              }}
            />
          </View>
        ) : (
          <>
            <Indicator listening={listening} />
            <View style={styles.status} accessibilityLiveRegion="polite">
              <View style={[styles.statusDot, { backgroundColor: listening ? color.partnerText : color.disabled }]} aria-hidden />
              <Text style={[type.label, { color: color.ink }]}>{listening ? t.listening : t.ready}</Text>
            </View>

            {transcript ? (
              <Text style={styles.transcript} accessibilityLabel={t.heardA11y(transcript)} accessibilityLiveRegion="polite">
                {result?.amountSpan ? (
                  <>
                    {transcript.slice(0, result.amountSpan[0])}
                    <Text style={styles.amount}>{transcript.slice(...result.amountSpan)}</Text>
                    {transcript.slice(result.amountSpan[1])}
                  </>
                ) : (
                  transcript
                )}
              </Text>
            ) : (
              <Text style={[styles.transcript, { color: color.textSecondary }]}>
                {t.example(formatMoney(couple.currency === 'COP' ? 25000 : 2500, couple.currency), couple.partner.name)}
              </Text>
            )}
            <Text style={[type.body, { color: color.textSecondary, textAlign: 'center' }]}>{t.prompt}</Text>

            {chips.length > 0 && (
              <View style={styles.chips} accessible accessibilityLabel={`${t.chipsA11y}: ${chips.join(', ')}`}>
                {chips.map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text style={[type.label, { color: color.ink }]}>{c}</Text>
                  </View>
                ))}
              </View>
            )}
            {result?.foreignCurrency && (
              <Text style={[type.label, styles.note]} accessibilityLiveRegion="polite">
                {t.foreign(result.foreignCurrency, couple.currency)}
              </Text>
            )}
            {errorText && (
              <View style={{ gap: space[2], alignSelf: 'stretch' }}>
                <Text style={[type.label, styles.note]} accessibilityRole="alert">
                  {errorText}
                </Text>
                {dictation.error === 'denied' && <NavButton label={m.capture.openSettings} kind="secondary" onPress={() => void Linking.openSettings()} />}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {stage === 'live' && dictation.error !== 'denied' && (
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? t.stopA11y : t.startA11y}
            onPress={press}
            style={({ pressed }) => [styles.stop, pressed && { opacity: 0.8 }]}
          >
            {listening ? <View style={styles.stopSquare} /> : <Icon name="mic" size={30} color={color.onPrimary} />}
          </Pressable>
          <Text style={[type.label, { color: color.textSecondary }]}>{listening ? t.stop : errorText ? t.tryAgain : t.start}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

/** Miti in soft rings that breathe while listening (still, when the phone asks for less motion). */
function Indicator({ listening }: { listening: boolean }) {
  const styles = useStyles();
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce || !listening) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
      pulse.setValue(0);
    };
  }, [listening, pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  return (
    <View style={styles.indicator} aria-hidden>
      <Animated.View style={[styles.ringOuter, { transform: [{ scale }] }]} />
      <View style={styles.ringInner} />
      <Miti size={96} />
    </View>
  );
}

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  centered: { flex: 1, justifyContent: 'center', padding: space[5] },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[2] },
  iconButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerAction: { minHeight: touch, minWidth: touch, paddingHorizontal: space[3], alignItems: 'center', justifyContent: 'center' },
  headerActionText: { ...type.row, color: color.ink, fontFamily: font.bodyBold, textDecorationLine: 'underline' },
  content: { flexGrow: 1, alignItems: 'center', gap: space[4], paddingHorizontal: space[5], paddingVertical: space[4] },
  notice: { flex: 1, justifyContent: 'center', alignSelf: 'stretch', gap: space[4] },
  indicator: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginTop: space[2] },
  ringOuter: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: color.meTint, opacity: 0.5 },
  ringInner: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: color.meTint },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  transcript: { fontFamily: font.display, fontSize: 28, lineHeight: 36, color: color.ink, textAlign: 'center' },
  amount: { color: color.partnerText, fontFamily: font.display },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[2] },
  chip: { paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.tile, backgroundColor: color.neutralTint },
  note: { color: color.textSecondary, fontFamily: font.body, textAlign: 'center', lineHeight: 18 },
  footer: { alignItems: 'center', gap: space[2], paddingBottom: space[5], paddingTop: space[2] },
  stop: { width: 80, height: 80, borderRadius: 40, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  stopSquare: { width: 26, height: 26, borderRadius: 6, backgroundColor: color.onPrimary },
}));
