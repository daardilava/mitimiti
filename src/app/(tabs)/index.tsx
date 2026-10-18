import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { balanceKeys, useMyBalance, useSettlements } from '@/api/balance';
import { coupleKey, expenseKeys, useCouple, useExpenses } from '@/api/expenses';
import { balanceBasis, balanceHeadline, monthSpend, sharedCount } from '@/lib/balance';
import { isoDate, monthName, monthOf, monthTitle } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { TextLink } from '@/ui/Auth';
import { Avatar } from '@/ui/Avatar';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { NavButton, Screen, Todo } from '@/ui/Screen';
import { color, font, radius, space, type } from '@/ui/tokens';

const RECENT = 4;

// 05 · Inicio: the live balance, this month's shared spending by who paid, and the latest expenses.
export default function Home() {
  const client = useQueryClient();
  const couple = useCouple();
  const expenses = useExpenses();
  const balance = useMyBalance();
  const settlements = useSettlements();

  const queries = [couple, expenses, balance, settlements];
  const failed = queries.some((q) => q.isError);
  const today = new Date();

  if (!couple.data || !expenses.data || balance.data === undefined || !settlements.data) {
    return (
      <Screen title="Inicio">
        {failed ? (
          <View style={{ gap: space[4], marginTop: space[8] }}>
            <Text style={[type.body, { color: color.textSecondary, textAlign: 'center' }]}>No se pudo cargar. Revisa tu conexión.</Text>
            <NavButton
              label="Reintentar"
              kind="secondary"
              onPress={() => [coupleKey, expenseKeys.all, balanceKeys.balance, balanceKeys.settlements].forEach((queryKey) => client.invalidateQueries({ queryKey }))}
            />
          </View>
        ) : (
          <ActivityIndicator color={color.ink} style={{ marginTop: space[8] }} />
        )}
      </Screen>
    );
  }

  const { me, partner, currency } = couple.data;
  const net = balance.data;
  const headline = balanceHeadline(net, partner.name);
  const month = monthSpend(expenses.data, monthOf(isoDate(today)), me.id);
  const recent = expenses.data.slice(0, RECENT);
  const fmt = (minor: number) => formatMoney(minor, currency);

  return (
    <Screen
      title="Inicio"
      header={
        <View style={styles.header}>
          <View style={styles.avatars} aria-hidden>
            <Avatar name={me.name} isMe size={40} />
            <View style={styles.overlap}>
              <Avatar name={partner.name} isMe={false} size={40} />
            </View>
          </View>
          <View>
            <Text style={[type.label, { color: color.textSecondary, fontSize: 15 }]}>{monthTitle(today)}</Text>
            <Text style={type.heading} accessibilityRole="header">
              {me.name} y {partner.name}
            </Text>
          </View>
        </View>
      }
    >
      <View style={styles.balance} accessible accessibilityLabel={`${headline} ${fmt(net)}`}>
        <Text style={[type.row, { color: color.onInk, fontSize: 17 }]}>{headline}</Text>
        <Text style={[type.balance, styles.tabular, { color: color.surface }]} adjustsFontSizeToFit numberOfLines={1}>
          {fmt(net)}
        </Text>
        <Text style={[type.body, { color: color.onInkMuted, fontSize: 15, lineHeight: 22 }]}>{balanceBasis(sharedCount(expenses.data), settlements.data.length)}</Text>
        {net !== 0 && (
          <View style={{ marginTop: space[2] }}>
            <NavButton href="/settle" label="Saldar cuentas" kind="secondary" />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitle}>
          <Text style={[type.row, { fontFamily: font.bodyBold, flex: 1 }]}>Gastado juntos en {monthName(today)}</Text>
          <Text style={[type.heading, styles.tabular]}>{fmt(month.totalMinor)}</Text>
        </View>
        {month.totalMinor > 0 ? (
          <>
            <View style={styles.bar} aria-hidden>
              {month.byMeMinor > 0 && <View style={{ flex: month.byMeMinor, backgroundColor: color.me }} />}
              {month.byPartnerMinor > 0 && <View style={{ flex: month.byPartnerMinor, backgroundColor: color.partner }} />}
            </View>
            <View style={styles.legend}>
              <Paid name={me.name} amount={fmt(month.byMeMinor)} dot={color.me} />
              <Paid name={partner.name} amount={fmt(month.byPartnerMinor)} dot={color.partner} />
            </View>
          </>
        ) : (
          <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>Aún no hay gastos compartidos este mes.</Text>
        )}
      </View>

      <Todo feature="v1.1 Budgets">Presupuesto del mes: barra con el porcentaje usado y los días que quedan.</Todo>

      <View style={styles.sectionTitle}>
        <Text style={[type.heading, { flex: 1 }]}>Recientes</Text>
        {expenses.data.length > RECENT && <TextLink label="Ver todos" href="/activity" />}
      </View>
      <View style={styles.card}>
        {recent.length > 0 ? (
          recent.map((e) => <ExpenseRow key={e.id} expense={e} couple={couple.data} />)
        ) : (
          <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', paddingVertical: space[4] }]}>
            Aún no hay gastos. Toca + para agregar el primero.
          </Text>
        )}
      </View>
    </Screen>
  );
}

function Paid({ name, amount, dot }: { name: string; amount: string; dot: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]} numberOfLines={1}>
          Pagó {name}
        </Text>
      </View>
      <Text style={[type.row, styles.tabular, { fontFamily: font.bodyBold, fontSize: 17 }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingTop: space[2] },
  avatars: { flexDirection: 'row' },
  overlap: { marginLeft: -10, borderRadius: 22, borderWidth: 2, borderColor: color.background },
  balance: { backgroundColor: color.ink, borderRadius: radius.sheet, padding: 22, gap: space[2] },
  tabular: { fontVariant: ['tabular-nums'] },
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, padding: space[4], gap: space[3] },
  cardTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, backgroundColor: color.line },
  legend: { flexDirection: 'row', gap: space[4] },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginTop: space[2] },
});
