// Inicio › "Agregar un gasto" (docs/DESIGN.md › 05): Escanear and Dictar side by side, both Premium. A Free couple's
// tap opens the paywall with that benefit first (src/lib/premium.ts decides). The badge says "Premium" in words, so the crown is never the
// only cue; the legend line lives under the shortcut row below (src/ui/Shortcuts.tsx).
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePlan } from '@/api/plan';
import { canUse, type PremiumFeature } from '@/lib/premium';
import { CrownBadge } from './Capture';
import { Icon, type IconName } from './Icon';
import { openPaywall } from './Premium';
import { font, radius, space, touch } from './tokens';
import { makeStyles, useTheme } from './theme';
import { useI18n } from '@/i18n';

export function CaptureCards() {
  const { m } = useI18n();
  const { color, categories } = useTheme();
  const styles = useStyles();
  const { gate } = usePlan();
  const t = m.capture.home;

  const open = (feature: PremiumFeature) => {
    if (!canUse(feature, gate)) return openPaywall(feature);
    router.push(feature === 'scan' ? '/expense/scan' : '/expense/dictate');
  };

  // Icon tiles: pairs checked in tokens.test.ts (partner avatar, category tiles).
  const cards: { id: PremiumFeature; icon: IconName; title: string; detail: string; a11y: string; fg: string; bg: string }[] = [
    { id: 'scan', icon: 'camera', title: t.scan, detail: t.scanDetail, a11y: t.scanA11y, fg: color.partnerText, bg: color.partnerTint },
    { id: 'dictate', icon: 'mic', title: t.dictate, detail: t.dictateDetail, a11y: t.dictateA11y, fg: categories.casa.color, bg: categories.casa.tint },
  ];

  return (
    <View style={{ gap: space[3] }}>
      <Text style={styles.title} accessibilityRole="header">
        {t.title}
      </Text>
      <View style={styles.row}>
        {cards.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`${c.a11y}. ${c.detail}`}
            onPress={() => open(c.id)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardTop}>
              <View style={[styles.icon, { backgroundColor: c.bg }]}>
                <Icon name={c.icon} size={22} color={c.fg} />
              </View>
              <CrownBadge />
            </View>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <Text style={styles.cardDetail}>{c.detail}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  title: { ...type.label, color: color.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { flexDirection: 'row', gap: space[3] },
  card: {
    flex: 1,
    minHeight: touch * 3,
    gap: space[2],
    padding: space[4],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  pressed: { opacity: 0.7 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space[1], marginBottom: space[1] },
  icon: { width: 44, height: 44, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...type.row, fontFamily: font.bodyBold, color: color.ink },
  cardDetail: { ...type.label, fontFamily: font.body, color: color.textSecondary, lineHeight: 18 },
}));
