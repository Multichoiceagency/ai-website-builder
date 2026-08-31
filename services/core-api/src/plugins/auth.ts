import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { resolvePermissions } from '@platform/permissions'
import type { Actor, Membership, Permission, Plan, Role, User } from '@platform/schemas'
import { env, isProduction } from '../config/env.js'
import { withoutTenant } from '../db/client.js'
import { findValidApiKey, readPresentedKey, touchApiKey } from '../db/repositories/api-keys.js'
import { findValidSession } from '../db/repositories/sessions.js'
import { listMembershipsForUser } from '../db/repositories/tenants.js'
import { findUserById } from '../db/repositories/users.js'
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js'

export interface AuthContext {
  user: User
  memberships: Membership[]
  sessionToken: string
  impersonatorUserId: string | null
}

/**
 * A verified right to act inside one tenant. Nothing downstream accepts a bare
 * tenant id — it accepts one of these, which can only be produced by
 * `requireTenant` after checking membership.
 */
export interface TenantContext {
  tenantId: string
  role: Role
  plan: Plan
  permissions: Permission[]
  user: User
  actor: Actor
}

/**
 * A verified machine caller. Carries the member who issued the key, so the key's
 * rights can never exceed theirs.
 */
export interface ApiKeyContext {
  keyId: string
  keyName: string
  tenantId: string
  scopes: string[]
  user: User
  membership: Membership
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null
    apiKey: ApiKeyContext | null
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('auth', null)
  app.decorateRequest('apiKey', null)

  // Resolve the session for every request. Roles and revocation therefore take
  // effect on the next request, which is the point of server-side sessions
  // (ADR-0009).
  app.addHook('onRequest', async (request) => {
    const token = request.cookies[env.SESSION_COOKIE_NAME]
    if (!token) return

    const context = await withoutTenant(async (tx) => {
      const session = await findValidSession(tx, token)
      if (!session) return null

      const user = await findUserById(tx, session.userId)
      if (!user) return null

      const memberships = await listMembershipsForUser(tx, user.id)
      return {
        user,
        memberships,
        sessionToken: token,
        impersonatorUserId: session.impersonatorUserId,
      } satisfies AuthContext
    })

    request.auth = context
  })

  // Keys are resolved separately from sessions: a request carries one or the
  // other, and a stale cookie must not shadow a valid key.
  app.addHook('onRequest', async (request) => {
    if (request.auth) return
    const presented = readPresentedKey(request.headers as Record<string, unknown>)
    if (!presented) return

    const context = await withoutTenant(async (tx) => {
      const key = await findValidApiKey(tx, presented)
      if (!key) return null

      const user = await findUserById(tx, key.issuedBy)
      if (!user) return null

      // The issuer's membership is re-read per request, so losing access to the
      // workspace disables their keys at the same moment it disables them.
      const memberships = await listMembershipsForUser(tx, user.id)
      const membership = memberships.find((candidate) => candidate.tenantId === key.tenantId)
      if (!membership) return null

      await touchApiKey(tx, key.id).catch(() => {})
      return { keyId: key.id, keyName: key.name, tenantId: key.tenantId, scopes: key.scopes, user, membership }
    })

    request.apiKey = context
  })
}

export default fp(authPlugin, { name: 'auth' })

export function setSessionCookie(reply: { setCookie: (n: string, v: string, o: object) => unknown }, token: string) {
  reply.setCookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // Cross-site dashboard↔API hosts (separate sslip.io / custom FQDNs) need
    // None+Secure; same-origin proxy also works with Lax. None is safe on HTTPS.
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/',
    maxAge: env.SESSION_TTL_SECONDS,
  })
}

export function clearSessionCookie(reply: { clearCookie: (n: string, o: object) => unknown }) {
  reply.clearCookie(env.SESSION_COOKIE_NAME, {
    path: '/',
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  })
}

/**
 * A key's rights are the intersection of its scopes and the issuing member's
 * role. Narrowing only: a scope the member does not hold grants nothing.
 */
function tenantFromApiKey(key: ApiKeyContext, permission: Permission): TenantContext {
  const rolePermissions = resolvePermissions(key.membership.role)
  const granted = rolePermissions.filter((candidate) => key.scopes.includes(candidate))

  if (!granted.includes(permission)) {
    throw new ForbiddenError(`This API key does not carry the ${permission} scope.`)
  }

  return {
    tenantId: key.tenantId,
    role: key.membership.role,
    plan: key.membership.plan,
    permissions: granted,
    user: key.user,
    // `app` acting `onBehalfOfUserId` is what the actor schema already models
    // for a non-human caller a person set up; an audit line therefore names both
    // the key and the member who issued it.
    actor: { type: 'app', id: key.keyId, label: key.keyName, onBehalfOfUserId: key.user.id },
  }
}

export function requireUser(request: FastifyRequest): AuthContext {
  if (!request.auth) throw new UnauthorizedError()
  return request.auth
}

/**
 * The single place a tenant id becomes trusted.
 *
 * The client proposes a tenant (header or query); this checks it against the
 * user's memberships and resolves the role's permissions. A tenant id that is
 * not in the membership list is reported as "not found", not "forbidden", so
 * the API does not confirm the existence of other tenants.
 */
export function requireTenant(request: FastifyRequest, permission: Permission): TenantContext {
  const key = request.apiKey
  if (key) return tenantFromApiKey(key, permission)

  const auth = requireUser(request)

  const requested =
    (request.headers['x-tenant-id'] as string | undefined) ??
    (request.query as { tenantId?: string } | undefined)?.tenantId ??
    (auth.memberships.length === 1 ? auth.memberships[0]!.tenantId : undefined)

  if (!requested) {
    throw new ForbiddenError('No tenant selected. Send an `x-tenant-id` header.')
  }

  const membership = auth.memberships.find((candidate) => candidate.tenantId === requested)
  if (!membership) {
    throw new ForbiddenError('You do not have access to this workspace.')
  }

  const permissions = resolvePermissions(membership.role)
  if (!permissions.includes(permission)) {
    throw new ForbiddenError(`Your role (${membership.role}) cannot perform this action.`)
  }

  return {
    tenantId: membership.tenantId,
    role: membership.role,
    plan: membership.plan,
    permissions,
    user: auth.user,
    actor: { type: 'user', id: auth.user.id, label: auth.user.email },
  }
}
