import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { balanceKeys, useSettlements } from '@/api/balance';
import { coupleKey, expenseKeys, useCouple, useExpenses } from '@/api/expenses';
import { activityView, countLabel, dailySpend, isCurrentOrLater, lastDays, periodLabel, periodRange, shiftPeriod, shiftRange, type ActivityFilter, type DateRange, type Period } from '@/lib/activity';
import { isoDate, monthOf } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { ExpenseRow, PaymentRow } from '@/ui/ExpenseRow';
import { DatePickerSheet } from '@/ui/DatePickerSheet';
import { Chip, SearchField, Segmented } from '@/ui/Form';
import { Icon } from '@/ui/Icon';
import { PeriodNav } from '@/ui/PeriodNav';
import { Pending, Screen } from '@/ui/Screen';
import { SpendCard } from '@/ui/SpendChart';
import { font, radius, space } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// 08 · Movimientos: a day, week, month or picked range (Rango) of expenses and payments, with a chart of who paid,
// search and filters.
export default function Activity() {
  const { m, d } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const client = useQueryClient();
  const couple = useCouple();
  const expenses = useExpenses();
  const settlements = useSettlements();

  const today = new Date();
  const [period, setPeriod] = useState<Period | 'range'>('month');
  // Any date inside the period shown; the arrows move it one day, week or month.
  const [anchor, setAnchor] = useState(isoDate(today));
  // Rango: the picked from–to range; it starts on the last 7 days and the arrows move it by its own length.
  const [custom, setCustom] = useState<DateRange>(() => lastDays(7, today));
  const range = useMemo(() => (period === 'range' ? custom : periodRange(period, anchor)), [period, anchor, custom]);
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
  const todayIso = isoDate(today);
  const atLatest = period === 'range' ? custom.end >= todayIso : isCurrentOrLater(period, anchor, today);
  const periods: { id: Period | 'range'; label: string }[] = [
    { id: 'day', label: m.activityScreen.day },
    { id: 'week', label: m.activityScreen.week },
    { id: 'month', label: m.activityScreen.month },
    { id: 'range', label: m.activityScreen.range },
  ];
  const emptyTitle =
    period === 'day' ? m.activityScreen.emptyDay
      : period === 'week' ? m.activityScreen.emptyWeek
        : period === 'range' ? m.activityScreen.emptyRange
          : m.activityScreen.emptyMonth(d.monthNameOf(monthOf(anchor)));
  const move = (delta: number) => (period === 'range' ? setCustom(shiftRange(custom, delta, todayIso)) : setAnchor(shiftPeriod(period, anchor, delta)));

  return (
    <Screen title={m.activityScreen.title}>
      <Segmented label={m.activityScreen.periodLabel} options={periods} value={period} onChange={setPeriod} />

      <PeriodNav
        title={period === 'range' ? d.rangeLabel(custom.start, custom.end, today) : periodLabel(period, anchor, today, d)}
        subtitle={m.activityScreen.subtitle(countLabel(view.count, m), formatMoney(view.expensesTotalMinor, couple.data.currency))}
        onPrevious={() => move(-1)}
        onNext={() => move(1)}
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
        value={period === 'range' ? custom.end : anchor}
        today={todayIso}
        marked={marked}
        onSelect={setAnchor}
        range={custom}
        onSelectRange={setCustom}
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
  // Chips scroll edge to edge, past the screen's 20 px margin.
  chipsBleed: { marginHorizontal: -space[5], flexGrow: 0 },
  chips: { gap: space[2], paddingHorizontal: space[5] },
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, paddingHorizontal: space[4], paddingVertical: space[2] },
  empty: { alignItems: 'center', gap: space[2], paddingVertical: space[8], paddingHorizontal: space[6] },
  emptyIcon: { width: 52, height: 52, borderRadius: radius.option, backgroundColor: color.neutralTint, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
}));
