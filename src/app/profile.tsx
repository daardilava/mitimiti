import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { coupleKey, useCouple, type Couple } from '@/api/expenses';
import { useUpdateCoupleSettings, type CoupleSettingsInput } from '@/api/household';
import { AVATAR_IDS, type AvatarId } from '@/lib/avatars';
import { settingsErrorMessage } from '@/lib/coupleSettings';
import { Avatar } from '@/ui/Avatar';
import { TextField } from '@/ui/Form';
import { Icon } from '@/ui/Icon';
import { Pending, Screen } from '@/ui/Screen';
import { font, radius, space } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

type Section = 'avatar' | 'names';

// 13a · Tu perfil, from Ajustes (the avatar or Editar): the avatar and the names. Each change saves on its own, as it
// did inside Ajustes: the avatar on tap, a name when its field loses focus.
export default function Profile() {
  const { m } = useI18n();
  const client = useQueryClient();
  const couple = useCouple();
  if (!couple.data) {
    return (
      <Screen title={m.settings.profileTitle} back="back">
        <Pending failed={couple.isError} onRetry={() => client.invalidateQueries({ queryKey: coupleKey })} />
      </Screen>
    );
  }
  return <ProfileForm couple={couple.data} />;
}

function ProfileForm({ couple }: { couple: Couple }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const update = useUpdateCoupleSettings();
  const [status, setStatus] = useState<{ section: Section; error?: string } | null>(null);

  const save = (section: Section, input: CoupleSettingsInput) =>
    update.mutate(input, {
      onSuccess: () => setStatus({ section }),
      onError: (e) => setStatus({ section, error: settingsErrorMessage(e, m) }),
    });

  return (
    <Screen title={m.settings.profileTitle} back="back">
      <View style={styles.card}>
        <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 17 }]} accessibilityRole="header">
          {m.settings.avatar}
        </Text>
        <Text style={[type.body, { color: color.textSecondary, fontSize: 15, marginTop: -space[2] }]}>{m.settings.avatarDetail(couple.partner.name)}</Text>
        {/* Keyed on the saved avatar, so a failed save falls back to it once the couple refetches. */}
        <AvatarChoice key={couple.me.avatar ?? 'initial'} me={couple.me} onSave={(avatar) => save('avatar', { avatar })} />
        <Status status={status} section="avatar" />
      </View>

      <View style={styles.card}>
        <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 17 }]} accessibilityRole="header">
          {m.settings.you}
        </Text>
        {/* Keyed on the saved names: when they change elsewhere (the partner renames themselves), the fields follow. */}
        <NameFields key={`${couple.me.name}|${couple.partner.name}`} couple={couple} onSave={(input) => save('names', input)} />
        {couple.partnerJoined && <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>{m.settings.partnerRenames(couple.partner.name)}</Text>}
        <Status status={status} section="names" />
      </View>
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
  avatarPreview: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  // 56 px art inside a 3 px ring, with room for it: 68 × 68, well over the 44 px touch target.
  avatarOption: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  avatarOptionSelected: { borderColor: color.ink },
  avatarCheck: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: color.ink, borderWidth: 2, borderColor: color.surface, alignItems: 'center', justifyContent: 'center' },
}));
