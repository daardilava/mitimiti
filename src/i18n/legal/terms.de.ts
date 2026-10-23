// AGB von MitiMiti auf Deutsch: eine Übersetzung von terms.es.ts, das die verbindliche Fassung ist.
import { LEGAL_CONTACT, type LegalDoc } from './types';

const { owner, email } = LEGAL_CONTACT;

export const termsDe: LegalDoc = {
  effective: 'Gültig ab dem 20. Oktober 2026',
  intro:
    'Diese Bedingungen erklären, was MitiMiti ist, was du von der App erwarten kannst und was wir von den Menschen erwarten, die sie nutzen. Mit dem Erstellen deines Kontos akzeptierst du sie. Wenn du nicht einverstanden bist, nutze die App nicht.',
  sections: [
    {
      heading: '1. Wer die App anbietet',
      paragraphs: [`MitiMiti wird von ${owner} angeboten, einer Privatperson mit Wohnsitz in Kolumbien („wir“). Du erreichst uns unter ${email}.`],
    },
    {
      heading: '2. Was MitiMiti ist',
      paragraphs: [
        'MitiMiti hilft zwei Menschen, ihre gemeinsamen Ausgaben zu erfassen, festzulegen, wie jede aufgeteilt wird, und zu sehen, wer wem etwas schuldet.',
        'Die App erfasst nur. Sie bewegt kein Geld, verbindet sich nicht mit Banken und speichert keine Karten- oder Kontodaten. Wenn ihr abrechnet, geschieht die Zahlung außerhalb der App und wird dort nur vermerkt.',
        'Der Saldo wird aus dem berechnet, was ihr erfasst. MitiMiti ist keine Finanz-, Buchhaltungs-, Steuer- oder Rechtsberatung.',
      ],
    },
    {
      heading: '3. Dein Konto',
      paragraphs: [
        'Um MitiMiti zu nutzen, musst du über 18 Jahre alt sein.',
        'Du kannst dich mit E-Mail und Passwort, mit Google oder mit Apple anmelden. Gib uns wahre Angaben, schütze den Zugang zu deinem Konto und sag uns Bescheid, wenn du glaubst, dass jemand anderes es nutzt.',
        'Jedes Konto ist persönlich. Du bist für das verantwortlich, was damit geschieht.',
      ],
    },
    {
      heading: '4. Das gemeinsame Konto',
      paragraphs: [
        'Jeder Bereich in MitiMiti ist für genau zwei Personen. Dein Partner oder deine Partnerin tritt mit einem Einladungscode bei; teile ihn nur mit dieser Person.',
        'Beide sehen die gemeinsamen Ausgaben, Zahlungen, Budgets und Einstellungen und können sie bearbeiten. Jede Änderung wird festgehalten, mit wem und wann.',
        'Der Saldo ist nur so richtig wie das Erfasste. Prüft Unterschiede gemeinsam: MitiMiti entscheidet nicht, wer recht hat.',
      ],
    },
    {
      heading: '5. Zulässige Nutzung',
      paragraphs: [
        'Nutze MitiMiti nicht für illegale Zwecke, um eine andere Person zu belästigen oder zu täuschen, oder um Daten einer Person ohne ihre Erlaubnis zu erfassen.',
        'Versuche nicht, auf Daten anderer Paare zuzugreifen, den Dienst zu stören oder die App zu kopieren, zu dekompilieren oder weiterzuverkaufen.',
      ],
    },
    {
      heading: '6. Preis',
      paragraphs: [
        'MitiMiti ist heute kostenlos. Wenn wir künftig einen kostenpflichtigen Plan anbieten, sagen wir es dir vorher, du siehst den Preis, bevor du zustimmst, und wir berechnen dir nie etwas ohne deine ausdrückliche Zustimmung.',
      ],
    },
    {
      heading: '7. Deine Daten',
      paragraphs: [
        'Wir verarbeiten deine personenbezogenen Daten nach dem kolumbianischen Gesetz 1581 von 2012 und seinen Durchführungsbestimmungen sowie nach der Datenschutzerklärung von MitiMiti. Dort erklären wir, welche Daten wir speichern, wofür, mit wem wir sie teilen und wie du deine Rechte ausübst.',
        'Du kannst dein Konto jederzeit unter Einstellungen › Konto löschen oder uns dafür schreiben.',
      ],
    },
    {
      heading: '8. Der Dienst',
      paragraphs: [
        'Wir arbeiten daran, dass MitiMiti gut funktioniert und genau rechnet, aber die App wird so angeboten, wie sie ist, und kann Fehler oder Ausfälle haben. Wir können Funktionen ändern, verbessern oder entfernen.',
        'Wenn wir die App nicht mehr anbieten, sagen wir es dir mindestens 30 Tage vorher, damit du deine Informationen sichern kannst.',
      ],
    },
    {
      heading: '9. Haftung',
      paragraphs: [
        'Soweit gesetzlich zulässig, haften wir nicht für Entscheidungen oder Vereinbarungen zwischen euch, die auf den Informationen der App beruhen, und nicht für Verluste durch falsch erfasste Daten oder den Missbrauch deines Kontos.',
        'Nichts in diesen Bedingungen schränkt deine Rechte aus dem kolumbianischen Gesetz 1480 von 2011 (Verbraucherschutzgesetz) oder anderen unverzichtbaren Vorschriften ein.',
      ],
    },
    {
      heading: '10. Geistiges Eigentum',
      paragraphs: [
        'Die App, ihr Design, ihr Code und ihre Marke gehören ihrem Inhaber. Was du erfasst, gehört dir; du erlaubst uns, es zu speichern und dir und deinem Partner oder deiner Partnerin anzuzeigen, nur um den Dienst zu erbringen.',
      ],
    },
    {
      heading: '11. Beendigung',
      paragraphs: [
        'Du kannst MitiMiti jederzeit nicht mehr nutzen und dein Konto löschen.',
        'Wir können ein Konto sperren oder schließen, das gegen diese Bedingungen verstößt. Außer bei einer Gefahr für andere oder einer gesetzlichen Pflicht sagen wir es dir vorher und nennen den Grund.',
      ],
    },
    {
      heading: '12. Änderungen dieser Bedingungen',
      paragraphs: [
        'Wenn wir diese Bedingungen ändern, aktualisieren wir das Datum oben und informieren dich in der App, bevor wichtige Änderungen gelten. Wenn du MitiMiti nach diesem Datum weiter nutzt, akzeptierst du die neue Fassung.',
      ],
    },
    {
      heading: '13. Anwendbares Recht',
      paragraphs: [
        'Diese Bedingungen unterliegen dem Recht der Republik Kolumbien. Wenn du eine Beschwerde hast, schreib uns zuerst; lösen wir sie nicht, kannst du dich an die Superintendencia de Industria y Comercio (SIC) oder an die Gerichte Kolumbiens wenden.',
        'Diese Bedingungen gibt es auf Spanisch, Englisch und Deutsch. Bei Abweichungen gilt die spanische Fassung.',
      ],
    },
  ],
  contact: 'Schreib uns',
};
