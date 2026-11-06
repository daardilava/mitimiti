import { describe, expect, it } from 'vitest';
import { MITI_COLORS, mitiSvg, WORDMARK_ON_LIGHT, wordmarkHtml } from '../miti';

describe('mitiSvg', () => {
  it('draws Miti at the requested size, on the 200-unit artboard', () => {
    const svg = mitiSvg(22);
    expect(svg).toMatch(/^<svg [^>]*width="22" height="22" viewBox="0 0 200 200"/);
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('uses the brand colours for the two halves and the face', () => {
    const svg = mitiSvg(100);
    for (const c of Object.values(MITI_COLORS)) expect(svg).toContain(`fill="${c}"`);
  });

  it('is hidden from screen readers: the name next to it says it', () => {
    expect(mitiSvg(10)).toContain('aria-hidden="true"');
    expect(mitiSvg(10, { ariaHidden: false })).not.toContain('aria-hidden');
  });
});

describe('wordmarkHtml', () => {
  it('writes MitiMiti in Verde Miti then Coral texto, the colours that read on white', () => {
    expect(wordmarkHtml()).toBe(`<span style="color:${WORDMARK_ON_LIGHT.green}">Miti</span><span style="color:${WORDMARK_ON_LIGHT.coral}">Miti</span>`);
    expect(wordmarkHtml().replace(/<[^>]+>/g, '')).toBe('MitiMiti');
  });
});
