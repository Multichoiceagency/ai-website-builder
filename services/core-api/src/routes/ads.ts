import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { adsProviderIdSchema, type AdsProviderStatus } from '@platform/schemas'
import { getAdsProvider, googleBusinessStatus, listAdsProviders } from '../adapters/ads/index.js'
import { withTenant } from '../db/client.js'
import { deleteConnection, recordAdsAudit } from '../db/repositories/ads.js'
import { listConnections, listResources } from '../db/repositories/integrations.js'
import { providerContext } from '../lib/ads/provider-context.js'
import { NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'
import adsCampaignRoutes from './ads-campaigns.js'
import adsMeasurementRoutes from './ads-measurement.js'

/**
 * Ads routes (§19, §20, §84). Registered at `/api/v1/ads`.
 *
 * Three rules run through everything under this prefix.
 *
 * **One interface, many networks.** Every handler talks to `AdsProvider` and
 * platform types; the words "Google" and "Meta" appear only as ids. Adding a
 * network adds an adapter, not an endpoint (ADR-0006).
 *
 * **Creating is not publishing.** A campaign is created as a draft and reaches
 * an ad network only through `POST /campaigns/:id/publish`, which is separately
 * permission-checked, confirmed, budget-capped and audited (ADR-0007).
 *
 * **Nothing is invented.** This installation has no ad credentials. Reads
 * return empty sets with a `providerStatus` that says why; writes fail loudly.
 * A dashboard that shows plausible-looking spend it did not measure is worse
 * than one that shows nothing.
 *
 * This module owns connections; campaigns and measurement are their own files.
 */

const providerParamsSchema = z.object({ provider: adsProviderIdSchema })

const adsRoutes: FastifyPluginAsync = async (app) => {
  /** Every network's honest state: configured, connected, available, and why not. */
  app.get('/providers', async (request, reply) => {
    const context = requireTenant(request, 'ads:read')

    const statuses = await withTenant(context.tenantId, async (tx) => {
      const resolved: AdsProviderStatus[] = []
      for (const provider of listAdsProviders()) {
        resolved.push(provider.status(await providerContext(tx, context.tenantId, provider.id)))
      }
      return resolved
    })

    return reply.send(ok(statuses))
  })

  /**
   * Start connecting an account.
   *
   * Returns the consent URL when the installation can produce one, and an
   * honest `unconfigured` result when it cannot — never a 500 and never a dead
   * button with no explanation.
   *
   * The Google OAuth callback lives in the Integration Gateway:
   * `GOOGLE_OAUTH_REDIRECT_URI` → `/api/v1/integrations/google/callback`.
   * Business Profile tokens are stored on `integration_connections` (provider
   * `google`); Ads tokens are stored on `ads_connections` once that half of
   * the callback is completed for `google_ads`.
   */
  app.post('/providers/:provider/connect', async (request, reply) => {
    const context = requireTenant(request, 'ads:write')
    const { provider } = parseOrThrow(providerParamsSchema, request.params, 'provider')
    const input = parseOrThrow(
      z.object({ returnUrl: z.string().max(2048).optional() }),
      request.body ?? {},
      'connect request',
    )

    const result = await withTenant(context.tenantId, async (tx) =>
      getAdsProvider(provider).connect(await providerContext(tx, context.tenantId, provider), input),
    )

    return reply.send(ok(result))
  })

  app.delete('/providers/:provider/connection', async (request, reply) => {
    const context = requireTenant(request, 'ads:write')
    const { provider } = parseOrThrow(providerParamsSchema, request.params, 'provider')

    const removed = await withTenant(context.tenantId, async (tx) => {
      const deleted = await deleteConnection(tx, context.tenantId, provider)
      if (deleted) {
        await recordAdsAudit(tx, {
          tenantId: context.tenantId,
          name: 'ads.account_disconnected',
          actor: context.actor,
          payload: { provider },
        })
      }
      return deleted
    })

    if (!removed) throw new NotFoundError('Connection')
    return reply.send(ok({ disconnected: true }))
  })

  /** Accounts the connected user can spend from. Empty and explained when not connected. */
  app.get('/providers/:provider/accounts', async (request, reply) => {
    const context = requireTenant(request, 'ads:read')
    const { provider } = parseOrThrow(providerParamsSchema, request.params, 'provider')

    const result = await withTenant(context.tenantId, async (tx) => {
      const adapter = getAdsProvider(provider)
      const providerCtx = await providerContext(tx, context.tenantId, provider, { withSecrets: true })
      return { providerStatus: adapter.status(providerCtx), items: await adapter.listAccounts(providerCtx) }
    })

    return reply.send(ok(result))
  })

  /**
   * Campaigns that already exist on the network.
   *
   * Separate from `/campaigns` because these are *theirs* — read-only until
   * they are imported. §84: reviewing an existing campaign must never be a step
   * that modifies it.
   */
  app.get('/providers/:provider/campaigns', async (request, reply) => {
    const context = requireTenant(request, 'ads:read')
    const { provider } = parseOrThrow(providerParamsSchema, request.params, 'provider')
    const { accountId } = parseOrThrow(
      z.object({ accountId: z.string().max(200).optional() }),
      request.query ?? {},
      'query',
    )

    const result = await withTenant(context.tenantId, async (tx) => {
      const adapter = getAdsProvider(provider)
      const providerCtx = await providerContext(tx, context.tenantId, provider, { withSecrets: true })
      const status = adapter.status(providerCtx)

      return {
        providerStatus: status,
        items: status.available
          ? await adapter.listCampaigns(providerCtx, accountId ?? status.connectedAccountId ?? '')
          : [],
      }
    })

    return reply.send(ok(result))
  })

  /** Google Business Profile connection state (§19). Not an ad network; same honesty. */
  app.get('/google-business', async (request, reply) => {
    const context = requireTenant(request, 'ads:read')

    const status = await withTenant(context.tenantId, async (tx) => {
      // Business Profile is connected through the Integration Gateway
      // (`provider: google`), not through `ads_connections`.
      const connections = await listConnections(tx, context.tenantId)
      const google = connections.find((entry) => entry.provider === 'google') ?? null
      const resources = google ? await listResources(tx, context.tenantId, 'business_location') : []

      const connection = google
        ? {
            tenantId: context.tenantId,
            provider: 'google_business' as const,
            externalAccountId: google.externalAccountId || null,
            displayName: google.accountLabel || null,
            scopes: google.scopes,
            connectedAt: new Date(google.connectedAt),
          }
        : null

      return googleBusinessStatus(
        connection,
        resources.map((resource) => {
          const payload = resource.payload as {
            title?: string
            storefrontAddress?: { addressLines?: string[] }
            metadata?: { hasVoiceOfMerchant?: boolean }
          }
          return {
            externalId: resource.externalId,
            name: resource.label || payload.title || resource.externalId,
            address: payload.storefrontAddress?.addressLines?.join(', ') ?? '',
            verified: Boolean(payload.metadata?.hasVoiceOfMerchant),
          }
        }),
      )
    })

    return reply.send(ok(status))
  })

  await app.register(adsCampaignRoutes)
  await app.register(adsMeasurementRoutes)
}

export default adsRoutes
