// Inicio's shortcut row (docs/DESIGN.md › 05): Rápido · Dictar · Presupuestos · Exportar · Historial. Where
// each goes is src/lib/shortcuts.ts. A Premium one shows a crown and opens the paywall on Free; its spoken label says
// Premium, and a line under the row says what the crown means, so the icon is never the only cue.
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePlan } from '@/api/plan';
import { dictationAvailable } from '@/api/voice';
import { isLocked, shortcutIds, shortcutTarget, type ShortcutId } from '@/lib/shortcuts';
import { Icon, type IconName } from './Icon';
import { openPaywall } from './Premium';
import { font, radius, space, touch } from './tokens';
import { makeStyles, useTheme } from './theme';
import { useI18n } from '@/i18n';

const ICON: Record<ShortcutId, IconName> = {
  quick: 'bolt',
  dictate: 'mic',
  budgets: 'gauge',
  export: 'share',
  history: 'history',
};

export function Shortcuts() {
  const { m } = useI18n();
  const { color, categories } = useTheme();
  const styles = useStyles();
  const { gate } = usePlan();
  const canDictate = useMemo(() => dictationAvailable(), []);
  const ids = shortcutIds(canDictate);

  // Icon on its tile: pairs already checked at 3:1 in tokens.test.ts (avatar and category tiles).
  const look: Record<ShortcutId, { fg: string; bg: string }> = {
    quick: { fg: color.partnerText, bg: color.partnerTint },
    dictate: { fg: categories.casa.color, bg: categories.casa.tint },
    budgets: { fg: categories.ocio.color, bg: categories.ocio.tint },
    export: { fg: categories.transporte.color, bg: categories.transporte.tint },
    history: { fg: categories.otros.color, bg: categories.otros.tint },
  };

  const open = (id: ShortcutId) => {
    const target = shortcutTarget(id, gate);
    if (target.kind === 'paywall') openPaywall(target.from);
    else router.push(target.route);
  };

  return (
    <View style={{ gap: space[2] }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.row}>
        {ids.map((id) => {
          const locked = isLocked(id, gate);
          const { fg, bg } = look[id];
          const s = m.home.shortcuts[id];
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={locked ? `${s.a11y}, ${m.premium.badge}` : s.a11y}
              onPress={() => open(id)}
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
            >
              <View style={[styles.icon, { backgroundColor: bg }]}>
                <Icon name={ICON[id]} size={22} color={fg} />
                {locked && (
                  <View style={styles.crown}>
                    <Icon name="crown" size={12} color={color.warningText} />
                  </View>
                )}
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {ids.some((id) => isLocked(id, gate)) && (
        <View style={styles.legend}>
          <Icon name="crown" size={14} color={color.warningText} />
          <Text style={styles.legendText}>{m.home.shortcuts.crownLegend}</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  // The row runs to the screen edges so a long row (Spanish labels, large text) scrolls instead of squeezing.
  bleed: { marginHorizontal: -space[5] },
  row: { flexGrow: 1, justifyContent: 'space-between', gap: space[1], paddingHorizontal: space[5] },
  tile: { minWidth: 60, minHeight: touch, alignItems: 'center', gap: space[2], paddingVertical: space[1] },
  pressed: { opacity: 0.7 },
  icon: { width: 52, height: 52, borderRadius: radius.option, alignItems: 'center', justifyContent: 'center' },
  crown: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    borderWidth: 2,
    borderColor: color.background,
  },
  label: { ...type.label, fontFamily: font.bodySemi, color: color.ink },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  legendText: { ...type.label, fontFamily: font.body, color: color.textSecondary },
}));
