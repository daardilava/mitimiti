import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { joinErrorMessage, useJoinHousehold } from '@/api/household';
import { joinCodeStatus, normalizeJoinCode, JOIN_CODE_LENGTH } from '@/lib/joinCode';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { TextLink } from '@/ui/Auth';
import { TextField } from '@/ui/Form';
import { NavButton, Screen } from '@/ui/Screen';
import { font, radius } from '@/ui/tokens';
import { useI18n } from '@/i18n';

// 04 · Unirse con código
export default function Join() {
  const { m } = useI18n();
  const signedIn = useSessionStore((s) => s.userId !== null) || DEV_BYPASS_AUTH;
  const join = useJoinHousehold();
  const [code, setCode] = useState('');

  if (!signedIn) return <Redirect href={{ pathname: '/sign-in', params: { next: 'join' } }} />;

  const status = joinCodeStatus(code);
  const hint =
    status.kind === 'incomplete'
      ? m.join.missing(status.missing)
      : status.kind === 'ready'
        ? m.join.ready
        : undefined;
  const error = status.kind === 'ambiguous' ? m.join.ambiguous : join.isError ? joinErrorMessage(join.error, m) : null;

  const onChange = (text: string) => {
    setCode(normalizeJoinCode(text));
    if (join.isError) join.reset();
  };

  return (
    <Screen
      title={m.join.title}
      lead={m.join.lead}
      back="back"
      footer={<NavButton label={m.join.submit} onPress={() => join.mutate(code)} disabled={status.kind !== 'ready'} loading={join.isPending} />}
    >
      <TextField
        label={m.join.label}
        value={code}
        onChangeText={onChange}
        placeholder={m.join.placeholder}
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
      {/* No code after all: start the couple instead. */}
      <TextLink label={m.welcome.create} onPress={() => router.replace('/setup')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { height: 64, fontFamily: font.display, fontSize: 28, letterSpacing: 8, textAlign: 'center', borderRadius: radius.option },
});
