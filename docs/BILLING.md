# MitiMiti — Billing runbook (Phase 6)

A step-by-step guide to set up Premium in the stores and RevenueCat by hand. What the code does and why:
[PLAN.md › Phase 6](PLAN.md#phase-6--billing-current) and [ARCHITECTURE.md › How billing fits together](ARCHITECTURE.md#how-billing-fits-together).

Checked against the official docs on **2026-10-23**. Steps marked **⚠️ check before following** could not be
re-read that day: open the linked page first, because store consoles change often.

**The ids this runbook uses must match exactly** (the app and RevenueCat look them up by name):

| What | Value |
| --- | --- |
| Entitlement (RevenueCat) | `premium` |
| Offering (RevenueCat) | `default`, with the packages **Monthly** (`$rc_monthly`) and **Annual** (`$rc_annual`) |
| Products | `premium_monthly`, `premium_yearly` (App Store; Google Play: the same subscription ids, base plans `monthly` / `yearly`) |
| Trial | 7 days free on `premium_yearly` only |
| Bundle id / package | `com.mitimiti.app` |

---

## 0. Start without any store: RevenueCat Test Store

You can build and test the whole flow **before** paying for the Apple Developer Program or Google Play Console.
RevenueCat's [Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store) runs inside the app:
a purchase shows a RevenueCat sheet with *success*, *failure* and *cancel* buttons, updates the customer, grants the
entitlement and shows in the dashboard as sandbox data.

1. Create the RevenueCat project (section 3.1).
2. **Apps and providers › Test configuration › Test Store**: create it. Its API key is shown there and under
   **Project Settings › API keys**.
3. **Product catalog › Products**: create `premium_monthly` and `premium_yearly` for the Test Store. They can't be
   edited after saving: to change a price, create a new product and swap it into the offering.
4. Create the entitlement and the offering (section 3.3), attaching the Test Store products.
5. In `.env`, put the Test Store key in **both** `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, and make a development build (`npx eas-cli@latest build --profile
   development --platform android`). The SDK is native: Expo Go only runs RevenueCat's mocks.
6. Deploy the two functions (README › *Deploy the billing webhook*), then buy on the phone. The app calls
   `billing-sync` right after the purchase, which reads RevenueCat's REST API and writes the couple's row, so the
   app unlocks even if the webhook doesn't fire for Test Store purchases (the docs don't say whether it does).

> **Never ship a Test Store key.** RevenueCat makes release builds with it crash on purpose. Switch to the platform
> keys (section 3.2) before any TestFlight or Play testing track.
>
> Only the `development` profile is a development build. `preview` and `production` are **release** builds, so their
> EAS environments take the platform keys (`appl_…`, `goog_…`), never `test_…`. Test Store purchases need a
> `development` build. If a `test_` key still reaches a release build, the app opens without purchases: the paywall
> says the store is unavailable, and the log shows `[purchases] RevenueCat Test Store key in a release build`
> (`src/lib/purchasesMode.ts`).

---

## 1. Accounts and agreements

### Apple

1. Join the [Apple Developer Program](https://developer.apple.com/programs/) (paid, yearly). You need it for In-App
   Purchase, TestFlight and *Sign in with Apple*.
2. In [App Store Connect](https://appstoreconnect.apple.com/) › **Business**, accept the **Paid Apps agreement**,
   then fill in **tax** and **banking**
   ([agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements),
   [banking](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information),
   [tax](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)).
   Subscriptions can't be sold until these are active.
3. **App Store Small Business Program:** 15 % commission instead of the standard rate for developers with no more
   than US$1 million in proceeds the year before, new developers included
   ([program](https://developer.apple.com/app-store/small-business-program/), [enrol](https://developer.apple.com/app-store/small-business-program/enroll/)).
   Enrol as the Account Holder after accepting the Paid Apps agreement.

### Google

1. Create a [Google Play Console](https://play.google.com/console) developer account (one-time fee) and set up the
   **payments profile** (merchant account) for selling.
2. **⚠️ check before following:** new **personal** developer accounts must run a **closed test** with a minimum
   number of testers opted in for a minimum number of days before they can apply for production access
   ([requirements](https://support.google.com/googleplay/android-developer/answer/14151465)). Plan the beta (Phase 4)
   around it: it is also when subscriptions get tested.
3. **Service fee:** outside Australia, the EEA, Japan, the UK and the US, subscriptions pay **15 %**; in those five,
   10 % plus a 5 % billing fee ([service fees](https://support.google.com/googleplay/android-developer/answer/112622)).

---

## 2. Products

### App Store Connect

[Offer auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/):

1. **Apps › MitiMiti › Monetization › Subscriptions › +**: create the group, reference name **Premium**. One group
   only: both plans are levels of the same thing, so a person can't hold both (and the app never offers a second one
   to the partner).
2. In the group, **Create**:
   - `premium_yearly`: duration **1 year**.
   - `premium_monthly`: duration **1 month**.
3. **Subscription Prices**: 19,99 € and 2,99 € as the base, then check each country's price.
   - The decision (PLAN.md) is 2,99 €/month and 19,99 €/year, with regional prices for COP and USD.
   - **Suggestion, yours to decide:** US$2.99 / US$19.99, and in Colombia the closest price points to COP 9.900 /
     69.900.
4. **Availability**: the countries to sell in.
5. **Introductory offer** on `premium_yearly`: *Free*, **1 week**, for new subscribers. Apple gives one introductory
   offer per subscription group per Apple Account.
6. **Localization** (group and each subscription): display name and description in es, en, de. For example
   *Premium para los dos · anual*: "Historial completo, presupuestos y exportar, para los dos."
7. **Review Information**: a **screenshot of the paywall** (`src/app/paywall.tsx`) and the review note from
   section 5.
8. **Your first subscription and its group are submitted together with a new app version.** Later subscriptions
   can go on their own.

### Google Play Console

[Create and manage subscriptions](https://support.google.com/googleplay/android-developer/answer/140504):

1. **Monetize with Play › Products › Subscriptions › Create subscription**: product id `premium_yearly`, name
   *Premium (anual)*. Ids use lowercase letters, numbers, `_` and `.`, and can never be changed or reused.
2. **Add base plan** `yearly`: **auto-renewing**, billing period **yearly**. Set the grace period and account hold,
   then the price: **Update prices** for all countries, then adjust Colombia and the US by hand.
3. **Add offer** on `yearly`: id `trial-7d`, eligibility **new customer acquisition**, one phase **free trial,
   7 days** (Google allows 3 days to 3 years).
4. Repeat for `premium_monthly` with base plan `monthly` (billing period **monthly**), without an offer.
5. **Activate** each base plan and offer.

In RevenueCat, the Play products show as `premium_yearly:yearly` and `premium_monthly:monthly`.

---

## 3. RevenueCat

### 3.1 Project and apps

[Connect a store](https://www.revenuecat.com/docs/projects/connect-a-store):

1. [RevenueCat](https://app.revenuecat.com/) › **Create project** *MitiMiti*.
2. **Apps › + App Store**: bundle id `com.mitimiti.app`, the **In-App Purchase Key** (App Store Connect › Users and
   Access › Integrations), and preferably an **App Store Connect API key**, so products are imported.
3. **Apps › + Play Store**: package `com.mitimiti.app` and the **service credentials JSON**.
   **⚠️ check before following** ([service credentials](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials)):
   - In Google Cloud, enable the Play APIs and create a service account with a JSON key.
   - In Play Console › **Users and permissions**, invite that account with the financial and order permissions.
   - It can take up to about 36 hours before RevenueCat accepts it.

### 3.2 API keys → the app and the server

**Project Settings › API keys**:

| Key | Where it goes |
| --- | --- |
| Public **App Store** key (`appl_…`) | `.env` › `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (EAS: the same name as an environment variable of the build profile) |
| Public **Play Store** key (`goog_…`) | `.env` › `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` |
| **Secret** key (`sk_…`) | Never in the app: `npx supabase secrets set REVENUECAT_SECRET_API_KEY=sk_…` (for `billing-sync`) |

### 3.3 Entitlement and offering

1. **Product catalog › Entitlements › +** `premium`. Attach `premium_monthly` and `premium_yearly` from each store
   (and the Test Store ones while testing).
2. **Product catalog › Offerings › +** `default`, mark it **current**, and add two packages using RevenueCat's
   standard types: **Monthly** → `premium_monthly`, **Annual** → `premium_yearly`, for each store. The app shows
   only Monthly and Annual (`src/lib/offerings.ts`), with yearly selected.

### 3.4 Webhook to Supabase

Follow README › [Deploy the billing webhook](../README.md#deploy-the-billing-webhook):

1. Set the two secrets.
2. Deploy `revenuecat-webhook` and `billing-sync`.
3. In RevenueCat › **Integrations › Webhooks**, add `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
   with the `Bearer …` Authorization value.
4. Send a test event and check it appears in `billing_events` (Supabase › Table editor).

### 3.5 Store server notifications (so RevenueCat hears about renewals and cancellations quickly)

- **App Store**, **⚠️ check before following**
  ([Apple server notifications](https://www.revenuecat.com/docs/platform-resources/server-notifications/apple-server-notifications)):
  copy the URL from RevenueCat's App Store app settings into App Store Connect › **MitiMiti › App Information ›
  App Store Server Notifications**, for Production and Sandbox, version 2.
- **Google Play** ([Google server notifications](https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications)):
  1. Enable **Pub/Sub** in the Google Cloud project of the service account.
  2. In RevenueCat's Play app settings, **Connect to Google** and copy the **Pub/Sub topic id**.
  3. In Play Console › **Monetize › Monetization setup › Real-time developer notifications**, paste it as *Topic
     name*. Choose *Subscriptions, voided purchases, and all one-time products*, and save.
  4. Press **Send test notification**; RevenueCat shows *Last received*. If it fails, give
     `google-play-developer-notifications@system.gserviceaccount.com` the **Pub/Sub Publisher** role on the topic.

---

## 4. Testing

The acceptance checks to run: [PLAN.md › Phase 6](PLAN.md#phase-6--billing-current). Use two phones, one per partner.

### iOS: sandbox and TestFlight

[Apple sandbox](https://www.revenuecat.com/docs/test-and-launch/sandbox/apple-app-store):

1. App Store Connect › **Users and Access › Sandbox Testers**: create one per person, with emails you can verify.
   Set the region to test a currency (Colombia for COP).
2. TestFlight builds use your real Apple Account, but **purchases run in the sandbox**: nothing is charged.
3. Sandbox renewals are fast. A subscription renews at most **12 times a day**, then expires:

   | Period | Renews every |
   | --- | --- |
   | 1 week | 3 minutes |
   | 1 month | 5 minutes |
   | 1 year | 1 hour |

### Android: license testers and a closed track

[Google Play sandbox](https://www.revenuecat.com/docs/test-and-launch/sandbox/google-play-store):

1. Play Console › **Settings › License testing**: add both Google accounts to a list, select it, save.
2. Upload a signed build (EAS) to a **closed testing** track, open the opt-in link on each phone, and wait until the
   release is available. Only then do test cards appear.
3. Test renewals are fast too, at most **6 renewals**:

   | Period | Renews every |
   | --- | --- |
   | 1 month | 5 minutes |
   | 1 year | 30 minutes |

### What to try, and what to expect

| Try | Expect |
| --- | --- |
| Buy yearly (trial) on phone A | Both phones Premium within seconds (A after *Activando Premium…*, B through Realtime). Ajustes: *Prueba gratis hasta el …* |
| Open the paywall on phone B | *Diego ya activó Premium*, no purchase button |
| Wait for a renewal | Ajustes keeps *Se renueva el …*, with the new date |
| Cancel in the store's subscription settings | Premium until the date; Ajustes says *Termina el …* (cancellations can take up to ~2 hours to arrive) |
| Let it expire | Free: older months and Presupuestos locked, every expense still there, the balance unchanged |
| Delete the app, reinstall, sign in, **Restaurar compras** | Premium back |
| Buy on Android, look at the partner's iPhone | Premium there too |
| Billing issue (Google: a test card that declines; Apple: see [failing renewals](https://developer.apple.com/documentation/storekit/testing-failing-subscription-renewals-and-in-app-purchases)) | Ajustes shows the store couldn't charge, with *Revisar el pago*; Premium until the grace period ends |
| Delete the payer's account | The couple's data is erased; the app said the subscription must be cancelled in the store |
| Delete the account of the partner who doesn't pay; the payer then creates (or joins) a new couple | The old couple's data is erased; the payer's store subscription keeps running, and the new couple is Premium right after Setup |
| Both partners subscribe (both phones on the paywall while Free, buy on each) | Premium stays while either subscription runs; the one that lasts longer is shown in Ajustes. Cancel it and let it expire: the couple goes back to Premium through the other one at the latest when that phone next opens the app |

If a phone doesn't unlock, check:

1. Supabase › `billing_events`: did the event arrive?
2. `subscriptions`: is there a row for the couple?
3. Edge Function logs: `revenuecat-webhook` and `billing-sync`. `other_payer` means the event belonged to the partner's
   own subscription while the couple's row was another, longer one: expected when both pay.

---

## 5. Release checklist

- [ ] **Platform keys**, not the Test Store key, in the production build's environment (`appl_…`, `goog_…`).
- [ ] Billing migrations pushed (`npx supabase db push`), both functions deployed, both secrets set, the webhook
      test event received.
- [ ] Clerk **production** instance, with `mitimiti://sso-callback` in its allowlist.
- [ ] **Privacy labels (Apple)** and **Data safety (Google)** updated for purchases: *Purchase history*, linked to
      the user, for app functionality. No payment data is collected by the app.
- [ ] Terms and Privacy (in the app) and the Privacy Policy URL in both store listings match what Premium does.
- [ ] Subscription metadata localized (es, en, de), with the paywall screenshot for review.
- [ ] **Review notes** (App Store Connect and Play Console), something like:
      > MitiMiti is for couples. One Premium subscription covers both members of a couple: when one buys it, the
      > other account in the same couple gets Premium too, and their paywall shows it's already active, with no
      > second purchase. The core app (expenses, balance, settling up) is free. To test: sign up with the demo
      > account below, then buy the yearly plan (7-day trial) from Ajustes › Tu plan › Ver Premium.
      > Demo account: … (create one for review, with a partner already joined).
- [ ] App Store: the first subscription submitted **with** the app version.
- [ ] Enrolled in the Small Business Program (Apple); 15 % tier checked (Google).
- [ ] Nobody is charged before the Phase 4 beta: weeks of daily use first.
