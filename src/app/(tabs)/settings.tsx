import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { signOut as endSession } from '@/api/auth';
import { useSettlements } from '@/api/balance';
import { coupleKey, useCouple, useExpenses, type Couple } from '@/api/expenses';
import { householdKey, useHousehold, useUpdateCoupleSettings, type CoupleSettingsInput } from '@/api/household';
import { AVATAR_IDS, type AvatarId } from '@/lib/avatars';
import { DEFAULT_PCT_MAX, DEFAULT_PCT_MIN, DEFAULT_PCT_PRESETS, parseSharePct, settingsErrorMessage, shareLabel } from '@/lib/coupleSettings';
import { CURRENCIES } from '@/lib/money';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { TextLink } from '@/ui/Auth';
import { Avatar } from '@/ui/Avatar';
import { Chip, TextField } from '@/ui/Form';
import { Icon } from '@/ui/Icon';
import { NavButton, Pending, Screen } from '@/ui/Screen';
import { font, radius, space, touch } from '@/ui/tokens';
import { makeStyles, useTheme, type AppearancePreference } from '@/ui/theme';
import { LANGUAGES, messages, useI18n, type LanguagePreference } from '@/i18n';

type Section = 'avatar' | 'names' | 'split' | 'currency';

// 13 · Ajustes: avatar, names, couple code, default split, currency, what is coming (reminders, CSV) and sign-out.
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
      <Card title={m.settings.avatar} detail={m.settings.avatarDetail(couple.partner.name)}>
        {/* Keyed on the saved avatar, so a failed save falls back to it once the couple refetches. */}
        <AvatarChoice key={couple.me.avatar ?? 'initial'} me={couple.me} onSave={(avatar) => save('avatar', { avatar })} />
        <Status status={status} section="avatar" />
      </Card>

      <Card title={m.settings.you}>
        {/* Keyed on the saved names: when they change elsewhere (the partner renames themselves), the fields follow. */}
        <NameFields key={`${couple.me.name}|${couple.partner.name}`} couple={couple} onSave={(input) => save('names', input)} />
        {couple.partnerJoined && <Hint>{m.settings.partnerRenames(couple.partner.name)}</Hint>}
        <Status status={status} section="names" />

        <CoupleCode partnerJoined={couple.partnerJoined} partnerName={couple.partner.name} code={expired ? null : joinCode} />
      </Card>

      <Card title={m.settings.defaultSplit} detail={m.settings.defaultSplitDetail}>
        <DefaultSplitChoice couple={couple} onSave={(input) => save('split', input)} />
        <Status status={status} section="split" />
      </Card>

      <Card title={m.settings.currency}>
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

      <Card title={m.settings.reminders} badge={m.settings.soon}>
        <Coming title={m.settings.settleReminder} detail={m.settings.settleReminderDetail} />
        <Coming title={m.settings.newExpenseAlert} detail={m.settings.newExpenseAlertDetail(couple.partner.name)} />
      </Card>

      <Card title={m.settings.exportCsv} badge={m.settings.soon} detail={m.settings.exportCsvDetail} />

      <SignOut email={email} />
    </Screen>
  );
}

/** A grid of characters, Duolingo style, plus the initial. The pick shows at once and saves on tap. */
function AvatarChoice({ me, onSave }: { me: Couple['me']; onSave: (avatar: AvatarId | null) => void }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const [picked, setPicked] = useState<AvatarId | null>(me.avatar);

  const pick = (avatar: AvatarId | null) => {
    if (avatar === picked) return;
    setPicked(avatar);
    onSave(avatar);
  };
  const options: (AvatarId | null)[] = [null, ...AVATAR_IDS];

  return (
    <View style={{ gap: space[4] }}>
      <View style={styles.avatarPreview}>
        <Avatar name={me.name} isMe avatar={picked} size={72} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.row, { fontFamily: font.bodyBold }]} numberOfLines={1}>
            {me.name}
          </Text>
          <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>{picked ? m.avatars[picked] : m.settings.avatarInitial}</Text>
        </View>
      </View>
      <View style={styles.avatarGrid} accessibilityRole="radiogroup">
        {options.map((id) => {
          const selected = picked === id;
          const label = id ? m.avatars[id] : m.settings.avatarInitial;
          return (
            <Pressable
              key={id ?? 'initial'}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={m.settings.avatarA11y(label)}
              onPress={() => pick(id)}
              style={({ pressed }) => [styles.avatarOption, selected && styles.avatarOptionSelected, pressed && { opacity: 0.7 }]}
            >
              <Avatar name={me.name} isMe avatar={id} size={56} />
              {selected && (
                <View style={styles.avatarCheck}>
                  <Icon name="check" size={14} color={color.onPrimary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
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
  const { preference, setPreference } = useTheme();
  const options: { id: AppearancePreference; label: string }[] = [
    { id: 'system', label: m.settings.automatic },
    { id: 'light', label: m.settings.light },
    { id: 'dark', label: m.settings.dark },
  ];
  return (
    <Card title={m.settings.appearance} detail={m.settings.appearanceDetail}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }} accessibilityRole="radiogroup">
        {options.map((o) => (
          <Chip key={o.id} label={o.label} selected={preference === o.id} onPress={() => setPreference(o.id)} />
        ))}
      </View>
    </Card>
  );
}

/** Automático follows the phone's language; the others stay on this phone. Each language is named in itself. */
function LanguageCard() {
  const { m, preference, setPreference } = useI18n();
  const options: { id: LanguagePreference; label: string }[] = [
    { id: 'system', label: m.settings.automatic },
    ...LANGUAGES.map((l) => ({ id: l, label: messages[l].language.name })),
  ];
  return (
    <Card title={m.settings.language} detail={m.settings.languageDetail}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }} accessibilityRole="radiogroup">
        {options.map((o) => (
          <Chip key={o.id} label={o.label} selected={preference === o.id} onPress={() => setPreference(o.id)} />
        ))}
      </View>
    </Card>
  );
}

/** Saves when a field loses focus, and only what changed. */
function NameFields({ couple, onSave }: { couple: Couple; onSave: (input: CoupleSettingsInput) => void }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const [myName, setMyName] = useState(couple.me.name);
  const [partnerName, setPartnerName] = useState(couple.partner.name);

  const saveNames = () => {
    const input: CoupleSettingsInput = {};
    if (myName.trim() !== couple.me.name) input.myName = myName;
    if (!couple.partnerJoined && partnerName.trim() !== couple.partner.name) input.partnerName = partnerName;
    if (Object.keys(input).length > 0) onSave(input);
  };

  return (
    <View style={styles.names}>
      <View style={{ flex: 1 }}>
        <TextField label={m.settings.myName} value={myName} onChangeText={setMyName} onBlur={saveNames} autoCapitalize="words" maxLength={40} returnKeyType="done" />
      </View>
      <View style={{ flex: 1 }}>
        {couple.partnerJoined ? (
          <View style={{ gap: space[2] }}>
            <Text style={[type.label, { color: color.textSecondary }]}>{m.settings.partner}</Text>
            <View style={styles.readOnly}>
              <Text style={type.body} numberOfLines={1}>
                {couple.partner.name}
              </Text>
            </View>
          </View>
        ) : (
          <TextField label={m.settings.partner} value={partnerName} onChangeText={setPartnerName} onBlur={saveNames} autoCapitalize="words" maxLength={40} returnKeyType="done" />
        )}
      </View>
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
  const { type } = useTheme();
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
    <Card title={m.settings.account} detail={email ? m.settings.signedInAs(email) : undefined}>
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
        <NavButton label={m.settings.signOut} kind="secondary" onPress={() => setConfirming(true)} />
      )}
    </Card>
  );
}

function Card({ title, detail, badge, children }: { title: string; detail?: string; badge?: string; children?: ReactNode }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
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
  names: { flexDirection: 'row', gap: space[3] },
  readOnly: { height: 52, borderRadius: radius.control, backgroundColor: color.background, paddingHorizontal: space[4], justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  codeBox: { backgroundColor: color.background, borderRadius: radius.option, padding: space[4], gap: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  code: { fontFamily: font.display, fontSize: 24, letterSpacing: 6, color: color.ink },
  copy: { width: touch + 4, height: touch + 4, borderRadius: (touch + 4) / 2, borderWidth: 1, borderColor: color.fieldBorder, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  avatarPreview: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  // 56 px art inside a 3 px ring, with room for it: 68 × 68, well over the 44 px touch target.
  avatarOption: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  avatarOptionSelected: { borderColor: color.ink },
  avatarCheck: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: color.ink, borderWidth: 2, borderColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.neutralTint },
}));
