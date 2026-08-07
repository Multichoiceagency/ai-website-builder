import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'

/**
 * Phase 6b — Google Ads and Meta Ads.
 *
 * The interesting assertions here are the ones about what *cannot* happen: an
 * unconfigured network cannot invent data, a draft cannot become a live
 * campaign without an explicit confirmation, a budget cannot exceed the
 * workspace ceiling, and one tenant cannot see another's campaigns. Those are
 * the properties that make it safe to point an agent at an ad account.
 *
 * Nothing is mocked. This installation genuinely has no ad credentials, which
 * makes it the exact environment the honesty assertions are about.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `ads-test-${suffix}@platform.local`
const OTHER_EMAIL = `ads-other-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'

let app: FastifyInstance
let cookie = ''
let tenantId = ''
let otherCookie = ''
let otherTenantId = ''
let draftId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

function auth() {
  return { cookie, 'x-tenant-id': tenantId }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const register = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: EMAIL, password: PASSWORD, name: 'Ads Test', organizationName: `Ads Test ${suffix}` },
  })
  tenantId = body(register).data.activeTenantId
  cookie = String(register.headers['set-cookie']).split(';')[0]!

  const other = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: OTHER_EMAIL,
      password: PASSWORD,
      name: 'Ads Other',
      organizationName: `Ads Other ${suffix}`,
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

describe('provider status', () => {
  it('requires authentication', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ads/providers' })
    expect(response.statusCode).toBe(401)
  })

  it('reports every network as unconfigured, by name, without pretending otherwise', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ads/providers', headers: auth() })

    expect(response.statusCode).toBe(200)
    const statuses = body(response).data
    expect(statuses.map((entry: { provider: string }) => entry.provider)).toEqual(['google_ads', 'meta_ads'])

    for (const status of statuses) {
      expect(status.configured).toBe(false)
      expect(status.connected).toBe(false)
      expect(status.available).toBe(false)
      // The reason has to name what is missing, or it is not actionable.
      expect(status.reason).toBeTruthy()
      expect(status.missingConfiguration.length).toBeGreaterThan(0)
      expect(status.requiredScopes.length).toBeGreaterThan(0)
    }
  })

  it('counts the Google Ads developer token as configuration, not just the OAuth client', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ads/providers', headers: auth() })
    const google = body(response).data.find((entry: { provider: string }) => entry.provider === 'google_ads')

    // An OAuth client is not enough for the Ads API: Google issues a separate
    // developer token to the platform, and without it every call fails. An
    // installation that has the client and not the token must still report
    // itself unconfigured, which is the case this asserts.
    expect(google.missingConfiguration).toContain('GOOGLE_ADS_DEVELOPER_TOKEN')
    expect(google.configured).toBe(false)
    expect(google.reason).toContain('GOOGLE_ADS_DEVELOPER_TOKEN')
  })

  it('reports Google Business Profile separately, with the APIs it needs', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ads/google-business', headers: auth() })

    expect(response.statusCode).toBe(200)
    const status = body(response).data
    // Business Profile needs only the OAuth client, so `configured` depends on
    // the installation and is not asserted here. What must hold either way:
    // nobody has connected a profile, so nothing is available and nothing is
    // shown.
    expect(status.connected).toBe(false)
    expect(status.available).toBe(false)
    expect(status.requiredApis.length).toBeGreaterThan(0)
    expect(status.requiredScopes).toContain('https://www.googleapis.com/auth/business.manage')
    // No listing is ever invented.
    expect(status.locations).toEqual([])
  })

  it('starts Google OAuth through the Integration Gateway, or explains why it cannot', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/google/authorize',
      headers: auth(),
      payload: { redirectTo: '/growth/google-business' },
    })
    const payload = body(response)

    if (response.statusCode === 200) {
      expect(payload.data.authorizeUrl).toMatch(/^https:\/\/accounts\.google\.com\//)
      expect(payload.data.authorizeUrl).toContain('code_challenge')
      expect(payload.data.authorizeUrl).toContain('business.manage')
    } else {
      expect(response.statusCode).toBe(400)
      expect(payload.error.message).toMatch(/GOOGLE_CLIENT|OAuth|secret|client/i)
    }
  })
})

describe('an unconfigured provider degrades honestly', () => {
  it('returns an empty account list rather than throwing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ads/providers/google_ads/accounts',
      headers: auth(),
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.items).toEqual([])
    expect(body(response).data.providerStatus.available).toBe(false)
  })

  it('returns no remote campaigns, with the status explaining why', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ads/providers/meta_ads/campaigns',
      headers: auth(),
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.items).toEqual([])
    expect(body(response).data.providerStatus.reason).toBeTruthy()
  })

  it('returns an empty metric series with null ratios, not zeroed ratios', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ads/metrics',
      headers: auth(),
      query: { from: '2026-01-01', to: '2026-01-31', provider: 'google_ads' },
    })

    expect(response.statusCode).toBe(200)
    const [entry] = body(response).data
    expect(entry.series.points).toEqual([])
    expect(entry.series.totals.costMinor).toBe(0)
    // A CPA of zero would be a lie; "we have not measured one" is the truth.
    expect(entry.series.totals.cpaMinor).toBeNull()
    expect(entry.series.totals.ctr).toBeNull()
  })

  it('reports an unconfigured connect attempt instead of failing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ads/providers/google_ads/connect',
      headers: auth(),
      payload: {},
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.status).toBe('unconfigured')
    expect(body(response).data.authorizationUrl).toBeNull()
  })
})

describe('campaign drafting', () => {
  it('creates a campaign as a draft with no network identity', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ads/campaigns',
      headers: auth(),
      payload: {
        provider: 'google_ads',
        name: 'Spoed loodgieter Rotterdam',
        objective: 'leads',
        budget: { amountMinor: 2000, currency: 'EUR', period: 'daily' },
      },
    })

    expect(response.statusCode).toBe(201)
    const campaign = body(response).data
    expect(campaign.status).toBe('draft')
    expect(campaign.externalId).toBeNull()
    expect(campaign.publishedAt).toBeNull()
    draftId = campaign.id
  })

  it('drafts a whole campaign from one sentence, and marks it as needing confirmation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ads/campaigns/draft-with-ai',
      headers: auth(),
      payload: {
        provider: 'google_ads',
        prompt: 'Create a Google Ads campaign for emergency plumbers in Rotterdam',
        landingPageUrl: '/diensten/spoed',
        dailyBudgetMinor: 3000,
        save: true,
      },
    })

    expect(response.statusCode).toBe(201)
    const result = body(response).data
    expect(result.requiresConfirmation).toBe(true)
    expect(result.riskClass).toBe('medium')
    expect(result.campaignId).toBeTruthy()

    const draft = result.draft
    expect(draft.source).toBe('ai')
    // The brief mentioned a city and an urgency; both have to survive into the
    // structure or the drafting is decorative.
    expect(draft.geoTargets[0].value).toBe('Rotterdam')
    expect(draft.adGroups.length).toBeGreaterThan(1)
    expect(draft.adGroups[0].keywords.length).toBeGreaterThan(0)
    expect(draft.adGroups[0].negativeKeywords.length).toBeGreaterThan(0)
    expect(draft.adGroups[0].ads[0].headlines.length).toBeGreaterThan(0)
    expect(draft.extensions.length).toBeGreaterThan(0)
    expect(draft.conversionEvents).toContain('lead')
    // It was told the budget, so it must not have assumed one.
    expect(draft.budget.amountMinor).toBe(3000)
  })

  it('states the budget it assumed when none was given', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ads/campaigns/draft-with-ai',
      headers: auth(),
      payload: {
        provider: 'meta_ads',
        prompt: 'Campaign for a beauty salon in Utrecht',
        save: false,
      },
    })

    expect(response.statusCode).toBe(201)
    const result = body(response).data
    // Nothing was written, because nothing was asked to be.
    expect(result.campaignId).toBeNull()
    expect(result.draft.assumptions.join(' ')).toMatch(/budget/i)
    // Meta has no keywords; the approximation must be surfaced, not hidden.
    expect(result.draft.warnings.join(' ')).toMatch(/keyword/i)
  })
})

describe('publishing is a separate, confirmed act', () => {
  it('refuses a publish that carries no confirmation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/ads/campaigns/${draftId}/publish`,
      headers: auth(),
      payload: {},
    })

    expect(response.statusCode).toBe(400)
  })

  it('refuses a confirmation for a budget that is not the current one', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/ads/campaigns/${draftId}/publish`,
      headers: auth(),
      payload: { confirm: true, acknowledgedBudgetMinor: 999_999 },
    })

    expect(response.statusCode).toBe(409)
  })

  it('fails loudly rather than silently when the network is unavailable', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/ads/campaigns/${draftId}/publish`,
      headers: auth(),
      payload: { confirm: true, acknowledgedBudgetMinor: 2000 },
    })

    expect(response.statusCode).toBe(503)
    expect(body(response).error.code).toBe('provider_not_configured')
  })

  it('leaves the campaign a draft after a failed publish', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/ads/campaigns/${draftId}`,
      headers: auth(),
    })

    expect(body(response).data.status).toBe('draft')
    expect(body(response).data.externalId).toBeNull()
  })

  it('refuses to publish a draft that is already over the workspace ceiling', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/ads/campaigns',
      headers: auth(),
      payload: {
        provider: 'google_ads',
        name: 'Far too expensive',
        budget: { amountMinor: 900_000, currency: 'EUR', period: 'daily' },
      },
    })
    const id = body(created).data.id

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/ads/campaigns/${id}/publish`,
      headers: auth(),
      payload: { confirm: true, acknowledgedBudgetMinor: 900_000 },
    })

    // Refused by the guardrail, before the adapter is ever reached.
    expect(response.statusCode).toBe(409)
    expect(body(response).error.details.rule).toBe('max_daily_budget')

    // The attempt is rolled back, but the record of it must not be: a refusal
    // written inside the refusing transaction would vanish with it.
    const activity = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/current/activity',
      headers: auth(),
    })
    const refusals = body(activity).data.filter(
      (entry: { name: string; resourceId: string }) =>
        entry.name === 'ads.budget_change_refused' && entry.resourceId === id,
    )
    expect(refusals).toHaveLength(1)
  })
})

describe('budget changes are guarded, not just confirmed', () => {
  it('rejects a change with no explicit confirmation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/ads/campaigns/${draftId}/budget`,
      headers: auth(),
      payload: { amountMinor: 2500, reason: 'testing' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('refuses an increase beyond the guardrail, and does not apply it', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/ads/campaigns/${draftId}/budget`,
      headers: auth(),
      payload: { amountMinor: 20_000, confirm: true, reason: 'scaling up' },
    })

    expect(response.statusCode).toBe(409)
    expect(body(response).error.details.rule).toBe('max_increase_percent')

    const after = await app.inject({
      method: 'GET',
      url: `/api/v1/ads/campaigns/${draftId}`,
      headers: auth(),
    })
    expect(body(after).data.budget.amountMinor).toBe(2000)
  })

  it('records a refused increase in the audit log', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/current/activity',
      headers: auth(),
    })

    const names = body(response).data.map((entry: { name: string }) => entry.name)
    expect(names).toContain('ads.budget_change_refused')
  })

  it('allows a change inside the guardrail and audits it', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/ads/campaigns/${draftId}/budget`,
      headers: auth(),
      payload: { amountMinor: 2800, confirm: true, reason: 'small increase within the ceiling' },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.budget.amountMinor).toBe(2800)

    const activity = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/current/activity',
      headers: auth(),
    })
    expect(body(activity).data.map((entry: { name: string }) => entry.name)).toContain('ads.budget_changed')
  })

  it('always allows spending less', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/ads/campaigns/${draftId}/budget`,
      headers: auth(),
      payload: { amountMinor: 500, confirm: true, reason: 'slowing down' },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.budget.amountMinor).toBe(500)
  })
})

describe('tenant isolation', () => {
  it('reports another workspace’s campaign as not found', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/ads/campaigns/${draftId}`,
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })

    expect(response.statusCode).toBe(404)
  })

  it('does not leak another workspace’s campaigns into a list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ads/campaigns',
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.items).toEqual([])
  })

  it('refuses a budget change against a campaign in another workspace', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/ads/campaigns/${draftId}/budget`,
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
      payload: { amountMinor: 100, confirm: true, reason: 'not mine' },
    })

    expect(response.statusCode).toBe(404)
  })
})

describe('conversion tracking', () => {
  it('maps one of our tracking events onto a network conversion action', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/ads/conversions',
      headers: auth(),
      payload: {
        provider: 'google_ads',
        trackingEvent: 'lead',
        conversionActionName: 'Website lead',
        valueMode: 'fixed',
        fixedValueMinor: 5000,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.trackingEvent).toBe('lead')
    expect(body(response).data.externalId).toBeNull()
  })

  it('keeps one mapping per event per network', async () => {
    await app.inject({
      method: 'PUT',
      url: '/api/v1/ads/conversions',
      headers: auth(),
      payload: { provider: 'google_ads', trackingEvent: 'lead', conversionActionName: 'Renamed lead' },
    })

    const response = await app.inject({ method: 'GET', url: '/api/v1/ads/conversions', headers: auth() })
    const mappings = body(response).data.filter(
      (entry: { trackingEvent: string }) => entry.trackingEvent === 'lead',
    )
    expect(mappings).toHaveLength(1)
    expect(mappings[0].conversionActionName).toBe('Renamed lead')
  })

  it('rejects an event name that is not in our vocabulary', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/ads/conversions',
      headers: auth(),
      payload: { provider: 'google_ads', trackingEvent: 'not_a_real_event', conversionActionName: 'X' },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('guardrails', () => {
  it('exists for a workspace that never configured one', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ads/guardrails', headers: auth() })

    expect(response.statusCode).toBe(200)
    // The absence of a configured ceiling must never read as "no ceiling".
    expect(body(response).data.maxDailyBudgetMinor).toBeGreaterThan(0)
    expect(body(response).data.autonomousBudgetChanges).toBe(false)
  })

  it('audits a change to the ceiling itself', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/ads/guardrails',
      headers: auth(),
      payload: { maxIncreasePercent: 25 },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.maxIncreasePercent).toBe(25)

    const activity = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/current/activity',
      headers: auth(),
    })
    expect(body(activity).data.map((entry: { name: string }) => entry.name)).toContain('ads.guardrails_changed')
  })
})
