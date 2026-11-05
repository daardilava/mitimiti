import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCouple } from '@/api/expenses';
import { usePlan, usePurchasePlan, useRestorePurchases } from '@/api/plan';
import { getOfferings, purchasesMode } from '@/api/purchases';
import type { PlanPackage } from '@/lib/offerings';
import { benefitOrder, defaultPackage, savingsPercent, sortPlans, trialEnd, type Benefit } from '@/lib/paywall';
import { Callout } from '@/ui/Form';
import { Icon, type IconName } from '@/ui/Icon';
import { Miti } from '@/ui/Miti';
import { NavButton, Pending, Screen } from '@/ui/Screen';
import { font, radius, space, touch } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

const ICONS: Record<Benefit, IconName> = { scan: 'camera', dictate: 'mic', export: 'share' };

type Phase = 'idle' | 'buying' | 'activating' | 'done' | 'pending';

// Premium para los dos · a modal, opened from a locked feature (?from=scan|dictate|export) or Ajustes.
// A navy header with Miti (not green: green means payments and "settled"), the benefits in what-opened-it-first order,
// the two plans and one button that says which plan it buys.
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
  const styles = useStyles();

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
        <Benefits order={order} included />
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

  const canBuy = phase !== 'pending' && purchasesMode !== 'unavailable' && selected !== null;
  const cta = !selected
    ? m.paywall.subscribe
    : selected.trialDays
      ? m.paywall.tryFree(selected.trialDays)
      : selected.period === 'annual'
        ? m.paywall.continueAnnual
        : m.paywall.continueMonthly;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: space[5] }}>
        <Hero onClose={close} />
        <View style={styles.body}>
          <Benefits order={order} />

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
              <View style={{ gap: space[3], paddingTop: space[2] }} accessibilityRole="radiogroup" accessibilityLabel={m.paywall.plans}>
                {plans.map((p) => (
                  <PlanOption key={p.id} plan={p} selected={p.id === selected.id} savings={p.period === 'annual' ? savings : null} onPress={() => setPicked(p.id)} disabled={busy} />
                ))}
                <Text style={styles.forBoth}>{m.paywall.lead}</Text>
                <Terms plan={selected} />
              </View>
            )
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {phase === 'pending' ? (
          <NavButton label={m.paywall.continue} onPress={close} />
        ) : canBuy && selected ? (
          <>
            <NavButton label={cta} onPress={subscribe} disabled={busy || phase === 'activating'} loading={phase === 'buying' || phase === 'activating'} />
            <ShortTerms plan={selected} />
          </>
        ) : null}
        <FooterLinks onRestore={purchasesMode === 'unavailable' ? undefined : restorePurchases} disabled={busy || phase === 'activating'} />
      </View>
    </SafeAreaView>
  );
}

/** Navy, edge to edge under the status bar: close, Miti, the name and the promise. A few brand dots, decorative. */
function Hero({ onClose }: { onClose: () => void }) {
  const { m } = useI18n();
  const { color } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { paddingTop: insets.top + space[2] }]}>
      <View aria-hidden style={[styles.dot, { top: insets.top + 64, left: '12%', backgroundColor: color.wordmarkGreen }]} />
      <View aria-hidden style={[styles.dot, { top: insets.top + 20, right: '18%', width: 14, height: 5, transform: [{ rotate: '-20deg' }], backgroundColor: color.wordmarkCoral }]} />
      <View aria-hidden style={[styles.dot, { top: insets.top + 96, right: '10%', width: 10, height: 10, backgroundColor: color.wordmarkCoral }]} />
      <View aria-hidden style={[styles.dot, { top: insets.top + 150, left: '22%', width: 5, height: 12, transform: [{ rotate: '30deg' }], backgroundColor: color.wordmarkGreen }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={m.ui.close} onPress={onClose} style={styles.close} hitSlop={8}>
        <View style={styles.closeBg} />
        <Icon name="close" size={20} color={color.onHero} />
      </Pressable>
      <View style={styles.mitiRing}>
        <Miti size={112} />
      </View>
      <Text style={styles.heroTitle} accessibilityRole="header">
        {m.paywall.heroTitle}
      </Text>
      <Text style={styles.heroLead}>{m.paywall.heroLead}</Text>
    </View>
  );
}

function Benefits({ order, included }: { order: Benefit[]; included?: boolean }) {
  const { m } = useI18n();
  const { color, categories, type } = useTheme();
  const styles = useStyles();
  // The same tiles as on Inicio: Escanear and Dictar cards, the Exportar shortcut (pairs checked in tokens.test.ts).
  const tile: Record<Benefit, { fg: string; bg: string }> = {
    scan: { fg: color.partnerText, bg: color.partnerTint },
    dictate: { fg: categories.casa.color, bg: categories.casa.tint },
    export: { fg: categories.transporte.color, bg: categories.transporte.tint },
  };
  return (
    <View style={{ gap: space[4] }}>
      {order.map((b) => (
        <View key={b} style={styles.benefit}>
          <View style={[styles.benefitIcon, { backgroundColor: tile[b].bg }]}>
            <Icon name={ICONS[b]} size={20} color={tile[b].fg} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
              <Text style={[type.row, { fontFamily: font.bodyBold }]}>{m.paywall.benefits[b].title}</Text>
              {included ? <Badge>{m.paywall.included}</Badge> : null}
            </View>
            <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body, fontSize: 14, lineHeight: 20 }]}>{m.paywall.benefits[b].detail}</Text>
          </View>
        </View>
      ))}
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
      accessibilityLabel={`${annual ? m.paywall.annual : m.paywall.monthly}, ${plan.priceString} ${annual ? m.paywall.perYear : m.paywall.perMonth}${savings ? `, ${m.paywall.save(savings)}` : ''}`}
      onPress={onPress}
      disabled={disabled}
      style={[styles.plan, selected && styles.planOn]}
    >
      {savings ? (
        <View style={styles.saveBadge} aria-hidden>
          <Text style={styles.saveText}>{m.paywall.save(savings)}</Text>
        </View>
      ) : null}
      <View style={[styles.ring, { borderColor: selected ? color.ink : color.disabled }]}>{selected && <View style={styles.ringDot} />}</View>
      <View style={{ flex: 1, gap: space[1] }}>
        <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 17 }]}>{annual ? m.paywall.annual : m.paywall.monthly}</Text>
        {plan.trialDays ? (
          <View style={{ flexDirection: 'row' }}>
            <Badge>{m.paywall.trialDays(plan.trialDays)}</Badge>
          </View>
        ) : null}
      </View>
      {/* The amount billed is the most prominent price on the screen (Apple). */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.price}>{plan.priceString}</Text>
        <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>{annual ? m.paywall.perYear : m.paywall.perMonth}</Text>
      </View>
    </Pressable>
  );
}

function storeName(m: ReturnType<typeof useI18n>['m']): string {
  return Platform.OS === 'ios' ? m.paywall.stores.ios : Platform.OS === 'android' ? m.paywall.stores.android : m.paywall.stores.other;
}

/** One line under the button: what is billed, that it renews, where to cancel. The full terms are under the plans. */
function ShortTerms({ plan }: { plan: PlanPackage }) {
  const { m } = useI18n();
  const styles = useStyles();
  const per = plan.period === 'annual' ? m.paywall.perYear : m.paywall.perMonth;
  return (
    <Text style={styles.small}>
      {plan.trialDays ? m.paywall.trialShort(plan.trialDays, plan.priceString, per) : m.paywall.renewalShort(plan.priceString, per, storeName(m))}
    </Text>
  );
}

/** What the store will charge and when, in full, as both stores ask. */
function Terms({ plan }: { plan: PlanPackage }) {
  const { m, d } = useI18n();
  const period = plan.period === 'annual' ? m.paywall.year : m.paywall.month;
  const styles = useStyles();
  return (
    <View style={{ gap: space[1] }}>
      {plan.trialDays ? <Text style={styles.small}>{m.paywall.trialTerms(plan.trialDays, d.shortDate(trialEnd(plan.trialDays, new Date())), plan.priceString, period)}</Text> : null}
      <Text style={styles.small}>{m.paywall.renewal(plan.priceString, period, storeName(m))}</Text>
    </View>
  );
}

/** Restaurar compra · Términos · Privacidad, on one line. */
function FooterLinks({ onRestore, disabled }: { onRestore?: () => void; disabled: boolean }) {
  const { m } = useI18n();
  const styles = useStyles();
  const links = [
    ...(onRestore ? [{ label: m.paywall.restore, onPress: onRestore, disabled }] : []),
    { label: m.paywall.terms, onPress: () => router.push('/terms'), disabled: false },
    { label: m.paywall.privacy, onPress: () => router.push('/privacy'), disabled: false },
  ];
  return (
    <View style={styles.links}>
      {links.map((l, i) => (
        <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
          {i > 0 && (
            <Text style={styles.linkDot} aria-hidden>
              ·
            </Text>
          )}
          <Pressable accessibilityRole="link" onPress={l.onPress} disabled={l.disabled} style={[styles.link, l.disabled && { opacity: 0.4 }]}>
            <Text style={styles.linkText}>{l.label}</Text>
          </Pressable>
        </View>
      ))}
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
      <Benefits order={benefits} included />
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

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  hero: { backgroundColor: color.hero, alignItems: 'center', paddingHorizontal: space[5], paddingBottom: space[6], gap: space[2], overflow: 'hidden' },
  dot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, opacity: 0.8 },
  close: { alignSelf: 'flex-start', width: touch, height: touch, borderRadius: touch / 2, alignItems: 'center', justifyContent: 'center' },
  closeBg: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: touch / 2, backgroundColor: color.onHero, opacity: 0.14 },
  mitiRing: { padding: space[2], borderRadius: 999, borderWidth: 6, borderColor: color.heroLine, marginTop: -space[4] },
  heroTitle: { fontFamily: font.display, fontSize: 30, lineHeight: 36, color: color.onHero, textAlign: 'center', marginTop: space[2] },
  heroLead: { ...type.body, color: color.onInk, textAlign: 'center', maxWidth: 300 },
  body: { paddingHorizontal: space[5], paddingTop: space[5], gap: space[4] },
  benefit: { flexDirection: 'row', gap: space[3], alignItems: 'center' },
  benefitIcon: { width: 44, height: 44, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
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
  saveBadge: { position: 'absolute', top: -12, right: space[4], paddingHorizontal: space[3], paddingVertical: 3, borderRadius: 999, backgroundColor: color.brandCoral },
  saveText: { fontFamily: font.bodyBold, fontSize: 12, color: color.onBrandCoral },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ringDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.ink },
  price: { fontFamily: font.display, fontSize: 22, color: color.ink },
  badge: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.tile, backgroundColor: color.neutralTint },
  activating: { flexDirection: 'row', gap: space[3], alignItems: 'center', padding: space[4], borderRadius: radius.option, backgroundColor: color.surface },
  footer: { paddingHorizontal: space[5], paddingTop: space[3], gap: space[2], borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.background },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  link: { minHeight: touch, justifyContent: 'center', paddingHorizontal: space[2] },
  linkText: { fontFamily: font.body, fontSize: 13, color: color.textSecondary, textDecorationLine: 'underline' },
  linkDot: { fontSize: 13, color: color.textSecondary },
  small: { fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.textSecondary, textAlign: 'center' },
  forBoth: { ...type.label, fontFamily: font.body, color: color.textSecondary, textAlign: 'center', lineHeight: 19 },
}));
