import { describe, expect, it } from 'vitest'
import { parseAssistModelText } from '../src/lib/ai/assist.js'

describe('parseAssistModelText', () => {
  it('parses clean JSON with setContentWidth actions (1600px path)', () => {
    const parsed = parseAssistModelText(
      JSON.stringify({
        answer: 'Setting layout to 1600px.',
        actions: [{ type: 'setContentWidth', width: 1600 }],
      }),
    )
    expect(parsed.answer).toContain('1600')
    expect(parsed.actions).toEqual([{ type: 'setContentWidth', width: 1600 }])
  })

  it('parses setPageLayout and setHeaderLogo actions', () => {
    const parsed = parseAssistModelText(
      JSON.stringify({
        answer: 'Updated layout and logo.',
        actions: [
          { type: 'setPageLayout', maxWidth: '1600' },
          { type: 'setHeaderLogo', url: 'https://cdn.example.com/logo.png' },
        ],
      }),
    )
    expect(parsed.actions).toHaveLength(2)
    expect(parsed.actions?.[0]).toEqual({ type: 'setPageLayout', maxWidth: '1600' })
    expect(parsed.actions?.[1]).toEqual({
      type: 'setHeaderLogo',
      url: 'https://cdn.example.com/logo.png',
    })
  })

  it('does not throw on prose that is not JSON', () => {
    const parsed = parseAssistModelText("I can't change the layout as JSON right now.")
    expect(parsed.answer).toContain("can't")
    expect(parsed.actions).toEqual([])
  })

  it('wraps bare prose starting with Unexpected-token-looking text', () => {
    const parsed = parseAssistModelText('I can\'t do that from chat.')
    expect(parsed.answer.startsWith('I')).toBe(true)
    expect(parsed.actions).toEqual([])
  })

  it('extracts fenced JSON', () => {
    const parsed = parseAssistModelText(
      'Sure.\n```json\n{"answer":"Done","actions":[{"type":"insertBlock","blockId":"scroll-video-scrub-01"}]}\n```',
    )
    expect(parsed.answer).toBe('Done')
    expect(parsed.actions?.[0]).toEqual({ type: 'insertBlock', blockId: 'scroll-video-scrub-01' })
  })

  it('keeps answer when actions fail Zod validation', () => {
    const parsed = parseAssistModelText(
      JSON.stringify({
        answer: 'Here is advice only.',
        actions: [{ type: 'unknownAction', foo: 1 }],
      }),
    )
    expect(parsed.answer).toBe('Here is advice only.')
    expect(parsed.actions).toEqual([])
  })

  it('parses setHeaderLogoSize and patchSectionProps', () => {
    const parsed = parseAssistModelText(
      JSON.stringify({
        answer: 'Logo enlarged and section patched.',
        actions: [
          { type: 'setHeaderLogoSize', size: 'xl' },
          { type: 'patchSectionProps', sectionId: 'sec_1', props: { headline: 'Hello' } },
        ],
      }),
    )
    expect(parsed.actions).toEqual([
      { type: 'setHeaderLogoSize', size: 'xl' },
      { type: 'patchSectionProps', sectionId: 'sec_1', props: { headline: 'Hello' } },
    ])
  })
})
