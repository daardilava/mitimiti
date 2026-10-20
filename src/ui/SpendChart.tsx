// Shared spending per day, stacked by who paid: blue for me, orange for my partner (UI kit colours).
// Dataviz specs: columns ≤ 24 px with a 4 px rounded top and a square base, a 2 px surface gap between the two
// segments, recessive grid, round ticks, a legend with totals (orange is under 3:1 on white, so text carries it),
// and tap / drag to read one day. The list below the chart is the table view.
import { useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Path, Rect } from 'react-native-svg';
import { niceTicks, type DaySpend } from '@/lib/activity';
import { dayOfMonth } from '@/lib/dates';
import { formatMoney, formatMoneyCompact, type Currency } from '@/lib/money';
import { font, radius, space } from './tokens';
import { useI18n } from '@/i18n';
import { makeStyles, useTheme } from './theme';

const PLOT_HEIGHT = 140;
const AXIS_WIDTH = 64;
const GAP = 2;
const CAP = 4;
const MAX_BAR = 24;

interface Props {
  days: DaySpend[];
  currency: Currency;
  meName: string;
  partnerName: string;
}

export function SpendCard({ days, currency, meName, partnerName }: Props) {
  const { color, type } = useTheme();
  const styles = useStyles();
  const { m, d } = useI18n();
  const [selected, setSelected] = useState<number | null>(null);
  const fmt = (minor: number) => formatMoney(minor, currency);
  const mine = days.reduce((sum, d) => sum + d.mineMinor, 0);
  const theirs = days.reduce((sum, d) => sum + d.theirsMinor, 0);
  const picked = selected !== null ? days[selected] : null;
  const shown = picked ? { mine: picked.mineMinor, theirs: picked.theirsMinor } : { mine, theirs };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow} accessibilityLiveRegion="polite">
        <Text style={[type.row, { fontFamily: font.bodyBold, flex: 1 }]}>{picked ? d.dayHeading(picked.date) : m.chart.title}</Text>
        <Text style={[type.heading, styles.tabular]}>{fmt(shown.mine + shown.theirs)}</Text>
      </View>

      {days.length > 1 ? (
        <Columns days={days} currency={currency} selected={selected} onSelect={setSelected} summary={m.chart.a11y(meName, fmt(mine), partnerName, fmt(theirs))} />
      ) : (
        <SplitBar mine={mine} theirs={theirs} />
      )}

      <View style={styles.legend}>
        <LegendItem dot={color.me} label={m.chart.paidBy(meName)} amount={fmt(shown.mine)} />
        <LegendItem dot={color.partner} label={m.chart.paidBy(partnerName)} amount={fmt(shown.theirs)} />
      </View>
      {days.length > 1 && (
        <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>
          {picked ? m.chart.tapAgain : m.chart.tapHint}
        </Text>
      )}
    </View>
  );
}

function Columns({ days, currency, selected, onSelect, summary }: { days: DaySpend[]; currency: Currency; selected: number | null; onSelect: (i: number | null) => void; summary: string }) {
  const { m, d: dates } = useI18n();
  const { color } = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const max = Math.max(...days.map((d) => d.mineMinor + d.theirsMinor), 0);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const plotWidth = Math.max(width - AXIS_WIDTH, 0);
  const slot = plotWidth / days.length;
  const bar = Math.max(Math.min(MAX_BAR, slot * 0.6), 3);
  const y = (minor: number) => PLOT_HEIGHT - (minor / top) * PLOT_HEIGHT;
  const isWeek = days.length === 7;

  // Tap or drag: the slot under the finger is the day. Releasing keeps it; tapping the same day again clears it.
  const pick = (e: GestureResponderEvent, toggle: boolean) => {
    const i = Math.floor((e.nativeEvent.locationX - AXIS_WIDTH) / slot);
    if (i < 0 || i >= days.length) return onSelect(null);
    onSelect(toggle && i === selected ? null : i);
  };

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => pick(e, true)}
      onResponderMove={(e) => pick(e, false)}
      // Let the screen scroll vertically when the drag is mostly up or down.
      onResponderTerminationRequest={() => true}
    >
      {width > 0 && (
        <Svg width={width} height={PLOT_HEIGHT + 22}>
          {ticks.map((t) => (
            <Line key={t} x1={AXIS_WIDTH} x2={width} y1={y(t)} y2={y(t)} stroke={color.line} strokeWidth={1} />
          ))}
          {days.map((d, i) => {
            const x = AXIS_WIDTH + i * slot + (slot - bar) / 2;
            const dim = selected !== null && selected !== i ? 0.35 : 1;
            const mineTop = y(d.mineMinor);
            const totalTop = y(d.mineMinor + d.theirsMinor);
            const r = Math.min(CAP, bar / 2);
            return (
              <G key={d.date}>
                {d.mineMinor > 0 && (d.theirsMinor > 0 ? (
                  <Rect x={x} y={mineTop} width={bar} height={PLOT_HEIGHT - mineTop} fill={color.me} opacity={dim} />
                ) : (
                  <Path d={roundedTop(x, mineTop, bar, PLOT_HEIGHT - mineTop, r)} fill={color.me} opacity={dim} />
                ))}
                {d.theirsMinor > 0 && (
                  <Path
                    d={roundedTop(x, totalTop, bar, Math.max(mineTop - totalTop - (d.mineMinor > 0 ? GAP : 0), 1), r)}
                    fill={color.partner}
                    opacity={dim}
                  />
                )}
              </G>
            );
          })}
          {selected !== null && (
            <Rect x={AXIS_WIDTH + selected * slot} y={0} width={slot} height={PLOT_HEIGHT} fill={color.ink} opacity={0.05} />
          )}
        </Svg>
      )}
      {/* Axis text in RN Text so it uses the app's fonts; positioned over the SVG. */}
      {width > 0 &&
        ticks.map((t) => (
          <Text key={t} style={[styles.tick, { top: y(t) - 8 }]} numberOfLines={1}>
            {formatMoneyCompact(t, currency, m.money)}
          </Text>
        ))}
      {width > 0 &&
        days.map((d, i) =>
          isWeek || [1, 8, 15, 22, 29].includes(dayOfMonth(d.date)) ? (
            <Text key={d.date} style={[styles.xLabel, { left: AXIS_WIDTH + i * slot + slot / 2 - (isWeek ? slot : 24) / 2, width: isWeek ? slot : 24, top: PLOT_HEIGHT + 4 }, selected === i && { color: color.ink }]}>
              {isWeek ? dates.weekdayInitials[i] : dayOfMonth(d.date)}
            </Text>
          ) : null,
        )}
    </View>
  );
}

/** A column with a 4 px rounded top and a square base. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/** One day: who paid, as a single split bar (a chart of one column says less than this). */
function SplitBar({ mine, theirs }: { mine: number; theirs: number }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  if (mine + theirs === 0) {
    return <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>{m.chart.noneThisDay}</Text>;
  }
  return (
    <View style={styles.split} aria-hidden>
      {mine > 0 && <View style={{ flex: mine, backgroundColor: color.me }} />}
      {theirs > 0 && <View style={{ flex: theirs, backgroundColor: color.partner }} />}
    </View>
  );
}

function LegendItem({ dot, label, amount }: { dot: string; label: string; amount: string }) {
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

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, padding: space[4], gap: space[3] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  tabular: { fontVariant: ['tabular-nums'] },
  tick: { position: 'absolute', left: 0, width: AXIS_WIDTH - space[2], textAlign: 'right', fontFamily: font.body, fontSize: 11, color: color.textSecondary, fontVariant: ['tabular-nums'] },
  xLabel: { position: 'absolute', textAlign: 'center', fontFamily: font.bodySemi, fontSize: 11, color: color.textSecondary },
  legend: { flexDirection: 'row', gap: space[4] },
  dot: { width: 10, height: 10, borderRadius: 5 },
  split: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: GAP, backgroundColor: color.line },
}));
