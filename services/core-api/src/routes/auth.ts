import { randomBytes } from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { resolvePermissions } from '@platform/permissions'
import { loginInputSchema, registerInputSchema, type SessionContext } from '@platform/schemas'
import { env } from '../config/env.js'
import { withTenant, withoutTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import { consumeAuthOAuthState, insertAuthOAuthState } from '../db/repositories/auth-oauth.js'
import { deleteSession, generateSessionToken, insertSession } from '../db/repositories/sessions.js'
import {
  insertMembership,
  insertOrganization,
  insertTenant,
  listMembershipsForUser,
} from '../db/repositories/tenants.js'
import {
  findUserByEmail,
  findUserByGoogleSub,
  insertUser,
  linkGoogleSub,
} from '../db/repositories/users.js'
import { upsertConnection } from '../db/repositories/integrations.js'
import {
  buildGoogleAuthAuthorizeUrl,
  createPkcePair,
  exchangeGoogleAuthCode,
  fetchAccount,
  GOOGLE_SCOPES,
  googleAuthConfigurationProblem,
  type GoogleTokens,
} from '../lib/auth/google-auth.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { BadRequestError, ConflictError, UnauthorizedError } from '../lib/errors.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { ok } from '../lib/response.js'
import { uniqueSlug } from '../lib/slug.js'
import { parseOrThrow } from '../lib/validate.js'
import { clearSessionCookie, requireUser, setSessionCookie } from '../plugins/auth.js'

const AUTH_OAUTH_TTL_SECONDS = 600

/** Workspace label when the user skipped company name at signup. */
export function defaultWorkspaceName(input: {
  organizationName?: string | null
  displayName?: string | null
  email?: string | null
}): string {
  const fromOrg = input.organizationName?.trim()
  if (fromOrg) return fromOrg.slice(0, 200)
  const fromDisplay = input.displayName?.trim()
  if (fromDisplay) return fromDisplay.slice(0, 200)
  const local = input.email?.split('@')[0]?.trim()
  if (local) return local.slice(0, 200)
  return 'My workspace'
}

function buildSessionContext(
  user: SessionContext['user'],
  memberships: SessionContext['memberships'],
  requestedTenantId?: string,
): SessionContext {
  const active =
    memberships.find((membership) => membership.tenantId === requestedTenantId) ?? memberships[0] ?? null

  return {
    user,
    memberships,
    activeTenantId: active?.tenantId ?? null,
    permissions: active ? resolvePermissions(active.role) : [],
  }
}

/** Only same-origin relative paths — never open redirects after Google. */
function safeRedirectPath(raw: string | undefined, fallback = '/'): string {
  if (!raw) return fallback
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback
  if (trimmed.includes('\\') || trimmed.includes('\n') || trimmed.includes('\r')) return fallback
  return trimmed.slice(0, 512)
}

function dashboardOrigin(): string {
  return env.CORS_ORIGINS[0] ?? 'http://localhost:3000'
}

function redirectToDashboard(
  reply: { redirect: (url: string) => unknown },
  path: string,
  status?: string,
) {
  const url = new URL(path, dashboardOrigin())
  if (status) url.searchParams.set('google', status)
  return reply.redirect(url.toString())
}

/** Persist the Google OAuth grant as the workspace integration connection. */
async function linkGoogleWorkspaceConnection(input: {
  tenantId: string
  userId: string
  account: { id: string; email: string; name: string }
  tokens: GoogleTokens
}): Promise<void> {
  const scopes = input.tokens.scopes.length ? input.tokens.scopes : [...GOOGLE_SCOPES]
  await withTenant(input.tenantId, (tx) =>
    upsertConnection(tx, {
      tenantId: input.tenantId,
      provider: 'google',
      externalAccountId: input.account.id,
      accountLabel: input.account.email || input.account.name,
      scopes,
      accessToken: input.tokens.accessToken,
      refreshToken: input.tokens.refreshToken,
      expiresAt: input.tokens.expiresAt,
      connectedBy: input.userId,
      broker: 'native',
      brokerConnectionId: null,
    }),
  )
}

const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Sign up. Creates the organization, its first tenant and an owner
   * membership in one transaction — a user without a workspace is a state the
   * rest of the system should never have to handle.
   */
  app.post('/register', async (request, reply) => {
    const input = parseOrThrow(registerInputSchema, request.body, 'registration')
    const passwordHash = await hashPassword(input.password)
    const organizationName = defaultWorkspaceName({
      organizationName: input.organizationName,
      displayName: input.name,
      email: input.email,
    })

    const result = await withoutTenant(async (tx) => {
      const existing = await findUserByEmail(tx, input.email)
      if (existing) throw new ConflictError('An account with that e-mail already exists.')

      const orgSlug = await uniqueSlug(organizationName, async (candidate) => {
        const [row] = await tx<{ id: string }[]>`SELECT id FROM organizations WHERE slug = ${candidate} LIMIT 1`
        return Boolean(row)
      })
      const tenantSlug = await uniqueSlug(organizationName, async (candidate) => {
        const [row] = await tx<{ id: string }[]>`SELECT id FROM tenants WHERE slug = ${candidate} LIMIT 1`
        return Boolean(row)
      })

      const organization = await insertOrganization(tx, { name: organizationName, slug: orgSlug })
      const tenant = await insertTenant(tx, {
        organizationId: organization.id,
        name: organizationName,
        slug: tenantSlug,
        plan: 'launch',
      })
      const user = await insertUser(tx, {
        email: input.email,
        name: input.name,
        passwordHash,
      })
      await insertMembership(tx, { tenantId: tenant.id, userId: user.id, role: 'owner' })

      const token = generateSessionToken()
      await insertSession(tx, { userId: user.id, token, ttlSeconds: env.SESSION_TTL_SECONDS })

      return { user, tenant, token }
    })

    const events = [
      buildEvent({
        name: 'user.registered',
        tenantId: result.tenant.id,
        actor: { type: 'user', id: result.user.id, label: result.user.email },
        resource: { type: 'user', id: result.user.id },
      }),
      buildEvent({
        name: 'tenant.created',
        tenantId: result.tenant.id,
        actor: { type: 'user', id: result.user.id, label: result.user.email },
        resource: { type: 'tenant', id: result.tenant.id },
        payload: { plan: result.tenant.plan },
      }),
    ]

    await withTenant(result.tenant.id, async (tx) => {
      for (const event of events) await recordAuditEvent(tx, event)
    })
    for (const event of events) await eventBus.publish(event)

    setSessionCookie(reply, result.token)

    const memberships = [
      {
        tenantId: result.tenant.id,
        tenantName: result.tenant.name,
        tenantSlug: result.tenant.slug,
        plan: result.tenant.plan,
        role: 'owner' as const,
      },
    ]

    return reply.status(201).send(ok(buildSessionContext(result.user, memberships)))
  })

  app.post('/login', async (request, reply) => {
    const input = parseOrThrow(loginInputSchema, request.body, 'credentials')

    const result = await withoutTenant(async (tx) => {
      const found = await findUserByEmail(tx, input.email)
      // Same failure for unknown e-mail and wrong password, so the endpoint is
      // not an account-enumeration oracle.
      if (!found) return null
      if (!found.passwordHash) {
        throw new UnauthorizedError('This account uses Google Sign-In. Continue with Google.')
      }
      if (!(await verifyPassword(input.password, found.passwordHash))) return null

      const token = generateSessionToken()
      await insertSession(tx, { userId: found.user.id, token, ttlSeconds: env.SESSION_TTL_SECONDS })

      const memberships = await listMembershipsForUser(tx, found.user.id)
      return { user: found.user, memberships, token }
    })

    if (!result) throw new UnauthorizedError('E-mail or password is incorrect.')

    setSessionCookie(reply, result.token)
    return reply.send(ok(buildSessionContext(result.user, result.memberships)))
  })

  /**
   * Start Sign-In / Sign-Up with Google. Returns an authorize URL (same pattern
   * as integrations) so the dashboard can navigate the browser to Google.
   */
  app.post('/google/start', async (request, reply) => {
    const problem = googleAuthConfigurationProblem()
    if (problem) throw new BadRequestError(problem)

    const optionalTrimmed = (min: number, max: number) =>
      z.preprocess(
        (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
        z.string().trim().min(min).max(max).optional(),
      )

    const input = parseOrThrow(
      z.object({
        mode: z.enum(['login', 'register']).default('login'),
        redirectTo: z.string().max(512).optional(),
        // Empty strings from the form must not 400 — treat as "not provided".
        organizationName: optionalTrimmed(2, 120),
        displayName: optionalTrimmed(1, 120),
      }),
      request.body ?? {},
      'google auth',
    )

    if (input.mode === 'register' && input.organizationName !== undefined && input.organizationName.length < 2) {
      throw new BadRequestError('Company name must be at least 2 characters when provided.')
    }

    const state = randomBytes(32).toString('base64url')
    const { verifier, challenge } = createPkcePair()
    const redirectTo = safeRedirectPath(input.redirectTo)

    await withoutTenant((tx) =>
      insertAuthOAuthState(tx, {
        state,
        mode: input.mode,
        codeVerifier: verifier,
        redirectTo,
        organizationName: input.organizationName ?? null,
        displayName: input.displayName ?? null,
        ttlSeconds: AUTH_OAUTH_TTL_SECONDS,
      }),
    )

    return reply.send(
      ok({
        authorizeUrl: buildGoogleAuthAuthorizeUrl({ state, challenge, mode: input.mode }),
      }),
    )
  })

  /**
   * Google redirects the browser here. Sets the session cookie and 302s back
   * to the dashboard — never returns tokens in the URL.
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

    if (query.error) return redirectToDashboard(reply, '/login', query.error)
    if (!query.code || !query.state) return redirectToDashboard(reply, '/login', 'missing_code')

    const stored = await withoutTenant((tx) => consumeAuthOAuthState(tx, query.state!))
    if (!stored) return redirectToDashboard(reply, '/login', 'invalid_state')

    let account: Awaited<ReturnType<typeof fetchAccount>>
    let tokens: GoogleTokens
    try {
      tokens = await exchangeGoogleAuthCode(query.code, stored.codeVerifier)
      account = await fetchAccount(tokens.accessToken)
    } catch (error) {
      request.log.warn({ err: error }, 'google auth token exchange failed')
      return redirectToDashboard(reply, '/login', 'exchange_failed')
    }

    if (!account.email) {
      return redirectToDashboard(reply, '/login', 'email_required')
    }

    try {
      if (stored.mode === 'register') {
        const result = await withoutTenant(async (tx) => {
          const bySub = await findUserByGoogleSub(tx, account.id)
          if (bySub) {
            const token = generateSessionToken()
            await insertSession(tx, { userId: bySub.id, token, ttlSeconds: env.SESSION_TTL_SECONDS })
            const memberships = await listMembershipsForUser(tx, bySub.id)
            return { kind: 'existing' as const, user: bySub, memberships, token }
          }

          const byEmail = await findUserByEmail(tx, account.email)
          if (byEmail) {
            await linkGoogleSub(tx, byEmail.user.id, account.id)
            const token = generateSessionToken()
            await insertSession(tx, {
              userId: byEmail.user.id,
              token,
              ttlSeconds: env.SESSION_TTL_SECONDS,
            })
            const memberships = await listMembershipsForUser(tx, byEmail.user.id)
            return { kind: 'existing' as const, user: byEmail.user, memberships, token }
          }

          const displayName =
            stored.displayName?.trim() || account.name || account.email.split('@')[0] || 'Owner'
          const organizationName = defaultWorkspaceName({
            organizationName: stored.organizationName,
            displayName,
            email: account.email,
          })

          const orgSlug = await uniqueSlug(organizationName, async (candidate) => {
            const [row] = await tx<{ id: string }[]>`SELECT id FROM organizations WHERE slug = ${candidate} LIMIT 1`
            return Boolean(row)
          })
          const tenantSlug = await uniqueSlug(organizationName, async (candidate) => {
            const [row] = await tx<{ id: string }[]>`SELECT id FROM tenants WHERE slug = ${candidate} LIMIT 1`
            return Boolean(row)
          })

          const organization = await insertOrganization(tx, { name: organizationName, slug: orgSlug })
          const tenant = await insertTenant(tx, {
            organizationId: organization.id,
            name: organizationName,
            slug: tenantSlug,
            plan: 'launch',
          })
          const user = await insertUser(tx, {
            email: account.email,
            name: displayName,
            passwordHash: null,
            googleSub: account.id,
          })
          await insertMembership(tx, { tenantId: tenant.id, userId: user.id, role: 'owner' })

          const token = generateSessionToken()
          await insertSession(tx, { userId: user.id, token, ttlSeconds: env.SESSION_TTL_SECONDS })

          return { kind: 'registered' as const, user, tenant, token }
        })

        if (result.kind === 'registered') {
          const events = [
            buildEvent({
              name: 'user.registered',
              tenantId: result.tenant.id,
              actor: { type: 'user', id: result.user.id, label: result.user.email },
              resource: { type: 'user', id: result.user.id },
            }),
            buildEvent({
              name: 'tenant.created',
              tenantId: result.tenant.id,
              actor: { type: 'user', id: result.user.id, label: result.user.email },
              resource: { type: 'tenant', id: result.tenant.id },
              payload: { plan: result.tenant.plan, via: 'google' },
            }),
          ]
          await withTenant(result.tenant.id, async (tx) => {
            for (const event of events) await recordAuditEvent(tx, event)
          })
          for (const event of events) await eventBus.publish(event)

          await linkGoogleWorkspaceConnection({
            tenantId: result.tenant.id,
            userId: result.user.id,
            account,
            tokens,
          }).catch((error) => {
            request.log.warn({ err: error }, 'google signup integration link failed')
          })
        } else {
          const tenantId = result.memberships[0]?.tenantId
          if (tenantId) {
            await linkGoogleWorkspaceConnection({
              tenantId,
              userId: result.user.id,
              account,
              tokens,
            }).catch((error) => {
              request.log.warn({ err: error }, 'google signup integration link failed')
            })
          }
        }

        setSessionCookie(reply, result.token)
        return redirectToDashboard(reply, stored.redirectTo)
      }

      // login
      const result = await withoutTenant(async (tx) => {
        let user = await findUserByGoogleSub(tx, account.id)
        if (!user) {
          const byEmail = await findUserByEmail(tx, account.email)
          if (!byEmail) return null
          await linkGoogleSub(tx, byEmail.user.id, account.id)
          user = byEmail.user
        }

        const token = generateSessionToken()
        await insertSession(tx, { userId: user.id, token, ttlSeconds: env.SESSION_TTL_SECONDS })
        const memberships = await listMembershipsForUser(tx, user.id)
        return { user, memberships, token }
      })

      if (!result) {
        return redirectToDashboard(reply, '/login', 'no_account')
      }

      const tenantId = result.memberships[0]?.tenantId
      if (tenantId) {
        await linkGoogleWorkspaceConnection({
          tenantId,
          userId: result.user.id,
          account,
          tokens,
        }).catch((error) => {
          request.log.warn({ err: error }, 'google login integration link failed')
        })
      }

      setSessionCookie(reply, result.token)
      return redirectToDashboard(reply, stored.redirectTo)
    } catch (error) {
      request.log.warn({ err: error }, 'google auth callback failed')
      return redirectToDashboard(reply, '/login', 'callback_failed')
    }
  })

  app.post('/logout', async (request, reply) => {
    const token = request.cookies[env.SESSION_COOKIE_NAME]
    if (token) await withoutTenant((tx) => deleteSession(tx, token))
    clearSessionCookie(reply)
    return reply.send(ok({ loggedOut: true }))
  })

  app.get('/session', async (request, reply) => {
    const auth = requireUser(request)
    const requested = request.headers['x-tenant-id'] as string | undefined
    return reply.send(ok(buildSessionContext(auth.user, auth.memberships, requested)))
  })
}

export default authRoutes
