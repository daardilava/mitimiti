import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '@/lib/money';
import { ME, names, PARTNER, sampleExpenses, sampleSettlements } from '@/lib/sample';
import { expenseEffect, netBalance } from '@/lib/splits';
import { NavButton, Screen, Todo } from '@/ui/Screen';
import { categories, color, radius, space, type } from '@/ui/tokens';

// 05 · Inicio. Reads sample data until §5 wires balance_view, monthly_summary and budgets.
export default function Home() {
  const currency = 'COP';
  const net = netBalance(sampleExpenses, sampleSettlements, ME);
  const partner = names[PARTNER];
  const label = net > 0 ? `${partner} te debe` : net < 0 ? `Le debes a ${partner}` : 'Están a mano';
  const recent = sampleExpenses.slice(0, 4);

  return (
    <Screen title={`${names[ME]} y ${partner}`}>
      <View style={styles.balance} accessibilityLabel={`${label} ${formatMoney(net, currency)}`}>
        <Text style={[type.label, { color: '#C9CDD3', fontSize: 15 }]}>{label}</Text>
        <Text style={[type.balance, { color: color.surface }]}>{formatMoney(net, currency)}</Text>
        {net !== 0 && <NavButton href="/settle" label="Saldar cuentas" kind="secondary" />}
      </View>

      <Todo feature="§5 Dashboard">Gastado juntos en el mes, quién pagó y barra de presupuesto.</Todo>

      <View style={styles.card}>
        <Text style={[type.row, { fontFamily: 'DMSans_700Bold' }]}>Recientes</Text>
        {recent.map((e) => {
          const effect = expenseEffect(e, ME);
          const cat = categories[e.category];
          return (
            <Link key={e.id} href={{ pathname: '/expense/[id]', params: { id: e.id } }} asChild>
              <Pressable style={styles.row} accessibilityRole="button">
                <View style={[styles.tile, { backgroundColor: cat.tint }]} />
                <View style={{ flex: 1 }}>
                  <Text style={type.row} numberOfLines={1}>{e.description}</Text>
                  <Text style={[type.label, { color: color.textSecondary }]}>Pagó {names[e.paidBy]}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[type.row, { fontFamily: 'DMSans_700Bold' }]}>{formatMoney(e.amountMinor, currency)}</Text>
                  <Text style={[type.effect, { color: e.splitMode === 'personal' ? color.textSecondary : effect > 0 ? color.positiveText : color.negative }]}>
                    {e.splitMode === 'personal' ? 'Personal' : effect > 0 ? `Te deben ${formatMoney(effect, currency)}` : `Debes ${formatMoney(effect, currency)}`}
                  </Text>
                </View>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { backgroundColor: color.ink, borderRadius: radius.sheet, padding: 22, gap: space[3] },
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, padding: space[4], gap: space[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], minHeight: 44 },
  tile: { width: 44, height: 44, borderRadius: radius.control },
});
