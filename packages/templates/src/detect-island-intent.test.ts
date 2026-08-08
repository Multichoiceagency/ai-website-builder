import { describe, expect, it } from 'vitest'
import { detectExactIslandIntent, isMotionsitesCodegenBrief } from './detect-island-intent.js'
import { MOTIONSITES_ISLAND_READY } from './island-ready.js'

describe('detectExactIslandIntent', () => {
  it('includes nexum-hero in the ready list', () => {
    expect(MOTIONSITES_ISLAND_READY).toContain('nexum-hero')
  })

  it('routes Nexum briefs to nexum-hero', () => {
    expect(
      detectExactIslandIntent(
        'Build nexum with React + Tailwind + lucide-react. Ship AI workers that grind while you rest. Silkscreen 42,500+.',
      ),
    ).toBe('nexum-hero')
  })
})

describe('isMotionsitesCodegenBrief', () => {
  it('detects React + Vite + Tailwind Motionsites briefs', () => {
    expect(
      isMotionsitesCodegenBrief(
        'Create a React + Vite + TypeScript + Tailwind hero with GSAP. Use images.higgs.ai for media.',
      ),
    ).toBe(true)
  })

  it('rejects plain copy-edit instructions', () => {
    expect(isMotionsitesCodegenBrief('Make the headline shorter and warmer.')).toBe(false)
  })
})
