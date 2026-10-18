import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEV_BYPASS_AUTH, useSessionStore, type NextStep } from '@/lib/session';
import { NavButton } from '@/ui/Screen';
import { color, font, space, touch, type } from '@/ui/tokens';

// 01 · Bienvenida
export default function Welcome() {
  const signedIn = useSessionStore((s) => s.userId !== null) || DEV_BYPASS_AUTH;
  // Both paths need a signed-in person: new people create an account first, then continue to the chosen one.
  const to = (next: NextStep): Href => (signedIn ? `/${next}` : { pathname: '/sign-up', params: { next } });

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={[type.heading, styles.light]}>a medias</Text>
      <View style={styles.hero}>
        <View style={styles.logo} aria-hidden>
          <View style={[styles.circle, { backgroundColor: color.logoBlue }]} />
          <View style={[styles.circle, styles.overlap, { backgroundColor: color.partner }]} />
        </View>
        <Text style={[type.hero, styles.light, { lineHeight: 48 }]} accessibilityRole="header">
          Cuentas claras entre los dos.
        </Text>
        <Text style={[type.body, { color: color.onInk, fontSize: 17, lineHeight: 27 }]}>
          Registren lo que gastan juntos, vean al momento quién le debe a quién y salden con un toque.
        </Text>
      </View>
      <View style={{ gap: space[3] }}>
        <NavButton href={to('setup')} label="Crear nuestra cuenta" kind="secondary" />
        <NavButton href={to('join')} label="Tengo un código de invitación" kind="outline" />
        {!signedIn && (
          <View style={styles.signIn}>
            <Text style={[type.body, { color: color.onInk, fontSize: 15 }]}>¿Ya tienes cuenta?</Text>
            <Link href="/sign-in" asChild>
              <Pressable accessibilityRole="link" hitSlop={12} style={{ minHeight: touch, justifyContent: 'center' }}>
                <Text style={[type.row, styles.light, { fontFamily: font.bodyBold, fontSize: 15, textDecorationLine: 'underline' }]}>Inicia sesión</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.ink, padding: space[6], gap: space[6] },
  hero: { flex: 1, justifyContent: 'center', gap: space[6] },
  light: { color: color.surface },
  logo: { flexDirection: 'row', height: 88 },
  circle: { width: 88, height: 88, borderRadius: 44 },
  overlap: { marginLeft: -36, opacity: 0.92 },
  signIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1] },
});
