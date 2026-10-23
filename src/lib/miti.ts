// Miti, the MitiMiti mascot and logo: one circle split in two halves, green and coral. Drawn from
// assets/brand/miti-neutral.svg; the Welcome screen (src/ui/Miti.tsx) and the PDF export both use this markup, so
// the logo is the same everywhere. Artwork, like the Google and Apple logos: the same colours in light and dark.

export const MITI_COLORS = { green: '#0E8C7A', coral: '#FF7A59', ink: '#1A2238' } as const;

const { green, coral, ink } = MITI_COLORS;

const ART =
  `<path d="M97 8A92 92 0 0 0 97 192C107 140 87 60 97 8Z" fill="${green}"/>` +
  `<path d="M103 8C93 60 113 140 103 192A92 92 0 0 0 103 8Z" fill="${coral}"/>` +
  '<path d="M36 66Q44 44 62 30" fill="none" stroke="#FFFFFF" stroke-opacity=".3" stroke-width="7" stroke-linecap="round"/>' +
  '<circle cx="52" cy="128" r="12" fill="#FFB8A6" opacity="0.45"/>' +
  '<circle cx="148" cy="128" r="12" fill="#FFE3DA" opacity="0.75"/>' +
  `<ellipse cx="72" cy="100" rx="10.5" ry="13.5" fill="${ink}"/>` +
  '<circle cx="75.5" cy="94.5" r="3.6" fill="#FFFFFF"/>' +
  `<ellipse cx="128" cy="100" rx="10.5" ry="13.5" fill="${ink}"/>` +
  '<circle cx="131.5" cy="94.5" r="3.6" fill="#FFFFFF"/>' +
  `<path d="M82 130Q100 148 118 130" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Miti as standalone SVG markup, `size` × `size`. */
export function mitiSvg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true">${ART}</svg>`;
}
