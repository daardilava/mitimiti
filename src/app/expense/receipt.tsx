import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMyBalance } from '@/api/balance';
import { deleteExpense, forgetExpense, useCouple, useUpsertExpense, type Couple } from '@/api/expenses';
import { daysAgo } from '@/lib/dates';
import { handDraft, setReceipt, useDraftStore } from '@/lib/draftStore';
import { CURRENCIES, formatMoney, toDecimalText } from '@/lib/money';
import { canUseTotal, draftFromReading, type ReceiptReading } from '@/lib/receiptDraft';
import { expenseEffect, splitShares, type SplitMode } from '@/lib/splits';
import { Choice, Sheet, splitLabel } from '@/ui/Capture';
import { Callout, Chip } from '@/ui/Form';
import { Icon, type IconName } from '@/ui/Icon';
import { Loading, NavButton } from '@/ui/Screen';
import { showToast } from '@/ui/Toast';
import { font, radius, space, touch } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

const PCT_CHIPS = [30, 40, 50, 60, 70];

// Escanear › review (docs/PLAN.md › Scan + Dictate): what was read from the receipt, who paid and how it's split, and
// what the balance will be. Agregar gasto saves through useUpsertExpense like every expense; Editar opens the form with
// the same draft. The preview uses splits.ts (the same math as SQL) on top of balance_view: no new money math here.
export default function Receipt() {
  const { m } = useI18n();
  const couple = useCouple();
  const balance = useMyBalance();
  const reading = useDraftStore((s) => s.receipt);
  const { color, type } = useTheme();
  const styles = useStyles();

  if (!reading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', padding: space[5], gap: space[4] }]}>
        <Text style={[type.body, { color: color.textSecondary, textAlign: 'center' }]}>{m.capture.receipt.gone}</Text>
        <NavButton label={m.capture.locked.write} onPress={() => router.replace('/expense/new')} />
      </SafeAreaView>
    );
  }
  if (!couple.data || balance.data === undefined) return <Loading title={m.capture.receipt.title} error={couple.error ?? balance.error} />;
  return <Review reading={reading} couple={couple.data} net={balance.data} />;
}

function Review({ reading, couple, net }: { reading: ReceiptReading; couple: Couple; net: number }) {
  const { m, d } = useI18n();
  const { color, type, categories } = useTheme();
  const styles = useStyles();
  const client = useQueryClient();
  const save = useUpsertExpense();
  const t = m.capture.receipt;
  const { me, partner } = couple;
  const today = daysAgo(0);

  const [paidBy, setPaidBy] = useState(me.id);
  const [splitMode, setSplitMode] = useState<SplitMode>(couple.defaultSplit);
  // Like the form: chips read "me / partner"; the stored percentage is the payer's.
  const [myPct, setMyPct] = useState(couple.myDefaultPct);
  const [picker, setPicker] = useState<'payer' | 'split' | null>(null);

  const payerPct = paidBy === me.id ? myPct : 100 - myPct;
  const choice = { paidBy, splitMode, splitPct: splitMode === 'pct' ? payerPct : null };
  const draft = draftFromReading(reading, today, choice);
  const usable = canUseTotal(reading);
  const category = categories[reading.category];

  // ─── Amounts as printed, in the receipt's currency ───
  const knownForeign = reading.foreignCurrency !== null && CURRENCIES.some((c) => c === reading.foreignCurrency);
  const unknownForeign = reading.foreignCurrency !== null && !knownForeign;
  const fmt = (minor: number) => (unknownForeign ? `${toDecimalText(minor, reading.currency, ',')} ${reading.foreignCurrency}` : formatMoney(minor, reading.currency));
  const total =
    reading.totalMinor !== null ? fmt(reading.totalMinor) : unknownForeign && reading.totalText ? `${reading.totalText} ${reading.foreignCurrency}` : t.totalUnread;

  // ─── The balance after this expense: balance_view + splits.ts ───
  let preview: { lead: string; part: string } | string | null = null;
  if (usable && draft.amountMinor) {
    const effect = expenseEffect({ paidBy, amountMinor: draft.amountMinor, splitMode, splitPct: choice.splitPct }, me.id);
    const after = net + effect;
    const own = (n: number) => formatMoney(n, couple.currency);
    const part = after > 0 ? t.owesYou(partner.name, own(after)) : after < 0 ? t.youOwe(partner.name, own(after)) : t.even;
    preview = effect === 0 ? t.noChange : { lead: t.lead, part };
  }

  const payerName = paidBy === me.id ? me.name : partner.name;
  const otherName = paidBy === me.id ? partner.name : me.name;
  const splitText = splitLabel(m, couple, paidBy, splitMode, choice.splitPct);

  const edit = () => {
    handDraft(draft, 'receipt');
    setReceipt(null);
    router.replace('/expense/new');
  };

  const undo = async (id: string) => {
    try {
      await deleteExpense(id);
      await forgetExpense(client, id);
      showToast(m.quick.toast.undone);
    } catch {
      showToast(m.quick.toast.undoFailed);
    }
  };

  const add = () => {
    if (!usable || !draft.amountMinor || save.isPending) return;
    save.mutate(
      {
        paidBy,
        amountMinor: draft.amountMinor,
        category: reading.category,
        description: draft.description || category.name,
        spentOn: draft.spentOn ?? today,
        splitMode,
        splitPct: choice.splitPct,
        source: 'receipt',
      },
      {
        onSuccess: (saved) => {
          setReceipt(null);
          router.back();
          showToast(m.quick.toast.added(saved.description, formatMoney(saved.amountMinor, couple.currency)), [
            { label: m.quick.toast.undo, onPress: () => void undo(saved.id) },
            { label: m.quick.toast.edit, onPress: () => router.push({ pathname: '/expense/[id]/edit', params: { id: saved.id } }) },
          ]);
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={m.ui.back} onPress={() => router.replace('/expense/scan')} style={styles.iconButton}>
          <Icon name="back" size={22} color={color.ink} />
        </Pressable>
        <View style={styles.headerChip}>
          <Icon name="sparkle" size={14} color={color.ink} />
          <Text style={[type.label, { color: color.ink }]} accessibilityRole="header">
            {t.chip}
          </Text>
        </View>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* The paper receipt: white with dark print in both modes (onHero / hero, checked in tokens.test.ts). */}
        <View>
        <View style={styles.receipt} accessible accessibilityLabel={[reading.merchant, category.name, total].filter(Boolean).join('. ')}>
          {reading.merchant ? (
            <Text style={[type.heading, { textAlign: 'center', color: color.hero }]} numberOfLines={2}>
              {reading.merchant}
            </Text>
          ) : null}
          <View style={styles.catChip}>
            <Icon name={category.icon as IconName} size={14} color={color.partnerText} />
            <Text style={[type.effect, { color: color.partnerText }]}>{category.name}</Text>
          </View>
          <View style={styles.dashed} />
          <View style={styles.line}>
            <Text style={styles.lineLabel}>{t.date}</Text>
            <Text style={[styles.lineValue, { fontFamily: font.bodyBold }]}>{reading.date ? `${d.shortDate(reading.date)} ${reading.date.slice(0, 4)}` : t.noDate}</Text>
          </View>
          {reading.items.length > 0 && <View style={styles.dashed} />}
          {reading.items.map((item, i) => (
            <View key={`${i}-${item.name}`} style={styles.line}>
              <Text style={[styles.lineLabel, { color: color.hero, flex: 1 }]}>{t.line(String(item.qty), item.name)}</Text>
              <Text style={styles.lineValue}>{item.totalMinor !== null ? fmt(item.totalMinor) : '—'}</Text>
            </View>
          ))}
          <View style={styles.dashed} />
          <View style={[styles.line, { alignItems: 'flex-end' }]}>
            <Text style={styles.lineLabel}>{t.total}</Text>
            <Text style={[type.screenTitle, styles.tabular, { color: color.hero }]} adjustsFontSizeToFit numberOfLines={1}>
              {total}
            </Text>
          </View>
        </View>
        <View style={styles.tear} aria-hidden>
          {Array.from({ length: 24 }, (_, i) => (
            <View key={i} style={styles.tooth} />
          ))}
        </View>
        </View>

        {!reading.itemsMatchTotal && <Callout icon="doc" tone="neutral">{t.mismatch}</Callout>}
        {reading.foreignCurrency ? (
          <Callout icon="globe" tone="neutral">{t.foreign(reading.foreignCurrency, couple.currency)}</Callout>
        ) : reading.totalMinor === null ? (
          <Callout icon="doc" tone="neutral">{t.noTotal}</Callout>
        ) : null}

        <View style={styles.rows}>
          <Row label={t.paid} value={payerName} accent onPress={() => setPicker('payer')} />
          <View style={styles.rowLine} />
          <Row label={t.split} value={splitText} onPress={() => setPicker('split')} />
        </View>

        {preview && (
          <Text style={styles.preview} accessibilityLiveRegion="polite">
            {typeof preview === 'string' ? (
              preview
            ) : (
              <>
                {preview.lead} <Text style={{ color: color.partnerText }}>{preview.part}</Text>
              </>
            )}
          </Text>
        )}
        {save.isError && (
          <Text style={[styles.preview, { color: color.negative }]} accessibilityRole="alert">
            {t.saveFailed}
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {usable ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel={t.editA11y} onPress={edit} style={styles.edit}>
              <Icon name="edit" size={18} color={color.ink} />
              <Text style={[type.row, { fontFamily: font.bodyBold }]}>{t.edit}</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <NavButton label={save.isPending ? t.saving : t.add} loading={save.isPending} onPress={add} />
            </View>
          </>
        ) : (
          <View style={{ flex: 1 }}>
            <NavButton label={t.writeAmount} onPress={edit} />
          </View>
        )}
      </View>

      <Sheet visible={picker === 'payer'} title={t.pickPayer} onClose={() => setPicker(null)}>
        {[me, partner].map((p) => (
          <Choice
            key={p.id || 'partner'}
            title={p.name}
            detail={p.id ? undefined : m.expenseForm.partnerNotYet}
            selected={paidBy === p.id}
            // Until the partner joins they have no account, so only you can be the payer (same as the form).
            disabled={!p.id}
            onPress={() => {
              setPaidBy(p.id);
              setPicker(null);
            }}
          />
        ))}
      </Sheet>

      <Sheet visible={picker === 'split'} title={t.pickSplit} onClose={() => setPicker(null)}>
        <Choice
          title={m.expenseForm.half}
          detail={draft.amountMinor ? m.expenseForm.halfEach(formatMoney(splitShares({ paidBy, amountMinor: draft.amountMinor, splitMode: 'half' }).partner, couple.currency)) : m.expenseForm.halfEachEmpty}
          selected={splitMode === 'half'}
          onPress={() => {
            setSplitMode('half');
            setPicker(null);
          }}
        />
        <Choice title={m.expenseForm.pct} detail={m.capture.dictate.pct(me.name, String(myPct), partner.name, String(100 - myPct))} selected={splitMode === 'pct'} onPress={() => setSplitMode('pct')} />
        {splitMode === 'pct' && (
          <View style={styles.chips}>
            {(PCT_CHIPS.includes(myPct) ? PCT_CHIPS : [...PCT_CHIPS, myPct].sort((a, b) => a - b)).map((p) => (
              <Chip key={p} label={`${p} / ${100 - p}`} selected={myPct === p} onPress={() => setMyPct(p)} />
            ))}
          </View>
        )}
        <Choice
          title={m.expenseForm.other(otherName)}
          detail={m.expenseForm.otherDetail(otherName, payerName)}
          selected={splitMode === 'other'}
          onPress={() => {
            setSplitMode('other');
            setPicker(null);
          }}
        />
        <Choice
          title={m.expenseForm.personal(payerName)}
          detail={m.expenseForm.personalDetail}
          selected={splitMode === 'personal'}
          onPress={() => {
            setSplitMode('personal');
            setPicker(null);
          }}
        />
      </Sheet>
    </SafeAreaView>
  );
}

function Row({ label, value, accent, onPress }: { label: string; value: string; accent?: boolean; onPress: () => void }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={m.capture.receipt.rowA11y(label, value)} onPress={onPress} style={styles.row}>
      <Text style={[type.row, { color: color.textSecondary, flex: 1 }]}>{label}</Text>
      <Text style={[type.row, { fontFamily: font.bodyBold, flexShrink: 1, textAlign: 'right', color: accent ? color.me : color.ink }]} numberOfLines={2}>
        {value}
      </Text>
      <Icon name="forward" size={18} color={color.textSecondary} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[2] },
  iconButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  content: { padding: space[5], gap: space[4] },
  receipt: { gap: space[3], padding: space[5], paddingBottom: space[6], borderTopLeftRadius: radius.tile, borderTopRightRadius: radius.tile, backgroundColor: color.onHero, alignItems: 'stretch' },
  catChip: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.tile, backgroundColor: color.partnerTint },
  dashed: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: color.heroLine },
  // The torn bottom edge: small squares in the background colour, turned 45°, biting into the paper.
  tear: { flexDirection: 'row', justifyContent: 'space-between', height: 7, marginTop: -7, overflow: 'hidden' },
  tooth: { width: 10, height: 10, marginTop: 2, backgroundColor: color.background, transform: [{ rotate: '45deg' }] },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[3] },
  lineLabel: { ...type.body, fontSize: 15, color: color.heroLine },
  lineValue: { ...type.body, fontSize: 15, color: color.hero, fontVariant: ['tabular-nums'] },
  tabular: { fontVariant: ['tabular-nums'], flexShrink: 1 },
  rows: { borderRadius: radius.card, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: touch + 12, paddingHorizontal: space[4] },
  rowLine: { height: 1, backgroundColor: color.line, marginHorizontal: space[4] },
  preview: { ...type.label, fontFamily: font.bodyBold, fontSize: 14, textAlign: 'center', color: color.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[3], borderTopWidth: 1, borderTopColor: color.line },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: 52,
    paddingHorizontal: space[4],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    backgroundColor: color.surface,
  },
}));
