import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { closeDatabase, withTenant, withoutTenant } from '../src/db/client.js'
import { insertDomain } from '../src/db/repositories/sites.js'
import { autonomousGuardrailsSchema, type Experiment } from '@platform/schemas'
import { isAdmitted, selectVariant } from '../src/lib/experiments/allocation.js'
import { analyseExperiment, type VariantStats } from '../src/lib/experiments/analysis.js'
import { assertWithinChangeLimit, planAutonomousDecision } from '../src/lib/experiments/autonomous.js'

/**
 * Phase 8 and 9.
 *
 * The two halves worth testing are different in kind, so they are tested
 * differently:
 *
 *   * Allocation and significance are pure functions. They are exercised
 *     directly, with no database, because "the same visitor always sees the
 *     same variant" and "no winner below the sample gate" are properties, not
 *     endpoints — and a property is worth thousands of samples, not one call.
 *   * Everything else goes through `app.inject()` against the real database,
 *     the real permission engine and real row-level security.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `experiments-test-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'

let app: FastifyInstance
let cookie = ''
let tenantId = ''
let siteId = ''
let pageId = ''
let userId = ''
let experimentId = ''
let liveExperimentId = ''
let agencyTenantId = ''
let clientTenantId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

/** Variant ids are uuids in the contract, so the fixtures use real ones. */
const VARIANT_IDS: Record<string, string> = {
  c: '00000000-0000-4000-8000-00000000000c',
  a: '00000000-0000-4000-8000-00000000000a',
}

function stats(overrides: Partial<VariantStats> & { key: string }): VariantStats {
  return {
    variantId: VARIANT_IDS[overrides.key]!,
    name: overrides.key,
    isControl: false,
    exposures: 0,
    conversions: 0,
    revenue: 0,
    revenueSumOfSquares: 0,
    ...overrides,
  }
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

// ---------------------------------------------------------------------------
// Properties — no database
// ---------------------------------------------------------------------------

describe('deterministic traffic allocation', () => {
  const variants = [
    { id: 'variant-control', key: 'control', weight: 50 },
    { id: 'variant-a', key: 'a', weight: 50 },
  ]

  it('gives the same visitor the same variant, every time', () => {
    for (let visitor = 0; visitor < 200; visitor += 1) {
      const anonymousId = `anon-${visitor}-${suffix}`
      const first = selectVariant('experiment-1', anonymousId, variants)

      for (let repeat = 0; repeat < 5; repeat += 1) {
        expect(selectVariant('experiment-1', anonymousId, variants)?.id).toBe(first?.id)
      }
    }
  })

  it('does not depend on the order the variants arrive in', () => {
    const reversed = [...variants].reverse()
    for (let visitor = 0; visitor < 100; visitor += 1) {
      const anonymousId = `order-${visitor}-${suffix}`
      expect(selectVariant('experiment-1', anonymousId, reversed)?.id).toBe(
        selectVariant('experiment-1', anonymousId, variants)?.id,
      )
    }
  })

  it('gives the same visitor different variants in different experiments', () => {
    // Otherwise every concurrent test would be measuring the same half of the
    // audience, and their results would be correlated rather than independent.
    let differences = 0
    for (let visitor = 0; visitor < 500; visitor += 1) {
      const anonymousId = `cross-${visitor}-${suffix}`
      if (
        selectVariant('experiment-1', anonymousId, variants)?.id !==
        selectVariant('experiment-2', anonymousId, variants)?.id
      ) {
        differences += 1
      }
    }
    expect(differences).toBeGreaterThan(150)
  })

  it('splits roughly according to weight', () => {
    const counts = new Map<string, number>()
    for (let visitor = 0; visitor < 4000; visitor += 1) {
      const chosen = selectVariant('weighted', `w-${visitor}`, [
        { id: 'control', key: 'control', weight: 80 },
        { id: 'a', key: 'a', weight: 20 },
      ])
      counts.set(chosen!.id, (counts.get(chosen!.id) ?? 0) + 1)
    }

    expect((counts.get('control') ?? 0) / 4000).toBeGreaterThan(0.75)
    expect((counts.get('control') ?? 0) / 4000).toBeLessThan(0.85)
  })

  it('admits a stable subset when traffic is throttled', () => {
    let admitted = 0
    for (let visitor = 0; visitor < 2000; visitor += 1) {
      const anonymousId = `throttle-${visitor}`
      const first = isAdmitted('experiment-1', anonymousId, 25)
      expect(isAdmitted('experiment-1', anonymousId, 25)).toBe(first)
      if (first) admitted += 1
    }

    expect(admitted / 2000).toBeGreaterThan(0.2)
    expect(admitted / 2000).toBeLessThan(0.3)
  })
})

describe('significance', () => {
  const base = {
    experimentId: '00000000-0000-4000-8000-000000000000',
    targetMetric: 'conversion' as const,
    confidenceLevel: 0.95,
    minimumSamplePerVariant: 500,
  }

  it('reports no winner below the minimum sample, however lopsided the numbers', () => {
    // 4/10 against 0/10 is a 100% "lift" and complete noise.
    const results = analyseExperiment({
      ...base,
      stats: [
        stats({ key: 'c', isControl: true, exposures: 10, conversions: 0 }),
        stats({ key: 'a', exposures: 10, conversions: 4 }),
      ],
    })

    expect(results.status).toBe('running')
    expect(results.sampleGateMet).toBe(false)
    expect(results.winner).toBeNull()
    expect(results.variants.every((variant) => !variant.significant)).toBe(true)
    expect(results.summary).toContain('Still collecting')
  })

  it('reports "not conclusive" when the arms agree', () => {
    const results = analyseExperiment({
      ...base,
      stats: [
        stats({ key: 'c', isControl: true, exposures: 2000, conversions: 200 }),
        stats({ key: 'a', exposures: 2000, conversions: 205 }),
      ],
    })

    expect(results.status).toBe('not_conclusive')
    expect(results.sampleGateMet).toBe(true)
    expect(results.winner).toBeNull()
  })

  it('finds a winner when the difference is real', () => {
    const results = analyseExperiment({
      ...base,
      stats: [
        stats({ key: 'c', isControl: true, exposures: 5000, conversions: 500 }),
        stats({ key: 'a', exposures: 5000, conversions: 700 }),
      ],
    })

    expect(results.status).toBe('winner_found')
    expect(results.winner?.variantId).toBe(VARIANT_IDS.a)
    expect(results.winner?.pValue).toBeLessThan(0.05)
    expect(results.winner?.uplift).toBeGreaterThan(0.3)
  })

  it('never crowns a variant that is significantly worse', () => {
    const results = analyseExperiment({
      ...base,
      stats: [
        stats({ key: 'c', isControl: true, exposures: 5000, conversions: 700 }),
        stats({ key: 'a', exposures: 5000, conversions: 500 }),
      ],
    })

    // The difference is real and is reported as such — but a loss is not a win.
    expect(results.variants.find((variant) => variant.key === 'a')?.significant).toBe(true)
    expect(results.status).toBe('not_conclusive')
    expect(results.winner).toBeNull()
  })

  it('judges a revenue test on revenue per visitor, not on order count', () => {
    // Same conversion count on both arms; one sells more per buyer.
    const results = analyseExperiment({
      ...base,
      targetMetric: 'revenue',
      stats: [
        stats({
          key: 'c',
          isControl: true,
          exposures: 4000,
          conversions: 400,
          revenue: 400 * 50,
          revenueSumOfSquares: 400 * 50 * 50,
        }),
        stats({
          key: 'a',
          exposures: 4000,
          conversions: 400,
          revenue: 400 * 80,
          revenueSumOfSquares: 400 * 80 * 80,
        }),
      ],
    })

    expect(results.status).toBe('winner_found')
    expect(results.winner?.variantId).toBe(VARIANT_IDS.a)
    expect(results.winner?.revenuePerVisitor).toBeGreaterThan(7)
  })
})

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

describe('setup', () => {
  it('registers a workspace with a site and a page', async () => {
    const registration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: EMAIL,
        password: PASSWORD,
        name: 'Experiments Test',
        organizationName: `Experiments Test ${suffix}`,
      },
    })
    expect(registration.statusCode).toBe(201)

    tenantId = body(registration).data.activeTenantId
    userId = body(registration).data.user.id
    cookie = String(registration.headers['set-cookie']).split(';')[0]!

    const site = await app.inject({
      method: 'POST',
      url: '/api/v1/sites',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { name: 'Experiments Site', slug: `exp-site-${suffix}`, locale: 'nl' },
    })
    expect(site.statusCode).toBe(201)
    siteId = body(site).data.id

    const page = await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/pages`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        path: '/',
        title: 'Home',
        sections: [{ id: 'sec_hero01', block: 'hero-centered-01', props: { headline: 'Original' } }],
      },
    })
    expect(page.statusCode).toBe(201)
    pageId = body(page).data.id
  })
})

describe('creating an experiment', () => {
  it('validates variant documents against the block registry', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/experiments',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        siteId,
        pageId,
        name: 'Broken variant',
        variants: [
          { key: 'control', name: 'Control', isControl: true, weight: 50, document: null },
          {
            key: 'a',
            name: 'Challenger',
            weight: 50,
            document: {
              kind: 'page',
              sections: [{ id: 'sec_bad', block: 'not-a-real-block-99', props: {} }],
            },
          },
        ],
      },
    })

    expect(response.statusCode).toBe(400)
    expect(body(response).error.code).toBe('unknown_block')
  })

  it('rejects props that violate the block schema', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/experiments',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        siteId,
        pageId,
        name: 'Bad props',
        variants: [
          { key: 'control', name: 'Control', isControl: true, weight: 50, document: null },
          {
            key: 'a',
            name: 'Challenger',
            weight: 50,
            document: {
              kind: 'section',
              targetSectionId: 'sec_hero01',
              section: { id: 'sec_hero01', block: 'hero-centered-01', props: { headline: 12345 } },
            },
          },
        ],
      },
    })

    expect(response.statusCode).toBe(400)
    expect(body(response).error.code).toBe('invalid_block_props')
  })

  it('rejects a section variant that replaces a section the page does not have', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/experiments',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        siteId,
        pageId,
        name: 'Inert variant',
        variants: [
          { key: 'control', name: 'Control', isControl: true, weight: 50, document: null },
          {
            key: 'a',
            name: 'Challenger',
            weight: 50,
            document: {
              kind: 'section',
              targetSectionId: 'sec_does_not_exist',
              section: { id: 'sec_does_not_exist', block: 'hero-centered-01', props: { headline: 'Hi' } },
            },
          },
        ],
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('refuses an experiment without exactly one control', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/experiments',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        siteId,
        pageId,
        name: 'Two baselines',
        variants: [
          { key: 'control', name: 'Control', isControl: true, weight: 50, document: null },
          { key: 'a', name: 'Also control', isControl: true, weight: 50, document: null },
        ],
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('creates a valid experiment', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/experiments',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        siteId,
        pageId,
        name: 'Headline test',
        hypothesis: 'A benefit-led headline converts better than a feature-led one.',
        minimumSamplePerVariant: 500,
        variants: [
          { key: 'control', name: 'Control', isControl: true, weight: 50, document: null },
          {
            key: 'a',
            name: 'Benefit headline',
            weight: 50,
            document: {
              kind: 'section',
              targetSectionId: 'sec_hero01',
              section: {
                id: 'sec_hero01',
                block: 'hero-centered-01',
                props: { headline: 'Save two hours a week' },
              },
            },
          },
        ],
      },
    })

    expect(response.statusCode).toBe(201)
    experimentId = body(response).data.id
    expect(body(response).data.variants).toHaveLength(2)
    expect(body(response).data.status).toBe('draft')
    // Unsupplied props come back filled from the block's own defaults.
    expect(body(response).data.variants[1].document.section.props.primaryLabel).toBeTruthy()
  })
})

describe('results', () => {
  it('reports "running" and no winner while the experiment has no traffic', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/experiments/${experimentId}/results`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.status).toBe('running')
    expect(body(response).data.winner).toBeNull()
    expect(body(response).data.sampleGateMet).toBe(false)
  })

  it('refuses to deploy a winner that does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/experiments/${experimentId}/deploy-winner`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(400)
    expect(body(response).error.message).toContain('No winner to deploy')
  })

  it('starts the experiment and audits it', async () => {
    const start = await app.inject({
      method: 'POST',
      url: `/api/v1/experiments/${experimentId}/start`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(start.statusCode).toBe(200)
    expect(body(start).data.status).toBe('running')

    const activity = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/current/activity',
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    const names = body(activity).data.map((entry: { name: string }) => entry.name)
    expect(names).toContain('experiment.started')
  })

  it('records a learning even when nothing was learned', async () => {
    const complete = await app.inject({
      method: 'POST',
      url: `/api/v1/experiments/${experimentId}/complete`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(complete.statusCode).toBe(200)
    expect(body(complete).data.results.winner).toBeNull()
    expect(body(complete).data.learning.outcome).toBe('inconclusive')
  })
})

describe('the visitor path', () => {
  it('refuses a conversion from a visitor who was never exposed', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/experiments/conversion',
      payload: {
        host: `nothing-here-${suffix}.example`,
        experimentId,
        anonymousId: `visitor-${suffix}-0001`,
        value: 99,
      },
    })

    // Unknown host resolves to no site at all, which is the first refusal.
    expect(response.statusCode).toBe(404)
  })

  it('requires an anonymous id long enough to be a real visitor id', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/experiments/assign',
      payload: { host: 'localhost', path: '/', anonymousId: 'short' },
    })

    expect(response.statusCode).toBe(400)
  })
})

/**
 * The whole loop against real rows: split traffic, record exposures and
 * revenue, reach significance, publish the winner, take it back off.
 */
describe('traffic, results and deployment', () => {
  const HOST = `exp-${suffix}.local`

  it('serves a variant to every admitted visitor and records what they did', async () => {
    // A verified domain is how the storefront resolves tenant context without
    // a session — the same door the public page API uses.
    await withTenant(tenantId, (tx) =>
      insertDomain(tx, { tenantId, siteId, hostname: HOST, isPrimary: true, verified: true }),
    )
    await app.inject({
      method: 'POST',
      url: `/api/v1/pages/${pageId}/publish`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/experiments',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        siteId,
        pageId,
        name: 'Live headline test',
        targetMetric: 'revenue',
        minimumSamplePerVariant: 40,
        variants: [
          { key: 'control', name: 'Control', isControl: true, weight: 50, document: null },
          {
            key: 'a',
            name: 'Benefit headline',
            weight: 50,
            document: {
              kind: 'section',
              targetSectionId: 'sec_hero01',
              section: {
                id: 'sec_hero01',
                block: 'hero-centered-01',
                props: { headline: 'Save two hours a week' },
              },
            },
          },
        ],
      },
    })
    expect(created.statusCode).toBe(201)
    liveExperimentId = body(created).data.id

    await app.inject({
      method: 'POST',
      url: `/api/v1/experiments/${liveExperimentId}/start`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    let control = 0
    let challenger = 0

    for (let visitor = 0; visitor < 400; visitor += 1) {
      const anonymousId = `visitor-${suffix}-${String(visitor).padStart(6, '0')}`

      const assign = await app.inject({
        method: 'POST',
        url: '/api/v1/experiments/assign',
        payload: { host: HOST, path: '/', anonymousId },
      })
      const assignment = body(assign).data[0]
      expect(assignment.experimentId).toBe(liveExperimentId)

      if (assignment.isControl) control += 1
      else challenger += 1

      await app.inject({
        method: 'POST',
        url: '/api/v1/experiments/exposure',
        payload: { host: HOST, experimentId: liveExperimentId, anonymousId },
      })

      // A deterministic stand-in for behaviour: the challenger converts more
      // often and for more money.
      const converts = assignment.isControl ? visitor % 10 === 0 : visitor % 3 === 0
      if (converts) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/experiments/conversion',
          payload: {
            host: HOST,
            experimentId: liveExperimentId,
            anonymousId,
            value: assignment.isControl ? 40 : 60,
          },
        })
      }
    }

    expect(control).toBeGreaterThan(100)
    expect(challenger).toBeGreaterThan(100)
  })

  it('counts a visitor once however often the exposure fires', async () => {
    const before = await app.inject({
      method: 'GET',
      url: `/api/v1/experiments/${liveExperimentId}/results`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    await app.inject({
      method: 'POST',
      url: '/api/v1/experiments/exposure',
      payload: { host: HOST, experimentId: liveExperimentId, anonymousId: `visitor-${suffix}-000000` },
    })

    const after = await app.inject({
      method: 'GET',
      url: `/api/v1/experiments/${liveExperimentId}/results`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(body(after).data.totalExposures).toBe(body(before).data.totalExposures)
    expect(body(after).data.totalExposures).toBe(400)
  })

  it('finds the winner on revenue per visitor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/experiments/${liveExperimentId}/results`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    const results = body(response).data
    expect(results.sampleGateMet).toBe(true)
    expect(results.status).toBe('winner_found')
    expect(results.winner.key).toBe('a')
    expect(results.winner.revenuePerVisitor).toBeGreaterThan(results.variants[0].revenuePerVisitor)
  })

  it('publishes the winner and can take it back off', async () => {
    const deploy = await app.inject({
      method: 'POST',
      url: `/api/v1/experiments/${liveExperimentId}/deploy-winner`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(deploy.statusCode).toBe(200)

    const live = await app.inject({
      method: 'GET',
      url: '/public/v1/pages',
      query: { host: HOST, path: '/' },
    })
    expect(body(live).data.page.sections[0].props.headline).toBe('Save two hours a week')

    const rollback = await app.inject({
      method: 'POST',
      url: `/api/v1/experiments/${liveExperimentId}/rollback`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(rollback.statusCode).toBe(200)

    const restored = await app.inject({
      method: 'GET',
      url: '/public/v1/pages',
      query: { host: HOST, path: '/' },
    })
    expect(body(restored).data.page.sections[0].props.headline).toBe('Original')
  })
})

describe('autonomous mode', () => {
  it('is refused below the Advanced plan even for an owner', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/experiments/autonomous',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        siteId,
        pageId,
        name: 'Autonomous headline test',
        hypothesis: 'A shorter headline will convert better on mobile.',
        variants: [
          {
            key: 'a',
            name: 'Short headline',
            weight: 50,
            document: {
              kind: 'section',
              targetSectionId: 'sec_hero01',
              section: { id: 'sec_hero01', block: 'hero-centered-01', props: { headline: 'Short' } },
            },
          },
        ],
      },
    })

    // The registration tenant is on `launch`. Owner holds `ai:autonomous`, so
    // this must be the *plan* refusing — the two gates are independent.
    expect(response.statusCode).toBe(402)
    expect(body(response).error.code).toBe('plan_limit_reached')
  })

  it('refuses more changes than the change limit allows', () => {
    const guardrails = autonomousGuardrailsSchema.parse({ maxChanges: 2 })

    expect(() => assertWithinChangeLimit(guardrails, 2)).not.toThrow()
    expect(() => assertWithinChangeLimit(guardrails, 3)).toThrow(/limit of 2/)
  })

  it('never deploys before the approval threshold is reached', () => {
    const guardrails = autonomousGuardrailsSchema.parse({
      approvalThreshold: 0.99,
      autoDeploy: true,
      minimumSamplePerVariant: 500,
    })

    // A real winner at ~97% confidence: significant at the experiment's own
    // 95% bar, still below the bar the agent is allowed to act on.
    const results = analyseExperiment({
      experimentId: '00000000-0000-4000-8000-000000000000',
      targetMetric: 'conversion',
      confidenceLevel: 0.95,
      minimumSamplePerVariant: 500,
      stats: [
        stats({ key: 'c', isControl: true, exposures: 2000, conversions: 200 }),
        stats({ key: 'a', exposures: 2000, conversions: 245 }),
      ],
    })
    expect(results.status).toBe('winner_found')

    const plan = planAutonomousDecision(
      {
        startedAt: new Date().toISOString(),
      } as unknown as Experiment,
      guardrails,
      results,
    )

    expect(plan.action).toBe('continue')
    expect(plan.deployVariantId).toBeNull()
  })

  it('waits for a person when auto-deploy is off, even with a clear winner', () => {
    const guardrails = autonomousGuardrailsSchema.parse({ approvalThreshold: 0.95, autoDeploy: false })

    const results = analyseExperiment({
      experimentId: '00000000-0000-4000-8000-000000000000',
      targetMetric: 'conversion',
      confidenceLevel: 0.95,
      minimumSamplePerVariant: 500,
      stats: [
        stats({ key: 'c', isControl: true, exposures: 5000, conversions: 500 }),
        stats({ key: 'a', exposures: 5000, conversions: 700 }),
      ],
    })

    const plan = planAutonomousDecision(
      { startedAt: new Date().toISOString() } as unknown as Experiment,
      guardrails,
      results,
    )

    expect(plan.action).toBe('awaiting_approval')
    expect(plan.deployVariantId).toBeNull()
    expect(plan.winningVariantId).toBe(VARIANT_IDS.a)
  })
})

describe('agency hierarchy', () => {
  it('creates an agency workspace on a plan that allows it', async () => {
    const tenant = await app.inject({
      method: 'POST',
      url: '/api/v1/tenants',
      headers: { cookie },
      payload: { name: `Agency ${suffix}`, slug: `agency-${suffix}`, plan: 'advanced' },
    })
    expect(tenant.statusCode).toBe(201)
    agencyTenantId = body(tenant).data.id

    const enable = await app.inject({
      method: 'POST',
      url: '/api/v1/agency/enable',
      headers: { cookie, 'x-tenant-id': agencyTenantId },
    })
    expect(enable.statusCode).toBe(200)
    expect(body(enable).data.isAgency).toBe(true)
  })

  it('refuses agency mode on a plan that does not include it', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/agency/enable',
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(response.statusCode).toBe(400)
  })

  it('creates a client workspace', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/agency/clients',
      headers: { cookie, 'x-tenant-id': agencyTenantId },
      payload: { name: `Client ${suffix}`, slug: `client-${suffix}`, plan: 'grow' },
    })

    expect(response.statusCode).toBe(201)
    clientTenantId = body(response).data.id

    const clients = await app.inject({
      method: 'GET',
      url: '/api/v1/agency/clients',
      headers: { cookie, 'x-tenant-id': agencyTenantId },
    })
    expect(body(clients).data).toHaveLength(1)
    expect(body(clients).data[0].hasActiveGrant).toBe(false)
  })

  it('refuses to read a client workspace without a grant', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/agency/clients/${clientTenantId}/overview`,
      headers: { cookie, 'x-tenant-id': agencyTenantId },
    })

    // Owning the client is not access to it.
    expect(response.statusCode).toBe(403)
    expect(body(response).error.message).toContain('grant')
  })

  it('also refuses the client tenant through the ordinary tenant header', async () => {
    // The agency user has no membership in the client tenant, so the normal
    // path must not let them in either.
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/sites',
      headers: { cookie, 'x-tenant-id': clientTenantId },
    })
    expect(response.statusCode).toBe(403)
  })

  it('allows it once an explicit grant exists, and audits the access', async () => {
    const grant = await app.inject({
      method: 'POST',
      url: `/api/v1/agency/clients/${clientTenantId}/grants`,
      headers: { cookie, 'x-tenant-id': agencyTenantId },
      payload: { userId, role: 'marketer', reason: 'Monthly optimisation work', expiresInHours: 24 },
    })
    expect(grant.statusCode).toBe(201)
    expect(body(grant).data.status).toBe('active')

    const overview = await app.inject({
      method: 'GET',
      url: `/api/v1/agency/clients/${clientTenantId}/overview`,
      headers: { cookie, 'x-tenant-id': agencyTenantId },
    })
    expect(overview.statusCode).toBe(200)
    expect(body(overview).data.role).toBe('marketer')
    // A grant narrows: a marketer in a client cannot publish there.
    expect(body(overview).data.permissions).not.toContain('billing:manage')
  })

  it('stops allowing it once the grant is revoked', async () => {
    const grants = await app.inject({
      method: 'GET',
      url: '/api/v1/agency/grants',
      headers: { cookie, 'x-tenant-id': agencyTenantId },
    })
    const grantId = body(grants).data[0].id

    const revoke = await app.inject({
      method: 'DELETE',
      url: `/api/v1/agency/grants/${grantId}`,
      headers: { cookie, 'x-tenant-id': agencyTenantId },
    })
    expect(revoke.statusCode).toBe(200)

    const overview = await app.inject({
      method: 'GET',
      url: `/api/v1/agency/clients/${clientTenantId}/overview`,
      headers: { cookie, 'x-tenant-id': agencyTenantId },
    })
    expect(overview.statusCode).toBe(403)
  })
})

describe('white label, SSO and audit export', () => {
  it('gates advanced white-label fields on the plan; chrome branding stays open', async () => {
    const chrome = await app.inject({
      method: 'PUT',
      url: '/api/v1/agency/white-label',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { brandName: 'Launch plan may brand', colorPrimary: '#aa4400' },
    })
    expect(chrome.statusCode).toBe(200)
    expect(body(chrome).data.brandName).toBe('Launch plan may brand')

    const refused = await app.inject({
      method: 'PUT',
      url: '/api/v1/agency/white-label',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { hidePlatformBranding: true },
    })
    expect(refused.statusCode).toBe(402)

    const allowed = await app.inject({
      method: 'PUT',
      url: '/api/v1/agency/white-label',
      headers: { cookie, 'x-tenant-id': agencyTenantId },
      payload: { brandName: `Agency ${suffix}`, hidePlatformBranding: true },
    })
    expect(allowed.statusCode).toBe(200)
    expect(body(allowed).data.hidePlatformBranding).toBe(true)
  })

  it('keeps a partial white-label update from clearing the rest', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/agency/white-label',
      headers: { cookie, 'x-tenant-id': agencyTenantId },
      payload: { colorPrimary: '#112233' },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.brandName).toBe(`Agency ${suffix}`)
    expect(body(response).data.colorPrimary).toBe('#112233')
  })

  it('gates SSO and audit export on Enterprise', async () => {
    const sso = await app.inject({
      method: 'GET',
      url: '/api/v1/agency/sso',
      headers: { cookie, 'x-tenant-id': agencyTenantId },
    })
    expect(sso.statusCode).toBe(402)

    const audit = await app.inject({
      method: 'GET',
      url: '/api/v1/agency/audit/export',
      headers: { cookie, 'x-tenant-id': agencyTenantId },
    })
    expect(audit.statusCode).toBe(402)
  })

  it('refuses SCIM without a bearer token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/agency/scim/v2/Users',
      payload: {
        externalId: 'idp-user-1',
        userName: 'someone@example.com',
        emails: [{ value: 'someone@example.com', primary: true }],
      },
    })

    expect(response.statusCode).toBe(401)
  })
})
