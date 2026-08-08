import { describe, expect, it } from 'vitest'
import { draftWhatsappAgentReply } from '../src/lib/whatsapp/agent-reply.js'

describe('draftWhatsappAgentReply', () => {
  it('hands off when a keyword matches', async () => {
    const result = await draftWhatsappAgentReply(
      {
        systemPrompt: 'Be helpful.',
        customerMessage: 'Please connect me to a human agent now.',
      },
      ['human', 'agent'],
    )
    expect(result.handoff).toBe(true)
    expect(result.model).toBe('handoff')
    expect(result.text.toLowerCase()).toContain('human')
  })

  it('falls back without GEMINI_API_KEY when no handoff', async () => {
    const previous = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    try {
      const result = await draftWhatsappAgentReply(
        { systemPrompt: 'Be helpful.', customerMessage: 'What are your opening hours?' },
        ['human'],
      )
      expect(result.handoff).toBe(false)
      expect(result.model).toBe('fallback')
      expect(result.text.length).toBeGreaterThan(10)
    } finally {
      if (previous === undefined) delete process.env.GEMINI_API_KEY
      else process.env.GEMINI_API_KEY = previous
    }
  })
})
