// Pieces shared by Escanear and Dictar (docs/PLAN.md › Scan + Dictate): the Premium badge with its crown, what a
// locked feature shows (always with a way to type the expense instead), a bottom sheet of choices, and the words for a
// split. Colours from useTheme(); the crown always comes with the word "Premium".
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Couple } from '@/api/expenses';
import type { PremiumFeature } from '@/lib/premium';
import type { SplitMode } from '@/lib/splits';
import { Icon } from './Icon';
import { openPaywall } from './Premium';
import { NavButton } from './Screen';
import { font, radius, space, touch } from './tokens';
import { makeStyles, useTheme } from './theme';
import { useI18n, type Messages } from '@/i18n';

/** "👑 Premium": a label, so the crown is never the only cue. */
export function CrownBadge() {
  const { m } = useI18n();
  const { color } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.badge} aria-hidden>
      <Icon name="crown" size={12} color={color.warningText} />
      <Text style={styles.badgeText}>{m.premium.badge}</Text>
    </View>
  );
}

/** A locked feature: what it does, the way to Premium, and typing the expense, which is always free. */
export function PremiumGate({ feature, onLeave }: { feature: PremiumFeature; onLeave?: () => void }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const t = m.capture.locked;
  const leave = onLeave ?? (() => {});
  return (
    <View style={styles.gate} accessibilityLiveRegion="polite">
      <View style={styles.gateIcon}>
        <Icon name="crown" size={24} color={color.warningText} />
      </View>
      <Text style={[type.heading, { textAlign: 'center' }]} accessibilityRole="header">
        {feature === 'scan' ? t.scanTitle : t.dictateTitle}
      </Text>
      <Text style={[type.body, { color: color.textSecondary, textAlign: 'center' }]}>{feature === 'scan' ? t.scanDetail : t.dictateDetail}</Text>
      <View style={{ alignSelf: 'stretch', gap: space[2] }}>
        <NavButton
          label={m.premium.see}
          onPress={() => {
            leave();
            openPaywall(feature);
          }}
        />
        <NavButton
          label={t.write}
          kind="secondary"
          onPress={() => {
            leave();
            router.push('/expense/new');
          }}
        />
      </View>
    </View>
  );
}

/** A sheet from the bottom with a title; tapping outside or the × closes it. */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable style={styles.scrim} accessibilityRole="button" accessibilityLabel={m.ui.close} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space[5] }]}>
          <View style={styles.sheetHeader}>
            <Text style={[type.bar, { flex: 1 }]} accessibilityRole="header">
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={m.ui.close} onPress={onClose} style={styles.iconButton}>
              <Icon name="close" size={22} color={color.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: space[2] }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** One choice in a Sheet: a radio row with an optional second line. */
export function Choice({ title, detail, selected, disabled, onPress }: { title: string; detail?: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceOn, disabled && { opacity: 0.5 }]}
    >
      <View style={[styles.ring, { borderColor: selected ? color.ink : color.disabled }]}>{selected && <View style={styles.dot} />}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 15 }]}>{title}</Text>
        {detail ? <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * A split in words, from the stored form (splitPct is the payer's share): "Mitad y mitad", "Diego 60 % · Ana 40 %",
 * "Todo le toca a Ana", "Personal de Diego". The same words as the form.
 */
export function splitLabel(m: Messages, couple: Pick<Couple, 'me' | 'partner'>, paidBy: string, splitMode: SplitMode, splitPct: number | null | undefined): string {
  const { me, partner } = couple;
  const payerIsMe = paidBy === me.id;
  const payer = payerIsMe ? me.name : partner.name;
  const other = payerIsMe ? partner.name : me.name;
  switch (splitMode) {
    case 'half':
      return m.expenseForm.half;
    case 'pct': {
      const myPct = payerIsMe ? (splitPct ?? 50) : 100 - (splitPct ?? 50);
      return m.capture.dictate.pct(me.name, String(myPct), partner.name, String(100 - myPct));
    }
    case 'other':
      return m.expenseForm.other(other);
    case 'personal':
      return m.expenseForm.personal(payer);
  }
}

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.tile,
    backgroundColor: color.neutralTint,
  },
  badgeText: { ...type.effect, color: color.textSecondary },
  gate: {
    alignItems: 'center',
    gap: space[3],
    padding: space[5],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  gateIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.neutralTint, alignItems: 'center', justifyContent: 'center' },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: color.scrim, opacity: 0.4 },
  sheet: {
    maxHeight: '80%',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingTop: space[3],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.surface,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', minHeight: touch },
  iconButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center', marginRight: -space[3] },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: touch + 8,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.option,
    backgroundColor: color.surface,
  },
  choiceOn: { borderColor: color.ink, borderWidth: 2 },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.ink },
}));
