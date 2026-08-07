import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'

/**
 * Server-side tracking (§22–§28), end to end.
 *
 * The payloads below are written the way `@platform/tracking` writes them,
 * literally rather than through a helper, because the SDK mirrors
 * `trackingEventSchema` structurally instead of importing it — this suite is
 * where the two are held together.
 *
 * Everything runs against the real database. The parts most worth testing —
 * the unique index that deduplicates, the consent gate, row-level security on
 * the event tables — only exist below the mock line.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `tracking-test-${suffix}@platform.local`
const OTHER_EMAIL = `tracking-other-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'

const VISITOR = `anon-${suffix}-0001`
const SESSION = `sess-${suffix}-0001`

let app: FastifyInstance
let cookie = ''
let tenantId = ''
let siteId = ''

let otherCookie = ''
let otherTenantId = ''
let otherSiteId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

function eventId(label: string): string {
  return `evt-${suffix}-${label}`
}

interface EventOverrides {
  name?: string
  eventId?: string
  siteId?: string
  sessionId?: string
  anonymousId?: string
  occurredAt?: string
  consent?: { analytics: boolean; marketing: boolean; personalization: boolean }
  utm?: Record<string, string>
  clickIds?: Record<string, string>
  url?: string
  referrer?: string
  value?: number
  currency?: string
  properties?: Record<string, unknown>
}

/** One event exactly as the browser SDK serializes it. */
function sdkEvent(overrides: EventOverrides = {}) {
  return {
    eventId: overrides.eventId ?? eventId('default'),
    name: overrides.name ?? 'page_view',
    occurredAt: overrides.occurredAt ?? new Date().toISOString(),
    siteId: overrides.siteId ?? siteId,
    sessionId: overrides.sessionId ?? SESSION,
    anonymousId: overrides.anonymousId ?? VISITOR,
    userId: null,
    consent: overrides.consent ?? { analytics: true, marketing: true, personalization: true },
    context: {
      url: overrides.url ?? 'https://example.test/',
      referrer: overrides.referrer ?? '',
      userAgent: 'Mozilla/5.0 (tracking-test)',
      locale: 'nl',
      ...(overrides.utm ? { utm: overrides.utm } : {}),
      ...(overrides.clickIds ? { clickIds: overrides.clickIds } : {}),
    },
    ...(overrides.value !== undefined ? { value: overrides.value } : {}),
    ...(overrides.currency ? { currency: overrides.currency } : {}),
    properties: overrides.properties ?? {},
  }
}

function collect(events: unknown[], as: { cookie: string; tenantId: string }) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/tracking/collect',
    headers: { cookie: as.cookie, 'x-tenant-id': as.tenantId },
    payload: { events },
  })
}

async function registerTenant(email: string, organizationName: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: PASSWORD, name: 'Tracking Test', organizationName },
  })

  return {
    tenantId: body(response).data.activeTenantId as string,
    cookie: String(response.headers['set-cookie']).split(';')[0]!,
  }
}

async function createSite(as: { cookie: string; tenantId: string }, slug: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/sites',
    headers: { cookie: as.cookie, 'x-tenant-id': as.tenantId },
    payload: { name: 'Tracking Site', slug, locale: 'nl' },
  })
  return body(response).data.id as string
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const owner = await registerTenant(EMAIL, `Tracking Test ${suffix}`)
  tenantId = owner.tenantId
  cookie = owner.cookie
  siteId = await createSite(owner, `tracking-site-${suffix}`)

  const other = await registerTenant(OTHER_EMAIL, `Tracking Other ${suffix}`)
  otherTenantId = other.tenantId
  otherCookie = other.cookie
  otherSiteId = await createSite(other, `tracking-other-${suffix}`)
})

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email IN (${EMAIL}, ${OTHER_EMAIL})`
  })
  await app.close()
  await closeDatabase()
})

describe('the collection endpoint', () => {
  it('refuses an unauthenticated batch', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tracking/collect',
      payload: { events: [sdkEvent()] },
    })
    expect(response.statusCode).toBe(401)
  })

  it('accepts a batch and reports what every destination did with it', async () => {
    const response = await collect(
      [
        sdkEvent({
          eventId: eventId('landing'),
          name: 'page_view',
          url: 'https://example.test/?utm_source=google&utm_medium=cpc&utm_campaign=spring',
          utm: { source: 'google', medium: 'cpc', campaign: 'spring' },
          clickIds: { gclid: `gclid-${suffix}` },
        }),
      ],
      { cookie, tenantId },
    )

    expect(response.statusCode).toBe(200)
    const result = body(response).data
    expect(result.received).toBe(1)
    expect(result.accepted).toBe(1)
    expect(result.duplicates).toBe(0)

    const deliveries: { destination: string; status: string }[] = result.results[0].deliveries
    // Every destination reports, including the ones that did nothing.
    expect(deliveries.map((entry) => entry.destination).sort()).toEqual([
      'ga4',
      'google_ads',
      'internal',
      'meta_capi',
    ])
    expect(deliveries.find((entry) => entry.destination === 'internal')?.status).toBe('delivered')
  })

  it('reports a destination without credentials as not configured rather than failed', async () => {
    const response = await collect(
      [sdkEvent({ eventId: eventId('unconfigured'), name: 'service_view' })],
      { cookie, tenantId },
    )

    const deliveries: { destination: string; status: string; reason: string | null }[] =
      body(response).data.results[0].deliveries

    for (const id of ['ga4', 'google_ads', 'meta_capi']) {
      const delivery = deliveries.find((entry) => entry.destination === id)
      // Consent was granted here, so the only remaining reason is credentials.
      expect(delivery?.status).toBe('not_configured')
      expect(delivery?.reason).toMatch(/credentials/i)
    }
  })

  it('rejects an event naming a site the workspace does not own', async () => {
    const response = await collect(
      [sdkEvent({ eventId: eventId('foreign-site'), siteId: otherSiteId })],
      { cookie, tenantId },
    )

    const result = body(response).data
    expect(result.rejected).toBe(1)
    expect(result.accepted).toBe(0)
    expect(result.results[0].status).toBe('rejected')
  })
})

describe('the consent engine', () => {
  it('withholds analytics and marketing destinations when consent was not given', async () => {
    const response = await collect(
      [
        sdkEvent({
          eventId: eventId('no-consent'),
          name: 'lead',
          consent: { analytics: false, marketing: false, personalization: false },
        }),
      ],
      { cookie, tenantId },
    )

    const deliveries: { destination: string; status: string; reason: string | null }[] =
      body(response).data.results[0].deliveries

    expect(deliveries.find((entry) => entry.destination === 'ga4')?.status).toBe('skipped')
    expect(deliveries.find((entry) => entry.destination === 'ga4')?.reason).toMatch(/analytics consent/i)
    expect(deliveries.find((entry) => entry.destination === 'google_ads')?.status).toBe('skipped')
    expect(deliveries.find((entry) => entry.destination === 'meta_capi')?.reason).toMatch(/marketing consent/i)

    // The first-party store is not consent-gated, so the customer keeps their
    // own record — and the withheld decision stays visible next to it.
    expect(deliveries.find((entry) => entry.destination === 'internal')?.status).toBe('delivered')
  })

  it('withholds marketing while allowing analytics when only analytics was granted', async () => {
    const response = await collect(
      [
        sdkEvent({
          eventId: eventId('analytics-only'),
          name: 'purchase',
          value: 49.95,
          currency: 'EUR',
          consent: { analytics: true, marketing: false, personalization: false },
        }),
      ],
      { cookie, tenantId },
    )

    const deliveries: { destination: string; status: string }[] = body(response).data.results[0].deliveries
    expect(deliveries.find((entry) => entry.destination === 'ga4')?.status).toBe('not_configured')
    expect(deliveries.find((entry) => entry.destination === 'meta_capi')?.status).toBe('skipped')
  })
})

describe('deduplication', () => {
  it('counts a repeated event id once', async () => {
    const id = eventId('dedupe')
    const first = await collect([sdkEvent({ eventId: id, name: 'form_start' })], { cookie, tenantId })
    const second = await collect([sdkEvent({ eventId: id, name: 'form_start' })], { cookie, tenantId })

    expect(body(first).data.accepted).toBe(1)
    expect(body(second).data.accepted).toBe(0)
    expect(body(second).data.duplicates).toBe(1)
    expect(body(second).data.results[0].status).toBe('duplicate')
    // A duplicate is not fanned out again; that is the point of the shared id.
    expect(body(second).data.results[0].deliveries).toHaveLength(0)
  })

  it('deduplicates within a single batch as well as across requests', async () => {
    const id = eventId('dedupe-batch')
    const response = await collect(
      [sdkEvent({ eventId: id, name: 'phone_click' }), sdkEvent({ eventId: id, name: 'phone_click' })],
      { cookie, tenantId },
    )

    expect(body(response).data.accepted).toBe(1)
    expect(body(response).data.duplicates).toBe(1)
  })

  it('lets a different workspace use the same event id', async () => {
    // Dedup is keyed per tenant: two customers generating the same id must not
    // silently discard each other's conversions.
    const id = eventId('dedupe-cross-tenant')
    await collect([sdkEvent({ eventId: id })], { cookie, tenantId })

    const response = await collect(
      [sdkEvent({ eventId: id, siteId: otherSiteId, anonymousId: `anon-${suffix}-other` })],
      { cookie: otherCookie, tenantId: otherTenantId },
    )
    expect(body(response).data.accepted).toBe(1)
  })
})

describe('batch validation', () => {
  it('rejects an empty batch', async () => {
    const response = await collect([], { cookie, tenantId })
    expect(response.statusCode).toBe(400)
  })

  it('rejects a batch larger than the cap', async () => {
    const events = Array.from({ length: 51 }, (_, index) => sdkEvent({ eventId: eventId(`bulk-${index}`) }))
    const response = await collect(events, { cookie, tenantId })
    expect(response.statusCode).toBe(400)
  })

  it('rejects an event name that is not in the contract', async () => {
    const response = await collect([{ ...sdkEvent({ eventId: eventId('bad-name') }), name: 'made_up' }], {
      cookie,
      tenantId,
    })
    expect(response.statusCode).toBe(400)
    expect(body(response).error.code).toBe('bad_request')
  })

  it('rejects an event with no consent object at all', async () => {
    const { consent: _consent, ...withoutConsent } = sdkEvent({ eventId: eventId('no-consent-field') })
    const response = await collect([withoutConsent], { cookie, tenantId })
    expect(response.statusCode).toBe(400)
  })
})

describe('the event feed', () => {
  it('returns stored events with their delivery verdicts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tracking/events',
      headers: { cookie, 'x-tenant-id': tenantId },
      query: { anonymousId: VISITOR, limit: '50' },
    })

    expect(response.statusCode).toBe(200)
    const events: { eventId: string; deliveries: unknown[] }[] = body(response).data
    const landing = events.find((event) => event.eventId === eventId('landing'))
    expect(landing).toBeTruthy()
    expect(landing?.deliveries.length).toBe(4)
  })

  it('filters by event name', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tracking/events',
      headers: { cookie, 'x-tenant-id': tenantId },
      query: { name: 'purchase' },
    })

    const events: { name: string; value: number | null; currency: string | null }[] = body(response).data
    expect(events.length).toBeGreaterThan(0)
    expect(events.every((event) => event.name === 'purchase')).toBe(true)
    expect(events[0]?.value).toBe(49.95)
    expect(events[0]?.currency).toBe('EUR')
  })
})

describe('delivery reporting', () => {
  it('reports every destination, configured or not, with its counts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tracking/destinations',
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    const destinations: {
      id: string
      configured: boolean
      consent: string
      delivered: number
      skipped: number
      notConfigured: number
    }[] = body(response).data.destinations

    expect(destinations.map((entry) => entry.id).sort()).toEqual(['ga4', 'google_ads', 'internal', 'meta_capi'])

    const internal = destinations.find((entry) => entry.id === 'internal')
    expect(internal?.configured).toBe(true)
    expect(internal?.consent).toBe('none')
    expect(internal?.delivered).toBeGreaterThan(0)

    const meta = destinations.find((entry) => entry.id === 'meta_capi')
    expect(meta?.configured).toBe(false)
    expect(meta?.consent).toBe('marketing')
    // Both reasons a hit never arrived are countable and distinguishable.
    expect(meta?.skipped).toBeGreaterThan(0)
    expect(meta?.notConfigured).toBeGreaterThan(0)
  })
})

describe('attribution', () => {
  const journeyVisitor = `anon-${suffix}-journey`

  it('credits the campaign that started the journey', async () => {
    const start = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const convert = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    await collect(
      [
        sdkEvent({
          eventId: eventId('journey-landing'),
          name: 'page_view',
          occurredAt: start,
          anonymousId: journeyVisitor,
          sessionId: `sess-${suffix}-journey`,
          url: 'https://example.test/?utm_source=google&utm_medium=cpc&utm_campaign=spring',
          utm: { source: 'google', medium: 'cpc', campaign: 'spring' },
        }),
        sdkEvent({
          eventId: eventId('journey-lead'),
          name: 'lead',
          occurredAt: convert,
          anonymousId: journeyVisitor,
          sessionId: `sess-${suffix}-journey`,
          url: 'https://example.test/contact',
          value: 250,
          currency: 'EUR',
        }),
      ],
      { cookie, tenantId },
    )

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tracking/attribution',
      headers: { cookie, 'x-tenant-id': tenantId },
      query: { model: 'last_click', events: 'lead', days: '2' },
    })

    expect(response.statusCode).toBe(200)
    const report = body(response).data
    expect(report.model).toBe('last_click')

    const google = report.rows.find((row: { channel: string }) => row.channel === 'google / cpc')
    expect(google).toBeTruthy()
    expect(google.campaign).toBe('spring')
    expect(google.conversions).toBeGreaterThan(0)
  })

  it('returns the same journey under every model', async () => {
    for (const model of ['first_click', 'last_click', 'linear']) {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tracking/attribution',
        headers: { cookie, 'x-tenant-id': tenantId },
        query: { model, events: 'lead', days: '2' },
      })

      expect(response.statusCode).toBe(200)
      expect(body(response).data.model).toBe(model)
      // A single-session journey is credited identically by all three, which
      // is the sanity check that the models read one dataset.
      expect(body(response).data.rows.length).toBeGreaterThan(0)
    }
  })

  it('keeps first touch and last touch for a visitor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tracking/identities/${journeyVisitor}`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    const identity = body(response).data
    expect(identity.firstTouch.source).toBe('google')
    expect(identity.firstTouch.campaign).toBe('spring')
    // The conversion arrived without campaign parameters. A direct hit must
    // not erase the campaign that earned the lead.
    expect(identity.lastTouch.source).toBe('google')
  })

  it('reports an unknown visitor as not found', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tracking/identities/nobody-${suffix}-here`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(response.statusCode).toBe(404)
  })
})

describe('tenant isolation of tracking data', () => {
  it('does not show one workspace the other workspace’s events', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tracking/events',
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
      query: { limit: '200' },
    })

    const eventIds: string[] = body(response).data.map((event: { eventId: string }) => event.eventId)
    expect(eventIds).not.toContain(eventId('landing'))
    expect(eventIds).not.toContain(eventId('journey-lead'))
  })

  it('does not leak a visitor across workspaces', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/tracking/identities/${VISITOR}`,
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })
    expect(response.statusCode).toBe(404)
  })

  it('refuses a workspace the user is not a member of', async () => {
    const response = await collect([sdkEvent()], { cookie: otherCookie, tenantId })
    expect(response.statusCode).toBe(403)
  })

  it('stores tracking rows behind row-level security', async () => {
    // No tenant context at all: the safe default is zero rows (ADR-0004).
    const rows = await withoutTenant(
      (tx) => tx<{ id: string }[]>`SELECT id FROM tracking_events WHERE event_id = ${eventId('landing')}`,
    )
    expect(rows).toHaveLength(0)
  })
})
