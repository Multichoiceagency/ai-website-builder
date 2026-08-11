import type { FastifyRequest } from 'fastify'
import { withoutTenant } from '../db/client.js'
import { ForbiddenError } from './errors.js'
import { requireUser } from '../plugins/auth.js'

export async function requirePlatformAdmin(
  request: FastifyRequest,
): Promise<{ userId: string; email: string }> {
  const auth = requireUser(request)

  const isAdmin = await withoutTenant(async (tx) => {
    const [row] = await tx<{ user_id: string }[]>`
      SELECT user_id FROM platform_admins WHERE user_id = ${auth.user.id} LIMIT 1
    `
    return Boolean(row)
  })

  if (!isAdmin) throw new ForbiddenError('Not found.')
  return { userId: auth.user.id, email: auth.user.email }
}

export async function recordAdminAccess(
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
