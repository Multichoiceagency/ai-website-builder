import { describe, expect, it } from 'vitest'
import { detectCodeBrief } from '../src/lib/ai/code-brief.js'
import { parseAssistModelText } from '../src/lib/ai/assist.js'

/**
 * The one decision that turns the chat into a builder: a spec goes to codegen,
 * a sentence goes to the registry. Both misroutes are expensive — a spec the
 * registry mangles, or a one-line edit that costs a minute-long build.
 */

const PLAIN_HTML_SPEC = `Build a single, self-contained HTML file: a full-viewport space-themed hero section
for a site called "SpaceEdu". No build step, no frameworks, no external JS. All CSS in
one <style> block in <head>, all JS in one <script> block before </body>. It must be
pixel-faithful to the spec below and fully mobile responsive. A looping video of a single
planet fills the whole viewport as the background. Centred over it: eyebrow "PLANET", a
huge serif planet name, a short cyan rule, a paragraph, and a glossy white pill button.
@media (max-width:579px){ .copy{display:flex} }`

const REACT_SPEC = `Create a cinematic hero in React + Tailwind with GSAP scroll reveal, full-bleed
video, glassmorphism CTA, backdrop-blur nav pill. Single file, default export, lucide-react icons.
Headline rises out of a mask, rule draws from centre, pills settle with a small scale resolve.
Mobile: stack the copy, hide the scroll cue under 660px height, keep the planet flank at 89u.`

describe('detectCodeBrief', () => {
  it('routes a plain HTML/CSS/JS spec to a hero build', () => {
    const brief = detectCodeBrief(PLAIN_HTML_SPEC)

    expect(brief?.target).toBe('hero')
    expect(brief?.title).toBe('SpaceEdu')
  })

  it('routes a React + Tailwind stack brief to codegen', () => {
    expect(detectCodeBrief(REACT_SPEC)?.target).toBe('hero')
  })

  it('infers header and footer targets from the brief', () => {
    const header = 'Build a sticky glass header with logo, four links and one CTA; mobile burger menu. '.repeat(4)
    const footer = 'Maak een footer met drie kolommen links, nieuwsbriefveld en juridische regel; stapelt op mobiel. '.repeat(3)

    expect(detectCodeBrief(header)?.target).toBe('header')
    expect(detectCodeBrief(footer)?.target).toBe('footer')
  })

  it('leaves a one-line edit to the registry', () => {
    expect(detectCodeBrief('make the hero blue')).toBeNull()
    expect(detectCodeBrief('Build a hero section')).toBeNull()
    expect(detectCodeBrief('add an about page with our opening hours and a map')).toBeNull()
  })

  it('leaves an empty message alone', () => {
    expect(detectCodeBrief('   ')).toBeNull()
  })
})

describe('generateCodeSection action', () => {
  it('survives the assist response parser', () => {
    const parsed = parseAssistModelText(
      JSON.stringify({
        answer: 'Building it.',
        actions: [{ type: 'generateCodeSection', brief: PLAIN_HTML_SPEC, target: 'hero', title: 'SpaceEdu' }],
      }),
    )

    expect(parsed.actions).toHaveLength(1)
    expect(parsed.actions[0]).toMatchObject({ type: 'generateCodeSection', target: 'hero' })
  })
})
