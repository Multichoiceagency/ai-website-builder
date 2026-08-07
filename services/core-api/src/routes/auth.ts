import type { FastifyPluginAsync } from 'fastify'
import { resolvePermissions } from '@platform/permissions'
import { loginInputSchema, registerInputSchema, type SessionContext } from '@platform/schemas'
import { env } from '../config/env.js'
import { withTenant, withoutTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import { deleteSession, generateSessionToken, insertSession } from '../db/repositories/sessions.js'
import {
  insertMembership,
  insertOrganization,
  insertTenant,
  listMembershipsForUser,
} from '../db/repositories/tenants.js'
import { findUserByEmail, insertUser } from '../db/repositories/users.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { ConflictError, UnauthorizedError } from '../lib/errors.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { ok } from '../lib/response.js'
import { uniqueSlug } from '../lib/slug.js'
import { parseOrThrow } from '../lib/validate.js'
import { clearSessionCookie, requireUser, setSessionCookie } from '../plugins/auth.js'

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

const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Sign up. Creates the organization, its first tenant and an owner
   * membership in one transaction — a user without a workspace is a state the
   * rest of the system should never have to handle.
   */
  app.post('/register', async (request, reply) => {
    const input = parseOrThrow(registerInputSchema, request.body, 'registration')
    const passwordHash = await hashPassword(input.password)

    const result = await withoutTenant(async (tx) => {
      const existing = await findUserByEmail(tx, input.email)
      if (existing) throw new ConflictError('An account with that e-mail already exists.')

      const orgSlug = await uniqueSlug(input.organizationName, async (candidate) => {
        const [row] = await tx<{ id: string }[]>`SELECT id FROM organizations WHERE slug = ${candidate} LIMIT 1`
        return Boolean(row)
      })
      const tenantSlug = await uniqueSlug(input.organizationName, async (candidate) => {
        const [row] = await tx<{ id: string }[]>`SELECT id FROM tenants WHERE slug = ${candidate} LIMIT 1`
        return Boolean(row)
      })

      const organization = await insertOrganization(tx, { name: input.organizationName, slug: orgSlug })
      const tenant = await insertTenant(tx, {
        organizationId: organization.id,
        name: input.organizationName,
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
