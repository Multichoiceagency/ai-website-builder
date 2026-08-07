/**
 * Load a Google Font family into the document once, and keep CSS variables in sync.
 *
 * Used by the theme Style Guide: picking a heading/body font must paint the
 * preview immediately, which means the face has to be on the page before the
 * next paint — not after a full reload.
 */

const loaded = new Set<string>()

/** Curated Google Fonts for heading/body pickers. Names match the CSS family. */
export const GOOGLE_FONT_OPTIONS = [
  { label: 'Figtree', value: 'Figtree' },
  { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans' },
  { label: 'Inter', value: 'Inter' },
  { label: 'DM Sans', value: 'DM Sans' },
  { label: 'Outfit', value: 'Outfit' },
  { label: 'Manrope', value: 'Manrope' },
  { label: 'Space Grotesk', value: 'Space Grotesk' },
  { label: 'Rubik', value: 'Rubik' },
  { label: 'Work Sans', value: 'Work Sans' },
  { label: 'Source Sans 3', value: 'Source Sans 3' },
  { label: 'Instrument Serif', value: 'Instrument Serif' },
  { label: 'Fraunces', value: 'Fraunces' },
  { label: 'Libre Baskerville', value: 'Libre Baskerville' },
  { label: 'Source Serif 4', value: 'Source Serif 4' },
  { label: 'Lora', value: 'Lora' },
  { label: 'Merriweather', value: 'Merriweather' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Cormorant Garamond', value: 'Cormorant Garamond' },
] as const

export type GoogleFontName = (typeof GOOGLE_FONT_OPTIONS)[number]['value']

function hrefFor(family: string): string {
  const query = family.replace(/ /g, '+')
  return `https://fonts.googleapis.com/css2?family=${query}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`
}

/** Ensure the family is linked in `<head>`. Idempotent. */
export function ensureGoogleFont(family: string): void {
  const name = family.trim()
  if (!name || loaded.has(name) || typeof document === 'undefined') return

  const id = `gf-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  if (document.getElementById(id)) {
    loaded.add(name)
    return
  }

  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = hrefFor(name)
  document.head.appendChild(link)
  loaded.add(name)
}

export function useGoogleFont() {
  return { ensureGoogleFont, options: GOOGLE_FONT_OPTIONS }
}
