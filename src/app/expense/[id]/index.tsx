import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCouple, useDeleteExpense, useExpense } from '@/api/expenses';
import { longDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { expenseEffect, splitShares } from '@/lib/splits';
import { Avatar } from '@/ui/Avatar';
import { Icon, type IconName } from '@/ui/Icon';
import { Loading } from '@/ui/Screen';
import { categories, color, font, radius, space, touch, type } from '@/ui/tokens';

// 07 · Detalle del gasto
export default function ExpenseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const couple = useCouple();
  const query = useExpense(id);
  const remove = useDeleteExpense();
  const [confirming, setConfirming] = useState(false);

  const expense = query.data;
  if (!couple.data || !expense) {
    return <Loading title="Detalle del gasto" error={couple.error ?? query.error} notFound={query.data === null} />;
  }

  const { me, partner, currency } = couple.data;
  const fmt = (n: number) => formatMoney(n, currency);
  const cat = categories[expense.category];
  const payerIsMe = expense.paidBy === me.id;
  const payer = payerIsMe ? me : partner;
  const other = payerIsMe ? partner : me;
  const shares = splitShares(expense);
  const mine = payerIsMe ? shares.payer : shares.partner;
  const myPct = expense.amountMinor ? Math.round((mine / expense.amountMinor) * 100) : 0;
  const effect = expenseEffect(expense, me.id);
  const amountText = fmt(expense.amountMinor);

  const splitName =
    expense.splitMode === 'pct'
      ? 'Por porcentaje'
      : expense.splitMode === 'other'
        ? `Todo para ${other.name}`
        : expense.splitMode === 'personal'
          ? 'Personal'
          : 'Mitad y mitad';
  const effectLine =
    expense.splitMode === 'personal'
      ? 'Gasto personal: no cambia el saldo entre ustedes.'
      : effect > 0
        ? `Por este gasto, ${partner.name} te debe ${fmt(effect)}.`
        : effect < 0
          ? `Por este gasto, le debes ${fmt(effect)} a ${partner.name}.`
          : 'Este gasto no cambia el saldo.';
  const effectColors =
    effect > 0
      ? { backgroundColor: color.positiveTint, color: color.positiveText }
      : effect < 0
        ? { backgroundColor: color.negativeTint, color: color.negative }
        : { backgroundColor: color.neutralTint, color: color.textSecondary };

  const openEdit = () => router.push({ pathname: '/expense/[id]/edit', params: { id: expense.id } });
  const confirmDelete = () =>
    remove.mutate(expense.id, {
      onSuccess: () => {
        setConfirming(false);
        if (router.canGoBack()) router.back();
        else router.replace('/');
      },
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.iconButton}>
          <Icon name="back" size={22} color={color.ink} />
        </Pressable>
        <Text style={[type.bar, { flex: 1 }]} accessibilityRole="header">
          Detalle del gasto
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Editar gasto" onPress={openEdit} style={styles.iconButton}>
          <Icon name="edit" size={22} color={color.ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Eliminar gasto" onPress={() => setConfirming(true)} style={styles.iconButton}>
          <Icon name="trash" size={22} color={color.negative} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.catTile, { backgroundColor: cat.tint }]}>
            <Icon name={cat.icon as IconName} size={30} color={cat.color} />
          </View>
          <Text style={[type.row, { fontSize: 17, color: color.textSecondary, textAlign: 'center' }]}>{expense.description}</Text>
          <Text style={[type.balance, { color: color.ink }]} accessibilityLabel={`Monto ${amountText}`}>
            {amountText}
          </Text>
          <Text style={[type.label, { fontFamily: font.body, fontSize: 14, color: color.textSecondary }]}>
            {cat.name} · {longDate(expense.spentOn)}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.line}>
            <Text style={styles.muted}>Pagó</Text>
            <Avatar name={payer.name} isMe={payerIsMe} />
            <Text style={[type.row, { fontFamily: font.bodyBold }]}>{payer.name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.line}>
            <Text style={styles.muted}>División</Text>
            <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 15 }]}>{splitName}</Text>
          </View>
          {[
            { person: me, isMe: true, amount: mine, pct: myPct, bar: color.me },
            { person: partner, isMe: false, amount: expense.amountMinor - mine, pct: 100 - myPct, bar: color.partner },
          ].map((s) => (
            <View key={s.person.id} style={{ gap: space[2] }} accessible accessibilityLabel={`Le toca a ${s.person.name}: ${fmt(s.amount)}, ${s.pct}%`}>
              <View style={styles.line}>
                <Avatar name={s.person.name} isMe={s.isMe} size={28} />
                <Text style={[type.row, { flex: 1, fontSize: 15 }]}>Le toca a {s.person.name}</Text>
                <Text style={[type.label, { fontFamily: font.body, color: color.textSecondary }]}>{s.pct}%</Text>
                <Text style={[type.row, styles.shareAmount]}>{fmt(s.amount)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${s.pct}%`, backgroundColor: s.bar }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.effect, { backgroundColor: effectColors.backgroundColor }]}>
          <Icon name="swap" size={20} color={effectColors.color} />
          <Text style={[type.row, { flex: 1, fontSize: 15, lineHeight: 21, color: effectColors.color }]}>{effectLine}</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={openEdit} style={styles.secondary}>
          <Icon name="edit" size={20} color={color.ink} />
          <Text style={[type.row, { fontFamily: font.bodyBold }]}>Editar gasto</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={confirming} transparent animationType="slide" onRequestClose={() => setConfirming(false)}>
        <Pressable accessibilityLabel="Cerrar" style={styles.scrim} onPress={() => setConfirming(false)} />
        <View style={styles.sheet} accessibilityViewIsModal role="dialog" aria-label="¿Eliminar este gasto?">
          <Text style={[type.heading, { fontSize: 24 }]} accessibilityRole="header">
            ¿Eliminar este gasto?
          </Text>
          <Text style={[type.body, { fontSize: 15, color: color.textSecondary, marginBottom: 6 }]}>
            {expense.description} · {amountText}. El saldo se recalcula y no se puede deshacer.
          </Text>
          {remove.error && (
            <Text style={[type.label, { color: color.negative }]} accessibilityRole="alert">
              No se pudo eliminar. Inténtalo de nuevo.
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={remove.isPending}
            onPress={confirmDelete}
            style={[styles.danger, remove.isPending && { opacity: 0.4 }]}
          >
            <Text style={[type.row, { fontFamily: font.bodyBold, color: color.surface }]}>{remove.isPending ? 'Eliminando…' : 'Eliminar gasto'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setConfirming(false)} style={styles.secondary}>
            <Text style={[type.row, { fontFamily: font.bodyBold }]}>Cancelar</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', gap: space[1], paddingHorizontal: space[2] },
  iconButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: space[5], paddingTop: space[1], paddingBottom: 28, gap: space[4] },
  hero: { alignItems: 'center', gap: 10, paddingTop: space[3], paddingBottom: 6 },
  catTile: { width: 64, height: 64, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius.card, padding: 18, gap: space[4] },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  muted: { ...type.label, fontFamily: font.body, fontSize: 14, color: color.textSecondary, flex: 1 },
  divider: { height: 1, backgroundColor: color.line },
  shareAmount: { fontFamily: font.bodyBold, minWidth: 72, textAlign: 'right', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, backgroundColor: color.neutralTint, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  effect: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.option },
  secondary: {
    height: 52,
    flexDirection: 'row',
    gap: space[2],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: { flex: 1, backgroundColor: color.ink, opacity: 0.5 },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space[5],
    paddingTop: space[6],
    paddingBottom: 28,
    gap: space[3],
  },
  danger: { height: 52, borderRadius: radius.control, backgroundColor: color.negative, alignItems: 'center', justifyContent: 'center' },
});
