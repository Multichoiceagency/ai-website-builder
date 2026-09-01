import { describe, expect, it } from 'vitest'
import { isBuildSpec, wantsGuidedDesign } from '../app/utils/assistantWizard'

/**
 * The wizard interviews an owner who typed an intent. A spec is not an intent:
 * it already answers every question, and the interview would swallow it.
 */

const SPEC = `Build a single, self-contained HTML file: a full-viewport space-themed hero section
for a site called "SpaceEdu". All CSS in one <style> block in <head>, all JS in one <script>
block before </body>. A looping video of a single planet fills the whole viewport.`

describe('wantsGuidedDesign', () => {
  it('starts the interview for a short intent', () => {
    expect(wantsGuidedDesign('create a landing page for my bakery')).toBe(true)
  })

  it('lets a build spec through untouched', () => {
    expect(isBuildSpec(SPEC)).toBe(true)
    expect(wantsGuidedDesign(SPEC)).toBe(false)
  })

  it('treats a code marker as a spec even when short', () => {
    expect(isBuildSpec('make the hero section: <style>.x{position:fixed}</style>')).toBe(true)
  })

  it('does not mistake a long plain question for a spec', () => {
    expect(isBuildSpec('what does this mean?')).toBe(false)
  })
})
