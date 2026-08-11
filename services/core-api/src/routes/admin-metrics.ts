import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { withoutTenant } from '../db/client.js'
import { recordAdminAccess, requirePlatformAdmin } from '../lib/admin-guard.js'
import { estimateRevenueFromPlans } from '../lib/admin-revenue.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'

const adminMetricsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/revenue', async (request, reply) => {
    const admin = await requirePlatformAdmin(request)

    const plans = await withoutTenant(
      (tx) => tx<{ plan: string; tenant_count: string }[]>`SELECT * FROM platform_plan_distribution()`,
    )
    const revenue = estimateRevenueFromPlans(
      plans.map((row) => ({ plan: row.plan, tenants: Number(row.tenant_count) })),
    )

    await recordAdminAccess(admin.userId, 'view_revenue', null)
    return reply.send(ok(revenue))
  })

  app.get('/analytics', async (request, reply) => {
    const admin = await requirePlatformAdmin(request)
    const { days } = parseOrThrow(
      z.object({ days: z.coerce.number().int().min(7).max(90).default(30) }),
      request.query ?? {},
      'query',
    )

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
      const revenue = estimateRevenueFromPlans(
        plans.map((row) => ({ plan: row.plan, tenants: Number(row.tenant_count) })),
      )

      const signups = await tx<{ day: Date; signup_count: string }[]>`
        SELECT * FROM platform_daily_signups(${days})
      `
      const tenants = await tx<{ day: Date; tenant_count: string }[]>`
        SELECT * FROM platform_daily_tenants(${days})
      `
      const events = await tx<{ day: Date; event_count: string }[]>`
        SELECT * FROM platform_daily_events(${days})
      `

      const [staffRow] = await tx<{ staff_count: string }[]>`
        SELECT count(*)::text AS staff_count FROM platform_admins
      `

      const recentUsers = await tx<
        { user_id: string; email: string; name: string; created_at: Date; tenants: string }[]
      >`
        SELECT user_id, email, name, created_at, tenants
        FROM platform_users_overview()
        LIMIT 8
      `

      const toDay = (value: Date) => value.toISOString().slice(0, 10)

      return {
        days,
        stats: {
          tenants: Number(stats!.tenant_count),
          users: Number(stats!.user_count),
          sites: Number(stats!.site_count),
          pages: Number(stats!.page_count),
          publishedPages: Number(stats!.published_count),
          activeSessions: Number(stats!.active_sessions),
          eventsLast24h: Number(stats!.events_last_24h),
          signupsLast7d: Number(stats!.signups_last_7d),
          staff: Number(staffRow?.staff_count ?? 0),
        },
        revenue,
        series: {
          signups: signups.map((row) => ({ day: toDay(row.day), count: Number(row.signup_count) })),
          tenants: tenants.map((row) => ({ day: toDay(row.day), count: Number(row.tenant_count) })),
          events: events.map((row) => ({ day: toDay(row.day), count: Number(row.event_count) })),
        },
        recentRegistrations: recentUsers.map((row) => ({
          id: row.user_id,
          email: row.email,
          name: row.name,
          createdAt: row.created_at.toISOString(),
          tenants: row.tenants,
        })),
      }
    })

    await recordAdminAccess(admin.userId, 'view_analytics', null, { days })
    return reply.send(ok(data))
  })
}

export default adminMetricsRoutes
