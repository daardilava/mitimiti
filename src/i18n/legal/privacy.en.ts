// Privacy Policy of MitiMiti, in English: a translation of privacy.es.ts, which is the binding version.
import { LEGAL_CONTACT, type LegalDoc } from './types';

const { owner, email, address } = LEGAL_CONTACT;

export const privacyEn: LegalDoc = {
  effective: 'Effective from November 3, 2026',
  intro:
    'This policy explains what personal data MitiMiti keeps, why and on what legal basis, who it shares it with, how long it keeps it, and how you can see it, correct it or ask for it to be deleted.',
  sections: [
    {
      heading: '1. Data controller',
      paragraphs: [`${owner}, an individual, ${address}, Germany. Email for anything about your data: ${email}.`],
    },
    {
      heading: '2. What data we keep',
      paragraphs: [
        'From your account: your name, your email and your password. The password is stored encrypted by our sign-in provider; we never see it. If you sign in with Google or Apple, they give us your name, your email and an identifier. For security, the provider also records your sessions, the device and the IP address you sign in from.',
        'From the couple: each person’s name (including the name you invite your partner with before they join), the avatar, the currency, the default split and the invite code.',
        'What you record: each expense (amount, description, category, date, who paid, how it is split and how it was logged: in the form, typed, dictated or from a receipt photo), each payment between you (amount, method and date) and the budgets.',
        'If you use Dictate: your phone does the speech recognition (Apple’s or Google’s, under their policies) and reads the text on the phone; MitiMiti never receives the audio, only the expense you confirm. If you use Scan (Premium), the receipt photo is sent to propose the expense and is not kept: the photo does not stay with MitiMiti, only the expense you confirm.',
        'A history of changes: who created, edited or deleted each expense or payment, and when. We also keep attempts to join with a code, to prevent abuse.',
        'If the couple buys Premium: the store (Apple or Google) processes the payment, and we never see your card or payment details. Through RevenueCat, we receive the subscription’s status linked to your account: the product, the store, whether it is a trial, the purchase, renewal and end dates, and the store’s notices about that purchase.',
        'Your phone keeps your session, in the system’s secure storage, and your language and appearance preferences.',
        'We don’t ask for sensitive data. We don’t keep bank or card details, your location, your contacts or your photos. Please don’t write sensitive data in expense descriptions.',
      ],
    },
    {
      heading: '3. What we use it for, and on what legal basis',
      paragraphs: [
        'To provide the service you ask for when you create your account (Article 6(1)(b) GDPR): to create your account, show you and your partner what you record and calculate the balance, keep both phones in sync, answer your questions, open the Premium features if the couple has it and, if you use it, propose expenses with AI reading.',
        'For our legitimate interest in offering a safe and reliable service (Article 6(1)(f) GDPR): to protect your account, prevent fraud and abuse, keep the history of changes and the attempts to join with a code, and tell you about changes to the app or these texts.',
        'To meet legal obligations (Article 6(1)(c) GDPR), for example answering an authority or keeping what the law requires.',
        'We don’t sell your data, don’t use it for advertising and don’t build profiles of you for third parties. We don’t make automated decisions about you: AI reading only proposes a draft, and you decide whether to save it.',
      ],
    },
    {
      heading: '4. Required data and your partner’s data',
      paragraphs: [
        'We need your name and your email to create your account; without them you can’t use MitiMiti. Everything else you record yourself, whenever you want, and AI reading is optional.',
        'If you enter your partner’s name before they join, you confirm that you may do so and that you’ll tell them you use MitiMiti. When they join, they accept this policy with their own account.',
        'If you live in Colombia, by creating your account and accepting this policy you give us the authorization required by Colombian Law 1581 of 2012 to process your data for these purposes. You can withdraw it at any time by deleting your account or writing to us.',
      ],
    },
    {
      heading: '5. Who we share it with',
      paragraphs: [
        'With your partner: they see everything shared in your space, including your name and avatar.',
        'With the providers that help us run the service, who only use your data for that, under our instructions and under a data processing agreement (Article 28 GDPR): Clerk (sign-in, United States) and Supabase (database, hosted in Ireland, European Union). If you sign in with Google or Apple, they take part in signing in too.',
        'If you buy Premium: RevenueCat (subscription management, United States) receives your account identifier and the purchase’s status, and Apple or Google process the payment as controllers of their own store, under their policies.',
        'If you use Scan: Anthropic (artificial intelligence model, United States) receives the receipt photo, today’s date, the app language and the couple’s currency, only to propose the expense draft. It does not receive your names, the balance or your other expenses.',
        'With authorities, only when the law requires it.',
      ],
    },
    {
      heading: '6. International transfers',
      paragraphs: [
        'The database is in Ireland, within the European Union. Clerk, RevenueCat and Anthropic are in the United States. Those transfers rely on the EU-U.S. Data Privacy Framework when the provider is certified and, otherwise, on the European Commission’s standard contractual clauses (Articles 45 and 46 GDPR). You can ask us for a copy of those safeguards.',
        'If you live in Colombia, your data is processed outside Colombia: in Germany, Ireland and the United States. These are countries that Colombia’s Superintendence of Industry and Commerce recognizes as having an adequate level of data protection.',
      ],
    },
    {
      heading: '7. How we protect it',
      paragraphs: [
        'Connections are encrypted. In the database, every row is protected so that only the two people in a couple can read or change it. Your session is kept in the phone’s secure storage, and every change is recorded.',
        'No system is infallible. If an incident affects your data, we’ll tell you and report it to the authority when required.',
      ],
    },
    {
      heading: '8. How long we keep it',
      paragraphs: [
        'As long as you have an account. An expense or payment you delete is no longer shown, but is kept marked as deleted while its couple exists, so the history of changes is complete.',
        'If you delete your account, we delete your sign-in account, your profile and the whole couple space: its expenses, payments, budgets and history, for your partner too. The app warns you before you confirm.',
        'The purchase notices we keep about you are deleted with your account. RevenueCat, Apple and Google keep their own records of the purchase under their policies and any legal obligations they have (for example, accounting).',
        'Our providers’ backups may keep that data for up to 30 more days, until they are replaced. We only keep anything longer if the law requires it.',
      ],
    },
    {
      heading: '9. Your rights',
      paragraphs: [
        'Under the GDPR you can: access your data and get a copy; correct it; ask us to delete it; restrict its processing; receive it in a structured format to take it to another service; object to processing based on our legitimate interest; and withdraw at any time any consent you have given us, without affecting what was done before.',
        'You can also lodge a complaint with a data protection authority, especially the one in the EU country where you live. The authority responsible for us is that of the state of Hesse, Germany: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, in Wiesbaden.',
        'If you live in Colombia, Law 1581 of 2012 also lets you: know, update and correct your data; ask for proof of your authorization; find out how we use it; withdraw your authorization and ask us to delete it; file complaints with the Superintendence of Industry and Commerce after contacting us; and access your data free of charge.',
      ],
    },
    {
      heading: '10. How to exercise them',
      paragraphs: [
        'You can do much of it in the app: in Settings you change your name and avatar, and from Settings › Account you can delete your account. For anything else, write to us from your account’s email, so we can confirm it’s you. It’s free.',
        'We answer within one month at most. If the request is complex, we can extend that by up to two more months, and we’ll tell you why within the first month.',
        'If you live in Colombia, we answer requests within 10 business days and complaints within 15 business days at most. If we need more time we’ll tell you why, and it will never be more than 5 extra business days for a request or 8 for a complaint.',
      ],
    },
    {
      heading: '11. Minors',
      paragraphs: ['MitiMiti is only for people over 18. We don’t knowingly keep data of minors; if we find out we do, we delete it.'],
    },
    {
      heading: '12. Changes to this policy',
      paragraphs: [
        'If we change this policy, we’ll update the date above and tell you in the app before important changes apply. If we want to use your data for a new purpose, we’ll tell you first and, where the law requires it, ask for your consent.',
        'This policy is offered in Spanish, English and German. If the versions differ, the Spanish version prevails.',
      ],
    },
  ],
  contact: 'Write to us',
};
