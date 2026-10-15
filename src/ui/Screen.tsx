import { Link, router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { color, radius, space, type } from './tokens';

interface ScreenProps {
  title: string;
  /** Shows a back (or close) button in the header. */
  back?: 'back' | 'close';
  children?: ReactNode;
}

export function Screen({ title, back, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={back ? ['top', 'bottom'] : ['top']}>
      <View style={styles.header}>
        {back && (
          <Pressable accessibilityRole="button" accessibilityLabel={back === 'close' ? 'Cerrar' : 'Volver'} onPress={() => router.back()} style={styles.iconButton}>
            <Icon name={back} size={22} color={color.ink} />
          </Pressable>
        )}
        <Text style={back ? type.bar : type.screenTitle} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

/** Marks a screen that is routed but not built yet, and says which feature section builds it. */
export function Todo({ feature, children }: { feature: string; children: ReactNode }) {
  return (
    <View style={styles.todo}>
      <Text style={type.label}>Por construir · {feature}</Text>
      <Text style={[type.body, { color: color.textSecondary }]}>{children}</Text>
    </View>
  );
}

export function NavButton({ href, label, kind = 'primary', onPress }: { href?: Href; label: string; kind?: 'primary' | 'secondary'; onPress?: () => void }) {
  const button = (
    // Link asChild rejects style arrays, so flatten.
    <Pressable accessibilityRole="button" onPress={onPress} style={StyleSheet.flatten([styles.button, kind === 'secondary' && styles.buttonSecondary])}>
      <Text style={StyleSheet.flatten([type.row, { color: kind === 'primary' ? color.surface : color.ink, fontFamily: 'DMSans_700Bold' }])}>{label}</Text>
    </Pressable>
  );
  return href ? (
    <Link href={href} asChild>
      {button}
    </Link>
  ) : (
    button
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space[1], paddingHorizontal: space[5] },
  iconButton: { width: 44, height: 44, marginLeft: -space[3], alignItems: 'center', justifyContent: 'center' },
  content: { padding: space[5], gap: space[4] },
  todo: { gap: space[2], padding: space[4], borderRadius: radius.option, borderWidth: 1, borderStyle: 'dashed', borderColor: color.disabled },
  button: { height: 52, borderRadius: radius.control, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  buttonSecondary: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.fieldBorder },
});
