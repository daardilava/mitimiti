// Terms and conditions of MitiMiti, in English: a translation of terms.es.ts, which is the binding version.
import { LEGAL_CONTACT, type LegalDoc } from './types';

const { owner, email } = LEGAL_CONTACT;

export const termsEn: LegalDoc = {
  effective: 'Effective from October 23, 2026',
  intro:
    'These terms explain what MitiMiti is, what you can expect from the app and what we expect from the people who use it. By creating your account you accept them. If you don’t agree, don’t use the app.',
  sections: [
    {
      heading: '1. Who offers the app',
      paragraphs: [`MitiMiti is offered by ${owner}, an individual domiciled in Colombia ("we"). You can write to us at ${email}.`],
    },
    {
      heading: '2. What MitiMiti is',
      paragraphs: [
        'MitiMiti helps two people record the expenses they share, decide how each one is split and see who owes whom.',
        'The app only keeps records. It doesn’t move money, doesn’t connect to banks and doesn’t store card or account details. When you settle up, the payment happens outside the app and is only noted in it.',
        'The balance is calculated from what you record. MitiMiti is not financial, accounting, tax or legal advice.',
      ],
    },
    {
      heading: '3. Your account',
      paragraphs: [
        'You must be over 18 to use MitiMiti.',
        'You can sign in with email and password, with Google or with Apple. Give us true information, keep access to your account safe and tell us if you think someone else is using it.',
        'Each account is personal. You are responsible for what is done with it.',
      ],
    },
    {
      heading: '4. The couple account',
      paragraphs: [
        'Each space in MitiMiti is for exactly two people. Your partner joins with an invite code; share it only with them.',
        'Both people can see and edit the shared expenses, payments, budgets and settings. Every change is recorded, with who made it and when.',
        'The balance is only as right as what is recorded. Review any difference together: MitiMiti doesn’t decide who is right.',
      ],
    },
    {
      heading: '5. Acceptable use',
      paragraphs: [
        'Don’t use MitiMiti for illegal activities, to harass or deceive another person, or to record someone’s data without their permission.',
        'Don’t try to access other couples’ data, interfere with the service, or copy, decompile or resell the app.',
      ],
    },
    {
      heading: '6. Price',
      paragraphs: [
        'MitiMiti has a free plan, with no end date, with the essentials: logging expenses, seeing the balance and settling up. Premium is a paid plan that adds features, such as the full history, budgets and export. Before accepting, you’ll see what it includes, the price and how often it is charged.',
        'Premium is a subscription per couple: one subscription covers both people in the space, whoever buys it. That is why, while the couple has Premium, the app doesn’t offer a second subscription.',
        'The purchase, billing, renewal, cancellation and refunds are handled by the store you buy it in (Apple’s App Store or Google Play), under its own terms. We never see your card or payment details.',
        'The subscription renews automatically at the end of each period unless you cancel it at least 24 hours before, in your store account settings. If it includes a free trial and you don’t cancel before it ends, billing starts that day.',
        'Deleting your account or no longer using the app doesn’t cancel the subscription: cancel it in the store. If Premium ends, nothing is deleted and the balance doesn’t change: the free plan only limits some screens.',
        'If we change the price, we’ll tell you in advance, and the store will ask you to accept it where it requires that.',
      ],
    },
    {
      heading: '7. Your data',
      paragraphs: [
        'We process your personal data under Colombian Law 1581 of 2012 and its regulations, and the MitiMiti Privacy Policy. It explains what data we keep, why, who we share it with and how to exercise your rights.',
        'You can delete your account at any time from Settings › Account, or by writing to us.',
      ],
    },
    {
      heading: '8. The service',
      paragraphs: [
        'We work to keep MitiMiti running well and its calculations exact, but the app is offered as is and may have errors or interruptions. We may change, improve or remove features.',
        'If we stop offering the app, we’ll tell you at least 30 days in advance so you can keep your information.',
      ],
    },
    {
      heading: '9. Liability',
      paragraphs: [
        'To the extent the law allows, we are not liable for decisions or agreements between you based on the app’s information, nor for losses caused by incorrectly recorded data or misuse of your account.',
        'Nothing in these terms limits the rights you have under Colombian Law 1480 of 2011 (Consumer Statute) or other rules that can’t be waived.',
      ],
    },
    {
      heading: '10. Intellectual property',
      paragraphs: [
        'The app, its design, code and brand belong to their owner. What you record is yours; you allow us to store it and show it to you and your partner only to provide the service.',
      ],
    },
    {
      heading: '11. Termination',
      paragraphs: [
        'You can stop using MitiMiti and delete your account at any time.',
        'We may suspend or close an account that breaks these terms. Unless there is a risk to other people or a legal obligation, we’ll tell you first and explain why.',
      ],
    },
    {
      heading: '12. Changes to these terms',
      paragraphs: [
        'If we change these terms, we’ll update the date above and tell you in the app before important changes apply. If you keep using MitiMiti after that date, you accept the new version.',
      ],
    },
    {
      heading: '13. Governing law',
      paragraphs: [
        'These terms are governed by the laws of the Republic of Colombia. If you have a complaint, write to us first; if we don’t resolve it, you can go to the Superintendence of Industry and Commerce (SIC) or the courts of Colombia.',
        'These terms are offered in Spanish, English and German. If the versions differ, the Spanish version prevails.',
      ],
    },
  ],
  contact: 'Write to us',
};
