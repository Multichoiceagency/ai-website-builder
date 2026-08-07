import type { FastifyRequest } from 'fastify'
import {
  APP_KEY_HEADER,
  APP_QUOTA_WINDOW_SECONDS,
  APP_SIGNATURE_HEADER,
  APP_TENANT_HEADER,
  APP_TIMESTAMP_HEADER,
  uuidSchema,
  type Actor,
  type AppGatewayDecision,
  type Permission,
} from '@platform/schemas'
import { withTenant, withoutTenant, type Tx } from '../../db/client.js'
import {
  bumpUsage,
  findActiveInstallation,
  recordGatewayCall,
  recordUnattributedDenial,
  resolveApiKey,
  touchApiKey,
} from '../../db/repositories/apps.js'
import { AppError, ForbiddenError, UnauthorizedError } from '../errors.js'
import { hashAppApiKey, keyPrefixOf } from './keys.js'
import { verifySignature } from './signature.js'

/**
 * The App Gateway (§35).
 *
 * Everything an installed app can do goes through this file. What it is built
 * to make impossible:
 *
 *   * an app holding a database handle — it never sees a `Tx`; the gateway
 *     opens one, bound to the tenant, and hands the *result* back
 *   * an app reading another tenant's data — the tenant it names is only ever
 *     used to look up an installation, exactly as `requireTenant` uses a
 *     membership. A forged tenant id finds no installation and, because the
 *     lookup runs under that tenant's RLS context, could not see rows anyway
 *   * an app acquiring a permission it was not granted — the effective scope
 *     set is the intersection of the installation grant and the key's own
 *     scopes, and the required scope must be a member of it
 *   * a silent denial — every decision, allowed or refused, is written down
 *
 * Deny by default: a route with no declared scope is never reachable.
 */

export class AppQuotaError extends AppError {
  constructor(message: string) {
    super(429, 'quota_exceeded', message)
  }
}

export interface AppRequestContext {
  appId: string
  appSlug: string
  tenantId: string
  installationId: string
  keyId: string
  /** The full set of permissions this call may draw on. Never a wildcard. */
  scopes: Permission[]
  quotaPerHour: number
  actor: Actor
}

interface Denial {
  decision: AppGatewayDecision
  status: number
  reason: string
}

function rawBodyOf(request: FastifyRequest): string {
  return (request as FastifyRequest & { rawBody?: string }).rawBody ?? ''
}

function isMutating(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

function headerValue(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name]
  return Array.isArray(value) ? value[0] : value
}

/** A log write must never be able to change the answer the caller gets. */
async function safely(work: () => Promise<unknown>): Promise<void> {
  try {
    await work()
  } catch {
    // Intentionally swallowed — see above.
  }
}

async function logUnattributed(request: FastifyRequest, keyPrefix: string, reason: string): Promise<void> {
  await safely(() =>
    withoutTenant((tx) =>
      recordUnattributedDenial(tx, {
        keyPrefix,
        method: request.method,
        path: request.url,
        reason,
        remoteIp: request.ip ?? null,
      }),
    ),
  )
}

async function logDecision(
  request: FastifyRequest,
  input: {
    tenantId: string
    appId: string | null
    installationId: string | null
    keyId: string | null
    requiredScope: string | null
    decision: AppGatewayDecision
    status: number
    reason: string
    startedAt: number
  },
): Promise<void> {
  await safely(() =>
    withTenant(input.tenantId, (tx) =>
      recordGatewayCall(tx, {
        tenantId: input.tenantId,
        appId: input.appId,
        installationId: input.installationId,
        apiKeyId: input.keyId,
        method: request.method,
        path: request.url,
        requiredScope: input.requiredScope,
        decision: input.decision,
        statusCode: input.status,
        durationMs: Math.max(0, Date.now() - input.startedAt),
        reason: input.reason,
      }),
    ),
  )
}

function toError(denial: Denial): AppError {
  if (denial.status === 401) return new UnauthorizedError(denial.reason)
  if (denial.status === 429) return new AppQuotaError(denial.reason)
  return new ForbiddenError(denial.reason)
}

/**
 * Run one app-facing call.
 *
 * The handler receives a transaction that is already bound to the installing
 * tenant and a context that has already been authorised. It cannot widen
 * either: by the time it runs, every decision has been made and recorded.
 */
export async function withAppRequest<T>(
  request: FastifyRequest,
  /**
   * `null` means "no scope beyond a live installation" — reserved for
   * self-introspection. Every endpoint that touches customer data names one.
   */
  requiredScope: Permission | null,
  handler: (tx: Tx, context: AppRequestContext) => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  const presented = headerValue(request, APP_KEY_HEADER)

  if (!presented) {
    await logUnattributed(request, '', 'no api key presented')
    throw new UnauthorizedError('An app API key is required.')
  }

  const keyPrefix = keyPrefixOf(presented)

  // Step 1 — credential. Runs outside any tenant, because there is no tenant
  // yet; the lookup is by hash, so only a holder of the key gets a row.
  const key = await withoutTenant((tx) => resolveApiKey(tx, hashAppApiKey(presented)))

  if (!key) {
    await logUnattributed(request, keyPrefix, 'unknown api key')
    throw new UnauthorizedError('Invalid app API key.')
  }
  if (key.revokedAt) {
    await logUnattributed(request, keyPrefix, 'revoked api key')
    throw new UnauthorizedError('This app API key has been revoked.')
  }
  if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) {
    await logUnattributed(request, keyPrefix, 'expired api key')
    throw new UnauthorizedError('This app API key has expired.')
  }
  if (!isRunnable(key.appStatus, key.appType)) {
    await logUnattributed(request, keyPrefix, `app status ${key.appStatus}`)
    throw new ForbiddenError('This app is not approved to run.')
  }

  // Step 2 — the tenant the app *claims* to act for. Never trusted as given.
  const claimed = headerValue(request, APP_TENANT_HEADER)
  const parsed = uuidSchema.safeParse(claimed)
  if (!parsed.success) {
    await logUnattributed(request, keyPrefix, 'no workspace named')
    throw new ForbiddenError(`Send the workspace to act for in \`${APP_TENANT_HEADER}\`.`)
  }
  const tenantId = parsed.data

  // Step 3 — the grant. Read under the claimed tenant's RLS context, so a
  // forged id resolves to nothing rather than to someone else's install.
  const installation = await withTenant(tenantId, (tx) => findActiveInstallation(tx, tenantId, key.appId))

  if (!installation) {
    await logUnattributed(request, keyPrefix, 'app not installed for the named workspace')
    throw new ForbiddenError('This app is not installed in that workspace.')
  }

  const context: AppRequestContext = {
    appId: key.appId,
    appSlug: key.appSlug,
    tenantId,
    installationId: installation.id,
    keyId: key.keyId,
    // The key may narrow the installation's grant. It can never widen it.
    scopes: key.scopes.length
      ? installation.grantedPermissions.filter((scope) => key.scopes.includes(scope))
      : installation.grantedPermissions,
    quotaPerHour: installation.requestQuotaPerHour,
    actor: { type: 'app', id: key.appId, label: key.appSlug },
  }

  const deny = async (denial: Denial): Promise<never> => {
    await logDecision(request, {
      tenantId,
      appId: context.appId,
      installationId: context.installationId,
      keyId: context.keyId,
      requiredScope,
      decision: denial.decision,
      status: denial.status,
      reason: denial.reason,
      startedAt,
    })
    throw toError(denial)
  }

  // Step 4 — signature. Reads are open to any valid key; writes must prove
  // freshness, which is what makes a captured request unreplayable.
  if (isMutating(request.method)) {
    const result = verifySignature({
      secret: key.signingSecret,
      timestamp: headerValue(request, APP_TIMESTAMP_HEADER),
      signature: headerValue(request, APP_SIGNATURE_HEADER),
      rawBody: rawBodyOf(request),
    })

    if (!result.ok) {
      await countCall(tenantId, key.appId, true)
      await deny({
        decision: 'denied_signature',
        status: 403,
        reason:
          result.reason === 'stale'
            ? 'Signature timestamp is outside the accepted window.'
            : 'Missing or invalid request signature.',
      })
    }
  }

  // Step 5 — quota (§72). Counted before the scope check, because a caller
  // hammering a scope it does not hold is exactly the traffic worth capping.
  const used = await countCall(tenantId, key.appId, false)
  if (used > context.quotaPerHour) {
    await deny({
      decision: 'denied_quota',
      status: 429,
      reason: `This app has used its hourly request quota (${context.quotaPerHour}).`,
    })
  }

  // Step 6 — scope.
  if (requiredScope && !context.scopes.includes(requiredScope)) {
    await deny({
      decision: 'denied_scope',
      status: 403,
      reason: `This app was not granted \`${requiredScope}\`.`,
    })
  }

  const result = await withTenant(tenantId, (tx) => handler(tx, context))

  await safely(() => withoutTenant((tx) => touchApiKey(tx, key.keyId)))
  await logDecision(request, {
    tenantId,
    appId: context.appId,
    installationId: context.installationId,
    keyId: context.keyId,
    requiredScope,
    decision: 'allowed',
    status: 200,
    reason: '',
    startedAt,
  })

  return result
}

async function countCall(tenantId: string, appId: string, denied: boolean): Promise<number> {
  try {
    return await withTenant(tenantId, (tx) =>
      bumpUsage(tx, { tenantId, appId, windowSeconds: APP_QUOTA_WINDOW_SECONDS, denied }),
    )
  } catch {
    // A counter failure must not become an outage. Fail open on counting, never
    // on authorisation — the scope check below is the one that matters.
    return 0
  }
}

/**
 * A marketplace app must be approved to run. A private or internal app never
 * reaches the marketplace at all, so approval is not the gate for it — being
 * installed by the workspace that owns it is.
 */
function isRunnable(status: string, type: string): boolean {
  if (status === 'rejected') return false
  if (type === 'private' || type === 'internal') return true
  return status === 'approved'
}
