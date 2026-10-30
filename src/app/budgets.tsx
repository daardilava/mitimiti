import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { budgetKeys, useBudgets, useSetBudget } from '@/api/budgets';
import { coupleKey, expenseKeys, useCouple, useExpenses } from '@/api/expenses';
import { BUDGET_STEP, budgetStatus, daysLeftInMonth, daysLeftLabel, monthBudget, monthBudgetLine, stepLimit, type BudgetTone } from '@/lib/budgets';
import { isoDate, monthOf } from '@/lib/dates';
import { formatMoney, type Currency } from '@/lib/money';
import { Icon, type IconName } from '@/ui/Icon';
import { Pending, Screen } from '@/ui/Screen';
import { font, radius, space, type CategoryId, type Palette } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

const onInk = (c: Palette): Record<BudgetTone, string> => ({ ok: c.positiveOnInk, warning: c.warningOnInk, over: c.negativeOnInk, none: c.inkTrack });
const bar = (c: Palette): Record<BudgetTone, string> => ({ ok: c.positive, warning: c.warning, over: c.negative, none: c.line });
const text = (c: Palette): Record<BudgetTone, string> => ({ ok: c.textSecondary, warning: c.warningText, over: c.negative, none: c.textSecondary });

// 12 · Presupuestos: a monthly limit per category against shared spending, moved with − / +.
export default function Budgets() {
  const { m, d } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const client = useQueryClient();
  const couple = useCouple();
  const expenses = useExpenses();
  const budgets = useBudgets();
  const save = useSetBudget();

  if (!couple.data || !expenses.data || !budgets.data) {
    return (
      <Screen title={m.budgetsScreen.title} back="back">
        <Pending
          failed={couple.isError || expenses.isError || budgets.isError}
          onRetry={() => [coupleKey, expenseKeys.all, budgetKeys.all].forEach((queryKey) => client.invalidateQueries({ queryKey }))}
        />
      </Screen>
    );
  }

  const today = new Date();
  const month = monthOf(isoDate(today));
  const { currency } = couple.data;
  const b = monthBudget(expenses.data, budgets.data, month, currency, m);
  const fmt = (n: number) => formatMoney(n, currency);
  const fill = b.totalLimitMinor > 0 ? Math.min(b.spentMinor / b.totalLimitMinor, 1) : 0;

  return (
    <Screen title={m.budgetsScreen.title} back="back">
      <View style={styles.month} accessible accessibilityLabel={b.totalLimitMinor > 0 ? `${m.ui.amountOf(fmt(b.spentMinor), fmt(b.totalLimitMinor))}. ${b.status.text}` : m.budgetsScreen.noLimitsA11y}>
        <Text style={[type.row, { color: color.onInk }]}>
          {m.budgetsScreen.monthHeader(d.monthName(today), daysLeftLabel(daysLeftInMonth(today), m))}
        </Text>
        {b.totalLimitMinor > 0 ? (
          <>
            <Text style={[type.screenTitle, styles.tabular, { color: color.onHero }]}>
              {m.ui.amountOf(fmt(b.spentMinor), fmt(b.totalLimitMinor))}
            </Text>
            <View style={[styles.track, { backgroundColor: color.inkTrack }]}>
              <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: onInk(color)[b.status.tone] }]} />
            </View>
          </>
        ) : null}
        <Text style={[type.body, { color: color.onInk }]}>{monthBudgetLine(b.spentMinor, b.totalLimitMinor, currency, m)}</Text>
      </View>

      <Text style={[type.body, { color: color.textSecondary, fontSize: 15, lineHeight: 22 }]}>
        {m.budgetsScreen.help(fmt(BUDGET_STEP[currency]))}
      </Text>

      {b.categories.map((c) => (
        <CategoryBudget
          key={c.category}
          category={c.category}
          limitMinor={c.limitMinor}
          spentMinor={c.spentMinor}
          currency={currency}
          onSave={(limitMinor, done) => save.mutate({ category: c.category, month: `${month}-01`, limitMinor }, { onSettled: done })}
        />
      ))}
      {save.isError && (
        <Text style={[type.label, { color: color.negative, textAlign: 'center' }]} accessibilityLiveRegion="polite">
          {m.budgetsScreen.saveFailed}
        </Text>
      )}
    </Screen>
  );
}

/**
 * One category: − / + change a local draft at once (holding repeats), and the draft is saved 600 ms after the last
 * change, so holding + to $2.500.000 is one write, not fifty.
 */
function CategoryBudget({ category, limitMinor, spentMinor, currency, onSave }: { category: CategoryId; limitMinor: number; spentMinor: number; currency: Currency; onSave: (limitMinor: number, done: () => void) => void }) {
  const { m } = useI18n();
  const { color, type, categories } = useTheme();
  const styles = useStyles();
  const cat = categories[category];
  const [draft, setDraft] = useState<number | null>(null);
  const limit = draft ?? limitMinor;
  const status = budgetStatus(spentMinor, limit, currency, m);
  const fmt = (n: number) => formatMoney(n, currency);

  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  });
  useEffect(() => {
    if (draft === null || draft === limitMinor) return;
    const t = setTimeout(() => saveRef.current(draft, () => setDraft(null)), 600);
    return () => clearTimeout(t);
  }, [draft, limitMinor]);

  const step = (direction: 1 | -1) => setDraft((d) => stepLimit(d ?? limitMinor, direction, currency));

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.tile, { backgroundColor: cat.tint }]}>
          <Icon name={cat.icon as IconName} size={22} color={cat.color} />
        </View>
        <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={limit > 0 ? `${cat.name}: ${m.ui.amountOf(fmt(spentMinor), fmt(limit))}` : m.budgetsScreen.noLimitA11y(cat.name, fmt(spentMinor))}>
          <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 17 }]}>{cat.name}</Text>
          <Text style={[type.body, styles.tabular, { color: color.textSecondary, fontSize: 15 }]}>
            {limit > 0 ? m.ui.amountOf(fmt(spentMinor), fmt(limit)) : m.budgetsScreen.spentThisMonth(fmt(spentMinor))}
          </Text>
        </View>
        <StepButton icon="minus" label={m.budgetsScreen.lower(cat.name)} disabled={limit === 0} onStep={() => step(-1)} />
        <StepButton icon="plus" label={m.budgetsScreen.raise(cat.name)} onStep={() => step(1)} />
      </View>
      {limit > 0 && (
        <View style={[styles.track, { backgroundColor: color.line }]}>
          <View style={[styles.fill, { width: `${Math.min(status.ratio, 1) * 100}%`, backgroundColor: bar(color)[status.tone] }]} />
        </View>
      )}
      <Text style={[type.label, { color: text(color)[status.tone], fontSize: 15 }]}>{status.text}</Text>
    </View>
  );
}

/** Round − / + : one step on tap; holding repeats after 400 ms, every 90 ms. */
function StepButton({ icon, label, onStep, disabled }: { icon: IconName; label: string; onStep: () => void; disabled?: boolean }) {
  const { color } = useTheme();
  const styles = useStyles();
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (delay.current) clearTimeout(delay.current);
    if (repeat.current) clearInterval(repeat.current);
    delay.current = repeat.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={() => {
        onStep();
        delay.current = setTimeout(() => {
          repeat.current = setInterval(onStep, 90);
        }, 400);
      }}
      onPressOut={stop}
      style={[styles.step, disabled && { opacity: 0.4 }]}
    >
      <Icon name={icon} size={22} color={color.ink} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  month: { backgroundColor: color.hero, borderRadius: radius.sheet, padding: 22, gap: space[3] },
  tabular: { fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, padding: space[4], gap: space[3] },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  tile: { width: 48, height: 48, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  step: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: color.fieldBorder, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
}));
