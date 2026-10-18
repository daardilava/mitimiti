import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useHousehold, useRegenerateJoinCode } from '@/api/household';
import { isoDate, shortDate } from '@/lib/dates';
import { Callout } from '@/ui/Form';
import { Icon, type IconName } from '@/ui/Icon';
import { Loading, NavButton, Screen } from '@/ui/Screen';
import { color, font, radius, space, type } from '@/ui/tokens';

// 03 · Invitar a la pareja. Right after Create account (?from=setup) and from Ajustes › Código de pareja.
export default function Invite() {
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

  if (!household.data) return <Loading title="Código de pareja" error={household.error} />;

  const h = household.data;
  const partnerJoined = h.members.length >= 2;
  const partner = h.members.find((m) => m.role !== 'owner')?.displayName || h.invitedName || 'tu pareja';
  const expired = !h.joinCode || (h.joinCodeExpiresAt !== null && new Date(h.joinCodeExpiresAt) < new Date());

  // Onboarding has nothing to go back to: the account exists now.
  const back = onboarding ? undefined : 'back';
  const footer = onboarding ? <NavButton label="Ir a la app" onPress={() => router.replace('/')} /> : undefined;

  if (partnerJoined) {
    return (
      <Screen title={`${partner} ya se unió`} lead="Los dos ven los mismos gastos y el mismo saldo. Ya no hace falta un código." back={back} footer={footer} />
    );
  }

  const code = h.joinCode ?? '';
  const share = () =>
    Share.share({ message: `Únete a nuestra cuenta en a medias. Abre la app, toca "Tengo un código de invitación" y escribe: ${code}` });

  return (
    <Screen
      title={`Invita a ${partner}`}
      step={onboarding ? 'Paso 2 de 2' : undefined}
      lead={`Comparte este código. Cuando ${partner} lo escriba en su app, los dos verán los mismos gastos y el mismo saldo.`}
      back={back}
      footer={footer}
    >
      {expired ? (
        <>
          <Callout icon="bell" tone="neutral">
            El código venció. Genera uno nuevo y compártelo; dura 7 días.
          </Callout>
          <NavButton label="Generar un código nuevo" onPress={() => regenerate.mutate()} loading={regenerate.isPending} />
          {regenerate.isError && <Text style={[type.label, { color: color.negative }]}>No se pudo generar. Revisa tu conexión.</Text>}
        </>
      ) : (
        <>
          <View style={styles.code} accessible accessibilityLabel={`Código: ${code.split('').join(' ')}`}>
            {code.split('').map((c, i) => (
              <View key={i} style={styles.box}>
                <Text style={styles.char}>{c}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <IconButton icon={copied ? 'check' : 'copy'} label={copied ? 'Copiado' : 'Copiar'} onPress={async () => { await Clipboard.setStringAsync(code); setCopied(true); }} />
            <IconButton icon="share" label="Compartir" onPress={share} />
          </View>
          {h.joinCodeExpiresAt && (
            <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]}>
              Vale hasta el {shortDate(isoDate(new Date(h.joinCodeExpiresAt)))}.
            </Text>
          )}
        </>
      )}
      {onboarding && (
        <Callout icon="bell">
          Mientras tanto ya puedes registrar gastos. {partner} los verá en cuanto se una.
        </Callout>
      )}
    </Screen>
  );
}

function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Icon name={icon} size={20} color={color.ink} />
      <Text style={[type.row, { fontFamily: font.bodyBold }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
