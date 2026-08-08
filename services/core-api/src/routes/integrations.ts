import { randomBytes } from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  CONNECTOR_CATALOG,
  connectorById,
  connectorByNangoKey,
  createConnectSession,
  deleteNangoConnection,
  getNangoAccessToken,
  isNangoAuthSuccess,
  isNangoConfigured,
  listNangoIntegrationKeys,
  nangoConfigurationProblem,
  nangoIntegrationIdFor,
  nangoPlaceholderToken,
  parseNangoAuthWebhook,
} from '../adapters/integrations/nango.js'
import { env } from '../config/env.js'
import { withTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import {
  consumeOAuthState,
  deleteConnection,
  findConnectionTokens,
  insertOAuthState,
  listConnections,
  listResources,
  replaceResources,
  upsertConnection,
} from '../db/repositories/integrations.js'
import {
  buildAuthorizeUrl,
  createPkcePair,
  exchangeCode,
  fetchAccount,
  GoogleIntegrationProvider,
  googleConfigurationProblem,
  listBusinessAccounts,
  listBusinessLocations,
  revokeToken,
  GOOGLE_SCOPE_CATALOG,
  GOOGLE_SCOPES,
} from '../lib/integrations/google.js'
import { googleAccessTokenFor } from '../lib/integrations/google-token.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { BadRequestError, NotFoundError, UnauthorizedError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * Integration Gateway (§18) — Connectors via Nango (ADR-0006).
 *
 * When `NANGO_SECRET_KEY` is set, authorize returns a Nango Connect link for
 * any catalog provider. Google keeps a legacy native PKCE fallback when Nango
 * is absent. Tokens never reach the browser.
 */

const STATE_TTL_SECONDS = 600

async function accessTokenFor(tenantId: string, provider: string): Promise<string> {
  if (provider !== 'google') throw new NotFoundError('Connection')
  return googleAccessTokenFor(tenantId)
}

const integrationsRoutes: FastifyPluginAsync = async (app) => {
  /** Connection status for Connectors modal + settings. */
  app.get('/', async (request, reply) => {
    const context = requireTenant(request, 'integration:read')
    const connections = await withTenant(context.tenantId, (tx) => listConnections(tx, context.tenantId))
    const nango = isNangoConfigured()
    const nangoProblem = nango ? nangoConfigurationProblem() : null

    let nangoKeys = new Set<string>()
    if (nango && !nangoProblem) {
      try {
        nangoKeys = await listNangoIntegrationKeys()
      } catch (error) {
        request.log.warn({ err: error }, 'nango listIntegrations failed')
      }
    }

    const googleNativeProblem = GoogleIntegrationProvider.configurationProblem()

    const providers = CONNECTOR_CATALOG.map((connector) => {
      const connection = connections.find((entry) => entry.provider === connector.id) ?? null
      const nangoKey = connector.nangoIntegrationId
      const inNango = nangoKeys.has(nangoKey) || nangoKeys.has(connector.id)

      if (nango) {
        const configured = Boolean(!nangoProblem && (inNango || nangoKeys.size === 0))
        // When listIntegrations succeeds empty, still allow connect — Nango UI
        // may not have listed yet; Connect session will fail clearly if missing.
        const reason = nangoProblem
          ?? (!inNango && nangoKeys.size > 0
            ? `Create a “${nangoKey}” integration in the Nango UI, then retry.`
            : null)
        return {
          id: connector.id,
          name: connector.name,
          description: connector.description,
          category: connector.category,
          configured: configured && !reason,
          reason,
          scopes: connector.id === 'google' ? GOOGLE_SCOPES : [],
          scopeCatalog:
            connector.id === 'google'
              ? GOOGLE_SCOPE_CATALOG.map(({ scope, label, purpose }) => ({ scope, label, purpose }))
              : undefined,
          broker: 'nango' as const,
          connection,
        }
      }

      // Native path: Google only.
      if (connector.id === 'google') {
        return {
          id: connector.id,
          name: connector.name,
          description: connector.description,
          category: connector.category,
          configured: GoogleIntegrationProvider.isConfigured() && !googleNativeProblem,
          reason: googleNativeProblem,
          scopes: GOOGLE_SCOPES,
          scopeCatalog: GOOGLE_SCOPE_CATALOG.map(({ scope, label, purpose }) => ({
            scope,
            label,
            purpose,
          })),
          broker: 'native' as const,
          connection,
        }
      }

      return {
        id: connector.id,
        name: connector.name,
        description: connector.description,
        category: connector.category,
        configured: false,
        reason: 'Set NANGO_SECRET_KEY and run `pnpm infra:nango` to enable this connector.',
        scopes: [] as string[],
        broker: 'nango' as const,
        connection,
      }
    })

    return reply.send(ok({ providers, broker: nango ? 'nango' : 'native' }))
  })

  /**
   * Start OAuth / Connect. Returns a URL (Nango Connect link or Google authorize).
   * Path is `/:provider/authorize` so Connectors and Settings share one flow.
   */
  app.post('/:provider/authorize', async (request, reply) => {
    const context = requireTenant(request, 'integration:write')
    const providerId = (request.params as { provider: string }).provider
    const connector = connectorById(providerId)
    if (!connector) throw new NotFoundError('Provider')

    const { redirectTo } = parseOrThrow(
      z.object({
        redirectTo: z.string().max(512).default('/settings/integrations'),
      }),
      request.body ?? {},
      'request',
    )

    if (isNangoConfigured()) {
      const problem = nangoConfigurationProblem()
      if (problem) throw new BadRequestError(problem)

      const state = randomBytes(32).toString('base64url')
      await withTenant(context.tenantId, (tx) =>
        insertOAuthState(tx, {
          state,
          tenantId: context.tenantId,
          userId: context.user.id,
          provider: connector.id,
          codeVerifier: 'nango',
          redirectTo,
          ttlSeconds: STATE_TTL_SECONDS,
        }),
      )

      const session = await createConnectSession({
        tenantId: context.tenantId,
        userId: context.user.id,
        email: context.user.email,
        allowedIntegrations: [connector.nangoIntegrationId],
      })

      return reply.send(
        ok({
          authorizeUrl: session.connectLink,
          url: session.connectLink,
          broker: 'nango' as const,
          expiresAt: session.expiresAt,
        }),
      )
    }

    if (connector.id !== 'google') {
      throw new BadRequestError(
        'This connector requires Nango. Set NANGO_SECRET_KEY and run `pnpm infra:nango`.',
      )
    }

    const problem = googleConfigurationProblem()
    if (problem) throw new BadRequestError(problem)

    const state = randomBytes(32).toString('base64url')
    const { verifier, challenge } = createPkcePair()

    await withTenant(context.tenantId, (tx) =>
      insertOAuthState(tx, {
        state,
        tenantId: context.tenantId,
        userId: context.user.id,
        provider: 'google',
        codeVerifier: verifier,
        redirectTo,
        ttlSeconds: STATE_TTL_SECONDS,
      }),
    )

    const authorizeUrl = buildAuthorizeUrl({ state, challenge })
    return reply.send(
      ok({
        authorizeUrl,
        url: authorizeUrl,
        broker: 'native' as const,
      }),
    )
  })

  /**
   * Nango auth webhooks — connection created / refreshed.
   * Configure the Nango environment webhook URL to this path.
   */
  app.post('/nango/webhook', async (request, reply) => {
    if (env.NANGO_WEBHOOK_SECRET) {
      const header =
        (request.headers['x-nango-secret'] as string | undefined)
        ?? (request.headers['authorization'] as string | undefined)?.replace(/^Bearer\s+/i, '')
      if (header !== env.NANGO_WEBHOOK_SECRET) throw new UnauthorizedError('Invalid Nango webhook secret.')
    }

    const payload = parseNangoAuthWebhook(request.body)
    if (!payload || !isNangoAuthSuccess(payload) || !payload.connectionId) {
      return reply.send(ok({ ignored: true }))
    }

    const nangoKey = payload.providerConfigKey ?? payload.provider ?? ''
    const connector = connectorByNangoKey(nangoKey)
    if (!connector) {
      request.log.warn({ nangoKey }, 'nango webhook for unknown integration')
      return reply.send(ok({ ignored: true }))
    }

    const tenantId = payload.tags?.organization_id
    const userId = payload.tags?.end_user_id
    if (!tenantId || !userId) {
      request.log.warn({ payload }, 'nango webhook missing organization_id or end_user_id tags')
      return reply.send(ok({ ignored: true }))
    }

    try {
      const tokens = await getNangoAccessToken(connector.nangoIntegrationId, payload.connectionId)
      const connection = await withTenant(tenantId, (tx) =>
        upsertConnection(tx, {
          tenantId,
          provider: connector.id,
          externalAccountId: tokens.externalAccountId,
          accountLabel: tokens.accountLabel || payload.tags?.end_user_email || connector.name,
          scopes: tokens.scopes.length
            ? tokens.scopes
            : connector.id === 'google'
              ? [...GOOGLE_SCOPES]
              : [],
          accessToken: tokens.accessToken || nangoPlaceholderToken(),
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          connectedBy: userId,
          broker: 'nango',
          brokerConnectionId: payload.connectionId!,
        }),
      )

      const event = buildEvent({
        name: 'domain.connected',
        tenantId,
        actor: { type: 'user', id: userId, label: payload.tags?.end_user_email ?? userId },
        resource: { type: 'integration', id: connection.id },
        payload: {
          provider: connector.id,
          broker: 'nango',
          account: connection.accountLabel,
          scopes: connection.scopes.length,
        },
      })
      await withTenant(tenantId, (tx) => recordAuditEvent(tx, event))
      await eventBus.publish(event)

      return reply.send(ok({ connected: true, connectionId: connection.id, provider: connector.id }))
    } catch (error) {
      request.log.error({ err: error }, 'nango webhook failed')
      throw new BadRequestError(error instanceof Error ? error.message : 'Nango webhook failed.')
    }
  })

  /**
   * Google redirects the *browser* here for legacy native OAuth only.
   */
  app.get('/google/callback', async (request, reply) => {
    const query = parseOrThrow(
      z.object({
        code: z.string().optional(),
        state: z.string().optional(),
        error: z.string().optional(),
      }),
      request.query ?? {},
      'callback',
    )

    const dashboard = env.CORS_ORIGINS[0] ?? 'http://localhost:3000'
    const back = (status: string, target = '/growth/google-business') =>
      reply.redirect(`${dashboard}${target}?google=${encodeURIComponent(status)}`)

    if (query.error) return back(query.error)
    if (!query.code || !query.state) return back('missing_code')

    let stored: Awaited<ReturnType<typeof consumeOAuthState>> = null
    try {
      const tenantId = await resolveStateTenant(query.state)
      stored = await withTenant(tenantId, (tx) => consumeOAuthState(tx, query.state!))
    } catch (error) {
      request.log.warn({ err: error }, 'google oauth state resolve failed')
      return back('invalid_state')
    }

    if (!stored) return back('invalid_state')
    if (stored.codeVerifier === 'nango') {
      return back('use_nango_connect', stored.redirectTo)
    }

    try {
      const tokens = await exchangeCode(query.code, stored.codeVerifier)
      const account = await fetchAccount(tokens.accessToken)

      const connection = await withTenant(stored.tenantId, (tx) =>
        upsertConnection(tx, {
          tenantId: stored.tenantId,
          provider: 'google',
          externalAccountId: account.id,
          accountLabel: account.email || account.name,
          scopes: tokens.scopes,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          connectedBy: stored.userId,
          broker: 'native',
          brokerConnectionId: null,
        }),
      )

      const event = buildEvent({
        name: 'domain.connected',
        tenantId: stored.tenantId,
        actor: { type: 'user', id: stored.userId, label: account.email },
        resource: { type: 'integration', id: connection.id },
        payload: { provider: 'google', account: account.email, scopes: tokens.scopes.length },
      })
      await withTenant(stored.tenantId, (tx) => recordAuditEvent(tx, event))
      await eventBus.publish(event)

      return back('connected', stored.redirectTo)
    } catch (error) {
      request.log.error({ err: error }, 'google oauth callback failed')
      return back(error instanceof Error ? error.message.slice(0, 120) : 'exchange_failed', stored.redirectTo)
    }
  })

  /** Business accounts and their locations, for the "pick your business" step. */
  app.get('/google/business-locations', async (request, reply) => {
    const context = requireTenant(request, 'integration:read')
    const accessToken = await accessTokenFor(context.tenantId, 'google')

    const accounts = await listBusinessAccounts(accessToken)
    const located: { externalId: string; label: string; payload: Record<string, unknown> }[] = []

    for (const account of accounts) {
      const locations = await listBusinessLocations(accessToken, account.name).catch(() => [])
      for (const location of locations) {
        located.push({
          externalId: location.name,
          label: location.title || location.name,
          payload: { ...location, accountName: account.accountName },
        })
      }
    }

    const connection = await withTenant(context.tenantId, (tx) =>
      findConnectionTokens(tx, context.tenantId, 'google'),
    )
    if (connection) {
      await withTenant(context.tenantId, (tx) =>
        replaceResources(tx, {
          tenantId: context.tenantId,
          connectionId: connection.id,
          kind: 'business_location',
          resources: located,
        }),
      )
    }

    return reply.send(ok({ accounts, locations: located }))
  })

  /** Cached locations, so the picker does not hit Google on every render. */
  app.get('/google/locations', async (request, reply) => {
    const context = requireTenant(request, 'integration:read')
    const locations = await withTenant(context.tenantId, (tx) =>
      listResources(tx, context.tenantId, 'business_location'),
    )
    return reply.send(ok({ locations }))
  })

  app.delete('/:provider', async (request, reply) => {
    const context = requireTenant(request, 'integration:write')
    const providerId = (request.params as { provider: string }).provider
    if (providerId === 'nango') throw new NotFoundError('Connection')

    const connector = connectorById(providerId)
    if (!connector && providerId !== 'google') throw new NotFoundError('Connection')

    const tokens = await withTenant(context.tenantId, (tx) =>
      findConnectionTokens(tx, context.tenantId, providerId),
    )

    if (tokens?.broker === 'nango' && tokens.brokerConnectionId && isNangoConfigured()) {
      const nangoKey = connector
        ? connector.nangoIntegrationId
        : nangoIntegrationIdFor('google')
      await deleteNangoConnection(nangoKey, tokens.brokerConnectionId)
    } else if (providerId === 'google') {
      if (tokens?.refreshToken) {
        await revokeToken(tokens.refreshToken)
      } else if (tokens?.accessToken && tokens.accessToken !== nangoPlaceholderToken()) {
        await revokeToken(tokens.accessToken)
      }
    }

    const removed = await withTenant(context.tenantId, (tx) =>
      deleteConnection(tx, context.tenantId, providerId),
    )
    if (!removed) throw new NotFoundError('Connection')

    return reply.send(ok({ disconnected: true }))
  })
}

/**
 * The OAuth state table is tenant-scoped, but the callback arrives with no
 * tenant context. Resolve via SECURITY DEFINER `resolve_oauth_state_tenant`
 * (migration 0018) — the same pattern as SCIM token → tenant.
 */
async function resolveStateTenant(state: string): Promise<string> {
  const { withoutTenant } = await import('../db/client.js')
  const [row] = await withoutTenant(
    (tx) => tx<{ tenant_id: string | null }[]>`
      SELECT resolve_oauth_state_tenant(${state}) AS tenant_id
    `,
  )
  if (!row?.tenant_id) throw new NotFoundError('Authorization request')
  return row.tenant_id
}

export default integrationsRoutes
