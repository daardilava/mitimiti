import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { authErrorMessage, usePasswordSignIn } from '@/api/auth';
import { isEmail } from '@/lib/authFlow';
import { useContinueAfterSignIn, type NextStep } from '@/lib/session';
import { CodeStep, SocialButtons, SwitchAuth, TextLink } from '@/ui/Auth';
import { PasswordField, TextField } from '@/ui/Form';
import { NavButton, Screen } from '@/ui/Screen';
import { color, space, type } from '@/ui/tokens';

// Iniciar sesión · email and password, or Google / Apple. Before 02 and 04.
export default function SignIn() {
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
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (verifyingDevice) {
    return (
      <CodeStep
        title="Confirma que eres tú"
        lead={`Es la primera vez que entras desde este dispositivo. Te enviamos un código a ${email.trim()}.`}
        onVerify={signIn.confirmDevice}
        onResend={signIn.resendDeviceCode}
      />
    );
  }

  return (
    <Screen title="Hola de nuevo" lead="Entra para ver sus gastos y quién le debe a quién." back="back">
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
        returnKeyType="next"
      />
      <View>
        <PasswordField
          label="Contraseña"
          value={password}
          onChangeText={(t) => { setPassword(t); setError(null); }}
          placeholder="Tu contraseña"
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <View style={{ alignItems: 'flex-end' }}>
          <TextLink label="¿Olvidaste tu contraseña?" href={{ pathname: '/forgot-password', params: { ...params, email: email.trim() } }} />
        </View>
      </View>

      {error && (
        <Text style={[type.label, { color: color.negative }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <NavButton label="Iniciar sesión" onPress={submit} disabled={!valid || socialBusy} loading={busy} />

      <SocialButtons disabled={busy} onBusy={setSocialBusy} />

      <View style={{ marginTop: space[4] }}>
        <SwitchAuth question="¿No tienes cuenta?" label="Regístrate" href={{ pathname: '/sign-up', params }} />
      </View>
    </Screen>
  );
}
