import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEV_BYPASS_AUTH, useSessionStore, type NextStep } from '@/lib/session';
import { Callout } from '@/ui/Form';
import { NavButton } from '@/ui/Screen';
import { font, space, touch } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// 01 · Bienvenida
export default function Welcome() {
  const { m } = useI18n();
  const { color, type } = useTheme();
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
      <Text style={[type.heading, styles.light]}>MitiMiti</Text>
      <View style={styles.hero}>
        <View style={styles.logo} aria-hidden>
          <View style={[styles.circle, { backgroundColor: color.logoBlue }]} />
          <View style={[styles.circle, styles.overlap, { backgroundColor: color.partner }]} />
        </View>
        <Text style={[type.hero, styles.light, { lineHeight: 48 }]} accessibilityRole="header">
          {m.welcome.title}
        </Text>
        <Text style={[type.body, { color: color.onInk, fontSize: 17, lineHeight: 27 }]}>
          {m.welcome.lead}
        </Text>
      </View>
      {notice && (
        <View accessibilityLiveRegion="polite">
          <Callout icon="check">{notice === 'accountDeleted' ? m.welcome.accountDeleted : m.welcome.coupleDeleted}</Callout>
        </View>
      )}
      <View style={{ gap: space[3] }}>
        <NavButton href={to('setup')} label={m.welcome.create} kind="inverse" />
        <NavButton href={to('join')} label={m.welcome.haveCode} kind="outline" />
        {!signedIn && (
          <View style={styles.signIn}>
            <Text style={[type.body, { color: color.onInk, fontSize: 15 }]}>{m.welcome.haveAccount}</Text>
            <Link href="/sign-in" asChild>
              <Pressable accessibilityRole="link" hitSlop={12} style={{ minHeight: touch, justifyContent: 'center' }}>
                <Text style={[type.row, styles.light, { fontFamily: font.bodyBold, fontSize: 15, textDecorationLine: 'underline' }]}>{m.welcome.signIn}</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.hero, padding: space[6], gap: space[6] },
  hero: { flex: 1, justifyContent: 'center', gap: space[6] },
  light: { color: color.onHero },
  logo: { flexDirection: 'row', height: 88 },
  circle: { width: 88, height: 88, borderRadius: 44 },
  overlap: { marginLeft: -36, opacity: 0.92 },
  signIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1] },
}));
