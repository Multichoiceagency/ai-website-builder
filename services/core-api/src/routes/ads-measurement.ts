import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  adsProviderIdSchema,
  metricsQuerySchema,
  updateGuardrailsInputSchema,
  upsertConversionMappingInputSchema,
  uuidSchema,
} from '@platform/schemas'
import { getAdsProvider, listAdsProviders } from '../adapters/ads/index.js'
import { withTenant } from '../db/client.js'
import {
  deleteConversionMapping,
  getGuardrails,
  listConversionMappings,
  recordAdsAudit,
  updateGuardrails,
  upsertConversionMapping,
} from '../db/repositories/ads.js'
import { providerContext } from '../lib/ads/provider-context.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * Measurement: what the campaigns did, what counts as a conversion, and how
 * much they are allowed to spend.
 */

const adsMeasurementRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Measured performance. Never estimated, never modelled, never back-filled.
   *
   * An unconnected provider returns an empty series with zeroed totals and null
   * ratios, next to the status explaining why — so the UI can say "we cannot
   * see this yet" instead of drawing a flat line at zero.
   */
  app.get('/metrics', async (request, reply) => {
    const context = requireTenant(request, 'analytics:read')
    const query = parseOrThrow(metricsQuerySchema, request.query ?? {}, 'metrics query')

    if (query.from > query.to) {
      throw new ConflictError('The start of the range is after its end.')
    }

    const result = await withTenant(context.tenantId, async (tx) => {
      const providers = query.provider ? [getAdsProvider(query.provider)] : listAdsProviders()

      const series = []
      for (const adapter of providers) {
        const providerCtx = await providerContext(tx, context.tenantId, adapter.id, { withSecrets: true })
        series.push({
          providerStatus: adapter.status(providerCtx),
          series: await adapter.getMetrics(providerCtx, query),
        })
      }
      return series
    })

    return reply.send(ok(result))
  })

  /** Which of our tracking events becomes which conversion action, per network. */
  app.get('/conversions', async (request, reply) => {
    const context = requireTenant(request, 'ads:read')
    const { provider } = parseOrThrow(
      z.object({ provider: adsProviderIdSchema.optional() }),
      request.query ?? {},
      'query',
    )

    const mappings = await withTenant(context.tenantId, (tx) =>
      listConversionMappings(tx, context.tenantId, provider),
    )

    return reply.send(ok(mappings))
  })

  app.put('/conversions', async (request, reply) => {
    const context = requireTenant(request, 'ads:write')
    const input = parseOrThrow(upsertConversionMappingInputSchema, request.body, 'conversion mapping')

    const mapping = await withTenant(context.tenantId, async (tx) => {
      const saved = await upsertConversionMapping(tx, context.tenantId, input)
      await recordAdsAudit(tx, {
        tenantId: context.tenantId,
        name: 'ads.conversion_mapping_changed',
        actor: context.actor,
        resourceId: saved.id,
        payload: { provider: input.provider, trackingEvent: input.trackingEvent, enabled: input.enabled },
      })
      return saved
    })

    return reply.send(ok(mapping))
  })

  app.delete('/conversions/:mappingId', async (request, reply) => {
    const context = requireTenant(request, 'ads:write')
    const { mappingId } = parseOrThrow(z.object({ mappingId: uuidSchema }), request.params, 'mapping id')

    const deleted = await withTenant(context.tenantId, (tx) =>
      deleteConversionMapping(tx, context.tenantId, mappingId),
    )
    if (!deleted) throw new NotFoundError('Conversion mapping')

    return reply.send(ok({ deleted: true }))
  })

  app.get('/guardrails', async (request, reply) => {
    const context = requireTenant(request, 'ads:read')
    const guardrails = await withTenant(context.tenantId, (tx) => getGuardrails(tx, context.tenantId))
    return reply.send(ok(guardrails))
  })

  /**
   * Raising the ceiling is itself audited. The guardrail is only meaningful if
   * moving it leaves a trace — otherwise the first step of any overspend is
   * simply to widen the limit.
   */
  app.put('/guardrails', async (request, reply) => {
    const context = requireTenant(request, 'ads:write')
    const patch = parseOrThrow(updateGuardrailsInputSchema, request.body, 'guardrails')

    const guardrails = await withTenant(context.tenantId, async (tx) => {
      const before = await getGuardrails(tx, context.tenantId)
      const after = await updateGuardrails(tx, context.tenantId, patch)
      await recordAdsAudit(tx, {
        tenantId: context.tenantId,
        name: 'ads.guardrails_changed',
        actor: context.actor,
        payload: { before, after },
      })
      return after
    })

    return reply.send(ok(guardrails))
  })
}

export default adsMeasurementRoutes
