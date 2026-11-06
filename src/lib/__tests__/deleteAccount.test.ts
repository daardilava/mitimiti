import { describe, expect, it } from 'vitest';
import { en } from '../../i18n/en';
import { deleteAccount, DeletionError, deletionErrorMessage, type DeletionSteps } from '../deleteAccount';

/** Records which steps ran, in order; any step can be made to fail. */
function steps(opts: { verified?: boolean; dataFails?: unknown; loginFails?: unknown } = {}) {
  const ran: string[] = [];
  const s: DeletionSteps = {
    recentlyVerified: () => opts.verified ?? true,
    deleteData: async () => {
      ran.push('data');
      if (opts.dataFails) throw opts.dataFails;
    },
    deleteLogin: async () => {
      ran.push('login');
      if (opts.loginFails) throw opts.loginFails;
    },
  };
  return { s, ran };
}

describe('deleteAccount', () => {
  it('deletes the data, then the login', async () => {
    const { s, ran } = steps();
    await expect(deleteAccount(s)).resolves.toBe('deleted');
    expect(ran).toEqual(['data', 'login']);
  });

  it('asks for a code first, without deleting anything, when the sign-in is not recent', async () => {
    const { s, ran } = steps({ verified: false });
    await expect(deleteAccount(s)).resolves.toBe('needs_code');
    expect(ran).toEqual([]);
  });

  it('never deletes the login when deleting the data failed', async () => {
    const { s, ran } = steps({ dataFails: new Error('network') });
    await expect(deleteAccount(s)).rejects.toMatchObject({ step: 'data' });
    expect(ran).toEqual(['data']);
  });

  it('reports a failed login step, so the person can try again', async () => {
    const { s } = steps({ loginFails: new Error('network') });
    await expect(deleteAccount(s)).rejects.toMatchObject({ step: 'login' });
  });

  it('asks for a code when Clerk says the verification ran out mid-way', async () => {
    const { s } = steps({ loginFails: { errors: [{ code: 'session_reverification_required' }] } });
    await expect(deleteAccount(s)).resolves.toBe('needs_code');
  });
});

describe('deletionErrorMessage', () => {
  it('says whether anything was deleted', () => {
    expect(deletionErrorMessage(new DeletionError('data', null))).toMatch(/no se borró nada/);
    expect(deletionErrorMessage(new DeletionError('login', null))).toMatch(/ya se borraron/);
    expect(deletionErrorMessage(new DeletionError('data', null), en)).toMatch(/nothing was deleted/);
  });

  it('explains a wrong code like the sign-in screens do', () => {
    expect(deletionErrorMessage({ errors: [{ code: 'form_code_incorrect' }] })).toMatch(/código no es correcto/);
  });
});
