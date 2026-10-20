import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useMyBalance } from '@/api/balance';
import { useCouple } from '@/api/expenses';
import { balanceHeadline } from '@/lib/balance';
import { formatMoney } from '@/lib/money';
import { paidSentence, type SettleMethod } from '@/lib/settle';
import { Icon } from '@/ui/Icon';
import { NavButton, Screen } from '@/ui/Screen';
import { radius, space } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// 10 · Pago registrado: the payment just recorded and the balance after it.
export default function SettleDone() {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ amount: string; method: SettleMethod; from: string; to: string }>();
  const couple = useCouple().data;
  const balance = useMyBalance();

  const nameOf = (id: string) => (id === couple?.me.id ? couple?.me.name : couple?.partner.name) ?? '';
  const currency = couple?.currency ?? 'COP';
  // useRecordSettlement waits for the balance to refetch before navigating here, so this is already the new one.
  const net = balance.data;

  return (
    <Screen
      title={m.settleScreen.doneTitle}
      // The big title below says it; an empty header keeps the top spacing without repeating it.
      header={<View />}
      footer={
        <View style={{ gap: space[3] }}>
          <NavButton label={m.settleScreen.backHome} onPress={() => router.dismissTo('/')} />
          <NavButton label={m.settleScreen.seeActivity} kind="secondary" onPress={() => router.dismissTo('/activity')} />
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.check} aria-hidden>
          <Icon name="check" size={44} color={color.onPositive} />
        </View>
        <Text style={[type.screenTitle, { textAlign: 'center' }]} accessibilityRole="header">
          {m.settleScreen.doneTitle}
        </Text>
        {couple && (
          <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', fontSize: 17, lineHeight: 26 }]}>
            {paidSentence(nameOf(params.from), nameOf(params.to), Number(params.amount), params.method, currency, m)}
          </Text>
        )}
      </View>

      <View style={styles.card} accessibilityLiveRegion="polite">
        <Text style={[type.label, { color: color.textSecondary }]}>{m.settleScreen.currentBalance}</Text>
        {net === undefined || !couple ? (
          <Text style={[type.heading, { color: color.textSecondary }]}>{m.settleScreen.calculating}</Text>
        ) : (
          <Text style={[type.heading, { fontSize: 24, textAlign: 'center' }]}>
            {net === 0 ? m.balance.even : `${balanceHeadline(net, couple.partner.name, m)} ${formatMoney(net, currency)}`}
          </Text>
        )}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  hero: { alignItems: 'center', gap: space[4], marginTop: space[12] },
  check: { width: 96, height: 96, borderRadius: 48, backgroundColor: color.positive, alignItems: 'center', justifyContent: 'center' },
  card: { alignItems: 'center', gap: space[2], backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, padding: space[5], marginTop: space[6] },
}));
