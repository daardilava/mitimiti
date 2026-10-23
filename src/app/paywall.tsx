import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCouple } from '@/api/expenses';
import { usePlan, usePurchasePlan, useRestorePurchases } from '@/api/plan';
import { getOfferings, purchasesMode } from '@/api/purchases';
import type { PlanPackage } from '@/lib/offerings';
import { AVAILABLE, benefitOrder, defaultPackage, savingsPercent, sortPlans, trialEnd, type Benefit } from '@/lib/paywall';
import { TextLink } from '@/ui/Auth';
import { Callout } from '@/ui/Form';
import { Icon, type IconName } from '@/ui/Icon';
import { NavButton, Pending, Screen } from '@/ui/Screen';
import { font, radius, space, touch } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

const ICONS: Record<Benefit, IconName> = { history: 'calendar', budgets: 'chart', export: 'share', recurring: 'swap' };

type Phase = 'idle' | 'buying' | 'activating' | 'done' | 'pending';

// Premium para los dos · a modal, opened from a locked feature (?from=history|budgets|export) or Ajustes.
// Store rules (docs/PLAN.md › Phase 6): the billed amount is the most prominent price, a yearly plan is never shown as
// a monthly price, a trial says how long it lasts and what is charged after, and once the couple is Premium the
// partner is offered no second subscription.
export default function Paywall() {
  const { m } = useI18n();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const plan = usePlan();
  const couple = useCouple();
  const offerings = useQuery({ queryKey: ['offerings'], queryFn: getOfferings, enabled: purchasesMode !== 'unavailable', staleTime: 5 * 60_000 });
  const buy = usePurchasePlan();
  const restore = useRestorePurchases();
  const [picked, setPicked] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [restoreNote, setRestoreNote] = useState<string | null>(null);

  const order = benefitOrder(from);
  // Opened from a link with nothing behind it, close lands on Home.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (phase === 'done') return <Done benefits={order} onClose={close} />;
  if (plan.isLoading) {
    return (
      <Screen title={m.paywall.title} back="close">
        <Pending failed={false} onRetry={() => {}} />
      </Screen>
    );
  }
  // Already Premium (bought on this phone or the partner's): say so, and offer nothing to buy (Apple 3.1.2(b)).
  if (plan.isPremium && phase === 'idle') {
    const partner = couple.data?.partner.name;
    return (
      <Screen
        title={plan.info.isPayer ? m.paywall.youHaveTitle : partner ? m.paywall.partnerHasTitle(partner) : m.paywall.youHaveTitle}
        lead={plan.info.isPayer ? m.paywall.youHaveLead : m.paywall.partnerHasLead}
        back="close"
        footer={<NavButton label={m.paywall.continue} onPress={close} />}
      >
        <Benefits order={order} highlight={from} included />
      </Screen>
    );
  }

  const plans = sortPlans(offerings.data ?? []);
  const selected = plans.find((p) => p.id === picked) ?? defaultPackage(plans);
  const savings = savingsPercent(plans);
  const busy = buy.isPending || restore.isPending;

  const subscribe = () => {
    if (!selected) return;
    setRestoreNote(null);
    setPhase('buying');
    buy.mutate(
      { plan: selected, onActivating: () => setPhase('activating') },
      {
        onSuccess: (result) => setPhase(result === 'active' ? 'done' : result === 'pending' ? 'pending' : 'idle'),
        onError: () => setPhase('idle'),
      },
    );
  };

  const restorePurchases = () => {
    setRestoreNote(null);
    buy.reset();
    restore.mutate(undefined, {
      onSuccess: (info) => (info.plan === 'premium' ? setPhase('done') : setRestoreNote(m.paywall.restoreNone)),
      onError: () => setRestoreNote(m.paywall.restoreFailed),
    });
  };

  const footer =
    phase === 'pending' ? (
      <NavButton label={m.paywall.continue} onPress={close} />
    ) : purchasesMode === 'unavailable' || !selected ? undefined : (
      <View style={{ gap: space[1] }}>
        <NavButton
          label={selected.trialDays ? m.paywall.tryFree(selected.trialDays) : m.paywall.subscribe}
          onPress={subscribe}
          disabled={busy || phase === 'activating'}
          loading={phase === 'buying' || phase === 'activating'}
        />
        <View style={{ alignItems: 'center' }}>
          <TextLink label={m.paywall.restore} onPress={restorePurchases} disabled={busy || phase === 'activating'} />
        </View>
      </View>
    );

  return (
    <Screen title={m.paywall.title} lead={m.paywall.lead} back="close" footer={footer}>
      <Benefits order={order} highlight={from} />

      {phase === 'activating' && <Activating />}
      {phase === 'pending' && <Callout icon="check">{m.paywall.pending}</Callout>}
      {buy.isError && phase === 'idle' && <ErrorLine>{m.paywall.purchaseFailed}</ErrorLine>}
      {restoreNote && <ErrorLine tone="neutral">{restoreNote}</ErrorLine>}

      {purchasesMode === 'unavailable' ? (
        <Callout icon="bell" tone="neutral">
          {m.paywall.unavailable}
        </Callout>
      ) : offerings.isLoading || offerings.isError ? (
        <View>
          {offerings.isError && <ErrorLine tone="neutral">{m.paywall.loadFailed}</ErrorLine>}
          <Pending failed={offerings.isError} onRetry={() => offerings.refetch()} />
        </View>
      ) : (
        phase !== 'pending' &&
        selected && (
          <>
            <View style={{ gap: space[3] }} accessibilityRole="radiogroup" accessibilityLabel={m.paywall.plans}>
              {plans.map((p) => (
                <PlanOption key={p.id} plan={p} selected={p.id === selected.id} savings={p.period === 'annual' ? savings : null} onPress={() => setPicked(p.id)} disabled={busy} />
              ))}
            </View>
            <Terms plan={selected} />
          </>
        )
      )}
    </Screen>
  );
}

function Benefits({ order, highlight, included }: { order: Benefit[]; highlight?: string; included?: boolean }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={{ gap: space[3] }}>
      {order.map((b) => {
        const soon = !AVAILABLE.has(b);
        return (
          <View key={b} style={[styles.benefit, b === highlight && styles.benefitOn]}>
            <View style={styles.benefitIcon}>
              <Icon name={ICONS[b]} size={20} color={color.ink} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
                <Text style={[type.row, { fontFamily: font.bodyBold }]}>{m.paywall.benefits[b].title}</Text>
                {soon ? <Badge>{m.paywall.soon}</Badge> : included ? <Badge>{m.paywall.included}</Badge> : null}
              </View>
              <Text style={[type.body, { color: color.textSecondary, fontSize: 15, lineHeight: 22 }]}>{m.paywall.benefits[b].detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PlanOption({ plan, selected, savings, onPress, disabled }: { plan: PlanPackage; selected: boolean; savings: number | null; onPress: () => void; disabled: boolean }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const annual = plan.period === 'annual';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${annual ? m.paywall.annual : m.paywall.monthly}, ${plan.priceString} ${annual ? m.paywall.perYear : m.paywall.perMonth}`}
      onPress={onPress}
      disabled={disabled}
      style={[styles.plan, selected && styles.planOn]}
    >
      <View style={[styles.ring, { borderColor: selected ? color.ink : color.disabled }]}>{selected && <View style={styles.dot} />}</View>
      <View style={{ flex: 1, gap: space[1] }}>
        <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 17 }]}>{annual ? m.paywall.annual : m.paywall.monthly}</Text>
        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          {plan.trialDays ? <Badge>{m.paywall.trialDays(plan.trialDays)}</Badge> : null}
          {savings ? <Badge>{m.paywall.save(savings)}</Badge> : null}
        </View>
      </View>
      {/* The amount billed is the most prominent price on the screen (Apple). */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.price}>{plan.priceString}</Text>
        <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>{annual ? m.paywall.perYear : m.paywall.perMonth}</Text>
      </View>
    </Pressable>
  );
}

function Terms({ plan }: { plan: PlanPackage }) {
  const { m, d } = useI18n();
  const { color, type } = useTheme();
  const period = plan.period === 'annual' ? m.paywall.year : m.paywall.month;
  const store = Platform.OS === 'ios' ? m.paywall.stores.ios : Platform.OS === 'android' ? m.paywall.stores.android : m.paywall.stores.other;
  const small = [type.label, { color: color.textSecondary, fontFamily: font.body, lineHeight: 19 }];
  return (
    <View style={{ gap: space[2] }}>
      {plan.trialDays ? <Text style={small}>{m.paywall.trialTerms(plan.trialDays, d.shortDate(trialEnd(plan.trialDays, new Date())), plan.priceString, period)}</Text> : null}
      <Text style={small}>{m.paywall.renewal(plan.priceString, period, store)}</Text>
      <Text style={small}>{m.paywall.coreFree}</Text>
      <View style={{ flexDirection: 'row', gap: space[5] }}>
        <TextLink label={m.paywall.terms} onPress={() => router.push('/terms')} />
        <TextLink label={m.paywall.privacy} onPress={() => router.push('/privacy')} />
      </View>
    </View>
  );
}

function Activating() {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.activating} accessibilityLiveRegion="polite">
      <ActivityIndicator color={color.ink} />
      <View style={{ flex: 1 }}>
        <Text style={[type.row, { fontFamily: font.bodyBold }]}>{m.paywall.activating}</Text>
        <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>{m.paywall.activatingDetail}</Text>
      </View>
    </View>
  );
}

function Done({ benefits, onClose }: { benefits: Benefit[]; onClose: () => void }) {
  const { m } = useI18n();
  return (
    <Screen title={m.paywall.doneTitle} lead={m.paywall.doneLead} back="close" footer={<NavButton label={m.paywall.continue} onPress={onClose} />}>
      <Benefits order={benefits.filter((b) => AVAILABLE.has(b))} included />
    </Screen>
  );
}

function Badge({ children }: { children: string }) {
  const { type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.badge}>
      <Text style={[type.effect, { fontSize: 12 }]}>{children}</Text>
    </View>
  );
}

function ErrorLine({ children, tone = 'negative' }: { children: string; tone?: 'negative' | 'neutral' }) {
  const { color, type } = useTheme();
  return (
    <Text style={[type.label, { color: tone === 'negative' ? color.negative : color.textSecondary, fontFamily: font.body }]} accessibilityRole="alert">
      {children}
    </Text>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  benefit: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start', padding: space[3], borderRadius: radius.option, borderWidth: 1, borderColor: 'transparent' },
  benefitOn: { backgroundColor: color.surface, borderColor: color.line },
  benefitIcon: { width: 40, height: 40, borderRadius: radius.tile, backgroundColor: color.neutralTint, alignItems: 'center', justifyContent: 'center' },
  plan: {
    minHeight: touch + 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.option,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    backgroundColor: color.surface,
  },
  planOn: { borderColor: color.ink, borderWidth: 2, padding: space[4] - 1 },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.ink },
  price: { fontFamily: font.display, fontSize: 22, color: color.ink },
  badge: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.tile, backgroundColor: color.neutralTint },
  activating: { flexDirection: 'row', gap: space[3], alignItems: 'center', padding: space[4], borderRadius: radius.option, backgroundColor: color.surface },
}));
