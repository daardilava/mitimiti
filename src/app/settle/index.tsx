import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { balanceKeys, useMyBalance, useRecordSettlement } from '@/api/balance';
import { coupleKey, useCouple, type Person as CouplePerson } from '@/api/expenses';
import { CURRENCY_SYMBOL, formatMoney, parseMoneyInput, toInputText } from '@/lib/money';
import { halfOf, paymentProblem, settleDirection, settleErrorMessage, settleLead, type SettleMethod } from '@/lib/settle';
import { Avatar } from '@/ui/Avatar';
import type { AvatarId } from '@/lib/avatars';
import { Callout, Chip } from '@/ui/Form';
import { Icon, type IconName } from '@/ui/Icon';
import { NavButton, Pending, Screen } from '@/ui/Screen';
import { font, radius, space, touch, noFocusRing } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

const METHODS: { id: SettleMethod; icon: IconName }[] = [
  { id: 'transfer', icon: 'bank' },
  { id: 'cash', icon: 'cash' },
  { id: 'other', icon: 'dots' },
];

// 09 · Saldar cuentas: records a payment made outside the app, full or partial, never more than what is owed.
export default function Settle() {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const client = useQueryClient();
  const couple = useCouple();
  const balance = useMyBalance();

  if (!couple.data || balance.data === undefined) {
    return (
      <Screen title={m.settleScreen.title} back="back">
        <Pending failed={couple.isError || balance.isError} onRetry={() => [coupleKey, balanceKeys.balance].forEach((queryKey) => client.invalidateQueries({ queryKey }))} />
      </Screen>
    );
  }

  const direction = settleDirection(balance.data, couple.data.me, couple.data.partner);
  if (!direction) {
    return (
      <Screen title={m.settleScreen.title} back="back">
        <Text style={[type.heading, { textAlign: 'center', marginTop: space[8] }]}>{m.settleScreen.even}</Text>
        <Text style={[type.body, { color: color.textSecondary, textAlign: 'center' }]}>{m.settleScreen.nothingPending}</Text>
      </Screen>
    );
  }

  // Key on the amount owed: if the partner records a payment meanwhile, the form starts over from the new balance.
  return <SettleForm key={direction.owedMinor} couple={couple.data} direction={direction} />;
}

function SettleForm({ couple, direction }: { couple: NonNullable<ReturnType<typeof useCouple>['data']>; direction: { from: CouplePerson; to: CouplePerson; owedMinor: number } }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const { currency } = couple;
  const { from, to, owedMinor } = direction;
  const record = useRecordSettlement();
  const [amountText, setAmountText] = useState(toInputText(owedMinor, currency));
  const [method, setMethod] = useState<SettleMethod>('transfer');

  const amountMinor = parseMoneyInput(amountText, currency);
  const problem = paymentProblem(amountMinor, owedMinor);
  const half = halfOf(owedMinor);
  const fmt = (minor: number) => formatMoney(minor, currency);

  const submit = () =>
    record.mutate(
      { amountMinor, method },
      {
        onSuccess: (saved) =>
          router.replace({ pathname: '/settle/done', params: { amount: String(saved.amountMinor), method: saved.method, from: saved.fromUser, to: saved.toUser } }),
      },
    );

  return (
    <Screen
      title={m.settleScreen.title}
      back="back"
      footer={
        <View style={{ gap: space[2] }}>
          {record.isError && (
            <Text style={[type.label, { color: color.negative, textAlign: 'center' }]} accessibilityLiveRegion="polite">
              {settleErrorMessage(record.error, m)}
            </Text>
          )}
          <NavButton
            kind="payment"
            label={problem ? m.settleScreen.record : m.settleScreen.recordAmount(fmt(amountMinor))}
            onPress={submit}
            disabled={problem !== null || !couple.partnerJoined}
            loading={record.isPending}
          />
        </View>
      }
    >
      <View style={styles.people} accessible accessibilityLabel={settleLead(from, to, owedMinor, currency, m)}>
        <Person name={from.name} avatar={from.avatar} isMe={from.id === couple.me.id} />
        <Icon name="arrowRight" size={28} color={color.textSecondary} />
        <Person name={to.name} avatar={to.avatar} isMe={to.id === couple.me.id} />
      </View>
      <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', fontSize: 17 }]}>{settleLead(from, to, owedMinor, currency, m)}</Text>

      {!couple.partnerJoined && (
        <Callout icon="bell">{m.settleScreen.waitingPartner(couple.partner.name)}</Callout>
      )}

      <View style={{ gap: space[2] }}>
        <Text nativeID="settle-amount-label" style={[type.label, { color: color.textSecondary }]}>
          {m.settleScreen.amount}
        </Text>
        <View style={[styles.amountRow, problem === 'too_much' && { borderBottomColor: color.negative }]}>
          <Text style={[type.screenTitle, { color: color.textSecondary }]}>{CURRENCY_SYMBOL[currency]}</Text>
          <TextInput
            accessibilityLabel={m.settleScreen.amountA11y(currency)}
            aria-labelledby="settle-amount-label"
            value={amountText}
            onChangeText={setAmountText}
            placeholder="0"
            placeholderTextColor={color.disabled}
            keyboardType={currency === 'COP' ? 'number-pad' : 'decimal-pad'}
            inputMode={currency === 'COP' ? 'numeric' : 'decimal'}
            selectTextOnFocus
            style={styles.amountInput}
          />
        </View>
        {problem === 'too_much' && (
          <Text style={[type.label, { color: color.negative }]} accessibilityLiveRegion="polite">
            {m.settleScreen.tooMuch(fmt(owedMinor))}
          </Text>
        )}
      </View>

      <View style={styles.chips}>
        <Chip label={m.settleScreen.all(fmt(owedMinor))} selected={amountMinor === owedMinor} onPress={() => setAmountText(toInputText(owedMinor, currency))} />
        {half > 0 && half < owedMinor && (
          <Chip label={m.settleScreen.half(fmt(half))} selected={amountMinor === half} onPress={() => setAmountText(toInputText(half, currency))} />
        )}
      </View>

      <View style={{ gap: space[2] }}>
        <Text style={[type.label, { color: color.textSecondary }]}>{m.settleScreen.how}</Text>
        <View style={styles.methods} accessibilityRole="radiogroup">
          {METHODS.map((opt) => {
            const on = method === opt.id;
            const label = m.activity.methods[opt.id];
            return (
              <Pressable
                key={opt.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={label}
                onPress={() => setMethod(opt.id)}
                style={[styles.method, on && styles.methodOn]}
              >
                <Icon name={opt.icon} size={24} color={color.ink} />
                {/* 14 px with tight tracking so "Transferencia" fits a third of a 360 px phone. */}
                <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 14, letterSpacing: -0.2 }]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Callout icon="bank" tone="neutral">
        {m.settleScreen.onlyRecords}
      </Callout>
    </Screen>
  );
}

function Person({ name, avatar, isMe }: { name: string; avatar: AvatarId | null; isMe: boolean }) {
  const { type } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: space[2] }}>
      <Avatar name={name} isMe={isMe} avatar={avatar} size={64} />
      <Text style={[type.row, { fontFamily: font.bodyBold }]}>{name}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  people: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[6], marginTop: space[2] },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: color.ink, paddingBottom: 6 },
  amountInput: { ...type.hero, flex: 1, minWidth: 0, color: color.ink, padding: 0, minHeight: touch, fontVariant: ['tabular-nums'], ...noFocusRing },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  methods: { flexDirection: 'row', gap: space[3] },
  method: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    borderRadius: radius.option,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    paddingHorizontal: space[1],
  },
  methodOn: { borderColor: color.ink, borderWidth: 2 },
}));
