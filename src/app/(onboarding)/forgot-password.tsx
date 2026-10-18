import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { authErrorMessage, usePasswordReset } from '@/api/auth';
import { isEmail, normalizeEmail, PASSWORD_MIN } from '@/lib/authFlow';
import { useContinueAfterSignIn, type NextStep } from '@/lib/session';
import { CodeStep } from '@/ui/Auth';
import { PasswordField, TextField } from '@/ui/Form';
import { NavButton, Screen } from '@/ui/Screen';
import { color, type } from '@/ui/tokens';

// ¿Olvidaste tu contraseña? · a code by email, then a new password; saving it signs you in.
export default function ForgotPassword() {
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
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <CodeStep
        title="Nueva contraseña"
        lead={`Escribe el código que te enviamos a ${normalizeEmail(email)} y elige tu nueva contraseña.`}
        onVerify={(code) => reset.finish(code, password)}
        onResend={() => reset.start(email)}
        canSubmit={password.length >= PASSWORD_MIN}
        submitLabel="Guardar y entrar"
        extra={
          <PasswordField
            label="Nueva contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder={`Mínimo ${PASSWORD_MIN} caracteres`}
            textContentType="newPassword"
            autoComplete="new-password"
          />
        }
      />
    );
  }

  return (
    <Screen
      title="¿Olvidaste tu contraseña?"
      lead="Te enviamos un código a tu correo para que elijas una nueva."
      back="back"
      footer={<NavButton label="Enviarme un código" onPress={send} disabled={!isEmail(email)} loading={busy} />}
    >
      <TextField
        label="Correo"
        icon="mail"
        value={email}
        onChangeText={(t) => { setEmail(t); setError(null); }}
        placeholder="tu@correo.com"
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
