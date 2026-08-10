import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { withoutTenant } from '../db/client.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireUser } from '../plugins/auth.js'

/**
 * Customer feedback into the platform inbox (staff reads via /api/v1/admin/feedback).
 */
const feedbackRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', async (request, reply) => {
    const auth = requireUser(request)
    const body = parseOrThrow(
      z.object({
        message: z.string().trim().min(1).max(4000),
        pagePath: z.string().max(500).default(''),
      }),
      request.body,
      'feedback',
    )

    const tenantId =
      (request.headers['x-tenant-id'] as string | undefined) ??
      auth.memberships[0]?.tenantId ??
      null

    const [row] = await withoutTenant(
      (tx) =>
        tx<{ id: string; created_at: Date }[]>`
        INSERT INTO platform_feedback (user_id, tenant_id, message, page_path)
        VALUES (${auth.user.id}, ${tenantId}, ${body.message}, ${body.pagePath})
        RETURNING id, created_at
      `,
    )

    return reply.status(201).send(
      ok({
        id: row!.id,
        createdAt: row!.created_at.toISOString(),
      }),
    )
  })
}

export default feedbackRoutes
