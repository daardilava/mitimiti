import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { joinErrorMessage, useJoinHousehold } from '@/api/household';
import { joinCodeStatus, normalizeJoinCode, JOIN_CODE_LENGTH } from '@/lib/joinCode';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { TextField } from '@/ui/Form';
import { NavButton, Screen } from '@/ui/Screen';
import { font, radius } from '@/ui/tokens';

// 04 · Unirse con código
export default function Join() {
  const signedIn = useSessionStore((s) => s.userId !== null) || DEV_BYPASS_AUTH;
  const join = useJoinHousehold();
  const [code, setCode] = useState('');

  if (!signedIn) return <Redirect href={{ pathname: '/sign-in', params: { next: 'join' } }} />;

  const status = joinCodeStatus(code);
  const hint =
    status.kind === 'incomplete'
      ? `Faltan ${status.missing} ${status.missing === 1 ? 'carácter' : 'caracteres'}`
      : status.kind === 'ready'
        ? 'Listo'
        : undefined;
  const error = status.kind === 'ambiguous' ? 'Los códigos no llevan 0, O, 1 ni I. Revisa esa letra.' : join.isError ? joinErrorMessage(join.error) : null;

  const onChange = (text: string) => {
    setCode(normalizeJoinCode(text));
    if (join.isError) join.reset();
  };

  return (
    <Screen
      title="Únete a tu pareja"
      lead="Pídele el código de 6 caracteres que aparece en su app, en Ajustes › Código de pareja."
      back="back"
      footer={<NavButton label="Unirme" onPress={() => join.mutate(code)} disabled={status.kind !== 'ready'} loading={join.isPending} />}
    >
      <TextField
        label="Código de invitación"
        value={code}
        onChangeText={onChange}
        placeholder="Ej. AM482X"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        maxLength={JOIN_CODE_LENGTH + 4}
        returnKeyType="go"
        onSubmitEditing={() => status.kind === 'ready' && join.mutate(code)}
        hint={hint}
        error={error}
        style={styles.code}
        autoFocus
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { height: 64, fontFamily: font.display, fontSize: 28, letterSpacing: 8, textAlign: 'center', borderRadius: radius.option },
});
