import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { limitsForPlan, planAtLeast, resolvePermissions } from '@platform/permissions'
import {
  PLANS,
  ROLES,
  addDomainInputSchema,
  aiAutonomyCapabilitySchema,
  changeMemberRoleInputSchema,
  confirmInputSchema,
  createApiKeyInputSchema,
  createInvitationInputSchema,
  createWebhookEndpointInputSchema,
  putSecretInputSchema,
  removeMemberInputSchema,
  settingsDefinition,
  settingsScopeSchema,
  uuidSchema,
  SETTINGS_REGISTRY,
  type DnsInstruction,
  type Permission,
  type Role,
  type SettingsScope,
} from '@platform/schemas'
import { withTenant, withoutTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import { findSiteById } from '../db/repositories/sites.js'
import { countTenantMembers, findTenantById } from '../db/repositories/tenants.js'
import {
  cancelDataRequest,
  countDomains,
  countOwners,
  deleteDomain,
  deleteMember,
  deleteSecret,
  deleteWebhookEndpoint,
  findMemberRole,
  findSettingsDocument,
  insertApiKey,
  insertDataRequest,
  insertDomain,
  insertInvitation,
  insertWebhookEndpoint,
  listApiKeys,
  listDataRequests,
  listDomains,
  listFilteredAuditEvents,
  listInvitations,
  listSecretStates,
  listSettingsDocuments,
  listTeamMembers,
  listWebhookDeliveries,
  listWebhookEndpoints,
  markDomainVerified,
  putSecret,
  recordSettingsAudit,
  revokeApiKey,
  revokeInvitation,
  rotateWebhookSecret,
  setPrimaryDomain,
  updateMemberRole,
  upsertSettingsDocument,
} from '../db/repositories/settings.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, PlanLimitError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant, type TenantContext } from '../plugins/auth.js'

/**
 * Settings (§39, §58–§62, §97/§98) and commerce settings (§13, §75, §76).
 *
 * Four properties this module is responsible for:
 *
 *   * **No secret is ever in a response.** Credentials go in through
 *     `PUT …/secrets` and come back only as `{ configured, hint }`. There is no
 *     handler here that reads a plaintext credential, and the test suite
 *     asserts the raw value is absent from every body.
 *   * **Plan gates live here, not in the browser.** The dashboard may explain a
 *     limit; only these handlers refuse one.
 *   * **Destructive actions are confirmed and audited.** Role changes, member
 *     removal, key revocation, secret rotation, domain removal and workspace
 *     deletion all require an explicit `confirm` in the body and all write an
 *     `audit_events` row (ADR-0007).
 *   * **Documents are validated on both sides of the database.** A stored blob
 *     is parsed through its schema on read, so a document written by an older
 *     version of the contract surfaces as defaults rather than as a broken UI.
 */

const INVITATION_TTL_SECONDS = 7 * 24 * 60 * 60
const WORKSPACE_DELETION_GRACE_DAYS = 30

const scopeParams = z.object({ scope: settingsScopeSchema })
const keyParams = z.object({ key: z.string().min(2).max(40) })

/** `platform` keys are addressed at the root; `commerce` keys under `/commerce`. */
function definitionOrThrow(scope: SettingsScope, key: string) {
  const definition = settingsDefinition(scope, key)
  if (!definition) throw new NotFoundError('Settings section')
  return definition
}

/**
 * Read a document, filling every absent field from the section's own defaults.
 * A workspace that has never opened a settings screen still gets a complete,
 * valid document rather than an empty object the UI has to defend against.
 */
async function readDocument(context: TenantContext, scope: SettingsScope, key: string): Promise<unknown> {
  const definition = definitionOrThrow(scope, key)
  const stored = await withTenant(context.tenantId, (tx) => findSettingsDocument(tx, context.tenantId, scope, key))

  const parsed = definition.schema.safeParse(stored?.value ?? {})
  return parsed.success ? parsed.data : definition.schema.parse({})
}

/** Merged patch semantics: a partial PUT cannot silently reset absent fields. */
async function writeDocument(
  context: TenantContext,
  scope: SettingsScope,
  key: string,
  body: unknown,
): Promise<unknown> {
  const definition = definitionOrThrow(scope, key)

  if (definition.minimumPlan && !planAtLeast(context.plan, definition.minimumPlan)) {
    throw new PlanLimitError(
      `${definition.label} settings require the ${definition.minimumPlan} plan. You are on ${context.plan}.`,
      { plan: context.plan, requiredPlan: definition.minimumPlan, section: definition.key },
    )
  }

  const current = await readDocument(context, scope, key)
  const merged = { ...(current as Record<string, unknown>), ...(body as Record<string, unknown>) }
  const value = parseOrThrow(definition.schema, merged, `${definition.label} settings`)

  await withTenant(context.tenantId, async (tx) => {
    await upsertSettingsDocument(tx, {
      tenantId: context.tenantId,
      scope,
      key,
      value,
      updatedBy: context.user.email,
    })
    await recordSettingsAudit(tx, {
      tenantId: context.tenantId,
      name: `settings.${scope}.${key}_updated`,
      actor: { ...context.actor },
      resourceType: 'settings',
      resourceId: `${scope}/${key}`,
      payload: { fields: Object.keys(body as Record<string, unknown>) },
    })
  })

  return value
}

/**
 * AI autonomy is an Advanced+ entitlement *and* a permission. Both are checked
 * server-side: a role without `ai:autonomous` cannot enable it even on a plan
 * that includes it, and no plan below Advanced can enable it at all.
 */
function assertAutonomyAllowed(context: TenantContext, body: Record<string, unknown>): void {
  const autonomy = body.autonomy
  if (!autonomy || typeof autonomy !== 'object') return

  const enabling = Object.entries(autonomy as Record<string, unknown>).filter(([, value]) => value === true)
  if (enabling.length === 0) return

  for (const [capability] of enabling) {
    if (!aiAutonomyCapabilitySchema.safeParse(capability).success) {
      throw new BadRequestError(`Unknown AI capability: ${capability}.`)
    }
  }

  if (!limitsForPlan(context.plan).autonomousOptimization) {
    throw new PlanLimitError(
      `Autonomous AI is available from the Advanced plan. You are on ${context.plan}.`,
      { plan: context.plan, requiredPlan: 'advanced', capabilities: enabling.map(([name]) => name) },
    )
  }

  if (!context.permissions.includes('ai:autonomous')) {
    throw new ForbiddenError(`Your role (${context.role}) cannot enable autonomous AI.`)
  }
}

/**
 * Where connected domains must point. Environment-specific — a deployment that
 * does not set these serves the placeholders below, which are deliberately
 * obviously-not-real so nobody pastes one into production DNS.
 */
const EDGE_HOSTNAME = process.env.PLATFORM_EDGE_HOSTNAME ?? 'edge.example.invalid'
const EDGE_IPV4 = process.env.PLATFORM_EDGE_IPV4 ?? '203.0.113.10'

/**
 * DNS a user can copy, generated per domain rather than written on a help page:
 * an apex and a subdomain need different records, and handing someone the wrong
 * one is the most expensive support call this product has.
 */
function dnsInstructionsFor(hostname: string, verificationToken: string): DnsInstruction[] {
  const isApex = hostname.split('.').length <= 2

  return [
    isApex
      ? {
          type: 'A',
          name: '@',
          value: EDGE_IPV4,
          note: 'Point the apex record at the platform edge.',
        }
      : {
          type: 'CNAME',
          name: hostname.split('.')[0]!,
          value: EDGE_HOSTNAME,
          note: 'Point the subdomain at the platform edge.',
        },
    {
      type: 'TXT',
      name: `_platform-verify.${hostname}`,
      value: verificationToken,
      note: 'Proves you control this domain. It may be removed once verified.',
    },
  ]
}

const settingsRoutes: FastifyPluginAsync = async (app) => {
  // -------------------------------------------------------------------------
  // Index
  // -------------------------------------------------------------------------

  /** Which sections exist, what they need, and what this plan may write. */
  app.get('/', async (request, reply) => {
    const context = requireTenant(request, 'tenant:read')

    return reply.send(
      ok({
        plan: context.plan,
        role: context.role,
        sections: SETTINGS_REGISTRY.map((definition) => ({
          scope: definition.scope,
          key: definition.key,
          label: definition.label,
          minimumPlan: definition.minimumPlan,
          writable:
            !definition.minimumPlan || planAtLeast(context.plan, definition.minimumPlan),
        })),
      }),
    )
  })

  // -------------------------------------------------------------------------
  // Plan & usage
  // -------------------------------------------------------------------------

  app.get('/plan', async (request, reply) => {
    const context = requireTenant(request, 'billing:read')
    const limits = limitsForPlan(context.plan)

    const usage = await withTenant(context.tenantId, async (tx) => {
      const [sites] = await tx<{ count: string }[]>`
        SELECT count(*)::text AS count FROM sites WHERE tenant_id = ${context.tenantId}
      `
      const [pages] = await tx<{ count: string }[]>`
        SELECT count(*)::text AS count FROM pages WHERE tenant_id = ${context.tenantId}
      `
      return { sites: Number(sites!.count), pages: Number(pages!.count), domains: await countDomains(tx, context.tenantId) }
    })

    const members = await withoutTenant((tx) => countTenantMembers(tx, context.tenantId))

    // What the next tier adds, computed rather than written down — a hard-coded
    // upgrade blurb goes stale the first time a limit changes.
    const next = PLANS[PLANS.indexOf(context.plan) + 1] ?? null

    return reply.send(
      ok({
        plan: context.plan,
        limits,
        usage: { ...usage, users: members },
        nextPlan: next,
        nextPlanLimits: next ? limitsForPlan(next) : null,
      }),
    )
  })

  // -------------------------------------------------------------------------
  // Team (§59)
  // -------------------------------------------------------------------------

  app.get('/team', async (request, reply) => {
    const context = requireTenant(request, 'member:read')

    const members = await withoutTenant((tx) => listTeamMembers(tx, context.tenantId))
    const invitations = await withTenant(context.tenantId, (tx) => listInvitations(tx, context.tenantId))

    return reply.send(
      ok({
        members,
        invitations,
        limits: { users: limitsForPlan(context.plan).users },
        // Resolved from the permission engine so the "what can this role do?"
        // panel cannot drift from what the server enforces.
        roles: ROLES.map((role) => ({ role, permissions: resolvePermissions(role as Role) })),
      }),
    )
  })

  app.post('/team/invitations', async (request, reply) => {
    const context = requireTenant(request, 'member:invite')
    const input = parseOrThrow(createInvitationInputSchema, request.body, 'invitation')

    const limits = limitsForPlan(context.plan)
    const members = await withoutTenant((tx) => countTenantMembers(tx, context.tenantId))
    const pending = await withTenant(context.tenantId, (tx) => listInvitations(tx, context.tenantId))
    const open = pending.filter((entry) => !entry.acceptedAt && !entry.revokedAt).length

    if (members + open >= limits.users) {
      throw new PlanLimitError(
        `Your ${context.plan} plan includes ${limits.users} seat(s). Upgrade to invite more people.`,
        { plan: context.plan, limit: limits.users, current: members + open },
      )
    }

    const { invitation } = await withTenant(context.tenantId, async (tx) => {
      const created = await insertInvitation(tx, {
        tenantId: context.tenantId,
        email: input.email,
        role: input.role,
        invitedBy: context.user.email,
        ttlSeconds: INVITATION_TTL_SECONDS,
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : ''
        if (message.includes('settings_invitations_pending_idx')) {
          throw new ConflictError('That address already has a pending invitation.')
        }
        throw error
      })
      return created
    })

    const event = buildEvent({
      name: 'member.invited',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'invitation', id: invitation.id },
      payload: { email: invitation.email, role: invitation.role },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    // The token is deliberately not in this response. It belongs in the
    // invitation mail and nowhere a browser can read it.
    return reply.status(201).send(ok(invitation))
  })

  app.delete('/team/invitations/:invitationId', async (request, reply) => {
    const context = requireTenant(request, 'member:manage')
    const { invitationId } = parseOrThrow(
      z.object({ invitationId: uuidSchema }),
      request.params,
      'invitation id',
    )

    const revoked = await withTenant(context.tenantId, async (tx) => {
      const done = await revokeInvitation(tx, context.tenantId, invitationId)
      if (done) {
        await recordSettingsAudit(tx, {
          tenantId: context.tenantId,
          name: 'settings.invitation_revoked',
          actor: { ...context.actor },
          resourceType: 'invitation',
          resourceId: invitationId,
          payload: {},
        })
      }
      return done
    })
    if (!revoked) throw new NotFoundError('Invitation')

    return reply.send(ok({ revoked: true }))
  })

  /**
   * Changing a role is destructive: it can strip the last owner of their own
   * workspace. Hence the explicit confirmation and the last-owner guard.
   */
  app.patch('/team/members/:userId', async (request, reply) => {
    const context = requireTenant(request, 'member:manage')
    const { userId } = parseOrThrow(z.object({ userId: uuidSchema }), request.params, 'user id')
    const input = parseOrThrow(changeMemberRoleInputSchema, request.body ?? {}, 'role change')

    const previousRole = await withoutTenant(async (tx) => {
      const current = await findMemberRole(tx, context.tenantId, userId)
      if (!current) throw new NotFoundError('Member')

      if (current === 'owner' && input.role !== 'owner') {
        const owners = await countOwners(tx, context.tenantId)
        if (owners <= 1) {
          throw new ConflictError('A workspace must keep at least one owner.')
        }
      }

      await updateMemberRole(tx, context.tenantId, userId, input.role)
      return current
    })

    const event = buildEvent({
      name: 'member.role_changed',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'user', id: userId },
      payload: { from: previousRole, to: input.role },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok({ userId, role: input.role, previousRole }))
  })

  app.delete('/team/members/:userId', async (request, reply) => {
    const context = requireTenant(request, 'member:manage')
    const { userId } = parseOrThrow(z.object({ userId: uuidSchema }), request.params, 'user id')
    parseOrThrow(removeMemberInputSchema, request.body ?? {}, 'confirmation')

    const removedRole = await withoutTenant(async (tx) => {
      const current = await findMemberRole(tx, context.tenantId, userId)
      if (!current) throw new NotFoundError('Member')

      if (current === 'owner' && (await countOwners(tx, context.tenantId)) <= 1) {
        throw new ConflictError('A workspace must keep at least one owner.')
      }

      await deleteMember(tx, context.tenantId, userId)
      return current
    })

    await withTenant(context.tenantId, (tx) =>
      recordSettingsAudit(tx, {
        tenantId: context.tenantId,
        name: 'settings.member_removed',
        actor: { ...context.actor },
        resourceType: 'user',
        resourceId: userId,
        payload: { role: removedRole },
      }),
    )

    return reply.send(ok({ removed: true }))
  })

  // -------------------------------------------------------------------------
  // Domains (§58)
  // -------------------------------------------------------------------------

  app.get('/domains', async (request, reply) => {
    const context = requireTenant(request, 'domain:read')

    const domains = await withTenant(context.tenantId, (tx) => listDomains(tx, context.tenantId))

    return reply.send(
      ok({
        domains: domains.map((domain) => ({
          ...domain,
          state: domain.verifiedAt ? 'verified' : 'pending_verification',
          dns: dnsInstructionsFor(domain.hostname, `platform-verify=${domain.id}`),
        })),
        limits: { domains: limitsForPlan(context.plan).domains },
      }),
    )
  })

  app.post('/domains', async (request, reply) => {
    const context = requireTenant(request, 'domain:write')
    const input = parseOrThrow(addDomainInputSchema, request.body, 'domain')
    const limits = limitsForPlan(context.plan)

    const domain = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, input.siteId)
      if (!site) throw new NotFoundError('Site')

      const current = await countDomains(tx, context.tenantId)
      if (current >= limits.domains) {
        throw new PlanLimitError(
          `Your ${context.plan} plan includes ${limits.domains} domain(s). Upgrade to connect more.`,
          { plan: context.plan, limit: limits.domains, current },
        )
      }

      return insertDomain(tx, {
        tenantId: context.tenantId,
        siteId: input.siteId,
        hostname: input.hostname,
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : ''
        if (message.includes('domains_hostname_key')) {
          throw new ConflictError('That hostname is already connected.')
        }
        throw error
      })
    })

    return reply.status(201).send(
      ok({ ...domain, state: 'pending_verification', dns: dnsInstructionsFor(domain.hostname, `platform-verify=${domain.id}`) }),
    )
  })

  /**
   * Verification is recorded, not performed — the DNS lookup belongs to the
   * edge, which is the only component that can see whether the record actually
   * resolves. This endpoint is what the edge calls back into.
   */
  app.post('/domains/:domainId/verify', async (request, reply) => {
    const context = requireTenant(request, 'domain:write')
    const { domainId } = parseOrThrow(z.object({ domainId: uuidSchema }), request.params, 'domain id')

    const verified = await withTenant(context.tenantId, (tx) => markDomainVerified(tx, context.tenantId, domainId))
    if (!verified) throw new NotFoundError('Domain')

    const event = buildEvent({
      name: 'domain.verified',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'domain', id: domainId },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok({ verified: true }))
  })

  app.post('/domains/:domainId/primary', async (request, reply) => {
    const context = requireTenant(request, 'domain:write')
    const { domainId } = parseOrThrow(z.object({ domainId: uuidSchema }), request.params, 'domain id')

    const done = await withTenant(context.tenantId, (tx) => setPrimaryDomain(tx, context.tenantId, domainId))
    if (!done) throw new NotFoundError('Domain')

    return reply.send(ok({ primary: domainId }))
  })

  app.delete('/domains/:domainId', async (request, reply) => {
    const context = requireTenant(request, 'domain:write')
    const { domainId } = parseOrThrow(z.object({ domainId: uuidSchema }), request.params, 'domain id')
    parseOrThrow(confirmInputSchema, request.body ?? {}, 'confirmation')

    const removed = await withTenant(context.tenantId, async (tx) => {
      const done = await deleteDomain(tx, context.tenantId, domainId)
      if (done) {
        await recordSettingsAudit(tx, {
          tenantId: context.tenantId,
          name: 'settings.domain_removed',
          actor: { ...context.actor },
          resourceType: 'domain',
          resourceId: domainId,
          payload: {},
        })
      }
      return done
    })
    if (!removed) throw new NotFoundError('Domain')

    return reply.send(ok({ removed: true }))
  })

  // -------------------------------------------------------------------------
  // Developer: API keys and webhooks (§61, §62)
  // -------------------------------------------------------------------------

  app.get('/api-keys', async (request, reply) => {
    const context = requireTenant(request, 'developer:read')
    const keys = await withTenant(context.tenantId, (tx) => listApiKeys(tx, context.tenantId))
    return reply.send(ok(keys))
  })

  /**
   * The one response in the platform that contains a live credential. It is
   * returned exactly once; afterwards only the masked hint exists.
   */
  app.post('/api-keys', async (request, reply) => {
    const context = requireTenant(request, 'developer:write')
    const input = parseOrThrow(createApiKeyInputSchema, request.body, 'API key')

    // A key can never out-grant the person who created it.
    const granted = new Set<string>(context.permissions)
    const invalid = input.scopes.filter((scope) => !granted.has(scope))
    if (invalid.length > 0) {
      throw new ForbiddenError(`You cannot grant scopes you do not hold: ${invalid.join(', ')}.`)
    }

    const created = await withTenant(context.tenantId, async (tx) => {
      const result = await insertApiKey(tx, {
        tenantId: context.tenantId,
        name: input.name,
        scopes: input.scopes,
        createdBy: context.user.email,
        live: true,
      })
      await recordSettingsAudit(tx, {
        tenantId: context.tenantId,
        name: 'settings.api_key_created',
        actor: { ...context.actor },
        resourceType: 'api_key',
        resourceId: result.key.id,
        payload: { name: input.name, scopes: input.scopes },
      })
      return result
    })

    return reply.status(201).send(ok({ ...created.key, secret: created.secret }))
  })

  app.delete('/api-keys/:keyId', async (request, reply) => {
    const context = requireTenant(request, 'developer:write')
    const { keyId } = parseOrThrow(z.object({ keyId: uuidSchema }), request.params, 'key id')
    parseOrThrow(confirmInputSchema, request.body ?? {}, 'confirmation')

    const revoked = await withTenant(context.tenantId, async (tx) => {
      const done = await revokeApiKey(tx, context.tenantId, keyId)
      if (done) {
        await recordSettingsAudit(tx, {
          tenantId: context.tenantId,
          name: 'settings.api_key_revoked',
          actor: { ...context.actor },
          resourceType: 'api_key',
          resourceId: keyId,
          payload: {},
        })
      }
      return done
    })
    if (!revoked) throw new NotFoundError('API key')

    return reply.send(ok({ revoked: true }))
  })

  app.get('/webhooks', async (request, reply) => {
    const context = requireTenant(request, 'developer:read')
    const endpoints = await withTenant(context.tenantId, (tx) => listWebhookEndpoints(tx, context.tenantId))
    return reply.send(ok(endpoints))
  })

  app.post('/webhooks', async (request, reply) => {
    const context = requireTenant(request, 'developer:write')
    const input = parseOrThrow(createWebhookEndpointInputSchema, request.body, 'webhook endpoint')

    if (!input.url.startsWith('https://')) {
      throw new BadRequestError('A webhook endpoint must use HTTPS.')
    }

    const created = await withTenant(context.tenantId, async (tx) => {
      const result = await insertWebhookEndpoint(tx, {
        tenantId: context.tenantId,
        url: input.url,
        events: input.events,
        active: input.active,
        createdBy: context.user.email,
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : ''
        if (message.includes('settings_webhook_endpoints_tenant_id_url_key')) {
          throw new ConflictError('That URL is already registered.')
        }
        throw error
      })

      await recordSettingsAudit(tx, {
        tenantId: context.tenantId,
        name: 'settings.webhook_created',
        actor: { ...context.actor },
        resourceType: 'webhook',
        resourceId: result.endpoint.id,
        payload: { url: input.url, events: input.events },
      })
      return result
    })

    // Same rule as an API key: the signing secret is shown once.
    return reply.status(201).send(ok({ ...created.endpoint, secret: created.secret }))
  })

  app.post('/webhooks/:endpointId/rotate', async (request, reply) => {
    const context = requireTenant(request, 'developer:write')
    const { endpointId } = parseOrThrow(z.object({ endpointId: uuidSchema }), request.params, 'endpoint id')
    parseOrThrow(confirmInputSchema, request.body ?? {}, 'confirmation')

    const rotated = await withTenant(context.tenantId, async (tx) => {
      const result = await rotateWebhookSecret(tx, context.tenantId, endpointId)
      if (result) {
        await recordSettingsAudit(tx, {
          tenantId: context.tenantId,
          name: 'settings.webhook_secret_rotated',
          actor: { ...context.actor },
          resourceType: 'webhook',
          resourceId: endpointId,
          payload: {},
        })
      }
      return result
    })
    if (!rotated) throw new NotFoundError('Webhook endpoint')

    return reply.send(ok({ ...rotated.endpoint, secret: rotated.secret }))
  })

  app.get('/webhooks/:endpointId/deliveries', async (request, reply) => {
    const context = requireTenant(request, 'developer:read')
    const { endpointId } = parseOrThrow(z.object({ endpointId: uuidSchema }), request.params, 'endpoint id')

    const deliveries = await withTenant(context.tenantId, (tx) =>
      listWebhookDeliveries(tx, context.tenantId, endpointId),
    )
    return reply.send(ok(deliveries))
  })

  app.delete('/webhooks/:endpointId', async (request, reply) => {
    const context = requireTenant(request, 'developer:write')
    const { endpointId } = parseOrThrow(z.object({ endpointId: uuidSchema }), request.params, 'endpoint id')
    parseOrThrow(confirmInputSchema, request.body ?? {}, 'confirmation')

    const removed = await withTenant(context.tenantId, async (tx) => {
      const done = await deleteWebhookEndpoint(tx, context.tenantId, endpointId)
      if (done) {
        await recordSettingsAudit(tx, {
          tenantId: context.tenantId,
          name: 'settings.webhook_removed',
          actor: { ...context.actor },
          resourceType: 'webhook',
          resourceId: endpointId,
          payload: {},
        })
      }
      return done
    })
    if (!removed) throw new NotFoundError('Webhook endpoint')

    return reply.send(ok({ removed: true }))
  })

  // -------------------------------------------------------------------------
  // Audit log
  // -------------------------------------------------------------------------

  app.get('/audit', async (request, reply) => {
    const context = requireTenant(request, 'audit:read')
    const query = parseOrThrow(
      z.object({
        name: z.string().max(120).optional(),
        actorId: z.string().max(200).optional(),
        resourceType: z.string().max(64).optional(),
        since: z.coerce.date().optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
      }),
      request.query ?? {},
      'audit filter',
    )

    const entries = await withTenant(context.tenantId, (tx) =>
      listFilteredAuditEvents(tx, context.tenantId, query),
    )
    return reply.send(ok(entries))
  })

  // -------------------------------------------------------------------------
  // Data & privacy (§97, §98)
  // -------------------------------------------------------------------------

  app.get('/data', async (request, reply) => {
    const context = requireTenant(request, 'tenant:read')
    const requests = await withTenant(context.tenantId, (tx) => listDataRequests(tx, context.tenantId))
    return reply.send(ok({ requests, retentionSettings: await readDocument(context, 'platform', 'data-retention') }))
  })

  /** A portable snapshot of everything this workspace configured. */
  app.post('/data/export', async (request, reply) => {
    const context = requireTenant(request, 'tenant:write')

    const snapshot = await withTenant(context.tenantId, async (tx) => {
      const documents = await listSettingsDocuments(tx, context.tenantId)
      const domains = await listDomains(tx, context.tenantId)
      const keys = await listApiKeys(tx, context.tenantId)
      const webhooks = await listWebhookEndpoints(tx, context.tenantId)
      // `keys` and `webhooks` carry hints only — the export is a document a
      // user may mail to themselves, so it must be as safe as a response body.
      return { documents, domains, apiKeys: keys, webhooks }
    })

    const members = await withoutTenant((tx) => listTeamMembers(tx, context.tenantId))

    const record = await withTenant(context.tenantId, async (tx) => {
      const created = await insertDataRequest(tx, {
        tenantId: context.tenantId,
        kind: 'export',
        status: 'ready',
        requestedBy: context.user.email,
        payload: { sections: snapshot.documents.length },
        scheduledInDays: null,
      })
      await recordSettingsAudit(tx, {
        tenantId: context.tenantId,
        name: 'settings.data_exported',
        actor: { ...context.actor },
        resourceType: 'tenant',
        resourceId: context.tenantId,
        payload: { sections: snapshot.documents.length },
      })
      return created
    })

    return reply.send(ok({ request: record, export: { ...snapshot, members } }))
  })

  /**
   * Workspace deletion is scheduled, not immediate.
   *
   * The mistake this guards against is deleting the wrong workspace, and an
   * immediate delete has no undo for exactly that mistake. The typed
   * confirmation must match the workspace slug, and the grace period leaves a
   * window in which the owner can cancel.
   */
  app.post('/data/delete-workspace', async (request, reply) => {
    const context = requireTenant(request, 'tenant:write')

    if (context.role !== 'owner') {
      throw new ForbiddenError('Only an owner can schedule the deletion of a workspace.')
    }

    const { confirm } = parseOrThrow(
      z.object({ confirm: z.string().min(1).max(64) }),
      request.body ?? {},
      'confirmation',
    )

    const tenant = await withoutTenant((tx) => findTenantById(tx, context.tenantId))
    if (!tenant) throw new NotFoundError('Workspace')

    if (confirm !== tenant.slug) {
      throw new BadRequestError(`Type the workspace slug (${tenant.slug}) to confirm deletion.`)
    }

    const record = await withTenant(context.tenantId, async (tx) => {
      const created = await insertDataRequest(tx, {
        tenantId: context.tenantId,
        kind: 'workspace_deletion',
        status: 'pending',
        requestedBy: context.user.email,
        payload: { slug: tenant.slug },
        scheduledInDays: WORKSPACE_DELETION_GRACE_DAYS,
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : ''
        if (message.includes('settings_data_requests_open_deletion_idx')) {
          throw new ConflictError('This workspace is already scheduled for deletion.')
        }
        throw error
      })

      await recordSettingsAudit(tx, {
        tenantId: context.tenantId,
        name: 'settings.workspace_deletion_scheduled',
        actor: { ...context.actor },
        resourceType: 'tenant',
        resourceId: context.tenantId,
        payload: { slug: tenant.slug, graceDays: WORKSPACE_DELETION_GRACE_DAYS },
      })
      return created
    })

    return reply.status(202).send(ok(record))
  })

  app.post('/data/requests/:requestId/cancel', async (request, reply) => {
    const context = requireTenant(request, 'tenant:write')
    const { requestId } = parseOrThrow(z.object({ requestId: uuidSchema }), request.params, 'request id')

    const cancelled = await withTenant(context.tenantId, async (tx) => {
      const done = await cancelDataRequest(tx, context.tenantId, requestId)
      if (done) {
        await recordSettingsAudit(tx, {
          tenantId: context.tenantId,
          name: 'settings.data_request_cancelled',
          actor: { ...context.actor },
          resourceType: 'data_request',
          resourceId: requestId,
          payload: {},
        })
      }
      return done
    })
    if (!cancelled) throw new NotFoundError('Request')

    return reply.send(ok({ cancelled: true }))
  })

  // -------------------------------------------------------------------------
  // Credentials
  //
  // Writes only. There is no handler that returns a stored credential, which is
  // why `GET` on a section can safely include `secrets` — it is built from
  // hints alone.
  // -------------------------------------------------------------------------

  app.put('/:scope/:key/secrets', async (request, reply) => {
    const { scope } = parseOrThrow(scopeParams, request.params, 'scope')
    const { key } = parseOrThrow(keyParams, request.params, 'settings key')
    const definition = definitionOrThrow(scope, key)

    const context = requireTenant(request, writePermissionFor(scope))
    const input = parseOrThrow(putSecretInputSchema, request.body, 'credential')

    const state = await withTenant(context.tenantId, async (tx) => {
      const saved = await putSecret(tx, {
        tenantId: context.tenantId,
        scope,
        key,
        field: input.field,
        value: input.value,
        updatedBy: context.user.email,
      })
      await recordSettingsAudit(tx, {
        tenantId: context.tenantId,
        name: 'settings.credential_updated',
        actor: { ...context.actor },
        resourceType: 'settings',
        resourceId: `${scope}/${key}`,
        // The field name is auditable. The value is not, anywhere.
        payload: { section: definition.label, field: input.field },
      })
      return saved
    })

    return reply.send(ok(state))
  })

  app.delete('/:scope/:key/secrets/:field', async (request, reply) => {
    const { scope } = parseOrThrow(scopeParams, request.params, 'scope')
    const { key } = parseOrThrow(keyParams, request.params, 'settings key')
    definitionOrThrow(scope, key)

    const context = requireTenant(request, writePermissionFor(scope))
    const { field } = parseOrThrow(z.object({ field: z.string().min(1).max(64) }), request.params, 'field')
    parseOrThrow(confirmInputSchema, request.body ?? {}, 'confirmation')

    const removed = await withTenant(context.tenantId, async (tx) => {
      const done = await deleteSecret(tx, context.tenantId, scope, key, field)
      if (done) {
        await recordSettingsAudit(tx, {
          tenantId: context.tenantId,
          name: 'settings.credential_removed',
          actor: { ...context.actor },
          resourceType: 'settings',
          resourceId: `${scope}/${key}`,
          payload: { field },
        })
      }
      return done
    })
    if (!removed) throw new NotFoundError('Credential')

    return reply.send(ok({ removed: true }))
  })

  // -------------------------------------------------------------------------
  // Documents
  //
  // Registered last so the static routes above win the match. `/:key` covers
  // the platform scope (`/workspace`, `/onboarding`, …) and `/commerce/:key`
  // the commerce one.
  // -------------------------------------------------------------------------

  app.get('/commerce/:key', async (request, reply) => {
    const context = requireTenant(request, 'commerce:read')
    const { key } = parseOrThrow(keyParams, request.params, 'settings key')
    return reply.send(ok(await sectionResponse(context, 'commerce', key)))
  })

  app.put('/commerce/:key', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const { key } = parseOrThrow(keyParams, request.params, 'settings key')
    const value = await writeDocument(context, 'commerce', key, request.body ?? {})
    return reply.send(ok(value))
  })

  app.get('/:key', async (request, reply) => {
    const { key } = parseOrThrow(keyParams, request.params, 'settings key')
    const context = requireTenant(request, key === 'ai' ? 'ai:use' : 'tenant:read')
    return reply.send(ok(await sectionResponse(context, 'platform', key)))
  })

  app.put('/:key', async (request, reply) => {
    const context = requireTenant(request, 'tenant:write')
    const { key } = parseOrThrow(keyParams, request.params, 'settings key')
    const body = (request.body ?? {}) as Record<string, unknown>

    if (key === 'ai') assertAutonomyAllowed(context, body)

    const value = await writeDocument(context, 'platform', key, body)
    return reply.send(ok(value))
  })
}

function writePermissionFor(scope: SettingsScope): Permission {
  return scope === 'commerce' ? 'commerce:write' : 'tenant:write'
}

/** A section as the UI wants it: the document plus the state of its secrets. */
async function sectionResponse(context: TenantContext, scope: SettingsScope, key: string) {
  const definition = definitionOrThrow(scope, key)
  const settings = await readDocument(context, scope, key)
  const secrets = await withTenant(context.tenantId, (tx) => listSecretStates(tx, context.tenantId, scope, key))

  return {
    scope,
    key,
    label: definition.label,
    settings,
    secrets,
    writable: !definition.minimumPlan || planAtLeast(context.plan, definition.minimumPlan),
    minimumPlan: definition.minimumPlan,
  }
}

export default settingsRoutes
