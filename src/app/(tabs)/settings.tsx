import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { signOut as endSession } from '@/api/auth';
import { useSettlements } from '@/api/balance';
import { coupleKey, useCouple, useExpenses, type Couple } from '@/api/expenses';
import { householdKey, useHousehold, useUpdateCoupleSettings, type CoupleSettingsInput } from '@/api/household';
import { planKey, usePlan, useRestorePurchases } from '@/api/plan';
import { manageSubscriptions } from '@/api/purchases';
import { DEFAULT_PCT_MAX, DEFAULT_PCT_MIN, DEFAULT_PCT_PRESETS, parseSharePct, settingsErrorMessage, shareLabel } from '@/lib/coupleSettings';
import { CURRENCIES } from '@/lib/money';
import { planLine } from '@/lib/plans';
import { setSamplePlan } from '@/lib/sample';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { TextLink } from '@/ui/Auth';
import { Avatar } from '@/ui/Avatar';
import { Callout, Chip, Segmented, TextField } from '@/ui/Form';
import { Icon, type IconName } from '@/ui/Icon';
import { openPaywall } from '@/ui/Premium';
import { NavButton, Pending, Screen } from '@/ui/Screen';
import { font, radius, space, touch } from '@/ui/tokens';
import { makeStyles, useTheme, type AppearancePreference } from '@/ui/theme';
import { LANGUAGES, messages, useI18n, type LanguagePreference } from '@/i18n';

type Section = 'split' | 'currency';

// 13 · Ajustes: who you are (Tu perfil opens from the top card), the couple code until the partner joins, the plan,
// default split, currency, appearance, language, what is coming (reminders), legal and the account. Exportar lives on
// Inicio's shortcut row.
export default function Settings() {
  const { m } = useI18n();
  const client = useQueryClient();
  const couple = useCouple();
  const household = useHousehold();

  if (!couple.data || !household.data) {
    return (
      <Screen title={m.settings.title}>
        <Pending failed={couple.isError || household.isError} onRetry={() => [coupleKey, householdKey].forEach((queryKey) => client.invalidateQueries({ queryKey }))} />
      </Screen>
    );
  }
  return <SettingsForm couple={couple.data} joinCode={household.data.joinCode} joinCodeExpiresAt={household.data.joinCodeExpiresAt} />;
}

function SettingsForm({ couple, joinCode, joinCodeExpiresAt }: { couple: Couple; joinCode: string | null; joinCodeExpiresAt: string | null }) {
  const { m } = useI18n();
  const { color, categories } = useTheme();
  const styles = useStyles();
  const update = useUpdateCoupleSettings();
  const expenses = useExpenses();
  const settlements = useSettlements();
  const email = useSessionStore((s) => s.email);
  const [status, setStatus] = useState<{ section: Section; error?: string } | null>(null);

  const save = (section: Section, input: CoupleSettingsInput) =>
    update.mutate(input, {
      onSuccess: () => setStatus({ section }),
      onError: (e) => setStatus({ section, error: settingsErrorMessage(e, m) }),
    });

  const hasMoney = (expenses.data?.length ?? 0) > 0 || (settlements.data?.length ?? 0) > 0;
  const expired = !joinCode || (joinCodeExpiresAt !== null && new Date(joinCodeExpiresAt) < new Date());

  return (
    <Screen title={m.settings.title}>
      <ProfileHeader couple={couple} email={email} code={expired ? null : joinCode} />

      <PlanCard partnerName={couple.partner.name} />

      <Card title={m.settings.defaultSplit} detail={m.settings.defaultSplitDetail} icon={{ name: 'swap', fg: color.partnerText, bg: color.partnerTint }}>
        <DefaultSplitChoice couple={couple} onSave={(input) => save('split', input)} />
        <Status status={status} section="split" />
      </Card>

      <Card title={m.settings.currency} icon={{ name: 'cash', fg: categories.transporte.color, bg: categories.transporte.tint }}>
        <View style={styles.row} accessibilityRole="radiogroup">
          {CURRENCIES.map((c) => (
            <Chip key={c} label={c} selected={couple.currency === c} disabled={hasMoney} onPress={() => save('currency', { currency: c })} />
          ))}
        </View>
        <Hint>
          {hasMoney
            ? m.settings.currencyLocked
            : m.settings.currencyFree}
        </Hint>
        <Status status={status} section="currency" />
      </Card>

      <AppearanceCard />

      <LanguageCard />

      <Card title={m.settings.reminders} badge={m.settings.soon} icon={{ name: 'bell', fg: categories.otros.color, bg: categories.otros.tint }}>
        <Coming title={m.settings.settleReminder} detail={m.settings.settleReminderDetail} />
        <Coming title={m.settings.newExpenseAlert} detail={m.settings.newExpenseAlertDetail(couple.partner.name)} />
      </Card>

      {DEV_BYPASS_AUTH && <DevPlanCard />}

      <Card title={m.settings.legal} icon={{ name: 'doc', fg: categories.otros.color, bg: categories.otros.tint }}>
        <NavButton label={m.terms.title} kind="secondary" href="/terms" />
        <NavButton label={m.privacy.title} kind="secondary" href="/privacy" />
      </Card>

      <SignOut email={email} />
    </Screen>
  );
}

/**
 * Mitad y mitad, a preset (70 / 30 … 30 / 70, read as "Tú / Ana"), or Otra: any whole share typed by hand.
 * Each person sets their own share; the partner sees the complement.
 */
function DefaultSplitChoice({ couple, onSave }: { couple: Couple; onSave: (input: CoupleSettingsInput) => void }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const isPct = couple.defaultSplit === 'pct';
  const mine = couple.myDefaultPct;
  const isPreset = isPct && (DEFAULT_PCT_PRESETS as readonly number[]).includes(mine);
  const [typing, setTyping] = useState(isPct && !isPreset);
  const [text, setText] = useState(isPct && !isPreset ? String(mine) : '');
  const typed = parseSharePct(text);
  const canSave = typed !== null && !(isPct && typed === mine);

  const choose = (pct: number) => {
    setTyping(false);
    onSave({ defaultSplit: 'pct', myPct: pct });
  };
  const saveTyped = () => {
    if (typed === null) return;
    onSave({ defaultSplit: 'pct', myPct: typed });
  };

  return (
    <View style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }} accessibilityRole="radiogroup">
        <Chip
          label={m.settings.half}
          selected={!isPct && !typing}
          onPress={() => {
            setTyping(false);
            onSave({ defaultSplit: 'half' });
          }}
        />
      </View>

      <Text style={[type.label, { color: color.textSecondary }]}>{m.settings.proportional(couple.partner.name)}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }} accessibilityRole="radiogroup">
        {DEFAULT_PCT_PRESETS.map((p) => (
          <Chip key={p} label={`${p} / ${100 - p}`} selected={isPct && mine === p && !typing} onPress={() => choose(p)} />
        ))}
        <Chip label={m.settings.other} selected={typing} onPress={() => setTyping(true)} />
      </View>

      {typing && (
        <View style={{ gap: space[3] }}>
          <TextField
            label={m.settings.yourShare}
            value={text}
            onChangeText={(t) => setText(t.replace(/[^\d]/g, '').slice(0, 2))}
            placeholder={m.settings.yourSharePlaceholder}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            returnKeyType="done"
            onSubmitEditing={saveTyped}
            autoFocus={!isPct || isPreset}
            hint={typed !== null ? shareLabel(typed, couple.partner.name, m) : m.settings.shareRange(DEFAULT_PCT_MIN, DEFAULT_PCT_MAX)}
            error={text !== '' && typed === null ? m.settings.shareInvalid(DEFAULT_PCT_MIN, DEFAULT_PCT_MAX) : null}
          />
          <NavButton label={typed === null ? m.settings.save : isPct && typed === mine ? m.settings.inUse : m.settings.use(shareLabel(typed, couple.partner.name, m))} kind="secondary" onPress={saveTyped} disabled={!canSave} />
        </View>
      )}

      <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]} accessibilityLiveRegion="polite">
        {isPct ? m.settings.newStartsWith(shareLabel(mine, couple.partner.name, m)) : m.settings.newStartsHalf}
      </Text>
    </View>
  );
}

/** Automático follows the phone; Claro / Oscuro stay on this phone only (not shared with the partner). */
function AppearanceCard() {
  const { m } = useI18n();
  const { preference, setPreference, categories } = useTheme();
  const options: { id: AppearancePreference; label: string; icon: IconName }[] = [
    { id: 'system', label: m.settings.automatic, icon: 'contrast' },
    { id: 'light', label: m.settings.light, icon: 'sun' },
    { id: 'dark', label: m.settings.dark, icon: 'moon' },
  ];
  return (
    <Card title={m.settings.appearance} detail={m.settings.appearanceDetail} icon={{ name: 'contrast', fg: categories.ocio.color, bg: categories.ocio.tint }}>
      <Segmented label={m.settings.appearance} options={options} value={preference} onChange={setPreference} />
    </Card>
  );
}

/** Automático follows the phone's language; the others stay on this phone. Each language is named in itself. */
function LanguageCard() {
  const { m, preference, setPreference } = useI18n();
  const { color } = useTheme();
  const options: { id: LanguagePreference; label: string }[] = [
    { id: 'system', label: m.settings.automatic },
    ...LANGUAGES.map((l) => ({ id: l, label: messages[l].language.name })),
  ];
  return (
    <Card title={m.settings.language} detail={m.settings.languageDetail} icon={{ name: 'globe', fg: color.me, bg: color.meTint }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }} accessibilityRole="radiogroup">
        {options.map((o) => (
          <Chip key={o.id} label={o.label} selected={preference === o.id} onPress={() => setPreference(o.id)} />
        ))}
      </View>
    </Card>
  );
}

/** Ajustes' top card: you (opens Tu perfil), and the partner, or the couple code while they haven't joined. */
function ProfileHeader({ couple, email, code }: { couple: Couple; email: string | null; code: string | null }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const openProfile = () => router.push('/profile');
  return (
    <View style={styles.card}>
      <View style={styles.profileRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={m.settings.changeAvatarA11y} onPress={openProfile} style={({ pressed }) => [styles.profileAvatar, pressed && { opacity: 0.7 }]}>
          <Avatar name={couple.me.name} isMe avatar={couple.me.avatar} size={64} />
          <View style={styles.editBadge}>
            <Icon name="edit" size={12} color={color.onPrimary} />
          </View>
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.heading} numberOfLines={1} accessibilityRole="header">
            {couple.me.name}
          </Text>
          {email && (
            <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body, fontSize: 14 }]} numberOfLines={1}>
              {email}
            </Text>
          )}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={m.settings.editProfileA11y} onPress={openProfile} style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.7 }]}>
          <Text style={[type.label, { fontFamily: font.bodyBold, fontSize: 14 }]}>{m.settings.edit}</Text>
        </Pressable>
      </View>
      {couple.partnerJoined ? (
        <View style={styles.partnerRow}>
          <Avatar name={couple.partner.name} isMe={false} avatar={couple.partner.avatar} size={36} />
          <Text style={[type.row, { flex: 1 }]} numberOfLines={1}>
            {m.settings.sharingWith(couple.partner.name)}
          </Text>
        </View>
      ) : (
        <CoupleCode partnerJoined={false} partnerName={couple.partner.name} code={code} />
      )}
    </View>
  );
}

function CoupleCode({ partnerJoined, partnerName, code }: { partnerJoined: boolean; partnerName: string; code: string | null }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (partnerJoined) {
    return (
      <View style={styles.codeBox}>
        <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>{m.settings.coupleCode}</Text>
        <Text style={type.body}>{m.settings.partnerJoinedNoCode(partnerName)}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.codeBox, styles.codeRow]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>{m.settings.coupleCode}</Text>
        {code ? (
          <Text style={styles.code} accessibilityLabel={m.settings.codeA11y(code.split('').join(' '))}>
            {code}
          </Text>
        ) : (
          <Text style={type.body}>{m.settings.codeExpired}</Text>
        )}
        <TextLink label={code ? m.settings.share : m.settings.newCode} onPress={() => router.push('/invite')} />
      </View>
      {code && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? m.settings.copied : m.settings.copyCode}
          onPress={async () => {
            await Clipboard.setStringAsync(code);
            setCopied(true);
          }}
          style={styles.copy}
        >
          <Icon name={copied ? 'check' : 'copy'} size={20} color={color.ink} />
        </Pressable>
      )}
    </View>
  );
}

/** Cerrar sesión asks once more, so a stray tap doesn't sign the person out. */
function SignOut({ email }: { email: string | null }) {
  const { m } = useI18n();
  const { type, categories } = useTheme();
  const styles = useStyles();
  const setHousehold = useSessionStore((s) => s.setHousehold);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    if (DEV_BYPASS_AUTH) setHousehold(null);
    else await endSession();
    router.replace('/welcome');
  };

  return (
    <Card title={m.settings.account} detail={email ? m.settings.signedInAs(email) : undefined} icon={{ name: 'user', fg: categories.otros.color, bg: categories.otros.tint }}>
      {confirming ? (
        <View style={{ gap: space[3] }}>
          <Text style={type.body}>{m.settings.signOutConfirm}</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <NavButton label={m.settings.cancel} kind="secondary" onPress={() => setConfirming(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <NavButton label={m.settings.signOut} onPress={signOut} loading={busy} />
            </View>
          </View>
        </View>
      ) : (
        <>
          <NavButton label={m.settings.signOut} kind="secondary" onPress={() => setConfirming(true)} />
          <NavButton label={m.settings.deleteAccount} kind="secondary" href="/delete-account" />
        </>
      )}
    </Card>
  );
}

/**
 * Tu plan: Free with the way to Premium, or Premium with who pays and until when. Only the payer manages the store
 * subscription (the store only lets them); the partner is told who does. Restaurar compras for everyone.
 */
function PlanCard({ partnerName }: { partnerName: string }) {
  const { m, d } = useI18n();
  const { color, type, categories } = useTheme();
  const icon: CardIcon = { name: 'crown', fg: categories.servicios.color, bg: categories.servicios.tint };
  const plan = usePlan();
  const restore = useRestorePurchases();
  const [note, setNote] = useState<string | null>(null);
  if (!plan.data) return null;

  const { info } = plan;
  const line = planLine(info);
  // Renewals are often a year away: always with the year, "23 oct 2027" (the PDF's format).
  const day = (iso: string) => m.exportData.pdf.dateWithYear(d.shortDate(iso), Number(iso.slice(0, 4)));
  const manage = async () => {
    setNote(null);
    if (!(await manageSubscriptions())) setNote(m.settings.noStorePage);
  };
  const restorePurchases = () => {
    setNote(null);
    restore.mutate(undefined, {
      onSuccess: (now) => setNote(now.plan === 'premium' ? null : m.paywall.restoreNone),
      onError: () => setNote(m.paywall.restoreFailed),
    });
  };
  const restoreLink = <TextLink label={m.paywall.restore} onPress={restorePurchases} disabled={restore.isPending} />;
  const noteLine = note && (
    <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]} accessibilityLiveRegion="polite">
      {note}
    </Text>
  );

  if (line.kind === 'free') {
    return (
      <Card title={m.settings.planTitle} icon={icon}>
        <View style={{ gap: 2 }}>
          <Text style={[type.row, { fontFamily: font.bodyBold }]}>{m.settings.planFree}</Text>
          <Hint>{m.settings.planFreeDetail}</Hint>
        </View>
        <NavButton label={m.premium.see} kind="secondary" onPress={() => openPaywall()} />
        {restoreLink}
        {noteLine}
      </Card>
    );
  }

  const date =
    line.kind === 'lifetime' ? m.settings.lifetime
    : line.kind === 'renews' ? m.settings.renews(day(line.date))
    : line.kind === 'ends' ? m.settings.ends(day(line.date))
    : m.settings.trialEnds(day(line.date));
  return (
    <Card title={m.settings.planTitle} icon={icon}>
      <View style={{ gap: 2 }}>
        <Text style={[type.row, { fontFamily: font.bodyBold }]}>{m.settings.planPremium}</Text>
        <Hint>{info.isPayer ? m.settings.payerYou : m.settings.payerPartner(partnerName)}</Hint>
        {info.status !== 'billing_issue' && <Hint>{date}</Hint>}
      </View>
      {info.status === 'billing_issue' && line.kind === 'ends' && (
        <Callout icon="bell" tone="neutral">
          {m.settings.billingIssue(day(line.date))}
        </Callout>
      )}
      {info.isPayer ? (
        <NavButton label={info.status === 'billing_issue' ? m.settings.fixPayment : m.settings.manage} kind="secondary" onPress={manage} />
      ) : (
        <Hint>{m.settings.managedBy(partnerName)}</Hint>
      )}
      {restoreLink}
      {noteLine}
    </Card>
  );
}

/** Sample data only: switch the couple between Free and Premium to check every gated screen. */
function DevPlanCard() {
  const { m } = useI18n();
  const client = useQueryClient();
  const styles = useStyles();
  const { info } = usePlan();
  const pick = (plan: 'free' | 'premium') => {
    setSamplePlan(plan);
    client.invalidateQueries({ queryKey: planKey });
  };
  return (
    <Card title={m.premium.devPlan}>
      <View style={styles.row} accessibilityRole="radiogroup">
        <Chip label={m.premium.devFree} selected={info.plan === 'free'} onPress={() => pick('free')} />
        <Chip label={m.premium.devPremium} selected={info.plan === 'premium'} onPress={() => pick('premium')} />
      </View>
    </Card>
  );
}

/** An icon on its tile: pairs checked at 3:1 in tokens.test.ts (category and avatar tiles). */
type CardIcon = { name: IconName; fg: string; bg: string };

function Card({ title, detail, badge, icon, children }: { title: string; detail?: string; badge?: string; icon?: CardIcon; children?: ReactNode }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        {icon && (
          <View style={[styles.cardIcon, { backgroundColor: icon.bg }]}>
            <Icon name={icon.name} size={20} color={icon.fg} />
          </View>
        )}
        <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 17, flex: 1 }]} accessibilityRole="header">
          {title}
        </Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={[type.effect, { color: color.textSecondary }]}>{badge}</Text>
          </View>
        )}
      </View>
      {detail && <Text style={[type.body, { color: color.textSecondary, fontSize: 15, marginTop: -space[2] }]}>{detail}</Text>}
      {children}
    </View>
  );
}

function Coming({ title, detail }: { title: string; detail: string }) {
  const { color, type } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text style={[type.row, { color: color.textSecondary }]}>{title}</Text>
      <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>{detail}</Text>
    </View>
  );
}

function Hint({ children }: { children: ReactNode }) {
  const { color, type } = useTheme();
  return <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>{children}</Text>;
}

function Status({ status, section }: { status: { section: Section; error?: string } | null; section: Section }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  if (status?.section !== section) return null;
  return (
    <Text style={[type.label, { color: status.error ? color.negative : color.textSecondary }]} accessibilityLiveRegion="polite">
      {status.error ?? m.settings.saved}
    </Text>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, padding: space[4], gap: space[3] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  codeBox: { backgroundColor: color.background, borderRadius: radius.option, padding: space[4], gap: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  code: { fontFamily: font.display, fontSize: 24, letterSpacing: 6, color: color.ink },
  copy: { width: touch + 4, height: touch + 4, borderRadius: (touch + 4) / 2, borderWidth: 1, borderColor: color.fieldBorder, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.neutralTint },
  cardIcon: { width: 36, height: 36, borderRadius: radius.tile - 2, alignItems: 'center', justifyContent: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  profileAvatar: { minWidth: touch, minHeight: touch },
  editBadge: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: color.ink, borderWidth: 3, borderColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  editButton: { minHeight: touch, minWidth: touch, paddingHorizontal: space[4], borderRadius: radius.pill, borderWidth: 1, borderColor: color.fieldBorder, alignItems: 'center', justifyContent: 'center' },
  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: touch, paddingTop: space[3], borderTopWidth: 1, borderTopColor: color.line },
}));
