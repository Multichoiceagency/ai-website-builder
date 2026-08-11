import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AI_MODELS, generateComponentInputSchema, planAllowsModel, type AiModelAvailability } from '@platform/schemas'
import { assistWithMessage } from '../lib/ai/assist.js'
import { loadAdminRegistry } from '../lib/ai/admin-template-registry.js'
import { generateAdminTemplate } from '../lib/ai/generate-admin-template.js'
import { generateComponent } from '../lib/ai/generate-component.js'
import { generateLiveIsland } from '../lib/ai/generate-live-island.js'
import { generateMotionsitesComponent } from '../lib/ai/motionsites-codegen.js'
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
  /**
   * Inject block + Motionsites / studio template catalogue summaries so the
   * model can cite real ids. Default on for the interactive builder.
   */
  includeCatalogue: z.boolean().default(true),
  /** AI Freeform mode — no Motionsites / registry catalogue. */
  freeformMode: z.boolean().default(false),
})

const codegenBodySchema = z.object({
  /** Full Motionsites / UI brief — same envelope as section suggest. */
  brief: z.string().trim().min(20).max(16_000),
})

const generateLiveBodySchema = z.object({
  brief: z.string().trim().min(20).max(16_000),
  templateId: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  previewImage: z.string().trim().max(500).optional(),
  previewVideo: z.string().trim().max(500).optional(),
})

const adminTemplateBodySchema = z.object({
  slug: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(1).max(80),
  userPrompt: z.string().trim().min(20).max(16_000),
  /** Persist .tsx + system_registry.json (default true). */
  save: z.boolean().default(true),
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
    const context = requireTenant(request, 'ai:use')
    const input = parseOrThrow(assistBodySchema, request.body, 'assist request')

    try {
      const result = await assistWithMessage(input.message, {
        includeCatalogue: input.freeformMode ? false : input.includeCatalogue,
        freeformMode: input.freeformMode,
        tenantId: context.tenantId,
      })
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
      const raw = error instanceof Error ? error.message : 'The assistant could not answer.'
      // Never leak JSON.parse / Zod stacks to the chat UI.
      const message =
        /JSON|Unexpected token|is not valid JSON|SyntaxError|ZodError|invalid_type/i.test(raw)
          ? 'The assistant returned an unreadable reply. Please try again.'
          : raw
      throw new AppError(502, 'ai_failed', message)
    }
  })

  /**
   * Motionsites single-file React codegen (procedural engine + agent memory).
   * Returns source for island scaffolding — never writes CMS page props (ADR-0003).
   */
  app.post('/motionsites-codegen', async (request, reply) => {
    requireTenant(request, 'ai:use')
    const input = parseOrThrow(codegenBodySchema, request.body, 'codegen request')

    const result = await generateMotionsitesComponent(input.brief)
    if (!result.ok && result.errors.some((entry) => /No LLM provider/i.test(entry))) {
      throw new AppError(503, 'ai_unavailable', result.errors[0]!)
    }

    return reply.send(
      ok({
        ok: result.ok,
        model: result.model,
        packages: result.packages,
        code: result.code,
        errors: result.errors,
        memoryTokens: result.memoryTokens,
        note: 'Island-bound source only — do not store in page JSON (ADR-0003).',
      }),
    )
  })

  /**
   * Motionsites catalogue card → live island: codegen + write + Vite build +
   * copy to public. Returns sectionId for `motion-section-01` insert.
   */
  app.post('/motionsites-generate-live', async (request, reply) => {
    requireTenant(request, 'ai:use')
    const input = parseOrThrow(generateLiveBodySchema, request.body, 'generate-live request')

    const result = await generateLiveIsland({
      brief: input.brief,
      templateId: input.templateId,
      title: input.title,
      previewImage: input.previewImage,
      previewVideo: input.previewVideo,
    })

    if (!result.ok && result.errors.some((entry) => /No LLM provider|GEMINI|ANTHROPIC|not configured/i.test(entry))) {
      throw new AppError(503, 'ai_unavailable', result.errors[0] || 'AI codegen unavailable')
    }

    if (!result.ok) {
      throw new AppError(422, 'codegen_failed', result.errors.join('; ') || 'Could not generate a live island')
    }

    return reply.status(201).send(
      ok({
        sectionId: result.sectionId,
        islandReady: true,
        built: result.built,
        model: result.model,
        packages: result.packages,
        errors: result.errors,
        note: 'Insert motion-section-01 with this sectionId — never store React in page JSON.',
      }),
    )
  })

  /**
   * Full components generator: brief + optional reference image → Motionsites
   * island (or theme tokens), assigned to a system target (header, product card…).
   * Extends generate-live + workspace assets; pages still store block id + props
   * only (ADR-0003).
   */
  app.post('/generate-component', async (request, reply) => {
    const context = requireTenant(request, 'ai:use')
    const input = parseOrThrow(generateComponentInputSchema, request.body, 'generate-component request')

    // Large data-URLs need headroom beyond the default 2 MiB envelope when used
    // with a long brief — reject early with a clear message.
    if (input.referenceImage && input.referenceImage.length > 1_500_000) {
      throw new AppError(
        413,
        'reference_too_large',
        'Reference image is too large. Upload it to Media first and pass the public URL instead of a data-URL.',
      )
    }

    const result = await generateComponent({
      tenantId: context.tenantId,
      userEmail: context.user.email,
      siteId: input.siteId,
      brief: input.brief,
      target: input.target,
      title: input.title,
      referenceImage: input.referenceImage,
      pageId: input.pageId,
      saveAsset: input.saveAsset,
      assign: input.assign,
    })

    if (!result.ok && result.errors.some((entry) => /No LLM provider|GEMINI|ANTHROPIC|not configured|Site not found/i.test(entry))) {
      const status = result.errors.some((entry) => /Site not found/i.test(entry)) ? 404 : 503
      throw new AppError(status, status === 404 ? 'not_found' : 'ai_unavailable', result.errors[0] || 'AI unavailable')
    }

    if (!result.ok) {
      throw new AppError(422, 'generate_component_failed', result.errors.join('; ') || 'Could not generate component')
    }

    return reply.status(201).send(ok(result))
  })

  /**
   * Admin template pipeline (Python `genereer_admin_template` port):
   * MASTER_SYSTEM_PROMPT → strip DEPENDENCIES → write .tsx → upsert registry.
   */
  app.post('/admin-templates/generate', async (request, reply) => {
    requireTenant(request, 'ai:use')
    const input = parseOrThrow(adminTemplateBodySchema, request.body, 'admin template request')

    const result = await generateAdminTemplate({
      slug: input.slug,
      name: input.name,
      category: input.category,
      userPrompt: input.userPrompt,
      save: input.save,
    })

    if (!result.ok && result.errors.some((entry) => /No LLM provider/i.test(entry))) {
      throw new AppError(503, 'ai_unavailable', result.errors[0]!)
    }

    return reply.status(result.ok && result.meta ? 201 : 200).send(
      ok({
        ok: result.ok,
        model: result.model,
        packages: result.packages,
        code: result.code,
        errors: result.errors,
        memoryTokens: result.memoryTokens,
        meta: result.meta ?? null,
        filePath: result.filePath ?? null,
        note: 'Registered under packages/motionsites-islands/templates — not CMS page content (ADR-0003).',
      }),
    )
  })

  app.get('/admin-templates', async (request, reply) => {
    requireTenant(request, 'ai:use')
    const registry = await loadAdminRegistry()
    return reply.send(ok({ templates: registry, total: registry.length }))
  })
}

export default aiRoutes
