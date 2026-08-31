import type { FastifyPluginAsync } from 'fastify'
import { permissionSchema } from '@platform/schemas'
import { z } from 'zod'
import { withTenant } from '../db/client.js'
import {
  generateApiKey,
  insertApiKey,
  listApiKeys,
  revokeApiKey,
} from '../db/repositories/api-keys.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { NotFoundError } from '../lib/errors.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * Keys are managed by people, never by keys.
 *
 * Every route here needs `tenant:write`, which a key-authenticated request can
 * hold — so a key could otherwise mint a longer-lived key with wider scopes and
 * escape its own expiry. The explicit check keeps issuing a human act.
 */

const createSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(permissionSchema).min(1),
  environment: z.enum(['live', 'test']).default('live'),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
})

const apiKeyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', async (request, reply) => {
    if (request.apiKey) throw new NotFoundError('An API key cannot issue API keys.')
    const context = requireTenant(request, 'tenant:write')
    const input = parseOrThrow(createSchema, request.body, 'api key')

    const token = generateApiKey(input.environment)
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 86_400_000)
      : null

    const record = await withTenant(context.tenantId, (tx) =>
      insertApiKey(tx, {
        tenantId: context.tenantId,
        issuedBy: context.user.id,
        name: input.name,
        token,
        scopes: input.scopes,
        expiresAt,
      }),
    )

    // The only time the key itself is ever returned. Nothing stores it.
    return reply.send(ok({ ...record, token }))
  })

  app.get('/', async (request, reply) => {
    const context = requireTenant(request, 'tenant:read')
    const keys = await withTenant(context.tenantId, (tx) => listApiKeys(tx, context.tenantId))
    return reply.send(ok(keys))
  })

  app.delete('/:id', async (request, reply) => {
    if (request.apiKey) throw new NotFoundError('An API key cannot revoke API keys.')
    const context = requireTenant(request, 'tenant:write')
    const { id } = parseOrThrow(z.object({ id: z.string().uuid() }), request.params, 'api key id')

    const revoked = await withTenant(context.tenantId, (tx) =>
      revokeApiKey(tx, context.tenantId, id),
    )
    if (!revoked) throw new NotFoundError('API key not found.')
    return reply.send(ok({ id, revoked: true }))
  })
}

export default apiKeyRoutes
