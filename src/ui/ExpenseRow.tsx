// "Filas de movimientos" from the UI kit: total on the right, and under it how the balance changes for me.
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Couple, Expense } from '@/api/expenses';
import { expenseEffectLabel, type Tone } from '@/lib/balance';
import { shortDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { Icon, type IconName } from './Icon';
import { categories, color, font, radius, space, touch, type } from './tokens';

const toneColor: Record<Tone, string> = { positive: color.positiveText, negative: color.negative, neutral: color.textSecondary };

export function ExpenseRow({ expense: e, couple }: { expense: Expense; couple: Couple }) {
  const cat = categories[e.category];
  const payer = e.paidBy === couple.me.id ? couple.me.name : couple.partner.name;
  const effect = expenseEffectLabel(e, couple.me.id, couple.currency);
  const amount = formatMoney(e.amountMinor, couple.currency);

  return (
    <Link href={{ pathname: '/expense/[id]', params: { id: e.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${e.description || cat.name}, ${amount}, pagó ${payer}, ${shortDate(e.spentOn)}. ${effect.text}`}
        style={styles.row}
      >
        <View style={StyleSheet.flatten([styles.tile, { backgroundColor: cat.tint }])}>
          <Icon name={cat.icon as IconName} size={22} color={cat.color} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.row} numberOfLines={1}>
            {e.description || cat.name}
          </Text>
          <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]} numberOfLines={1}>
            Pagó {payer} · {shortDate(e.spentOn)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={[type.row, styles.figure]}>{amount}</Text>
          <Text style={[type.effect, { color: toneColor[effect.tone] }]}>{effect.text}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], minHeight: touch },
  tile: { width: 44, height: 44, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  figure: { fontFamily: font.bodyBold, fontVariant: ['tabular-nums'] },
});
