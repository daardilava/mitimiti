// The steps of signing in, signing up and resetting a password, without React or native modules, so Vitest covers them.
// src/api/auth.ts feeds these with Clerk's real useSignIn() / useSignUp() resources (Core 3 "future" API).

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

export async function verifyDevice(signIn: AuthSignIn, code: string): Promise<void> {
  await must(signIn.mfa.verifyEmailCode({ code }));
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

export async function verifySignUp(signUp: AuthSignUp, code: string): Promise<void> {
  await must(signUp.verifications.verifyEmailCode({ code }));
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

/** Spanish message for a Clerk error. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthFlowError) {
    return 'Tu cuenta necesita un paso más que la app aún no muestra. Intenta con Google o escríbenos.';
  }
  switch (clerkErrorCode(error)) {
    case 'form_password_incorrect':
      return 'La contraseña no es correcta. Inténtalo de nuevo o recupérala.';
    case 'form_identifier_not_found':
      return 'No encontramos una cuenta con ese correo. ¿Quieres registrarte?';
    case 'form_identifier_exists':
      return 'Ya hay una cuenta con ese correo. Inicia sesión.';
    case 'form_password_pwned':
      return 'Esa contraseña apareció en una filtración de datos. Elige otra.';
    case 'form_password_length_too_short':
    case 'form_password_validation_failed':
    case 'form_password_not_strong_enough':
      return `Usa una contraseña más segura, de al menos ${PASSWORD_MIN} caracteres.`;
    case 'form_code_incorrect':
      return 'Ese código no es correcto. Revísalo e inténtalo de nuevo.';
    case 'verification_expired':
    case 'verification_failed':
      return 'El código venció. Pide uno nuevo.';
    case 'too_many_requests':
    case 'user_locked':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    case 'form_param_format_invalid':
    case 'form_param_nil':
      return 'Revisa que el correo esté bien escrito.';
    case 'strategy_for_user_invalid':
      return 'Esta cuenta entra con Google o Apple. Usa ese botón.';
    case 'not_allowed_access':
    case 'sign_up_restricted':
    case 'oauth_access_denied':
      return 'Esta forma de entrar no está disponible para esta cuenta.';
    case 'session_exists':
    case 'identifier_already_signed_in':
      return 'Ya tienes una sesión abierta. Cierra la app y vuelve a abrirla.';
    // Clerk rejects a field or strategy its dashboard has turned off (e.g. passwords): a setup problem, not the person's.
    case 'form_param_unknown':
    case 'form_param_value_invalid':
      return 'Esta forma de entrar no está activada todavía. Usa Google mientras la configuramos.';
    default:
      // Shown in the Expo terminal so an unexpected Clerk answer can be traced instead of guessed.
      console.warn('[auth] unrecognised error', clerkErrorCode(error), error);
      return 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.';
  }
}
