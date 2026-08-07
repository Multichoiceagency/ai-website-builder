import { z } from 'zod'
import { emailSchema, isoTimestampSchema, slugSchema, uuidSchema } from './common.js'
import { domainEventNameSchema } from './events.js'
import { permissionSchema, PERMISSIONS, type Permission } from './rbac.js'

/**
 * App platform contracts (§33–§38, §72, §89).
 *
 * The security model these shapes encode: an installed app is never given a
 * database handle, a session or a role. It is given a *set of permissions the
 * installer already had*, and every call it makes is checked against that set
 * by the App Gateway. Everything below exists to make that check possible and
 * auditable.
 */

// region Vocabulary

export const APP_CATEGORIES = [
  'marketing',
  'seo',
  'reviews',
  'shipping',
  'accounting',
  'support',
  'analytics',
  'commerce',
  'crm',
  'productivity',
  'ai',
  'other',
] as const
export const appCategorySchema = z.enum(APP_CATEGORIES)
export type AppCategory = z.infer<typeof appCategorySchema>

/**
 * `public` is listed in the marketplace. `private` is built by a tenant for
 * itself and is gated to Advanced and above. `agency` is shared inside an
 * agency hierarchy. `internal` is first-party.
 */
export const APP_TYPES = ['public', 'private', 'agency', 'internal'] as const
export const appTypeSchema = z.enum(APP_TYPES)
export type AppType = z.infer<typeof appTypeSchema>

/** The submission pipeline is a state machine; these are its states (§37). */
export const APP_STATUSES = ['draft', 'submitted', 'in_review', 'approved', 'rejected'] as const
export const appStatusSchema = z.enum(APP_STATUSES)
export type AppStatus = z.infer<typeof appStatusSchema>

export const APP_EXTENSION_POINTS = [
  'dashboard.nav',
  'dashboard.page',
  'dashboard.settings',
  'dashboard.widget',
  'editor.panel',
  'storefront.block',
  'automation.action',
] as const
export const appExtensionPointSchema = z.enum(APP_EXTENSION_POINTS)
export type AppExtensionPoint = z.infer<typeof appExtensionPointSchema>

export const appExtensionSchema = z.object({
  point: appExtensionPointSchema,
  id: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase dash-separated id'),
  title: z.string().min(1).max(80),
  /** Where the platform loads the surface from. Reviewed for scheme (§37). */
  url: z.string().url().max(2048).optional(),
  icon: z.string().max(64).optional(),
})
export type AppExtension = z.infer<typeof appExtensionSchema>

/**
 * Permissions requested by a manifest are deliberately typed as a free string
 * rather than as `Permission`.
 *
 * If the type made `app:*` unrepresentable, the review pipeline could never
 * *see* an over-broad request — the parse would fail with a generic message and
 * the interesting security signal would be lost. Requests come in loose; only
 * `grantedPermissions` is narrowed to the real vocabulary.
 */
export const requestedPermissionSchema = z.string().min(1).max(64)

/**
 * Permissions that hand an app the keys to the workspace. Requesting one does
 * not auto-reject, but it always forces human review.
 */
export const HIGH_PRIVILEGE_PERMISSIONS: readonly Permission[] = [
  'tenant:write',
  'member:manage',
  'member:invite',
  'billing:manage',
  'ai:autonomous',
  'site:delete',
  'page:delete',
] as const

/** Above this, an app is asking for a role rather than for a capability. */
export const MAX_REQUESTED_PERMISSIONS = 12

// endregion

// region Manifest

export const appManifestSchema = z.object({
  /** Globally unique, human-readable. Becomes the marketplace slug. */
  id: slugSchema,
  name: z.string().min(2).max(80),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'must be a semver version such as 1.0.0')
    .default('1.0.0'),
  tagline: z.string().max(160).default(''),
  description: z.string().max(4000).default(''),
  category: appCategorySchema.default('other'),
  type: appTypeSchema.default('public'),
  permissions: z.array(requestedPermissionSchema).max(50).default([]),
  /** Domain events the app subscribes to. Validated against the real names. */
  events: z.array(z.string().min(1).max(64)).max(50).default([]),
  extensions: z.array(appExtensionSchema).max(25).default([]),
  webhookUrl: z.string().url().max(2048).optional(),
  homepageUrl: z.string().url().max(2048).optional(),
  supportEmail: emailSchema.optional(),
  iconUrl: z.string().url().max(2048).optional(),
})
export type AppManifest = z.infer<typeof appManifestSchema>

// endregion

// region Review

export const APP_REVIEW_FLAG_CODES = [
  'wildcard_permission',
  'unknown_permission',
  'unknown_event',
  'high_privilege_permission',
  'excessive_permissions',
  'missing_extension_url',
  'insecure_url',
  'no_permissions',
] as const
export const appReviewFlagCodeSchema = z.enum(APP_REVIEW_FLAG_CODES)
export type AppReviewFlagCode = z.infer<typeof appReviewFlagCodeSchema>

export const appReviewFlagSchema = z.object({
  code: appReviewFlagCodeSchema,
  /** `blocking` refuses the submission outright; `warning` needs a human. */
  severity: z.enum(['blocking', 'warning']),
  subject: z.string().max(200),
  message: z.string().max(400),
})
export type AppReviewFlag = z.infer<typeof appReviewFlagSchema>

export const appReviewSchema = z.object({
  ok: z.boolean(),
  flags: z.array(appReviewFlagSchema),
  /** The requested permissions that survived review, narrowed to the real set. */
  grantablePermissions: z.array(permissionSchema),
  requiresManualReview: z.boolean(),
})
export type AppReview = z.infer<typeof appReviewSchema>

// endregion

// region Records

export const appSchema = z.object({
  id: uuidSchema,
  /** The developer's workspace. Not the workspace the app is installed in. */
  tenantId: uuidSchema,
  slug: slugSchema,
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  category: appCategorySchema,
  type: appTypeSchema,
  status: appStatusSchema,
  listed: z.boolean(),
  version: z.string(),
  iconUrl: z.string().nullable(),
  homepageUrl: z.string().nullable(),
  supportEmail: z.string().nullable(),
  requestedPermissions: z.array(z.string()),
  events: z.array(z.string()),
  extensions: z.array(appExtensionSchema),
  reviewFlags: z.array(appReviewFlagSchema),
  reviewNotes: z.string(),
  submittedAt: isoTimestampSchema.nullable(),
  reviewedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type App = z.infer<typeof appSchema>

export const appVersionSchema = z.object({
  id: uuidSchema,
  appId: uuidSchema,
  version: z.string(),
  status: appStatusSchema,
  manifest: appManifestSchema,
  reviewFlags: z.array(appReviewFlagSchema),
  reviewNotes: z.string(),
  submittedAt: isoTimestampSchema.nullable(),
  reviewedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
})
export type AppVersion = z.infer<typeof appVersionSchema>

/**
 * The marketplace projection. Deliberately narrower than `appSchema`: it
 * crosses a tenant boundary, so it carries no developer ids and no review
 * internals — only what a buyer needs in order to decide.
 */
export const marketplaceAppSchema = z.object({
  /** The app's own id. Needed to install it; carries no developer identity. */
  appId: uuidSchema,
  slug: slugSchema,
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  category: appCategorySchema,
  type: appTypeSchema,
  version: z.string(),
  iconUrl: z.string().nullable(),
  homepageUrl: z.string().nullable(),
  supportEmail: z.string().nullable(),
  publisher: z.string(),
  /** Shown in full before the install button — never after (§35). */
  requestedPermissions: z.array(z.string()),
  events: z.array(z.string()),
  extensions: z.array(appExtensionSchema),
  installCount: z.number().int().min(0),
  approvedAt: isoTimestampSchema.nullable(),
})
export type MarketplaceApp = z.infer<typeof marketplaceAppSchema>

export const appInstallationSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  appId: uuidSchema,
  appSlug: slugSchema,
  appName: z.string(),
  category: appCategorySchema,
  /** The exact scope set the gateway will check against. Never a wildcard. */
  grantedPermissions: z.array(permissionSchema),
  settings: z.record(z.unknown()),
  status: z.enum(['active', 'suspended']),
  requestQuotaPerHour: z.number().int().min(1),
  installedBy: z.string(),
  installedAt: isoTimestampSchema,
  uninstalledAt: isoTimestampSchema.nullable(),
})
export type AppInstallation = z.infer<typeof appInstallationSchema>

export const appApiKeySchema = z.object({
  id: uuidSchema,
  appId: uuidSchema,
  name: z.string(),
  /** Enough to recognise a key in a list. Never enough to use one. */
  keyPrefix: z.string(),
  lastFour: z.string(),
  /** Empty means "whatever the installation granted"; otherwise a subset. */
  scopes: z.array(permissionSchema),
  createdAt: isoTimestampSchema,
  lastUsedAt: isoTimestampSchema.nullable(),
  expiresAt: isoTimestampSchema.nullable(),
  revokedAt: isoTimestampSchema.nullable(),
})
export type AppApiKey = z.infer<typeof appApiKeySchema>

/**
 * The only response that ever contains the credentials. Returned once, at
 * creation, and never reconstructible afterwards — the key is stored as a
 * SHA-256 hash, exactly like a session token.
 */
export const createdAppApiKeySchema = appApiKeySchema.extend({
  key: z.string(),
  signingSecret: z.string(),
})
export type CreatedAppApiKey = z.infer<typeof createdAppApiKeySchema>

export const appWebhookSubscriptionSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  appId: uuidSchema,
  installationId: uuidSchema,
  event: domainEventNameSchema,
  targetUrl: z.string(),
  active: z.boolean(),
  failureCount: z.number().int().min(0),
  createdAt: isoTimestampSchema,
  lastDeliveredAt: isoTimestampSchema.nullable(),
})
export type AppWebhookSubscription = z.infer<typeof appWebhookSubscriptionSchema>

/** Shown once. The signing secret is symmetric, so it cannot be re-derived. */
export const createdAppWebhookSubscriptionSchema = appWebhookSubscriptionSchema.extend({
  secret: z.string(),
})
export type CreatedAppWebhookSubscription = z.infer<typeof createdAppWebhookSubscriptionSchema>

export const APP_DELIVERY_STATUSES = ['pending', 'delivered', 'failed', 'exhausted'] as const
export const appDeliveryStatusSchema = z.enum(APP_DELIVERY_STATUSES)
export type AppDeliveryStatus = z.infer<typeof appDeliveryStatusSchema>

export const appWebhookDeliverySchema = z.object({
  id: uuidSchema,
  subscriptionId: uuidSchema,
  event: z.string(),
  eventId: uuidSchema,
  status: appDeliveryStatusSchema,
  attempts: z.number().int().min(0),
  maxAttempts: z.number().int().min(1),
  nextAttemptAt: isoTimestampSchema.nullable(),
  lastStatusCode: z.number().int().nullable(),
  lastError: z.string().nullable(),
  createdAt: isoTimestampSchema,
  deliveredAt: isoTimestampSchema.nullable(),
})
export type AppWebhookDelivery = z.infer<typeof appWebhookDeliverySchema>

export const APP_GATEWAY_DECISIONS = [
  'allowed',
  'denied_unknown_key',
  'denied_not_installed',
  'denied_scope',
  'denied_quota',
  'denied_signature',
  'denied_unknown_route',
] as const
export const appGatewayDecisionSchema = z.enum(APP_GATEWAY_DECISIONS)
export type AppGatewayDecision = z.infer<typeof appGatewayDecisionSchema>

export const appRequestLogEntrySchema = z.object({
  id: uuidSchema,
  appId: uuidSchema.nullable(),
  installationId: uuidSchema.nullable(),
  method: z.string(),
  path: z.string(),
  requiredScope: z.string().nullable(),
  decision: appGatewayDecisionSchema,
  statusCode: z.number().int(),
  durationMs: z.number().int().min(0),
  reason: z.string(),
  createdAt: isoTimestampSchema,
})
export type AppRequestLogEntry = z.infer<typeof appRequestLogEntrySchema>

export const appUsageWindowSchema = z.object({
  windowStart: isoTimestampSchema,
  requests: z.number().int().min(0),
  denied: z.number().int().min(0),
})
export type AppUsageWindow = z.infer<typeof appUsageWindowSchema>

// endregion

// region Inputs

export const createAppInputSchema = z.object({
  slug: slugSchema,
  name: z.string().min(2).max(80),
  tagline: z.string().max(160).default(''),
  description: z.string().max(4000).default(''),
  category: appCategorySchema.default('other'),
  type: appTypeSchema.default('public'),
  homepageUrl: z.string().url().max(2048).optional(),
  supportEmail: emailSchema.optional(),
  iconUrl: z.string().url().max(2048).optional(),
})
export type CreateAppInput = z.infer<typeof createAppInputSchema>

export const updateAppInputSchema = z
  .object({
    name: z.string().min(2).max(80),
    tagline: z.string().max(160),
    description: z.string().max(4000),
    category: appCategorySchema,
    homepageUrl: z.string().url().max(2048),
    supportEmail: emailSchema,
    iconUrl: z.string().url().max(2048),
    listed: z.boolean(),
  })
  .partial()
export type UpdateAppInput = z.infer<typeof updateAppInputSchema>

export const createAppVersionInputSchema = z.object({
  manifest: appManifestSchema,
})
export type CreateAppVersionInput = z.infer<typeof createAppVersionInputSchema>

export const submitAppInputSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  notes: z.string().max(2000).default(''),
})
export type SubmitAppInput = z.infer<typeof submitAppInputSchema>

export const reviewAppInputSchema = z.object({
  decision: z.enum(['in_review', 'approved', 'rejected']),
  notes: z.string().max(2000).default(''),
})
export type ReviewAppInput = z.infer<typeof reviewAppInputSchema>

export const installAppInputSchema = z.object({
  slug: slugSchema,
  /**
   * Optional narrowing. Anything listed here must be a subset of what the app
   * requested *and* a subset of what the installer holds — the server intersects
   * all three and never widens.
   */
  permissions: z.array(permissionSchema).max(50).optional(),
  settings: z.record(z.unknown()).default({}),
})
export type InstallAppInput = z.infer<typeof installAppInputSchema>

export const createAppApiKeyInputSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(permissionSchema).max(50).default([]),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
})
export type CreateAppApiKeyInput = z.infer<typeof createAppApiKeyInputSchema>

export const createAppWebhookSubscriptionInputSchema = z.object({
  installationId: uuidSchema,
  event: domainEventNameSchema,
  targetUrl: z.string().url().max(2048),
})
export type CreateAppWebhookSubscriptionInput = z.infer<typeof createAppWebhookSubscriptionInputSchema>

// endregion

// region Wire protocol

/** Authenticates the calling app. Hashed at rest, like a session token. */
export const APP_KEY_HEADER = 'x-app-key'
/** The workspace the app claims to act for. Validated against an installation. */
export const APP_TENANT_HEADER = 'x-tenant-id'
/** `sha256=<hex>` over `${timestamp}.${rawBody}`. Required for every write. */
export const APP_SIGNATURE_HEADER = 'x-app-signature'
export const APP_TIMESTAMP_HEADER = 'x-app-timestamp'

/** Outbound webhook headers, mirrored by `verifyWebhookSignature` in the SDK. */
export const WEBHOOK_SIGNATURE_HEADER = 'x-platform-signature'
export const WEBHOOK_TIMESTAMP_HEADER = 'x-platform-timestamp'
export const WEBHOOK_EVENT_HEADER = 'x-platform-event'
export const WEBHOOK_DELIVERY_HEADER = 'x-platform-delivery'

/** Outside this window a signature is refused, which is what stops a replay. */
export const SIGNATURE_TOLERANCE_SECONDS = 300

export const DEFAULT_APP_REQUEST_QUOTA_PER_HOUR = 1000
export const APP_QUOTA_WINDOW_SECONDS = 3600
export const WEBHOOK_MAX_ATTEMPTS = 5

/** Every permission, as a set, for O(1) membership checks during review. */
export const PERMISSION_SET: ReadonlySet<string> = new Set<string>(PERMISSIONS)

// endregion
