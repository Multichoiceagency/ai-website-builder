import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { limitsForPlan, planAtLeast } from '@platform/permissions'
import {
  agencyClientSchema,
  auditExportQuerySchema,
  clientWorkspaceOverviewSchema,
  createAgencyClientInputSchema,
  createAgencyGrantInputSchema,
  createScimTokenInputSchema,
  scimUserInputSchema,
  updateWhiteLabelInputSchema,
  upsertSsoConfigInputSchema,
  uuidSchema,
} from '@platform/schemas'
import { withTenant, withoutTenant } from '../db/client.js'
import {
  attachClientTenant,
  countAuditEvents,
  deactivateScimUser,
  findSsoConfiguration,
  findTenantHierarchy,
  findWhiteLabelSettings,
  insertGrant,
  insertScimToken,
  listAuditEventsForExport,
  listClientOverview,
  listGrantedClientIds,
  listGrantsForAgency,
  listScimTokens,
  listScimUsers,
  loadClientWorkspaceCounts,
  markTenantAsAgency,
  recordAgencyAuditEvent,
  resolveScimTokenTenant,
  revokeGrant,
  revokeScimToken,
  saveWhiteLabelSettings,
  upsertScimUser,
  upsertSsoConfiguration,
} from '../db/repositories/agency.js'
import { insertTenant } from '../db/repositories/tenants.js'
import {
  assertEnterprise,
  assertWhiteLabelAllowed,
  requireAgencyTenant,
  requireClientAccess,
} from '../lib/agency/access.js'
import {
  displayNameFor,
  extractBearerToken,
  generateScimToken,
  hashScimToken,
  primaryEmail,
  ssoConfigColumn,
} from '../lib/agency/sso.js'
import { mergeWhiteLabelSettings, isDashboardBrandingOnly } from '../lib/agency/white-label.js'
import { BadRequestError, NotFoundError, UnauthorizedError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { uniqueSlug } from '../lib/slug.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

const clientParamsSchema = z.object({ clientTenantId: uuidSchema })
const grantParamsSchema = z.object({ grantId: uuidSchema })
const tokenParamsSchema = z.object({ tokenId: uuidSchema })
const externalIdParamsSchema = z.object({ externalId: z.string().min(1).max(200) })

/**
 * SCIM authenticates with a bearer token and nothing else — no session, no
 * tenant header — so the tenant is resolved from the token's hash through the
 * narrow SECURITY DEFINER function in migration 0009.
 */
async function requireScimTenant(request: FastifyRequest): Promise<string> {
  const token = extractBearerToken(request.headers.authorization)
  if (!token) throw new UnauthorizedError('SCIM provisioning requires a bearer token.')

  const tenantId = await withoutTenant((tx) => resolveScimTokenTenant(tx, hashScimToken(token)))
  // One message for "no such token" and "revoked token": the difference is not
  // the caller's business.
  if (!tenantId) throw new UnauthorizedError('Unknown or revoked SCIM token.')

  return tenantId
}

const agencyRoutes: FastifyPluginAsync = async (app) => {
  // -------------------------------------------------------------------------
  // Hierarchy
  // -------------------------------------------------------------------------

  /** What this workspace is and what its plan entitles it to. */
  app.get('/', async (request, reply) => {
    const context = requireTenant(request, 'tenant:read')
    const hierarchy = await withoutTenant((tx) => findTenantHierarchy(tx, context.tenantId))
    if (!hierarchy) throw new NotFoundError('Workspace')

    const limits = limitsForPlan(context.plan)
    return reply.send(
      ok({
        tenantId: context.tenantId,
        plan: context.plan,
        isAgency: hierarchy.isAgency,
        parentTenantId: hierarchy.parentTenantId,
        canBeAgency: planAtLeast(context.plan, 'advanced'),
        entitlements: {
          whiteLabel: limits.whiteLabel,
          sso: planAtLeast(context.plan, 'enterprise'),
          scim: planAtLeast(context.plan, 'enterprise'),
          auditExport: planAtLeast(context.plan, 'enterprise'),
        },
      }),
    )
  })

  app.post('/enable', async (request, reply) => {
    const context = requireTenant(request, 'tenant:write')
    if (!planAtLeast(context.plan, 'advanced')) {
      throw new BadRequestError('Agency mode is available on the Advanced and Enterprise plans.')
    }

    const hierarchy = await withoutTenant((tx) => findTenantHierarchy(tx, context.tenantId))
    if (!hierarchy) throw new NotFoundError('Workspace')
    if (hierarchy.parentTenantId) {
      throw new BadRequestError('A client workspace cannot also be an agency. The hierarchy is one level deep.')
    }

    await withoutTenant((tx) => markTenantAsAgency(tx, context.tenantId))
    return reply.send(ok({ tenantId: context.tenantId, isAgency: true }))
  })

  app.get('/clients', async (request, reply) => {
    const context = await requireAgencyTenant(request, 'tenant:read')

    const { clients, grantedIds } = await withoutTenant(async (tx) => ({
      clients: await listClientOverview(tx, context.tenantId),
      grantedIds: new Set(await listGrantedClientIds(tx, context.tenantId, context.user.id)),
    }))

    return reply.send(
      ok(
        clients.map((client) =>
          agencyClientSchema.parse({
            tenantId: client.tenantId,
            name: client.name,
            slug: client.slug,
            plan: client.plan,
            createdAt: client.createdAt,
            siteCount: client.siteCount,
            memberCount: client.memberCount,
            hasActiveGrant: grantedIds.has(client.tenantId),
          }),
        ),
      ),
    )
  })

  /**
   * Create a client workspace.
   *
   * Deliberately creates *no* membership for the agency user. Ownership puts
   * the client in the list; reaching into it still needs a grant. Making
   * creation grant access would quietly reintroduce the thing this model
   * exists to prevent.
   */
  app.post('/clients', async (request, reply) => {
    const context = await requireAgencyTenant(request, 'tenant:write')
    const input = parseOrThrow(createAgencyClientInputSchema, request.body, 'client workspace')

    const agency = await withoutTenant((tx) => findTenantHierarchy(tx, context.tenantId))
    if (!agency) throw new NotFoundError('Workspace')

    const client = await withoutTenant(async (tx) => {
      const slug = await uniqueSlug(input.slug, async (candidate) => {
        const [row] = await tx<{ id: string }[]>`SELECT id FROM tenants WHERE slug = ${candidate} LIMIT 1`
        return Boolean(row)
      })

      const created = await insertTenant(tx, {
        organizationId: agency.organizationId,
        name: input.name,
        slug,
        plan: input.plan,
      })

      await attachClientTenant(tx, { agencyTenantId: context.tenantId, clientTenantId: created.id })
      return created
    })

    await withTenant(context.tenantId, (tx) =>
      recordAgencyAuditEvent(tx, {
        tenantId: context.tenantId,
        name: 'agency.client_created',
        actor: { ...context.actor },
        resourceType: 'tenant',
        resourceId: client.id,
        payload: { slug: client.slug, plan: client.plan },
      }),
    )

    return reply.status(201).send(ok(client))
  })

  // -------------------------------------------------------------------------
  // Grants
  // -------------------------------------------------------------------------

  app.get('/grants', async (request, reply) => {
    const context = await requireAgencyTenant(request, 'member:manage')
    const grants = await withoutTenant((tx) => listGrantsForAgency(tx, context.tenantId))
    return reply.send(ok(grants))
  })

  app.post('/clients/:clientTenantId/grants', async (request, reply) => {
    const context = await requireAgencyTenant(request, 'member:manage')
    const { clientTenantId } = parseOrThrow(clientParamsSchema, request.params, 'client id')
    const input = parseOrThrow(createAgencyGrantInputSchema, request.body, 'grant')

    const client = await withoutTenant((tx) => findTenantHierarchy(tx, clientTenantId))
    if (!client || client.parentTenantId !== context.tenantId) {
      throw new NotFoundError('Client workspace')
    }

    const expiresAt = new Date(Date.now() + input.expiresInHours * 3_600_000)
    const grant = await withoutTenant((tx) =>
      insertGrant(tx, {
        agencyTenantId: context.tenantId,
        clientTenantId,
        userId: input.userId,
        role: input.role,
        reason: input.reason,
        grantedBy: context.user.id,
        expiresAt,
      }),
    )

    // Written into the *client's* audit log, because that is the workspace
    // whose owner most needs to be able to see who was let in.
    await withTenant(clientTenantId, (tx) =>
      recordAgencyAuditEvent(tx, {
        tenantId: clientTenantId,
        name: 'agency.grant_created',
        actor: { ...context.actor },
        resourceType: 'agency_grant',
        resourceId: grant.id,
        payload: {
          agencyTenantId: context.tenantId,
          userId: input.userId,
          role: input.role,
          reason: input.reason,
          expiresAt: expiresAt.toISOString(),
        },
      }),
    )

    return reply.status(201).send(ok(grant))
  })

  app.delete('/grants/:grantId', async (request, reply) => {
    const context = await requireAgencyTenant(request, 'member:manage')
    const { grantId } = parseOrThrow(grantParamsSchema, request.params, 'grant id')

    const grants = await withoutTenant((tx) => listGrantsForAgency(tx, context.tenantId))
    const grant = grants.find((candidate) => candidate.id === grantId)
    if (!grant) throw new NotFoundError('Grant')

    const revoked = await withoutTenant((tx) => revokeGrant(tx, context.tenantId, grantId))
    if (!revoked) throw new BadRequestError('That grant was already revoked.')

    await withTenant(grant.clientTenantId, (tx) =>
      recordAgencyAuditEvent(tx, {
        tenantId: grant.clientTenantId,
        name: 'agency.grant_revoked',
        actor: { ...context.actor },
        resourceType: 'agency_grant',
        resourceId: grantId,
        payload: { agencyTenantId: context.tenantId, userId: grant.userId, role: grant.role },
      }),
    )

    return reply.send(ok({ revoked: true }))
  })

  /**
   * Step into a client workspace.
   *
   * The counts below are read inside a transaction bound to the *client*
   * tenant, so RLS is doing its normal job — the grant produced the context,
   * it did not bypass the policy.
   */
  app.get('/clients/:clientTenantId/overview', async (request, reply) => {
    const { clientTenantId } = parseOrThrow(clientParamsSchema, request.params, 'client id')
    const access = await requireClientAccess(request, clientTenantId, 'tenant:read')

    const client = await withoutTenant((tx) => findTenantHierarchy(tx, clientTenantId))
    if (!client) throw new NotFoundError('Client workspace')

    const counts = await withTenant(clientTenantId, async (tx) => {
      const result = await loadClientWorkspaceCounts(tx, clientTenantId)

      // Support access that leaves no trace is indistinguishable from a breach.
      await recordAgencyAuditEvent(tx, {
        tenantId: clientTenantId,
        name: 'agency.client_accessed',
        actor: { ...access.actor },
        resourceType: 'tenant',
        resourceId: clientTenantId,
        payload: {
          agencyTenantId: access.agencyTenantId,
          grantId: access.grant.id,
          role: access.role,
        },
      })

      return result
    })

    return reply.send(
      ok(
        clientWorkspaceOverviewSchema.parse({
          tenantId: clientTenantId,
          name: client.name,
          plan: client.plan,
          role: access.role,
          permissions: access.permissions,
          grantExpiresAt: access.grant.expiresAt,
          siteCount: counts.siteCount,
          pageCount: counts.pageCount,
          publishedPageCount: counts.publishedPageCount,
        }),
      ),
    )
  })

  // -------------------------------------------------------------------------
  // White label
  // -------------------------------------------------------------------------

  app.get('/white-label', async (request, reply) => {
    const context = requireTenant(request, 'tenant:read')
    const settings = await withTenant(context.tenantId, (tx) =>
      findWhiteLabelSettings(tx, context.tenantId),
    )

    return reply.send(
      ok({ settings, entitled: limitsForPlan(context.plan).whiteLabel, plan: context.plan }),
    )
  })

  app.put('/white-label', async (request, reply) => {
    const context = requireTenant(request, 'tenant:write')
    const patch = parseOrThrow(updateWhiteLabelInputSchema, request.body, 'white label settings')

    // Logo / colours / fonts personalise every dashboard. Custom domain and
    // hide-platform remain Advanced+ white-label entitlements.
    if (!isDashboardBrandingOnly(patch)) {
      assertWhiteLabelAllowed(context)
    }

    const settings = await withTenant(context.tenantId, async (tx) => {
      const current = await findWhiteLabelSettings(tx, context.tenantId)
      return saveWhiteLabelSettings(tx, context.tenantId, mergeWhiteLabelSettings(current, patch))
    })

    return reply.send(ok(settings))
  })

  // -------------------------------------------------------------------------
  // SSO — configuration only
  // -------------------------------------------------------------------------

  /**
   * There is no identity provider in this environment, so nothing here signs a
   * user in. `configured` describes the stored configuration and is false until
   * it is complete; it never claims a login would succeed.
   */
  app.get('/sso', async (request, reply) => {
    const context = requireTenant(request, 'tenant:read')
    assertEnterprise(context, 'Single sign-on')

    const configuration = await withTenant(context.tenantId, (tx) =>
      findSsoConfiguration(tx, context.tenantId),
    )

    return reply.send(
      ok({
        configuration,
        configured: configuration?.configured ?? false,
        // Honest about the gap rather than quietly implying a working login.
        loginEnabled: false,
        note: 'Configuration is stored and validated. No identity provider is connected in this environment, so no SSO session can be issued yet.',
      }),
    )
  })

  app.put('/sso', async (request, reply) => {
    const context = requireTenant(request, 'tenant:write')
    assertEnterprise(context, 'Single sign-on')
    const input = parseOrThrow(upsertSsoConfigInputSchema, request.body, 'SSO configuration')

    const configuration = await withTenant(context.tenantId, (tx) =>
      upsertSsoConfiguration(tx, context.tenantId, {
        protocol: input.protocol,
        enabled: input.enabled,
        defaultRole: input.defaultRole,
        config: ssoConfigColumn(input),
        clientSecret: input.protocol === 'oidc' ? input.clientSecret : undefined,
      }),
    )

    return reply.send(ok({ configuration, configured: configuration.configured, loginEnabled: false }))
  })

  // -------------------------------------------------------------------------
  // SCIM
  // -------------------------------------------------------------------------

  app.get('/scim/tokens', async (request, reply) => {
    const context = requireTenant(request, 'member:manage')
    assertEnterprise(context, 'SCIM provisioning')

    const tokens = await withTenant(context.tenantId, (tx) => listScimTokens(tx, context.tenantId))
    return reply.send(ok(tokens))
  })

  /** The plaintext token is in this response and nowhere else, ever. */
  app.post('/scim/tokens', async (request, reply) => {
    const context = requireTenant(request, 'member:manage')
    assertEnterprise(context, 'SCIM provisioning')
    const input = parseOrThrow(createScimTokenInputSchema, request.body ?? {}, 'token')

    const generated = generateScimToken()
    const token = await withTenant(context.tenantId, (tx) =>
      insertScimToken(tx, {
        tenantId: context.tenantId,
        name: input.name,
        tokenHash: generated.hash,
        lastFour: generated.lastFour,
      }),
    )

    return reply.status(201).send(ok({ token, secret: generated.token }))
  })

  app.delete('/scim/tokens/:tokenId', async (request, reply) => {
    const context = requireTenant(request, 'member:manage')
    assertEnterprise(context, 'SCIM provisioning')
    const { tokenId } = parseOrThrow(tokenParamsSchema, request.params, 'token id')

    const revoked = await withTenant(context.tenantId, (tx) =>
      revokeScimToken(tx, context.tenantId, tokenId),
    )
    if (!revoked) throw new NotFoundError('Token')

    return reply.send(ok({ revoked: true }))
  })

  app.get('/scim/v2/Users', async (request, reply) => {
    const tenantId = await requireScimTenant(request)
    const users = await withTenant(tenantId, (tx) => listScimUsers(tx, tenantId))

    return reply.send(
      ok({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: users.length,
        Resources: users,
      }),
    )
  })

  /**
   * Provision (or re-provision) a user.
   *
   * This records the *directory's* view of a person. It deliberately does not
   * create a platform user or a membership: that would mint an account nobody
   * can sign into until SSO is genuinely connected.
   */
  app.post('/scim/v2/Users', async (request, reply) => {
    const tenantId = await requireScimTenant(request)
    const input = parseOrThrow(scimUserInputSchema, request.body, 'SCIM user')

    const { user, defaultRole } = await withTenant(tenantId, async (tx) => {
      const configuration = await findSsoConfiguration(tx, tenantId)
      const role = configuration?.defaultRole ?? 'viewer'

      return {
        defaultRole: role,
        user: await upsertScimUser(tx, {
          tenantId,
          externalId: input.externalId,
          userName: input.userName,
          displayName: displayNameFor(input),
          email: primaryEmail(input),
          role,
          active: input.active,
          raw: { ...input },
        }),
      }
    })

    return reply.status(201).send(ok({ user, defaultRole, provisionedIntoPlatform: false }))
  })

  app.delete('/scim/v2/Users/:externalId', async (request, reply) => {
    const tenantId = await requireScimTenant(request)
    const { externalId } = parseOrThrow(externalIdParamsSchema, request.params, 'external id')

    const user = await withTenant(tenantId, (tx) => deactivateScimUser(tx, tenantId, externalId))
    if (!user) throw new NotFoundError('SCIM user')

    return reply.send(ok(user))
  })

  // -------------------------------------------------------------------------
  // Audit export
  // -------------------------------------------------------------------------

  /**
   * Paginated export of this tenant's audit trail. Ordered oldest-first so a
   * consumer paging through it gets a stable sequence even while new events
   * arrive at the other end.
   */
  app.get('/audit/export', async (request, reply) => {
    const context = requireTenant(request, 'audit:read')
    assertEnterprise(context, 'Audit export')
    const query = parseOrThrow(auditExportQuerySchema, request.query ?? {}, 'query')

    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestError('`from` must be earlier than `to`.')
    }

    const { rows, total } = await withTenant(context.tenantId, async (tx) => ({
      total: await countAuditEvents(tx, context.tenantId, query),
      rows: await listAuditEventsForExport(tx, context.tenantId, {
        from: query.from,
        to: query.to,
        name: query.name,
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
      }),
    }))

    return reply.send(ok(rows, { total, page: query.page, limit: query.limit }))
  })
}

export default agencyRoutes
