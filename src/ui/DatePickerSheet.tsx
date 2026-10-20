// Calendar sheet for Movimientos: tap the period title to jump straight to a day, a week or a month.
// Día and Semana show a month of days (Monday first); Mes shows the twelve months of a year. Days with movements
// carry a dot (and say so to screen readers); dates after today can't be picked.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Period } from '@/lib/activity';
import { monthGrid, monthOf, shiftMonth, weekStart } from '@/lib/dates';
import { useI18n } from '@/i18n';
import { Icon } from './Icon';
import { font, radius, space, touch } from './tokens';
import { makeStyles, useTheme } from './theme';

interface Props {
  visible: boolean;
  period: Period;
  /** Any date in the period shown now (YYYY-MM-DD). */
  value: string;
  /** Today, YYYY-MM-DD: nothing after it can be picked. */
  today: string;
  /** Dates (YYYY-MM-DD) that have an expense or a payment. */
  marked: ReadonlySet<string>;
  onSelect: (date: string) => void;
  onClose: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function DatePickerSheet({ visible, period, value, today, marked, onSelect, onClose }: Props) {
  const { m, d } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  // The month (Día, Semana) or year (Mes) on screen; it starts on the period being shown. The screen gives the sheet a
  // new key each time it opens, so this starts over then.
  const [month, setMonth] = useState(monthOf(value));

  const thisMonth = monthOf(today);
  const year = Number(month.slice(0, 4));
  const byYear = period === 'month';
  const title = period === 'day' ? m.activityScreen.pickDay : period === 'week' ? m.activityScreen.pickWeek : m.activityScreen.pickMonth;
  const pick = (date: string) => {
    onSelect(date);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel={m.ui.close} style={styles.scrim} onPress={onClose} />
      <View style={styles.sheet} accessibilityViewIsModal role="dialog" aria-label={title}>
        <View style={styles.titleRow}>
          <Text style={[type.heading, { flex: 1 }]} accessibilityRole="header">
            {title}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={m.ui.close} onPress={onClose} style={styles.iconButton}>
            <Icon name="close" size={22} color={color.ink} />
          </Pressable>
        </View>

        <View style={styles.navRow}>
          <NavArrow icon="back" label={m.ui.previous} onPress={() => setMonth(shiftMonth(month, byYear ? -12 : -1))} />
          <Text style={[type.row, { flex: 1, textAlign: 'center', fontFamily: font.bodyBold, fontSize: 17 }]} accessibilityLiveRegion="polite">
            {byYear ? String(year) : d.monthLabel(month)}
          </Text>
          <NavArrow
            icon="forward"
            label={m.ui.next}
            disabled={byYear ? year >= Number(today.slice(0, 4)) : month >= thisMonth}
            onPress={() => setMonth(shiftMonth(month, byYear ? 12 : 1))}
          />
        </View>

        {byYear ? (
          <MonthGrid year={year} value={value} today={today} marked={marked} onPick={pick} />
        ) : (
          <DayGrid month={month} period={period} value={value} today={today} marked={marked} onPick={pick} />
        )}

        <Pressable accessibilityRole="button" onPress={() => pick(today)} style={styles.secondary}>
          <Icon name="calendar" size={20} color={color.ink} />
          <Text style={[type.row, { fontFamily: font.bodyBold }]}>{m.activityScreen.goToday}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function DayGrid({ month, period, value, today, marked, onPick }: { month: string; period: Period; value: string; today: string; marked: ReadonlySet<string>; onPick: (date: string) => void }) {
  const { m, d } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const selectedWeek = weekStart(value);
  return (
    <View>
      <View style={styles.week} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {d.weekdayInitials.map((letter, i) => (
          <Text key={i} style={[type.label, styles.weekday, { color: color.textSecondary }]}>
            {letter}
          </Text>
        ))}
      </View>
      {monthGrid(month).map((days, row) => {
        // Semana highlights the whole row; Día only the day.
        const weekOn = period === 'week' && days.some((day) => day !== null && weekStart(day) === selectedWeek);
        return (
          <View key={row} style={[styles.week, weekOn && styles.weekOn]}>
            {days.map((day, i) => {
              if (!day) return <View key={i} style={styles.cell} />;
              const future = day > today;
              const on = weekOn || (period === 'day' && day === value);
              const has = marked.has(day);
              const label = d.longDate(day);
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={has ? m.activityScreen.withActivity(label) : label}
                  accessibilityState={{ selected: on, disabled: future }}
                  disabled={future}
                  onPress={() => onPick(day)}
                  style={styles.cell}
                >
                  <View style={[styles.day, period === 'day' && on && styles.dayOn, day === today && !on && styles.today]}>
                    <Text style={[type.row, { fontFamily: day === today || on ? font.bodyBold : font.body, color: on ? color.onPrimary : future ? color.disabled : color.ink }]}>
                      {Number(day.slice(8))}
                    </Text>
                  </View>
                  <View style={[styles.dot, { backgroundColor: has ? (on ? color.onPrimary : color.textSecondary) : 'transparent' }]} />
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function MonthGrid({ year, value, today, marked, onPick }: { year: number; value: string; today: string; marked: ReadonlySet<string>; onPick: (date: string) => void }) {
  const { m, d } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const thisMonth = monthOf(today);
  const markedMonths = new Set([...marked].map(monthOf));
  return (
    <View style={styles.months}>
      {d.monthsShort.map((short, i) => {
        const month = `${year}-${String(i + 1).padStart(2, '0')}`;
        const future = month > thisMonth;
        const on = month === monthOf(value);
        const has = markedMonths.has(month);
        const label = d.monthLabel(month);
        return (
          <Pressable
            key={month}
            accessibilityRole="button"
            accessibilityLabel={has ? m.activityScreen.withActivity(label) : label}
            accessibilityState={{ selected: on, disabled: future }}
            disabled={future}
            onPress={() => onPick(month === thisMonth ? today : `${month}-01`)}
            style={[styles.monthCell, on && styles.dayOn, month === thisMonth && !on && styles.today]}
          >
            <Text style={[type.row, { fontFamily: on || month === thisMonth ? font.bodyBold : font.body, color: on ? color.onPrimary : future ? color.disabled : color.ink }]}>
              {cap(short)}
            </Text>
            <View style={[styles.dot, { backgroundColor: has ? (on ? color.onPrimary : color.textSecondary) : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

function NavArrow({ icon, label, onPress, disabled }: { icon: 'back' | 'forward'; label: string; onPress: () => void; disabled?: boolean }) {
  const { color } = useTheme();
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={styles.iconButton}>
      <Icon name={icon} size={22} color={disabled ? color.disabled : color.ink} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: color.scrim, opacity: 0.5 },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space[5],
    paddingTop: space[5],
    paddingBottom: 28,
    gap: space[3],
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  navRow: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', borderRadius: radius.pill },
  weekOn: { backgroundColor: color.ink },
  weekday: { flex: 1, textAlign: 'center', paddingBottom: space[1] },
  cell: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: color.ink },
  today: { borderWidth: 1.5, borderColor: color.ink },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: -2 },
  months: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space[2] },
  monthCell: { width: '33.333%', height: 56, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', gap: 2 },
  secondary: {
    height: 52,
    flexDirection: 'row',
    gap: space[2],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
