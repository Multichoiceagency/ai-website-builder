import type { FastifyInstance } from 'fastify'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  APP_KEY_HEADER,
  APP_SIGNATURE_HEADER,
  APP_TENANT_HEADER,
  APP_TIMESTAMP_HEADER,
  appManifestSchema,
} from '@platform/schemas'
import { buildApp } from '../src/app.js'
import { env } from '../src/config/env.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'
import { reviewManifest } from '../src/lib/apps/manifest.js'
import { currentTimestamp, signPayload, verifySignature } from '../src/lib/apps/signature.js'

/**
 * Phase 7 — the app platform.
 *
 * The path exercised end to end: define an app → submit it → have it reviewed →
 * list it in the marketplace → install it with an explicit permission grant →
 * call the gateway with a key → receive a signed webhook → uninstall.
 *
 * Most of what follows is a security test rather than a feature test, because
 * the feature *is* the security: an installed app is a third party running
 * against a customer's workspace. Each `describe` below is one thing that must
 * be impossible.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const DEV_EMAIL = `app-dev-${suffix}@platform.local`
const OTHER_EMAIL = `app-other-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'
const APP_SLUG = `test-app-${suffix}`

let app: FastifyInstance
let devCookie = ''
let devTenantId = ''
let devUserId = ''
let otherCookie = ''
let otherTenantId = ''
let appId = ''
let siteId = ''
let installationId = ''
let apiKey = ''
let signingSecret = ''
let subscriptionId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

/** The manifest a well-behaved app ships. Narrow on purpose. */
function manifestFor(permissions: string[]) {
  return {
    id: APP_SLUG,
    name: 'Test App',
    version: '1.0.0',
    tagline: 'A test app',
    description: 'Used by the Phase 7 test suite.',
    category: 'productivity',
    type: 'public',
    permissions,
    events: ['page.published'],
    extensions: [],
  }
}

/** Sign a gateway write the way `@platform/app-sdk` does. */
function signedHeaders(payload: unknown, options: { timestamp?: string; tenantId?: string } = {}) {
  const raw = JSON.stringify(payload)
  const timestamp = options.timestamp ?? currentTimestamp()
  return {
    headers: {
      [APP_KEY_HEADER]: apiKey,
      [APP_TENANT_HEADER]: options.tenantId ?? devTenantId,
      [APP_TIMESTAMP_HEADER]: timestamp,
      [APP_SIGNATURE_HEADER]: signPayload(signingSecret, timestamp, raw),
      'content-type': 'application/json',
    },
    payload: raw,
  }
}

/** `app_user` may only read `platform_admins` (0002), which is the point. */
async function grantPlatformAdmin(userId: string): Promise<void> {
  const owner = postgres({
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    database: env.POSTGRES_DB,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    max: 1,
    onnotice: () => {},
  })
  try {
    await owner`INSERT INTO platform_admins (user_id) VALUES (${userId}) ON CONFLICT DO NOTHING`
  } finally {
    await owner.end({ timeout: 5 })
  }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const developer = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: DEV_EMAIL,
      password: PASSWORD,
      name: 'App Developer',
      organizationName: `App Dev ${suffix}`,
    },
  })
  devTenantId = body(developer).data.activeTenantId
  devUserId = body(developer).data.user.id
  devCookie = String(developer.headers['set-cookie']).split(';')[0]!

  const other = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: OTHER_EMAIL,
      password: PASSWORD,
      name: 'Other Tenant',
      organizationName: `App Other ${suffix}`,
    },
  })
  otherTenantId = body(other).data.activeTenantId
  otherCookie = String(other.headers['set-cookie']).split(';')[0]!

  // Reviewing a submission is a platform act, not a tenant one — and staff
  // membership is deliberately not writable by the application role, so the
  // fixture has to reach for the owner connection to grant it.
  await grantPlatformAdmin(devUserId)

  const site = await app.inject({
    method: 'POST',
    url: '/api/v1/sites',
    headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
    payload: { name: 'App Test Site', slug: `app-site-${suffix}` },
  })
  siteId = body(site).data.id
})

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email IN (${DEV_EMAIL}, ${OTHER_EMAIL})`
  })
  await app.close()
  await closeDatabase()
})

describe('the permission review pipeline', () => {
  it('flags a wildcard request as blocking without ever consulting a human', () => {
    const review = reviewManifest(appManifestSchema.parse(manifestFor(['app:*'])))

    expect(review.ok).toBe(false)
    expect(review.grantablePermissions).toEqual([])
    expect(review.flags.some((flag) => flag.code === 'wildcard_permission')).toBe(true)
  })

  it('flags a permission that does not exist', () => {
    const review = reviewManifest(appManifestSchema.parse(manifestFor(['everything:always'])))
    expect(review.flags.some((flag) => flag.code === 'unknown_permission')).toBe(true)
  })

  it('lets a narrow request through but marks a dangerous one for a human', () => {
    const narrow = reviewManifest(appManifestSchema.parse(manifestFor(['site:read'])))
    expect(narrow.ok).toBe(true)
    expect(narrow.grantablePermissions).toEqual(['site:read'])

    const dangerous = reviewManifest(appManifestSchema.parse(manifestFor(['site:read', 'billing:manage'])))
    expect(dangerous.ok).toBe(true)
    expect(dangerous.requiresManualReview).toBe(true)
    expect(dangerous.flags.some((flag) => flag.code === 'high_privilege_permission')).toBe(true)
  })
})

describe('signatures', () => {
  it('refuses an unsigned payload', () => {
    expect(verifySignature({ secret: 's', timestamp: undefined, signature: undefined, rawBody: '{}' })).toEqual({
      ok: false,
      reason: 'missing',
    })
  })

  it('refuses a replayed signature once it falls outside the window', () => {
    const stale = String(Math.floor(Date.now() / 1000) - 4000)
    const signature = signPayload('s', stale, '{}')

    expect(verifySignature({ secret: 's', timestamp: stale, signature, rawBody: '{}' }).reason).toBe('stale')
  })

  it('refuses a signature over a different body', () => {
    const timestamp = currentTimestamp()
    const signature = signPayload('s', timestamp, '{"a":1}')

    expect(verifySignature({ secret: 's', timestamp, signature, rawBody: '{"a":2}' }).reason).toBe('mismatch')
  })

  it('accepts a fresh signature over the exact body', () => {
    const timestamp = currentTimestamp()
    const signature = signPayload('s', timestamp, '{"a":1}')

    expect(verifySignature({ secret: 's', timestamp, signature, rawBody: '{"a":1}' }).ok).toBe(true)
  })
})

describe('the developer portal', () => {
  it('creates a draft app', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/apps/developer/apps',
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
      payload: {
        slug: APP_SLUG,
        name: 'Test App',
        tagline: 'A test app',
        category: 'productivity',
        type: 'public',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(body(response).data.status).toBe('draft')
    appId = body(response).data.id
  })

  it('refuses a submission that requests a wildcard permission', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/apps/developer/apps/${appId}/submit`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
      payload: { manifest: manifestFor(['app:*']), notes: 'please' },
    })

    expect(response.statusCode).toBe(400)
    expect(body(response).error.details.flags[0].code).toBe('wildcard_permission')
  })

  it('accepts a submission that names each permission', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/apps/developer/apps/${appId}/submit`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
      payload: { manifest: manifestFor(['site:read', 'integration:write']), notes: 'first release' },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.app.status).toBe('submitted')
  })

  it('keeps the app out of the marketplace until it is approved', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/apps/marketplace',
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })

    const slugs = body(response).data.map((entry: { slug: string }) => entry.slug)
    expect(slugs).not.toContain(APP_SLUG)
  })

  it('approves it through the review endpoint', async () => {
    const inReview = await app.inject({
      method: 'POST',
      url: `/api/v1/apps/developer/apps/${appId}/review`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
      payload: { decision: 'in_review', notes: 'looks fine' },
    })
    expect(inReview.statusCode).toBe(200)

    const approved = await app.inject({
      method: 'POST',
      url: `/api/v1/apps/developer/apps/${appId}/review`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
      payload: { decision: 'approved', notes: 'shipped' },
    })

    expect(approved.statusCode).toBe(200)
    expect(body(approved).data.status).toBe('approved')
  })

  it('refuses a review decision from someone who is not platform staff', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/apps/developer/apps/${appId}/review`,
      headers: { cookie: otherCookie, 'x-tenant-id': devTenantId },
      payload: { decision: 'approved', notes: 'mine now' },
    })

    expect(response.statusCode).toBe(403)
  })
})

describe('the marketplace', () => {
  it('lists the approved app with the permissions it asks for', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/apps/marketplace/${APP_SLUG}`,
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })

    expect(response.statusCode).toBe(200)
    // Shown before the install button, in full — that is the whole point.
    expect(body(response).data.requestedPermissions).toEqual(['site:read', 'integration:write'])
  })

  it('requires authentication', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/apps/marketplace' })
    expect(response.statusCode).toBe(401)
  })
})

describe('installing', () => {
  it('records the grant at install time', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/apps/installations',
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
      payload: { slug: APP_SLUG },
    })

    expect(response.statusCode).toBe(201)
    const installation = body(response).data.installation
    expect(installation.grantedPermissions).toEqual(['site:read', 'integration:write'])
    // Never a permission the app did not ask for.
    expect(installation.grantedPermissions).not.toContain('page:read')
    installationId = installation.id
  })

  it('refuses a second installation of the same app', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/apps/installations',
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
      payload: { slug: APP_SLUG },
    })
    expect(response.statusCode).toBe(409)
  })

  it('emits app.installed into the audit trail', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/current/activity',
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
    })

    const names = body(response).data.map((entry: { name: string }) => entry.name)
    expect(names).toContain('app.installed')
  })

  it('narrows the grant when the installer ticks fewer boxes', async () => {
    const install = await app.inject({
      method: 'POST',
      url: '/api/v1/apps/installations',
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
      payload: { slug: APP_SLUG, permissions: ['site:read'] },
    })

    expect(install.statusCode).toBe(201)
    expect(body(install).data.installation.grantedPermissions).toEqual(['site:read'])
    expect(body(install).data.withheldPermissions).toContain('integration:write')
  })
})

describe('API keys', () => {
  it('returns the key exactly once', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/apps/developer/apps/${appId}/keys`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
      payload: { name: 'test key' },
    })

    expect(response.statusCode).toBe(201)
    apiKey = body(response).data.key
    signingSecret = body(response).data.signingSecret
    expect(apiKey).toMatch(/^pak_/)
  })

  it('never returns it again', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/apps/developer/apps/${appId}/keys`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
    })

    const keys = body(response).data
    expect(keys).toHaveLength(1)
    expect(keys[0].key).toBeUndefined()
    expect(keys[0].signingSecret).toBeUndefined()
    // A prefix and four characters — enough to recognise, not enough to use.
    expect(keys[0].keyPrefix).toMatch(/^pak_/)
    expect(JSON.stringify(keys)).not.toContain(apiKey)
  })
})

describe('the app gateway', () => {
  it('refuses a call with no key', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/apps/gateway/me' })
    expect(response.statusCode).toBe(401)
  })

  it('refuses an unknown key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/apps/gateway/me',
      headers: { [APP_KEY_HEADER]: 'pak_not-a-real-key', [APP_TENANT_HEADER]: devTenantId },
    })
    expect(response.statusCode).toBe(401)
  })

  it('resolves the app, the workspace and the granted scopes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/apps/gateway/me',
      headers: { [APP_KEY_HEADER]: apiKey, [APP_TENANT_HEADER]: devTenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.tenantId).toBe(devTenantId)
    expect(body(response).data.scopes).toEqual(['site:read', 'integration:write'])
  })

  it('allows a call the installation granted', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/apps/gateway/sites',
      headers: { [APP_KEY_HEADER]: apiKey, [APP_TENANT_HEADER]: devTenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.some((site: { id: string }) => site.id === siteId)).toBe(true)
  })

  it('refuses a scope the installation did not grant', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/apps/gateway/pages?siteId=${siteId}`,
      headers: { [APP_KEY_HEADER]: apiKey, [APP_TENANT_HEADER]: devTenantId },
    })

    expect(response.statusCode).toBe(403)
    expect(body(response).error.message).toContain('page:read')
  })

  it('refuses a workspace that has not installed the app', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/apps/gateway/sites',
      headers: { [APP_KEY_HEADER]: apiKey, [APP_TENANT_HEADER]: '00000000-0000-0000-0000-000000000000' },
    })

    expect(response.statusCode).toBe(403)
  })

  /**
   * The key belongs to the app, not to an installation — one credential, many
   * customers. So authority has to come from the installation the call names,
   * and it does: the same key sees a different scope set in each workspace.
   */
  it('uses the grant of the workspace it acts in, not the one it was created in', async () => {
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/apps/gateway/me',
      headers: { [APP_KEY_HEADER]: apiKey, [APP_TENANT_HEADER]: otherTenantId },
    })

    expect(me.statusCode).toBe(200)
    // The other workspace ticked one box, so one scope is all this key gets there.
    expect(body(me).data.scopes).toEqual(['site:read'])

    const write = signedHeaders({ settings: { colour: 'blue' } }, { tenantId: otherTenantId })
    const refused = await app.inject({
      method: 'PATCH',
      url: '/api/v1/apps/gateway/settings',
      headers: write.headers,
      payload: write.payload,
    })

    expect(refused.statusCode).toBe(403)
    expect(body(refused).error.message).toContain('integration:write')
  })

  it('refuses an unsigned write', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/apps/gateway/settings',
      headers: { [APP_KEY_HEADER]: apiKey, [APP_TENANT_HEADER]: devTenantId },
      payload: { settings: { colour: 'blue' } },
    })

    expect(response.statusCode).toBe(403)
  })

  it('refuses a replayed write', async () => {
    const stale = String(Math.floor(Date.now() / 1000) - 4000)
    const signed = signedHeaders({ settings: { colour: 'blue' } }, { timestamp: stale })

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/apps/gateway/settings',
      headers: signed.headers,
      payload: signed.payload,
    })

    expect(response.statusCode).toBe(403)
    expect(body(response).error.message).toContain('window')
  })

  it('refuses a signature computed over a different body', async () => {
    const signed = signedHeaders({ settings: { colour: 'blue' } })

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/apps/gateway/settings',
      headers: signed.headers,
      payload: JSON.stringify({ settings: { colour: 'red' } }),
    })

    expect(response.statusCode).toBe(403)
  })

  it('accepts a correctly signed write', async () => {
    const signed = signedHeaders({ settings: { colour: 'blue' } })

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/apps/gateway/settings',
      headers: signed.headers,
      payload: signed.payload,
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.settings.colour).toBe('blue')
  })

  it('writes every decision to the request log', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/apps/developer/apps/${appId}/logs`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
    })

    const decisions = body(response).data.map((entry: { decision: string }) => entry.decision)
    expect(decisions).toContain('allowed')
    expect(decisions).toContain('denied_scope')
    expect(decisions).toContain('denied_signature')
  })

  it('reports usage for the developer', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/apps/developer/apps/${appId}/usage`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.installs).toBeGreaterThan(0)
    expect(body(response).data.windows.length).toBeGreaterThan(0)
  })
})

describe('webhooks', () => {
  it('creates a subscription and shows the secret once', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/apps/webhooks',
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
      payload: {
        installationId,
        event: 'page.published',
        // Port 9 is the discard service: the delivery attempt fails fast
        // instead of reaching anything.
        targetUrl: 'http://127.0.0.1:9/hook',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(body(response).data.secret).toMatch(/^whsec_/)
    subscriptionId = body(response).data.id
  })

  it('never returns the secret again', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/apps/webhooks',
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
    })

    expect(body(response).data[0].secret).toBeUndefined()
    expect(body(response).data[0].signingSecret).toBeUndefined()
  })

  it('queues a signed delivery when the subscribed event happens', async () => {
    const page = await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/pages`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
      payload: { path: '/hooked', title: 'Hooked' },
    })
    const pageId = body(page).data.id

    await app.inject({
      method: 'POST',
      url: `/api/v1/pages/${pageId}/publish`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
    })

    const deliveries = await app.inject({
      method: 'GET',
      url: `/api/v1/apps/webhooks/${subscriptionId}/deliveries`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
    })

    expect(deliveries.statusCode).toBe(200)
    expect(body(deliveries).data.length).toBeGreaterThan(0)
    expect(body(deliveries).data[0].event).toBe('page.published')
  })

  it('replays a delivery by resetting its attempt budget', async () => {
    const deliveries = await app.inject({
      method: 'GET',
      url: `/api/v1/apps/webhooks/${subscriptionId}/deliveries`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
    })
    const deliveryId = body(deliveries).data[0].id

    const replay = await app.inject({
      method: 'POST',
      url: `/api/v1/apps/webhooks/deliveries/${deliveryId}/replay`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
    })

    expect(replay.statusCode).toBe(200)
    expect(body(replay).data.attempts).toBe(0)
    expect(body(replay).data.status).toBe('pending')
  })

  it('refuses to read another workspace subscriptions', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/apps/webhooks/${subscriptionId}/deliveries`,
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })

    expect(response.statusCode).toBe(404)
  })
})

describe('uninstalling', () => {
  it('revokes the app access immediately', async () => {
    const uninstall = await app.inject({
      method: 'DELETE',
      url: `/api/v1/apps/installations/${installationId}`,
      headers: { cookie: devCookie, 'x-tenant-id': devTenantId },
    })
    expect(uninstall.statusCode).toBe(200)

    const afterwards = await app.inject({
      method: 'GET',
      url: '/api/v1/apps/gateway/sites',
      headers: { [APP_KEY_HEADER]: apiKey, [APP_TENANT_HEADER]: devTenantId },
    })

    // The key is still valid; the authority behind it is gone.
    expect(afterwards.statusCode).toBe(403)
  })
})
