import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { PROVIDERS } from '@platform/agent'
import { withTenant } from '../db/client.js'
import {
  deleteProviderKey,
  listProviderKeySummaries,
  upsertProviderKey,
} from '../db/repositories/ai-builder.js'
import { BadRequestError, NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * BYOK provider keys for the AI website builder.
 *
 * Each tenant brings its own LLM key and pays its provider directly, so these
 * rows are the difference between a working builder and an inert one. They are
 * written encrypted and never read back: no endpoint here returns key material,
 * not even to the member who added it. Rotating means re-entering.
 */

const providerIds = PROVIDERS.map((provider) => provider.id)

const upsertSchema = z.object({
  providerId: z.string().trim().min(1).max(64),
  apiKey: z.string().trim().min(8).max(400),
  /** Self-hosted or proxy endpoints (Ollama, OpenRouter, custom gateways). */
  baseUrl: z.string().trim().url().max(500).optional(),
  /** Comma-separated overrides; omitted falls back to the built-in catalogue. */
  models: z.string().trim().max(2_000).optional(),
})

const aiBuilderRoutes: FastifyPluginAsync = async (app) => {
  /** The providers this installation understands, for the settings screen. */
  app.get('/providers', async (request, reply) => {
    requireTenant(request, 'tenant:read')
    return reply.send(
      ok(
        PROVIDERS.map((provider) => ({
          id: provider.id,
          name: provider.name,
        })),
      ),
    )
  })

  /** Configured keys, without the keys themselves. */
  app.get('/keys', async (request, reply) => {
    const context = requireTenant(request, 'tenant:read')
    const keys = await withTenant(context.tenantId, (tx) =>
      listProviderKeySummaries(tx, context.tenantId),
    )
    return reply.send(ok(keys))
  })

  /** Add or rotate the key for one provider. */
  app.post('/keys', async (request, reply) => {
    const context = requireTenant(request, 'tenant:write')
    const input = parseOrThrow(upsertSchema, request.body, 'provider key')

    const provider = PROVIDERS.find((candidate) => candidate.id === input.providerId)
    if (!provider) {
      // Naming the known ids turns a typo into a one-step fix rather than a
      // hunt through documentation.
      throw new BadRequestError(
        `Unknown provider "${input.providerId}". Known providers: ${providerIds.join(', ')}.`,
      )
    }

    const id = await withTenant(context.tenantId, (tx) =>
      upsertProviderKey(tx, {
        tenantId: context.tenantId,
        addedBy: context.user.id,
        providerId: provider.id,
        providerName: provider.name,
        apiKey: input.apiKey,
        baseUrl: input.baseUrl ?? null,
        models: input.models ?? null,
      }),
    )

    return reply.send(ok({ id, providerId: provider.id, providerName: provider.name }))
  })

  app.delete('/keys/:id', async (request, reply) => {
    const context = requireTenant(request, 'tenant:write')
    const { id } = parseOrThrow(
      z.object({ id: z.string().uuid() }),
      request.params,
      'provider key id',
    )

    const removed = await withTenant(context.tenantId, (tx) =>
      deleteProviderKey(tx, context.tenantId, id),
    )
    if (!removed) throw new NotFoundError('Provider key not found.')

    return reply.send(ok({ id, deleted: true }))
  })
}

export default aiBuilderRoutes
