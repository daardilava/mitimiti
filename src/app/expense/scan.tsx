import { CameraView, useCameraPermissions } from 'expo-camera';
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCouple, type Couple } from '@/api/expenses';
import { usePlan } from '@/api/plan';
import { pickFromLibrary, readReceipt, shrinkPhoto, type ReceiptAnswer } from '@/api/receipts';
import { daysAgo } from '@/lib/dates';
import { setReceipt } from '@/lib/draftStore';
import { canUse } from '@/lib/premium';
import { readingFromAi } from '@/lib/receiptDraft';
import { Icon } from '@/ui/Icon';
import { Miti } from '@/ui/Miti';
import { Loading, NavButton } from '@/ui/Screen';
import { font, radius, space, touch } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// Escanear (docs/PLAN.md › Scan + Dictate), Premium: frame the receipt, take the photo (or pick one), and the review
// screen opens with what was read. The photo is shrunk on the phone, sent once to read-receipt and never kept. The
// screen stays dark in both modes, like a camera (hero tokens, the same in light and dark).
export default function Scan() {
  const { m } = useI18n();
  const couple = useCouple();
  const { gate } = usePlan();

  if (!couple.data) return <Loading title={m.capture.scan.title} error={couple.error} />;
  // Free: the paywall instead, never the camera (also when reached by a link or before the plan had loaded).
  if (!canUse('scan', gate)) return <Redirect href={{ pathname: '/paywall', params: { from: 'scan' } }} />;
  return <Camera couple={couple.data} />;
}

type ErrorKind = Exclude<ReceiptAnswer['kind'], 'receipt'> | 'photo';
type Phase = { kind: 'camera' } | { kind: 'reading' } | { kind: 'error'; error: ErrorKind };

function TopBar({ torch, onTorch }: { torch?: boolean; onTorch?: () => void }) {
  const { m } = useI18n();
  const { color } = useTheme();
  const styles = useStyles();
  const t = m.capture.scan;
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" accessibilityLabel={m.ui.close} onPress={() => router.back()} style={styles.round}>
        <Icon name="close" size={22} color={color.onHero} />
      </Pressable>
      <View style={styles.pill}>
        <Icon name="crown" size={14} color={color.warningOnInk} />
        <Text style={styles.pillText} numberOfLines={1}>
          {t.pill}
        </Text>
      </View>
      {onTorch ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={t.flashA11y}
          accessibilityState={{ checked: !!torch }}
          onPress={onTorch}
          style={[styles.round, torch && styles.roundOn]}
        >
          <Icon name="bolt" size={20} color={torch ? color.hero : color.onHero} />
        </Pressable>
      ) : (
        <View style={styles.round} />
      )}
    </View>
  );
}

function Camera({ couple }: { couple: Couple }) {
  const { m, language } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const t = m.capture.scan;
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [torch, setTorch] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'camera' });

  const write = () => router.replace('/expense/new');

  const read = async (photo: { uri: string; width: number; height: number }) => {
    setPhase({ kind: 'reading' });
    const shrunk = await shrinkPhoto(photo);
    if (shrunk.kind !== 'image') return setPhase({ kind: 'error', error: 'photo' });
    const today = daysAgo(0);
    const answer = await readReceipt({ image: shrunk.base64, today, language }, { currency: couple.currency });
    if (answer.kind !== 'receipt') return setPhase({ kind: 'error', error: answer.kind });
    setReceipt(readingFromAi(answer.receipt, { currency: couple.currency, today, language }));
    router.replace('/expense/receipt');
  };

  const shoot = async () => {
    if (!camera.current || !ready || phase.kind !== 'camera') return;
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1, shutterSound: false });
      await read(photo);
    } catch {
      setPhase({ kind: 'error', error: 'photo' });
    }
  };

  const gallery = async () => {
    const picked = await pickFromLibrary();
    if (picked.kind === 'photo') await read(picked);
    else if (picked.kind === 'failed') setPhase({ kind: 'error', error: 'photo' });
  };

  // ─── Before the camera: explain, or say it was refused ───
  if (!permission) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <ActivityIndicator color={color.onHero} />
      </SafeAreaView>
    );
  }
  if (!permission.granted || unavailable) {
    const refused = !permission.granted && !permission.canAskAgain;
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar />
        <ScrollView contentContainerStyle={styles.explain}>
          <View style={styles.explainIcon}>
            <Icon name="camera" size={28} color={color.onHero} />
          </View>
          {unavailable ? (
            <Text style={[styles.lead, { textAlign: 'center' }]} accessibilityRole="alert">
              {t.cameraUnavailable}
            </Text>
          ) : (
            <>
              <Text style={[type.heading, { color: color.onHero, textAlign: 'center' }]} accessibilityRole="header">
                {t.permissionTitle}
              </Text>
              <Text style={[styles.lead, { textAlign: 'center' }]}>{refused ? t.permissionDenied : t.permissionWhy}</Text>
            </>
          )}
          <View style={{ alignSelf: 'stretch', gap: space[2] }}>
            {!unavailable &&
              (refused ? (
                <NavButton label={m.capture.openSettings} kind="inverse" onPress={() => void Linking.openSettings()} />
              ) : (
                <NavButton label={t.permissionAllow} kind="inverse" onPress={() => void requestPermission()} />
              ))}
            <NavButton label={t.choosePhoto} kind="outline" onPress={() => void gallery()} />
            <NavButton label={m.capture.locked.write} kind="outline" onPress={write} />
          </View>
        </ScrollView>
        {phase.kind !== 'camera' && <Overlay phase={phase} onRetry={() => setPhase({ kind: 'camera' })} onWrite={write} />}
      </SafeAreaView>
    );
  }

  // ─── The camera ───
  return (
    <View style={styles.safe}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        animateShutter
        onCameraReady={() => setReady(true)}
        onMountError={() => setUnavailable(true)}
      />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <TopBar torch={torch} onTorch={() => setTorch((on) => !on)} />
        {torch && (
          <Text style={[styles.hintText, { alignSelf: 'center' }]} accessibilityLiveRegion="polite">
            {t.flashOn}
          </Text>
        )}
        <View style={styles.middle}>
          <View style={styles.hint}>
            <Miti size={20} />
            <Text style={styles.hintText}>{t.frameHint}</Text>
          </View>
          <View style={styles.frame} aria-hidden>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <View style={styles.scanLine} />
          </View>
          <Text style={[styles.lead, styles.note]}>{t.notSaved}</Text>
        </View>
        <View style={styles.bottomBar}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.galleryA11y} onPress={() => void gallery()} style={styles.square}>
            <Icon name="image" size={22} color={color.onHero} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.shutterA11y}
            accessibilityState={{ disabled: !ready }}
            disabled={!ready}
            onPress={() => void shoot()}
            style={({ pressed }) => [styles.shutter, (pressed || !ready) && { opacity: 0.6 }]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={m.capture.writeA11y} onPress={write} style={styles.writeButton}>
            <Text style={styles.writeText}>{m.capture.write}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      {phase.kind !== 'camera' && <Overlay phase={phase} onRetry={() => setPhase({ kind: 'camera' })} onWrite={write} />}
    </View>
  );
}

/** Reading, or why it couldn't be read, over the camera: always with a way to type the expense instead. */
function Overlay({ phase, onRetry, onWrite }: { phase: Exclude<Phase, { kind: 'camera' }>; onRetry: () => void; onWrite: () => void }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const t = m.capture.scan;
  return (
    <View style={styles.scrimFill}>
      <View style={styles.scrimBg} aria-hidden />
      <View style={styles.card} accessibilityLiveRegion="polite">
        {phase.kind === 'reading' ? (
          <>
            <ActivityIndicator color={color.ink} size="large" />
            <Text style={[type.row, { fontFamily: font.bodyBold, textAlign: 'center' }]}>{t.reading}</Text>
            <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body, textAlign: 'center' }]}>{t.readingDetail}</Text>
          </>
        ) : (
          <>
            <Text style={[type.body, { textAlign: 'center' }]} accessibilityRole="alert">
              {t.errors[phase.error === 'premium' ? 'premium' : phase.error]}
            </Text>
            <View style={{ alignSelf: 'stretch', gap: space[2] }}>
              {phase.error !== 'limit' && phase.error !== 'premium' && <NavButton label={t.retry} kind="secondary" onPress={onRetry} />}
              <NavButton label={m.capture.locked.write} onPress={onWrite} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const CORNER = 34;

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.hero },
  centered: { justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2], paddingHorizontal: space[4], paddingTop: space[2] },
  round: { width: touch, height: touch, borderRadius: touch / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: color.hero },
  roundOn: { backgroundColor: color.onHero },
  pill: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.hero,
    borderWidth: 1,
    borderColor: color.heroLine,
  },
  pillText: { ...type.label, color: color.onHero },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], paddingHorizontal: space[6] },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.hero },
  hintText: { ...type.label, color: color.onHero },
  frame: { width: '100%', maxWidth: 320, aspectRatio: 0.68 },
  // Brand colours, like Miti: green on top, coral below (decoration; the hint says what to do).
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: color.wordmarkCoral },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.tile, borderColor: color.wordmarkGreen },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.tile, borderColor: color.wordmarkGreen },
  scanLine: { position: 'absolute', top: '52%', left: space[3], right: space[3], height: 2, borderRadius: 1, backgroundColor: color.wordmarkGreen, opacity: 0.8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.tile },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.tile },
  lead: { ...type.body, color: color.onInk, fontSize: 15, lineHeight: 22 },
  note: { textAlign: 'center', paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.tile, backgroundColor: color.hero, overflow: 'hidden' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[6], paddingBottom: space[4], paddingTop: space[2] },
  square: { width: 52, height: 52, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', backgroundColor: color.hero, borderWidth: 1, borderColor: color.heroLine },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: color.onHero, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: color.onHero },
  writeButton: { minWidth: 52, minHeight: touch, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[1], borderRadius: radius.control, backgroundColor: color.hero },
  writeText: { ...type.row, fontFamily: font.bodyBold, color: color.onHero, textDecorationLine: 'underline' },
  explain: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: space[4], padding: space[6] },
  explainIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.heroLine },
  scrimFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: space[6] },
  scrimBg: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: color.scrim, opacity: 0.55 },
  card: { alignSelf: 'stretch', alignItems: 'center', gap: space[3], padding: space[5], borderRadius: radius.card, backgroundColor: color.surface },
}));
