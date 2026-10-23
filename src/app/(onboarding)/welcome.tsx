import { Link, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEV_BYPASS_AUTH, useSessionStore, type NextStep } from '@/lib/session';
import { Callout } from '@/ui/Form';
import { Miti, Wordmark } from '@/ui/Miti';
import { NavButton } from '@/ui/Screen';
import { font, space, touch } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// 01 · Bienvenida
export default function Welcome() {
  const { m } = useI18n();
  const { type } = useTheme();
  const styles = useStyles();
  const signedIn = useSessionStore((s) => s.userId !== null) || DEV_BYPASS_AUTH;
  // Both paths need a signed-in person: new people create an account first, then continue to the chosen one.
  const to = (next: NextStep): Href => (signedIn ? `/${next}` : { pathname: '/sign-up', params: { next } });
  // Why someone is back here: their account was deleted, or their partner's deletion took the couple with it. The
  // session store clears it once something new happens (a sign-in, a new couple), not when this screen unmounts:
  // navigation and React's development double-mount remount it, which erased the notice before anyone saw it.
  const notice = useSessionStore((s) => s.notice);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Tinta behind in both modes: light status bar text, whatever the phone's mode. */}
      <StatusBar style="light" />
      <View style={styles.hero}>
        <Miti size={176} />
        <Wordmark size={44} />
        <Text style={[type.body, styles.tagline]}>{m.welcome.tagline}</Text>
      </View>
      {notice && (
        <View accessibilityLiveRegion="polite">
          <Callout icon="check">{notice === 'accountDeleted' ? m.welcome.accountDeleted : m.welcome.coupleDeleted}</Callout>
        </View>
      )}
      <View style={{ gap: space[3] }}>
        <NavButton href={to('setup')} label={m.welcome.create} kind="brand" />
        <NavButton href={to('join')} label={m.welcome.haveCode} kind="outline" />
        {!signedIn && (
          <Link href="/sign-in" asChild>
            <Pressable accessibilityRole="link" hitSlop={12} style={styles.signIn}>
              <Text style={[type.row, styles.signInText]}>{m.welcome.signIn}</Text>
            </Pressable>
          </Link>
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.brandInk, padding: space[6], gap: space[6] },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[5] },
  tagline: { color: color.onBrandInk, fontSize: 18, lineHeight: 27, textAlign: 'center', maxWidth: 320 },
  signIn: { minHeight: touch, alignItems: 'center', justifyContent: 'center' },
  signInText: { color: color.wordmarkGreen, fontFamily: font.bodySemi, fontSize: 16, textDecorationLine: 'underline' },
}));
