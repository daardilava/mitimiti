// Datenschutzerklärung von MitiMiti auf Deutsch: eine Übersetzung von privacy.es.ts, das die verbindliche Fassung ist.
import { LEGAL_CONTACT, type LegalDoc } from './types';

const { owner, email, address } = LEGAL_CONTACT;

export const privacyDe: LegalDoc = {
  effective: 'Gültig ab dem 3. November 2026',
  intro:
    'Diese Erklärung beschreibt, welche personenbezogenen Daten MitiMiti speichert, wofür und auf welcher Rechtsgrundlage, mit wem sie geteilt werden, wie lange sie aufbewahrt werden und wie du sie einsehen, berichtigen oder löschen lassen kannst.',
  sections: [
    {
      heading: '1. Verantwortlicher',
      paragraphs: [`${owner}, Privatperson, ${address}, Deutschland. E-Mail für alles rund um deine Daten: ${email}.`],
    },
    {
      heading: '2. Welche Daten wir speichern',
      paragraphs: [
        'Aus deinem Konto: deinen Namen, deine E-Mail-Adresse und dein Passwort. Das Passwort speichert unser Anmeldedienst verschlüsselt; wir sehen es nie. Wenn du dich mit Google oder Apple anmeldest, erhalten wir von dort deinen Namen, deine E-Mail-Adresse und eine Kennung. Aus Sicherheitsgründen erfasst der Anbieter außerdem deine Sitzungen, das Gerät und die IP-Adresse, von der du dich anmeldest.',
        'Vom Paar: den Namen jeder Person (auch den Namen, mit dem du deinen Partner oder deine Partnerin einlädst, bevor er oder sie beitritt), den Avatar, die Währung, die Standardaufteilung und den Einladungscode.',
        'Was ihr erfasst: jede Ausgabe (Betrag, Beschreibung, Kategorie, Datum, wer bezahlt hat, wie sie aufgeteilt wird und wie sie erfasst wurde: im Formular, getippt, diktiert oder per Belegfoto), jede Zahlung zwischen euch (Betrag, Zahlungsart und Datum) und die Budgets.',
        'Wenn du Diktieren nutzt: Dein Telefon übernimmt die Spracherkennung (die von Apple oder Google, nach deren Richtlinien) und wertet den Text auf dem Telefon aus; MitiMiti erhält nie den Ton, nur die Ausgabe, die du bestätigst. Wenn ihr Scannen nutzt (Premium), wird das Belegfoto gesendet, um die Ausgabe vorzuschlagen, und nicht gespeichert: Das Foto bleibt nicht bei MitiMiti, nur die Ausgabe, die du bestätigst.',
        'Einen Änderungsverlauf: wer jede Ausgabe oder Zahlung erstellt, bearbeitet oder gelöscht hat, und wann. Außerdem speichern wir Versuche, mit einem Code beizutreten, um Missbrauch zu verhindern.',
        'Wenn das Paar Premium kauft: Der Store (Apple oder Google) wickelt die Zahlung ab, und wir sehen weder deine Karte noch deine Zahlungsdaten. Über RevenueCat erhalten wir den Status des Abos, verknüpft mit deinem Konto: das Produkt, den Store, ob es ein Test ist, die Kauf-, Verlängerungs- und Enddaten und die Meldungen des Stores zu diesem Kauf.',
        'Auf deinem Telefon bleiben deine Sitzung, im sicheren Speicher des Systems, und deine Einstellungen für Sprache und Darstellung.',
        'Wir fragen keine sensiblen Daten ab. Wir speichern keine Bank- oder Kartendaten, keinen Standort, keine Kontakte und keine Fotos. Bitte schreib keine sensiblen Daten in die Beschreibungen der Ausgaben.',
      ],
    },
    {
      heading: '3. Wofür wir sie nutzen und auf welcher Rechtsgrundlage',
      paragraphs: [
        'Um den Dienst zu erbringen, den du mit dem Erstellen deines Kontos anforderst (Art. 6 Abs. 1 lit. b DSGVO): dein Konto anlegen, dir und deinem Partner oder deiner Partnerin das Erfasste zeigen und den Saldo berechnen, beide Telefone synchron halten, deine Fragen beantworten, die Premium-Funktionen freischalten, wenn das Paar Premium hat, und, wenn ihr es nutzt, Ausgaben mit dem Lesen mit KI vorschlagen.',
        'Aufgrund unseres berechtigten Interesses an einem sicheren und zuverlässigen Dienst (Art. 6 Abs. 1 lit. f DSGVO): dein Konto schützen, Betrug und Missbrauch verhindern, den Änderungsverlauf und die Beitrittsversuche mit einem Code speichern und dich über Änderungen der App oder dieser Texte informieren.',
        'Um gesetzliche Pflichten zu erfüllen (Art. 6 Abs. 1 lit. c DSGVO), zum Beispiel Anfragen von Behörden zu beantworten oder aufzubewahren, was das Gesetz verlangt.',
        'Wir verkaufen deine Daten nicht, nutzen sie nicht für Werbung und erstellen keine Profile von dir für Dritte. Wir treffen keine automatisierten Entscheidungen über dich: Das Lesen mit KI schlägt nur einen Entwurf vor, und du entscheidest, ob du ihn speicherst.',
      ],
    },
    {
      heading: '4. Erforderliche Daten und Daten deines Partners oder deiner Partnerin',
      paragraphs: [
        'Für dein Konto brauchen wir deinen Namen und deine E-Mail-Adresse; ohne sie kannst du MitiMiti nicht nutzen. Alles andere erfasst du selbst, wann du willst, und das Lesen mit KI ist freiwillig.',
        'Wenn du den Namen deines Partners oder deiner Partnerin vor dem Beitritt einträgst, bestätigst du, dass du das darfst und der Person sagst, dass du MitiMiti nutzt. Beim Beitritt akzeptiert sie diese Erklärung mit ihrem eigenen Konto.',
        'Wenn du in Kolumbien lebst, erteilst du uns mit dem Erstellen deines Kontos und dem Akzeptieren dieser Erklärung die nach dem kolumbianischen Gesetz 1581 von 2012 erforderliche Einwilligung, deine Daten für diese Zwecke zu verarbeiten. Du kannst sie jederzeit widerrufen, indem du dein Konto löschst oder uns schreibst.',
      ],
    },
    {
      heading: '5. Mit wem wir sie teilen',
      paragraphs: [
        'Mit deinem Partner oder deiner Partnerin: Diese Person sieht alles, was in eurem Bereich geteilt wird, auch deinen Namen und deinen Avatar.',
        'Mit den Anbietern, die uns beim Betrieb helfen und deine Daten nur dafür, nach unseren Anweisungen und auf Grundlage eines Auftragsverarbeitungsvertrags (Art. 28 DSGVO) nutzen: Clerk (Anmeldung, Vereinigte Staaten) und Supabase (Datenbank, gehostet in Irland, Europäische Union). Wenn du dich mit Google oder Apple anmeldest, sind auch sie an der Anmeldung beteiligt.',
        'Wenn ihr Premium kauft: RevenueCat (Abo-Verwaltung, Vereinigte Staaten) erhält deine Konto-Kennung und den Status des Kaufs, und Apple oder Google wickeln die Zahlung als Verantwortliche ihres eigenen Stores nach ihren Richtlinien ab.',
        'Wenn ihr Scannen nutzt: Anthropic (KI-Modell, Vereinigte Staaten) erhält das Belegfoto, das heutige Datum, die Sprache der App und die Währung des Paares, nur um den Entwurf der Ausgabe vorzuschlagen. Anthropic erhält weder eure Namen noch den Saldo oder eure anderen Ausgaben.',
        'Mit Behörden, nur wenn das Gesetz es verlangt.',
      ],
    },
    {
      heading: '6. Internationale Übermittlungen',
      paragraphs: [
        'Die Datenbank liegt in Irland, innerhalb der Europäischen Union. Clerk, RevenueCat und Anthropic sitzen in den Vereinigten Staaten. Diese Übermittlungen stützen sich auf das EU-US Data Privacy Framework, wenn der Anbieter zertifiziert ist, und andernfalls auf die Standardvertragsklauseln der Europäischen Kommission (Art. 45 und 46 DSGVO). Du kannst eine Kopie dieser Garantien bei uns anfordern.',
        'Wenn du in Kolumbien lebst, werden deine Daten außerhalb Kolumbiens verarbeitet: in Deutschland, Irland und den Vereinigten Staaten. Die kolumbianische Aufsichtsbehörde Superintendencia de Industria y Comercio erkennt diesen Ländern ein angemessenes Datenschutzniveau zu.',
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
        'Die Kaufmeldungen, die wir zu dir speichern, werden mit deinem Konto gelöscht. RevenueCat, Apple und Google bewahren eigene Aufzeichnungen des Kaufs nach ihren Richtlinien und ihren gesetzlichen Pflichten auf (zum Beispiel buchhalterischen).',
        'Sicherungskopien unserer Anbieter können diese Daten bis zu 30 weitere Tage enthalten, bis sie ersetzt werden. Länger bewahren wir nur etwas auf, wenn das Gesetz es verlangt.',
      ],
    },
    {
      heading: '9. Deine Rechte',
      paragraphs: [
        'Nach der DSGVO kannst du: Auskunft über deine Daten und eine Kopie verlangen; sie berichtigen lassen; ihre Löschung verlangen; ihre Verarbeitung einschränken lassen; sie in einem strukturierten Format erhalten, um sie zu einem anderen Dienst mitzunehmen; der Verarbeitung widersprechen, die auf unserem berechtigten Interesse beruht; und eine erteilte Einwilligung jederzeit widerrufen, ohne dass das die bisherige Verarbeitung berührt.',
        'Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, insbesondere bei der des EU-Landes, in dem du lebst. Für uns zuständig ist der Hessische Beauftragte für Datenschutz und Informationsfreiheit in Wiesbaden.',
        'Wenn du in Kolumbien lebst, kannst du nach dem Gesetz 1581 von 2012 außerdem: deine Daten einsehen, aktualisieren und berichtigen; einen Nachweis deiner Einwilligung verlangen; erfahren, wie wir sie nutzen; deine Einwilligung widerrufen und die Löschung verlangen; dich nach einer Anfrage bei uns bei der Superintendencia de Industria y Comercio beschweren; und kostenlos auf deine Daten zugreifen.',
      ],
    },
    {
      heading: '10. Wie du sie ausübst',
      paragraphs: [
        'Vieles geht direkt in der App: In den Einstellungen änderst du deinen Namen und deinen Avatar, und unter Einstellungen › Konto kannst du dein Konto löschen. Für alles andere schreib uns von der E-Mail-Adresse deines Kontos, damit wir bestätigen können, dass du es bist. Das ist kostenlos.',
        'Wir antworten innerhalb von höchstens einem Monat. Ist die Anfrage aufwendig, können wir die Frist um bis zu zwei weitere Monate verlängern und sagen dir innerhalb des ersten Monats, warum.',
        'Wenn du in Kolumbien lebst, beantworten wir Anfragen innerhalb von höchstens 10 Werktagen und Beschwerden innerhalb von höchstens 15 Werktagen. Brauchen wir länger, sagen wir dir warum, und es werden nie mehr als 5 zusätzliche Werktage für eine Anfrage oder 8 für eine Beschwerde.',
      ],
    },
    {
      heading: '11. Minderjährige',
      paragraphs: ['MitiMiti ist nur für Personen über 18 Jahre. Wir speichern nicht wissentlich Daten von Minderjährigen; erfahren wir davon, löschen wir sie.'],
    },
    {
      heading: '12. Änderungen dieser Erklärung',
      paragraphs: [
        'Wenn wir diese Erklärung ändern, aktualisieren wir das Datum oben und informieren dich in der App, bevor wichtige Änderungen gelten. Wollen wir deine Daten für einen neuen Zweck nutzen, sagen wir es dir vorher und bitten dich, wo das Gesetz es verlangt, um deine Einwilligung.',
        'Diese Erklärung gibt es auf Spanisch, Englisch und Deutsch. Bei Abweichungen gilt die spanische Fassung.',
      ],
    },
  ],
  contact: 'Schreib uns',
};
