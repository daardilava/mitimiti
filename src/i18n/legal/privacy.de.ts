// Datenschutzerklärung von MitiMiti auf Deutsch: eine Übersetzung von privacy.es.ts, das die verbindliche Fassung ist.
import { LEGAL_CONTACT, type LegalDoc } from './types';

const { owner, email, city } = LEGAL_CONTACT;

export const privacyDe: LegalDoc = {
  effective: 'Gültig ab dem 20. Oktober 2026',
  intro:
    'Diese Erklärung beschreibt, welche personenbezogenen Daten MitiMiti speichert, wofür, mit wem sie geteilt werden, wie lange sie aufbewahrt werden und wie du sie einsehen, berichtigen oder löschen lassen kannst.',
  sections: [
    {
      heading: '1. Verantwortlicher',
      paragraphs: [`${owner}, Privatperson mit Wohnsitz in ${city}. E-Mail für alles rund um deine Daten: ${email}.`],
    },
    {
      heading: '2. Welche Daten wir speichern',
      paragraphs: [
        'Aus deinem Konto: deinen Namen, deine E-Mail-Adresse und dein Passwort. Das Passwort speichert unser Anmeldedienst verschlüsselt; wir sehen es nie. Wenn du dich mit Google oder Apple anmeldest, erhalten wir von dort deinen Namen, deine E-Mail-Adresse und eine Kennung. Aus Sicherheitsgründen erfasst der Anbieter außerdem deine Sitzungen, das Gerät und die IP-Adresse, von der du dich anmeldest.',
        'Vom Paar: den Namen jeder Person (auch den Namen, mit dem du deinen Partner oder deine Partnerin einlädst, bevor er oder sie beitritt), den Avatar, die Währung, die Standardaufteilung und den Einladungscode.',
        'Was ihr erfasst: jede Ausgabe (Betrag, Beschreibung, Kategorie, Datum, wer bezahlt hat und wie sie aufgeteilt wird), jede Zahlung zwischen euch (Betrag, Zahlungsart und Datum) und die Budgets.',
        'Einen Änderungsverlauf: wer jede Ausgabe oder Zahlung erstellt, bearbeitet oder gelöscht hat, und wann. Außerdem speichern wir Versuche, mit einem Code beizutreten, um Missbrauch zu verhindern.',
        'Auf deinem Telefon bleiben deine Sitzung, im sicheren Speicher des Systems, und deine Einstellungen für Sprache und Darstellung.',
        'Wir fragen keine sensiblen Daten ab. Wir speichern keine Bank- oder Kartendaten, keinen Standort, keine Kontakte und keine Fotos. Bitte schreib keine sensiblen Daten in die Beschreibungen der Ausgaben.',
      ],
    },
    {
      heading: '3. Wofür wir sie nutzen',
      paragraphs: [
        'Um dein Konto zu erstellen und zu schützen; um dir und deinem Partner oder deiner Partnerin das Erfasste zu zeigen und den Saldo zu berechnen; um beide Telefone synchron zu halten; um Betrug und Missbrauch zu verhindern; um deine Fragen zu beantworten; um dich über Änderungen der App oder dieser Texte zu informieren; und um gesetzliche Pflichten zu erfüllen.',
        'Wir verkaufen deine Daten nicht, nutzen sie nicht für Werbung und erstellen keine Profile von dir für Dritte.',
      ],
    },
    {
      heading: '4. Deine Einwilligung',
      paragraphs: [
        'Mit dem Erstellen deines Kontos und dem Akzeptieren dieser Erklärung erlaubst du uns, deine Daten für die genannten Zwecke zu verarbeiten. Du kannst diese Einwilligung jederzeit widerrufen, indem du dein Konto löschst oder uns schreibst.',
        'Wenn du den Namen deines Partners oder deiner Partnerin vor dem Beitritt einträgst, bestätigst du, dass die Person es dir erlaubt hat. Beim Beitritt akzeptiert sie diese Erklärung mit ihrem eigenen Konto.',
      ],
    },
    {
      heading: '5. Mit wem wir sie teilen',
      paragraphs: [
        'Mit deinem Partner oder deiner Partnerin: Diese Person sieht alles, was in eurem Bereich geteilt wird, auch deinen Namen und deinen Avatar.',
        'Mit den Anbietern, die uns beim Betrieb helfen und deine Daten nur dafür und nach unseren Anweisungen nutzen: Clerk (Anmeldung, Vereinigte Staaten) und Supabase (Datenbank, gehostet in Irland, Europäische Union). Wenn du dich mit Google oder Apple anmeldest, sind auch sie an der Anmeldung beteiligt.',
        'Mit Behörden, nur wenn das Gesetz es verlangt.',
      ],
    },
    {
      heading: '6. Internationale Übermittlung',
      paragraphs: [
        'Deine Daten werden außerhalb Kolumbiens gespeichert: in Irland (Europäische Union) und in den Vereinigten Staaten. Die kolumbianische Aufsichtsbehörde Superintendencia de Industria y Comercio erkennt diesen Ländern ein angemessenes Datenschutzniveau zu, und wir wählen Anbieter mit vertraglichen Zusagen zu Sicherheit und Vertraulichkeit.',
      ],
    },
    {
      heading: '7. Wie wir sie schützen',
      paragraphs: [
        'Die Verbindungen sind verschlüsselt. In der Datenbank ist jede Zeile so geschützt, dass nur die beiden Personen eines Paares sie lesen oder ändern können. Deine Sitzung liegt im sicheren Speicher des Telefons, und jede Änderung wird festgehalten.',
        'Kein System ist unfehlbar. Wenn ein Vorfall deine Daten betrifft, informieren wir dich und, wenn nötig, die Behörde.',
      ],
    },
    {
      heading: '8. Wie lange wir sie aufbewahren',
      paragraphs: [
        'Solange du ein Konto hast. Eine Ausgabe oder Zahlung, die du löschst, wird nicht mehr angezeigt, bleibt aber als gelöscht markiert erhalten, solange ihr Paar besteht, damit der Änderungsverlauf vollständig ist.',
        'Wenn du dein Konto löschst, löschen wir dein Anmeldekonto, dein Profil und den gesamten Bereich des Paares: seine Ausgaben, Zahlungen, Budgets und seinen Verlauf, auch für deinen Partner oder deine Partnerin. Die App warnt dich, bevor du bestätigst.',
        'Sicherungskopien unserer Anbieter können diese Daten bis zu 30 weitere Tage enthalten, bis sie ersetzt werden. Länger bewahren wir nur etwas auf, wenn das Gesetz es verlangt.',
      ],
    },
    {
      heading: '9. Deine Rechte',
      paragraphs: [
        'Nach dem kolumbianischen Gesetz 1581 von 2012 kannst du: deine Daten einsehen, aktualisieren und berichtigen; einen Nachweis deiner Einwilligung verlangen; erfahren, wie wir sie nutzen; deine Einwilligung widerrufen und die Löschung verlangen; dich nach einer Anfrage bei uns bei der Superintendencia de Industria y Comercio beschweren; und kostenlos auf deine Daten zugreifen.',
        'Wenn du in der Europäischen Union lebst, hast du außerdem die Rechte aus der Datenschutz-Grundverordnung: Auskunft, Datenübertragbarkeit, Widerspruch und Einschränkung der Verarbeitung sowie das Recht, dich bei der Datenschutzbehörde deines Landes zu beschweren.',
      ],
    },
    {
      heading: '10. Wie du sie ausübst',
      paragraphs: [
        'Vieles geht direkt in der App: In den Einstellungen änderst du deinen Namen und deinen Avatar, und unter Einstellungen › Konto kannst du dein Konto löschen. Für alles andere schreib uns von der E-Mail-Adresse deines Kontos, damit wir bestätigen können, dass du es bist.',
        'Wir beantworten Anfragen innerhalb von höchstens 10 Werktagen und Beschwerden innerhalb von höchstens 15 Werktagen. Brauchen wir länger, sagen wir dir warum, und es werden nie mehr als 5 zusätzliche Werktage für eine Anfrage oder 8 für eine Beschwerde.',
      ],
    },
    {
      heading: '11. Minderjährige',
      paragraphs: ['MitiMiti ist nur für Personen über 18 Jahre. Wir speichern nicht wissentlich Daten von Minderjährigen; erfahren wir davon, löschen wir sie.'],
    },
    {
      heading: '12. Änderungen dieser Erklärung',
      paragraphs: [
        'Wenn wir diese Erklärung ändern, aktualisieren wir das Datum oben und informieren dich in der App, bevor wichtige Änderungen gelten. Wollen wir deine Daten für einen neuen Zweck nutzen, bitten wir dich um eine neue Einwilligung.',
        'Diese Erklärung gibt es auf Spanisch, Englisch und Deutsch. Bei Abweichungen gilt die spanische Fassung.',
      ],
    },
  ],
  contact: 'Schreib uns',
};
