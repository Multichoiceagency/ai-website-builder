import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `onboard-funnel-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'

let app: FastifyInstance
let cookie = ''
let tenantId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const registered = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: EMAIL,
      password: PASSWORD,
      name: 'Funnel User',
      organizationName: `Funnel ${suffix}`,
    },
  })
  expect(registered.statusCode).toBe(201)
  tenantId = body(registered).data.activeTenantId
  cookie = String(registered.headers['set-cookie']).split(';')[0]!
})

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email = ${EMAIL}`
  })
  await app.close()
  await closeDatabase()
})

describe('GET/PATCH /api/v1/onboarding/progress', () => {
  it('returns defaults then merges productIntent and step', async () => {
    const initial = await app.inject({
      method: 'GET',
      url: '/api/v1/onboarding/progress',
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(initial.statusCode).toBe(200)
    expect(body(initial).data.step).toBe('account')
    expect(body(initial).data.productIntent).toBeNull()

    const patched = await app.inject({
      method: 'PATCH',
      url: '/api/v1/onboarding/progress',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        step: 'connect',
        productIntent: 'both',
        completedSteps: ['account', 'intent'],
        website: 'example.nl',
      },
    })
    expect(patched.statusCode).toBe(200)
    expect(body(patched).data.step).toBe('connect')
    expect(body(patched).data.productIntent).toBe('both')
    expect(body(patched).data.website).toBe('example.nl')
    expect(body(patched).data.completedSteps).toEqual(
      expect.arrayContaining(['account', 'intent']),
    )

    const again = await app.inject({
      method: 'PATCH',
      url: '/api/v1/onboarding/progress',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { completedSteps: ['connect'], city: 'Amsterdam' },
    })
    expect(again.statusCode).toBe(200)
    expect(body(again).data.city).toBe('Amsterdam')
    expect(body(again).data.website).toBe('example.nl')
    expect(body(again).data.completedSteps).toEqual(
      expect.arrayContaining(['account', 'intent', 'connect']),
    )
  })
})
