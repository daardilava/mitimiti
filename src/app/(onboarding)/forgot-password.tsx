import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { authErrorMessage, usePasswordReset } from '@/api/auth';
import { isEmail, normalizeEmail, PASSWORD_MIN } from '@/lib/authFlow';
import { useContinueAfterSignIn, type NextStep } from '@/lib/session';
import { CodeStep } from '@/ui/Auth';
import { PasswordField, TextField } from '@/ui/Form';
import { NavButton, Screen } from '@/ui/Screen';
import { useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// ¿Olvidaste tu contraseña? · a code by email, then a new password; saving it signs you in.
export default function ForgotPassword() {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const params = useLocalSearchParams<{ next?: NextStep; email?: string }>();
  useContinueAfterSignIn(params.next);
  const reset = usePasswordReset();

  const [email, setEmail] = useState(params.email ?? '');
  const [sent, setSent] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!isEmail(email) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await reset.start(email);
      setSent(true);
    } catch (e) {
      setError(authErrorMessage(e, m));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <CodeStep
        title={m.forgotPassword.codeTitle}
        lead={m.forgotPassword.codeLead(normalizeEmail(email))}
        onVerify={(code) => reset.finish(code, password)}
        onResend={() => reset.start(email)}
        canSubmit={password.length >= PASSWORD_MIN}
        submitLabel={m.forgotPassword.save}
        extra={
          <PasswordField
            label={m.forgotPassword.newPassword}
            value={password}
            onChangeText={setPassword}
            placeholder={m.signUp.passwordPlaceholder(PASSWORD_MIN)}
            textContentType="newPassword"
            autoComplete="new-password"
          />
        }
      />
    );
  }

  return (
    <Screen
      title={m.forgotPassword.title}
      lead={m.forgotPassword.lead}
      back="back"
      footer={<NavButton label={m.forgotPassword.send} onPress={send} disabled={!isEmail(email)} loading={busy} />}
    >
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
        returnKeyType="send"
        onSubmitEditing={send}
        autoFocus={!params.email}
      />
      {error && (
        <Text style={[type.label, { color: color.negative }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </Screen>
  );
}
