import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'

/**
 * Analytics, attribution and tracking operations (§21, §26, §28), end to end.
 *
 * The events below are ingested through the real collection endpoint, so every
 * assertion here is against numbers the platform genuinely derived from
 * `tracking_events`, `tracking_sessions` and `tracking_deliveries` — which is
 * the only way to test a product whose entire claim is "these numbers are
 * real".
 *
 * Three workspaces on purpose: one with a known corpus, one with a single event
 * (isolation), one that never ingests anything (the empty state, which must be
 * zeroes rather than a stack trace).
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `analytics-test-${suffix}@platform.local`
const OTHER_EMAIL = `analytics-other-${suffix}@platform.local`
const EMPTY_EMAIL = `analytics-empty-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/** Visitors and sessions in the fixture corpus. */
const V1 = `anon-${suffix}-v1`
const V2 = `anon-${suffix}-v2`
const V3 = `anon-${suffix}-v3`
const V4 = `anon-${suffix}-v4`
const JOURNEY = `anon-${suffix}-jrn`

let app: FastifyInstance
let cookie = ''
let tenantId = ''
let siteId = ''

let otherCookie = ''
let otherTenantId = ''
let otherSiteId = ''

let emptyCookie = ''
let emptyTenantId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

interface EventOverrides {
  name?: string
  eventId: string
  siteId?: string
  sessionId: string
  anonymousId: string
  ago: number
  consent?: { analytics: boolean; marketing: boolean; personalization: boolean }
  utm?: Record<string, string>
  url?: string
  value?: number
  currency?: string
}

/** One event exactly as the browser SDK serializes it. */
function sdkEvent(overrides: EventOverrides) {
  return {
    eventId: overrides.eventId,
    name: overrides.name ?? 'page_view',
    occurredAt: new Date(Date.now() - overrides.ago).toISOString(),
    siteId: overrides.siteId ?? siteId,
    sessionId: overrides.sessionId,
    anonymousId: overrides.anonymousId,
    userId: null,
    consent: overrides.consent ?? { analytics: true, marketing: true, personalization: true },
    context: {
      url: overrides.url ?? 'https://example.test/',
      referrer: '',
      userAgent: 'Mozilla/5.0 (analytics-test)',
      locale: 'nl',
      ...(overrides.utm ? { utm: overrides.utm } : {}),
    },
    ...(overrides.value !== undefined ? { value: overrides.value } : {}),
    ...(overrides.currency ? { currency: overrides.currency } : {}),
    properties: {},
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

function read(path: string, as: { cookie: string; tenantId: string }, query: Record<string, string> = {}) {
  return app.inject({
    method: 'GET',
    url: path,
    headers: { cookie: as.cookie, 'x-tenant-id': as.tenantId },
    query,
  })
}

async function registerTenant(email: string, organizationName: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: PASSWORD, name: 'Analytics Test', organizationName },
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
    payload: { name: 'Analytics Site', slug, locale: 'nl' },
  })
  return body(response).data.id as string
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const owner = await registerTenant(EMAIL, `Analytics Test ${suffix}`)
  tenantId = owner.tenantId
  cookie = owner.cookie
  siteId = await createSite(owner, `analytics-site-${suffix}`)

  const other = await registerTenant(OTHER_EMAIL, `Analytics Other ${suffix}`)
  otherTenantId = other.tenantId
  otherCookie = other.cookie
  otherSiteId = await createSite(other, `analytics-other-${suffix}`)

  const empty = await registerTenant(EMPTY_EMAIL, `Analytics Empty ${suffix}`)
  emptyTenantId = empty.tenantId
  emptyCookie = empty.cookie

  /**
   * The corpus. Deliberately small and fully enumerated, so every count below
   * is an exact number rather than a "greater than zero" that would still pass
   * if the aggregate were wrong.
   *
   *   V1 / s1   paid search  → page_view, form_submit
   *   V2 / s2   direct       → page_view, purchase €100
   *   J  / j1   paid search  → page_view                     (72h ago)
   *   J  / j2   e-mail       → page_view, lead €300          (48h / 24h ago)
   *   V4 / s4   direct, consent refused → page_view
   *   V3 / s3   direct       → page_view                     (10 days ago)
   */
  const accepted = await collect(
    [
      sdkEvent({
        eventId: `evt-${suffix}-a1`,
        anonymousId: V1,
        sessionId: `sess-${suffix}-s1`,
        ago: HOUR,
        url: 'https://example.test/pricing?ref=news',
        utm: { source: 'google', medium: 'cpc', campaign: 'spring' },
      }),
      sdkEvent({
        eventId: `evt-${suffix}-a2`,
        name: 'form_submit',
        anonymousId: V1,
        sessionId: `sess-${suffix}-s1`,
        ago: 50 * 60 * 1000,
        url: 'https://example.test/contact',
      }),
      sdkEvent({
        eventId: `evt-${suffix}-a3`,
        anonymousId: V2,
        sessionId: `sess-${suffix}-s2`,
        ago: 2 * HOUR,
        url: 'https://example.test/',
      }),
      sdkEvent({
        eventId: `evt-${suffix}-a4`,
        name: 'purchase',
        anonymousId: V2,
        sessionId: `sess-${suffix}-s2`,
        ago: 90 * 60 * 1000,
        url: 'https://example.test/checkout/done',
        value: 100,
        currency: 'EUR',
      }),
      sdkEvent({
        eventId: `evt-${suffix}-j1`,
        anonymousId: JOURNEY,
        sessionId: `sess-${suffix}-j1`,
        ago: 72 * HOUR,
        url: 'https://example.test/a',
        utm: { source: 'google', medium: 'cpc', campaign: 'spring' },
      }),
      sdkEvent({
        eventId: `evt-${suffix}-j2`,
        anonymousId: JOURNEY,
        sessionId: `sess-${suffix}-j2`,
        ago: 48 * HOUR,
        url: 'https://example.test/b',
        utm: { source: 'newsletter', medium: 'email', campaign: 'june' },
      }),
      sdkEvent({
        eventId: `evt-${suffix}-j3`,
        name: 'lead',
        anonymousId: JOURNEY,
        sessionId: `sess-${suffix}-j2`,
        ago: 24 * HOUR,
        url: 'https://example.test/thanks',
        value: 300,
        currency: 'EUR',
      }),
      sdkEvent({
        eventId: `evt-${suffix}-a5`,
        anonymousId: V4,
        sessionId: `sess-${suffix}-s4`,
        ago: 30 * 60 * 1000,
        url: 'https://example.test/no-consent',
        consent: { analytics: false, marketing: false, personalization: false },
      }),
      sdkEvent({
        eventId: `evt-${suffix}-old`,
        anonymousId: V3,
        sessionId: `sess-${suffix}-s3`,
        ago: 10 * DAY,
        url: 'https://example.test/old-page',
      }),
    ],
    { cookie, tenantId },
  )

  expect(body(accepted).data.accepted).toBe(9)

  await collect(
    [
      sdkEvent({
        eventId: `evt-${suffix}-other`,
        siteId: otherSiteId,
        anonymousId: `anon-${suffix}-other`,
        sessionId: `sess-${suffix}-other`,
        ago: HOUR,
        url: 'https://other.test/',
      }),
    ],
    { cookie: otherCookie, tenantId: otherTenantId },
  )
})

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email IN (${EMAIL}, ${OTHER_EMAIL}, ${EMPTY_EMAIL})`
  })
  await app.close()
  await closeDatabase()
})

describe('access control', () => {
  it('refuses an unauthenticated read', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/analytics/overview' })
    expect(response.statusCode).toBe(401)
  })

  it('refuses a workspace the user is not a member of', async () => {
    const response = await read('/api/v1/analytics/overview', { cookie: otherCookie, tenantId })
    expect(response.statusCode).toBe(403)
  })
})

describe('the overview', () => {
  it('counts exactly what was collected in the window', async () => {
    const response = await read('/api/v1/analytics/overview', { cookie, tenantId }, { days: '5' })
    expect(response.statusCode).toBe(200)

    const data = body(response).data
    expect(data.metrics.visitors.current).toBe(4)
    expect(data.metrics.sessions.current).toBe(5)
    expect(data.metrics.pageViews.current).toBe(5)
    expect(data.metrics.leads.current).toBe(1)
    // form_submit, purchase and lead are all conversion events.
    expect(data.metrics.conversions.current).toBe(3)
    expect(data.metrics.conversionRate.current).toBeCloseTo(3 / 5, 6)
    expect(data.metrics.revenue.current).toBe(100)
    expect(data.metrics.orders.current).toBe(1)
    expect(data.metrics.averageOrderValue.current).toBe(100)
    expect(data.currency).toBe('EUR')
  })

  it('reports no change rather than an infinite one against an empty baseline', async () => {
    const response = await read('/api/v1/analytics/overview', { cookie, tenantId }, { days: '5' })
    const data = body(response).data

    // Nothing was collected in the five days before the corpus, so "up 100%"
    // would be a sentence invented out of an empty denominator.
    expect(data.metrics.visitors.previous).toBe(0)
    expect(data.metrics.visitors.changePct).toBeNull()
  })

  it('returns a zero-filled daily series covering the whole window', async () => {
    const response = await read('/api/v1/analytics/overview', { cookie, tenantId }, { days: '5' })
    const series: { date: string; visitors: number; revenue: number }[] = body(response).data.series

    // A rolling window touches `days` or `days + 1` calendar days.
    expect(series.length).toBeGreaterThanOrEqual(5)
    expect(series.length).toBeLessThanOrEqual(6)
    expect(series.every((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.date))).toBe(true)
    // Dates ascend with no gaps, so a quiet day is a zero rather than a
    // straight line the chart drew across it.
    const sorted = [...series].map((point) => point.date).sort()
    expect(series.map((point) => point.date)).toEqual(sorted)
    expect(series.reduce((total, point) => total + point.visitors, 0)).toBeGreaterThan(0)
    expect(series.reduce((total, point) => total + point.revenue, 0)).toBe(100)
  })

  it('breaks traffic down by channel, campaign and landing page', async () => {
    const response = await read('/api/v1/analytics/overview', { cookie, tenantId }, { days: '5' })
    const breakdowns: { dimension: string; rows: { key: string; sessions: number; visitors: number; conversions: number; revenue: number }[] }[] =
      body(response).data.breakdowns

    const channels = breakdowns.find((entry) => entry.dimension === 'channel')!
    const paid = channels.rows.find((row) => row.key === 'google / cpc')
    expect(paid).toBeTruthy()
    expect(paid!.sessions).toBe(2)
    expect(paid!.visitors).toBe(2)
    expect(paid!.conversions).toBe(1)

    const direct = channels.rows.find((row) => row.key === '(direct) / (none)')
    expect(direct!.revenue).toBe(100)

    const campaigns = breakdowns.find((entry) => entry.dimension === 'campaign')!
    expect(campaigns.rows.map((row) => row.key)).toContain('spring')
    expect(campaigns.rows.map((row) => row.key)).toContain('june')

    const landings = breakdowns.find((entry) => entry.dimension === 'landing_page')!
    // The landing URL is reduced to a path: `/pricing?ref=news` is one page.
    expect(landings.rows.map((row) => row.key)).toContain('/pricing')
  })

  it('lists top pages by path, with the query string stripped', async () => {
    const response = await read('/api/v1/analytics/overview', { cookie, tenantId }, { days: '5' })
    const paths: string[] = body(response).data.topPages.map((page: { path: string }) => page.path)

    expect(paths).toContain('/pricing')
    expect(paths).toContain('/')
    expect(paths).not.toContain('/pricing?ref=news')
  })

  it('measures every funnel stage against the same window', async () => {
    const response = await read('/api/v1/analytics/overview', { cookie, tenantId }, { days: '5' })
    const funnel: { key: string; visitors: number; rateFromStart: number | null }[] = body(response).data.funnel

    const stage = (key: string) => funnel.find((entry) => entry.key === key)!
    expect(stage('visited').visitors).toBe(4)
    expect(stage('explored').visitors).toBe(0)
    expect(stage('committed').visitors).toBe(1)
    expect(stage('converted').visitors).toBe(3)
    expect(stage('converted').rateFromStart).toBeCloseTo(3 / 4, 6)
  })

  it('filters by date range', async () => {
    const narrow = body(await read('/api/v1/analytics/overview', { cookie, tenantId }, { days: '5' })).data
    const wide = body(await read('/api/v1/analytics/overview', { cookie, tenantId }, { days: '30' })).data

    // The ten-day-old page view is outside the narrow window and inside the wide one.
    expect(narrow.metrics.visitors.current).toBe(4)
    expect(wide.metrics.visitors.current).toBe(5)

    const narrowPaths: string[] = narrow.topPages.map((page: { path: string }) => page.path)
    const widePaths: string[] = wide.topPages.map((page: { path: string }) => page.path)
    expect(narrowPaths).not.toContain('/old-page')
    expect(widePaths).toContain('/old-page')
  })

  it('rejects a range beyond the supported maximum', async () => {
    const response = await read('/api/v1/analytics/overview', { cookie, tenantId }, { days: '400' })
    expect(response.statusCode).toBe(400)
  })
})

describe('an empty workspace', () => {
  it('answers with zeroes and empty tables rather than failing', async () => {
    const response = await read(
      '/api/v1/analytics/overview',
      { cookie: emptyCookie, tenantId: emptyTenantId },
      { days: '7' },
    )

    expect(response.statusCode).toBe(200)
    const data = body(response).data

    expect(data.metrics.visitors.current).toBe(0)
    expect(data.metrics.revenue.current).toBe(0)
    expect(data.metrics.conversionRate.current).toBe(0)
    expect(data.metrics.visitors.changePct).toBeNull()
    expect(data.currency).toBeNull()
    expect(data.topPages).toEqual([])
    expect(data.eventCounts).toEqual([])
    expect(data.breakdowns.every((entry: { rows: unknown[] }) => entry.rows.length === 0)).toBe(true)

    // The series is still the full window — a chart with no points and a chart
    // of a quiet week are different statements.
    expect(data.series.length).toBeGreaterThanOrEqual(7)
    expect(data.series.every((point: { visitors: number }) => point.visitors === 0)).toBe(true)

    // Every funnel stage exists at zero, with no ratio invented from 0/0.
    expect(data.funnel).toHaveLength(5)
    expect(data.funnel.every((step: { visitors: number }) => step.visitors === 0)).toBe(true)
    expect(data.funnel.every((step: { rateFromStart: number | null }) => step.rateFromStart === null)).toBe(true)
  })

  it('answers the attribution and journey reports with nothing to credit', async () => {
    const attribution = await read(
      '/api/v1/analytics/attribution',
      { cookie: emptyCookie, tenantId: emptyTenantId },
      { days: '7' },
    )
    expect(attribution.statusCode).toBe(200)
    expect(body(attribution).data.totalConversions).toBe(0)
    expect(body(attribution).data.models).toHaveLength(3)
    expect(body(attribution).data.models.every((model: { rows: unknown[] }) => model.rows.length === 0)).toBe(true)

    const journeys = await read(
      '/api/v1/analytics/journeys',
      { cookie: emptyCookie, tenantId: emptyTenantId },
      { days: '7' },
    )
    expect(journeys.statusCode).toBe(200)
    expect(body(journeys).data.journeys).toEqual([])
  })

  it('still names every destination in the tracking health view', async () => {
    const response = await read('/api/v1/analytics/tracking', {
      cookie: emptyCookie,
      tenantId: emptyTenantId,
    })

    expect(response.statusCode).toBe(200)
    const data = body(response).data
    expect(data.recordedEvents).toBe(0)
    expect(data.destinations.map((entry: { id: string }) => entry.id).sort()).toEqual([
      'ga4',
      'google_ads',
      'internal',
      'meta_capi',
    ])
    expect(data.destinations.every((entry: { discrepancy: number }) => entry.discrepancy === 0)).toBe(true)
  })
})

describe('tenant isolation', () => {
  it('shows a workspace only its own events', async () => {
    const mine = body(await read('/api/v1/analytics/overview', { cookie, tenantId }, { days: '30' })).data
    const theirs = body(
      await read('/api/v1/analytics/overview', { cookie: otherCookie, tenantId: otherTenantId }, { days: '30' }),
    ).data

    expect(mine.metrics.visitors.current).toBe(5)
    // The other workspace collected exactly one event of its own.
    expect(theirs.metrics.visitors.current).toBe(1)
    expect(theirs.metrics.conversions.current).toBe(0)

    const theirPaths: string[] = theirs.topPages.map((page: { path: string }) => page.path)
    expect(theirPaths).not.toContain('/pricing')
    expect(theirPaths).not.toContain('/old-page')
  })

  it('does not leak another workspace’s journeys', async () => {
    const response = await read(
      '/api/v1/analytics/journeys',
      { cookie: otherCookie, tenantId: otherTenantId },
      { days: '30' },
    )

    const visitors: string[] = body(response).data.journeys.map(
      (journey: { anonymousId: string }) => journey.anonymousId,
    )
    expect(visitors).not.toContain(JOURNEY)
  })
})

describe('attribution', () => {
  const query = { days: '5', events: 'lead', lookbackDays: '30' }

  it('credits the same journey differently under each model', async () => {
    const response = await read('/api/v1/analytics/attribution', { cookie, tenantId }, query)
    expect(response.statusCode).toBe(200)

    const data = body(response).data
    expect(data.totalConversions).toBe(1)
    expect(data.totalValue).toBe(300)

    const model = (name: string) =>
      data.models.find((entry: { model: string }) => entry.model === name) as {
        rows: { channel: string; conversions: number; value: number }[]
      }

    const firstClick = model('first_click').rows
    const lastClick = model('last_click').rows
    const linear = model('linear').rows

    // The journey started on paid search and closed on e-mail. The models are
    // supposed to disagree about that — this is the disagreement.
    expect(firstClick).toHaveLength(1)
    expect(firstClick[0]!.channel).toBe('google / cpc')
    expect(firstClick[0]!.value).toBe(300)

    expect(lastClick).toHaveLength(1)
    expect(lastClick[0]!.channel).toBe('newsletter / email')
    expect(lastClick[0]!.value).toBe(300)

    expect(linear).toHaveLength(2)
    expect(linear.every((row) => row.conversions === 0.5)).toBe(true)
    expect(linear.every((row) => row.value === 150)).toBe(true)

    // Whatever the split, the models never invent or lose revenue.
    for (const rows of [firstClick, lastClick, linear]) {
      expect(rows.reduce((total, row) => total + row.value, 0)).toBeCloseTo(300, 6)
      expect(rows.reduce((total, row) => total + row.conversions, 0)).toBeCloseTo(1, 6)
    }
  })

  it('reports the same credit through the dimensional comparison', async () => {
    // The comparison table and the per-model report are two code paths over one
    // dataset. If they ever drift, the dashboard shows two different truths —
    // so they are held together here rather than in a comment.
    const response = await read('/api/v1/analytics/attribution', { cookie, tenantId }, query)
    const data = body(response).data

    const channelRows: {
      key: string
      firstClick: { conversions: number; value: number }
      lastClick: { conversions: number; value: number }
      linear: { conversions: number; value: number }
    }[] = data.dimensions.find((entry: { dimension: string }) => entry.dimension === 'channel').rows

    for (const modelName of ['first_click', 'last_click', 'linear'] as const) {
      const key = modelName === 'first_click' ? 'firstClick' : modelName === 'last_click' ? 'lastClick' : 'linear'
      const fromModel: { channel: string; conversions: number; value: number }[] = data.models.find(
        (entry: { model: string }) => entry.model === modelName,
      ).rows

      for (const row of fromModel) {
        const compared = channelRows.find((entry) => entry.key === row.channel)
        expect(compared, `${modelName} / ${row.channel}`).toBeTruthy()
        expect(compared![key].conversions).toBeCloseTo(row.conversions, 3)
        expect(compared![key].value).toBeCloseTo(row.value, 2)
      }
    }
  })

  it('credits campaigns and landing pages, not only channels', async () => {
    const response = await read('/api/v1/analytics/attribution', { cookie, tenantId }, query)
    const dimensions = body(response).data.dimensions

    const campaigns = dimensions.find((entry: { dimension: string }) => entry.dimension === 'campaign').rows
    const spring = campaigns.find((row: { key: string }) => row.key === 'spring')
    expect(spring.firstClick.value).toBe(300)
    expect(spring.lastClick.value).toBe(0)

    const landings = dimensions.find((entry: { dimension: string }) => entry.dimension === 'landing_page').rows
    expect(landings.map((row: { key: string }) => row.key).sort()).toEqual(['/a', '/b'])
    expect(landings.find((row: { key: string }) => row.key === '/b').lastClick.value).toBe(300)
  })

  it('filters by date range', async () => {
    // The conversion is 24 hours old, so a one-day window must not contain it.
    const outside = await read('/api/v1/analytics/attribution', { cookie, tenantId }, { ...query, days: '1' })
    expect(body(outside).data.totalConversions).toBe(0)
    expect(body(outside).data.models.every((model: { rows: unknown[] }) => model.rows.length === 0)).toBe(true)
  })

  it('drops an unknown event name instead of failing the report', async () => {
    const response = await read(
      '/api/v1/analytics/attribution',
      { cookie, tenantId },
      { ...query, events: 'lead,not_a_real_event' },
    )
    expect(response.statusCode).toBe(200)
    expect(body(response).data.events).toEqual(['lead'])
  })
})

describe('customer journeys', () => {
  it('returns the touches that preceded a conversion, with each model’s credit', async () => {
    const response = await read(
      '/api/v1/analytics/journeys',
      { cookie, tenantId },
      { days: '5', events: 'lead', lookbackDays: '30' },
    )

    expect(response.statusCode).toBe(200)
    const journeys = body(response).data.journeys
    expect(journeys).toHaveLength(1)

    const journey = journeys[0]
    expect(journey.event).toBe('lead')
    expect(journey.anonymousId).toBe(JOURNEY)
    expect(journey.value).toBe(300)
    expect(journey.currency).toBe('EUR')
    // First touch 72h before the event, conversion 24h before now.
    expect(journey.hoursToConvert).toBeCloseTo(48, 0)

    const touches: {
      channel: string
      landingPath: string
      firstClick: number
      lastClick: number
      linear: number
    }[] = journey.touches

    expect(touches.map((touch) => touch.channel)).toEqual(['google / cpc', 'newsletter / email'])
    expect(touches.map((touch) => touch.landingPath)).toEqual(['/a', '/b'])
    expect(touches.map((touch) => touch.firstClick)).toEqual([1, 0])
    expect(touches.map((touch) => touch.lastClick)).toEqual([0, 1])
    expect(touches.map((touch) => touch.linear)).toEqual([0.5, 0.5])
  })
})

describe('tracking operations', () => {
  it('puts our recorded count next to what each destination accepted', async () => {
    const response = await read('/api/v1/analytics/tracking', { cookie, tenantId }, { hours: '24' })
    expect(response.statusCode).toBe(200)

    const data = body(response).data
    // Every event was received just now, whatever its `occurredAt`.
    expect(data.recordedEvents).toBe(9)

    const internal = data.destinations.find((entry: { id: string }) => entry.id === 'internal')
    expect(internal.configured).toBe(true)
    expect(internal.delivered).toBe(9)
    expect(internal.discrepancy).toBe(0)

    const ga4 = data.destinations.find((entry: { id: string }) => entry.id === 'ga4')
    expect(ga4.configured).toBe(false)
    expect(ga4.delivered).toBe(0)
    // The whole gap is accounted for: one refusal of consent, eight with no
    // credentials on this installation.
    expect(ga4.skipped).toBe(1)
    expect(ga4.notConfigured).toBe(8)
    expect(ga4.discrepancy).toBe(9)
    // The decomposition is exact: nothing is missing without a stated reason.
    expect(ga4.skipped + ga4.notConfigured + ga4.failed).toBe(ga4.discrepancy)
  })

  it('surfaces the consent decision that withheld an event, with its reason', async () => {
    const response = await read('/api/v1/analytics/tracking', { cookie, tenantId }, { hours: '24' })
    const skips: { destination: string; reason: string | null; count: number }[] = body(response).data.consentSkips

    const analyticsSkip = skips.find((entry) => entry.destination === 'ga4')
    expect(analyticsSkip).toBeTruthy()
    expect(analyticsSkip!.reason).toMatch(/analytics consent/i)
    expect(analyticsSkip!.count).toBe(1)

    const marketingSkip = skips.find((entry) => entry.destination === 'meta_capi')
    expect(marketingSkip!.reason).toMatch(/marketing consent/i)
  })

  it('reports event volume per hour and per name', async () => {
    const response = await read('/api/v1/analytics/tracking', { cookie, tenantId }, { hours: '6' })
    const data = body(response).data

    const names: Record<string, number> = Object.fromEntries(
      data.eventCounts.map((entry: { name: string; count: number }) => [entry.name, entry.count]),
    )
    // `eventCounts` is windowed on `occurredAt`, so only the recent events show.
    expect(names.page_view).toBe(3)
    expect(names.form_submit).toBe(1)
    expect(names.purchase).toBe(1)

    expect(data.volume.length).toBeGreaterThanOrEqual(6)
    expect(data.volume.reduce((total: number, point: { events: number }) => total + point.events, 0)).toBe(9)
  })
})
