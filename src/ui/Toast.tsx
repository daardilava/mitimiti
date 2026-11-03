// A short message at the bottom of the screen, with up to two actions: "Gasto agregado · Deshacer · Editar" after
// Escanear adds an expense. One at a time; a new one replaces the old. Mounted once in src/app/_layout.tsx.
import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { font, radius, space, touch } from './tokens';
import { makeStyles, useTheme } from './theme';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface Toast {
  id: number;
  message: string;
  actions: ToastAction[];
}

const useToastStore = create<{ toast: Toast | null }>(() => ({ toast: null }));

/** Long enough to read it and reach Deshacer. */
const VISIBLE_MS = 6_000;

export function showToast(message: string, actions: ToastAction[] = []) {
  useToastStore.setState({ toast: { id: Date.now(), message, actions } });
  AccessibilityInfo.announceForAccessibility(message);
}

export function hideToast() {
  useToastStore.setState({ toast: null });
}

export function ToastHost() {
  const toast = useToastStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  const { type } = useTheme();
  const styles = useStyles();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      if (useToastStore.getState().toast?.id === toast.id) hideToast();
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    // Above the tab bar (80 pt) on the main screens; the box itself never blocks touches outside it.
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 92 }]}>
      <View style={styles.toast} accessibilityLiveRegion="polite">
        <Text style={[type.row, styles.message]}>{toast.message}</Text>
        {toast.actions.length > 0 && (
          <View style={styles.actions}>
            {toast.actions.map((a) => (
              <Pressable
                key={a.label}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                onPress={() => {
                  hideToast();
                  a.onPress();
                }}
                style={styles.action}
              >
                <Text style={[type.row, styles.actionText]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  wrap: { position: 'absolute', left: space[4], right: space[4] },
  // The primary button's pair (ink / onPrimary), so it reads in light and dark mode.
  toast: { borderRadius: radius.card, backgroundColor: color.ink, paddingLeft: space[4], paddingRight: space[1], paddingVertical: space[1], gap: space[1] },
  message: { color: color.onPrimary, fontSize: 15, paddingTop: space[3], paddingRight: space[3] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  action: { minHeight: touch, minWidth: touch, paddingHorizontal: space[3], alignItems: 'center', justifyContent: 'center' },
  actionText: { color: color.onPrimary, fontFamily: font.bodyBold, textDecorationLine: 'underline' },
}));
