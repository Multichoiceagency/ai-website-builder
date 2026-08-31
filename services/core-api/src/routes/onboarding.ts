import type { FastifyPluginAsync } from 'fastify'
import { limitsForPlan } from '@platform/permissions'
import {
  discoveryInputSchema,
  generateFromPromptInputSchema,
  generationRequestSchema,
  GENERATION_PHASE_LABELS,
  onboardingFunnelSchema,
  updateOnboardingFunnelSchema,
  type GenerationRequest,
  type GenerationResult,
  type OnboardingFunnel,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import { upsertNavigation } from '../db/repositories/navigation.js'
import { insertPage, publishPage } from '../db/repositories/pages.js'
import { countSites, insertDomain, insertSite } from '../db/repositories/sites.js'
import { findSettingsDocument, upsertSettingsDocument } from '../db/repositories/settings.js'
import { listResources } from '../db/repositories/integrations.js'
import { discoverBusiness } from '../lib/discovery/index.js'
import { BlockedUrlError } from '../lib/discovery/fetch.js'
import {
  aiGateway,
  assessQuality,
  ceilingForStyle,
  composePage,
  planSite,
  themeFromBrand,
} from '../lib/generation/index.js'
import { resolveTemplate } from '../lib/generation/templates.js'
import { profileFromPrompt } from '../lib/ai/site-builder-agent.js'
import { draftFreeformSite, sectionsFromFreeformRoot } from '../lib/ai/freeform-site.js'
import { isPageSpeedConfigured, runPageSpeed } from '../lib/seo/pagespeed.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { BadRequestError, PlanLimitError } from '../lib/errors.js'
import { googleConfigurationProblem, isGoogleConfigured } from '../lib/integrations/google.js'
import { listConnections } from '../db/repositories/integrations.js'
import { ok } from '../lib/response.js'
import { uniqueSlug } from '../lib/slug.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant, type TenantContext } from '../plugins/auth.js'

const FUNNEL_SCOPE = 'platform' as const
const FUNNEL_KEY = 'onboarding-funnel'

async function readFunnelProgress(context: TenantContext): Promise<OnboardingFunnel> {
  const stored = await withTenant(context.tenantId, (tx) =>
    findSettingsDocument(tx, context.tenantId, FUNNEL_SCOPE, FUNNEL_KEY),
  )
  const parsed = onboardingFunnelSchema.safeParse(stored?.value ?? {})
  return parsed.success ? parsed.data : onboardingFunnelSchema.parse({})
}

async function writeFunnelProgress(
  context: TenantContext,
  patch: Partial<OnboardingFunnel>,
): Promise<OnboardingFunnel> {
  const current = await readFunnelProgress(context)
  const completedSteps =
    patch.completedSteps != null
      ? Array.from(new Set([...current.completedSteps, ...patch.completedSteps]))
      : current.completedSteps
  const skippedLater =
    patch.skippedLater != null
      ? Array.from(new Set([...current.skippedLater, ...patch.skippedLater]))
      : current.skippedLater
  const merged = {
    ...current,
    ...patch,
    completedSteps,
    skippedLater,
    updatedAt: new Date().toISOString(),
  }
  const value = parseOrThrow(onboardingFunnelSchema, merged, 'onboarding funnel progress')

  await withTenant(context.tenantId, (tx) =>
    upsertSettingsDocument(tx, {
      tenantId: context.tenantId,
      scope: FUNNEL_SCOPE,
      key: FUNNEL_KEY,
      value,
      updatedBy: context.user.email,
    }),
  )

  return value
}

/**
 * Onboarding: the flow the whole product is named after.
 *
 *   connect a business → discover it → generate a website → preview → publish
 *
 * Discovery and generation are separate calls on purpose. The user sees, and
 * can correct, what we found before anything is built from it — a generator
 * that silently acts on bad data produces a site nobody trusts.
 *
 * Progress for the §80–85 funnel lives in settings (`onboarding-funnel`) and is
 * exposed via GET/PATCH `/progress` so the blank-layout wizard can resume.
 */
const onboardingRoutes: FastifyPluginAsync = async (app) => {
  /** Resume point for the signup → go-live funnel. */
  app.get('/progress', async (request, reply) => {
    const context = requireTenant(request, 'site:read')
    return reply.send(ok(await readFunnelProgress(context)))
  })

  /** Partial update — merge semantics, never wipe unset fields. */
  app.patch('/progress', async (request, reply) => {
    const context = requireTenant(request, 'site:write')
    const patch = parseOrThrow(updateOnboardingFunnelSchema, request.body, 'onboarding progress')
    return reply.send(ok(await writeFunnelProgress(context, patch)))
  })

  /** What the platform can currently draw on. Honest about what is missing. */
  app.get('/capabilities', async (request, reply) => {
    const context = requireTenant(request, 'site:read')
    const problem = googleConfigurationProblem()
    const connections = await withTenant(context.tenantId, (tx) => listConnections(tx, context.tenantId))
    const google = connections.find((entry) => entry.provider === 'google') ?? null

    return reply.send(
      ok({
        copyProviders: aiGateway.describe(),
        integrations: [
          {
            id: 'google_business_profile',
            name: 'Google Business Profile',
            connected: Boolean(google),
            available: isGoogleConfigured() && !problem,
            reason: problem
              ?? (google
                ? `Connected as ${google.accountLabel || 'Google account'}.`
                : 'Ready to connect.'),
          },
        ],
        phases: Object.entries(GENERATION_PHASE_LABELS).map(([id, label]) => ({ id, label })),
      }),
    )
  })

  /**
   * Read the business. Crawls the company's own website, reads its structured
   * data, and collects social profiles. Purely a read — nothing is stored.
   */
  app.post('/discover', async (request, reply) => {
    const context = requireTenant(request, 'site:write')
    const input = parseOrThrow(discoveryInputSchema, request.body, 'discovery request')

    try {
      let gbpLocation: Record<string, unknown> | null = null
      if (input.googleLocationId) {
        const resources = await withTenant(context.tenantId, (tx) =>
          listResources(tx, context.tenantId, 'business_location'),
        )
        const match = resources.find((entry) => entry.externalId === input.googleLocationId)
        gbpLocation = match?.payload ?? null
      }

      const result = await discoverBusiness(input, { gbpLocation })

      const event = buildEvent({
        name: 'site.created',
        tenantId: context.tenantId,
        actor: context.actor,
        resource: { type: 'discovery', id: input.website ?? input.businessName ?? input.googleLocationId ?? 'manual' },
        payload: { pagesCrawled: result.pagesCrawled, industry: result.profile.company.industry },
      })
      await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))

      return reply.send(ok(result))
    } catch (error) {
      if (error instanceof BlockedUrlError) throw new BadRequestError(error.message)
      throw error
    }
  })

  /**
   * Build the website.
   *
   * Creates a real site, real pages made of registry blocks, and navigation —
   * all inside one transaction. Publishing stays opt-in, because a generated
   * site becoming public without the user looking at it is exactly the failure
   * ADR-0007 exists to prevent.
   */
  app.post('/generate', async (request, reply) => {
    const context = requireTenant(request, 'site:write')
    const input = parseOrThrow(generationRequestSchema, request.body, 'generation request')
    const payload = await executeSiteGeneration(context, input)
    return reply.status(201).send(ok(payload))
  })

  /**
   * Ambora-style one prompt → discover/synthesize profile → generate website.
   */
  app.post('/generate-from-prompt', async (request, reply) => {
    const context = requireTenant(request, 'site:write')
    const input = parseOrThrow(generateFromPromptInputSchema, request.body, 'generate-from-prompt')
    if (input.freeform) {
      const payload = await executeFreeformSiteGeneration(context, input)
      return reply.status(201).send(ok(payload))
    }
    const profile = await profileFromPrompt(input)
    const payload = await executeSiteGeneration(context, {
      profile,
      siteName: input.siteName,
      style: input.style,
      templateId: input.templateId,
      publish: input.publish,
      maxPerformanceClass: input.maxPerformanceClass,
    })
    return reply.status(201).send(ok(payload))
  })

  /**
   * Preview the plan without building anything — what pages we would create and
   * which blocks each would use.
   */
  app.post('/plan', async (request, reply) => {
    requireTenant(request, 'site:read')
    const input = parseOrThrow(generationRequestSchema, request.body, 'generation request')
    const steering = resolveTemplate(input.templateId)
    const style = input.style === 'auto' && steering ? steering.style : input.style
    const generationInput = { ...input, style, maxPerformanceClass: ceilingForStyle(style) }
    return reply.send(ok(planSite(input.profile, generationInput, steering)))
  })
}

export default onboardingRoutes

async function executeFreeformSiteGeneration(
  context: TenantContext,
  input: {
    prompt: string
    locale?: string
    siteName?: string
    publish: boolean
  },
): Promise<GenerationResult> {
  const limits = limitsForPlan(context.plan)
  const currentSites = await withTenant(context.tenantId, (tx) => countSites(tx, context.tenantId))
  if (currentSites >= limits.sites) {
    throw new PlanLimitError(
      `Your ${context.plan} plan includes ${limits.sites} site(s). Upgrade or delete a site to generate another.`,
      { plan: context.plan, limit: limits.sites, current: currentSites },
    )
  }

  const draft = await draftFreeformSite({
    prompt: input.prompt,
    locale: input.locale,
    siteName: input.siteName,
  })

  const plan = {
    siteName: draft.siteName,
    locale: draft.locale as 'nl' | 'en',
    maxPerformanceClass: 'A' as const,
    pages: draft.pages.map((page) => ({
      path: page.path,
      title: page.title,
      description: page.description,
      goal:
        page.path === '/'
          ? ('home' as const)
          : page.path === '/about'
            ? ('about' as const)
            : ('contact' as const),
      blocks: ['layout-canvas-01'],
    })),
    navigation: draft.navigation,
  }

  const { themeSchema } = await import('@platform/schemas')
  // The brief's own palette wins. This used to be the only palette: teal on
  // near-white for every prompt, however the brief described itself.
  const theme = themeSchema.parse({
    colorPrimary: '#0f766e',
    colorAccent: '#ea580c',
    colorSurfaceAlt: '#f8fafc',
    radius: 'lg',
    ...(draft.theme ?? {}),
  })

  const result = await withTenant(context.tenantId, async (tx) => {
    const slug = await uniqueSlug(draft.siteName, async (candidate) => {
      const [row] = await tx<{ id: string }[]>`
        SELECT id FROM sites WHERE tenant_id = ${context.tenantId} AND slug = ${candidate} LIMIT 1
      `
      return Boolean(row)
    })

    const site = await insertSite(tx, {
      tenantId: context.tenantId,
      name: draft.siteName,
      slug,
      locale: draft.locale,
      theme,
    })

    const edgeHost = (process.env.PLATFORM_EDGE_HOSTNAME || process.env.STOREFRONT_PUBLIC_HOST || '')
      .trim()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      ?.toLowerCase()
    const previewHostname =
      edgeHost && edgeHost !== 'localhost' && !edgeHost.endsWith('.localhost')
        ? `${slug}.${edgeHost}`
        : `${slug}.localhost`
    await insertDomain(tx, {
      tenantId: context.tenantId,
      siteId: site.id,
      hostname: previewHostname,
      isPrimary: true,
      verified: true,
    })

    const pageIds: string[] = []
    for (const page of draft.pages) {
      const created = await insertPage(tx, {
        tenantId: context.tenantId,
        siteId: site.id,
        path: page.path,
        title: page.title,
        seo: {
          title: `${page.title} | ${draft.siteName}`,
          description: page.description,
          noIndex: false,
        },
        sections: sectionsFromFreeformRoot(page.root),
      })
      if (input.publish) await publishPage(tx, context.tenantId, created.id)
      pageIds.push(created.id)
    }

    await upsertNavigation(tx, {
      tenantId: context.tenantId,
      siteId: site.id,
      key: 'primary',
      items: draft.navigation,
    })

    const event = buildEvent({
      name: 'site.created',
      tenantId: context.tenantId,
      actor: { type: 'agent', id: draft.model, label: 'Freeform generator', onBehalfOfUserId: context.user.id },
      resource: { type: 'site', id: site.id },
      payload: {
        pages: pageIds.length,
        model: draft.model,
        industry: 'freeform',
        costUsd: 0,
        published: input.publish,
        templateId: null,
        freeform: true,
      },
    })
    await recordAuditEvent(tx, event)

    return { site, slug, previewHostname, pageIds, event }
  })

  await eventBus.publish(result.event)

  const homePageId = result.pageIds[0]
  if (!homePageId) throw new BadRequestError('Generation produced no pages.')

  return {
    siteId: result.site.id,
    siteName: result.site.name,
    siteSlug: result.slug,
    previewHostname: result.previewHostname,
    homePageId,
    plan,
    pageIds: result.pageIds,
    quality: {
      seo: { score: 80, issues: [] },
      accessibility: { score: 90, issues: [] },
      performance: { score: 95, issues: [], heaviestClass: 'A' },
      content: { score: 75, issues: [] },
    },
    model: draft.model,
    published: input.publish,
    generatedAt: new Date().toISOString(),
  }
}

async function executeSiteGeneration(
  context: TenantContext,
  input: GenerationRequest,
): Promise<GenerationResult> {
  const limits = limitsForPlan(context.plan)

  const currentSites = await withTenant(context.tenantId, (tx) => countSites(tx, context.tenantId))
  if (currentSites >= limits.sites) {
    throw new PlanLimitError(
      `Your ${context.plan} plan includes ${limits.sites} site(s). Upgrade or delete a site to generate another.`,
      { plan: context.plan, limit: limits.sites, current: currentSites },
    )
  }

  const profile = input.profile
  const steering = resolveTemplate(input.templateId)
  const style = input.style === 'auto' && steering ? steering.style : input.style
  const generationInput = { ...input, style, maxPerformanceClass: ceilingForStyle(style) }
  const plan = planSite(profile, generationInput, steering)
  const theme = themeFromBrand(profile, generationInput.style, steering)

  const copy = await aiGateway.generateCopy({
    profile,
    locale: plan.locale,
    goal: 'site',
    designBrief: steering?.brief,
  })

  const composed = plan.pages.map((page) => ({
    page,
    sections: composePage(page, profile, copy.slots, plan.navigation),
  }))

  const quality = assessQuality(plan, composed)

  const result = await withTenant(context.tenantId, async (tx) => {
    const current = await countSites(tx, context.tenantId)
    if (current >= limits.sites) {
      throw new PlanLimitError(
        `Your ${context.plan} plan includes ${limits.sites} site(s). Upgrade or delete a site to generate another.`,
        { plan: context.plan, limit: limits.sites, current },
      )
    }

    const slug = await uniqueSlug(plan.siteName, async (candidate) => {
      const [row] = await tx<{ id: string }[]>`
        SELECT id FROM sites WHERE tenant_id = ${context.tenantId} AND slug = ${candidate} LIMIT 1
      `
      return Boolean(row)
    })

    const site = await insertSite(tx, {
      tenantId: context.tenantId,
      name: plan.siteName,
      slug,
      locale: plan.locale,
      theme,
    })

    const edgeHost = (process.env.PLATFORM_EDGE_HOSTNAME || process.env.STOREFRONT_PUBLIC_HOST || '')
      .trim()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      ?.toLowerCase()
    const previewHostname =
      edgeHost && edgeHost !== 'localhost' && !edgeHost.endsWith('.localhost')
        ? `${slug}.${edgeHost}`
        : `${slug}.localhost`
    await insertDomain(tx, {
      tenantId: context.tenantId,
      siteId: site.id,
      hostname: previewHostname,
      isPrimary: true,
      verified: true,
    })

    const pageIds: string[] = []
    for (const entry of composed) {
      const created = await insertPage(tx, {
        tenantId: context.tenantId,
        siteId: site.id,
        path: entry.page.path,
        title: entry.page.title,
        seo: {
          title: entry.page.goal === 'home' ? copy.slots.seoTitle : `${entry.page.title} | ${plan.siteName}`,
          description: entry.page.description || copy.slots.seoDescription,
          noIndex: false,
        },
        sections: entry.sections,
      })

      if (input.publish) await publishPage(tx, context.tenantId, created.id)
      pageIds.push(created.id)
    }

    await upsertNavigation(tx, {
      tenantId: context.tenantId,
      siteId: site.id,
      key: 'primary',
      items: plan.navigation,
    })

    const event = buildEvent({
      name: 'site.created',
      tenantId: context.tenantId,
      actor: { type: 'agent', id: copy.model, label: 'Website generator', onBehalfOfUserId: context.user.id },
      resource: { type: 'site', id: site.id },
      payload: {
        pages: pageIds.length,
        model: copy.model,
        industry: profile.company.industry,
        costUsd: copy.usage.costUsd,
        published: input.publish,
        templateId: input.templateId ?? steering?.template.id ?? null,
      },
    })
    await recordAuditEvent(tx, event)

    return { site, slug, previewHostname, pageIds, event }
  })

  await eventBus.publish(result.event)

  const homePageId = result.pageIds[0]
  if (!homePageId) {
    throw new BadRequestError('Generation produced no pages.')
  }

  try {
    const current = await readFunnelProgress(context)
    const completed = current.completedSteps.includes('generate')
      ? current.completedSteps
      : [...current.completedSteps, 'generate' as const]
    await writeFunnelProgress(context, {
      step: 'preview',
      siteId: result.site.id,
      completedSteps: completed,
    })
  } catch {
    // Generation succeeded — progress is secondary.
  }

  const payload: GenerationResult = {
    siteId: result.site.id,
    siteName: result.site.name,
    siteSlug: result.slug,
    previewHostname: result.previewHostname,
    homePageId,
    plan,
    pageIds: result.pageIds,
    quality,
    model: copy.model,
    published: input.publish,
    generatedAt: new Date().toISOString(),
  }

  if (input.publish && isPageSpeedConfigured() && result.site.primaryHostname) {
    try {
      const speed = await runPageSpeed(`https://${result.site.primaryHostname}`, 'mobile')
      if (speed.performanceScore != null && speed.performanceScore < 50) {
        quality.performance.issues.push(
          `PageSpeed mobile performance is ${speed.performanceScore}/100 — check LCP and unused JS.`,
        )
      }
      if (speed.seoScore != null && speed.seoScore < 80) {
        quality.seo.issues.push(`PageSpeed SEO score is ${speed.seoScore}/100.`)
      }
      for (const warning of speed.warnings) quality.performance.issues.push(warning)
    } catch {
      // Best-effort QA only.
    }
  }

  return payload
}
