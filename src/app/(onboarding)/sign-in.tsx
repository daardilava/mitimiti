import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { authErrorMessage, usePasswordSignIn } from '@/api/auth';
import { isEmail } from '@/lib/authFlow';
import { useContinueAfterSignIn, type NextStep } from '@/lib/session';
import { CodeStep, SocialButtons, SwitchAuth, TextLink } from '@/ui/Auth';
import { PasswordField, TextField } from '@/ui/Form';
import { NavButton, Screen } from '@/ui/Screen';
import { space } from '@/ui/tokens';
import { useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// Iniciar sesión · email and password, or Google / Apple. Before 02 and 04.
export default function SignIn() {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const { next } = useLocalSearchParams<{ next?: NextStep }>();
  useContinueAfterSignIn(next);
  const signIn = usePasswordSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyingDevice, setVerifyingDevice] = useState(false);

  const valid = isEmail(email) && password.length > 0;
  const params = next ? { next } : {};

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      if ((await signIn.start(email, password)) === 'verify-device') setVerifyingDevice(true);
    } catch (e) {
      setError(authErrorMessage(e, m));
    } finally {
      setBusy(false);
    }
  };

  if (verifyingDevice) {
    return (
      <CodeStep
        title={m.signIn.deviceTitle}
        lead={m.signIn.deviceLead(email.trim())}
        onVerify={signIn.confirmDevice}
        onResend={signIn.resendDeviceCode}
      />
    );
  }

  return (
    <Screen title={m.signIn.title} lead={m.signIn.lead} back="back">
      <TextField
        label={m.signIn.email}
        icon="mail"
        value={email}
        onChangeText={(t) => { setEmail(t); setError(null); }}
        placeholder={m.signIn.emailPlaceholder}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
      />
      <View>
        <PasswordField
          label={m.signIn.password}
          value={password}
          onChangeText={(t) => { setPassword(t); setError(null); }}
          placeholder={m.signIn.passwordPlaceholder}
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <View style={{ alignItems: 'flex-end' }}>
          <TextLink label={m.signIn.forgot} href={{ pathname: '/forgot-password', params: { ...params, email: email.trim() } }} />
        </View>
      </View>

      {error && (
        <Text style={[type.label, { color: color.negative }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <NavButton label={m.signIn.submit} onPress={submit} disabled={!valid || socialBusy} loading={busy} />

      <SocialButtons disabled={busy} onBusy={setSocialBusy} />

      <View style={{ marginTop: space[4] }}>
        <SwitchAuth question={m.signIn.noAccount} label={m.signIn.signUp} href={{ pathname: '/sign-up', params }} />
      </View>
    </Screen>
  );
}
