import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Couple, type Expense, type ExpenseInput } from '@/api/expenses';
import { chipDate, daysAgo } from '@/lib/dates';
import { CURRENCY_SYMBOL, formatMoney, parseMoneyInput, toInputText } from '@/lib/money';
import { expenseEffect, splitShares, type SplitMode } from '@/lib/splits';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import { categories, color, font, radius, space, touch, type, type CategoryId } from './tokens';

const PCT_CHIPS = [30, 40, 50, 60, 70];
/** Household default for 'pct' until §8 reads households.default_pct. */
const DEFAULT_PCT = 60;

interface ExpenseFormProps {
  title: string;
  saveLabel: string;
  couple: Couple;
  /** Pre-fills the form when editing. */
  initial?: Expense;
  saving: boolean;
  error?: string | null;
  onSave: (input: ExpenseInput) => void;
}

export function ExpenseForm({ title, saveLabel, couple, initial, saving, error, onSave }: ExpenseFormProps) {
  const { me, partner, currency } = couple;
  const [amountText, setAmountText] = useState(initial ? toInputText(initial.amountMinor, currency) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? me.id);
  const [category, setCategory] = useState<CategoryId>(initial?.category ?? 'super');
  const [splitMode, setSplitMode] = useState<SplitMode>(initial?.splitMode ?? 'half');
  // The chips read "me / partner"; the database stores the payer's percentage.
  const [myPct, setMyPct] = useState(() => {
    if (initial?.splitMode !== 'pct' || initial.splitPct == null) return DEFAULT_PCT;
    return initial.paidBy === me.id ? initial.splitPct : 100 - initial.splitPct;
  });
  const [spentOn, setSpentOn] = useState(initial?.spentOn ?? daysAgo(0));

  const amountMinor = parseMoneyInput(amountText, currency);
  const payerPct = paidBy === me.id ? myPct : 100 - myPct;
  const draft = { paidBy, amountMinor, splitMode, splitPct: splitMode === 'pct' ? payerPct : null };
  const effect = amountMinor > 0 ? expenseEffect(draft, me.id) : 0;
  const payerName = paidBy === me.id ? me.name : partner.name;
  const otherName = paidBy === me.id ? partner.name : me.name;
  const canSave = amountMinor > 0 && !saving;

  const fmt = (n: number) => formatMoney(n, currency);
  const preview =
    amountMinor <= 0
      ? 'Escribe el monto para ver cómo queda'
      : effect > 0
        ? `Con esto, ${partner.name} te debe ${fmt(effect)} más`
        : effect < 0
          ? `Con esto, le debes ${fmt(effect)} más a ${partner.name}`
          : 'No cambia el saldo entre ustedes';
  const previewColor = effect > 0 ? color.positiveText : effect < 0 ? color.negative : color.textSecondary;

  const splitOptions: { id: SplitMode; title: string; sub: string }[] = [
    {
      id: 'half',
      title: 'Mitad y mitad',
      sub: amountMinor > 0 ? `Cada quien pone ${fmt(splitShares({ ...draft, splitMode: 'half' }).partner)}` : 'Cada quien pone la mitad',
    },
    { id: 'pct', title: 'Por porcentaje', sub: `${me.name} ${myPct}% · ${partner.name} ${100 - myPct}%` },
    { id: 'other', title: `Todo le toca a ${otherName}`, sub: `${otherName} le debe el total a ${payerName}` },
    { id: 'personal', title: `Personal de ${payerName}`, sub: 'Se registra, pero no cambia el saldo' },
  ];

  const pctChips = PCT_CHIPS.includes(myPct) ? PCT_CHIPS : [...PCT_CHIPS, myPct].sort((a, b) => a - b);
  const dateChips = [daysAgo(0), daysAgo(1), daysAgo(2)];
  if (!dateChips.includes(spentOn)) dateChips.push(spentOn);

  const save = () => {
    if (!canSave) return;
    onSave({
      id: initial?.id,
      paidBy,
      amountMinor,
      category,
      description: description.trim() || categories[category].name,
      spentOn,
      splitMode,
      splitPct: splitMode === 'pct' ? payerPct : null,
    });
  };

  const categoryRows = chunk(Object.keys(categories) as CategoryId[], 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => router.back()} style={styles.iconButton}>
            <Icon name="close" size={22} color={color.ink} />
          </Pressable>
          <Text style={type.bar} accessibilityRole="header">
            {title}
          </Text>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text nativeID="amount-label" style={styles.label}>
              Monto
            </Text>
            <View style={styles.amountRow}>
              <Text style={[type.screenTitle, { color: color.textSecondary }]}>{CURRENCY_SYMBOL[currency]}</Text>
              <TextInput
                accessibilityLabel={`Monto en ${currency}`}
                aria-labelledby="amount-label"
                value={amountText}
                onChangeText={setAmountText}
                placeholder="0"
                placeholderTextColor={color.disabled}
                keyboardType={currency === 'COP' ? 'number-pad' : 'decimal-pad'}
                inputMode={currency === 'COP' ? 'numeric' : 'decimal'}
                autoFocus={!initial}
                style={styles.amountInput}
              />
              <Text style={[type.label, { color: color.textSecondary, fontFamily: font.bodyBold }]}>{currency}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              accessibilityLabel="Descripción"
              value={description}
              onChangeText={setDescription}
              placeholder="Ej. Súper, cena, gasolina"
              placeholderTextColor={color.disabled}
              maxLength={80}
              style={styles.textInput}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>¿Quién pagó?</Text>
            <View style={styles.row}>
              {[me, partner].map((p) => {
                const on = paidBy === p.id;
                return (
                  <Pressable
                    key={p.id || 'partner'}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on, disabled: !p.id }}
                    accessibilityLabel={`Pagó ${p.name}`}
                    accessibilityHint={p.id ? undefined : 'Disponible cuando tu pareja se una'}
                    // Until the partner joins they have no account, so only you can be the payer.
                    disabled={!p.id}
                    onPress={() => setPaidBy(p.id)}
                    style={[styles.option, styles.payer, on && styles.optionOn, !p.id && { opacity: 0.5 }]}
                  >
                    <Avatar name={p.name} isMe={p.id === me.id} size={36} />
                    <Text style={[type.row, { fontFamily: font.bodyBold, flexShrink: 1 }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Categoría</Text>
            {categoryRows.map((rowIds) => (
              <View key={rowIds[0]} style={styles.row}>
                {rowIds.map((id) => {
                  const cat = categories[id];
                  const on = category === id;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={cat.name}
                      onPress={() => setCategory(id)}
                      style={[styles.option, styles.category, on && styles.optionOn]}
                    >
                      <View style={[styles.catTile, { backgroundColor: cat.tint }]}>
                        <Icon name={cat.icon as IconName} size={20} color={cat.color} />
                      </View>
                      <Text style={[type.label, { color: color.ink }]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>¿Cómo se divide?</Text>
            {splitOptions.map((o) => {
              const on = splitMode === o.id;
              return (
                <Pressable
                  key={o.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${o.title}. ${o.sub}`}
                  onPress={() => setSplitMode(o.id)}
                  style={[styles.option, styles.split, on && styles.optionOn]}
                >
                  <View style={[styles.ring, { borderColor: on ? color.ink : color.disabled }]}>
                    {on && <View style={styles.dot} />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 15 }]}>{o.title}</Text>
                    <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>{o.sub}</Text>
                  </View>
                </Pressable>
              );
            })}
            {splitMode === 'pct' && (
              <View style={{ gap: space[2] }}>
                <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>
                  {me.name} / {partner.name}
                </Text>
                <View style={styles.chips}>
                  {pctChips.map((p) => (
                    <Chip key={p} label={`${p} / ${100 - p}`} on={myPct === p} onPress={() => setMyPct(p)} />
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Fecha</Text>
            <View style={styles.chips}>
              {dateChips.map((d) => (
                <Chip key={d} label={chipDate(d)} on={spentOn === d} onPress={() => setSpentOn(d)} />
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {error ? (
            <Text style={[styles.preview, { color: color.negative }]} accessibilityRole="alert">
              {error}
            </Text>
          ) : (
            <Text style={[styles.preview, { color: previewColor }]} accessibilityLiveRegion="polite">
              {preview}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={save}
            style={[styles.primary, !canSave && styles.disabled]}
          >
            <Text style={[type.row, { color: color.surface, fontFamily: font.bodyBold }]}>{saving ? 'Guardando…' : saveLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[type.label, { fontFamily: font.bodyBold, fontSize: 14, color: on ? color.surface : color.ink }]}>{label}</Text>
    </Pressable>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[2],
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  iconButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  content: { padding: space[5], paddingBottom: 28, gap: space[6] },
  field: { gap: space[2] },
  label: { ...type.label, color: color.textSecondary },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: color.ink, paddingBottom: 6 },
  amountInput: { ...type.hero, flex: 1, minWidth: 0, color: color.ink, padding: 0, minHeight: touch },
  textInput: {
    ...type.body,
    height: 52,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    borderRadius: radius.control,
    paddingHorizontal: space[4],
    color: color.ink,
  },
  row: { flexDirection: 'row', gap: space[2] },
  option: { borderWidth: 1, borderColor: color.line, borderRadius: radius.option, backgroundColor: color.surface },
  optionOn: { borderColor: color.ink, borderWidth: 2 },
  payer: { flex: 1, height: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space[3] },
  category: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: space[3], paddingHorizontal: space[1] },
  catTile: { width: 36, height: 36, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  split: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: space[4], minHeight: touch },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    height: touch,
    paddingHorizontal: 18,
    borderRadius: touch / 2,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: color.ink, borderColor: color.ink },
  footer: { paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[5], gap: 10, borderTopWidth: 1, borderTopColor: color.line },
  preview: { ...type.label, fontFamily: font.bodyBold, fontSize: 14, textAlign: 'center' },
  primary: { height: 52, borderRadius: radius.control, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
