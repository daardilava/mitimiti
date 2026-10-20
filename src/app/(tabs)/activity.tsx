import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { balanceKeys, useSettlements } from '@/api/balance';
import { coupleKey, expenseKeys, useCouple, useExpenses } from '@/api/expenses';
import { activityView, countLabel, dailySpend, isCurrentOrLater, periodLabel, periodRange, shiftPeriod, type ActivityFilter, type Period } from '@/lib/activity';
import { isoDate, monthOf } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { ExpenseRow, PaymentRow } from '@/ui/ExpenseRow';
import { DatePickerSheet } from '@/ui/DatePickerSheet';
import { Chip, SearchField } from '@/ui/Form';
import { Icon } from '@/ui/Icon';
import { PeriodNav } from '@/ui/PeriodNav';
import { Pending, Screen } from '@/ui/Screen';
import { SpendCard } from '@/ui/SpendChart';
import { font, radius, space } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// 08 · Movimientos: a day, week or month of expenses and payments, with a chart of who paid, search and filters.
export default function Activity() {
  const { m, d } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const client = useQueryClient();
  const couple = useCouple();
  const expenses = useExpenses();
  const settlements = useSettlements();

  const today = new Date();
  const [period, setPeriod] = useState<Period>('month');
  // Any date inside the period shown; the arrows move it one day, week or month.
  const [anchor, setAnchor] = useState(isoDate(today));
  const range = useMemo(() => periodRange(period, anchor), [period, anchor]);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState(false);
  // Bumped on every open so the calendar starts on the period shown, not where it was last browsed.
  const [opens, setOpens] = useState(0);

  const ready = couple.data && expenses.data && settlements.data;
  const me = couple.data?.me;
  const partner = couple.data?.partner;
  const view = useMemo(
    () =>
      ready && me && partner
        ? activityView(expenses.data!, settlements.data!, { ...range, me: me.id, filter, query, names: { [me.id]: me.name, [partner.id]: partner.name }, m })
        : null,
    [ready, expenses.data, settlements.data, range, me, partner, filter, query, m],
  );
  // Days with an expense or a payment get a dot in the calendar.
  const marked = useMemo(
    () => new Set([...(expenses.data ?? []).map((e) => e.spentOn), ...(settlements.data ?? []).map((p) => p.paidOn)]),
    [expenses.data, settlements.data],
  );
  const chart = useMemo(
    () => (expenses.data && me ? dailySpend(expenses.data, range.start, range.end, me.id) : []),
    [expenses.data, me, range],
  );

  if (!view || !couple.data) {
    return (
      <Screen title={m.activityScreen.title}>
        <Pending
          failed={couple.isError || expenses.isError || settlements.isError}
          onRetry={() => [coupleKey, expenseKeys.all, balanceKeys.settlements].forEach((queryKey) => client.invalidateQueries({ queryKey }))}
        />
      </Screen>
    );
  }

  const filters: { id: ActivityFilter; label: string }[] = [
    { id: 'all', label: m.activityScreen.all },
    { id: 'mine', label: m.activityScreen.paidBy(couple.data.me.name) },
    { id: 'theirs', label: m.activityScreen.paidBy(couple.data.partner.name) },
    { id: 'payments', label: m.activityScreen.payments },
  ];
  const narrowed = filter !== 'all' || query.trim() !== '';
  const atLatest = isCurrentOrLater(period, anchor, today);
  const periods: { id: Period; label: string }[] = [
    { id: 'day', label: m.activityScreen.day },
    { id: 'week', label: m.activityScreen.week },
    { id: 'month', label: m.activityScreen.month },
  ];
  const emptyTitle = period === 'day' ? m.activityScreen.emptyDay : period === 'week' ? m.activityScreen.emptyWeek : m.activityScreen.emptyMonth(d.monthNameOf(monthOf(anchor)));

  return (
    <Screen title={m.activityScreen.title}>
      <View style={styles.periods} accessibilityRole="radiogroup">
        {periods.map((p) => (
          <Chip key={p.id} label={p.label} selected={period === p.id} onPress={() => setPeriod(p.id)} />
        ))}
      </View>

      <PeriodNav
        title={periodLabel(period, anchor, today, d)}
        subtitle={m.activityScreen.subtitle(countLabel(view.count, m), formatMoney(view.expensesTotalMinor, couple.data.currency))}
        onPrevious={() => setAnchor(shiftPeriod(period, anchor, -1))}
        onNext={() => setAnchor(shiftPeriod(period, anchor, 1))}
        nextDisabled={atLatest}
        onTitlePress={() => {
          setOpens((n) => n + 1);
          setPicking(true);
        }}
        titleHint={m.activityScreen.changeDate}
      />

      <DatePickerSheet
        key={opens}
        visible={picking}
        period={period}
        value={anchor}
        today={isoDate(today)}
        marked={marked}
        onSelect={setAnchor}
        onClose={() => setPicking(false)}
      />

      <SpendCard key={`${period}:${range.start}`} days={chart} currency={couple.data.currency} meName={couple.data.me.name} partnerName={couple.data.partner.name} />

      <SearchField label={m.activityScreen.searchLabel} placeholder={m.activityScreen.searchPlaceholder} value={query} onChangeText={setQuery} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityRole="radiogroup" style={styles.chipsBleed}>
        {filters.map((f) => (
          <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ScrollView>

      {view.days.length === 0 ? (
        <Empty
          title={narrowed ? m.activityScreen.noMatch : emptyTitle}
          hint={narrowed ? m.activityScreen.noMatchHint : atLatest ? m.activityScreen.emptyNowHint : m.activityScreen.emptyPastHint}
        />
      ) : (
        view.days.map((day) => (
          <View key={day.date} style={{ gap: space[2] }}>
            {/* In the Día view the switcher already names the day. */}
            {period !== 'day' && (
              <Text style={[type.label, { color: color.textSecondary, fontSize: 15 }]} accessibilityRole="header">
                {d.dayHeading(day.date, today)}
              </Text>
            )}
            <View style={styles.card}>
              {day.items.map((item) =>
                item.kind === 'expense' ? (
                  <ExpenseRow key={item.expense.id} expense={item.expense} couple={couple.data} />
                ) : (
                  <PaymentRow key={item.payment.id} payment={item.payment} couple={couple.data} />
                ),
              )}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

/** "Estado vacío: qué pasó y qué hacer." */
function Empty({ title, hint }: { title: string; hint: string }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name="list" size={24} color={color.textSecondary} />
      </View>
      <Text style={[type.row, { fontFamily: font.bodyBold }]}>{title}</Text>
      <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', fontSize: 15 }]}>{hint}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  periods: { flexDirection: 'row', gap: space[2] },
  // Chips scroll edge to edge, past the screen's 20 px margin.
  chipsBleed: { marginHorizontal: -space[5], flexGrow: 0 },
  chips: { gap: space[2], paddingHorizontal: space[5] },
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, paddingHorizontal: space[4], paddingVertical: space[2] },
  empty: { alignItems: 'center', gap: space[2], paddingVertical: space[8], paddingHorizontal: space[6] },
  emptyIcon: { width: 52, height: 52, borderRadius: radius.option, backgroundColor: color.neutralTint, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
}));
