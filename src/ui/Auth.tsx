// Pieces shared by Iniciar sesión, Crea tu cuenta and ¿Olvidaste tu contraseña?
import { Link, type Href } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { authErrorMessage, useOAuth, type Provider } from '@/api/auth';
import { CODE_LENGTH } from '@/lib/authFlow';
import { TextField } from './Form';
import { NavButton, Screen } from './Screen';
import { font, radius, space, touch } from './tokens';
import { makeStyles, useTheme } from './theme';
import { useI18n } from '@/i18n';

/** Blue text button, e.g. "¿Olvidaste tu contraseña?". With href it navigates, replacing the current screen. */
export function TextLink({ label, href, onPress, disabled }: { label: string; href?: Href; onPress?: () => void; disabled?: boolean }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  // Link asChild rejects style arrays, so flatten.
  const link = (
    <Pressable accessibilityRole="link" onPress={onPress} disabled={disabled} hitSlop={12} style={StyleSheet.flatten([styles.textLink, disabled && { opacity: 0.4 }])}>
      <Text style={StyleSheet.flatten([type.row, { color: color.me, fontFamily: font.bodyBold, fontSize: 15 }])}>{label}</Text>
    </Pressable>
  );
  return href ? (
    <Link href={href} replace asChild>
      {link}
    </Link>
  ) : (
    link
  );
}

/** "¿No tienes cuenta? Regístrate" under the form. */
export function SwitchAuth({ question, label, href }: { question: string; label: string; href: Href }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.switch}>
      <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>{question}</Text>
      <TextLink label={label} href={href} />
    </View>
  );
}

/** Google and Apple, side by side under "o continúa con". Errors show under the buttons. */
export function SocialButtons({ disabled, onBusy }: { disabled?: boolean; onBusy?: (busy: boolean) => void }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const signInWith = useOAuth();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (provider: Provider) => {
    setBusy(provider);
    onBusy?.(true);
    setError(null);
    try {
      await signInWith(provider);
    } catch (e) {
      setError(authErrorMessage(e, m));
    } finally {
      setBusy(null);
      onBusy?.(false);
    }
  };

  return (
    <View style={{ gap: space[3] }}>
      <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.rule} />
        <Text style={[type.label, { color: color.textSecondary }]}>{m.authUi.orContinueWith}</Text>
        <View style={styles.rule} />
      </View>
      <View style={styles.socialRow}>
        <SocialButton provider="google" label="Google" busy={busy === 'google'} disabled={disabled || busy !== null} onPress={() => run('google')} />
        <SocialButton provider="apple" label="Apple" busy={busy === 'apple'} disabled={disabled || busy !== null} onPress={() => run('apple')} />
      </View>
      {error && (
        <Text style={[type.label, { color: color.negative, textAlign: 'center' }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

function SocialButton({ provider, label, busy, disabled, onPress }: { provider: Provider; label: string; busy: boolean; disabled: boolean; onPress: () => void }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.authUi.continueWith(label)}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.social, disabled && !busy && { opacity: 0.5 }]}
    >
      {busy ? <ActivityIndicator color={color.ink} /> : provider === 'google' ? <GoogleLogo /> : <AppleLogo />}
      <Text style={[type.row, { fontFamily: font.bodyBold }]}>{label}</Text>
    </Pressable>
  );
}

/** Second step of sign-up, new-device check and password reset: type the 6-digit code from the email. */
export function CodeStep({
  title,
  lead,
  onVerify,
  onResend,
  extra,
  canSubmit = true,
  submitLabel,
}: {
  title: string;
  lead: string;
  onVerify: (code: string) => Promise<void>;
  onResend?: () => Promise<void>;
  /** Fields after the code, e.g. the new password; then the code no longer submits on its own. */
  extra?: ReactNode;
  canSubmit?: boolean;
  submitLabel?: string;
}) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const input = useRef<TextInput>(null);

  const verify = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      await onVerify(value);
    } catch (e) {
      setError(authErrorMessage(e, m));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await onResend?.();
      setCode('');
      setResent(true);
      input.current?.focus();
    } catch (e) {
      setError(authErrorMessage(e, m));
    }
  };

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (!extra && digits.length === CODE_LENGTH && !busy) verify(digits);
  };

  return (
    <Screen
      title={title}
      lead={lead}
      back="back"
      footer={<NavButton label={submitLabel ?? m.authUi.continue} onPress={() => verify(code)} disabled={code.length < CODE_LENGTH || !canSubmit} loading={busy} />}
    >
      <TextField
        ref={input}
        label={m.authUi.code}
        value={code}
        onChangeText={onChange}
        placeholder="000000"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        error={extra ? null : error}
        hint={resent ? m.authUi.newCodeSent : undefined}
        style={styles.code}
        autoFocus
      />
      {extra}
      {extra && error && (
        <Text style={[type.label, { color: color.negative }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      {onResend && <TextLink label={m.authUi.resendCode} onPress={resend} disabled={busy} />}
    </Screen>
  );
}

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </Svg>
  );
}

function AppleLogo() {
  const { color } = useTheme();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        fill={color.ink}
        d="M16.37 1.43c0 1.14-.5 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.2-2.98.81-.94 2.15-1.64 3.25-1.68.03.13.06.28.06.43zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8C3.96 18.38 2.93 15.57 2.93 12.92c0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.67.95 3.6.95.86 0 2.22-1.01 3.9-1.01.61 0 2.89.06 4.37 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.96 4.45z"
      />
    </Svg>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  textLink: { minHeight: touch, justifyContent: 'center' },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1], flexWrap: 'wrap' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[2] },
  rule: { flex: 1, height: 1, backgroundColor: color.line },
  socialRow: { flexDirection: 'row', gap: space[3] },
  social: {
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
  code: { height: 64, fontFamily: font.display, fontSize: 28, letterSpacing: 10, textAlign: 'center', borderRadius: radius.option },
}));
