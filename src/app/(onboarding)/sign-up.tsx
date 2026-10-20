import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { authErrorMessage, usePasswordSignUp } from '@/api/auth';
import { canSignUp, normalizeEmail, PASSWORD_MIN } from '@/lib/authFlow';
import { useContinueAfterSignIn, type NextStep } from '@/lib/session';
import { CodeStep, SocialButtons, SwitchAuth } from '@/ui/Auth';
import { Checkbox, PasswordField, TextField } from '@/ui/Form';
import { NavButton, Screen } from '@/ui/Screen';
import { font, space } from '@/ui/tokens';
import { useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// Crea tu cuenta · name, email and password (then a code by email), or Google / Apple. Before 02 and 04.
export default function SignUp() {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const { next } = useLocalSearchParams<{ next?: NextStep }>();
  useContinueAfterSignIn(next);
  const signUp = usePasswordSignUp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const input = { fullName, email, password, acceptedTerms };
  const valid = canSignUp(input);
  const params = next ? { next } : {};
  const edit = (set: (v: string) => void) => (v: string) => { set(v); setError(null); };

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signUp.start(input);
      setVerifying(true);
    } catch (e) {
      setError(authErrorMessage(e, m));
    } finally {
      setBusy(false);
    }
  };

  if (verifying) {
    return (
      <CodeStep
        title={m.signUp.verifyTitle}
        lead={m.signUp.verifyLead(normalizeEmail(email))}
        onVerify={signUp.verify}
        onResend={signUp.resendCode}
      />
    );
  }

  return (
    <Screen title={m.signUp.title} lead={m.signUp.lead} back="back">
      <TextField
        label={m.signUp.fullName}
        icon="user"
        value={fullName}
        onChangeText={edit(setFullName)}
        placeholder={m.signUp.fullNamePlaceholder}
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
        maxLength={80}
        returnKeyType="next"
      />
      <TextField
        label={m.signIn.email}
        icon="mail"
        value={email}
        onChangeText={edit(setEmail)}
        placeholder={m.signIn.emailPlaceholder}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
      />
      <PasswordField
        label={m.signIn.password}
        value={password}
        onChangeText={edit(setPassword)}
        placeholder={m.signUp.passwordPlaceholder(PASSWORD_MIN)}
        hint={password.length > 0 && password.length < PASSWORD_MIN ? m.signUp.passwordMissing(PASSWORD_MIN - password.length) : undefined}
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Checkbox checked={acceptedTerms} onToggle={() => setAcceptedTerms((v) => !v)} label={m.signUp.terms}>
        {m.signUp.termsBefore}{' '}
        <Text style={{ color: color.me, fontFamily: font.bodyBold }} accessibilityRole="link" onPress={() => router.push('/terms')}>
          {m.signUp.termsLink}
        </Text>
      </Checkbox>

      {error && (
        <Text style={[type.label, { color: color.negative }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <NavButton label={m.signUp.submit} onPress={submit} disabled={!valid || socialBusy} loading={busy} />

      <SocialButtons disabled={busy} onBusy={setSocialBusy} />

      <View style={{ marginTop: space[4] }}>
        <SwitchAuth question={m.signUp.haveAccount} label={m.signUp.signIn} href={{ pathname: '/sign-in', params }} />
      </View>
    </Screen>
  );
}
