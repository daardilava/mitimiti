// Checks that the Clerk instance behind EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is set up the way the app signs people in:
// email + password (email code to verify), Google (and Apple), and no sign-up fields the app does not ask for.
// Reads only Clerk's public Frontend API, the same settings the app downloads on launch.
//   npm run clerk:check
// process.exitCode instead of process.exit(): exiting right after fetch() crashes Node on Windows.
import { Buffer } from 'node:buffer';

process.exitCode = await main();

async function main() {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
  const match = /^pk_(test|live)_(.+)$/.exec(key);
  if (!match) {
    console.error('✗ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing or not a Clerk publishable key (pk_test_… / pk_live_…). Set it in .env.');
    return 1;
  }
  const frontendApi = Buffer.from(match[2], 'base64').toString('utf8').replace(/\$$/, '');
  console.log(`Clerk ${match[1] === 'test' ? 'development' : 'production'} instance: ${frontendApi}\n`);

  const res = await fetch(`https://${frontendApi}/v1/environment?_is_native=1`);
  if (!res.ok) {
    console.error(`✗ Clerk answered ${res.status} for /v1/environment. Is the key from the right instance?`);
    return 1;
  }
  const env = await res.json();
  const { attributes, social, sign_up: signUp } = env.user_settings;

  const problems = [];
  const warnings = [];
  const check = (ok, message, fix, level = 'error') => {
    console.log(`${ok ? '✓' : level === 'error' ? '✗' : '!'} ${message}`);
    if (!ok) (level === 'error' ? problems : warnings).push(fix);
  };

  const email = attributes.email_address ?? {};
  const password = attributes.password ?? {};
  check(email.enabled && email.used_for_first_factor,
    'People sign in with their email address',
    'User & authentication › Email: turn on "Sign-in with email".');
  check(email.verifications?.includes('email_code') && email.verify_at_sign_up,
    'New email addresses are verified with a 6-digit code at sign-up',
    'User & authentication › Email: turn on "Verify at sign-up" with "Email verification code".');
  check(password.enabled && password.required,
    'Sign-up and sign-in use a password (Iniciar sesión / Crea tu cuenta)',
    'User & authentication › Password: turn on "Sign-up with password".');
  for (const name of ['first_name', 'last_name', 'username', 'phone_number']) {
    check(!(attributes[name]?.enabled && attributes[name]?.required),
      `${name} is not required at sign-up (the app keeps the name itself)`,
      `User & authentication: make ${name} optional or turn it off.`);
  }
  check(social.oauth_google?.enabled && social.oauth_google?.authenticatable,
    'Google is enabled for sign-up and sign-in',
    'SSO connections › Add connection › Google, "Enable for sign-up and sign-in".');
  check(social.oauth_apple?.enabled && social.oauth_apple?.authenticatable,
    'Apple is enabled for sign-up and sign-in',
    'SSO connections › Add connection › Apple, or the Apple button will show an error.', 'warning');
  check(signUp.mode === 'public' && !signUp.allowlist_only,
    `Anyone can sign up (mode: ${signUp.mode})`,
    'Configure › Restrictions: sign-up mode is restricted, so new partners cannot create an account.', 'warning');
  console.log('');
  if (warnings.length) console.log(`Warnings:\n${warnings.map((w) => `  - ${w}`).join('\n')}\n`);
  if (problems.length) {
    console.log(`Fix in the Clerk Dashboard:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    return 1;
  }
  console.log('Clerk is set up for MitiMiti.');
  return 0;
}
