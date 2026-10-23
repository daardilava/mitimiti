// Privacy Policy of MitiMiti, in English: a translation of privacy.es.ts, which is the binding version.
import { LEGAL_CONTACT, type LegalDoc } from './types';

const { owner, email, city } = LEGAL_CONTACT;

export const privacyEn: LegalDoc = {
  effective: 'Effective from October 20, 2026',
  intro:
    'This policy explains what personal data MitiMiti keeps, why, who it shares it with, how long it keeps it, and how you can see it, correct it or ask for it to be deleted.',
  sections: [
    {
      heading: '1. Data controller',
      paragraphs: [`${owner}, an individual domiciled in ${city}. Email for anything about your data: ${email}.`],
    },
    {
      heading: '2. What data we keep',
      paragraphs: [
        'From your account: your name, your email and your password. The password is stored encrypted by our sign-in provider; we never see it. If you sign in with Google or Apple, they give us your name, your email and an identifier. For security, the provider also records your sessions, the device and the IP address you sign in from.',
        'From the couple: each person’s name (including the name you invite your partner with before they join), the avatar, the currency, the default split and the invite code.',
        'What you record: each expense (amount, description, category, date, who paid and how it is split), each payment between you (amount, method and date) and the budgets.',
        'A history of changes: who created, edited or deleted each expense or payment, and when. We also keep attempts to join with a code, to prevent abuse.',
        'Your phone keeps your session, in the system’s secure storage, and your language and appearance preferences.',
        'We don’t ask for sensitive data. We don’t keep bank or card details, your location, your contacts or your photos. Please don’t write sensitive data in expense descriptions.',
      ],
    },
    {
      heading: '3. What we use it for',
      paragraphs: [
        'To create and protect your account; to show you and your partner what you record and calculate the balance; to keep both phones in sync; to prevent fraud and abuse; to answer your questions; to tell you about changes to the app or these texts; and to meet legal obligations.',
        'We don’t sell your data, don’t use it for advertising and don’t build profiles of you for third parties.',
      ],
    },
    {
      heading: '4. Your authorization',
      paragraphs: [
        'By creating your account and accepting this policy, you authorize us to process your data for the purposes above. You can withdraw that authorization at any time by deleting your account or writing to us.',
        'If you enter your partner’s name before they join, you confirm they allowed you to. When they join, they accept this policy with their own account.',
      ],
    },
    {
      heading: '5. Who we share it with',
      paragraphs: [
        'With your partner: they see everything shared in your space, including your name and avatar.',
        'With the providers that help us run the service, who only use your data for that and under our instructions: Clerk (sign-in, United States) and Supabase (database, hosted in Ireland, European Union). If you sign in with Google or Apple, they take part in signing in too.',
        'With authorities, only when the law requires it.',
      ],
    },
    {
      heading: '6. International transfer',
      paragraphs: [
        'Your data is stored outside Colombia: in Ireland (European Union) and in the United States. These are countries that Colombia’s Superintendence of Industry and Commerce recognizes as having an adequate level of data protection, and we choose providers with contractual security and confidentiality commitments.',
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
        'Our providers’ backups may keep that data for up to 30 more days, until they are replaced. We only keep anything longer if the law requires it.',
      ],
    },
    {
      heading: '9. Your rights',
      paragraphs: [
        'Under Colombian Law 1581 of 2012 you can: know, update and correct your data; ask for proof of your authorization; find out how we use it; withdraw your authorization and ask us to delete it; file complaints with the Superintendence of Industry and Commerce after contacting us; and access your data free of charge.',
        'If you live in the European Union, you also have the rights of the General Data Protection Regulation: access, portability, objection and restriction of processing, and to lodge a complaint with your country’s data protection authority.',
      ],
    },
    {
      heading: '10. How to exercise them',
      paragraphs: [
        'You can do much of it in the app: in Settings you change your name and avatar, and from Settings › Account you can delete your account. For anything else, write to us from your account’s email, so we can confirm it’s you.',
        'We answer requests within 10 business days and complaints within 15 business days at most. If we need more time we’ll tell you why, and it will never be more than 5 extra business days for a request or 8 for a complaint.',
      ],
    },
    {
      heading: '11. Minors',
      paragraphs: ['MitiMiti is only for people over 18. We don’t knowingly keep data of minors; if we find out we do, we delete it.'],
    },
    {
      heading: '12. Changes to this policy',
      paragraphs: [
        'If we change this policy, we’ll update the date above and tell you in the app before important changes apply. If we want to use your data for a new purpose, we’ll ask for a new authorization.',
        'This policy is offered in Spanish, English and German. If the versions differ, the Spanish version prevails.',
      ],
    },
  ],
  contact: 'Write to us',
};
