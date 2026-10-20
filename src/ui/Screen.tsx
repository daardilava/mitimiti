import { Link, router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { radius, space } from './tokens';
import { useI18n } from '@/i18n';
import { makeStyles, useTheme } from './theme';

interface ScreenProps {
  title: string;
  /** Shows a back (or close) button in the header. */
  back?: 'back' | 'close';
  /** Onboarding layout: the header shows this label (e.g. "Paso 1 de 2") and the title moves into the content, large. */
  step?: string;
  /** Text under a large title. Implies the large-title layout. */
  lead?: string;
  /** Pinned under the scroll area, above the home indicator: the screen's main button. */
  footer?: ReactNode;
  /** Replaces the header's title text, e.g. Home's avatars and month. `title` still names the screen. */
  header?: ReactNode;
  children?: ReactNode;
}

export function Screen({ title, back, step, lead, footer, header, children }: ScreenProps) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const large = step !== undefined || lead !== undefined;
  return (
    <SafeAreaView style={styles.safe} edges={back || footer ? ['top', 'bottom'] : ['top']}>
      <View style={styles.header}>
        {back && (
          <Pressable accessibilityRole="button" accessibilityLabel={back === 'close' ? m.ui.close : m.ui.back} onPress={() => router.back()} style={styles.iconButton}>
            <Icon name={back} size={22} color={color.ink} />
          </Pressable>
        )}
        {header ? (
          header
        ) : large ? (
          step ? <Text style={[type.label, { color: color.textSecondary, fontSize: 15 }]}>{step}</Text> : null
        ) : (
          <Text style={back ? type.bar : type.screenTitle} accessibilityRole="header">
            {title}
          </Text>
        )}
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {large && (
            <View style={{ gap: space[2], marginBottom: space[2] }}>
              <Text style={type.screenTitle} accessibilityRole="header">
                {title}
              </Text>
              {lead && <Text style={[type.body, { color: color.textSecondary, fontSize: 17, lineHeight: 26 }]}>{lead}</Text>}
            </View>
          )}
          {children}
        </ScrollView>
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Stand-in while a screen's data loads, or when it failed or doesn't exist. */
export function Loading({ title, error, notFound }: { title: string; error?: Error | null; notFound?: boolean }) {
  const { color, type } = useTheme();
  const { m } = useI18n();
  const message = notFound ? m.ui.expenseGone : error ? m.ui.loadFailed : null;
  return (
    <Screen title={title} back="back">
      {message ? (
        <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', marginTop: space[8] }]}>{message}</Text>
      ) : (
        <ActivityIndicator color={color.ink} style={{ marginTop: space[8] }} />
      )}
    </Screen>
  );
}

/** Body of a tab while its data loads, or a message and a retry button when it failed. */
export function Pending({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  return failed ? (
    <View style={{ gap: space[4], marginTop: space[8] }}>
      <Text style={[type.body, { color: color.textSecondary, textAlign: 'center' }]}>{m.ui.loadFailed}</Text>
      <NavButton label={m.ui.retry} kind="secondary" onPress={onRetry} />
    </View>
  ) : (
    <ActivityIndicator color={color.ink} style={{ marginTop: space[8] }} />
  );
}

/** Marks a screen that is routed but not built yet, and says which feature section builds it. */
export function Todo({ feature, children }: { feature: string; children: ReactNode }) {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.todo}>
      <Text style={type.label}>{m.ui.todo(feature)}</Text>
      <Text style={[type.body, { color: color.textSecondary }]}>{children}</Text>
    </View>
  );
}

interface NavButtonProps {
  href?: Href;
  label: string;
  /** primary: ink · secondary: white with a border · outline: transparent, for dark backgrounds ·
   * payment: green, only for recording a payment (the UI kit reserves green for that) ·
   * inverse: white with dark text, for hero cards (balance, Welcome), in light and dark mode alike. */
  kind?: 'primary' | 'secondary' | 'outline' | 'payment' | 'inverse';
  onPress?: () => void;
  /** Greyed out and not pressable, e.g. until a form is complete. */
  disabled?: boolean;
  /** Shows a spinner instead of the label while a request runs. */
  loading?: boolean;
}

export function NavButton({ href, label, kind = 'primary', onPress, disabled, loading }: NavButtonProps) {
  const { color, type } = useTheme();
  const styles = useStyles();
  const inactive = disabled || loading;
  const textColor = kind === 'secondary' ? color.ink : kind === 'outline' ? color.onHero : kind === 'payment' ? color.onPositive : kind === 'inverse' ? color.hero : color.onPrimary;
  const button = (
    // Link asChild rejects style arrays, so flatten.
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={StyleSheet.flatten([styles.button, kind === 'secondary' && styles.buttonSecondary, kind === 'outline' && styles.buttonOutline, kind === 'payment' && styles.buttonPayment, kind === 'inverse' && styles.buttonInverse, disabled && styles.buttonDisabled])}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={StyleSheet.flatten([type.row, { color: textColor, fontFamily: 'DMSans_700Bold' }])}>{label}</Text>
      )}
    </Pressable>
  );
  return href && !inactive ? (
    <Link href={href} asChild>
      {button}
    </Link>
  ) : (
    button
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space[1], paddingHorizontal: space[5] },
  iconButton: { width: 44, height: 44, marginLeft: -space[3], alignItems: 'center', justifyContent: 'center' },
  content: { padding: space[5], gap: space[4] },
  todo: { gap: space[2], padding: space[4], borderRadius: radius.option, borderWidth: 1, borderStyle: 'dashed', borderColor: color.disabled },
  button: { height: 52, borderRadius: radius.control, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  buttonSecondary: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.fieldBorder },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: color.heroLine },
  buttonPayment: { backgroundColor: color.positive },
  buttonInverse: { backgroundColor: color.onHero },
  buttonDisabled: { backgroundColor: color.disabled, borderColor: color.disabled },
  footer: { paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[3], borderTopWidth: 1, borderTopColor: color.line },
}));
