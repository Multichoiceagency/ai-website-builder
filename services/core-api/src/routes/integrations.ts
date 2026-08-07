import { randomBytes } from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
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
  recordConnectionError,
  replaceResources,
  updateAccessToken,
  upsertConnection,
} from '../db/repositories/integrations.js'
import {
  buildAuthorizeUrl,
  createPkcePair,
  exchangeCode,
  fetchAccount,
  googleConfigurationProblem,
  isGoogleConfigured,
  listBusinessAccounts,
  listBusinessLocations,
  refreshAccessToken,
  revokeToken,
  GOOGLE_SCOPES,
} from '../lib/integrations/google.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { BadRequestError, NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * The Integration Gateway (§18) and the Google connector (§16, §17).
 *
 * Two properties the rest of the platform depends on:
 *   * tokens never reach the browser — the callback stores them and redirects
 *   * `state` is server-side and single-use, so a callback cannot be replayed
 */

const STATE_TTL_SECONDS = 600

/** Get a usable access token, refreshing transparently when it has expired. */
async function accessTokenFor(tenantId: string, provider: string): Promise<string> {
  const tokens = await withTenant(tenantId, (tx) => findConnectionTokens(tx, tenantId, provider))
  if (!tokens?.accessToken) throw new NotFoundError('Connection')

  const stillValid = !tokens.expiresAt || tokens.expiresAt.getTime() > Date.now() + 60_000
  if (stillValid) return tokens.accessToken

  if (!tokens.refreshToken) {
    throw new BadRequestError('This connection has expired and has no refresh token. Reconnect it.')
  }

  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken)
    await withTenant(tenantId, (tx) =>
      updateAccessToken(tx, tokens.id, refreshed.accessToken, refreshed.expiresAt),
    )
    return refreshed.accessToken
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Refresh failed.'
    await withTenant(tenantId, (tx) => recordConnectionError(tx, tokens.id, message))
    throw new BadRequestError(`Could not refresh the Google connection: ${message}`)
  }
}

const integrationsRoutes: FastifyPluginAsync = async (app) => {
  /** Connection status for the settings screen and the onboarding flow. */
  app.get('/', async (request, reply) => {
    const context = requireTenant(request, 'integration:read')
    const connections = await withTenant(context.tenantId, (tx) => listConnections(tx, context.tenantId))
    const problem = googleConfigurationProblem()

    return reply.send(
      ok({
        providers: [
          {
            id: 'google',
            name: 'Google',
            description: 'Business Profile, Search Console and Analytics.',
            configured: isGoogleConfigured() && !problem,
            // The reason is shown verbatim in the UI: a misconfiguration the
            // operator cannot see is a support ticket waiting to happen.
            reason: problem,
            scopes: GOOGLE_SCOPES,
            connection: connections.find((entry) => entry.provider === 'google') ?? null,
          },
        ],
      }),
    )
  })

  /**
   * Start the flow. Returns a URL rather than redirecting, because the caller
   * is a `fetch` from the dashboard — a 302 here would be followed by the
   * fetch, not the browser, and the user would never see Google's consent
   * screen.
   */
  app.post('/google/authorize', async (request, reply) => {
    const context = requireTenant(request, 'integration:write')

    const problem = googleConfigurationProblem()
    if (problem) throw new BadRequestError(problem)

    const { redirectTo } = parseOrThrow(
      z.object({ redirectTo: z.string().max(512).default('/growth/google-business') }),
      request.body ?? {},
      'request',
    )

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

    return reply.send(ok({ authorizeUrl: buildAuthorizeUrl({ state, challenge }) }))
  })

  /**
   * Google redirects the *browser* here, so this one does respond with a 302 —
   * back into the dashboard, with a short status in the query string. Tokens
   * stay on this side of the boundary.
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

    // Consumed atomically; a replayed callback finds nothing.
    const stored = await withTenant(
      // The state row is tenant-scoped, but we do not know the tenant until we
      // read it. Resolve it without tenant context first, then re-enter with it.
      await resolveStateTenant(query.state),
      (tx) => consumeOAuthState(tx, query.state!),
    ).catch(() => null)

    if (!stored) return back('invalid_state')

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

  app.delete('/google', async (request, reply) => {
    const context = requireTenant(request, 'integration:write')

    const tokens = await withTenant(context.tenantId, (tx) =>
      findConnectionTokens(tx, context.tenantId, 'google'),
    )
    // Revoke upstream first so the grant disappears from the user's Google
    // account, not just from ours.
    if (tokens?.refreshToken) await revokeToken(tokens.refreshToken)
    else if (tokens?.accessToken) await revokeToken(tokens.accessToken)

    const removed = await withTenant(context.tenantId, (tx) =>
      deleteConnection(tx, context.tenantId, 'google'),
    )
    if (!removed) throw new NotFoundError('Connection')

    return reply.send(ok({ disconnected: true }))
  })
}

/**
 * The OAuth state table is tenant-scoped, but the callback arrives with no
 * tenant context. This is the one narrow read that resolves it, and it returns
 * nothing but a tenant id.
 */
async function resolveStateTenant(state: string): Promise<string> {
  const { withoutTenant } = await import('../db/client.js')
  const [row] = await withoutTenant(
    (tx) => tx<{ tenant_id: string }[]>`
      SELECT tenant_id FROM integration_oauth_states
      WHERE state = ${state} AND consumed_at IS NULL AND expires_at > now()
      LIMIT 1
    `,
  )
  if (!row) throw new NotFoundError('Authorization request')
  return row.tenant_id
}

export default integrationsRoutes
