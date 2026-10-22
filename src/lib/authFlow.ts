// The steps of signing in, signing up and resetting a password, without React or native modules, so Vitest covers them.
// src/api/auth.ts feeds these with Clerk's real useSignIn() / useSignUp() resources (Core 3 "future" API).
import { es, type Messages } from '../i18n/es';

type Result = Promise<{ error: unknown }>;

/** The slice of Clerk's SignInFuture these flows use. */
export interface AuthSignIn {
  readonly status: string | null;
  create: (params: { identifier: string }) => Result;
  password: (params: { emailAddress: string; password: string }) => Result;
  /** New-device check ("client trust") and email second factor. */
  mfa: {
    sendEmailCode: () => Result;
    verifyEmailCode: (params: { code: string }) => Result;
  };
  resetPasswordEmailCode: {
    sendCode: () => Result;
    verifyCode: (params: { code: string }) => Result;
    submitPassword: (params: { password: string; signOutOfOtherSessions?: boolean }) => Result;
  };
  finalize: () => Result;
}

/** The slice of Clerk's SignUpFuture these flows use. */
export interface AuthSignUp {
  readonly status: string | null;
  password: (params: { emailAddress: string; password: string; unsafeMetadata?: Record<string, unknown>; legalAccepted?: boolean }) => Result;
  verifications: {
    sendEmailCode: () => Result;
    verifyEmailCode: (params: { code: string }) => Result;
  };
  finalize: () => Result;
}

export const PASSWORD_MIN = 8;
export const CODE_LENGTH = 6;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const isEmail = (email: string) => EMAIL.test(email.trim());

// ─── Sign in ──────────────────────────────────────────────────────────────

/** 'done': the session is active. 'verify-device': Clerk mailed a code to confirm this new device; call verifyDevice. */
export type SignInStep = 'done' | 'verify-device';

export async function signInWithPassword(signIn: AuthSignIn, email: string, password: string): Promise<SignInStep> {
  await must(signIn.password({ emailAddress: normalizeEmail(email), password }));
  if (signIn.status === 'complete') {
    await must(signIn.finalize());
    return 'done';
  }
  if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
    await must(signIn.mfa.sendEmailCode());
    return 'verify-device';
  }
  throw new AuthFlowError(signIn.status);
}

/** Safe to call again: a code Clerk already accepted (a double tap, or a retry after finishing failed) just finishes. */
export async function verifyDevice(signIn: AuthSignIn, code: string): Promise<void> {
  if (signIn.status !== 'complete') await mustVerify(signIn.mfa.verifyEmailCode({ code }));
  await finish(signIn);
}

// ─── Sign up ──────────────────────────────────────────────────────────────

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}

export function canSignUp(v: SignUpInput): boolean {
  return v.fullName.trim().length > 0 && isEmail(v.email) && v.password.length >= PASSWORD_MIN && v.acceptedTerms;
}

/** Creates the account and mails a code to prove the address; call verifySignUp with it. */
export async function signUpWithPassword(signUp: AuthSignUp, v: SignUpInput): Promise<void> {
  // The name rides in unsafeMetadata so Clerk's name fields can stay off; Setup prefills "Tu nombre" from it.
  await must(
    signUp.password({
      emailAddress: normalizeEmail(v.email),
      password: v.password,
      unsafeMetadata: { fullName: v.fullName.trim() },
      legalAccepted: v.acceptedTerms,
    }),
  );
  await must(signUp.verifications.sendEmailCode());
}

/** Safe to call again, like verifyDevice. */
export async function verifySignUp(signUp: AuthSignUp, code: string): Promise<void> {
  if (signUp.status !== 'complete') await mustVerify(signUp.verifications.verifyEmailCode({ code }));
  if (signUp.status !== 'complete') throw new AuthFlowError(signUp.status);
  await must(signUp.finalize());
}

// ─── Forgot password ──────────────────────────────────────────────────────

export async function startPasswordReset(signIn: AuthSignIn, email: string): Promise<void> {
  await must(signIn.create({ identifier: normalizeEmail(email) }));
  await must(signIn.resetPasswordEmailCode.sendCode());
}

/** Checks the code, saves the new password and signs in. Safe to call again if only the password was rejected. */
export async function finishPasswordReset(signIn: AuthSignIn, code: string, password: string): Promise<void> {
  if (signIn.status !== 'needs_new_password') await must(signIn.resetPasswordEmailCode.verifyCode({ code }));
  // Someone who forgot their password may have left a session open on a lost phone; close the others.
  await must(signIn.resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions: true }));
  await finish(signIn);
}

// ─── Shared ───────────────────────────────────────────────────────────────

async function finish(signIn: AuthSignIn): Promise<void> {
  if (signIn.status !== 'complete') throw new AuthFlowError(signIn.status);
  await must(signIn.finalize());
}

async function must(result: Result): Promise<void> {
  const { error } = await result;
  if (error) throw error;
}

/** Like must, for a code check: "already verified" means a previous call got through, so it is not a failure. */
async function mustVerify(result: Result): Promise<void> {
  const { error } = await result;
  if (error && clerkErrorCode(error) !== 'verification_already_verified') throw error;
}

/** The first name to prefill in "Tu nombre": from the sign-up form, or from Google / Apple. */
export function suggestedFirstName(user: { unsafeMetadata?: Record<string, unknown>; fullName?: string | null; firstName?: string | null } | null | undefined): string | null {
  const typed = user?.unsafeMetadata?.fullName;
  const full = (typeof typed === 'string' && typed) || user?.firstName || user?.fullName || '';
  const first = full.trim().split(/\s+/)[0] ?? '';
  return first ? first.slice(0, 40) : null;
}

/** A sign-in or sign-up that Clerk accepted but could not finish, e.g. a step the app does not show. */
export class AuthFlowError extends Error {
  constructor(readonly status: string | null) {
    super(`auth_incomplete:${status}`);
  }
}

/** The first error code of a Clerk API error, or the code of a Clerk runtime error. */
export function clerkErrorCode(error: unknown): string | null {
  const e = error as { errors?: { code?: string }[]; code?: string } | null;
  return e?.errors?.[0]?.code ?? e?.code ?? null;
}

/** A Clerk error in the app's language. */
export function authErrorMessage(error: unknown, m: Messages = es): string {
  const e = m.authErrors;
  if (error instanceof AuthFlowError) {
    return e.incomplete;
  }
  switch (clerkErrorCode(error)) {
    case 'form_password_incorrect':
      return e.passwordIncorrect;
    case 'form_identifier_not_found':
      return e.noAccount;
    case 'form_identifier_exists':
      return e.accountExists;
    case 'form_password_pwned':
      return e.passwordPwned;
    case 'form_password_length_too_short':
    case 'form_password_validation_failed':
    case 'form_password_not_strong_enough':
      return e.passwordWeak(PASSWORD_MIN);
    case 'form_code_incorrect':
      return e.codeIncorrect;
    case 'verification_expired':
    case 'verification_failed':
      return e.codeExpired;
    case 'too_many_requests':
    case 'user_locked':
      return e.tooManyAttempts;
    case 'form_param_format_invalid':
    case 'form_param_nil':
      return e.checkEmail;
    case 'strategy_for_user_invalid':
      return e.useSocial;
    case 'not_allowed_access':
    case 'sign_up_restricted':
    case 'oauth_access_denied':
      return e.notAllowed;
    case 'session_exists':
    case 'identifier_already_signed_in':
      return e.sessionExists;
    // Clerk rejects a field or strategy its dashboard has turned off (e.g. passwords): a setup problem, not the person's.
    case 'form_param_unknown':
    case 'form_param_value_invalid':
      return e.notEnabled;
    default:
      // Shown in the Expo terminal so an unexpected Clerk answer can be traced instead of guessed.
      console.warn('[auth] unrecognised error', clerkErrorCode(error), error);
      return e.generic;
  }
}
