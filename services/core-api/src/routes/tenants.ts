import type { FastifyPluginAsync } from 'fastify'
import { limitsForPlan } from '@platform/permissions'
import { createTenantInputSchema } from '@platform/schemas'
import { withTenant, withoutTenant } from '../db/client.js'
import { listAuditEvents, recordAuditEvent } from '../db/repositories/audit.js'
import {
  countTenantMembers,
  insertMembership,
  insertOrganization,
  insertTenant,
} from '../db/repositories/tenants.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { ok } from '../lib/response.js'
import { uniqueSlug } from '../lib/slug.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant, requireUser } from '../plugins/auth.js'

const tenantsRoutes: FastifyPluginAsync = async (app) => {
  /** The workspaces this user can act in. Never a list of all tenants. */
  app.get('/', async (request, reply) => {
    const auth = requireUser(request)
    return reply.send(ok(auth.memberships))
  })

  app.post('/', async (request, reply) => {
    const auth = requireUser(request)
    const input = parseOrThrow(createTenantInputSchema, request.body, 'workspace')

    const tenant = await withoutTenant(async (tx) => {
      const slug = await uniqueSlug(input.slug, async (candidate) => {
        const [row] = await tx<{ id: string }[]>`SELECT id FROM tenants WHERE slug = ${candidate} LIMIT 1`
        return Boolean(row)
      })

      const organization = await insertOrganization(tx, {
        name: input.name,
        slug: await uniqueSlug(input.slug, async (candidate) => {
          const [row] = await tx<{ id: string }[]>`SELECT id FROM organizations WHERE slug = ${candidate} LIMIT 1`
          return Boolean(row)
        }),
      })

      const created = await insertTenant(tx, {
        organizationId: organization.id,
        name: input.name,
        slug,
        plan: input.plan,
      })

      await insertMembership(tx, { tenantId: created.id, userId: auth.user.id, role: 'owner' })
      return created
    })

    const event = buildEvent({
      name: 'tenant.created',
      tenantId: tenant.id,
      actor: { type: 'user', id: auth.user.id, label: auth.user.email },
      resource: { type: 'tenant', id: tenant.id },
      payload: { plan: tenant.plan },
    })
    await withTenant(tenant.id, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.status(201).send(ok(tenant))
  })

  /** Plan entitlements and current usage, for the dashboard's limit hints. */
  app.get('/current/usage', async (request, reply) => {
    const context = requireTenant(request, 'tenant:read')
    const limits = limitsForPlan(context.plan)

    const usage = await withTenant(context.tenantId, async (tx) => {
      const [sites] = await tx<{ count: string }[]>`
        SELECT count(*)::text AS count FROM sites WHERE tenant_id = ${context.tenantId}
      `
      return { sites: Number(sites!.count) }
    })

    const members = await withoutTenant((tx) => countTenantMembers(tx, context.tenantId))

    return reply.send(
      ok({
        plan: context.plan,
        limits,
        usage: { sites: usage.sites, users: members },
      }),
    )
  })

  app.get('/current/activity', async (request, reply) => {
    const context = requireTenant(request, 'audit:read')
    const entries = await withTenant(context.tenantId, (tx) => listAuditEvents(tx, context.tenantId, 20))
    return reply.send(ok(entries))
  })
}

export default tenantsRoutes
