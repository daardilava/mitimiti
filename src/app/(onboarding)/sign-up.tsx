import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { authErrorMessage, usePasswordSignUp } from '@/api/auth';
import { canSignUp, normalizeEmail, PASSWORD_MIN } from '@/lib/authFlow';
import { useContinueAfterSignIn, type NextStep } from '@/lib/session';
import { CodeStep, SocialButtons, SwitchAuth } from '@/ui/Auth';
import { Checkbox, PasswordField, TextField } from '@/ui/Form';
import { NavButton, Screen } from '@/ui/Screen';
import { color, font, space, type } from '@/ui/tokens';

// Crea tu cuenta · name, email and password (then a code by email), or Google / Apple. Before 02 and 04.
export default function SignUp() {
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
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (verifying) {
    return (
      <CodeStep
        title="Revisa tu correo"
        lead={`Te enviamos un código de 6 dígitos a ${normalizeEmail(email)} para confirmar que es tuyo.`}
        onVerify={signUp.verify}
        onResend={signUp.resendCode}
      />
    );
  }

  return (
    <Screen title="Crea tu cuenta" lead="Cada uno tiene la suya; después los unimos con un código." back="back">
      <TextField
        label="Nombre completo"
        icon="user"
        value={fullName}
        onChangeText={edit(setFullName)}
        placeholder="Ej. Diego Ardila"
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
        maxLength={80}
        returnKeyType="next"
      />
      <TextField
        label="Correo"
        icon="mail"
        value={email}
        onChangeText={edit(setEmail)}
        placeholder="tu@correo.com"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
      />
      <PasswordField
        label="Contraseña"
        value={password}
        onChangeText={edit(setPassword)}
        placeholder={`Mínimo ${PASSWORD_MIN} caracteres`}
        hint={password.length > 0 && password.length < PASSWORD_MIN ? `Te faltan ${PASSWORD_MIN - password.length} caracteres.` : undefined}
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Checkbox checked={acceptedTerms} onToggle={() => setAcceptedTerms((v) => !v)} label="Acepto los términos y condiciones">
        Acepto los{' '}
        <Text style={{ color: color.me, fontFamily: font.bodyBold }} accessibilityRole="link" onPress={() => router.push('/terms')}>
          términos y condiciones
        </Text>
      </Checkbox>

      {error && (
        <Text style={[type.label, { color: color.negative }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <NavButton label="Registrarme" onPress={submit} disabled={!valid || socialBusy} loading={busy} />

      <SocialButtons disabled={busy} onBusy={setSocialBusy} />

      <View style={{ marginTop: space[4] }}>
        <SwitchAuth question="¿Ya tienes cuenta?" label="Inicia sesión" href={{ pathname: '/sign-in', params }} />
      </View>
    </Screen>
  );
}
