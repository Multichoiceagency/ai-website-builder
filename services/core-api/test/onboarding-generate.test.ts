import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'

/**
 * Onboarding generate must leave the caller with a site they can open:
 * a primary preview hostname, a home page id for the editor, and pages that
 * load authenticated even when they stay drafts (publish is opt-in).
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `onboard-gen-${suffix}@platform.local`
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
      name: 'Onboard Gen',
      organizationName: `Onboard Gen ${suffix}`,
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

describe('POST /api/v1/onboarding/generate', () => {
  it('creates a draft site with a primary preview host and a home page for the editor', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/generate',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        profile: {
          company: {
            name: `Atelier ${suffix}`,
            shortDescription: 'Custom furniture in Utrecht.',
            industry: 'local',
          },
          contact: { phone: '030 000 0000', email: `hello-${suffix}@example.com` },
          locations: [{ city: 'Utrecht' }],
          services: [
            {
              name: 'Maatwerk meubels',
              description:
                'Tafels, kasten en banken op maat, gemaakt in de eigen werkplaats met eiken en noten.',
              prominence: 0.9,
            },
          ],
          brand: { tone: 'friendly' },
          locale: 'nl',
          warnings: [],
        },
        siteName: `Atelier ${suffix}`,
        style: 'modern',
        publish: false,
      },
    })

    expect(response.statusCode).toBe(201)
    const payload = body(response).data

    expect(payload.siteId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    expect(payload.homePageId).toBe(payload.pageIds[0])
    expect(payload.previewHostname).toBe(`${payload.siteSlug}.localhost`)
    expect(payload.published).toBe(false)
    expect(payload.pageIds.length).toBeGreaterThanOrEqual(3)

    const site = await app.inject({
      method: 'GET',
      url: `/api/v1/sites/${payload.siteId}`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(site.statusCode).toBe(200)
    expect(body(site).data.primaryHostname).toBe(payload.previewHostname)

    const page = await app.inject({
      method: 'GET',
      url: `/api/v1/pages/${payload.homePageId}`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(page.statusCode).toBe(200)
    expect(body(page).data.status).toBe('draft')
    expect(body(page).data.sections.length).toBeGreaterThan(0)

    // Unpublished pages must not appear on the public storefront — that 404 is
    // exactly why onboarding lands in the editor instead of "Open the website".
    const publicDraft = await app.inject({
      method: 'GET',
      url: '/public/v1/pages',
      query: { host: payload.previewHostname, path: '/' },
    })
    expect(publicDraft.statusCode).toBe(404)
  })

  it('serves the home page publicly when generation publishes', async () => {
    // Launch plan allows one site — register a fresh tenant for the publish path.
    const pubSuffix = Math.random().toString(36).slice(2, 8)
    const pubEmail = `onboard-pub-${pubSuffix}@platform.local`
    const registered = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: pubEmail,
        password: PASSWORD,
        name: 'Onboard Pub',
        organizationName: `Onboard Pub ${pubSuffix}`,
      },
    })
    expect(registered.statusCode).toBe(201)
    const pubTenant = body(registered).data.activeTenantId
    const pubCookie = String(registered.headers['set-cookie']).split(';')[0]!

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/generate',
        headers: { cookie: pubCookie, 'x-tenant-id': pubTenant },
        payload: {
          profile: {
            company: {
              name: `Public ${pubSuffix}`,
              shortDescription: 'A published onboarding site.',
              industry: 'local',
            },
            contact: {},
            locale: 'nl',
            warnings: [],
          },
          siteName: `Public ${pubSuffix}`,
          style: 'minimal',
          publish: true,
        },
      })

      expect(response.statusCode).toBe(201)
      const payload = body(response).data
      expect(payload.published).toBe(true)

      const publicPage = await app.inject({
        method: 'GET',
        url: '/public/v1/pages',
        query: { host: payload.previewHostname, path: '/' },
      })
      expect(publicPage.statusCode).toBe(200)
      expect(body(publicPage).data.page.title).toBeTruthy()
    } finally {
      await withoutTenant(async (tx) => {
        await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + pubSuffix + '%'}`
        await tx`DELETE FROM users WHERE email = ${pubEmail}`
      })
    }
  })
})
