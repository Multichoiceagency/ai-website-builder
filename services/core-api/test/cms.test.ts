import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { resolveLayoutBind } from '@platform/schemas'
import { buildApp } from '../src/app.js'
import { closeDatabase, withTenant, withoutTenant } from '../src/db/client.js'
import { insertDomain } from '../src/db/repositories/sites.js'

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `cms-test-${suffix}@platform.local`
const OTHER_EMAIL = `cms-other-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'
const HOST = `cms-${suffix}.local`

let app: FastifyInstance
let cookie = ''
let otherCookie = ''
let tenantId = ''
let siteId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

function auth(extra: Record<string, string> = {}) {
  return { cookie, 'x-tenant-id': tenantId, ...extra }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const registered = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: EMAIL, password: PASSWORD, name: 'CMS Test', organizationName: `CMS ${suffix}` },
  })
  if (registered.statusCode >= 400 || !body(registered).data) {
    throw new Error(`register failed ${registered.statusCode}: ${registered.body}`)
  }
  tenantId = body(registered).data.activeTenantId
  cookie = String(registered.headers['set-cookie']).split(';')[0]!

  const other = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: OTHER_EMAIL, password: PASSWORD, name: 'Other', organizationName: `Other CMS ${suffix}` },
  })
  otherCookie = String(other.headers['set-cookie']).split(';')[0]!

  const site = await app.inject({
    method: 'POST',
    url: '/api/v1/sites',
    headers: auth(),
    payload: { name: 'CMS Site', slug: `cms-site-${suffix}`, locale: 'nl' },
  })
  siteId = body(site).data.id

  await withTenant(tenantId, (tx) =>
    insertDomain(tx, { tenantId, siteId, hostname: HOST, isPrimary: true, verified: true }),
  )
})

afterAll(async () => {
  try {
    await withoutTenant(async (tx) => {
      await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
      await tx`DELETE FROM users WHERE email IN (${EMAIL}, ${OTHER_EMAIL})`
    })
  } catch {
    // Boot may have failed before fixtures existed.
  }
  await app?.close()
  await closeDatabase()
})

describe('layout bind', () => {
  it('reads URL query keys and dotted CMS paths', () => {
    expect(
      resolveLayoutBind({ source: 'url', queryKey: 'headline' }, { query: { headline: 'Hello' } }),
    ).toBe('Hello')
    expect(
      resolveLayoutBind(
        { source: 'cms', path: 'fields.hero' },
        { cms: { fields: { hero: 'From CMS' } } },
      ),
    ).toBe('From CMS')
  })
})

describe('platform CMS', () => {
  it('creates a collection and a published entry, then resolves it', async () => {
    const created = await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/cms/collections`,
      headers: auth(),
      payload: { slug: 'articles', name: 'Articles', fields: ['title', 'body'] },
    })
    expect(created.statusCode).toBe(201)
    const collectionId = body(created).data.collection.id as string

    const entry = await app.inject({
      method: 'POST',
      url: `/api/v1/cms/collections/${collectionId}/entries`,
      headers: auth(),
      payload: {
        slug: 'hello',
        title: 'Hello',
        data: { body: 'Published copy' },
        published: true,
      },
    })
    expect(entry.statusCode).toBe(201)

    const resolved = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/resolve',
      headers: auth(),
      query: { siteId, provider: 'platform', collection: 'articles', slug: 'hello' },
    })
    expect(resolved.statusCode).toBe(200)
    expect(body(resolved).data.entry).toMatchObject({ title: 'Hello', slug: 'hello', body: 'Published copy' })

    const publicRead = await app.inject({
      method: 'GET',
      url: '/public/v1/cms',
      query: { host: HOST, collection: 'articles', slug: 'hello' },
    })
    expect(publicRead.statusCode).toBe(200)
    expect(body(publicRead).data.entry).toMatchObject({ title: 'Hello', slug: 'hello' })
  })

  it('hides unpublished entries from the public resolver', async () => {
    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/sites/${siteId}/cms/collections`,
      headers: auth(),
    })
    const collectionId = body(list).data.collections[0].id as string

    const draft = await app.inject({
      method: 'POST',
      url: `/api/v1/cms/collections/${collectionId}/entries`,
      headers: auth(),
      payload: { slug: 'secret', title: 'Secret', data: { body: 'nope' }, published: false },
    })
    expect(draft.statusCode).toBe(201)

    const publicRead = await app.inject({
      method: 'GET',
      url: '/public/v1/cms',
      query: { host: HOST, collection: 'articles', slug: 'secret' },
    })
    expect(publicRead.statusCode).toBe(200)
    expect(body(publicRead).data.entry).toBeNull()
  })

  it('refuses another workspace’s collections', async () => {
    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/sites/${siteId}/cms/collections`,
      headers: { cookie: otherCookie, 'x-tenant-id': tenantId },
    })
    expect(list.statusCode).toBeGreaterThanOrEqual(400)
  })
})
