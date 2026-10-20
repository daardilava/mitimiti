// "Filas de movimientos" from the UI kit: total on the right, and under it how the balance changes for me.
// Used by Home (Recientes) and Movimientos.
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Settlement } from '@/api/balance';
import type { Couple, Expense } from '@/api/expenses';
import { paymentTitle } from '@/lib/activity';
import { expenseEffectLabel, type Tone } from '@/lib/balance';
import { formatMoney } from '@/lib/money';
import { Icon, type IconName } from './Icon';
import { font, radius, space, touch, type Palette } from './tokens';
import { useI18n } from '@/i18n';
import { makeStyles, useTheme } from './theme';

const toneColor = (c: Palette): Record<Tone, string> => ({ positive: c.positiveText, negative: c.negative, neutral: c.textSecondary });

export function ExpenseRow({ expense: e, couple }: { expense: Expense; couple: Couple }) {
  const { color, type, categories } = useTheme();
  const styles = useStyles();
  const cat = categories[e.category];
  const payer = e.paidBy === couple.me.id ? couple.me.name : couple.partner.name;
  const { m, d } = useI18n();
  const effect = expenseEffectLabel(e, couple.me.id, couple.currency, m);
  const amount = formatMoney(e.amountMinor, couple.currency);

  return (
    <Link href={{ pathname: '/expense/[id]', params: { id: e.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.rows.expenseA11y(e.description || cat.name, amount, payer, d.shortDate(e.spentOn), effect.text)}
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
            {m.rows.paidBy(payer, d.shortDate(e.spentOn))}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={[type.row, styles.figure]}>{amount}</Text>
          <Text style={[type.effect, { color: toneColor(color)[effect.tone] }]}>{effect.text}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

/** "Ana le pagó a Diego · Transferencia · 3 oct", the amount and "Pago". Green: payments are what settles. */
export function PaymentRow({ payment: p, couple }: { payment: Settlement; couple: Couple }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  const names = { [couple.me.id]: couple.me.name, [couple.partner.id]: couple.partner.name };
  const { m, d } = useI18n();
  const title = paymentTitle(p, names, m);
  const amount = formatMoney(p.amountMinor, couple.currency);
  const detail = `${m.activity.methods[p.method]} · ${d.shortDate(p.paidOn)}`;

  return (
    <View style={styles.row} accessible accessibilityLabel={m.rows.paymentA11y(title, amount, detail)}>
      <View style={StyleSheet.flatten([styles.tile, { backgroundColor: color.positiveTint }])}>
        <Icon name="swap" size={22} color={color.positive} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.row} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={[type.row, styles.figure]}>{amount}</Text>
        <Text style={[type.effect, { color: color.positiveText }]}>{m.rows.payment}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], minHeight: touch },
  tile: { width: 44, height: 44, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  figure: { fontFamily: font.bodyBold, fontVariant: ['tabular-nums'] },
}));
