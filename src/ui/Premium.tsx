// What a Free couple sees where Premium begins: a "Premium" label on an entry point, and the way to the paywall
// (src/app/paywall.tsx), which every Premium feature opens instead of itself on Free.
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { Benefit } from '@/lib/paywall';
import { radius, space } from './tokens';
import { makeStyles, useTheme } from './theme';
import { useI18n } from '@/i18n';

/** The paywall, with the benefit that led there first (none from Ajustes › Tu plan). */
export const openPaywall = (from?: Benefit) => router.push({ pathname: '/paywall', params: from ? { from } : {} });

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

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  badge: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.tile, backgroundColor: color.neutralTint },
}));
