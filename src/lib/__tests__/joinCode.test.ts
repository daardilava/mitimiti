import { describe, expect, it } from 'vitest';
import { joinCodeStatus, normalizeJoinCode } from '../joinCode';

describe('normalizeJoinCode', () => {
  it('upper-cases and drops spaces, dashes and symbols', () => {
    expect(normalizeJoinCode(' am-48 2x ')).toBe('AM482X');
    expect(normalizeJoinCode('ñ#a')).toBe('A');
  });

  it('keeps at most 6 characters', () => {
    expect(normalizeJoinCode('ABCDEFGH')).toBe('ABCDEF');
  });
});

describe('joinCodeStatus', () => {
  it('counts what is missing', () => {
    expect(joinCodeStatus('')).toEqual({ kind: 'incomplete', missing: 6 });
    expect(joinCodeStatus('AM48')).toEqual({ kind: 'incomplete', missing: 2 });
  });

  it('is ready at 6 valid characters', () => {
    expect(joinCodeStatus('AM482X')).toEqual({ kind: 'ready' });
  });

  it('flags characters that never appear in a code', () => {
    expect(joinCodeStatus('AM4821')).toEqual({ kind: 'ambiguous' });
    expect(joinCodeStatus('O')).toEqual({ kind: 'ambiguous' });
    expect(joinCodeStatus('I0')).toEqual({ kind: 'ambiguous' });
  });
});
