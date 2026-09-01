import type { FastifyPluginAsync } from 'fastify'
import { stockImportInputSchema, stockSearchQuerySchema } from '@platform/schemas'
import { resolveStockProvider } from '../adapters/stock/index.js'
import { BadRequestError } from '../lib/errors.js'
import { importStockAsset } from '../lib/media/import.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * Stock media proxy — search + import into the tenant library.
 *
 * The browser never talks to Mixkit directly (CORS + SSRF surface). Downloads
 * are allowlisted inside the vendor adapter (ADR-0006).
 */

const IMPORT_ROUTE = { bodyLimit: 1024 * 1024 } as const

const stockRoutes: FastifyPluginAsync = async (app) => {
  app.get('/search', async (request, reply) => {
    requireTenant(request, 'media:read')
    const query = parseOrThrow(stockSearchQuerySchema, request.query ?? {}, 'query')
    const provider = resolveStockProvider(query)

    if (!provider.supports(query.kind)) {
      throw new BadRequestError(`${provider.label} does not support ${query.kind} search.`)
    }

    try {
      const result = await provider.search(query)
      return reply.send(ok(result))
    } catch (error) {
      request.log.warn({ err: error, provider: provider.id }, 'stock search failed')
      throw new BadRequestError(
        error instanceof Error ? error.message : `Could not search ${provider.label}.`,
      )
    }
  })

  app.post('/import', IMPORT_ROUTE, async (request, reply) => {
    const context = requireTenant(request, 'media:write')
    const input = parseOrThrow(stockImportInputSchema, request.body ?? {}, 'import')

    const asset = await importStockAsset({
      tenantId: context.tenantId,
      createdBy: context.user.email,
      provider: input.provider,
      externalId: input.externalId,
      kind: input.kind,
      downloadUrl: input.downloadUrl,
      title: input.title,
      alt: input.alt,
      tags: input.tags,
      folder: input.folder,
    })

    return reply.status(201).send(ok({ asset, provider: input.provider, externalId: input.externalId }))
  })
}

export default stockRoutes
