/**
 * How an agency user reaches into a client workspace — and, more importantly,
 * how they do not.
 *
 * Owning a client tenant grants nothing. Four independent things must all hold
 * before a single client row is read:
 *
 *   1. the user has a membership in the *agency* tenant (`requireTenant`)
 *   2. the agency tenant is actually marked as an agency, on a plan that allows it
 *   3. the client tenant's `parent_tenant_id` really is this agency
 *   4. a live, unexpired, unrevoked grant exists for this user and this client
 *
 * Only then is a transaction opened against the client tenant — through the
 * same `withTenant` every other request uses, so RLS is doing exactly what it
 * always does. Nothing here widens a policy or reads across a boundary
 * (ADR-0004).
 */
import { limitsForPlan, planAtLeast, resolvePermissions } from '@platform/permissions'
import type { Actor, AgencyGrant, Permission, Role, User } from '@platform/schemas'
import type { FastifyRequest } from 'fastify'
import { withoutTenant } from '../../db/client.js'
import { findActiveGrant, findTenantHierarchy } from '../../db/repositories/agency.js'
import { ForbiddenError, NotFoundError, PlanLimitError } from '../errors.js'
import { requireTenant, type TenantContext } from '../../plugins/auth.js'

/** The agency side: a normal tenant context plus the agency preconditions. */
export async function requireAgencyTenant(
  request: FastifyRequest,
  permission: Permission,
): Promise<TenantContext> {
  const context = requireTenant(request, permission)

  if (!planAtLeast(context.plan, 'advanced')) {
    throw new PlanLimitError('Agency workspaces are available on the Advanced and Enterprise plans.', {
      plan: context.plan,
      requiredPlan: 'advanced',
    })
  }

  const hierarchy = await withoutTenant((tx) => findTenantHierarchy(tx, context.tenantId))
  if (!hierarchy) throw new NotFoundError('Workspace')

  if (!hierarchy.isAgency) {
    throw new ForbiddenError('This workspace is not an agency. Enable agency mode before managing clients.')
  }

  return context
}

/** A verified right to act inside one client workspace, for one request. */
export interface ClientAccessContext {
  agencyTenantId: string
  agencyRole: Role
  clientTenantId: string
  role: Role
  permissions: Permission[]
  user: User
  actor: Actor
  grant: AgencyGrant
}

/**
 * Resolve access to a client workspace.
 *
 * The permission is checked against the *grant's* role, not the user's role in
 * the agency: an agency owner granted `viewer` on a client is a viewer there.
 * A grant can only ever narrow.
 */
export async function requireClientAccess(
  request: FastifyRequest,
  clientTenantId: string,
  permission: Permission,
): Promise<ClientAccessContext> {
  const agency = await requireAgencyTenant(request, 'tenant:read')

  const { hierarchy, grant } = await withoutTenant(async (tx) => ({
    hierarchy: await findTenantHierarchy(tx, clientTenantId),
    grant: await findActiveGrant(tx, {
      agencyTenantId: agency.tenantId,
      clientTenantId,
      userId: agency.user.id,
    }),
  }))

  // Reported as "not found" rather than "forbidden" for the same reason
  // `requireTenant` does: the API does not confirm that another tenant exists.
  if (!hierarchy || hierarchy.parentTenantId !== agency.tenantId) {
    throw new NotFoundError('Client workspace')
  }

  if (!grant) {
    throw new ForbiddenError(
      'No active grant for this client workspace. An agency owns its clients; reaching into one still needs an explicit, expiring grant.',
    )
  }

  const permissions = resolvePermissions(grant.role)
  if (!permissions.includes(permission)) {
    throw new ForbiddenError(`This grant (${grant.role}) cannot perform that action in the client workspace.`)
  }

  return {
    agencyTenantId: agency.tenantId,
    agencyRole: agency.role,
    clientTenantId,
    role: grant.role,
    permissions,
    user: agency.user,
    actor: { type: 'user', id: agency.user.id, label: agency.user.email },
    grant,
  }
}

/**
 * White label is a plan entitlement rather than a role one — it is what the
 * tenant bought, not what the user is allowed to do.
 */
export function assertWhiteLabelAllowed(context: TenantContext): void {
  if (!limitsForPlan(context.plan).whiteLabel) {
    throw new PlanLimitError('White labelling is available on the Advanced and Enterprise plans.', {
      plan: context.plan,
      requiredPlan: 'advanced',
    })
  }
}

export function assertEnterprise(context: TenantContext, feature: string): void {
  if (!planAtLeast(context.plan, 'enterprise')) {
    throw new PlanLimitError(`${feature} is available on the Enterprise plan.`, {
      plan: context.plan,
      requiredPlan: 'enterprise',
    })
  }
}
