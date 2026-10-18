import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  authErrorMessage,
  AuthFlowError,
  canSignUp,
  clerkErrorCode,
  finishPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  startPasswordReset,
  suggestedFirstName,
  verifyDevice,
  verifySignUp,
  type AuthSignIn,
  type AuthSignUp,
} from '../authFlow';

// authErrorMessage logs unrecognised errors; keep test output clean.
beforeAll(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const ok = async () => ({ error: null });
const apiError = (code: string) => ({ errors: [{ code, message: code }] });
const CODE = '123456';

/** A fake Clerk sign-in for diego@example.com / "correcta-123". `newDevice` makes Clerk ask for a device code. */
function fakeSignIn({ newDevice = false } = {}) {
  const s = {
    status: null as string | null,
    create: vi.fn(async ({ identifier }: { identifier: string }) => {
      if (identifier !== 'diego@example.com') return { error: apiError('form_identifier_not_found') };
      s.status = 'needs_first_factor';
      return { error: null };
    }),
    password: vi.fn(async ({ emailAddress, password }: { emailAddress: string; password: string }) => {
      if (emailAddress !== 'diego@example.com') return { error: apiError('form_identifier_not_found') };
      if (password !== 'correcta-123') return { error: apiError('form_password_incorrect') };
      s.status = newDevice ? 'needs_client_trust' : 'complete';
      return { error: null };
    }),
    mfa: {
      sendEmailCode: vi.fn(ok),
      verifyEmailCode: vi.fn(async ({ code }: { code: string }) => {
        if (code !== CODE) return { error: apiError('form_code_incorrect') };
        s.status = 'complete';
        return { error: null };
      }),
    },
    resetPasswordEmailCode: {
      sendCode: vi.fn(ok),
      verifyCode: vi.fn(async ({ code }: { code: string }) => {
        if (code !== CODE) return { error: apiError('form_code_incorrect') };
        s.status = 'needs_new_password';
        return { error: null };
      }),
      submitPassword: vi.fn(async ({ password }: { password: string }) => {
        if (password.length < 8) return { error: apiError('form_password_length_too_short') };
        s.status = 'complete';
        return { error: null };
      }),
    },
    finalize: vi.fn(ok),
  };
  return s satisfies AuthSignIn;
}

function fakeSignUp({ statusAfterVerify = 'complete', taken = [] as string[] } = {}) {
  const s = {
    status: null as string | null,
    password: vi.fn(async ({ emailAddress }: { emailAddress: string }) => {
      if (taken.includes(emailAddress)) return { error: apiError('form_identifier_exists') };
      s.status = 'missing_requirements';
      return { error: null };
    }),
    verifications: {
      sendEmailCode: vi.fn(ok),
      verifyEmailCode: vi.fn(async ({ code }: { code: string }) => {
        if (code !== CODE) return { error: apiError('form_code_incorrect') };
        s.status = statusAfterVerify;
        return { error: null };
      }),
    },
    finalize: vi.fn(ok),
  };
  return s satisfies AuthSignUp;
}

const errorOf = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e);

describe('sign in with password', () => {
  it('activates the session with the right password', async () => {
    const signIn = fakeSignIn();
    expect(await signInWithPassword(signIn, '  Diego@Example.com ', 'correcta-123')).toBe('done');
    expect(signIn.password).toHaveBeenCalledWith({ emailAddress: 'diego@example.com', password: 'correcta-123' });
    expect(signIn.finalize).toHaveBeenCalledOnce();
  });

  it('says the password is wrong and activates nothing', async () => {
    const signIn = fakeSignIn();
    const error = await errorOf(signInWithPassword(signIn, 'diego@example.com', 'otra'));
    expect(authErrorMessage(error)).toMatch(/contraseña no es correcta/);
    expect(signIn.finalize).not.toHaveBeenCalled();
  });

  it('suggests signing up for an unknown email', async () => {
    const error = await errorOf(signInWithPassword(fakeSignIn(), 'nadie@example.com', 'x'));
    expect(authErrorMessage(error)).toMatch(/registrarte/);
  });

  it('asks for an email code on a new device, then signs in', async () => {
    const signIn = fakeSignIn({ newDevice: true });
    expect(await signInWithPassword(signIn, 'diego@example.com', 'correcta-123')).toBe('verify-device');
    expect(signIn.mfa.sendEmailCode).toHaveBeenCalledOnce();
    expect(signIn.finalize).not.toHaveBeenCalled();

    expect(clerkErrorCode(await errorOf(verifyDevice(signIn, '000000')))).toBe('form_code_incorrect');
    await verifyDevice(signIn, CODE);
    expect(signIn.finalize).toHaveBeenCalledOnce();
  });
});

describe('sign up with password', () => {
  const input = { fullName: ' Diego Ardila ', email: 'Ana@Example.com', password: 'larga-segura', acceptedTerms: true };

  it('only enables the button with a name, a valid email, 8+ characters and the terms accepted', () => {
    expect(canSignUp(input)).toBe(true);
    expect(canSignUp({ ...input, fullName: '  ' })).toBe(false);
    expect(canSignUp({ ...input, email: 'ana@' })).toBe(false);
    expect(canSignUp({ ...input, password: 'corta' })).toBe(false);
    expect(canSignUp({ ...input, acceptedTerms: false })).toBe(false);
  });

  it('creates the account with the name, mails a code, and activates the session after it', async () => {
    const signUp = fakeSignUp();
    await signUpWithPassword(signUp, input);
    expect(signUp.password).toHaveBeenCalledWith({
      emailAddress: 'ana@example.com',
      password: 'larga-segura',
      unsafeMetadata: { fullName: 'Diego Ardila' },
      legalAccepted: true,
    });
    expect(signUp.verifications.sendEmailCode).toHaveBeenCalledOnce();

    await verifySignUp(signUp, CODE);
    expect(signUp.finalize).toHaveBeenCalledOnce();
  });

  it('points an existing email to sign-in instead', async () => {
    const error = await errorOf(signUpWithPassword(fakeSignUp({ taken: ['ana@example.com'] }), input));
    expect(authErrorMessage(error)).toMatch(/Inicia sesión/);
  });

  it('stops when Clerk still wants something the app does not ask for', async () => {
    const signUp = fakeSignUp({ statusAfterVerify: 'missing_requirements' });
    await signUpWithPassword(signUp, input);
    expect(await errorOf(verifySignUp(signUp, CODE))).toBeInstanceOf(AuthFlowError);
    expect(signUp.finalize).not.toHaveBeenCalled();
  });
});

describe('forgot password', () => {
  it('mails a code, saves the new password and signs in, closing other sessions', async () => {
    const signIn = fakeSignIn();
    await startPasswordReset(signIn, ' DIEGO@example.com');
    expect(signIn.create).toHaveBeenCalledWith({ identifier: 'diego@example.com' });
    expect(signIn.resetPasswordEmailCode.sendCode).toHaveBeenCalledOnce();

    await finishPasswordReset(signIn, CODE, 'nueva-larga');
    expect(signIn.resetPasswordEmailCode.submitPassword).toHaveBeenCalledWith({ password: 'nueva-larga', signOutOfOtherSessions: true });
    expect(signIn.finalize).toHaveBeenCalledOnce();
  });

  it('lets the person fix a rejected password without checking the code twice', async () => {
    const signIn = fakeSignIn();
    await startPasswordReset(signIn, 'diego@example.com');
    expect(authErrorMessage(await errorOf(finishPasswordReset(signIn, CODE, 'corta')))).toMatch(/más segura/);

    await finishPasswordReset(signIn, CODE, 'nueva-larga');
    expect(signIn.resetPasswordEmailCode.verifyCode).toHaveBeenCalledOnce();
    expect(signIn.finalize).toHaveBeenCalledOnce();
  });
});

describe('suggestedFirstName', () => {
  it('prefers the name typed at sign-up, then Google / Apple', () => {
    expect(suggestedFirstName({ unsafeMetadata: { fullName: 'Diego Ardila' }, firstName: 'D' })).toBe('Diego');
    expect(suggestedFirstName({ unsafeMetadata: {}, firstName: 'Ana', fullName: 'Ana Gómez' })).toBe('Ana');
    expect(suggestedFirstName({ fullName: 'Ana Gómez' })).toBe('Ana');
    expect(suggestedFirstName(null)).toBeNull();
  });
});

describe('authErrorMessage', () => {
  it('maps Clerk codes to Spanish and falls back to a connection message', () => {
    expect(authErrorMessage(apiError('form_password_pwned'))).toMatch(/filtración/);
    expect(authErrorMessage(apiError('strategy_for_user_invalid'))).toMatch(/Google o Apple/);
    expect(authErrorMessage({ code: 'too_many_requests' })).toMatch(/Demasiados intentos/);
    expect(authErrorMessage(new TypeError('Network request failed'))).toMatch(/conexión/);
  });

  it('explains when Clerk has passwords turned off (codes captured from the real Frontend API)', () => {
    expect(authErrorMessage(apiError('form_param_unknown'))).toMatch(/no está activada/);
    expect(authErrorMessage(apiError('form_param_value_invalid'))).toMatch(/no está activada/);
  });
});
