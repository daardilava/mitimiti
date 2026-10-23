// What a Free couple sees where Premium begins: a "Premium" label on an entry point, and the locked state that
// replaces a Premium screen or an older period. Both say it in text and lead to the paywall (src/app/paywall.tsx).
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { Benefit } from '@/lib/paywall';
import { Icon } from './Icon';
import { NavButton } from './Screen';
import { font, radius, space } from './tokens';
import { makeStyles, useTheme } from './theme';
import { useI18n } from '@/i18n';

export const openPaywall = (from: Benefit) => router.push({ pathname: '/paywall', params: { from } });

/** "Premium", next to a title. Text, so it never relies on colour or an icon alone. */
export function PremiumBadge() {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.badge}>
      <Text style={[type.effect, { color: color.textSecondary }]}>{m.premium.badge}</Text>
    </View>
  );
}

/** In place of a Premium screen or an older month: why it's closed, that nothing was lost, and the way in. */
export function Locked({ title, detail, from }: { title: string; detail: string; from: Benefit }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.icon}>
        <Icon name="lock" size={22} color={color.ink} />
      </View>
      <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 17, textAlign: 'center' }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[type.body, { color: color.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' }]}>{detail}</Text>
      <View style={{ alignSelf: 'stretch' }}>
        <NavButton label={m.premium.see} kind="secondary" onPress={() => openPaywall(from)} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  badge: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.tile, backgroundColor: color.neutralTint },
  card: {
    alignItems: 'center',
    gap: space[3],
    padding: space[5],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.neutralTint, alignItems: 'center', justifyContent: 'center' },
}));
