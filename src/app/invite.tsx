import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useHousehold, useRegenerateJoinCode } from '@/api/household';
import { isoDate } from '@/lib/dates';
import { Callout } from '@/ui/Form';
import { Icon, type IconName } from '@/ui/Icon';
import { Loading, NavButton, Screen } from '@/ui/Screen';
import { font, radius, space } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// 03 · Invitar a la pareja. Right after Create account (?from=setup) and from Ajustes › Código de pareja.
export default function Invite() {
  const { m, d } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const onboarding = from === 'setup';
  const household = useHousehold();
  const regenerate = useRegenerateJoinCode();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!household.data) return <Loading title={m.invite.title} error={household.error} />;

  const h = household.data;
  const partnerJoined = h.members.length >= 2;
  const partner = h.members.find((x) => x.role !== 'owner')?.displayName || h.invitedName || m.people.yourPartnerInSentence;
  const expired = !h.joinCode || (h.joinCodeExpiresAt !== null && new Date(h.joinCodeExpiresAt) < new Date());

  // Onboarding has nothing to go back to: the account exists now.
  const back = onboarding ? undefined : 'back';
  const footer = onboarding ? <NavButton label={m.invite.goToApp} onPress={() => router.replace('/')} /> : undefined;

  if (partnerJoined) {
    return (
      <Screen title={m.invite.joinedTitle(partner)} lead={m.invite.joinedLead} back={back} footer={footer} />
    );
  }

  const code = h.joinCode ?? '';
  const until = h.joinCodeExpiresAt ? d.shortDate(isoDate(new Date(h.joinCodeExpiresAt))) : null;
  const message = m.invite.shareMessage(code, until);
  const share = () => Share.share({ message });
  // Straight into WhatsApp's chat picker; without WhatsApp (openURL rejects), the system share sheet instead.
  const whatsapp = () => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`).catch(share);

  return (
    <Screen
      title={m.invite.inviteTitle(partner)}
      step={onboarding ? m.invite.step : undefined}
      lead={m.invite.lead(partner)}
      back={back}
      footer={footer}
    >
      {expired ? (
        <>
          <Callout icon="bell" tone="neutral">
            {m.invite.expired}
          </Callout>
          <NavButton label={m.invite.regenerate} onPress={() => regenerate.mutate()} loading={regenerate.isPending} />
          {regenerate.isError && <Text style={[type.label, { color: color.negative }]}>{m.invite.regenerateFailed}</Text>}
        </>
      ) : (
        <>
          <View style={styles.code} accessible accessibilityLabel={m.invite.codeA11y(code.split('').join(' '))}>
            {code.split('').map((c, i) => (
              <View key={i} style={styles.box}>
                <Text style={styles.char}>{c}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="chat" label={m.invite.whatsapp} onPress={whatsapp} />
          </View>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <IconButton icon={copied ? 'check' : 'copy'} label={copied ? m.invite.copied : m.invite.copy} onPress={async () => { await Clipboard.setStringAsync(code); setCopied(true); }} />
            <IconButton icon="share" label={m.invite.share} onPress={share} />
          </View>
          {until && (
            <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>
              {m.invite.validUntil(until)}
            </Text>
          )}
        </>
      )}
      {onboarding && (
        <Callout icon="bell">
          {m.invite.meanwhile(partner)}
        </Callout>
      )}
    </Screen>
  );
}

function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Icon name={icon} size={20} color={color.ink} />
      <Text style={[type.row, { fontFamily: font.bodyBold }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  code: { flexDirection: 'row', gap: space[2] },
  box: {
    flex: 1,
    aspectRatio: 0.8,
    maxHeight: 76,
    borderRadius: radius.option,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  char: { fontFamily: font.display, fontSize: 30, color: color.ink },
  iconButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    gap: space[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    backgroundColor: color.surface,
  },
}));
