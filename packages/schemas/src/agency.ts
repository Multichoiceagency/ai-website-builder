/**
 * agency contracts. Owned by the agency phase.
 *
 * Every cross-boundary shape for this domain lives here (ADR-0002).
 *
 * The load-bearing idea: an agency is a tenant that *owns* other tenants, and
 * owning one grants nothing on its own. An agency user reaches into a client
 * workspace only through an explicit, expiring, revocable, audited grant. The
 * two-layer isolation model of ADR-0004 is untouched — a grant produces tenant
 * context for the client tenant, it does not let one tenant read another's rows.
 */
import { z } from 'zod'
import { emailSchema, hostnameSchema, isoTimestampSchema, slugSchema, uuidSchema } from './common.js'
import { actorSchema } from './events.js'
import { roleSchema } from './rbac.js'
import { planSchema } from './tenant.js'

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #rrggbb colour')

// region Hierarchy

export const agencyClientSchema = z.object({
  tenantId: uuidSchema,
  name: z.string(),
  slug: slugSchema,
  plan: planSchema,
  createdAt: isoTimestampSchema,
  siteCount: z.number().int().min(0),
  memberCount: z.number().int().min(0),
  /** Whether the calling user holds a live grant into this client right now. */
  hasActiveGrant: z.boolean(),
})
export type AgencyClient = z.infer<typeof agencyClientSchema>

export const createAgencyClientInputSchema = z.object({
  name: z.string().min(1).max(200),
  slug: slugSchema,
  plan: planSchema.default('launch'),
})
export type CreateAgencyClientInput = z.infer<typeof createAgencyClientInputSchema>

export const AGENCY_GRANT_STATUSES = ['active', 'expired', 'revoked'] as const
export const agencyGrantStatusSchema = z.enum(AGENCY_GRANT_STATUSES)
export type AgencyGrantStatus = z.infer<typeof agencyGrantStatusSchema>

/**
 * One person's right to act inside one client workspace, for a bounded time,
 * at a bounded role. Expiry is required, not optional: a grant that never ends
 * is indistinguishable from a permanent membership nobody remembers creating.
 */
export const agencyGrantSchema = z.object({
  id: uuidSchema,
  agencyTenantId: uuidSchema,
  clientTenantId: uuidSchema,
  userId: uuidSchema,
  userEmail: z.string().nullable(),
  role: roleSchema,
  status: agencyGrantStatusSchema,
  reason: z.string(),
  grantedBy: uuidSchema.nullable(),
  expiresAt: isoTimestampSchema,
  revokedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
})
export type AgencyGrant = z.infer<typeof agencyGrantSchema>

export const createAgencyGrantInputSchema = z.object({
  userId: uuidSchema,
  role: roleSchema.default('marketer'),
  reason: z.string().max(500).default(''),
  /** Bounded on purpose. Ninety days is the ceiling, one week the default. */
  expiresInHours: z.number().int().min(1).max(24 * 90).default(24 * 7),
})
export type CreateAgencyGrantInput = z.infer<typeof createAgencyGrantInputSchema>

/** What an agency user is allowed to see after stepping into a client. */
export const clientWorkspaceOverviewSchema = z.object({
  tenantId: uuidSchema,
  name: z.string(),
  plan: planSchema,
  role: roleSchema,
  permissions: z.array(z.string()),
  grantExpiresAt: isoTimestampSchema,
  siteCount: z.number().int().min(0),
  pageCount: z.number().int().min(0),
  publishedPageCount: z.number().int().min(0),
})
export type ClientWorkspaceOverview = z.infer<typeof clientWorkspaceOverviewSchema>

// endregion

// region White label

export const whiteLabelSettingsSchema = z.object({
  brandName: z.string().max(120).nullable(),
  /** Absolute URL or a relative media-library path. */
  logoUrl: z.string().max(2048).nullable(),
  faviconUrl: z.string().max(2048).nullable(),
  colorPrimary: hexColorSchema,
  colorAccent: hexColorSchema,
  /** Dashboard chrome surfaces — personalise the client admin shell. */
  colorSurface: hexColorSchema.default('#fafaf9'),
  colorSurfaceAlt: hexColorSchema.default('#ffffff'),
  colorText: hexColorSchema.default('#18181b'),
  fontHeading: z.string().min(1).max(120).default('Figtree'),
  fontBody: z.string().min(1).max(120).default('Rubik'),
  /** Where the client-facing dashboard is served from. */
  customDomain: hostnameSchema.nullable(),
  hidePlatformBranding: z.boolean(),
  supportEmail: emailSchema.nullable(),
  updatedAt: isoTimestampSchema.nullable(),
})
export type WhiteLabelSettings = z.infer<typeof whiteLabelSettingsSchema>

export const updateWhiteLabelInputSchema = z
  .object({
    brandName: z.string().max(120).nullable(),
    logoUrl: z.string().max(2048).nullable(),
    faviconUrl: z.string().max(2048).nullable(),
    colorPrimary: hexColorSchema,
    colorAccent: hexColorSchema,
    colorSurface: hexColorSchema,
    colorSurfaceAlt: hexColorSchema,
    colorText: hexColorSchema,
    fontHeading: z.string().min(1).max(120),
    fontBody: z.string().min(1).max(120),
    customDomain: hostnameSchema.nullable(),
    hidePlatformBranding: z.boolean(),
    supportEmail: emailSchema.nullable(),
  })
  .partial()
export type UpdateWhiteLabelInput = z.infer<typeof updateWhiteLabelInputSchema>

/** Fields any workspace may set to personalise their dashboard (no Advanced gate). */
export const DASHBOARD_BRANDING_KEYS = [
  'brandName',
  'logoUrl',
  'faviconUrl',
  'colorPrimary',
  'colorAccent',
  'colorSurface',
  'colorSurfaceAlt',
  'colorText',
  'fontHeading',
  'fontBody',
] as const
export type DashboardBrandingKey = (typeof DASHBOARD_BRANDING_KEYS)[number]

// endregion

// region SSO

export const SSO_PROTOCOLS = ['saml', 'oidc'] as const
export const ssoProtocolSchema = z.enum(SSO_PROTOCOLS)
export type SsoProtocol = z.infer<typeof ssoProtocolSchema>

/** Everything here is public metadata — the IdP publishes all of it. */
export const samlConfigSchema = z.object({
  entityId: z.string().min(1).max(1024),
  ssoUrl: z.string().url().max(2048),
  sloUrl: z.string().url().max(2048).nullable().default(null),
  /** Base64 X.509 signing certificate. Public by definition. */
  certificate: z.string().min(64).max(8192),
})
export type SamlConfig = z.infer<typeof samlConfigSchema>

export const oidcConfigSchema = z.object({
  issuer: z.string().url().max(2048),
  clientId: z.string().min(1).max(512),
  authorizationUrl: z.string().url().max(2048).nullable().default(null),
  tokenUrl: z.string().url().max(2048).nullable().default(null),
  jwksUri: z.string().url().max(2048).nullable().default(null),
  scopes: z.array(z.string().max(64)).max(20).default(['openid', 'email', 'profile']),
})
export type OidcConfig = z.infer<typeof oidcConfigSchema>

/**
 * The stored configuration as it is *read back*. The OIDC client secret is
 * never in this shape — only whether one is present.
 */
export const ssoConfigurationSchema = z.object({
  id: uuidSchema,
  protocol: ssoProtocolSchema,
  enabled: z.boolean(),
  defaultRole: roleSchema,
  /**
   * True only when the configuration is complete enough to attempt a login.
   * No identity provider is reachable from this platform yet, so this stays
   * an honest description of the stored config — never a claim that SSO works.
   */
  configured: z.boolean(),
  hasClientSecret: z.boolean(),
  saml: samlConfigSchema.nullable(),
  oidc: oidcConfigSchema.nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type SsoConfiguration = z.infer<typeof ssoConfigurationSchema>

export const upsertSsoConfigInputSchema = z.discriminatedUnion('protocol', [
  z.object({
    protocol: z.literal('saml'),
    enabled: z.boolean().default(false),
    defaultRole: roleSchema.default('viewer'),
    saml: samlConfigSchema,
  }),
  z.object({
    protocol: z.literal('oidc'),
    enabled: z.boolean().default(false),
    defaultRole: roleSchema.default('viewer'),
    oidc: oidcConfigSchema,
    /** Write-only. Stored, never returned, never logged. */
    clientSecret: z.string().min(8).max(512).optional(),
  }),
])
export type UpsertSsoConfigInput = z.infer<typeof upsertSsoConfigInputSchema>

// endregion

// region SCIM

/** Read model for a provisioning token. The token itself is shown once. */
export const scimTokenSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  /** Last four characters, so a token can be identified without revealing it. */
  lastFour: z.string().length(4),
  createdAt: isoTimestampSchema,
  lastUsedAt: isoTimestampSchema.nullable(),
  revokedAt: isoTimestampSchema.nullable(),
})
export type ScimToken = z.infer<typeof scimTokenSchema>

export const createScimTokenInputSchema = z.object({
  name: z.string().min(1).max(120).default('SCIM provisioning'),
})
export type CreateScimTokenInput = z.infer<typeof createScimTokenInputSchema>

/** SCIM 2.0 core User, trimmed to the fields this platform actually maps. */
export const scimUserInputSchema = z.object({
  schemas: z.array(z.string()).default(['urn:ietf:params:scim:schemas:core:2.0:User']),
  externalId: z.string().min(1).max(200),
  userName: z.string().min(1).max(320),
  displayName: z.string().max(200).optional(),
  name: z
    .object({
      givenName: z.string().max(120).optional(),
      familyName: z.string().max(120).optional(),
    })
    .optional(),
  emails: z
    .array(z.object({ value: emailSchema, primary: z.boolean().default(false) }))
    .min(1)
    .max(10),
  active: z.boolean().default(true),
})
export type ScimUserInput = z.infer<typeof scimUserInputSchema>

export const scimUserSchema = z.object({
  id: uuidSchema,
  externalId: z.string(),
  userName: z.string(),
  displayName: z.string().nullable(),
  email: emailSchema,
  active: z.boolean(),
  /** The role a provisioned user is mapped to on first sign-in. */
  role: roleSchema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type ScimUser = z.infer<typeof scimUserSchema>

// endregion

// region Audit export

export const auditExportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  name: z.string().max(120).optional(),
})
export type AuditExportQuery = z.infer<typeof auditExportQuerySchema>

export const auditExportRowSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  actor: actorSchema,
  resourceType: z.string().nullable(),
  resourceId: z.string().nullable(),
  payload: z.record(z.unknown()),
  createdAt: isoTimestampSchema,
})
export type AuditExportRow = z.infer<typeof auditExportRowSchema>

// endregion
