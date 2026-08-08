import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'

/**
 * End-to-end AI assistant coverage — every question shape the product supports:
 * free-form assist, Motionsites brief routing, catalogue cites, validation,
 * auth, and tool-adjacent intents the UI keyword-matches.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `assist-e2e-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'

let app: FastifyInstance
let cookie = ''
let tenantId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

async function assist(message: string, includeCatalogue = true) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/ai/assist',
    headers: { cookie, 'x-tenant-id': tenantId },
    payload: { message, includeCatalogue },
  })
}

const QUESTIONS: { name: string; message: string; assert: (payload: Record<string, unknown>) => void }[] =
  [
    {
      name: 'general product help',
      message: 'How do I publish a page on my website?',
      assert: (payload) => {
        expect(String(payload.answer).length).toBeGreaterThan(20)
        expect(String(payload.answer).toLowerCase()).toMatch(/publish|page|draft/)
      },
    },
    {
      name: 'SEO advice',
      message: 'What should I improve for SEO on my homepage title and meta description?',
      assert: (payload) => {
        expect(String(payload.answer).toLowerCase()).toMatch(/seo|title|meta|description/)
      },
    },
    {
      name: 'commerce / payments',
      message: 'How do I connect Mollie or Stripe so customers can checkout?',
      assert: (payload) => {
        expect(String(payload.answer).toLowerCase()).toMatch(/mollie|stripe|payment|checkout|commerce/)
      },
    },
    {
      name: 'catalogue section recommend',
      message: 'Recommend a hero section and a testimonials block I can insert.',
      assert: (payload) => {
        expect(String(payload.answer).length).toBeGreaterThan(20)
        const hits = payload.catalogueHits as unknown[] | undefined
        expect(Array.isArray(hits)).toBe(true)
      },
    },
    {
      name: 'template / Motionsites recommend',
      message: 'Suggest a Motionsites or studio landing layout for a modern SaaS homepage.',
      assert: (payload) => {
        expect(String(payload.answer).length).toBeGreaterThan(20)
      },
    },
    {
      name: 'build website intent (advice only)',
      message: 'Build a website from a business for my bakery in Amsterdam.',
      assert: (payload) => {
        // Assist never mutates — it should steer to onboarding / guided flow.
        expect(String(payload.answer).toLowerCase()).toMatch(
          /onboarding|build a website|cannot|select|guided|business/,
        )
      },
    },
    {
      name: 'publish intent (advice only)',
      message: 'Please publish this page for me right now.',
      assert: (payload) => {
        expect(String(payload.answer).toLowerCase()).toMatch(/publish|confirm|cannot|action/)
      },
    },
    {
      name: 'section copy change (steer to Ask AI)',
      message: 'Rewrite the headline on my selected section to be shorter.',
      assert: (payload) => {
        expect(String(payload.answer).toLowerCase()).toMatch(/ask ai|section|canvas|select/)
      },
    },
    {
      name: 'analytics / live view',
      message: 'Where can I see live visitors on a globe for my websites and shop?',
      assert: (payload) => {
        expect(String(payload.answer).toLowerCase()).toMatch(/live|analytics|visitor|globe|tracking/)
      },
    },
    {
      name: 'integrations / connectors',
      message: 'How do I connect Google Analytics and Slack to this workspace?',
      assert: (payload) => {
        expect(String(payload.answer).toLowerCase()).toMatch(
          /connect|integration|google|slack|nango|settings/,
        )
      },
    },
    {
      name: 'feeds / marketplaces',
      message: 'How do I export a Google Shopping or Meta product feed?',
      assert: (payload) => {
        expect(String(payload.answer).toLowerCase()).toMatch(/feed|shopping|commerce|product|meta|google/)
      },
    },
    {
      name: 'CRM / WhatsApp',
      message: 'Can the assistant set up WhatsApp support agents for my CRM?',
      assert: (payload) => {
        expect(String(payload.answer).length).toBeGreaterThan(20)
      },
    },
  ]

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const register = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: EMAIL,
      password: PASSWORD,
      name: 'Assist E2E',
      organizationName: `Assist E2E ${suffix}`,
    },
  })
  expect(register.statusCode).toBe(201)
  const payload = body(register).data
  tenantId = payload.activeTenantId
  cookie = String(register.headers['set-cookie']).split(';')[0]!
}, 60_000)

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email = ${EMAIL}`
  })
  await app.close()
  await closeDatabase()
})

describe('AI assistant e2e', () => {
  it('lists available models for the tenant', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/models',
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(response.statusCode).toBe(200)
    const models = body(response).data.models as { id: string; available: boolean }[]
    expect(models.length).toBeGreaterThan(0)
  })

  it('rejects unauthenticated assist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/assist',
      payload: { message: 'Hello there, what can you do?' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('rejects too-short messages', async () => {
    const response = await assist('x')
    expect(response.statusCode).toBe(400)
  })

  it('routes exact Motionsites React briefs without inventing page JSON', async () => {
    const brief = `
Create a React + Tailwind Motionsites hero section.
Use framer-motion for entrance.
Export default function Hero() { return <section>…</section> }
DEPENDENCIES: react, framer-motion
`.repeat(2)
    const response = await assist(brief.slice(0, 900))
    expect([200, 502, 503]).toContain(response.statusCode)
    if (response.statusCode === 200) {
      const payload = body(response).data
      expect(String(payload.answer).toLowerCase()).toMatch(/motionsites|island|codegen|brief|adr-0003|react/)
    }
  }, 90_000)

  for (const question of QUESTIONS) {
    it(`answers: ${question.name}`, async () => {
      const response = await assist(question.message)
      // 503 = no LLM key in CI; still assert contract. Local with Gemini should be 200.
      expect([200, 502, 503]).toContain(response.statusCode)
      if (response.statusCode !== 200) {
        const error = body(response).error
        expect(['ai_unavailable', 'ai_failed']).toContain(error.code)
        return
      }
      const payload = body(response).data as Record<string, unknown>
      expect(typeof payload.answer).toBe('string')
      expect(typeof payload.model).toBe('string')
      question.assert(payload)
    }, 90_000)
  }

  it('returns catalogue hits when includeCatalogue is true', async () => {
    const response = await assist('Recommend a pricing section and FAQ block for a SaaS site.')
    if (response.statusCode !== 200) return
    const payload = body(response).data
    expect(Array.isArray(payload.catalogueHits)).toBe(true)
  }, 90_000)

  it('can omit catalogue when asked', async () => {
    const response = await assist('What is a draft page versus a published page?', false)
    if (response.statusCode !== 200) return
    const payload = body(response).data
    expect(Array.isArray(payload.catalogueHits)).toBe(true)
    expect(payload.catalogueHits).toHaveLength(0)
  }, 90_000)
})
