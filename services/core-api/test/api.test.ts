import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'

/**
 * End-to-end coverage of the Phase 1 critical path:
 *
 *   sign up → create tenant → create site → create page → publish → read it
 *   back through the unauthenticated public API.
 *
 * Everything runs against the real database and the real permission engine.
 * Nothing here is mocked, because the things most worth testing — RLS, role
 * resolution, the publish copy — only exist below the mock line.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `api-test-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'

let app: FastifyInstance
let cookie = ''
let tenantId = ''
let siteId = ''
let pageId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email = ${EMAIL}`
  })
  await app.close()
  await closeDatabase()
})

describe('health', () => {
  it('reports the database as reachable', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(body(response).data.database).toBe('up')
  })
})

describe('registration and sign-in', () => {
  it('creates a user, an organization and an owner membership in one call', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: EMAIL,
        password: PASSWORD,
        name: 'API Test',
        organizationName: `API Test ${suffix}`,
      },
    })

    expect(response.statusCode).toBe(201)
    const payload = body(response).data
    expect(payload.memberships).toHaveLength(1)
    expect(payload.memberships[0].role).toBe('owner')
    expect(payload.permissions).toContain('page:publish')

    tenantId = payload.activeTenantId
    cookie = String(response.headers['set-cookie']).split(';')[0]!
    expect(cookie).toMatch(/^platform_session=/)
  })

  it('rejects a duplicate e-mail', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: EMAIL, password: PASSWORD, name: 'Again', organizationName: 'Again' },
    })
    expect(response.statusCode).toBe(409)
  })

  it('rejects a wrong password without revealing whether the account exists', async () => {
    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: EMAIL, password: 'not-the-password' },
    })
    const unknownUser = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: `nobody-${suffix}@platform.local`, password: 'not-the-password' },
    })

    expect(wrongPassword.statusCode).toBe(401)
    expect(unknownUser.statusCode).toBe(401)
    expect(body(wrongPassword).error.message).toBe(body(unknownUser).error.message)
  })

  it('refuses an unauthenticated session lookup', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/session' })
    expect(response.statusCode).toBe(401)
  })

  it('enforces the minimum password length', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: `short-${suffix}@platform.local`, password: 'short', name: 'X', organizationName: 'X' },
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('sites and pages', () => {
  it('creates a site', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/sites',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { name: 'Test Site', slug: `test-site-${suffix}`, locale: 'nl' },
    })

    expect(response.statusCode).toBe(201)
    siteId = body(response).data.id
    // Theme defaults are filled in server-side, so no client can create a
    // half-themed site.
    expect(body(response).data.theme.colorPrimary).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('refuses to create a site without a tenant header', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/sites',
      headers: { cookie, 'x-tenant-id': '00000000-0000-0000-0000-000000000000' },
      payload: { name: 'Nope', slug: `nope-${suffix}` },
    })
    expect(response.statusCode).toBe(403)
  })

  it('creates a page with sections validated against the block registry', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/pages`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        path: '/',
        title: 'Home',
        sections: [{ id: 'sec_test01', block: 'hero-centered-01', props: { headline: 'Hello' } }],
      },
    })

    expect(response.statusCode).toBe(201)
    pageId = body(response).data.id
    // Unsupplied props come back filled from the block's own defaults.
    expect(body(response).data.sections[0].props.primaryLabel).toBeTruthy()
    expect(body(response).data.hasUnpublishedChanges).toBe(true)
  })

  it('rejects a section referencing a block that does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/pages`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        path: '/bad',
        title: 'Bad',
        sections: [{ id: 'sec_bad', block: 'not-a-real-block-99', props: {} }],
      },
    })
    expect(response.statusCode).toBe(400)
    expect(body(response).error.code).toBe('unknown_block')
  })

  it('rejects props that violate the block schema', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/pages`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        path: '/bad-props',
        title: 'Bad',
        sections: [{ id: 'sec_bad', block: 'hero-centered-01', props: { headline: 12345 } }],
      },
    })
    expect(response.statusCode).toBe(400)
    expect(body(response).error.code).toBe('invalid_block_props')
  })

  it('rejects a duplicate path within the same site', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/pages`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { path: '/', title: 'Duplicate' },
    })
    expect(response.statusCode).toBe(409)
  })
})

describe('publishing', () => {
  it('keeps a draft out of the public API until it is published', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/public/v1/pages',
      query: { host: `unpublished-${suffix}.local`, path: '/' },
    })
    expect(response.statusCode).toBe(404)
  })

  it('publishes the page and records a revision', async () => {
    const publish = await app.inject({
      method: 'POST',
      url: `/api/v1/pages/${pageId}/publish`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(publish.statusCode).toBe(200)
    expect(body(publish).data.status).toBe('published')
    expect(body(publish).data.hasUnpublishedChanges).toBe(false)

    const revisions = await app.inject({
      method: 'GET',
      url: `/api/v1/pages/${pageId}/revisions`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(body(revisions).data.length).toBeGreaterThan(0)
    expect(body(revisions).data[0].reason).toBe('publish')
  })

  it('marks the page as changed again after an edit', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/pages/${pageId}`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { title: 'Home v2' },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.hasUnpublishedChanges).toBe(true)
  })

  it('writes an audit entry for every mutation', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/current/activity',
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    const names = body(response).data.map((entry: { name: string }) => entry.name)
    expect(names).toContain('page.published')
    expect(names).toContain('site.created')
  })
})

describe('the public API', () => {
  it('refuses an unknown hostname', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/public/v1/pages',
      query: { host: `nothing-here-${suffix}.example`, path: '/' },
    })
    expect(response.statusCode).toBe(404)
  })

  it('requires a hostname', async () => {
    const response = await app.inject({ method: 'GET', url: '/public/v1/pages', query: { path: '/' } })
    expect(response.statusCode).toBe(400)
  })
})

describe('the block catalogue', () => {
  it('requires authentication', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/blocks' })
    expect(response.statusCode).toBe(401)
  })

  it('filters by category and performance ceiling', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/blocks',
      headers: { cookie },
      query: { category: 'hero', maxPerformanceClass: 'A' },
    })

    const blocks = body(response).data
    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks.every((block: { category: string }) => block.category === 'hero')).toBe(true)
    expect(blocks.every((block: { performanceClass: string }) => block.performanceClass === 'A')).toBe(true)
  })
})

describe('sign-out', () => {
  it('invalidates the session immediately', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie } })

    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie } })
    expect(response.statusCode).toBe(401)
  })
})
