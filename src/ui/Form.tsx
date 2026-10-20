// Form pieces from the "Componentes" board: labelled fields, pill chips, radio cards and notices.
import { useState, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Icon, type IconName } from './Icon';
import { font, radius, space, touch, noFocusRing } from './tokens';
import { useI18n } from '@/i18n';
import { makeStyles, useTheme } from './theme';

/** A label above its control, with an optional hint or error below. */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={{ gap: space[2] }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? (
        <Text style={[type.label, { color: color.negative }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[type.label, { color: color.textSecondary, fontFamily: font.body }]} accessibilityLiveRegion="polite">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

type TextFieldProps = TextInputProps & {
  ref?: Ref<TextInput>;
  label: string;
  hint?: string;
  error?: string | null;
  /** Icon inside the field, before the text. */
  icon?: IconName;
  /** Control inside the field, after the text (e.g. show password). */
  trailing?: ReactNode;
};

export function TextField({ ref, label, hint, error, style, icon, trailing, ...input }: TextFieldProps) {
  const { color } = useTheme();
  const styles = useStyles();
  const border = !!error && { borderColor: color.negative };
  const field = (
    <TextInput
      ref={ref}
      accessibilityLabel={label}
      placeholderTextColor={color.disabled}
      style={icon || trailing ? [styles.inlineInput, style] : [styles.input, border, style]}
      {...input}
    />
  );
  return (
    <Field label={label} hint={hint} error={error}>
      {icon || trailing ? (
        <View style={[styles.input, styles.inputRow, border]}>
          {icon && <Icon name={icon} size={20} color={color.textSecondary} />}
          {field}
          {trailing}
        </View>
      ) : (
        field
      )}
    </Field>
  );
}

/** Search box without a visible label: magnifier, text, and a clear button once something is typed. */
export function SearchField({ value, onChangeText, placeholder, label }: { value: string; onChangeText: (text: string) => void; placeholder: string; label: string }) {
  const { m } = useI18n();
  const { color } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.input, styles.inputRow]}>
      <Icon name="search" size={20} color={color.textSecondary} />
      <TextInput
        accessibilityLabel={label}
        accessibilityRole="search"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.disabled}
        autoCorrect={false}
        returnKeyType="search"
        style={styles.inlineInput}
      />
      {value.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel={m.ui.clearSearch} onPress={() => onChangeText('')} hitSlop={8} style={styles.trailingButton}>
          <Icon name="close" size={18} color={color.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

/** Password with a lock icon and a show / hide button. */
export function PasswordField(props: Omit<TextFieldProps, 'icon' | 'trailing' | 'secureTextEntry'>) {
  const { m } = useI18n();
  const { color } = useTheme();
  const styles = useStyles();
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      icon="lock"
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? m.ui.hidePassword : m.ui.showPassword}
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          style={styles.trailingButton}
        >
          <Icon name={visible ? 'eye' : 'eyeOff'} size={20} color={color.textSecondary} />
        </Pressable>
      }
      {...props}
    />
  );
}

/** Square check with its label; the label can hold links. */
export function Checkbox({ checked, onToggle, label, children }: { checked: boolean; onToggle: () => void; label: string; children: ReactNode }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.checkRow}>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={onToggle} hitSlop={10} style={styles.checkHit}>
        <View style={[styles.box, checked && styles.boxOn]}>{checked && <Icon name="check" size={16} color={color.onPrimary} />}</View>
      </Pressable>
      <Text style={[type.body, { flex: 1, fontSize: 15, color: color.textSecondary }]} onPress={onToggle}>
        {children}
      </Text>
    </View>
  );
}

/** Pill toggle: ink when selected. */
export function Chip({ label, selected, onPress, disabled }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn, disabled && !selected && { opacity: 0.4 }]}
    >
      <Text style={[type.row, { fontFamily: font.bodyBold, color: selected ? color.onPrimary : color.ink }]}>{label}</Text>
    </Pressable>
  );
}

/** Card with a radio ring, a title and a line under it. Extra content shows only while selected. */
export function RadioCard({ title, detail, selected, onPress, children }: { title: string; detail: string; selected: boolean; onPress: () => void; children?: ReactNode }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.option, selected && styles.optionOn]}>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={styles.radioRow}>
        <View style={[styles.ring, { borderColor: selected ? color.ink : color.disabled }]}>{selected && <View style={styles.dot} />}</View>
        <View style={{ flex: 1 }}>
          <Text style={[type.row, { fontFamily: font.bodyBold, fontSize: 17 }]}>{title}</Text>
          <Text style={[type.body, { color: color.textSecondary, fontSize: 15, lineHeight: 22 }]}>{detail}</Text>
        </View>
      </Pressable>
      {selected && children}
    </View>
  );
}

/** − value + control; buttons disable at the ends of the range. */
export function Stepper({ label, value, onDecrease, onIncrease, canDecrease, canIncrease }: { label: string; value: string; onDecrease: () => void; onIncrease: () => void; canDecrease: boolean; canIncrease: boolean }) {
  const { m } = useI18n();
  const { type } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.stepper} accessibilityLabel={`${label}: ${value}`}>
      <StepButton icon="minus" label={m.ui.less(label)} enabled={canDecrease} onPress={onDecrease} />
      <Text style={[type.row, { flex: 1, textAlign: 'center', fontFamily: font.bodyBold }]}>{value}</Text>
      <StepButton icon="plus" label={m.ui.more(label)} enabled={canIncrease} onPress={onIncrease} />
    </View>
  );
}

function StepButton({ icon, label, enabled, onPress }: { icon: IconName; label: string; enabled: boolean; onPress: () => void }) {
  const { color } = useTheme();
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !enabled }} disabled={!enabled} onPress={onPress} style={[styles.stepButton, !enabled && { opacity: 0.4 }]}>
      <Icon name={icon} size={20} color={color.ink} />
    </Pressable>
  );
}

/** Info (blue) or neutral (grey) notice with an icon. */
export function Callout({ icon, tone = 'info', children }: { icon: IconName; tone?: 'info' | 'neutral'; children: ReactNode }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  const fg = tone === 'info' ? color.info : color.textSecondary;
  return (
    <View style={[styles.callout, { backgroundColor: tone === 'info' ? color.infoTint : color.neutralTint }]}>
      <Icon name={icon} size={20} color={fg} />
      <Text style={[type.body, { flex: 1, color: fg, fontSize: 15, lineHeight: 22 }]}>{children}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ color, type }) => StyleSheet.create({
  label: { ...type.label, color: color.textSecondary },
  input: {
    ...type.body,
    height: 52,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    borderRadius: radius.control,
    backgroundColor: color.surface,
    paddingHorizontal: space[4],
    color: color.ink,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  // The row draws the border; no second one around the inner input on web.
  inlineInput: { ...type.body, flex: 1, height: '100%', color: color.ink, ...noFocusRing },
  trailingButton: { width: touch, height: touch, marginRight: -space[3], alignItems: 'center', justifyContent: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: touch },
  checkHit: { width: touch, height: touch, marginLeft: -space[3], alignItems: 'center', justifyContent: 'center' },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: color.disabled, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.ink, borderColor: color.ink },
  chip: {
    height: touch,
    minWidth: 64,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.fieldBorder,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: color.ink, borderColor: color.ink },
  option: { borderWidth: 1, borderColor: color.line, borderRadius: radius.option, backgroundColor: color.surface },
  optionOn: { borderColor: color.ink, borderWidth: 2 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: space[4], minHeight: touch },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingBottom: space[4] },
  stepButton: { width: touch, height: touch, borderRadius: touch / 2, borderWidth: 1, borderColor: color.fieldBorder, alignItems: 'center', justifyContent: 'center' },
  callout: { flexDirection: 'row', gap: space[3], padding: space[4], borderRadius: radius.option },
}));
