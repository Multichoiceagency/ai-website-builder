import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { planAtLeast } from '@platform/permissions'
import {
  createAppApiKeyInputSchema,
  createAppInputSchema,
  createAppVersionInputSchema,
  createAppWebhookSubscriptionInputSchema,
  DEFAULT_APP_REQUEST_QUOTA_PER_HOUR,
  installAppInputSchema,
  reviewAppInputSchema,
  submitAppInputSchema,
  updateAppInputSchema,
  uuidSchema,
  type AppManifest,
  type Permission,
} from '@platform/schemas'
import { withTenant, withoutTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import { listPages } from '../db/repositories/pages.js'
import { listSites } from '../db/repositories/sites.js'
import {
  appInstallCount,
  appUsageTotals,
  applyManifestToApp,
  findActiveInstallation,
  findAppById,
  findAppBySlug,
  findInstallationById,
  findMarketplaceApp,
  insertApiKey,
  insertApp,
  insertAppVersion,
  insertInstallation,
  listApiKeys,
  listApps,
  listAppVersions,
  listGatewayLog,
  listInstallations,
  listMarketplaceApps,
  listUsageWindows,
  reviewLatestVersion,
  revokeApiKey,
  setAppStatus,
  uninstallApp,
  updateApp,
  updateInstallationSettings,
} from '../db/repositories/apps.js'
import {
  deactivateSubscriptionsForInstallation,
  deleteSubscription,
  findDeliveryById,
  findSubscriptionById,
  insertSubscription,
  listDeliveries,
  listSubscriptions,
  requeueDelivery,
} from '../db/repositories/app-webhooks.js'
import { withAppRequest } from '../lib/apps/gateway.js'
import { generateAppApiKey, generateWebhookSecret } from '../lib/apps/keys.js'
import { parseManifest, reviewManifest } from '../lib/apps/manifest.js'
import { flushDeliveries, registerWebhookFanout } from '../lib/apps/webhooks.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, PlanLimitError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant, requireUser } from '../plugins/auth.js'

/**
 * App platform routes (§33–§38, §72, §89).
 *
 * Three audiences, three trust levels, deliberately separated:
 *
 *   `/marketplace`, `/installations`, `/webhooks` — a signed-in user acting in
 *       their own workspace, guarded by `requireTenant`
 *   `/developer/...`                              — a developer managing apps
 *       they own, guarded by `requireTenant` plus `developer:*`
 *   `/gateway/...`                                — an *app*, holding no
 *       session at all, guarded by `withAppRequest`
 *
 * The third one is the interesting one. It never calls `requireTenant`, never
 * receives a `Tx`, and cannot reach anything the installation did not grant.
 */

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by the parser below. Required to verify an inbound HMAC. */
    rawBody?: string
  }
}

const appParamsSchema = z.object({ appId: uuidSchema })
const installationParamsSchema = z.object({ installationId: uuidSchema })
const subscriptionParamsSchema = z.object({ subscriptionId: uuidSchema })
const deliveryParamsSchema = z.object({ deliveryId: uuidSchema })

/**
 * Everything the marketplace record needs in order to become an installation.
 * Kept as one shape so the public and private install paths cannot drift.
 */
interface InstallTarget {
  appId: string
  slug: string
  name: string
  category: string
  type: string
  requestedPermissions: string[]
}

const appsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Retain the raw body.
   *
   * Fastify hands routes a parsed object, but an HMAC is computed over bytes —
   * re-serialising a parsed body produces a different string and a signature
   * that never matches. Scoped to this plugin, so no other domain pays for it.
   */
  app.addContentTypeParser<string>('application/json', { parseAs: 'string' }, (request, body, done) => {
    request.rawBody = body
    if (!body) return done(null, undefined)
    try {
      done(null, JSON.parse(body) as unknown)
    } catch {
      done(new BadRequestError('Request body is not valid JSON.'), undefined)
    }
  })

  registerWebhookFanout(eventBus, (error) => app.log.error({ error }, 'webhook fanout failed'))

  // region Marketplace (§33)

  app.get('/marketplace', async (request, reply) => {
    requireTenant(request, 'app:read')
    const { category, search } = parseOrThrow(
      z.object({ category: z.string().max(40).optional(), search: z.string().max(120).optional() }),
      request.query ?? {},
      'query',
    )

    // Reads the marketplace projection, which crosses tenants by design and is
    // therefore a named SECURITY DEFINER function rather than a policy hole.
    const apps = await withoutTenant((tx) => listMarketplaceApps(tx))

    const term = search?.trim().toLowerCase()
    const filtered = apps.filter((entry) => {
      if (category && entry.category !== category) return false
      if (!term) return true
      return `${entry.name} ${entry.tagline} ${entry.description}`.toLowerCase().includes(term)
    })

    return reply.send(ok(filtered))
  })

  /** Detail. Returns the permission list the install dialog must show first. */
  app.get('/marketplace/:slug', async (request, reply) => {
    requireTenant(request, 'app:read')
    const { slug } = parseOrThrow(z.object({ slug: z.string().max(64) }), request.params, 'slug')

    const entry = await withoutTenant((tx) => findMarketplaceApp(tx, slug))
    if (!entry) throw new NotFoundError('App')

    return reply.send(ok(entry))
  })

  // endregion

  // region Installations (§34)

  app.get('/installations', async (request, reply) => {
    const context = requireTenant(request, 'app:read')
    const installations = await withTenant(context.tenantId, (tx) => listInstallations(tx, context.tenantId))
    return reply.send(ok(installations))
  })

  /**
   * Install.
   *
   * The grant is an intersection, computed here and written once:
   *
   *     what the app asked for
   *   ∩ what the installer themself holds
   *   ∩ what the installer explicitly ticked (if they narrowed it)
   *
   * The middle term is the one that matters: an app can never end up with a
   * permission the person installing it did not have. A marketer installing a
   * billing app does not thereby create a billing-capable credential.
   */
  app.post('/installations', async (request, reply) => {
    const context = requireTenant(request, 'app:install')
    const input = parseOrThrow(installAppInputSchema, request.body, 'installation')

    const target = await resolveInstallTarget(context.tenantId, input.slug)
    if (!target) throw new NotFoundError('App')

    // Private apps are an Advanced-and-above capability (§34).
    if (target.type === 'private' && !planAtLeast(context.plan, 'advanced')) {
      throw new PlanLimitError('Private apps are available on Advanced and above.')
    }

    const held = new Set<Permission>(context.permissions)
    const narrowed = input.permissions ? new Set<string>(input.permissions) : null

    const granted = target.requestedPermissions
      .filter((requested): requested is Permission => held.has(requested as Permission))
      .filter((requested) => !narrowed || narrowed.has(requested))

    const withheld = target.requestedPermissions.filter((requested) => !granted.includes(requested as Permission))

    const installation = await withTenant(context.tenantId, async (tx) => {
      const existing = await findActiveInstallation(tx, context.tenantId, target.appId)
      if (existing) throw new ConflictError('This app is already installed.')

      return insertInstallation(tx, {
        tenantId: context.tenantId,
        appId: target.appId,
        appSlug: target.slug,
        appName: target.name,
        category: target.category,
        grantedPermissions: granted,
        settings: input.settings,
        quotaPerHour: DEFAULT_APP_REQUEST_QUOTA_PER_HOUR,
        installedBy: context.user.email,
      })
    })

    const event = buildEvent({
      name: 'app.installed',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'app', id: target.appId },
      payload: { slug: target.slug, grantedPermissions: granted, withheldPermissions: withheld },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.status(201).send(ok({ installation, withheldPermissions: withheld }))
  })

  app.delete('/installations/:installationId', async (request, reply) => {
    const context = requireTenant(request, 'app:install')
    const { installationId } = parseOrThrow(installationParamsSchema, request.params, 'installation id')

    const installation = await withTenant(context.tenantId, async (tx) => {
      // Silence delivery first: an uninstalled app must stop receiving events
      // even if the uninstall itself is the last thing that happens.
      await deactivateSubscriptionsForInstallation(tx, context.tenantId, installationId)
      return uninstallApp(tx, context.tenantId, installationId)
    })
    if (!installation) throw new NotFoundError('Installation')

    const event = buildEvent({
      name: 'app.uninstalled',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'app', id: installation.appId },
      payload: { slug: installation.appSlug },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok({ uninstalled: true }))
  })

  // endregion

  // region Developer portal (§36)

  app.get('/developer/apps', async (request, reply) => {
    const context = requireTenant(request, 'developer:read')
    const apps = await withTenant(context.tenantId, (tx) => listApps(tx, context.tenantId))
    return reply.send(ok(apps))
  })

  app.post('/developer/apps', async (request, reply) => {
    const context = requireTenant(request, 'developer:write')
    const input = parseOrThrow(createAppInputSchema, request.body, 'app')

    if (input.type === 'private' && !planAtLeast(context.plan, 'advanced')) {
      throw new PlanLimitError('Private apps are available on Advanced and above.')
    }

    const created = await withTenant(context.tenantId, async (tx) => {
      const existing = await findAppBySlug(tx, context.tenantId, input.slug)
      if (existing) throw new ConflictError('An app with that identifier already exists.')

      return insertApp(tx, {
        tenantId: context.tenantId,
        slug: input.slug,
        name: input.name,
        tagline: input.tagline,
        description: input.description,
        category: input.category,
        type: input.type,
        ...(input.iconUrl ? { iconUrl: input.iconUrl } : {}),
        ...(input.homepageUrl ? { homepageUrl: input.homepageUrl } : {}),
        ...(input.supportEmail ? { supportEmail: input.supportEmail } : {}),
      })
    })

    return reply.status(201).send(ok(created))
  })

  app.get('/developer/apps/:appId', async (request, reply) => {
    const context = requireTenant(request, 'developer:read')
    const { appId } = parseOrThrow(appParamsSchema, request.params, 'app id')

    const data = await withTenant(context.tenantId, async (tx) => {
      const record = await findAppById(tx, context.tenantId, appId)
      if (!record) return null

      return {
        app: record,
        versions: await listAppVersions(tx, context.tenantId, appId),
        keys: await listApiKeys(tx, context.tenantId, appId),
        installs: await appInstallCount(tx, appId, context.tenantId),
      }
    })
    if (!data) throw new NotFoundError('App')

    return reply.send(ok(data))
  })

  app.patch('/developer/apps/:appId', async (request, reply) => {
    const context = requireTenant(request, 'developer:write')
    const { appId } = parseOrThrow(appParamsSchema, request.params, 'app id')
    const patch = parseOrThrow(updateAppInputSchema, request.body, 'app')

    const updated = await withTenant(context.tenantId, (tx) => updateApp(tx, context.tenantId, appId, patch))
    if (!updated) throw new NotFoundError('App')

    return reply.send(ok(updated))
  })

  /** A draft version. Reviewed on the way in, so a developer sees problems early. */
  app.post('/developer/apps/:appId/versions', async (request, reply) => {
    const context = requireTenant(request, 'developer:write')
    const { appId } = parseOrThrow(appParamsSchema, request.params, 'app id')
    const input = parseOrThrow(createAppVersionInputSchema, request.body, 'version')

    const manifest = parseManifest(input.manifest)
    const review = reviewManifest(manifest)

    const version = await withTenant(context.tenantId, async (tx) => {
      const record = await findAppById(tx, context.tenantId, appId)
      if (!record) throw new NotFoundError('App')

      return insertAppVersion(tx, {
        tenantId: context.tenantId,
        appId,
        manifest,
        status: 'draft',
        flags: review.flags,
        notes: '',
      })
    })

    return reply.status(201).send(ok({ version, review }))
  })

  /**
   * The submission pipeline (§37): manifest validation → permission review →
   * status transition.
   *
   * A blocking flag — a wildcard request, an unknown permission, an http
   * extension — refuses the submission here, mechanically, before a human is
   * ever asked to think about it.
   */
  app.post('/developer/apps/:appId/submit', async (request, reply) => {
    const context = requireTenant(request, 'developer:write')
    const { appId } = parseOrThrow(appParamsSchema, request.params, 'app id')
    const input = parseOrThrow(
      submitAppInputSchema.extend({ manifest: z.unknown() }),
      request.body,
      'submission',
    )

    const manifest: AppManifest = parseManifest(input.manifest)
    const review = reviewManifest(manifest)

    if (!review.ok) {
      throw new BadRequestError('This app cannot be submitted for review.', {
        flags: review.flags.filter((flag) => flag.severity === 'blocking'),
      })
    }

    const result = await withTenant(context.tenantId, async (tx) => {
      const record = await findAppById(tx, context.tenantId, appId)
      if (!record) throw new NotFoundError('App')
      if (record.status === 'submitted' || record.status === 'in_review') {
        throw new ConflictError('This app is already under review.')
      }
      if (record.slug !== manifest.id) {
        throw new BadRequestError('The manifest id must match the app identifier.')
      }

      await insertAppVersion(tx, {
        tenantId: context.tenantId,
        appId,
        manifest,
        status: 'submitted',
        flags: review.flags,
        notes: input.notes,
      })

      return applyManifestToApp(tx, context.tenantId, appId, {
        manifest,
        status: 'submitted',
        flags: review.flags,
        notes: input.notes,
        submitted: true,
      })
    })

    return reply.send(ok({ app: result, review }))
  })

  /**
   * Review decision. Deliberately *not* a developer capability.
   *
   * Approving an app is a platform act, so this is guarded by platform-admin
   * membership — the same gate as the staff console — and the developer's
   * workspace is named explicitly in `x-tenant-id`, because staff hold no
   * membership in it.
   */
  app.post('/developer/apps/:appId/review', async (request, reply) => {
    await requirePlatformAdmin(request)
    const { appId } = parseOrThrow(appParamsSchema, request.params, 'app id')
    const input = parseOrThrow(reviewAppInputSchema, request.body, 'review')

    const tenantId = parseOrThrow(
      uuidSchema,
      (request.headers['x-tenant-id'] as string | undefined) ?? '',
      'developer workspace',
    )

    const updated = await withTenant(tenantId, async (tx) => {
      const record = await findAppById(tx, tenantId, appId)
      if (!record) throw new NotFoundError('App')

      if (!canTransition(record.status, input.decision)) {
        throw new ConflictError(`An app in \`${record.status}\` cannot move to \`${input.decision}\`.`)
      }
      if (input.decision === 'approved' && record.reviewFlags.some((flag) => flag.severity === 'blocking')) {
        throw new ConflictError('This app still carries blocking review flags.')
      }

      await reviewLatestVersion(tx, tenantId, appId, input.decision, input.notes)
      return setAppStatus(tx, tenantId, appId, input.decision, input.notes)
    })

    return reply.send(ok(updated))
  })

  app.get('/developer/apps/:appId/keys', async (request, reply) => {
    const context = requireTenant(request, 'developer:read')
    const { appId } = parseOrThrow(appParamsSchema, request.params, 'app id')

    const keys = await withTenant(context.tenantId, (tx) => listApiKeys(tx, context.tenantId, appId))
    return reply.send(ok(keys))
  })

  /** The one response that ever contains a credential. There is no second one. */
  app.post('/developer/apps/:appId/keys', async (request, reply) => {
    const context = requireTenant(request, 'developer:write')
    const { appId } = parseOrThrow(appParamsSchema, request.params, 'app id')
    const input = parseOrThrow(createAppApiKeyInputSchema, request.body, 'api key')

    const generated = generateAppApiKey()
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const record = await withTenant(context.tenantId, async (tx) => {
      const found = await findAppById(tx, context.tenantId, appId)
      if (!found) throw new NotFoundError('App')

      return insertApiKey(tx, {
        tenantId: context.tenantId,
        appId,
        name: input.name,
        keyHash: generated.keyHash,
        keyPrefix: generated.keyPrefix,
        lastFour: generated.lastFour,
        signingSecret: generated.signingSecret,
        scopes: input.scopes,
        expiresAt,
      })
    })

    return reply
      .status(201)
      .send(ok({ ...record, key: generated.key, signingSecret: generated.signingSecret }))
  })

  app.delete('/developer/apps/:appId/keys/:keyId', async (request, reply) => {
    const context = requireTenant(request, 'developer:write')
    const { appId } = parseOrThrow(appParamsSchema, request.params, 'app id')
    const { keyId } = parseOrThrow(z.object({ keyId: uuidSchema }), request.params, 'key id')

    const revoked = await withTenant(context.tenantId, (tx) => revokeApiKey(tx, context.tenantId, appId, keyId))
    if (!revoked) throw new NotFoundError('API key')

    return reply.send(ok({ revoked: true }))
  })

  /**
   * Gateway log for this workspace. An app's calls into *other* workspaces are
   * not the developer's to read — those show up as counts under `/usage`.
   */
  app.get('/developer/apps/:appId/logs', async (request, reply) => {
    const context = requireTenant(request, 'developer:read')
    const { appId } = parseOrThrow(appParamsSchema, request.params, 'app id')
    const { limit } = parseOrThrow(
      z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }),
      request.query ?? {},
      'query',
    )

    const entries = await withTenant(context.tenantId, (tx) =>
      listGatewayLog(tx, context.tenantId, { appId, limit }),
    )
    return reply.send(ok(entries))
  })

  app.get('/developer/apps/:appId/usage', async (request, reply) => {
    const context = requireTenant(request, 'developer:read')
    const { appId } = parseOrThrow(appParamsSchema, request.params, 'app id')

    const usage = await withTenant(context.tenantId, async (tx) => {
      const found = await findAppById(tx, context.tenantId, appId)
      if (!found) return null

      return {
        windows: (await listUsageWindows(tx, context.tenantId, appId, 24)).map((window) => ({
          windowStart: window.windowStart.toISOString(),
          requests: window.requests,
          denied: window.denied,
        })),
        totals: await appUsageTotals(tx, appId, context.tenantId),
        installs: await appInstallCount(tx, appId, context.tenantId),
      }
    })
    if (!usage) throw new NotFoundError('App')

    return reply.send(ok(usage))
  })

  // endregion

  // region Webhooks (§89)

  app.get('/webhooks', async (request, reply) => {
    const context = requireTenant(request, 'app:read')
    const { installationId } = parseOrThrow(
      z.object({ installationId: uuidSchema.optional() }),
      request.query ?? {},
      'query',
    )

    const subscriptions = await withTenant(context.tenantId, (tx) =>
      listSubscriptions(tx, context.tenantId, installationId ? { installationId } : {}),
    )
    return reply.send(ok(subscriptions))
  })

  /** Creates the signing secret and shows it once. */
  app.post('/webhooks', async (request, reply) => {
    const context = requireTenant(request, 'app:install')
    const input = parseOrThrow(createAppWebhookSubscriptionInputSchema, request.body, 'subscription')

    const secret = generateWebhookSecret()

    const subscription = await withTenant(context.tenantId, async (tx) => {
      const installation = await findInstallationById(tx, context.tenantId, input.installationId)
      if (!installation || installation.uninstalledAt) throw new NotFoundError('Installation')

      return insertSubscription(tx, {
        tenantId: context.tenantId,
        appId: installation.appId,
        appSlug: installation.appSlug,
        installationId: installation.id,
        event: input.event,
        targetUrl: input.targetUrl,
        secret,
      })
    })

    return reply.status(201).send(ok({ ...subscription, secret }))
  })

  app.delete('/webhooks/:subscriptionId', async (request, reply) => {
    const context = requireTenant(request, 'app:install')
    const { subscriptionId } = parseOrThrow(subscriptionParamsSchema, request.params, 'subscription id')

    const deleted = await withTenant(context.tenantId, (tx) =>
      deleteSubscription(tx, context.tenantId, subscriptionId),
    )
    if (!deleted) throw new NotFoundError('Subscription')

    return reply.send(ok({ deleted: true }))
  })

  app.get('/webhooks/:subscriptionId/deliveries', async (request, reply) => {
    const context = requireTenant(request, 'app:read')
    const { subscriptionId } = parseOrThrow(subscriptionParamsSchema, request.params, 'subscription id')
    const { limit } = parseOrThrow(
      z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }),
      request.query ?? {},
      'query',
    )

    const deliveries = await withTenant(context.tenantId, async (tx) => {
      const subscription = await findSubscriptionById(tx, context.tenantId, subscriptionId)
      if (!subscription) return null
      return listDeliveries(tx, context.tenantId, subscriptionId, limit)
    })
    if (!deliveries) throw new NotFoundError('Subscription')

    return reply.send(ok(deliveries))
  })

  /** Replay. Resets the attempt budget rather than fabricating a new event. */
  app.post('/webhooks/deliveries/:deliveryId/replay', async (request, reply) => {
    const context = requireTenant(request, 'app:install')
    const { deliveryId } = parseOrThrow(deliveryParamsSchema, request.params, 'delivery id')

    const delivery = await withTenant(context.tenantId, async (tx) => {
      const found = await findDeliveryById(tx, context.tenantId, deliveryId)
      if (!found) return null
      await requeueDelivery(tx, context.tenantId, deliveryId)
      return findDeliveryById(tx, context.tenantId, deliveryId)
    })
    if (!delivery) throw new NotFoundError('Delivery')

    void flushDeliveries(context.tenantId).catch((error: unknown) =>
      app.log.error({ error }, 'webhook replay failed'),
    )

    return reply.send(ok(delivery))
  })

  /** Drain the retry queue on demand, for operations and for local development. */
  app.post('/webhooks/flush', async (request, reply) => {
    const context = requireTenant(request, 'app:install')
    const result = await flushDeliveries(context.tenantId)
    return reply.send(ok(result))
  })

  // endregion

  // region The gateway (§35)

  /**
   * Who am I, and what am I allowed to do?
   *
   * Requires only a valid key and a live installation, so an app can discover
   * its own scopes without guessing at endpoints it will be refused.
   */
  app.get('/gateway/me', async (request, reply) => {
    const data = await withAppRequest(request, null, async (_tx, context) => ({
      app: { id: context.appId, slug: context.appSlug },
      tenantId: context.tenantId,
      installationId: context.installationId,
      scopes: context.scopes,
      quotaPerHour: context.quotaPerHour,
    }))

    return reply.send(ok(data))
  })

  app.get('/gateway/sites', async (request, reply) => {
    const sites = await withAppRequest(request, 'site:read', (tx, context) => listSites(tx, context.tenantId))
    return reply.send(ok(sites))
  })

  app.get('/gateway/pages', async (request, reply) => {
    // Parsed inside, so an unauthenticated caller gets 401 rather than a hint
    // about which query parameters the endpoint takes.
    const pages = await withAppRequest(request, 'page:read', (tx, context) => {
      const { siteId } = parseOrThrow(z.object({ siteId: uuidSchema }), request.query ?? {}, 'query')
      return listPages(tx, context.tenantId, siteId)
    })
    return reply.send(ok(pages))
  })

  /**
   * The one write an app can make about itself: its own installation settings.
   *
   * Mutating, and therefore signed — an unsigned or replayed call is refused by
   * the gateway before this handler is reached. Note what it still cannot do:
   * change its own scopes, its quota, or anything belonging to another
   * installation. Those columns are not writable from here at all.
   */
  app.patch('/gateway/settings', async (request, reply) => {
    const updated = await withAppRequest(request, 'integration:write', async (tx, context) => {
      const body = parseOrThrow(
        z.object({ settings: z.record(z.unknown()) }),
        request.body,
        'settings',
      )
      return updateInstallationSettings(tx, context.tenantId, context.installationId, body.settings)
    })
    if (!updated) throw new NotFoundError('Installation')

    return reply.send(ok(updated))
  })

  // endregion
}

/**
 * A marketplace app, or a private app the workspace built for itself.
 *
 * Order matters: the marketplace lookup is cross-tenant and returns only
 * approved listings, so a private app cannot be reached through it. The second
 * lookup runs under the caller's own RLS context, which is what limits private
 * installs to the workspace that owns the app.
 */
async function resolveInstallTarget(tenantId: string, slug: string): Promise<InstallTarget | null> {
  const listed = await withoutTenant((tx) => findMarketplaceApp(tx, slug))
  if (listed) {
    return {
      appId: listed.appId,
      slug: listed.slug,
      name: listed.name,
      category: listed.category,
      type: listed.type,
      requestedPermissions: listed.requestedPermissions,
    }
  }

  const own = await withTenant(tenantId, (tx) => findAppBySlug(tx, tenantId, slug))
  if (!own) return null
  if (own.type === 'public' || own.type === 'agency') {
    // A public app that is not in the marketplace has not been approved.
    throw new ForbiddenError('This app has not been approved for installation.')
  }

  return {
    appId: own.id,
    slug: own.slug,
    name: own.name,
    category: own.category,
    type: own.type,
    requestedPermissions: own.requestedPermissions,
  }
}

/** The submission state machine (§37). Everything else is refused. */
function canTransition(from: string, to: string): boolean {
  if (from === 'submitted') return to === 'in_review' || to === 'approved' || to === 'rejected'
  if (from === 'in_review') return to === 'approved' || to === 'rejected'
  return false
}

/**
 * Staff membership, checked the same way the staff console checks it. Reported
 * as "not found" so the review surface is not discoverable by probing.
 */
async function requirePlatformAdmin(request: FastifyRequest): Promise<void> {
  const auth = requireUser(request)

  const isAdmin = await withoutTenant(async (tx) => {
    const [row] = await tx<{ user_id: string }[]>`
      SELECT user_id FROM platform_admins WHERE user_id = ${auth.user.id} LIMIT 1
    `
    return Boolean(row)
  })

  if (!isAdmin) throw new ForbiddenError('Not found.')
}

export default appsRoutes
