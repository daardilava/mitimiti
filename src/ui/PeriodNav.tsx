// "‹ Octubre 2026 ›" card with a line under the title. Used by Movimientos and Resumen.
// With onTitlePress the title becomes a button (Movimientos opens its calendar there).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { font, radius, space, touch } from './tokens';
import { useI18n } from '@/i18n';
import { makeStyles, useTheme } from './theme';

interface Props {
  title: string;
  subtitle?: string;
  onPrevious: () => void;
  onNext: () => void;
  /** No periods after the current one. */
  nextDisabled?: boolean;
  /** No going further back (the Free plan's limit). */
  previousDisabled?: boolean;
  onTitlePress?: () => void;
  /** Screen-reader hint for the title button: "Cambiar fecha". */
  titleHint?: string;
}

export function PeriodNav({ title, subtitle, onPrevious, onNext, nextDisabled, previousDisabled, onTitlePress, titleHint }: Props) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Arrow icon="back" label={m.ui.previous} disabled={previousDisabled} onPress={onPrevious} />
      <Pressable
        disabled={!onTitlePress}
        onPress={onTitlePress}
        accessibilityRole={onTitlePress ? 'button' : undefined}
        accessibilityHint={onTitlePress ? titleHint : undefined}
        style={({ pressed }) => [styles.title, pressed && { backgroundColor: color.neutralTint }]}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.titleLine}>
          {onTitlePress && <Icon name="calendar" size={18} color={color.ink} />}
          <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 17 }]}>{title}</Text>
        </View>
        {subtitle && <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>{subtitle}</Text>}
      </Pressable>
      <Arrow icon="forward" label={m.ui.next} disabled={nextDisabled} onPress={onNext} />
    </View>
  );
}

function Arrow({ icon, label, onPress, disabled }: { icon: 'back' | 'forward'; label: string; onPress: () => void; disabled?: boolean }) {
  const { color } = useTheme();
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={styles.arrow}>
      <Icon name={icon} size={22} color={disabled ? color.disabled : color.ink} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    paddingVertical: space[2],
    paddingHorizontal: space[1],
  },
  arrow: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minHeight: touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
}));
