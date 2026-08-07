import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AI_MODELS, planAllowsModel, type AiModelAvailability } from '@platform/schemas'
import { assistWithMessage } from '../lib/ai/assist.js'
import { aiGateway } from '../lib/generation/index.js'
import { AppError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * The model picker's data source (§9, §68) and the assistant's free-text door.
 *
 * A model is offered only when the tenant's plan allows it *and* the provider
 * is configured here. The two reasons are reported separately, because
 * "upgrade to use this" and "this installation has no key" are very different
 * messages to show a customer.
 *
 * Free-text assist never writes. It answers questions; mutations stay on the
 * tool registry with confirmations (ADR-0007).
 */
const assistBodySchema = z.object({
  message: z.string().trim().min(2).max(1_000),
})

const aiRoutes: FastifyPluginAsync = async (app) => {
  app.get('/models', async (request, reply) => {
    const context = requireTenant(request, 'ai:use')
    const configured = new Set(aiGateway.available().map((provider) => provider.id))

    const models: AiModelAvailability[] = AI_MODELS.map((model) => {
      const allowedByPlan = planAllowsModel(context.plan, model)
      const providerReady = model.provider === 'platform' || configured.has(model.provider)

      return {
        ...model,
        available: allowedByPlan && providerReady,
        requiresUpgrade: !allowedByPlan,
        unavailableReason:
          allowedByPlan && !providerReady
            ? `No ${model.provider} API key is configured on this environment.`
            : undefined,
      }
    })

    return reply.send(ok({ models, plan: context.plan }))
  })

  app.post('/assist', async (request, reply) => {
    requireTenant(request, 'ai:use')
    const input = parseOrThrow(assistBodySchema, request.body, 'assist request')

    try {
      const result = await assistWithMessage(input.message)
      if (!result) {
        throw new AppError(
          503,
          'ai_unavailable',
          'No language model is configured on this environment. Use the actions below, or add a Gemini or Anthropic key.',
        )
      }
      return reply.send(ok(result))
    } catch (error) {
      if (error instanceof AppError) throw error
      const message = error instanceof Error ? error.message : 'The assistant could not answer.'
      throw new AppError(502, 'ai_failed', message)
    }
  })
}

export default aiRoutes
