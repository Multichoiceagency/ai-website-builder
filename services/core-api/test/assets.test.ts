import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getBlock } from '@platform/blocks'
import { isShippableLicence } from '@platform/schemas'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'
import { ASSET_PRESETS, ASSET_SOURCES } from '../src/lib/asset-presets.generated.js'
import { fingerprintSections } from '../src/lib/assets.js'

/**
 * Reusable assets, end to end against the real database and the real permission
 * engine.
 *
 * The properties worth a permanent test are the ones that are quiet when they
 * break: an asset that keeps its section ids collides with itself on the second
 * insert; an asset that skips registry validation lets a broken document into
 * storage; a preset with an unresolved licence is a legal problem that nothing
 * else in the system would notice.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const OWNER = `assets-owner-${suffix}@platform.local`
const OUTSIDER = `assets-outsider-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'

let app: FastifyInstance
let cookie = ''
let tenantId = ''
let outsiderCookie = ''
let outsiderTenantId = ''
let assetId = ''

/** An A-class arrangement: nothing here should ever hit a performance ceiling. */
const LIGHT_SECTIONS = [
  { id: 'sec_light_a', block: 'features-grid-01', props: {} },
  { id: 'sec_light_b', block: 'cta-banner-01', props: {} },
]

/** Mixes a class-A block with a class-C one, so a ceiling has something to drop. */
const MIXED_SECTIONS = [
  { id: 'sec_mixed_a', block: 'logos-strip-01', props: {} },
  { id: 'sec_mixed_b', block: 'hero-aurora-01', props: {} },
]

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

async function register(email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: PASSWORD, name: 'Assets Test', organizationName: `Assets ${email}` },
  })
  return {
    cookie: String(response.headers['set-cookie']).split(';')[0]!,
    tenantId: body(response).data.activeTenantId as string,
  }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const owner = await register(OWNER)
  cookie = owner.cookie
  tenantId = owner.tenantId

  const outsider = await register(OUTSIDER)
  outsiderCookie = outsider.cookie
  outsiderTenantId = outsider.tenantId
})

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email IN (${OWNER}, ${OUTSIDER})`
  })
  await app.close()
  await closeDatabase()
})

describe('the block registry gate', () => {
  it('lists every UI library in the licence register with install metadata', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/sources',
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    const libraries = body(response).data as Array<{
      library: string
      importable: boolean
      presetCount: number
      install?: { method: string; command: string }
    }>
    expect(libraries.length).toBe(ASSET_SOURCES.length)
    expect(libraries.some((entry) => entry.library === 'Flowbite' && entry.importable)).toBe(true)
    expect(libraries.some((entry) => entry.library === 'Aceternity UI' && !entry.importable)).toBe(true)
    const shadcnVue = libraries.find((entry) => entry.library === 'shadcn-vue')
    expect(shadcnVue?.install?.method).toBe('npx')
    expect(shadcnVue?.install?.command).toContain('npx shadcn-vue')
  })

  it('rejects an asset referencing a block that does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        name: `Bad block ${suffix}`,
        collection: 'utility',
        sections: [{ id: 'sec_bad', block: 'not-a-real-block-99', props: {} }],
      },
    })

    expect(response.statusCode).toBe(400)
    expect(body(response).error.code).toBe('unknown_block')
  })

  it('rejects props that violate the block schema', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        name: `Bad props ${suffix}`,
        collection: 'hero',
        sections: [{ id: 'sec_bad', block: 'hero-centered-01', props: { headline: 12345 } }],
      },
    })

    expect(response.statusCode).toBe(400)
    expect(body(response).error.code).toBe('invalid_block_props')
  })

  it('rejects an empty composition', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { name: `Empty ${suffix}`, collection: 'utility', sections: [] },
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('saving sections as an asset', () => {
  it('stores the composition and derives its performance class', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        name: `Feature close ${suffix}`,
        description: 'A grid then a call to action.',
        collection: 'features',
        tags: ['features', 'cta'],
        sections: LIGHT_SECTIONS,
      },
    })

    expect(response.statusCode).toBe(201)
    const asset = body(response).data
    assetId = asset.id

    expect(asset.tier).toBe('workspace')
    expect(asset.sections).toHaveLength(2)
    // Both blocks are class A, so the asset is class A.
    expect(asset.performanceClass).toBe('A')
    // A user's own arrangement of our own blocks has no third party in it.
    expect(asset.licence).toBe('platform-owned')
    // Unsupplied props come back filled from each block's own defaults.
    expect(Object.keys(asset.sections[0].props).length).toBeGreaterThan(0)
  })

  it('takes the heaviest block as the asset’s class', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        name: `Mixed weight ${suffix}`,
        collection: 'hero',
        sections: MIXED_SECTIONS,
      },
    })

    expect(response.statusCode).toBe(201)
    // logos-strip-01 is A, hero-aurora-01 is C. An asset cannot understate its
    // own cost, so the pair is C.
    expect(body(response).data.performanceClass).toBe('C')
  })

  it('refuses a second asset with the same name in one workspace', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        name: `Feature close ${suffix}`,
        collection: 'features',
        sections: [{ id: 'sec_other', block: 'faq-accordion-01', props: {} }],
      },
    })
    expect(response.statusCode).toBe(409)
  })
})

describe('inserting an asset', () => {
  /**
   * The property this protects: identity lives in the *arrangement*, not in the
   * section ids. Regenerating ids on insert is therefore safe, and two copies of
   * one asset on a page cannot collide.
   */
  it('recognises the same arrangement after every section id has changed', async () => {
    const stored = body(
      await app.inject({
        method: 'GET',
        url: `/api/v1/assets/${assetId}`,
        headers: { cookie, 'x-tenant-id': tenantId },
      }),
    ).data

    // Exactly what the Assets panel does on insert: same blocks, new ids.
    const inserted = stored.sections.map((section: { id: string }, index: number) => ({
      ...section,
      id: `sec_inserted_${index}_${suffix}`,
    }))

    for (const section of inserted) {
      expect(stored.sections.map((s: { id: string }) => s.id)).not.toContain(section.id)
    }

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assets/duplicate-check',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { sections: inserted },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.duplicate).toBe(true)
    expect(body(response).data.existing.id).toBe(assetId)
    expect(body(response).data.fingerprint).toBe(fingerprintSections(inserted))
  })

  it('produces section ids that differ from the stored asset once placed on a page', async () => {
    const site = body(
      await app.inject({
        method: 'POST',
        url: '/api/v1/sites',
        headers: { cookie, 'x-tenant-id': tenantId },
        payload: { name: 'Assets Site', slug: `assets-site-${suffix}`, locale: 'nl' },
      }),
    ).data

    const stored = body(
      await app.inject({
        method: 'GET',
        url: `/api/v1/assets/${assetId}`,
        headers: { cookie, 'x-tenant-id': tenantId },
      }),
    ).data

    const page = body(
      await app.inject({
        method: 'POST',
        url: `/api/v1/sites/${site.id}/pages`,
        headers: { cookie, 'x-tenant-id': tenantId },
        payload: {
          path: '/from-asset',
          title: 'From asset',
          sections: stored.sections.map((section: { id: string }, index: number) => ({
            ...section,
            id: `sec_page_${index}_${suffix}`,
          })),
        },
      }),
    ).data

    const assetIds = stored.sections.map((s: { id: string }) => s.id)
    for (const section of page.sections) expect(assetIds).not.toContain(section.id)
    expect(page.sections.map((s: { block: string }) => s.block)).toEqual(
      stored.sections.map((s: { block: string }) => s.block),
    )
  })
})

describe('duplicate detection', () => {
  it('surfaces a repeat save rather than silently making a second copy', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        name: `Feature close again ${suffix}`,
        collection: 'features',
        sections: LIGHT_SECTIONS,
      },
    })

    expect(response.statusCode).toBe(409)
    expect(body(response).error.details.existing.id).toBe(assetId)
  })

  it('saves anyway when the caller opts in', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assets?allowDuplicate=true',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        name: `Feature close copy ${suffix}`,
        collection: 'features',
        sections: LIGHT_SECTIONS,
      },
    })
    expect(response.statusCode).toBe(201)
  })

  it('reports no duplicate for an arrangement the workspace does not hold', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assets/duplicate-check',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { sections: [{ id: 'sec_novel', block: 'team-editorial-01', props: {} }] },
    })

    expect(body(response).data.duplicate).toBe(false)
    expect(body(response).data.existing).toBeNull()
  })
})

describe('the performance ceiling', () => {
  it('drops the sections the site cannot afford and reports how many', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
      headers: { cookie, 'x-tenant-id': tenantId },
      query: { maxPerformanceClass: 'A' },
    })

    expect(response.statusCode).toBe(200)
    const items = body(response).data as {
      name: string
      sections: { block: string }[]
      droppedSections: number
    }[]

    const mixed = items.find((item) => item.name === `Mixed weight ${suffix}`)
    expect(mixed).toBeDefined()
    // hero-aurora-01 (class C) goes; logos-strip-01 (class A) stays.
    expect(mixed!.droppedSections).toBe(1)
    expect(mixed!.sections).toHaveLength(1)
    expect(mixed!.sections[0]!.block).toBe('logos-strip-01')

    // Nothing that survives may exceed the ceiling.
    for (const item of items) {
      for (const section of item.sections) {
        expect(getBlock(section.block)?.performanceClass).toBe('A')
      }
    }
  })

  it('leaves every section in place when no ceiling is given', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    const items = body(response).data as { name: string; sections: unknown[]; droppedSections: number }[]
    const mixed = items.find((item) => item.name === `Mixed weight ${suffix}`)

    expect(mixed!.droppedSections).toBe(0)
    expect(mixed!.sections).toHaveLength(2)
  })
})

describe('platform presets', () => {
  it('appear in the list alongside workspace assets', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
      headers: { cookie, 'x-tenant-id': tenantId },
      query: { tier: 'platform' },
    })

    const items = body(response).data as { tier: string }[]
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((item) => item.tier === 'platform')).toBe(true)
  })

  /**
   * The licence gate. A preset whose provenance could not be established must
   * never reach a customer page, and this is the last place that is checkable
   * before it does.
   */
  it('never ships a preset with an unresolved licence', () => {
    expect(ASSET_PRESETS.length).toBeGreaterThan(0)
    for (const preset of ASSET_PRESETS) {
      expect(preset.licence, `${preset.id} has licence "${preset.licence}"`).not.toBe('unknown')
      expect(isShippableLicence(preset.licence), `${preset.id} is not shippable`).toBe(true)
    }
  })

  it('carries attribution for every preset derived from a third party', () => {
    for (const preset of ASSET_PRESETS) {
      if (!preset.source.library || preset.source.library === 'platform') continue
      expect(preset.attribution, `${preset.id} is third-party but has no attribution`).not.toBe('')
    }
  })

  it('references no external URL a customer page could fetch', () => {
    for (const preset of ASSET_PRESETS) {
      expect(preset.thumbnail).not.toMatch(/:\/\//)
      expect(JSON.stringify(preset.sections)).not.toMatch(/https?:\/\//)
    }
  })
})

describe('tenant isolation', () => {
  it('hides another workspace’s asset behind a 404, not a 403', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/assets/${assetId}`,
      headers: { cookie: outsiderCookie, 'x-tenant-id': outsiderTenantId },
    })
    expect(response.statusCode).toBe(404)
  })

  it('keeps another workspace’s asset out of the list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
      headers: { cookie: outsiderCookie, 'x-tenant-id': outsiderTenantId },
      query: { tier: 'workspace' },
    })
    expect(body(response).data).toHaveLength(0)
  })

  it('refuses to update another workspace’s asset', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/assets/${assetId}`,
      headers: { cookie: outsiderCookie, 'x-tenant-id': outsiderTenantId },
      payload: { name: 'hijacked' },
    })
    expect(response.statusCode).toBe(404)
  })

  it('refuses to delete another workspace’s asset', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/assets/${assetId}`,
      headers: { cookie: outsiderCookie, 'x-tenant-id': outsiderTenantId },
    })
    expect(response.statusCode).toBe(404)
  })

  it('refuses a request with no workspace at all', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/assets' })
    expect(response.statusCode).toBe(401)
  })
})

describe('updating and deleting', () => {
  it('recomputes the class and the fingerprint when the composition changes', async () => {
    const before = body(
      await app.inject({
        method: 'GET',
        url: `/api/v1/assets/${assetId}`,
        headers: { cookie, 'x-tenant-id': tenantId },
      }),
    ).data

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/assets/${assetId}`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { sections: MIXED_SECTIONS },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.performanceClass).toBe('C')
    expect(body(response).data.fingerprint).not.toBe(before.fingerprint)
  })

  it('deletes an asset', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/assets/${assetId}`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(response.statusCode).toBe(200)

    const gone = await app.inject({
      method: 'GET',
      url: `/api/v1/assets/${assetId}`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(gone.statusCode).toBe(404)
  })
})
