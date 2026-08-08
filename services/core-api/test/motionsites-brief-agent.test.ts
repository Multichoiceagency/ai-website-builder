import { describe, expect, it } from 'vitest'
import { detectExactIslandIntent } from '@platform/templates'
import {
  analyzeMotionsitesBrief,
  classifyBrief,
  createMotionsitesBriefTools,
  extractCopy,
  matchIsland,
} from '../src/lib/ai/motionsites-brief-agent.js'

const NEXUM_PROMPT = `
Build a single full-screen hero page for nexum — React + Tailwind + lucide-react.
Ship AI workers that grind while you rest
Stats number 42,500+ in Silkscreen. Glassmorphism nav. Get started CTA.
Video: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260803_192301_9231ed6b-c55c-4a48-909c-4ebe11cf2e11.mp4
`

describe('detectExactIslandIntent — nexum', () => {
  it('matches the Nexum Motionsites brief', () => {
    expect(detectExactIslandIntent(NEXUM_PROMPT)).toBe('nexum-hero')
  })

  it('matches the headline alone when Nexum is named', () => {
    expect(detectExactIslandIntent('Nexum Hero — Ship AI workers that grind while you rest')).toBe(
      'nexum-hero',
    )
  })

  it('leaves short copy edits alone', () => {
    expect(detectExactIslandIntent('make this punchier')).toBeNull()
  })
})

describe('motionsites brief agent', () => {
  it('classifies Nexum as exact_island and matches the ready island', async () => {
    expect(classifyBrief(NEXUM_PROMPT)).toBe('exact_island')
    expect(matchIsland(NEXUM_PROMPT)).toBe('nexum-hero')
    const result = await analyzeMotionsitesBrief(NEXUM_PROMPT)
    expect(result.kind).toBe('exact_island')
    expect(result.islandId).toBe('nexum-hero')
    expect(result.model).toContain('langchain')
  })

  it('classifies short instructions as copy_edit', () => {
    expect(classifyBrief('make this punchier')).toBe('copy_edit')
  })

  it('extracts Nexum copy cues', () => {
    const copy = extractCopy(NEXUM_PROMPT)
    expect(copy.headline).toMatch(/Ship AI workers/i)
    expect(copy.stats).toMatch(/42,?500/)
    expect(copy.cta).toBe('Get started')
  })

  it('exposes LangChain structured tools', () => {
    const tools = createMotionsitesBriefTools()
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'classify_brief',
      'extract_copy',
      'fetch_media',
      'match_island',
    ])
  })
})
