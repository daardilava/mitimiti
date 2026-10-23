import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { balanceKeys, useMyBalance, useSettlements } from '@/api/balance';
import { useBudgets } from '@/api/budgets';
import { coupleKey, expenseKeys, useCouple, useExpenses, type Expense } from '@/api/expenses';
import { usePlan } from '@/api/plan';
import { balanceBasis, balanceHeadline, monthSpend, sharedCount } from '@/lib/balance';
import { isoDate, monthOf } from '@/lib/dates';
import { budgetStatus, daysLeftInMonth, daysLeftLabel, monthBudget, type BudgetTone } from '@/lib/budgets';
import { formatMoney, type Currency } from '@/lib/money';
import { canUseFeature } from '@/lib/plans';
import { TextLink } from '@/ui/Auth';
import { Avatar } from '@/ui/Avatar';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { NavButton, Pending, Screen } from '@/ui/Screen';
import { Icon } from '@/ui/Icon';
import { openPaywall, PremiumBadge } from '@/ui/Premium';
import { font, radius, space, type Palette } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

const RECENT = 4;

// 05 · Inicio: the live balance, this month's shared spending by who paid, and the latest expenses.
export default function Home() {
  const { m, d } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
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
      <Screen title={m.home.title}>
        <Pending
          failed={failed}
          onRetry={() => [coupleKey, expenseKeys.all, balanceKeys.balance, balanceKeys.settlements].forEach((queryKey) => client.invalidateQueries({ queryKey }))}
        />
      </Screen>
    );
  }

  const { me, partner, currency } = couple.data;
  const net = balance.data;
  const headline = balanceHeadline(net, partner.name, m);
  const month = monthSpend(expenses.data, monthOf(isoDate(today)), me.id);
  const recent = expenses.data.slice(0, RECENT);
  const fmt = (minor: number) => formatMoney(minor, currency);

  return (
    <Screen
      title={m.home.title}
      header={
        <View style={styles.header}>
          <View style={styles.avatars} aria-hidden>
            <Avatar name={me.name} isMe avatar={me.avatar} size={40} />
            <View style={styles.overlap}>
              <Avatar name={partner.name} isMe={false} avatar={partner.avatar} size={40} />
            </View>
          </View>
          <View>
            <Text style={[type.label, { color: color.textSecondary, fontSize: 15 }]}>{d.monthTitle(today)}</Text>
            <Text style={type.heading} accessibilityRole="header">
              {me.name} y {partner.name}
            </Text>
          </View>
        </View>
      }
    >
      <View style={styles.balance} accessible accessibilityLabel={`${headline} ${fmt(net)}`}>
        <Text style={[type.row, { color: color.onInk, fontSize: 17 }]}>{headline}</Text>
        <Text style={[type.balance, styles.tabular, { color: color.onHero }]} adjustsFontSizeToFit numberOfLines={1}>
          {fmt(net)}
        </Text>
        <Text style={[type.body, { color: color.onInkMuted, fontSize: 15, lineHeight: 22 }]}>{balanceBasis(sharedCount(expenses.data), settlements.data.length, m)}</Text>
        {net !== 0 && (
          <View style={{ marginTop: space[2] }}>
            <NavButton href="/settle" label={m.home.settle} kind="inverse" />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitle}>
          <Text style={[type.row, { fontFamily: font.bodyBold, flex: 1 }]}>{m.home.spentTogether(d.monthName(today))}</Text>
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
          <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>{m.home.noSharedThisMonth}</Text>
        )}
      </View>

      <BudgetCard expenses={expenses.data} month={monthOf(isoDate(today))} today={today} currency={currency} />

      <View style={styles.sectionTitle}>
        <Text style={[type.heading, { flex: 1 }]}>{m.home.recent}</Text>
        {expenses.data.length > RECENT && <TextLink label={m.home.seeAll} href="/activity" />}
      </View>
      <View style={styles.card}>
        {recent.length > 0 ? (
          recent.map((e) => <ExpenseRow key={e.id} expense={e} couple={couple.data} />)
        ) : (
          <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', paddingVertical: space[4] }]}>
            {m.home.noExpenses}
          </Text>
        )}
      </View>
    </Screen>
  );
}

const budgetBar = (c: Palette): Record<BudgetTone, string> => ({ ok: c.positive, warning: c.warning, over: c.negative, none: c.line });

/** "Presupuesto del mes 72 % ›": the month against the limits; opens Presupuestos. Hidden while budgets load. */
function BudgetCard({ expenses, month, today, currency }: { expenses: Expense[]; month: string; today: Date; currency: Currency }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const budgets = useBudgets();
  const { gate } = usePlan();
  // Free: the card stays, says Premium in text and opens the paywall; the limits already saved are kept.
  if (!canUseFeature(gate, 'budgets')) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${m.home.budgetTitle}, ${m.premium.badge}. ${m.premium.homeBudget}`} onPress={() => openPaywall('budgets')} style={styles.card}>
        <View style={styles.cardTitle}>
          <Text style={[type.row, { fontFamily: font.bodyBold, flex: 1 }]}>{m.home.budgetTitle}</Text>
          <PremiumBadge />
          <Icon name="forward" size={20} color={color.textSecondary} />
        </View>
        <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>{m.premium.homeBudget}</Text>
      </Pressable>
    );
  }
  if (!budgets.data) return null;
  const b = monthBudget(expenses, budgets.data, month, currency, m);
  const fmt = (n: number) => formatMoney(n, currency);
  const status = budgetStatus(b.spentMinor, b.totalLimitMinor, currency, m);

  return (
    <Link href="/budgets" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={b.totalLimitMinor > 0 ? m.home.budgetA11y(b.pct, m.ui.amountOf(fmt(b.spentMinor), fmt(b.totalLimitMinor)), status.text) : m.home.budgetSetUpA11y}
        style={styles.card}
      >
        <View style={styles.cardTitle}>
          <Text style={[type.row, { fontFamily: font.bodyBold, flex: 1 }]}>{m.home.budgetTitle}</Text>
          {b.totalLimitMinor > 0 && <Text style={[type.row, styles.tabular, { color: color.textSecondary }]}>{b.pct}%</Text>}
          <Icon name="forward" size={20} color={color.textSecondary} />
        </View>
        {b.totalLimitMinor > 0 ? (
          <>
            <View style={styles.bar}>
              <View style={{ width: `${Math.min(b.spentMinor / b.totalLimitMinor, 1) * 100}%`, backgroundColor: budgetBar(color)[status.tone] }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[3] }}>
              <Text style={[type.body, styles.tabular, { color: color.textSecondary, fontSize: 15 }]}>
                {m.ui.amountOf(fmt(b.spentMinor), fmt(b.totalLimitMinor))}
              </Text>
              <Text style={[type.body, { color: status.tone === 'ok' ? color.textSecondary : status.tone === 'over' ? color.negative : color.warningText, fontSize: 15 }]}>
                {status.tone === 'ok' ? daysLeftLabel(daysLeftInMonth(today), m) : status.text}
              </Text>
            </View>
          </>
        ) : (
          <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>{m.home.budgetSetUp}</Text>
        )}
      </Pressable>
    </Link>
  );
}

function Paid({ name, amount, dot }: { name: string; amount: string; dot: string }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]} numberOfLines={1}>
          {m.chart.paidBy(name)}
        </Text>
      </View>
      <Text style={[type.row, styles.tabular, { fontFamily: font.bodyBold, fontSize: 17 }]}>{amount}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingTop: space[2] },
  avatars: { flexDirection: 'row' },
  overlap: { marginLeft: -10, borderRadius: 22, borderWidth: 2, borderColor: color.background },
  balance: { backgroundColor: color.hero, borderRadius: radius.sheet, padding: 22, gap: space[2] },
  tabular: { fontVariant: ['tabular-nums'] },
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, padding: space[4], gap: space[3] },
  cardTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, backgroundColor: color.line },
  legend: { flexDirection: 'row', gap: space[4] },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginTop: space[2] },
}));
