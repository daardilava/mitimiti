import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavButton } from '@/ui/Screen';
import { color, space, type } from '@/ui/tokens';

// 01 · Bienvenida
export default function Welcome() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={[type.heading, styles.light]}>a medias</Text>
      <View style={styles.hero}>
        <Text style={[type.hero, styles.light]} accessibilityRole="header">
          Cuentas claras entre los dos.
        </Text>
        <Text style={[type.body, { color: '#C9CDD3' }]}>
          Registren lo que gastan juntos, vean al momento quién le debe a quién y salden con un toque.
        </Text>
      </View>
      <View style={{ gap: space[3] }}>
        {/* TODO(§1): Apple / Google sign-in before creating or joining. */}
        <NavButton href="/setup" label="Crear nuestra cuenta" kind="secondary" />
        <NavButton href="/join" label="Tengo un código de invitación" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.ink, padding: space[6], gap: space[6] },
  hero: { flex: 1, justifyContent: 'center', gap: space[6] },
  light: { color: color.surface },
});
