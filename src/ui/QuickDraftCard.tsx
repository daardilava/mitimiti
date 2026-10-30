// The quick-entry draft (src/app/expense/quick.tsx): exactly what will be saved, before it is. Where it came from,
// the amount, then one row per field. Tapping a row opens its choices in place; a row that needs an answer says
// "Elige" in words. While a receipt is read, the card shows the photo and that it's reading; after, the photo stays
// next to the data so the total can be checked against it.
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Couple } from '@/api/expenses';
import { addDays } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { QuickEntryResult, SplitChoice, Who } from '@/lib/quickEntry';
import { CATEGORY_ORDER, type ChipChoices } from '@/lib/quickSheet';
import { expenseEffect, splitShares } from '@/lib/splits';
import { useI18n } from '@/i18n';
import { Avatar } from './Avatar';
import { DatePickerSheet } from './DatePickerSheet';
import { Icon, type IconName } from './Icon';
import { font, noFocusRing, radius, space, touch, type CategoryId } from './tokens';
import { makeStyles, useTheme } from './theme';

export type DraftOrigin = 'text' | 'voice' | 'receipt' | 'ai';
type Field = 'description' | 'category' | 'payer' | 'split' | 'date';

const ORIGIN_ICON: Record<DraftOrigin, IconName> = { text: 'edit', voice: 'mic', receipt: 'camera', ai: 'check' };
const PCT_CHIPS = [30, 40, 50, 60, 70];
const NO_MARKS: ReadonlySet<string> = new Set();

interface Props {
  couple: Couple;
  result: QuickEntryResult;
  origin: DraftOrigin;
  today: string;
  /** The receipt photo on the phone, while it's being read and after. */
  photoUri?: string | null;
  /** A receipt is being read: the card shows that instead of a draft. */
  reading?: boolean;
  /** The AI is reading the phrase. */
  thinking?: boolean;
  onChoose: (choice: ChipChoices) => void;
  onRemoveReceipt?: () => void;
}

export function QuickDraftCard({ couple, result, origin, today, photoUri, reading, thinking, onChoose, onRemoveReceipt }: Props) {
  const { m, d: dl } = useI18n();
  const { color, type, categories } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState<Field | null>(null);
  const [pickingDate, setPickingDate] = useState(0);
  const [photoOpen, setPhotoOpen] = useState(false);

  const { draft } = result;
  const { me, partner, currency } = couple;
  const asks = new Set(result.missing);
  const toggle = (f: Field) => setOpen((o) => (o === f ? null : f));
  const choose = (choice: ChipChoices, keepOpen = false) => {
    onChoose(choice);
    if (!keepOpen) setOpen(null);
  };

  const photo = photoUri ? (
    <Pressable accessibilityRole="imagebutton" accessibilityLabel={m.quick.receiptPhotoA11y} onPress={() => setPhotoOpen(true)}>
      <Image source={{ uri: photoUri }} style={styles.thumb} accessibilityIgnoresInvertColors />
    </Pressable>
  ) : null;

  if (reading) {
    return (
      <View style={[styles.card, styles.readingCard]} accessibilityLiveRegion="polite">
        {photo}
        <View style={{ flex: 1, gap: space[1] }}>
          <View style={styles.inline}>
            <ActivityIndicator color={color.ink} />
            <Text style={[type.row, { fontFamily: font.bodyBold }]}>{m.quick.readingReceipt}</Text>
          </View>
          <Text style={styles.secondary}>{m.quick.readingDetail}</Text>
        </View>
      </View>
    );
  }

  const payer: Who = draft.paidBy === partner.id && partner.id ? 'partner' : 'me';
  const payerPerson = payer === 'me' ? me : partner;
  const otherName = payer === 'me' ? partner.name : me.name;
  const myPct = draft.splitPct == null ? null : payer === 'me' ? draft.splitPct : 100 - draft.splitPct;
  const fmt = (n: number) => formatMoney(n, currency);
  const amount = draft.amountMinor;
  const category = categories[draft.category];

  const splitLabel =
    draft.splitMode === 'half'
      ? m.expense.splitHalf
      : draft.splitMode === 'pct' && myPct != null
        ? `${me.name} ${myPct}% · ${partner.name} ${100 - myPct}%`
        : draft.splitMode === 'other'
          ? m.expense.splitOther(otherName)
          : m.expenseForm.personal(payerPerson.name);

  const stored = { paidBy: draft.paidBy, amountMinor: amount ?? 0, splitMode: draft.splitMode, splitPct: draft.splitPct };
  const effect = amount !== undefined ? expenseEffect(stored, me.id) : 0;
  const effectLine =
    amount === undefined
      ? null
      : effect > 0
        ? m.expenseForm.previewOwedToYou(partner.name, fmt(effect))
        : effect < 0
          ? m.expenseForm.previewYouOwe(fmt(effect), partner.name)
          : m.expenseForm.previewNone;
  const effectColor = effect > 0 ? color.positiveText : effect < 0 ? color.negative : color.textSecondary;

  const splitOptions: { choice: SplitChoice; on: boolean; title: string; sub: string }[] = [
    {
      choice: 'half',
      on: draft.splitMode === 'half',
      title: m.expenseForm.half,
      sub: amount !== undefined ? m.expenseForm.halfEach(fmt(splitShares({ ...stored, splitMode: 'half' }).partner)) : m.expenseForm.halfEachEmpty,
    },
    { choice: { myPct: myPct ?? (couple.myDefaultPct !== 50 ? couple.myDefaultPct : 60) }, on: draft.splitMode === 'pct', title: m.expenseForm.pct, sub: `${me.name} / ${partner.name}` },
    { choice: { owner: payer === 'me' ? 'partner' : 'me' }, on: draft.splitMode === 'other', title: m.expenseForm.other(otherName), sub: m.expenseForm.otherDetail(otherName, payerPerson.name) },
    { choice: { owner: payer }, on: draft.splitMode === 'personal', title: m.expenseForm.personal(payerPerson.name), sub: m.expenseForm.personalDetail },
  ];

  const dateChips = [today, addDays(today, -1), addDays(today, -2)];

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.badge}>
          <Icon name={ORIGIN_ICON[origin]} size={14} color={color.textSecondary} />
          <Text style={styles.badgeText}>{m.quick.source[origin]}</Text>
        </View>
        {thinking && (
          <View style={styles.inline} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={color.textSecondary} />
            <Text style={styles.secondary}>{m.quick.thinking}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {photo}
        {onRemoveReceipt && (
          <Pressable accessibilityRole="button" accessibilityLabel={m.quick.removeReceipt} onPress={onRemoveReceipt} style={styles.iconButton}>
            <Icon name="close" size={18} color={color.textSecondary} />
          </Pressable>
        )}
      </View>

      {amount !== undefined ? (
        <Text style={styles.amount} accessibilityLabel={m.expense.amountA11y(fmt(amount))}>
          {fmt(amount)}
        </Text>
      ) : (
        <Text style={[type.heading, { color: color.warningText }]}>{m.quick.amountMissing}</Text>
      )}

      <View style={styles.rows}>
        <Row label={m.quick.rows.description} value={draft.description || category.name} open={open === 'description'} onPress={() => toggle('description')} />
        {open === 'description' && (
          <TextInput
            accessibilityLabel={m.quick.rows.description}
            defaultValue={draft.description}
            onChangeText={(description) => onChoose({ description })}
            onSubmitEditing={() => setOpen(null)}
            placeholder={category.name}
            placeholderTextColor={color.disabled}
            maxLength={80}
            autoFocus
            returnKeyType="done"
            style={styles.textInput}
          />
        )}

        <Row
          label={m.quick.rows.category}
          value={category.name}
          lead={<View style={[styles.catTile, { backgroundColor: category.tint }]}><Icon name={category.icon as IconName} size={16} color={category.color} /></View>}
          open={open === 'category'}
          onPress={() => toggle('category')}
        />
        {open === 'category' && (
          <View style={styles.grid}>
            {CATEGORY_ORDER.map((id: CategoryId) => {
              const cat = categories[id];
              const on = draft.category === id;
              return (
                <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={cat.name} onPress={() => choose({ category: id })} style={[styles.option, styles.catOption, on && styles.optionOn]}>
                  <View style={[styles.catTile, { backgroundColor: cat.tint }]}>
                    <Icon name={cat.icon as IconName} size={18} color={cat.color} />
                  </View>
                  <Text style={[type.label, { color: color.ink }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Row
          label={m.quick.rows.payer}
          value={asks.has('payer') ? null : payerPerson.name}
          lead={asks.has('payer') ? undefined : <Avatar name={payerPerson.name} isMe={payer === 'me'} avatar={payerPerson.avatar} size={24} />}
          open={open === 'payer'}
          onPress={() => toggle('payer')}
        />
        {open === 'payer' && (
          <View style={styles.pair}>
            {([['me', me], ['partner', partner]] as const).map(([who, p]) => {
              const on = !asks.has('payer') && payer === who;
              const disabled = who === 'partner' && (!couple.partnerJoined || !partner.id);
              return (
                <Pressable
                  key={who}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled }}
                  accessibilityLabel={m.expenseForm.paidBy(p.name)}
                  accessibilityHint={disabled ? m.expenseForm.partnerNotYet : undefined}
                  disabled={disabled}
                  onPress={() => choose({ payer: who })}
                  style={[styles.option, styles.payerOption, on && styles.optionOn, disabled && { opacity: 0.5 }]}
                >
                  <Avatar name={p.name} isMe={who === 'me'} avatar={p.avatar} size={32} />
                  <Text style={[type.row, { fontFamily: font.bodyBold, flexShrink: 1 }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Row label={m.quick.rows.split} value={asks.has('split') ? null : splitLabel} open={open === 'split'} onPress={() => toggle('split')} />
        {open === 'split' && (
          <View style={{ gap: space[2] }}>
            {splitOptions.map((o) => {
              const on = !asks.has('split') && o.on;
              return (
                <Pressable
                  key={o.title}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${o.title}. ${o.sub}`}
                  onPress={() => choose({ split: o.choice }, typeof o.choice === 'object' && 'myPct' in o.choice)}
                  style={[styles.option, styles.splitOption, on && styles.optionOn]}
                >
                  <View style={[styles.ring, { borderColor: on ? color.ink : color.disabled }]}>{on && <View style={styles.dot} />}</View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 15 }]}>{o.title}</Text>
                    <Text style={styles.secondary}>{o.sub}</Text>
                  </View>
                </Pressable>
              );
            })}
            {draft.splitMode === 'pct' && myPct != null && (
              <View style={styles.chips}>
                {(PCT_CHIPS.includes(myPct) ? PCT_CHIPS : [...PCT_CHIPS, myPct].sort((a, b) => a - b)).map((p) => (
                  <Chip key={p} label={`${p} / ${100 - p}`} on={myPct === p} onPress={() => choose({ split: { myPct: p } })} />
                ))}
              </View>
            )}
          </View>
        )}

        <Row label={m.quick.rows.date} value={asks.has('date') ? null : dl.chipDate(draft.spentOn)} open={open === 'date'} onPress={() => toggle('date')} last />
        {open === 'date' && (
          <View style={styles.chips}>
            {dateChips.map((d) => (
              <Chip key={d} label={dl.chipDate(d)} on={!asks.has('date') && draft.spentOn === d} onPress={() => choose({ spentOn: d })} />
            ))}
            <Chip
              label={dateChips.includes(draft.spentOn) || asks.has('date') ? m.quick.otherDate : dl.chipDate(draft.spentOn)}
              on={!asks.has('date') && !dateChips.includes(draft.spentOn)}
              onPress={() => setPickingDate((n) => n + 1)}
            />
          </View>
        )}
      </View>

      {effectLine && (
        <Text style={[styles.effect, { color: effectColor }]} accessibilityLiveRegion="polite">
          {effectLine}
        </Text>
      )}

      <DatePickerSheet
        key={pickingDate}
        visible={pickingDate > 0}
        period="day"
        value={draft.spentOn}
        today={today}
        marked={NO_MARKS}
        onSelect={(spentOn) => choose({ spentOn })}
        onClose={() => setPickingDate(0)}
      />

      {photoUri && (
        <Modal visible={photoOpen} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
          <View style={styles.photoBackdrop}>
            <Image source={{ uri: photoUri }} style={styles.photoFull} resizeMode="contain" accessibilityLabel={m.quick.receiptPhotoA11y} />
            <Pressable accessibilityRole="button" accessibilityLabel={m.ui.close} onPress={() => setPhotoOpen(false)} style={styles.photoClose}>
              <Icon name="close" size={24} color={color.onHero} />
            </Pressable>
          </View>
        </Modal>
      )}
    </View>
  );
}

/** Label on the left, the value on the right; "Elige" (in words, not only colour) when it needs an answer. */
function Row({ label, value, lead, open, last, onPress }: { label: string; value: string | null; lead?: React.ReactNode; open: boolean; last?: boolean; onPress: () => void }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.quick.rowA11y(label, value ?? m.quick.choose)}
      accessibilityHint={m.quick.rowHint}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={[styles.row, !last && !open && styles.rowLine]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>
        {lead}
        <Text style={[type.row, { fontFamily: font.bodyBold, flexShrink: 1, color: value ? color.ink : color.warningText }]} numberOfLines={1}>
          {value ?? m.quick.choose}
        </Text>
      </View>
      <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
        <Icon name="forward" size={18} color={color.textSecondary} />
      </View>
    </Pressable>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[type.label, { fontFamily: font.bodyBold, fontSize: 14, color: on ? color.onPrimary : color.ink }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface, padding: space[4], gap: space[3] },
  readingCard: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 32 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space[2], paddingVertical: 4, borderRadius: radius.tile, backgroundColor: color.neutralTint },
  badgeText: { ...type.label, color: color.textSecondary },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  secondary: { ...type.label, color: color.textSecondary, fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  iconButton: { width: touch, height: touch, marginRight: -space[2], alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 48, height: 64, borderRadius: 8, borderWidth: 1, borderColor: color.line, backgroundColor: color.neutralTint },
  amount: { ...type.hero, color: color.ink },
  rows: { gap: 0 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space[3] },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.line },
  rowLabel: { ...type.label, color: color.textSecondary, width: 96 },
  rowValue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space[2] },
  textInput: {
    ...type.body,
    height: 48,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    borderRadius: radius.control,
    paddingHorizontal: space[3],
    marginBottom: space[2],
    color: color.ink,
    ...noFocusRing,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingBottom: space[3] },
  option: { borderWidth: 1, borderColor: color.line, borderRadius: radius.option, backgroundColor: color.surface },
  optionOn: { borderColor: color.ink, borderWidth: 2 },
  catOption: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: space[3], paddingHorizontal: space[1] },
  catTile: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pair: { flexDirection: 'row', gap: space[2], paddingBottom: space[3] },
  payerOption: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space[3] },
  splitOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: space[4], minHeight: touch },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingBottom: space[3] },
  chip: { minHeight: touch, paddingHorizontal: 16, borderRadius: touch / 2, borderWidth: 1, borderColor: color.fieldBorder, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: color.ink, borderColor: color.ink },
  effect: { ...type.label, fontFamily: font.bodyBold, fontSize: 14 },
  photoBackdrop: { flex: 1, backgroundColor: color.scrim, alignItems: 'center', justifyContent: 'center', padding: space[4] },
  photoFull: { width: '100%', height: '80%' },
  photoClose: { position: 'absolute', top: space[12], right: space[4], width: touch, height: touch, borderRadius: touch / 2, backgroundColor: color.hero, alignItems: 'center', justifyContent: 'center' },
}));
