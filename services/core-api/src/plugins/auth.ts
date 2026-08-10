import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { resolvePermissions } from '@platform/permissions'
import type { Actor, Membership, Permission, Plan, Role, User } from '@platform/schemas'
import { env, isProduction } from '../config/env.js'
import { withoutTenant } from '../db/client.js'
import { findValidSession } from '../db/repositories/sessions.js'
import { listMembershipsForUser } from '../db/repositories/tenants.js'
import { findUserById } from '../db/repositories/users.js'
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js'

export interface AuthContext {
  user: User
  memberships: Membership[]
  sessionToken: string
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

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('auth', null)

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
      return { user, memberships, sessionToken: token } satisfies AuthContext
    })

    request.auth = context
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
