import { describe, expect, it } from 'vitest';
import { DEFAULT_PCT_PRESETS, myDefaultPct, parseSharePct, settingsErrorMessage, shareLabel } from '../coupleSettings';

describe('default split choices', () => {
  it('offers 70/30, 60/40, 40/60 and 30/70 from my side', () => {
    expect([...DEFAULT_PCT_PRESETS]).toEqual([70, 60, 40, 30]);
    expect(shareLabel(65, 'Ana')).toBe('Tú 65% · Ana 35%');
  });

  it('accepts any whole share from 1 to 99 typed by hand', () => {
    expect(parseSharePct('65')).toBe(65);
    expect(parseSharePct(' 80 % ')).toBe(80);
    expect(parseSharePct('1')).toBe(1);
    expect(parseSharePct('99')).toBe(99);
  });

  it('refuses what is not a share', () => {
    for (const bad of ['', '0', '100', '-5', '62.5', '6,5', 'abc', '150']) expect(parseSharePct(bad), bad).toBeNull();
  });
});

describe('couple settings', () => {
  it('each person sees their own share of the proportional default', () => {
    expect(myDefaultPct('owner', 60)).toBe(60);
    expect(myDefaultPct('member', 60)).toBe(40);
  });

  it('explains every refusal in Spanish', () => {
    expect(settingsErrorMessage(new Error('currency_locked'))).toMatch(/nunca se convierten/);
    expect(settingsErrorMessage({ message: 'partner_joined' })).toMatch(/desde su app/);
    expect(settingsErrorMessage({ message: 'name_required' })).toBe('Escribe un nombre.');
    expect(settingsErrorMessage({ message: 'name_too_long' })).toMatch(/40/);
    expect(settingsErrorMessage({ message: 'invalid_pct' })).toMatch(/1 % y 99 %/);
    expect(settingsErrorMessage({ message: 'invalid_avatar' })).toMatch(/avatar/);
    expect(settingsErrorMessage(new TypeError('Network request failed'))).toMatch(/conexión/);
  });
});
