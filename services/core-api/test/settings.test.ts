import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SETTINGS_REGISTRY } from '@platform/schemas'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'

/**
 * Settings, end to end against the real database and the real permission engine.
 *
 * The properties worth asserting here are the ones that only exist below the
 * mock line:
 *
 *   * a credential written through the API is never present in *any* response
 *   * a settings read for a workspace you are not a member of is refused
 *   * a plan-gated section is refused below its tier, server-side
 *   * a destructive action without confirmation is refused
 *   * every destructive action leaves an audit row behind
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `settings-test-${suffix}@platform.local`
const OTHER_EMAIL = `settings-other-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'

/** A value that must never appear in a response body, anywhere. */
const SECRET_VALUE = `sk_live_${suffix}_0123456789abcdef4242`

let app: FastifyInstance
let cookie = ''
let otherCookie = ''
let tenantId = ''
let otherTenantId = ''
let userId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

/** Every response captured in this suite, for the "no secret anywhere" sweep. */
const seenBodies: string[] = []

function auth(overrides: Record<string, string> = {}) {
  return { cookie, 'x-tenant-id': tenantId, ...overrides }
}

async function call(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options: { payload?: unknown; headers?: Record<string, string>; query?: Record<string, string> } = {},
) {
  const response = await app.inject({
    method,
    url,
    headers: options.headers ?? auth(),
    ...(options.payload === undefined ? {} : { payload: options.payload as object }),
    ...(options.query ? { query: options.query } : {}),
  })
  seenBodies.push(response.body)
  return response
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const registration = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: EMAIL,
      password: PASSWORD,
      name: 'Settings Test',
      organizationName: `Settings Test ${suffix}`,
    },
  })
  const payload = body(registration).data
  tenantId = payload.activeTenantId
  userId = payload.user.id
  cookie = String(registration.headers['set-cookie']).split(';')[0]!

  // A second workspace, owned by someone else, for the isolation assertions.
  const other = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: OTHER_EMAIL,
      password: PASSWORD,
      name: 'Other Tenant',
      organizationName: `Settings Other ${suffix}`,
    },
  })
  otherTenantId = body(other).data.activeTenantId
  otherCookie = String(other.headers['set-cookie']).split(';')[0]!
})

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email IN (${EMAIL}, ${OTHER_EMAIL})`
  })
  await app.close()
  await closeDatabase()
})

describe('the settings index', () => {
  it('lists every section with its plan requirement', async () => {
    const response = await call('GET', '/api/v1/settings')

    expect(response.statusCode).toBe(200)
    const data = body(response).data
    expect(data.plan).toBe('launch')
    expect(data.sections.map((entry: { key: string }) => entry.key)).toContain('workspace')
    expect(data.sections.map((entry: { key: string }) => entry.key)).toContain('checkout')
  })

  it('refuses an unauthenticated read', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/settings' })
    expect(response.statusCode).toBe(401)
  })
})

describe('settings documents', () => {
  /**
   * The invariant the whole "no migration to add a field" design rests on:
   * every section must produce a valid document from nothing. A field declared
   * `min(1)` with an empty default satisfies neither, and makes the section
   * unreadable until someone writes to it.
   */
  it.each(SETTINGS_REGISTRY.map((entry) => [`${entry.scope}/${entry.key}`, entry] as const))(
    'builds a valid default document for %s from an empty object',
    (_label, definition) => {
      expect(() => definition.schema.parse({})).not.toThrow()
    },
  )

  it('returns a complete default document for a section never written to', async () => {
    const response = await call('GET', '/api/v1/settings/workspace')

    expect(response.statusCode).toBe(200)
    // Defaults come from the schema, so an untouched workspace is still valid.
    expect(body(response).data.settings.timezone).toBe('Europe/Amsterdam')
    expect(body(response).data.settings.currency).toBe('EUR')
  })

  it('persists a partial write without resetting the fields it omitted', async () => {
    const first = await call('PUT', '/api/v1/settings/workspace', {
      payload: { timezone: 'Europe/Berlin', supportEmail: `help-${suffix}@platform.local` },
    })
    expect(first.statusCode).toBe(200)

    const second = await call('PUT', '/api/v1/settings/workspace', { payload: { locale: 'en' } })
    expect(second.statusCode).toBe(200)

    const read = await call('GET', '/api/v1/settings/workspace')
    expect(body(read).data.settings.locale).toBe('en')
    // Not sent in the second call, and not lost by it.
    expect(body(read).data.settings.timezone).toBe('Europe/Berlin')
  })

  it('rejects a value the section schema does not accept', async () => {
    const response = await call('PUT', '/api/v1/settings/workspace', {
      payload: { timezone: 'GMT+2' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('exposes the onboarding document the builder reads', async () => {
    const response = await call('GET', '/api/v1/settings/onboarding')

    expect(response.statusCode).toBe(200)
    expect(body(response).data.settings.steps).toContain('template')
    expect(body(response).data.settings.maxPerformanceClass).toBe('B')
  })

  it('404s an unknown section rather than inventing one', async () => {
    const response = await call('GET', '/api/v1/settings/not-a-section')
    expect(response.statusCode).toBe(404)
  })
})

describe('tenant isolation', () => {
  it('refuses a settings read for a workspace the caller is not a member of', async () => {
    const response = await call('GET', '/api/v1/settings/workspace', {
      headers: { cookie, 'x-tenant-id': otherTenantId },
    })
    // Reported as forbidden, not "not found here" — and crucially it does not
    // return the other workspace's document.
    expect(response.statusCode).toBe(403)
  })

  it('does not leak one workspace document into the other', async () => {
    await call('PUT', '/api/v1/settings/workspace', { payload: { supportEmail: `mine-${suffix}@a.local` } })

    const theirs = await call('GET', '/api/v1/settings/workspace', {
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })
    expect(theirs.statusCode).toBe(200)
    expect(body(theirs).data.settings.supportEmail).toBe('')
  })
})

describe('plan gating', () => {
  it('refuses a section gated above the current plan', async () => {
    // `currencies` requires Scale; the test workspace is on Launch.
    const response = await call('PUT', '/api/v1/settings/commerce/currencies', {
      payload: { baseCurrency: 'GBP' },
    })

    expect(response.statusCode).toBe(402)
    expect(body(response).error.code).toBe('plan_limit_reached')
  })

  it('still lets the gated section be read, marked as not writable', async () => {
    const response = await call('GET', '/api/v1/settings/commerce/currencies')

    expect(response.statusCode).toBe(200)
    expect(body(response).data.writable).toBe(false)
    expect(body(response).data.minimumPlan).toBe('scale')
  })

  it('refuses to enable autonomous AI below the Advanced plan', async () => {
    const response = await call('PUT', '/api/v1/settings/ai', {
      payload: { autonomy: { 'ads.budget': true } },
    })

    expect(response.statusCode).toBe(402)
  })

  it('allows the AI settings that are not gated', async () => {
    const response = await call('PUT', '/api/v1/settings/ai', { payload: { dailyChangeLimit: 25 } })
    expect(response.statusCode).toBe(200)
    expect(body(response).data.dailyChangeLimit).toBe(25)
  })

  it('refuses an invitation beyond the plan seat limit', async () => {
    // Launch includes one seat, which the owner already occupies.
    const response = await call('POST', '/api/v1/settings/team/invitations', {
      payload: { email: `nope-${suffix}@platform.local`, role: 'viewer' },
    })

    expect(response.statusCode).toBe(402)
  })
})

describe('secrets', () => {
  it('stores a credential and returns only a masked hint', async () => {
    const response = await call('PUT', '/api/v1/settings/commerce/payments/secrets', {
      payload: { field: 'apiKey', value: SECRET_VALUE },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.configured).toBe(true)
    expect(body(response).data.hint).toContain('••••')
    expect(body(response).data.hint).toContain('4242')
    expect(response.body).not.toContain(SECRET_VALUE)
  })

  it('describes the stored credential without ever returning it', async () => {
    const response = await call('GET', '/api/v1/settings/commerce/payments')

    expect(response.statusCode).toBe(200)
    const secret = body(response).data.secrets.find((entry: { field: string }) => entry.field === 'apiKey')
    expect(secret.configured).toBe(true)
    expect(secret.hint).toContain('4242')
    expect(secret).not.toHaveProperty('value')
    expect(response.body).not.toContain(SECRET_VALUE)
  })

  it('keeps the credential out of the workspace export', async () => {
    const response = await call('POST', '/api/v1/settings/data/export')

    expect(response.statusCode).toBe(200)
    expect(response.body).not.toContain(SECRET_VALUE)
  })

  it('refuses to remove a credential without confirmation', async () => {
    const response = await call('DELETE', '/api/v1/settings/commerce/payments/secrets/apiKey', {
      payload: {},
    })
    expect(response.statusCode).toBe(400)
  })

  it('removes it once confirmed', async () => {
    const response = await call('DELETE', '/api/v1/settings/commerce/payments/secrets/apiKey', {
      payload: { confirm: true },
    })
    expect(response.statusCode).toBe(200)

    const read = await call('GET', '/api/v1/settings/commerce/payments')
    expect(body(read).data.secrets).toHaveLength(0)
  })
})

describe('API keys', () => {
  let keyId = ''
  let plaintext = ''

  it('returns the key exactly once, at creation', async () => {
    const response = await call('POST', '/api/v1/settings/api-keys', {
      payload: { name: 'Test key', scopes: ['page:read'] },
    })

    expect(response.statusCode).toBe(201)
    keyId = body(response).data.id
    plaintext = body(response).data.secret
    expect(plaintext).toMatch(/^pk_live_/)
    expect(body(response).data.hint).toContain('••••')
  })

  it('never returns it again', async () => {
    const response = await call('GET', '/api/v1/settings/api-keys')

    expect(response.statusCode).toBe(200)
    expect(response.body).not.toContain(plaintext)
    const listed = body(response).data.find((entry: { id: string }) => entry.id === keyId)
    expect(listed.hint).toContain('••••')
    expect(listed).not.toHaveProperty('secret')
  })

  it('refuses to grant a scope the creator does not hold', async () => {
    const response = await call('POST', '/api/v1/settings/api-keys', {
      payload: { name: 'Overreaching key', scopes: ['not:a-real-permission'] },
    })
    expect(response.statusCode).toBe(403)
  })

  it('refuses revocation without confirmation', async () => {
    const response = await call('DELETE', `/api/v1/settings/api-keys/${keyId}`, { payload: {} })
    expect(response.statusCode).toBe(400)
  })

  it('revokes it when confirmed, and writes an audit row', async () => {
    const response = await call('DELETE', `/api/v1/settings/api-keys/${keyId}`, {
      payload: { confirm: true },
    })
    expect(response.statusCode).toBe(200)

    const audit = await call('GET', '/api/v1/settings/audit', { query: { name: 'settings.api_key_revoked' } })
    expect(body(audit).data.length).toBeGreaterThan(0)
    expect(body(audit).data[0].resourceId).toBe(keyId)
  })
})

describe('webhooks', () => {
  let endpointId = ''
  let firstSecret = ''

  it('registers an endpoint and shows the signing secret once', async () => {
    const response = await call('POST', '/api/v1/settings/webhooks', {
      payload: { url: `https://hooks.example.test/${suffix}`, events: ['page.published'] },
    })

    expect(response.statusCode).toBe(201)
    endpointId = body(response).data.id
    firstSecret = body(response).data.secret
    expect(firstSecret).toMatch(/^whsec_/)
  })

  it('rejects a plaintext HTTP endpoint', async () => {
    const response = await call('POST', '/api/v1/settings/webhooks', {
      payload: { url: `http://insecure.example.test/${suffix}`, events: ['page.published'] },
    })
    expect(response.statusCode).toBe(400)
  })

  it('never returns the secret in the list', async () => {
    const response = await call('GET', '/api/v1/settings/webhooks')

    expect(response.statusCode).toBe(200)
    expect(response.body).not.toContain(firstSecret)
    expect(body(response).data[0].secretHint).toContain('••••')
  })

  it('refuses rotation without confirmation', async () => {
    const response = await call('POST', `/api/v1/settings/webhooks/${endpointId}/rotate`, { payload: {} })
    expect(response.statusCode).toBe(400)
  })

  it('rotates to a different secret when confirmed, and audits it', async () => {
    const response = await call('POST', `/api/v1/settings/webhooks/${endpointId}/rotate`, {
      payload: { confirm: true },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.secret).not.toBe(firstSecret)

    const audit = await call('GET', '/api/v1/settings/audit', {
      query: { name: 'settings.webhook_secret_rotated' },
    })
    expect(body(audit).data.length).toBeGreaterThan(0)
  })
})

describe('team', () => {
  it('resolves what each role can do from the permission engine', async () => {
    const response = await call('GET', '/api/v1/settings/team')

    expect(response.statusCode).toBe(200)
    const owner = body(response).data.roles.find((entry: { role: string }) => entry.role === 'owner')
    const viewer = body(response).data.roles.find((entry: { role: string }) => entry.role === 'viewer')
    expect(owner.permissions).toContain('page:publish')
    expect(viewer.permissions).not.toContain('page:publish')
  })

  it('refuses a role change without confirmation', async () => {
    const response = await call('PATCH', `/api/v1/settings/team/members/${userId}`, {
      payload: { role: 'viewer' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('refuses to demote the last owner even when confirmed', async () => {
    const response = await call('PATCH', `/api/v1/settings/team/members/${userId}`, {
      payload: { role: 'viewer', confirm: true },
    })
    expect(response.statusCode).toBe(409)
  })

  it('refuses to remove the last owner', async () => {
    const response = await call('DELETE', `/api/v1/settings/team/members/${userId}`, {
      payload: { confirm: true },
    })
    expect(response.statusCode).toBe(409)
  })
})

describe('data & privacy', () => {
  it('refuses workspace deletion without the typed confirmation', async () => {
    const response = await call('POST', '/api/v1/settings/data/delete-workspace', { payload: {} })
    expect(response.statusCode).toBe(400)
  })

  it('refuses a confirmation that does not match the workspace slug', async () => {
    const response = await call('POST', '/api/v1/settings/data/delete-workspace', {
      payload: { confirm: 'delete-please' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('schedules deletion when the slug matches, and audits it', async () => {
    const workspaces = await call('GET', '/api/v1/tenants')
    const slug = body(workspaces).data.find(
      (entry: { tenantId: string }) => entry.tenantId === tenantId,
    ).tenantSlug

    const response = await call('POST', '/api/v1/settings/data/delete-workspace', {
      payload: { confirm: slug },
    })

    expect(response.statusCode).toBe(202)
    // Scheduled, not performed: the workspace still answers.
    expect(body(response).data.status).toBe('pending')
    expect(body(response).data.scheduledFor).toBeTruthy()

    const audit = await call('GET', '/api/v1/settings/audit', {
      query: { name: 'settings.workspace_deletion_scheduled' },
    })
    expect(body(audit).data.length).toBeGreaterThan(0)

    // And it can be called off, which is the point of scheduling it.
    const cancel = await call('POST', `/api/v1/settings/data/requests/${body(response).data.id}/cancel`)
    expect(cancel.statusCode).toBe(200)
  })
})

describe('the secret sweep', () => {
  it('finds the raw credential in none of the responses this suite collected', () => {
    // The strongest form of the assertion: not "the endpoint I checked did not
    // leak it", but "nothing in the whole suite did".
    expect(seenBodies.length).toBeGreaterThan(20)
    expect(seenBodies.filter((entry) => entry.includes(SECRET_VALUE))).toEqual([])
  })
})
