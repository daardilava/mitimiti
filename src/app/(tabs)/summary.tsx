import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { coupleKey, expenseKeys, useCouple, useExpenses } from '@/api/expenses';
import { isoDate, monthOf, shiftMonth } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { monthSummary, sharedCountLabel } from '@/lib/summary';
import { Icon, type IconName } from '@/ui/Icon';
import { PeriodNav } from '@/ui/PeriodNav';
import { NavButton, Pending, Screen } from '@/ui/Screen';
import { font, radius, space } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// 11 · Resumen: the month's shared spending by category, who paid, what each one's share was, and personal spending.
export default function Summary() {
  const { m, d } = useI18n();
  const { color, type, categories } = useTheme();
  const styles = useStyles();
  const client = useQueryClient();
  const couple = useCouple();
  const expenses = useExpenses();
  const thisMonth = monthOf(isoDate(new Date()));
  const [month, setMonth] = useState(thisMonth);

  const me = couple.data?.me;
  const summary = useMemo(() => (expenses.data && me ? monthSummary(expenses.data, month, me.id) : null), [expenses.data, me, month]);

  if (!summary || !couple.data) {
    return (
      <Screen title={m.summaryScreen.title}>
        <Pending failed={couple.isError || expenses.isError} onRetry={() => [coupleKey, expenseKeys.all].forEach((queryKey) => client.invalidateQueries({ queryKey }))} />
      </Screen>
    );
  }

  const { partner, currency } = couple.data;
  const fmt = (minor: number) => formatMoney(minor, currency);
  const max = summary.byCategory[0]?.totalMinor ?? 0;
  // Paid − share is this month's effect on the balance (payments between them are not spending).
  const overShare = summary.paid.mineMinor - summary.share.mineMinor;

  return (
    <Screen title={m.summaryScreen.title}>
      <PeriodNav
        title={d.monthLabel(month)}
        onPrevious={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        nextDisabled={month >= thisMonth}
      />

      <View style={styles.card}>
        <Text style={[type.label, { color: color.textSecondary, fontSize: 15 }]}>{m.summaryScreen.shared}</Text>
        <Text style={[type.hero, styles.tabular]} adjustsFontSizeToFit numberOfLines={1}>
          {fmt(summary.sharedTotalMinor)}
        </Text>
        <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>{sharedCountLabel(summary.sharedCount, m)}</Text>
      </View>

      {summary.sharedCount === 0 ? (
        <View style={styles.empty}>
          <Text style={[type.row, { fontFamily: font.bodyBold, textAlign: 'center' }]}>{m.summaryScreen.emptyTitle(d.monthNameOf(month))}</Text>
          <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', fontSize: 15 }]}>
            {month >= thisMonth ? m.summaryScreen.emptyNow : m.summaryScreen.emptyPast}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{m.summaryScreen.byCategory}</Text>
            {summary.byCategory.map((c) => {
              const cat = categories[c.category];
              return (
                <View key={c.category} style={{ gap: space[2] }} accessible accessibilityLabel={m.summaryScreen.categoryA11y(cat.name, fmt(c.totalMinor), c.pct)}>
                  <View style={styles.categoryRow}>
                    <View style={[styles.tile, { backgroundColor: cat.tint }]}>
                      <Icon name={cat.icon as IconName} size={20} color={cat.color} />
                    </View>
                    <Text style={[type.row, { flex: 1 }]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <Text style={[type.body, styles.tabular, { color: color.textSecondary, fontSize: 15 }]}>{c.pct}%</Text>
                    <Text style={[type.row, styles.tabular, styles.amount]}>{fmt(c.totalMinor)}</Text>
                  </View>
                  {/* Bars are relative to the largest category, like the design; the text carries the share. */}
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${(c.totalMinor / max) * 100}%`, backgroundColor: cat.color }]} />
                  </View>
                </View>
              );
            })}
          </View>

          <SplitCard
            title={m.summaryScreen.whoPaid}
            meName={couple.data.me.name}
            partnerName={partner.name}
            mine={summary.paid.mineMinor}
            theirs={summary.paid.theirsMinor}
            minePct={summary.paid.minePct}
            theirsPct={summary.paid.theirsPct}
            fmt={fmt}
          />

          <SplitCard
            title={m.summaryScreen.shares}
            meName={couple.data.me.name}
            partnerName={partner.name}
            mine={summary.share.mineMinor}
            theirs={summary.share.theirsMinor}
            minePct={summary.share.minePct}
            theirsPct={summary.share.theirsPct}
            fmt={fmt}
            note={
              overShare === 0
                ? m.summaryScreen.exactShares
                : overShare > 0
                  ? m.summaryScreen.putMore(couple.data.me.name, fmt(overShare))
                  : m.summaryScreen.putMore(partner.name, fmt(-overShare))
            }
          />
        </>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{m.summaryScreen.personal}</Text>
        <Text style={[type.heading, styles.tabular]}>{fmt(summary.personal.totalMinor)}</Text>
        <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>
          {summary.personal.count === 0
            ? m.summaryScreen.noPersonal
            : m.summaryScreen.personalSplit(couple.data.me.name, fmt(summary.personal.mineMinor), partner.name, fmt(summary.personal.theirsMinor))}
        </Text>
      </View>

      <NavButton href="/budgets" label={m.summaryScreen.seeBudgets} kind="secondary" />
    </Screen>
  );
}

/** Two people's part of the month: name · %, amount, and a blue / orange bar with a 2 px gap. */
function SplitCard(props: { title: string; meName: string; partnerName: string; mine: number; theirs: number; minePct: number; theirsPct: number; fmt: (minor: number) => string; note?: string }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  const { title, meName, partnerName, mine, theirs, minePct, theirsPct, fmt, note } = props;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.split} aria-hidden>
        {mine > 0 && <View style={{ flex: mine, backgroundColor: color.me }} />}
        {theirs > 0 && <View style={{ flex: theirs, backgroundColor: color.partner }} />}
      </View>
      <View style={{ flexDirection: 'row', gap: space[4] }}>
        <Person dot={color.me} label={`${meName} · ${minePct}%`} amount={fmt(mine)} />
        <Person dot={color.partner} label={`${partnerName} · ${theirsPct}%`} amount={fmt(theirs)} />
      </View>
      {note && <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>{note}</Text>}
    </View>
  );
}

function Person({ dot, label, amount }: { dot: string; label: string; amount: string }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[type.row, styles.tabular, { fontFamily: font.bodyBold, fontSize: 17 }]}>{amount}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, padding: space[4], gap: space[3] },
  cardTitle: { ...type.row, fontFamily: font.bodyBold, fontSize: 17 },
  tabular: { fontVariant: ['tabular-nums'] },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  tile: { width: 36, height: 36, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  amount: { fontFamily: font.bodyBold, minWidth: 96, textAlign: 'right' },
  // The bar starts under the name, past the 36 px tile and its 12 px gap.
  track: { height: 8, borderRadius: 4, backgroundColor: color.line, marginLeft: 48, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  split: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, backgroundColor: color.line },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: 'center', gap: space[2], paddingVertical: space[6], paddingHorizontal: space[6] },
}));
