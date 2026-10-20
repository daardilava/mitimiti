// A legal text (Términos y condiciones, Política de privacidad): date, intro, numbered sections and a button that
// writes to us. Reachable signed out (from Crea tu cuenta) and signed in (from Ajustes).
import { Linking, StyleSheet, Text, View } from 'react-native';
import { LEGAL_CONTACT, type LegalDoc } from '@/i18n/legal/types';
import { NavButton, Screen } from './Screen';
import { space } from './tokens';
import { makeStyles, useTheme } from './theme';

export function LegalScreen({ title, doc }: { title: string; doc: LegalDoc }) {
  const { color, type } = useTheme();
  const styles = useStyles();
  return (
    <Screen title={title} back="back">
      <Text style={[type.label, { color: color.textSecondary }]}>{doc.effective}</Text>
      <Text style={type.body}>{doc.intro}</Text>
      {doc.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={[type.heading, { fontSize: 18 }]} accessibilityRole="header">
            {section.heading}
          </Text>
          {section.paragraphs.map((p, i) => (
            <Text key={i} style={[type.body, { color: color.textSecondary }]}>
              {p}
            </Text>
          ))}
        </View>
      ))}
      <View style={styles.contact}>
        <NavButton label={doc.contact} kind="secondary" onPress={() => Linking.openURL(`mailto:${LEGAL_CONTACT.email}`).catch(() => {})} />
        <Text style={[type.label, { color: color.textSecondary, textAlign: 'center' }]} selectable>
          {LEGAL_CONTACT.email}
        </Text>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(() => StyleSheet.create({
  section: { gap: space[2], marginTop: space[2] },
  contact: { gap: space[2], marginTop: space[4] },
}));
