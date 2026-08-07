import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { updateWhiteLabelInputSchema, uuidSchema } from '@platform/schemas'
import { withoutTenant } from '../db/client.js'
import {
  findWhiteLabelSettings,
  saveWhiteLabelSettings,
} from '../db/repositories/agency.js'
import { ForbiddenError, NotFoundError } from '../lib/errors.js'
import { mergeWhiteLabelSettings } from '../lib/agency/white-label.js'
import { aiGateway } from '../lib/generation/index.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireUser } from '../plugins/auth.js'

/**
 * The internal staff console (§66, §67).
 *
 * This is the only part of the API that can see across tenants, so every route
 * here is behind an explicit `platform_admins` membership — never a role, never
 * a plan, never a tenant permission. Staff access to a specific customer is
 * written to `admin_access_log`.
 *
 * What it deliberately cannot do: read page content, customer records, or any
 * secret. Aggregates, names and timestamps only, because that is all support
 * and billing actually need.
 */

async function requirePlatformAdmin(request: FastifyRequest): Promise<{ userId: string; email: string }> {
  const auth = requireUser(request)

  const isAdmin = await withoutTenant(async (tx) => {
    const [row] = await tx<{ user_id: string }[]>`
      SELECT user_id FROM platform_admins WHERE user_id = ${auth.user.id} LIMIT 1
    `
    return Boolean(row)
  })

  // Same response as any unknown route would give: staff tooling should not be
  // discoverable by probing it.
  if (!isAdmin) throw new ForbiddenError('Not found.')

  return { userId: auth.user.id, email: auth.user.email }
}

async function recordAccess(
  userId: string,
  action: string,
  tenantId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await withoutTenant(
    (tx) => tx`
      INSERT INTO admin_access_log (user_id, action, tenant_id, metadata)
      VALUES (${userId}, ${action}, ${tenantId}, ${JSON.stringify(metadata)}::jsonb)
    `,
  )
}

const adminRoutes: FastifyPluginAsync = async (app) => {
  /** Whether the signed-in user is staff. Used by the console to route. */
  app.get('/session', async (request, reply) => {
    const auth = requireUser(request)

    const isAdmin = await withoutTenant(async (tx) => {
      const [row] = await tx<{ user_id: string }[]>`
        SELECT user_id FROM platform_admins WHERE user_id = ${auth.user.id} LIMIT 1
      `
      return Boolean(row)
    })

    return reply.send(ok({ isPlatformAdmin: isAdmin, user: auth.user }))
  })

  app.get('/stats', async (request, reply) => {
    const admin = await requirePlatformAdmin(request)

    const data = await withoutTenant(async (tx) => {
      const [stats] = await tx<
        {
          tenant_count: string
          user_count: string
          site_count: string
          page_count: string
          published_count: string
          active_sessions: string
          events_last_24h: string
          signups_last_7d: string
        }[]
      >`SELECT * FROM platform_stats()`

      const plans = await tx<{ plan: string; tenant_count: string }[]>`SELECT * FROM platform_plan_distribution()`

      return {
        tenants: Number(stats!.tenant_count),
        users: Number(stats!.user_count),
        sites: Number(stats!.site_count),
        pages: Number(stats!.page_count),
        publishedPages: Number(stats!.published_count),
        activeSessions: Number(stats!.active_sessions),
        eventsLast24h: Number(stats!.events_last_24h),
        signupsLast7d: Number(stats!.signups_last_7d),
        plans: plans.map((row) => ({ plan: row.plan, tenants: Number(row.tenant_count) })),
      }
    })

    await recordAccess(admin.userId, 'view_platform_stats', null)
    return reply.send(ok(data))
  })

  /** Every client on the platform, with usage at a glance. */
  app.get('/tenants', async (request, reply) => {
    const admin = await requirePlatformAdmin(request)
    const { search } = parseOrThrow(
      z.object({ search: z.string().max(120).optional() }),
      request.query ?? {},
      'query',
    )

    const rows = await withoutTenant(
      (tx) => tx<
        {
          tenant_id: string
          name: string
          slug: string
          plan: string
          organization_name: string
          created_at: Date
          member_count: string
          site_count: string
          page_count: string
          published_count: string
          last_activity_at: Date | null
        }[]
      >`SELECT * FROM platform_tenant_overview()`,
    )

    const term = search?.trim().toLowerCase()
    const filtered = term
      ? rows.filter((row) => `${row.name} ${row.slug} ${row.organization_name}`.toLowerCase().includes(term))
      : rows

    await recordAccess(admin.userId, 'list_tenants', null, { search: term ?? null, results: filtered.length })

    return reply.send(
      ok(
        filtered.map((row) => ({
          id: row.tenant_id,
          name: row.name,
          slug: row.slug,
          plan: row.plan,
          organizationName: row.organization_name,
          createdAt: row.created_at.toISOString(),
          members: Number(row.member_count),
          sites: Number(row.site_count),
          pages: Number(row.page_count),
          publishedPages: Number(row.published_count),
          lastActivityAt: row.last_activity_at?.toISOString() ?? null,
        })),
      ),
    )
  })

  /** One client in detail. Logged, because this is access to a named customer. */
  app.get('/tenants/:tenantId', async (request, reply) => {
    const admin = await requirePlatformAdmin(request)
    const { tenantId } = parseOrThrow(z.object({ tenantId: uuidSchema }), request.params, 'tenant id')

    const data = await withoutTenant(async (tx) => {
      const [overview] = await tx<
        {
          tenant_id: string
          name: string
          slug: string
          plan: string
          organization_name: string
          created_at: Date
          member_count: string
          site_count: string
          page_count: string
          published_count: string
          last_activity_at: Date | null
        }[]
      >`SELECT * FROM platform_tenant_overview() WHERE tenant_id = ${tenantId}`

      if (!overview) return null

      const members = await tx<
        { user_id: string; email: string; name: string; role: string; joined_at: Date }[]
      >`SELECT * FROM platform_tenant_members(${tenantId})`

      const sites = await tx<
        {
          site_id: string
          name: string
          slug: string
          primary_hostname: string | null
          locale: string
          page_count: string
          published_count: string
          created_at: Date
        }[]
      >`SELECT * FROM platform_tenant_sites(${tenantId})`

      const branding = await findWhiteLabelSettings(tx, tenantId)

      return {
        tenant: {
          id: overview.tenant_id,
          name: overview.name,
          slug: overview.slug,
          plan: overview.plan,
          organizationName: overview.organization_name,
          createdAt: overview.created_at.toISOString(),
          members: Number(overview.member_count),
          sites: Number(overview.site_count),
          pages: Number(overview.page_count),
          publishedPages: Number(overview.published_count),
          lastActivityAt: overview.last_activity_at?.toISOString() ?? null,
        },
        // Staff see who has access and in what role — never a credential.
        members: members.map((member) => ({
          id: member.user_id,
          email: member.email,
          name: member.name,
          role: member.role,
          joinedAt: member.joined_at.toISOString(),
        })),
        sites: sites.map((site) => ({
          id: site.site_id,
          name: site.name,
          slug: site.slug,
          hostname: site.primary_hostname,
          locale: site.locale,
          pages: Number(site.page_count),
          publishedPages: Number(site.published_count),
          createdAt: site.created_at.toISOString(),
        })),
        branding,
      }
    })

    if (!data) throw new NotFoundError('Workspace')

    await recordAccess(admin.userId, 'view_tenant', tenantId, { name: data.tenant.name })
    return reply.send(ok(data))
  })

  /**
   * Staff can set a client's dashboard chrome (logo, colours, fonts) so the
   * workspace feels theirs on first login. Domain / hide-platform still go
   * through the agency white-label entitlement path.
   */
  app.put('/tenants/:tenantId/branding', async (request, reply) => {
    const admin = await requirePlatformAdmin(request)
    const { tenantId } = parseOrThrow(z.object({ tenantId: uuidSchema }), request.params, 'tenant id')
    const patch = parseOrThrow(updateWhiteLabelInputSchema, request.body, 'dashboard branding')

    const settings = await withoutTenant(async (tx) => {
      const [exists] = await tx<{ id: string }[]>`SELECT id FROM tenants WHERE id = ${tenantId} LIMIT 1`
      if (!exists) throw new NotFoundError('Workspace')
      const current = await findWhiteLabelSettings(tx, tenantId)
      return saveWhiteLabelSettings(tx, tenantId, mergeWhiteLabelSettings(current, patch))
    })

    await recordAccess(admin.userId, 'update_tenant_branding', tenantId, {
      keys: Object.keys(patch),
    })
    return reply.send(ok(settings))
  })

  /** Platform-wide activity feed: event names and timestamps only. */
  app.get('/activity', async (request, reply) => {
    const admin = await requirePlatformAdmin(request)
    const { limit } = parseOrThrow(
      z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }),
      request.query ?? {},
      'query',
    )

    const rows = await withoutTenant(
      (tx) => tx<
        { id: string; tenant_id: string; tenant_name: string; name: string; actor_label: string | null; created_at: Date }[]
      >`SELECT * FROM platform_recent_activity(${limit})`,
    )

    await recordAccess(admin.userId, 'view_activity', null)

    return reply.send(
      ok(
        rows.map((row) => ({
          id: row.id,
          tenantId: row.tenant_id,
          tenantName: row.tenant_name,
          name: row.name,
          actor: row.actor_label,
          createdAt: row.created_at.toISOString(),
        })),
      ),
    )
  })

  /** The staff audit trail itself — visible to staff, so access is mutual. */
  app.get('/access-log', async (request, reply) => {
    const admin = await requirePlatformAdmin(request)

    const rows = await withoutTenant(
      (tx) => tx<
        { id: string; action: string; tenant_id: string | null; created_at: Date; email: string }[]
      >`
        SELECT l.id, l.action, l.tenant_id, l.created_at, u.email
        FROM admin_access_log l
        JOIN users u ON u.id = l.user_id
        ORDER BY l.created_at DESC
        LIMIT 100
      `,
    )

    return reply.send(
      ok(
        rows.map((row) => ({
          id: row.id,
          action: row.action,
          tenantId: row.tenant_id,
          staff: row.email,
          createdAt: row.created_at.toISOString(),
        })),
      ),
    )
  })

  /** Service health, for the internal status view (§95). */
  app.get('/health', async (request, reply) => {
    await requirePlatformAdmin(request)

    const database = await withoutTenant(async (tx) => {
      const start = Date.now()
      await tx`SELECT 1`
      return { status: 'up' as const, latencyMs: Date.now() - start }
    }).catch(() => ({ status: 'down' as const, latencyMs: -1 }))

    /*
     * Language-model providers that are actually configured right now. The
     * deterministic composer is excluded on purpose: it is always available, so
     * counting it would make the gateway look healthy in exactly the case the
     * status view exists to surface — no model configured at all.
     */
    const languageModels = aiGateway
      .describe()
      .filter((provider) => provider.available && provider.id !== 'deterministic-composer')
      .map((provider) => provider.id)

    return reply.send(
      ok({
        services: [
          { id: 'core-api', name: 'Core API', status: 'up', detail: process.env.NODE_ENV ?? 'development' },
          { id: 'postgres', name: 'PostgreSQL', status: database.status, detail: `${database.latencyMs}ms` },
          {
            id: 'ai',
            name: 'AI provider',
            /*
             * Asked of the gateway, not of one env var. The gateway is what
             * actually routes, so it is the only thing that knows which
             * providers are live — reading `ANTHROPIC_API_KEY` here reported
             * "degraded" while Gemini was serving every request.
             */
            status: languageModels.length ? 'up' : 'degraded',
            detail: languageModels.length
              ? languageModels.join(', ')
              : 'deterministic composer only',
          },
          {
            id: 'google',
            name: 'Google integration',
            status: process.env.GOOGLE_CLIENT_ID ? 'up' : 'down',
            detail: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'no OAuth client configured',
          },
        ],
      }),
    )
  })
}

export default adminRoutes
