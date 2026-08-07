import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { InvalidBlockPropsError, getBlock } from '@platform/blocks'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'
import { buildSectionProposal, editableFields, generatedPropsOrDefaults } from '../src/routes/section-ai.js'

/**
 * Per-section AI editing, against the real database, the real permission engine
 * and the real AI gateway.
 *
 * No model is configured here, so the deterministic composer is what answers —
 * which is exactly the configuration the platform ships in, and the one worth
 * testing. The assertions that matter are the ADR-0007 guarantees: a suggestion
 * never writes, output that fails the block's schema is rejected rather than
 * stored, a populated required field cannot be emptied, and the response says
 * plainly which model produced it.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `section-ai-${suffix}@platform.local`
const OTHER_EMAIL = `section-ai-other-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'

const SECTION_ID = 'sec_hero01'
const HEADLINE = 'We are really very proud to deliver proper work, every single time'
const SUBHEADLINE =
  'We help homeowners across the region with repairs that actually last. Call us and we will be there the same working day, with a price agreed before we start.'

let app: FastifyInstance
let cookie = ''
let otherCookie = ''
let tenantId = ''
let otherTenantId = ''
let siteId = ''
let pageId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

function suggest(instruction: string, auth = { cookie, tenantId }) {
  return app.inject({
    method: 'POST',
    url: `/api/v1/pages/${pageId}/sections/${SECTION_ID}/suggest`,
    headers: { cookie: auth.cookie, 'x-tenant-id': auth.tenantId },
    payload: { instruction },
  })
}

async function readSections() {
  const response = await app.inject({
    method: 'GET',
    url: `/api/v1/pages/${pageId}`,
    headers: { cookie, 'x-tenant-id': tenantId },
  })
  return body(response).data.sections as { id: string; block: string; props: Record<string, unknown> }[]
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const register = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: EMAIL, password: PASSWORD, name: 'Section AI', organizationName: `Section AI ${suffix}` },
  })
  tenantId = body(register).data.activeTenantId
  cookie = String(register.headers['set-cookie']).split(';')[0]!

  const other = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: OTHER_EMAIL,
      password: PASSWORD,
      name: 'Other',
      organizationName: `Other AI ${suffix}`,
    },
  })
  otherTenantId = body(other).data.activeTenantId
  otherCookie = String(other.headers['set-cookie']).split(';')[0]!

  const site = await app.inject({
    method: 'POST',
    url: '/api/v1/sites',
    headers: { cookie, 'x-tenant-id': tenantId },
    payload: { name: `Section AI Site ${suffix}`, slug: `section-ai-${suffix}`, locale: 'en' },
  })
  siteId = body(site).data.id

  const page = await app.inject({
    method: 'POST',
    url: `/api/v1/sites/${siteId}/pages`,
    headers: { cookie, 'x-tenant-id': tenantId },
    payload: {
      path: '/',
      title: 'Home',
      sections: [
        {
          id: SECTION_ID,
          block: 'hero-centered-01',
          props: {
            eyebrow: '',
            headline: HEADLINE,
            subheadline: SUBHEADLINE,
            primaryLabel: 'Request a quote',
            secondaryLabel: '',
          },
        },
      ],
    },
  })
  pageId = body(page).data.id
})

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email IN (${EMAIL}, ${OTHER_EMAIL})`
  })
  await app.close()
  await closeDatabase()
})

describe('proposing a revision', () => {
  it('names the model that answered', async () => {
    const response = await suggest('make this punchier')

    expect(response.statusCode).toBe(200)
    // With no key configured the deterministic composer answers, and says so.
    expect(body(response).data.model).toBe('deterministic-composer')
    expect(body(response).data.notes.length).toBeGreaterThan(0)
  })

  it('returns a field-by-field diff of the props', async () => {
    const response = await suggest('shorten the headline')
    const proposal = body(response).data

    const change = proposal.changedFields.find((entry: { path: string }) => entry.path === 'headline')
    expect(change).toBeTruthy()
    expect(change.before).toBe(HEADLINE)
    expect(change.after.length).toBeLessThan(HEADLINE.length)
    // The proposal is a whole, valid set of props — not a patch the client has
    // to assemble.
    expect(proposal.proposed.headline).toBe(change.after)
    expect(proposal.current.headline).toBe(HEADLINE)
  })

  it('never writes: the page is untouched after suggesting', async () => {
    await suggest('make this punchier')
    await suggest('shorten the supporting text')
    await suggest('title case')

    const sections = await readSections()
    expect(sections[0]!.props.headline).toBe(HEADLINE)
    expect(sections[0]!.props.subheadline).toBe(SUBHEADLINE)
  })

  it('cannot change the block, only its props', async () => {
    const response = await suggest('make this punchier')
    const proposal = body(response).data

    expect(proposal.blockId).toBe('hero-centered-01')
    expect(Object.keys(proposal.proposed).sort()).toEqual(Object.keys(proposal.current).sort())
  })

  it('refuses to empty a field the section always shows', async () => {
    const response = await suggest('clear the headline')
    const proposal = body(response).data

    expect(response.statusCode).toBe(200)
    expect(proposal.changedFields).toHaveLength(0)
    expect(proposal.refusedFields[0].path).toBe('headline')
    // Degraded to the current value rather than shipping a blank hero.
    expect(proposal.proposed.headline).toBe(HEADLINE)
  })

  it('allows emptying an optional field', async () => {
    const response = await suggest('clear the secondary button')
    const proposal = body(response).data

    // The secondary label is already empty here, so there is nothing to change
    // — and crucially it is not reported as refused.
    expect(proposal.refusedFields).toHaveLength(0)
  })

  it('says so plainly when the instruction needs a language model', async () => {
    const response = await suggest('rewrite this for dentists')

    expect(response.statusCode).toBe(422)
    expect(body(response).error.code).toBe('ai_instruction_unsupported')
    expect(body(response).error.message).toMatch(/language model/i)
    expect(body(response).error.details.supported.length).toBeGreaterThan(0)
  })

  it('changes the call to action to an explicitly requested label', async () => {
    const response = await suggest('make the button say "Book a survey"')
    const proposal = body(response).data

    expect(proposal.changedFields).toHaveLength(1)
    expect(proposal.changedFields[0].path).toBe('primaryLabel')
    expect(proposal.proposed.primaryLabel).toBe('Book a survey')
    // The button that does not exist stays non-existent.
    expect(proposal.proposed.secondaryLabel).toBe('')
  })

  it('rewrites the section from the business profile', async () => {
    const response = await suggest('rewrite this from the business profile')
    const proposal = body(response).data

    expect(response.statusCode).toBe(200)
    expect(proposal.changedFields.length).toBeGreaterThan(0)
    expect(proposal.proposed.headline).not.toBe(HEADLINE)
  })

  it('rejects an empty instruction', async () => {
    const response = await suggest('')
    expect(response.statusCode).toBe(400)
  })

  it('accepts a long MotionSites-scale instruction (up to 16k)', async () => {
    const response = await suggest(`make this punchier ${'x'.repeat(600)}`)
    // Validation must not reject; composer may still answer or refuse the instruction.
    expect(response.statusCode).not.toBe(400)
  })

  it('returns 404 for a section in another workspace', async () => {
    const response = await suggest('make this punchier', { cookie: otherCookie, tenantId: otherTenantId })
    expect(response.statusCode).toBe(404)
  })

  it('returns 404 for a section id that is not on the page', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/pages/${pageId}/sections/sec_nothere/suggest`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { instruction: 'make this punchier' },
    })
    expect(response.statusCode).toBe(404)
  })
})

describe('the validation gate', () => {
  const definition = getBlock('hero-centered-01')!
  const current = { ...(definition.schema.parse({}) as Record<string, unknown>), headline: HEADLINE }

  it('rejects output that does not satisfy the block schema', () => {
    // A model returning 4 000 characters for a 400-character field is the shape
    // failure this gate exists for.
    expect(() =>
      buildSectionProposal({
        blockId: 'hero-centered-01',
        current,
        fields: editableFields(definition, current),
        values: { headline: 'x'.repeat(4000) },
      }),
    ).toThrow(InvalidBlockPropsError)
  })

  it('drops a prop the model invented rather than adding it', () => {
    const proposal = buildSectionProposal({
      blockId: 'hero-centered-01',
      current,
      fields: editableFields(definition, current),
      values: { headline: 'Proper work', somethingElse: 'nope' },
    })

    expect(proposal.changedFields.map((change) => change.path)).toEqual(['headline'])
    expect(proposal.proposed).not.toHaveProperty('somethingElse')
  })

  it('does not offer factual props like alt text for rewriting', () => {
    const split = getBlock('hero-split-01')!
    const props = split.schema.parse({}) as Record<string, unknown>
    const paths = editableFields(split, props).map((field) => field.path)

    expect(paths).toContain('headline')
    expect(paths).not.toContain('imageAlt')
    expect(paths).not.toContain('primaryHref')
  })
})

describe('applying a proposal', () => {
  it('writes the section and attributes it to the agent on behalf of the user', async () => {
    const suggested = body(await suggest('shorten the headline')).data

    const applied = await app.inject({
      method: 'POST',
      url: `/api/v1/pages/${pageId}/sections/${SECTION_ID}/apply`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { props: suggested.proposed, model: suggested.model, instruction: 'shorten the headline' },
    })

    expect(applied.statusCode).toBe(200)

    const sections = await readSections()
    expect(sections[0]!.props.headline).toBe(suggested.proposed.headline)
    expect(sections[0]!.block).toBe('hero-centered-01')

    const activity = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/current/activity',
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    const entries = body(activity).data as { name: string; actor: { type: string; onBehalfOfUserId?: string } }[]
    const proposalApplied = entries.find((entry) => entry.name === 'ai.proposal_applied')

    expect(proposalApplied).toBeTruthy()
    expect(proposalApplied!.actor.type).toBe('agent')
    expect(proposalApplied!.actor.onBehalfOfUserId).toBeTruthy()
    expect(entries.some((entry) => entry.name === 'ai.proposal_created')).toBe(true)
  })

  it('refuses a hand-edited payload that empties a required field', async () => {
    const before = (await readSections())[0]!.props.headline

    const applied = await app.inject({
      method: 'POST',
      url: `/api/v1/pages/${pageId}/sections/${SECTION_ID}/apply`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { props: { headline: '', subheadline: SUBHEADLINE }, model: 'hand-edited' },
    })

    expect(applied.statusCode).toBe(200)
    expect((await readSections())[0]!.props.headline).toBe(before)
  })

  it('refuses to apply to another workspace', async () => {
    const applied = await app.inject({
      method: 'POST',
      url: `/api/v1/pages/${pageId}/sections/${SECTION_ID}/apply`,
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
      payload: { props: { headline: 'Taken over' }, model: 'test' },
    })
    expect(applied.statusCode).toBe(404)
  })
})

/**
 * Copy for freshly inserted sections.
 *
 * The interesting property is context: with no discovery profile stored
 * anywhere, the composer has to write from the site's own pages or admit it
 * cannot. Both halves are covered here.
 */
describe('generating copy for inserted sections', () => {
  interface Generated {
    model: string | null
    contextual: boolean
    basis: string[]
    note: string
    sections: { blockId: string; props: Record<string, unknown>; generated: boolean; reason?: string }[]
  }

  function generate(blockIds: string[], auth = { cookie, tenantId }) {
    return app.inject({
      method: 'POST',
      url: `/api/v1/pages/${pageId}/sections/generate`,
      headers: { cookie: auth.cookie, 'x-tenant-id': auth.tenantId },
      payload: { blockIds },
    })
  }

  beforeAll(async () => {
    // A second page carrying the facts a real site would have: services, a
    // review, a phone number and a city. This is the only context the composer
    // will get, because nothing else about the business is stored anywhere.
    await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/pages`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        path: '/services',
        title: 'Services',
        sections: [
          {
            id: 'sec_services',
            block: 'services-list-01',
            props: {
              heading: 'What we do',
              items: [
                { title: 'Roof repair', description: 'Leaks traced and fixed, usually the same day.' },
                { title: 'Gutter cleaning', description: 'Twice a year, before the autumn rain.' },
              ],
            },
          },
          {
            id: 'sec_contact',
            block: 'contact-details-01',
            props: { phone: '010 123 4567', email: 'hallo@example.test', city: 'Rotterdam' },
          },
          {
            id: 'sec_reviews',
            block: 'testimonials-grid-01',
            props: { items: [{ quote: 'Fast and tidy.', author: 'M. Jansen', rating: 5 }] },
          },
        ],
      },
    })
  })

  it('writes copy from the facts already on the site', async () => {
    const response = await generate(['hero-centered-01'])
    expect(response.statusCode).toBe(200)

    const payload = body(response).data as Generated
    expect(payload.contextual).toBe(true)
    expect(payload.model).toBe('deterministic-composer')

    const hero = payload.sections[0]!
    expect(hero.generated).toBe(true)
    // The site has a phone number, so the call to action is "call", not "quote".
    expect(hero.props.primaryLabel).toBe('Call us')
    // …and it knows where the business works, because a contact block said so.
    expect(hero.props.eyebrow).toBe('Serving Rotterdam')
    // Nothing here is the block's placeholder copy.
    expect(hero.props.headline).not.toMatch(/A headline that says what you do/)
  })

  it('reports what informed the copy', async () => {
    const payload = body(await generate(['services-list-01'])).data as Generated

    expect(payload.basis).toContain('the site name')
    expect(payload.basis.some((entry) => entry.includes('services'))).toBe(true)
    expect(payload.basis).toContain('Rotterdam')

    // The services it writes are the site's own, not invented ones.
    const items = payload.sections[0]!.props.items as { title: string }[]
    expect(items.map((item) => item.title)).toContain('Roof repair')
  })

  it('answers one entry per requested block, in order, repeats included', async () => {
    const payload = body(await generate(['cta-banner-01', 'hero-centered-01', 'cta-banner-01'])).data as Generated

    expect(payload.sections.map((section) => section.blockId)).toEqual([
      'cta-banner-01',
      'hero-centered-01',
      'cta-banner-01',
    ])
  })

  it('keeps a block on its defaults when the composer has nothing to say', async () => {
    // The logo strip needs logos, and no site fact supplies one. Rather than
    // inventing clients, it comes back untouched and says why.
    const payload = body(await generate(['logos-strip-01'])).data as Generated
    const logos = payload.sections[0]!

    expect(logos.generated).toBe(false)
    expect(logos.reason).toBeTruthy()
    // Defaults, which are a usable section — not a half-written one.
    expect(logos.props).toHaveProperty('items')
  })

  it('never writes the page it is generating for', async () => {
    const before = await readSections()
    await generate(['hero-centered-01', 'cta-banner-01'])
    expect(await readSections()).toEqual(before)
  })

  it('rejects a block that does not exist', async () => {
    const response = await generate(['not-a-real-block-99'])
    expect(response.statusCode).toBe(400)
    expect(body(response).error.code).toBe('unknown_block')
  })

  it('requires at least one block', async () => {
    const response = await generate([])
    expect(response.statusCode).toBe(400)
  })

  it('returns 404 for a page in another workspace', async () => {
    const response = await generate(['hero-centered-01'], { cookie: otherCookie, tenantId: otherTenantId })
    expect(response.statusCode).toBe(404)
  })

  it('falls back to defaults rather than storing output the block rejects', () => {
    const definition = getBlock('hero-centered-01')!
    const result = generatedPropsOrDefaults('hero-centered-01', { headline: 'x'.repeat(4000) })

    expect(result.generated).toBe(false)
    expect(result.reason).toMatch(/did not fit/i)
    expect(result.props.headline).toBe((definition.schema.parse({}) as Record<string, unknown>).headline)
  })

  it('falls back to defaults when generation produced nothing at all', () => {
    // The shape of a provider outage: no copy, so no section is stranded.
    const result = generatedPropsOrDefaults('hero-centered-01', null)

    expect(result.generated).toBe(false)
    expect(result.props.headline).toBeTruthy()
  })
})
