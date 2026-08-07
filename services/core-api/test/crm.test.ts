import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { closeDatabase, withTenant, withoutTenant } from '../src/db/client.js'

/**
 * Phase 6a: CRM, e-mail and automations.
 *
 * The path that matters end to end:
 *
 *   storefront form → lead + contact → deal → stage moves → won
 *   campaign → console provider → message log
 *   automation → run → one e-mail, however many times it is triggered
 *
 * Runs against the real database, the real permission engine and the real
 * event bus. The only thing standing in for production is the e-mail
 * provider — and only because this environment has no SMTP credentials, which
 * is exactly the case `configured: false` exists to describe.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `crm-test-${suffix}@platform.local`
const OTHER_EMAIL = `crm-other-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'
const HOST = `crm-${suffix}.local`

let app: FastifyInstance
let cookie = ''
let otherCookie = ''
let tenantId = ''
let otherTenantId = ''
let siteId = ''
let leadId = ''
let contactId = ''
let dealId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

function auth() {
  return { cookie, 'x-tenant-id': tenantId }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const registered = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: EMAIL, password: PASSWORD, name: 'CRM Test', organizationName: `CRM Test ${suffix}` },
  })
  tenantId = body(registered).data.activeTenantId
  cookie = String(registered.headers['set-cookie']).split(';')[0]!

  const other = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: OTHER_EMAIL, password: PASSWORD, name: 'Other', organizationName: `CRM Other ${suffix}` },
  })
  otherTenantId = body(other).data.activeTenantId
  otherCookie = String(other.headers['set-cookie']).split(';')[0]!

  const site = await app.inject({
    method: 'POST',
    url: '/api/v1/sites',
    headers: auth(),
    payload: { name: 'CRM Site', slug: `crm-site-${suffix}`, locale: 'nl' },
  })
  siteId = body(site).data.id

  // The form endpoint resolves its tenant from a *verified* domain, the same
  // way the public page read does. There is no API to create one yet, so the
  // test writes the row the resolver looks for.
  await withTenant(tenantId, async (tx) => {
    await tx`
      INSERT INTO domains (tenant_id, site_id, hostname, is_primary, verified_at)
      VALUES (${tenantId}, ${siteId}, ${HOST}, true, now())
    `
  })
})

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email IN (${EMAIL}, ${OTHER_EMAIL})`
  })
  await app.close()
  await closeDatabase()
})

describe('leads from website forms', () => {
  it('creates a lead and a contact from an unauthenticated storefront submission', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/leads/from-form',
      payload: {
        host: HOST,
        formKey: 'contact',
        name: 'Ada Lovelace',
        email: `ada-${suffix}@example.com`,
        phone: '+31 6 12345678',
        message: 'We would like a quote for a new website and ongoing maintenance, please.',
        companyName: 'Analytical Engines',
        consent: true,
        attribution: { source: 'google', medium: 'cpc', gclid: 'test-click' },
      },
    })

    expect(response.statusCode).toBe(201)
    // An anonymous caller gets an acknowledgement, never the CRM record.
    expect(body(response).data).toEqual({ received: true })

    const leads = await app.inject({ method: 'GET', url: '/api/v1/crm/leads', headers: auth() })
    const created = body(leads).data[0]
    leadId = created.id
    contactId = created.contactId

    expect(created.email).toBe(`ada-${suffix}@example.com`)
    expect(created.status).toBe('new')
    expect(created.attribution.gclid).toBe('test-click')
    // Deterministic scoring: e-mail + phone + company + long message + paid click.
    expect(created.score).toBeGreaterThan(60)
    expect(created.contactId).toBeTruthy()
  })

  it('records the contact, the company and the form activity', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/crm/contacts/${contactId}`,
      headers: auth(),
    })

    expect(response.statusCode).toBe(200)
    const detail = body(response).data
    expect(detail.contact.firstName).toBe('Ada')
    expect(detail.contact.lastName).toBe('Lovelace')
    expect(detail.contact.companyName).toBe('Analytical Engines')
    expect(detail.contact.consent.email).toBe(true)
    expect(detail.activities.some((activity: { type: string }) => activity.type === 'form')).toBe(true)
  })

  it('matches a second submission to the same contact instead of duplicating it', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/crm/leads/from-form',
      payload: { host: HOST, formKey: 'callback', email: `ada-${suffix}@example.com`, message: 'Call me back.' },
    })

    const contacts = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/contacts',
      headers: auth(),
      query: { search: `ada-${suffix}` },
    })
    expect(body(contacts).data).toHaveLength(1)
  })

  it('accepts and drops a submission that filled the honeypot', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/leads/from-form',
      payload: { host: HOST, email: `bot-${suffix}@example.com`, botField: 'http://spam.example' },
    })

    expect(response.statusCode).toBe(202)

    const contacts = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/contacts',
      headers: auth(),
      query: { search: `bot-${suffix}` },
    })
    expect(body(contacts).data).toHaveLength(0)
  })

  it('refuses a submission for an unknown hostname', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/leads/from-form',
      payload: { host: `nothing-${suffix}.example`, email: `x-${suffix}@example.com` },
    })
    expect(response.statusCode).toBe(404)
  })

  it('refuses a submission with neither an e-mail address nor a phone number', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/leads/from-form',
      payload: { host: HOST, message: 'anonymous' },
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('tenant isolation', () => {
  it('reports another workspace’s lead as not found, not as forbidden', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/crm/leads/${leadId}`,
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })
    expect(response.statusCode).toBe(404)
  })

  it('does not leak the lead into another workspace’s list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/leads',
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })
    expect(body(response).data).toHaveLength(0)
  })

  it('refuses a workspace the user is not a member of', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/leads',
      headers: { cookie: otherCookie, 'x-tenant-id': tenantId },
    })
    expect(response.statusCode).toBe(403)
  })

  it('requires authentication', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/crm/leads' })
    expect(response.statusCode).toBe(401)
  })
})

describe('pipeline and deals', () => {
  it('seeds the default pipeline on first use', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/crm/pipeline', headers: auth() })

    expect(response.statusCode).toBe(200)
    const board = body(response).data
    expect(board.columns.map((column: { stage: { key: string } }) => column.stage.key)).toEqual([
      'new',
      'contacted',
      'qualified',
      'proposal',
      'won',
      'lost',
    ])
  })

  it('converts a lead into a deal in the first stage', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/leads/${leadId}/convert`,
      headers: auth(),
      payload: { title: 'New website', valueCents: 500_000 },
    })

    expect(response.statusCode).toBe(201)
    dealId = body(response).data.deal.id
    expect(body(response).data.deal.stageKey).toBe('new')
    expect(body(response).data.lead.status).toBe('converted')
  })

  it('moves the deal between stages and records the transition', async () => {
    const contacted = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/deals/${dealId}/move`,
      headers: auth(),
      payload: { stageKey: 'contacted' },
    })
    expect(contacted.statusCode).toBe(200)
    expect(body(contacted).data.stageKey).toBe('contacted')
    expect(body(contacted).data.status).toBe('open')

    const qualified = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/deals/${dealId}/move`,
      headers: auth(),
      payload: { stageKey: 'qualified' },
    })
    expect(body(qualified).data.stageKey).toBe('qualified')
    // The stage clock restarts on every move, so this is time in *this* stage.
    expect(body(qualified).data.timeInStageSeconds).toBeLessThan(5)

    const detail = await app.inject({ method: 'GET', url: `/api/v1/crm/deals/${dealId}`, headers: auth() })
    const stageChanges = body(detail).data.activities.filter(
      (activity: { type: string }) => activity.type === 'stage_change',
    )
    expect(stageChanges.length).toBe(2)
  })

  it('weights the forecast by the stage probability', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/crm/pipeline', headers: auth() })
    const board = body(response).data

    expect(board.openValueCents).toBe(500_000)
    // Qualified is weighted at 0.4.
    expect(board.forecastCents).toBe(200_000)
  })

  it('derives the won status from the stage and emits deal.won', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/deals/${dealId}/move`,
      headers: auth(),
      payload: { stageKey: 'won' },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.status).toBe('won')
    expect(body(response).data.closedAt).toBeTruthy()

    const activity = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/current/activity',
      headers: auth(),
    })
    const names = body(activity).data.map((entry: { name: string }) => entry.name)
    expect(names).toContain('deal.won')
    expect(names).toContain('lead.created')
  })

  it('drops a won deal out of the forecast and into revenue', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/crm/overview', headers: auth() })
    const overview = body(response).data

    expect(overview.forecastCents).toBe(0)
    expect(overview.wonValueCents).toBe(500_000)
    expect(overview.contactCount).toBeGreaterThan(0)
  })

  it('rejects a move to a stage that does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/deals/${dealId}/move`,
      headers: auth(),
      payload: { stageKey: 'not-a-stage' },
    })
    expect(response.statusCode).toBe(404)
  })
})

describe('e-mail', () => {
  it('reports the console provider when nothing is configured', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/crm/email/status', headers: auth() })

    expect(response.statusCode).toBe(200)
    const status = body(response).data
    expect(status.provider).toBe('console')
    expect(status.configured).toBe(false)
    // Names of what is missing, never values.
    expect(status.missing.length).toBeGreaterThan(0)
  })

  it('installs the five flows from the spec, disabled', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/email/flows/install-defaults',
      headers: auth(),
    })

    expect(response.statusCode).toBe(201)
    const flows = body(response).data
    expect(flows.map((flow: { key: string }) => flow.key).sort()).toEqual([
      'abandoned_cart',
      'lead_nurture',
      'post_purchase',
      'review_request',
      'win_back',
    ])
    expect(flows.every((flow: { enabled: boolean }) => flow.enabled === false)).toBe(true)
  })

  it('sends a campaign to the consenting contacts and reports that it was not delivered', async () => {
    const segment = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/email/segments',
      headers: auth(),
      payload: {
        name: 'Opted in',
        definition: { match: 'all', requireConsent: true, rules: [] },
      },
    })
    const segmentId = body(segment).data.id

    const campaign = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/email/campaigns',
      headers: auth(),
      payload: {
        name: 'Spring update',
        subject: 'Hello {{ firstName }}',
        segmentId,
        bodyHtml: '<p>Hello {{ firstName }}, here is our news.</p>',
      },
    })
    const campaignId = body(campaign).data.id

    const sent = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/email/campaigns/${campaignId}/send`,
      headers: auth(),
    })

    expect(sent.statusCode).toBe(200)
    const result = body(sent).data
    expect(result.stats.recipients).toBe(1)
    expect(result.stats.sent).toBe(1)
    // The message went to a log, not to a mailbox, and the API says so.
    expect(result.delivered).toBe(false)
    expect(result.campaign.status).toBe('sent')

    const messages = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/email/messages',
      headers: auth(),
      query: { campaignId },
    })
    const message = body(messages).data[0]
    expect(message.status).toBe('sent')
    expect(message.provider).toBe('console')
    // Rendered per contact, from the stored campaign body.
    expect(message.subject).toBe('Hello Ada')
  })

  it('does not send a campaign twice', async () => {
    const campaigns = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/email/campaigns',
      headers: auth(),
    })
    const campaignId = body(campaigns).data[0].id

    const again = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/email/campaigns/${campaignId}/send`,
      headers: auth(),
    })

    // Same recipients, but every one of them was already claimed.
    expect(body(again).data.stats.sent).toBe(0)
    expect(body(again).data.stats.skipped).toBe(1)
  })

  it('compiles an enabled flow into an automation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/email/flows/lead_nurture/enable',
      headers: auth(),
      payload: { enabled: true },
    })

    expect(response.statusCode).toBe(200)
    const { flow, automation } = body(response).data
    expect(flow.enabled).toBe(true)
    expect(automation.sourceFlowId).toBe(flow.id)
    expect(automation.status).toBe('active')
    expect(automation.triggerEvent).toBe('lead.created')
    // trigger → send now → wait 3 days → send again.
    expect(automation.graph.nodes.map((node: { kind: string }) => node.kind)).toEqual([
      'trigger',
      'action',
      'delay',
      'action',
    ])
  })

  it('refuses to enable a flow that has no trigger', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/email/flows/win_back/enable',
      headers: auth(),
      payload: { enabled: true },
    })
    // "Has not ordered in 90 days" is a scheduled query, not an event.
    expect(response.statusCode).toBe(400)
  })

  it('runs the enabled flow when a new lead arrives', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/crm/leads/from-form',
      payload: {
        host: HOST,
        formKey: 'contact',
        name: 'Grace Hopper',
        email: `flow-${suffix}@example.com`,
        message: 'Please get in touch about a new site.',
        consent: true,
      },
    })

    const messages = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/email/messages',
      headers: auth(),
      query: { limit: '200' },
    })

    const sent = body(messages).data.filter(
      (message: { toEmail: string }) => message.toEmail === `flow-${suffix}@example.com`,
    )
    // The first step only. The second is three days out, so its run is parked.
    expect(sent).toHaveLength(1)
    expect(sent[0].kind).toBe('automation')
    expect(sent[0].subject).toBe('Thank you for getting in touch')
  })

  it('excludes a contact without e-mail consent', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/crm/contacts',
      headers: auth(),
      payload: { firstName: 'No', lastName: 'Consent', email: `noconsent-${suffix}@example.com` },
    })

    const campaign = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/email/campaigns',
      headers: auth(),
      payload: { name: 'Second', subject: 'Second', bodyHtml: '<p>Hi</p>' },
    })
    const campaignId = body(campaign).data.id

    const sent = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/email/campaigns/${campaignId}/send`,
      headers: auth(),
    })

    // Both contacts who opted in through a form; not the one added by hand.
    expect(body(sent).data.stats.recipients).toBe(2)

    const messages = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/email/messages',
      headers: auth(),
      query: { campaignId },
    })
    const recipients = body(messages).data.map((message: { toEmail: string }) => message.toEmail)
    expect(recipients).not.toContain(`noconsent-${suffix}@example.com`)
  })
})

describe('automations', () => {
  const TRIGGER_KEY = 'manual-run-1'
  let automationId = ''

  it('stores a validated graph', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/automations',
      headers: auth(),
      payload: {
        name: 'Welcome a new lead',
        status: 'active',
        triggerEvent: 'lead.created',
        graph: {
          entryNodeId: 'start',
          nodes: [
            { id: 'start', kind: 'trigger', event: 'lead.created', next: 'has_email' },
            {
              id: 'has_email',
              kind: 'condition',
              condition: { field: 'contactId', operator: 'exists' },
              next: 'welcome',
            },
            {
              id: 'welcome',
              kind: 'action',
              action: {
                type: 'email.send',
                to: 'address',
                address: `automation-${suffix}@example.com`,
                subject: 'Thanks for getting in touch',
                bodyHtml: '<p>We have your message.</p>',
              },
              next: null,
            },
          ],
        },
      },
    })

    expect(response.statusCode).toBe(201)
    automationId = body(response).data.id
    expect(body(response).data.graph.nodes).toHaveLength(3)
  })

  it('rejects a graph with an edge that goes nowhere', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/automations',
      headers: auth(),
      payload: {
        name: 'Broken',
        graph: {
          entryNodeId: 'start',
          nodes: [{ id: 'start', kind: 'trigger', next: 'missing' }],
        },
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('runs the graph and sends one e-mail', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/automations/${automationId}/trigger`,
      headers: auth(),
      payload: { triggerKey: TRIGGER_KEY, contactId },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.status).toBe('completed')
    expect(body(response).data.executedNodes).toEqual(['start', 'has_email', 'welcome'])
  })

  it('does not re-run or re-send when the same trigger arrives again', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/email/messages',
      headers: auth(),
      query: { limit: '200' },
    })
    const countFor = (payload: { data: { toEmail: string }[] }) =>
      payload.data.filter((message) => message.toEmail === `automation-${suffix}@example.com`).length

    expect(countFor(body(before))).toBe(1)

    const replay = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/automations/${automationId}/trigger`,
      headers: auth(),
      payload: { triggerKey: TRIGGER_KEY, contactId },
    })

    expect(replay.statusCode).toBe(200)
    // The run is already finished: nothing executes, nothing is sent.
    expect(body(replay).data.executedNodes).toEqual([])
    expect(body(replay).data.status).toBe('completed')

    const after = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/email/messages',
      headers: auth(),
      query: { limit: '200' },
    })
    expect(countFor(body(after))).toBe(1)
  })

  it('starts a separate run for a different trigger key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/automations/${automationId}/trigger`,
      headers: auth(),
      payload: { triggerKey: 'manual-run-2', contactId },
    })

    expect(body(response).data.executedNodes).toEqual(['start', 'has_email', 'welcome'])
    expect(body(response).data.runId).toBeTruthy()

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/crm/automations/${automationId}`,
      headers: auth(),
    })
    expect(body(detail).data.runs.length).toBe(2)
  })

  it('ends the run without acting when a condition does not hold', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/automations',
      headers: auth(),
      payload: {
        name: 'High value only',
        graph: {
          entryNodeId: 'start',
          nodes: [
            { id: 'start', kind: 'trigger', next: 'check' },
            {
              id: 'check',
              kind: 'condition',
              condition: { field: 'valueCents', operator: 'gte', value: 1_000_000 },
              next: 'task',
            },
            {
              id: 'task',
              kind: 'action',
              action: { type: 'crm.create_task', title: 'Call the customer', dueInSeconds: 3600 },
              next: null,
            },
          ],
        },
      },
    })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/automations/${body(created).data.id}/trigger`,
      headers: auth(),
      payload: { triggerKey: 'low-value', context: { valueCents: 1000 } },
    })

    // The condition node runs; the action never does.
    expect(body(response).data.executedNodes).toEqual(['start', 'check'])
    expect(body(response).data.status).toBe('completed')
  })

  it('parks a run on a delay instead of blocking on it', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/automations',
      headers: auth(),
      payload: {
        name: 'Follow up tomorrow',
        graph: {
          entryNodeId: 'start',
          nodes: [
            { id: 'start', kind: 'trigger', next: 'wait' },
            { id: 'wait', kind: 'delay', delaySeconds: 86_400, next: 'task' },
            {
              id: 'task',
              kind: 'action',
              action: { type: 'crm.create_task', title: 'Follow up', dueInSeconds: 3600 },
              next: null,
            },
          ],
        },
      },
    })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/crm/automations/${body(created).data.id}/trigger`,
      headers: auth(),
      payload: { triggerKey: 'delayed' },
    })

    expect(body(response).data.status).toBe('waiting')
    expect(body(response).data.executedNodes).toEqual(['start'])

    // Nothing is due yet, so the scheduler endpoint has nothing to resume.
    const resumed = await app.inject({
      method: 'POST',
      url: '/api/v1/crm/automations/resume-due',
      headers: auth(),
    })
    expect(body(resumed).data.resumed).toBe(0)
  })

  it('requires the automation permission', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/automations',
      headers: { cookie: otherCookie, 'x-tenant-id': tenantId },
    })
    expect(response.statusCode).toBe(403)
  })
})

describe('GDPR', () => {
  it('exports everything held about one contact', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/crm/contacts/${contactId}/export`,
      headers: auth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')

    const payload = body(response).data
    expect(payload.contact.id).toBe(contactId)
    expect(payload.leads.length).toBeGreaterThan(0)
    expect(payload.deals.length).toBeGreaterThan(0)
    expect(payload.activities.length).toBeGreaterThan(0)
  })

  it('erases the contact and everything about them', async () => {
    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/v1/crm/contacts/${contactId}`,
      headers: auth(),
    })
    expect(deleted.statusCode).toBe(200)

    const gone = await app.inject({
      method: 'GET',
      url: `/api/v1/crm/contacts/${contactId}`,
      headers: auth(),
    })
    expect(gone.statusCode).toBe(404)

    // The lead survives without its person: the conversion history is the
    // tenant's, the personal data was not — and the copies the lead itself
    // held are scrubbed, not merely unlinked.
    const lead = await app.inject({ method: 'GET', url: `/api/v1/crm/leads/${leadId}`, headers: auth() })
    expect(lead.statusCode).toBe(200)
    expect(body(lead).data.contactId).toBeNull()
    expect(body(lead).data.email).toBe('')
    expect(body(lead).data.name).toBe('')

    // And the erasure itself is recorded, without the erased data.
    const activities = await app.inject({
      method: 'GET',
      url: '/api/v1/crm/activities',
      headers: auth(),
    })
    expect(
      body(activities).data.some((activity: { subject: string }) => activity.subject === 'Contact erased'),
    ).toBe(true)
  })
})
