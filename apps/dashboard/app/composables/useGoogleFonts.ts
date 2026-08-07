/**
 * Curated Google Fonts for the site Style Guide, plus a runtime loader that
 * injects a family the moment the picker selects it so canvas samples update
 * without a reload.
 */

export interface SiteFontOption {
  family: string
  /** Google Fonts `family=` token (spaces as +). */
  googleFamily: string
  weights: number[]
  kind: 'sans' | 'serif' | 'display'
}

/** Allow-list suitable for marketing sites — heading + body pairs stay readable. */
export const SITE_GOOGLE_FONTS: SiteFontOption[] = [
  { family: 'Figtree', googleFamily: 'Figtree', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Rubik', googleFamily: 'Rubik', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'DM Sans', googleFamily: 'DM+Sans', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Manrope', googleFamily: 'Manrope', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Outfit', googleFamily: 'Outfit', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Public Sans', googleFamily: 'Public+Sans', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Source Sans 3', googleFamily: 'Source+Sans+3', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'IBM Plex Sans', googleFamily: 'IBM+Plex+Sans', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Nunito Sans', googleFamily: 'Nunito+Sans', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Work Sans', googleFamily: 'Work+Sans', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Karla', googleFamily: 'Karla', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Libre Franklin', googleFamily: 'Libre+Franklin', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Sora', googleFamily: 'Sora', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Lexend', googleFamily: 'Lexend', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Atkinson Hyperlegible', googleFamily: 'Atkinson+Hyperlegible', weights: [400, 700], kind: 'sans' },
  { family: 'Schibsted Grotesk', googleFamily: 'Schibsted+Grotesk', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Bricolage Grotesque', googleFamily: 'Bricolage+Grotesque', weights: [400, 500, 600, 700], kind: 'sans' },
  { family: 'Instrument Serif', googleFamily: 'Instrument+Serif', weights: [400], kind: 'serif' },
  { family: 'Lora', googleFamily: 'Lora', weights: [400, 500, 600, 700], kind: 'serif' },
  { family: 'Merriweather', googleFamily: 'Merriweather', weights: [400, 700], kind: 'serif' },
  { family: 'Source Serif 4', googleFamily: 'Source+Serif+4', weights: [400, 600, 700], kind: 'serif' },
  { family: 'Libre Baskerville', googleFamily: 'Libre+Baskerville', weights: [400, 700], kind: 'serif' },
  { family: 'EB Garamond', googleFamily: 'EB+Garamond', weights: [400, 500, 600, 700], kind: 'serif' },
  { family: 'Cormorant Garamond', googleFamily: 'Cormorant+Garamond', weights: [400, 500, 600, 700], kind: 'serif' },
  { family: 'Literata', googleFamily: 'Literata', weights: [400, 500, 600, 700], kind: 'serif' },
  { family: 'Newsreader', googleFamily: 'Newsreader', weights: [400, 500, 600, 700], kind: 'serif' },
  { family: 'Playfair Display', googleFamily: 'Playfair+Display', weights: [400, 500, 600, 700], kind: 'display' },
  { family: 'Young Serif', googleFamily: 'Young+Serif', weights: [400], kind: 'display' },
  { family: 'Calistoga', googleFamily: 'Calistoga', weights: [400], kind: 'display' },
  { family: 'Abril Fatface', googleFamily: 'Abril+Fatface', weights: [400], kind: 'display' },
  { family: 'Bebas Neue', googleFamily: 'Bebas+Neue', weights: [400], kind: 'display' },
]

const loaded = new Set<string>()

function stylesheetHref(option: SiteFontOption): string {
  const weights = option.weights.join(';')
  const axis = option.weights.length > 1 ? `:wght@${weights}` : option.weights[0] === 400 ? '' : `:wght@${weights}`
  return `https://fonts.googleapis.com/css2?family=${option.googleFamily}${axis}&display=swap`
}

function findOption(family: string): SiteFontOption | undefined {
  const needle = family.trim().toLowerCase()
  return SITE_GOOGLE_FONTS.find((entry) => entry.family.toLowerCase() === needle)
}

/** Ensure a Google Font family is present in the document `<head>`. */
export function ensureGoogleFontLoaded(family: string): void {
  if (!import.meta.client) return
  const trimmed = family.trim()
  if (!trimmed) return

  const option = findOption(trimmed)
  const key = trimmed.toLowerCase()
  if (loaded.has(key)) return
  loaded.add(key)

  if (document.querySelector(`link[data-site-font="${CSS.escape(key)}"]`)) return

  const href = option
    ? stylesheetHref(option)
    : `https://fonts.googleapis.com/css2?family=${encodeURIComponent(trimmed).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.siteFont = key
  document.head.appendChild(link)
}

export function useGoogleFonts() {
  const fontOptions = SITE_GOOGLE_FONTS
  const fontSelectOptions = SITE_GOOGLE_FONTS.map((entry) => ({
    label: entry.family,
    value: entry.family,
  }))

  function ensureLoaded(family: string) {
    ensureGoogleFontLoaded(family)
  }

  return { fontOptions, fontSelectOptions, ensureLoaded, findOption }
}
