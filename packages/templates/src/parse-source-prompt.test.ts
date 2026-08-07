import { describe, expect, it } from 'vitest'
import {
  defaultMotionSitesTemplate,
  listTemplates,
  parseSourcePrompt,
  truncateSourcePrompt,
  SOURCE_PROMPT_BRIEF_MAX,
} from './index.js'

describe('defaultMotionSitesTemplate', () => {
  it('picks the first catalogue entry with a non-empty sourcePrompt', () => {
    const expected = listTemplates().find((template) => template.sourcePrompt.trim().length > 0)
    expect(defaultMotionSitesTemplate()?.id).toBe(expected?.id)
    expect(defaultMotionSitesTemplate()?.id).toBe('interactive-discovery')
  })
})

describe('parseSourcePrompt', () => {
  it('extracts heading/body fonts and hex colours from a MotionSites brief', () => {
    const hints = parseSourcePrompt(`
### Fonts
- Body/UI font: **Inter**.
- Display/wordmark accent: **Playfair Display, italic**.
CTA button: bg-[#e8702a] hover:bg-[#d2611f]
Navbar: px-6 sm:px-10 lg:px-16, py-5 lg:py-7
Heading scales text-5xl sm:text-7xl md:text-8xl.
`)

    expect(hints.fontHeading).toBe('Playfair Display')
    expect(hints.fontBody).toBe('Inter')
    expect(hints.colors).toContain('#e8702a')
    expect(hints.primaryHint).toBe('#e8702a')
    expect(hints.spacingConstraints[0]).toMatch(/Respect MotionSites spacing/)
    expect(hints.spacingConstraints[0]).toMatch(/px-6/)
    expect(hints.spacingConstraints[0]).toMatch(/sm:px-10|lg:px-16|sm:text-7xl/)
  })

  it('maps labelled Google Font pairings', () => {
    const hints = parseSourcePrompt(`
- **Font pairing (Google Fonts):** Heading **Orbitron** (400–700), Body **Exo 2** (300–600)
- Primary \`#8B5CF6\` (purple tech)
- CTA \`#FBBF24\` (gold value)
`)
    expect(hints.fontHeading).toBe('Orbitron')
    expect(hints.fontBody).toBe('Exo 2')
    expect(hints.primaryHint).toBe('#8b5cf6')
    expect(hints.accentHint).toBe('#fbbf24')
  })

  it('returns empty hints for an empty prompt', () => {
    expect(parseSourcePrompt('')).toEqual({ colors: [], spacingConstraints: [] })
    expect(parseSourcePrompt(null)).toEqual({ colors: [], spacingConstraints: [] })
  })
})

describe('truncateSourcePrompt', () => {
  it('keeps short prompts intact and truncates long ones', () => {
    expect(truncateSourcePrompt('short')).toBe('short')
    const long = 'x'.repeat(SOURCE_PROMPT_BRIEF_MAX + 50)
    const truncated = truncateSourcePrompt(long)
    expect(truncated.length).toBe(SOURCE_PROMPT_BRIEF_MAX)
    expect(truncated.endsWith('…')).toBe(true)
  })
})
