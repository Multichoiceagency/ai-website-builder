import { z } from 'zod'
import { performanceClassSchema } from './blocks.js'
import { emailSchema, hostnameSchema, isoTimestampSchema, localeSchema, slugSchema, uuidSchema } from './common.js'
import { roleSchema } from './rbac.js'
import { planSchema } from './tenant.js'
import { currencyCodeSchema, moneySchema } from './commerce.js'

/**
 * Settings contracts (§39, §58–§62, §97, §98 — and §13, §75, §76 for commerce).
 *
 * Every settings document is stored as one JSONB value addressed by
 * `(tenant_id, scope, key)`. That only works because each key has a schema here
 * whose every field carries a default: reading an absent row is
 * `schema.parse({})`, so a workspace that has never opened a settings screen
 * still has a complete, valid document. No migration is needed to add a field —
 * only a default.
 *
 * Secrets are deliberately *not* part of any document. A credential lives in a
 * separate encrypted store and is described to the client by a masked hint
 * only; see `secretStateSchema`.
 */

// region Addressing

export const SETTINGS_SCOPES = ['platform', 'commerce'] as const
export const settingsScopeSchema = z.enum(SETTINGS_SCOPES)
export type SettingsScope = z.infer<typeof settingsScopeSchema>

export const PLATFORM_SETTINGS_KEYS = [
  'workspace',
  'onboarding',
  'onboarding-funnel',
  'notifications',
  'ai',
  'data-retention',
  'whatsapp',
] as const
export const platformSettingsKeySchema = z.enum(PLATFORM_SETTINGS_KEYS)
export type PlatformSettingsKey = z.infer<typeof platformSettingsKeySchema>

export const COMMERCE_SETTINGS_KEYS = [
  'engine',
  'payments',
  'shipping',
  'taxes',
  'checkout',
  'inventory',
  'currencies',
  'notifications',
  'feeds',
] as const
export const commerceSettingsKeySchema = z.enum(COMMERCE_SETTINGS_KEYS)
export type CommerceSettingsKey = z.infer<typeof commerceSettingsKeySchema>

/**
 * How a stored credential is described to a browser: whether it exists and what
 * its tail looks like. The value itself has no representation in this file, on
 * purpose — there is no shape a secret could travel in.
 */
export const secretStateSchema = z.object({
  field: z.string().max(64),
  configured: z.boolean(),
  /** e.g. `sk_live_••••4242`. Never enough to reconstruct the credential. */
  hint: z.string().max(64).nullable().default(null),
  updatedAt: isoTimestampSchema.nullable().default(null),
})
export type SecretState = z.infer<typeof secretStateSchema>

// endregion

// region Platform · workspace

/** IANA zone (`Europe/Amsterdam`) or `UTC`. Not an offset — offsets drift. */
export const timezoneSchema = z
  .string()
  .max(64)
  .regex(/^(UTC|[A-Za-z]+(?:_[A-Za-z]+)*(?:\/[A-Za-z0-9+\-_]+)+)$/, 'must be an IANA time zone such as `Europe/Amsterdam`')

export const workspaceSettingsSchema = z.object({
  // Empty means "inherit the name on `tenants`". A `min(1)` here would make the
  // default fail its own validation, and an unwritten section unreadable.
  name: z.string().max(200).default(''),
  slug: slugSchema.or(z.literal('')).default(''),
  locale: localeSchema.default('nl'),
  timezone: timezoneSchema.default('Europe/Amsterdam'),
  /** Presentation currency for the dashboard. Commerce has its own base. */
  currency: currencyCodeSchema.default('EUR'),
  defaultLanguage: localeSchema.default('nl'),
  supportEmail: emailSchema.or(z.literal('')).default(''),
})
export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>

/** Name and slug live on `tenants`; the rest lives in the document. */
export const updateWorkspaceSettingsInputSchema = workspaceSettingsSchema.partial()
export type UpdateWorkspaceSettingsInput = z.infer<typeof updateWorkspaceSettingsInputSchema>

// endregion

// region Platform · onboarding
//
// Read by the site builder, which is why the shape is a contract and not a
// screen-local blob. Adding a step means adding it here first.

export const ONBOARDING_STEPS = [
  'business',
  'brand',
  'template',
  'style',
  'pages',
  'domain',
  'publish',
] as const
export const onboardingStepSchema = z.enum(ONBOARDING_STEPS)
export type OnboardingStep = z.infer<typeof onboardingStepSchema>

export const onboardingSettingsSchema = z.object({
  /** Which steps the builder runs, in order. */
  steps: z.array(onboardingStepSchema).max(ONBOARDING_STEPS.length).default([...ONBOARDING_STEPS]),
  /** Pre-selected template. Empty means "let the user choose". */
  defaultTemplateId: z.string().max(120).default(''),
  /** Pre-selected style direction. Empty means "let the user choose". */
  defaultStyleId: z.string().max(120).default(''),
  allowTemplateChoice: z.boolean().default(true),
  allowStyleChoice: z.boolean().default(true),
  /** Publish the generated site immediately instead of leaving it in draft. */
  publishImmediately: z.boolean().default(false),
  defaultLanguage: localeSchema.default('nl'),
  /**
   * The heaviest block class the builder may reach for. `A` keeps generated
   * sites on the fastest blocks only; `D` allows everything.
   */
  maxPerformanceClass: performanceClassSchema.default('B'),
  /** Skip straight to the editor for returning users. */
  skipForReturningUsers: z.boolean().default(true),
})
export type OnboardingSettings = z.infer<typeof onboardingSettingsSchema>

/**
 * Full signup → go-live funnel (§80–85). Distinct from `onboardingSettingsSchema`
 * (builder defaults). Progress is tenant-scoped so refresh can resume.
 */
export const ONBOARDING_FUNNEL_STEPS = [
  'account',
  'intent',
  'connect',
  'select',
  'scan',
  'style',
  'generate',
  'preview',
  'domain',
  'go_live',
  'seo',
  'ads',
  'commerce',
  'complete',
] as const
export const onboardingFunnelStepSchema = z.enum(ONBOARDING_FUNNEL_STEPS)
export type OnboardingFunnelStep = z.infer<typeof onboardingFunnelStepSchema>

export const productIntentSchema = z.enum(['website', 'store', 'both'])
export type ProductIntent = z.infer<typeof productIntentSchema>

export const onboardingFunnelStyleSchema = z.enum([
  'auto',
  'minimal',
  'modern',
  'premium',
  'bold',
  'editorial',
])

export const onboardingFunnelSchema = z.object({
  step: onboardingFunnelStepSchema.default('account'),
  productIntent: productIntentSchema.nullable().default(null),
  completedSteps: z.array(onboardingFunnelStepSchema).max(ONBOARDING_FUNNEL_STEPS.length).default([]),
  /** Google OAuth vs paste URL / name. Empty until the connect step chooses. */
  connectMode: z.enum(['google', 'manual']).nullable().default(null),
  website: z.string().max(500).default(''),
  businessName: z.string().max(200).default(''),
  city: z.string().max(120).default(''),
  locale: localeSchema.default('nl'),
  style: onboardingFunnelStyleSchema.default('auto'),
  templateId: z.string().max(120).nullable().default(null),
  siteId: uuidSchema.nullable().default(null),
  /** Steps the user deferred with “Do this later”. */
  skippedLater: z.array(onboardingFunnelStepSchema).max(ONBOARDING_FUNNEL_STEPS.length).default([]),
  updatedAt: isoTimestampSchema.nullable().default(null),
})
export type OnboardingFunnel = z.infer<typeof onboardingFunnelSchema>

/** Partial patch for `PATCH /api/v1/onboarding/progress`. */
export const updateOnboardingFunnelSchema = onboardingFunnelSchema.partial()
export type UpdateOnboardingFunnel = z.infer<typeof updateOnboardingFunnelSchema>

// endregion

// region Platform · notifications

export const NOTIFICATION_EVENTS = [
  'page.published',
  'domain.verified',
  'member.invited',
  'order.placed',
  'payment.captured',
  'refund.created',
  'lead.created',
  'deal.won',
  'experiment.completed',
  'plan.limit_reached',
  'ai.proposal_created',
] as const
export const notificationEventSchema = z.enum(NOTIFICATION_EVENTS)
export type NotificationEvent = z.infer<typeof notificationEventSchema>

export const notificationRuleSchema = z.object({
  event: notificationEventSchema,
  enabled: z.boolean().default(true),
  /** Explicit addresses. Empty means "everyone with the matching role". */
  recipients: z.array(emailSchema).max(20).default([]),
  /** Roles that receive it when `recipients` is empty. */
  roles: z.array(roleSchema).max(9).default(['owner']),
})
export type NotificationRule = z.infer<typeof notificationRuleSchema>

export const notificationSettingsSchema = z.object({
  rules: z.array(notificationRuleSchema).max(NOTIFICATION_EVENTS.length).default([]),
  /** Collapse bursts into one digest instead of one mail per event. */
  digest: z.enum(['off', 'daily', 'weekly']).default('off'),
})
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>

// endregion

// region Platform · AI

export const AI_AUTONOMY_CAPABILITIES = [
  'content.rewrite',
  'seo.optimize',
  'ads.budget',
  'experiments.promote',
  'commerce.pricing',
] as const
export const aiAutonomyCapabilitySchema = z.enum(AI_AUTONOMY_CAPABILITIES)
export type AiAutonomyCapability = z.infer<typeof aiAutonomyCapabilitySchema>

export const aiSettingsSchema = z.object({
  /** Empty means "whatever the gateway picks for this plan". */
  defaultModelId: z.string().max(120).default(''),
  /**
   * Per-capability autonomy. Advanced+ only, enforced server-side — the UI may
   * explain the gate, it may not open it.
   */
  autonomy: z
    .record(aiAutonomyCapabilitySchema, z.boolean())
    .default({}),
  /** Autonomous runs stop once this many changes have been applied in a day. */
  dailyChangeLimit: z.number().int().min(1).max(500).default(10),
  /** Soft ceiling on monthly AI credits; a warning, not a hard stop. */
  monthlyCreditBudget: z.number().int().min(0).max(10_000_000).default(0),
  /** Ask before every medium-risk mutation even in autonomous mode. */
  confirmMediumRisk: z.boolean().default(true),
})
export type AiSettings = z.infer<typeof aiSettingsSchema>

// endregion

// region Platform · WhatsApp (OpenWA)

/**
 * Per-tenant OpenWA gateway connection. Secrets (`apiKey`, `webhookSecret`) live
 * in `settings_secrets`, not in this document.
 */
export const whatsappSettingsSchema = z.object({
  /** OpenWA HTTP base URL, e.g. `http://localhost:2785` or a private host. */
  baseUrl: z.string().trim().max(500).default(''),
  /** Optional UI URL for scanning QR / managing sessions (defaults to baseUrl). */
  dashboardUrl: z.string().trim().max(500).default(''),
  /** User dismissed the setup checklist after connecting. */
  onboardingComplete: z.boolean().default(false),
})
export type WhatsappSettings = z.infer<typeof whatsappSettingsSchema>

export const WHATSAPP_SECRET_FIELDS = ['apiKey', 'webhookSecret'] as const
export const whatsappSecretFieldSchema = z.enum(WHATSAPP_SECRET_FIELDS)

// endregion

// region Platform · data & privacy (§97, §98)

export const dataRetentionSettingsSchema = z.object({
  /** 0 disables automatic pruning. */
  analyticsRetentionDays: z.number().int().min(0).max(3650).default(395),
  auditRetentionDays: z.number().int().min(0).max(3650).default(730),
  leadRetentionDays: z.number().int().min(0).max(3650).default(0),
  /** Drop the last octet / IPv6 suffix before an address is ever stored. */
  anonymizeIpAddresses: z.boolean().default(true),
  /** Honour Do-Not-Track and Global Privacy Control on the storefront. */
  respectDoNotTrack: z.boolean().default(true),
  dataProcessingRegion: z.enum(['eu', 'us', 'global']).default('eu'),
  privacyContactEmail: emailSchema.or(z.literal('')).default(''),
})
export type DataRetentionSettings = z.infer<typeof dataRetentionSettingsSchema>

export const DATA_REQUEST_KINDS = ['export', 'workspace_deletion'] as const
export const dataRequestKindSchema = z.enum(DATA_REQUEST_KINDS)

export const dataRequestSchema = z.object({
  id: uuidSchema,
  kind: dataRequestKindSchema,
  status: z.enum(['pending', 'ready', 'cancelled', 'completed']),
  requestedBy: z.string().max(320),
  /** Deletion is scheduled, never immediate — see `settings.ts` route notes. */
  scheduledFor: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
})
export type DataRequest = z.infer<typeof dataRequestSchema>

// endregion

// region Team

export const teamMemberSchema = z.object({
  userId: uuidSchema,
  email: z.string(),
  name: z.string(),
  role: roleSchema,
  /** What this role can actually do, resolved from the permission engine. */
  permissions: z.array(z.string()).default([]),
  joinedAt: isoTimestampSchema,
})
export type TeamMember = z.infer<typeof teamMemberSchema>

export const invitationSchema = z.object({
  id: uuidSchema,
  email: z.string(),
  role: roleSchema,
  invitedBy: z.string().max(320),
  expiresAt: isoTimestampSchema,
  acceptedAt: isoTimestampSchema.nullable().default(null),
  revokedAt: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
})
export type Invitation = z.infer<typeof invitationSchema>

export const createInvitationInputSchema = z.object({
  email: emailSchema,
  role: roleSchema,
})
export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>

/**
 * A role change is destructive — it can lock the last owner out of their own
 * workspace — so it carries the same explicit confirmation as a delete.
 */
export const changeMemberRoleInputSchema = z.object({
  role: roleSchema,
  confirm: z.literal(true),
})
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleInputSchema>

export const removeMemberInputSchema = z.object({ confirm: z.literal(true) })

// endregion

// region Domains

export const domainSettingSchema = z.object({
  id: uuidSchema,
  siteId: uuidSchema,
  hostname: z.string(),
  isPrimary: z.boolean(),
  verifiedAt: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
})
export type DomainSetting = z.infer<typeof domainSettingSchema>

export const addDomainInputSchema = z.object({
  siteId: uuidSchema,
  hostname: hostnameSchema,
})
export type AddDomainInput = z.infer<typeof addDomainInputSchema>

/** What the user must put in DNS. Generated, never typed by hand. */
export const dnsInstructionSchema = z.object({
  type: z.enum(['A', 'CNAME', 'TXT']),
  name: z.string().max(253),
  value: z.string().max(512),
  note: z.string().max(300).default(''),
})
export type DnsInstruction = z.infer<typeof dnsInstructionSchema>

// endregion

// region Developer · API keys and webhooks

export const apiKeySchema = z.object({
  id: uuidSchema,
  name: z.string().max(120),
  /** `pk_live_••••a91f`. The only representation that ever leaves the server. */
  hint: z.string().max(64),
  scopes: z.array(z.string()).default([]),
  lastUsedAt: isoTimestampSchema.nullable().default(null),
  revokedAt: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
})
export type ApiKey = z.infer<typeof apiKeySchema>

export const createApiKeyInputSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.string().max(64)).max(64).default([]),
})
export type CreateApiKeyInput = z.infer<typeof createApiKeyInputSchema>

/**
 * The one response in the platform that contains a live credential. It is
 * returned exactly once, at creation, and is never readable again.
 */
export const createdApiKeySchema = apiKeySchema.extend({ secret: z.string() })
export type CreatedApiKey = z.infer<typeof createdApiKeySchema>

export const webhookEndpointSchema = z.object({
  id: uuidSchema,
  url: z.string().max(2048),
  events: z.array(z.string().max(64)).default([]),
  active: z.boolean().default(true),
  /** `whsec_••••3f21`. The signing secret itself is never returned. */
  secretHint: z.string().max(64),
  lastDeliveryAt: isoTimestampSchema.nullable().default(null),
  lastStatus: z.number().int().nullable().default(null),
  createdAt: isoTimestampSchema,
})
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>

export const createWebhookEndpointInputSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.string().max(64)).min(1).max(64),
  active: z.boolean().default(true),
})
export type CreateWebhookEndpointInput = z.infer<typeof createWebhookEndpointInputSchema>

export const webhookDeliverySchema = z.object({
  id: uuidSchema,
  event: z.string().max(64),
  statusCode: z.number().int().nullable().default(null),
  error: z.string().max(500).nullable().default(null),
  durationMs: z.number().int().min(0).default(0),
  createdAt: isoTimestampSchema,
})
export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>

/** Rotation invalidates every receiver's stored secret, so it is confirmed. */
export const confirmInputSchema = z.object({ confirm: z.literal(true) })

// endregion

// region Commerce · engine (Shopify / Woo / Medusa / platform)

/**
 * Which commerce backend this tenant manages through the dashboard (ADR-0006).
 * Credentials live in `settings_secrets` under the same key — never in this doc.
 */
export const COMMERCE_ENGINE_IDS = [
  'platform',
  'medusa',
  'shopify',
  'woocommerce',
  'bigcommerce',
] as const
export const commerceEngineIdSchema = z.enum(COMMERCE_ENGINE_IDS)
export type CommerceEngineId = z.infer<typeof commerceEngineIdSchema>

export const commerceEngineSettingsSchema = z.object({
  providerId: commerceEngineIdSchema.default('platform'),
  /**
   * Public shop hostname / base URL without credentials.
   * Shopify: `mystore.myshopify.com`. Woo: `https://shop.example.com`.
   */
  storeUrl: z.string().max(500).default(''),
  /** Shopify Admin API version pin (YYYY-MM). Ignored by other engines. */
  apiVersion: z.string().max(20).default('2024-10'),
})
export type CommerceEngineSettings = z.infer<typeof commerceEngineSettingsSchema>

/** Credential fields for remote commerce engines. Values never leave encrypted storage. */
export const COMMERCE_ENGINE_SECRET_FIELDS = ['apiKey', 'apiSecret', 'storeUrl'] as const
export const commerceEngineSecretFieldSchema = z.enum(COMMERCE_ENGINE_SECRET_FIELDS)

// endregion

// region Commerce · payments (§75)

export const PAYMENT_METHODS = ['card', 'ideal', 'bancontact', 'paypal', 'sepa', 'klarna', 'manual'] as const
export const paymentMethodSchema = z.enum(PAYMENT_METHODS)

export const paymentSettingsSchema = z.object({
  /** Adapter id from `src/adapters/payments`. `manual` is always available. */
  providerId: z.string().max(60).default('manual'),
  mode: z.enum(['test', 'live']).default('test'),
  methods: z.array(paymentMethodSchema).max(PAYMENT_METHODS.length).default(['manual']),
  /** Shown on the shopper's bank statement. */
  statementDescriptor: z.string().max(22).default(''),
  captureMode: z.enum(['automatic', 'manual']).default('automatic'),
})
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>

/** Credential fields a payment provider may need. Values never come back out. */
export const PAYMENT_SECRET_FIELDS = ['apiKey', 'publishableKey', 'webhookSecret'] as const
export const paymentSecretFieldSchema = z.enum(PAYMENT_SECRET_FIELDS)

export const putSecretInputSchema = z.object({
  field: z.string().min(1).max(64),
  value: z.string().min(4).max(4096),
})
export type PutSecretInput = z.infer<typeof putSecretInputSchema>

// endregion

// region Commerce · shipping (§76)

export const shippingZoneSchema = z.object({
  id: z.string().max(64),
  name: z.string().min(1).max(120),
  /** ISO-3166-1 alpha-2. Empty means "the rest of the world". */
  countries: z.array(z.string().length(2)).max(120).default([]),
  enabled: z.boolean().default(true),
})
export type ShippingZone = z.infer<typeof shippingZoneSchema>

export const weightBandSchema = z.object({
  /** Inclusive lower bound in grams. */
  fromGrams: z.number().int().min(0).max(1_000_000).default(0),
  /** Exclusive upper bound. Null means "and everything above". */
  toGrams: z.number().int().min(0).max(1_000_000).nullable().default(null),
  price: moneySchema,
})
export type WeightBand = z.infer<typeof weightBandSchema>

export const pickupLocationSchema = z.object({
  id: z.string().max(64),
  name: z.string().min(1).max(120),
  address: z.string().max(300).default(''),
  instructions: z.string().max(500).default(''),
  enabled: z.boolean().default(true),
})
export type PickupLocation = z.infer<typeof pickupLocationSchema>

export const shippingSettingsSchema = z.object({
  zones: z.array(shippingZoneSchema).max(40).default([]),
  /** Flat rates live in `commerce_shipping_rates`; bands price by weight. */
  weightBands: z.array(weightBandSchema).max(40).default([]),
  freeShippingThreshold: moneySchema.nullable().default(null),
  pickupEnabled: z.boolean().default(false),
  pickupLocations: z.array(pickupLocationSchema).max(40).default([]),
  /**
   * Carrier adapters the merchant wants live rates from. Ids only — a carrier's
   * credentials are secrets, and its API lives behind `ShippingProvider`.
   */
  enabledCarriers: z.array(z.string().max(60)).max(20).default([]),
  defaultWeightGrams: z.number().int().min(0).max(1_000_000).default(500),
})
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>

// endregion

// region Commerce · taxes

export const taxRateSchema = z.object({
  id: z.string().max(64),
  name: z.string().min(1).max(120),
  country: z.string().length(2),
  /** Sub-national region code. Empty means "the whole country". */
  region: z.string().max(10).default(''),
  /** Basis points: 2100 = 21%. Never a float percentage. */
  rateBps: z.number().int().min(0).max(100_000),
  isDefault: z.boolean().default(false),
})
export type TaxRate = z.infer<typeof taxRateSchema>

export const taxSettingsSchema = z.object({
  /** Whether catalogue prices already contain tax. Changes every total. */
  pricesIncludeTax: z.boolean().default(true),
  rates: z.array(taxRateSchema).max(200).default([]),
  /** VAT / GST registration number, printed on invoices. */
  taxNumber: z.string().max(64).default(''),
  /** Zero-rate B2B customers who supply a validated EU VAT number. */
  reverseChargeForValidVatNumbers: z.boolean().default(false),
  chargeTaxOnShipping: z.boolean().default(true),
})
export type TaxSettings = z.infer<typeof taxSettingsSchema>

// endregion

// region Commerce · checkout

export const CHECKOUT_FIELDS = ['email', 'phone', 'company', 'vatNumber', 'note', 'birthDate'] as const
export const checkoutFieldSchema = z.enum(CHECKOUT_FIELDS)

export const checkoutSettingsSchema = z.object({
  guestCheckout: z.boolean().default(true),
  requiredFields: z.array(checkoutFieldSchema).max(CHECKOUT_FIELDS.length).default(['email']),
  optionalFields: z.array(checkoutFieldSchema).max(CHECKOUT_FIELDS.length).default(['phone']),
  requireTermsAcceptance: z.boolean().default(true),
  termsUrl: z.string().max(2048).default(''),
  privacyUrl: z.string().max(2048).default(''),
  /** Minutes of inactivity before a cart counts as abandoned. 0 disables it. */
  abandonedCartMinutes: z.number().int().min(0).max(20_160).default(60),
  /**
   * `#` is replaced by the sequence number, `{YYYY}` / `{MM}` by the date.
   * Example: `ORD-{YYYY}-####`.
   */
  orderNumberFormat: z.string().min(1).max(40).default('#'),
  orderNumberStart: z.number().int().min(1).max(1_000_000_000).default(1000),
  marketingOptInDefault: z.boolean().default(false),
})
export type CheckoutSettings = z.infer<typeof checkoutSettingsSchema>

// endregion

// region Commerce · inventory

export const inventorySettingsSchema = z.object({
  trackInventory: z.boolean().default(true),
  /** Let an out-of-stock variant still be bought. Off by default, on purpose. */
  allowOverselling: z.boolean().default(false),
  lowStockThreshold: z.number().int().min(0).max(100_000).default(5),
  /** Hold stock for this long once a checkout starts. 0 disables reservation. */
  reservationMinutes: z.number().int().min(0).max(1440).default(30),
  /** Location ids from `commerce_locations`, in fulfilment priority order. */
  locationPriority: z.array(uuidSchema).max(50).default([]),
  hideOutOfStockProducts: z.boolean().default(false),
})
export type InventorySettings = z.infer<typeof inventorySettingsSchema>

// endregion

// region Commerce · feeds

/**
 * Marketplace feed options (Google / Meta / Amazon / …).
 *
 * `publicToken` is the unguessable path segment merchants paste into Merchant
 * Center. Empty means "not issued yet" — the commerce feeds route mints one
 * on first read and persists it.
 */
export const feedSettingsSchema = z.object({
  /** Include active products with zero stock (marked out of stock in the feed). */
  includeOutOfStock: z.boolean().default(false),
  /**
   * Force every row to this ISO currency. Empty keeps each product's own
   * currency from the catalogue.
   */
  currency: currencyCodeSchema.or(z.literal('')).default(''),
  /** Appended to every product title, e.g. ` | Acme Store`. */
  titleSuffix: z.string().max(80).default(''),
  /** Opaque public path token. Never a tenant id. */
  publicToken: z.string().max(64).default(''),
})
export type FeedSettings = z.infer<typeof feedSettingsSchema>

// endregion

// region Commerce · currencies

export const additionalCurrencySchema = z.object({
  currency: currencyCodeSchema,
  /**
   * Rate against the base currency in ten-thousandths: 10850 = 1.0850. An
   * integer, because a float rate multiplied by an integer price reintroduces
   * exactly the rounding error the money type exists to prevent.
   */
  rateTenThousandths: z.number().int().min(1).max(1_000_000_000),
  rounding: z.enum(['none', 'nearest_5', 'nearest_10', 'nearest_50', 'charm_99']).default('none'),
  enabled: z.boolean().default(true),
})
export type AdditionalCurrency = z.infer<typeof additionalCurrencySchema>

export const currencySettingsSchema = z.object({
  baseCurrency: currencyCodeSchema.default('EUR'),
  additional: z.array(additionalCurrencySchema).max(20).default([]),
  /** Pick the shopper's currency from their locale where one is enabled. */
  autoSelectByLocale: z.boolean().default(false),
})
export type CurrencySettings = z.infer<typeof currencySettingsSchema>

// endregion

// region Commerce · store notifications

export const STORE_NOTIFICATION_TEMPLATES = [
  'order_confirmation',
  'shipping_confirmation',
  'refund_confirmation',
  'abandoned_cart',
] as const
export const storeNotificationTemplateSchema = z.enum(STORE_NOTIFICATION_TEMPLATES)
export type StoreNotificationTemplate = z.infer<typeof storeNotificationTemplateSchema>

export const storeNotificationSchema = z.object({
  template: storeNotificationTemplateSchema,
  enabled: z.boolean().default(true),
  subject: z.string().max(200).default(''),
  /** Plain text with `{{order.number}}`-style placeholders. Never raw HTML. */
  body: z.string().max(5000).default(''),
  /** Internal copies, e.g. the fulfilment inbox. */
  bcc: z.array(emailSchema).max(10).default([]),
})
export type StoreNotification = z.infer<typeof storeNotificationSchema>

export const storeNotificationSettingsSchema = z.object({
  fromName: z.string().max(120).default(''),
  fromEmail: emailSchema.or(z.literal('')).default(''),
  replyTo: emailSchema.or(z.literal('')).default(''),
  templates: z.array(storeNotificationSchema).max(STORE_NOTIFICATION_TEMPLATES.length).default([]),
})
export type StoreNotificationSettings = z.infer<typeof storeNotificationSettingsSchema>

// endregion

// region The registry
//
// One table mapping an addressable key to its schema and its minimum plan. The
// route layer iterates this rather than switching on strings, which is what
// keeps "add a settings section" a one-line change.

export interface SettingsDefinition {
  scope: SettingsScope
  key: string
  schema: z.ZodTypeAny
  /** Below this plan the key is readable but not writable. Null = every plan. */
  minimumPlan: z.infer<typeof planSchema> | null
  label: string
}

export const SETTINGS_REGISTRY: readonly SettingsDefinition[] = Object.freeze([
  { scope: 'platform', key: 'workspace', schema: workspaceSettingsSchema, minimumPlan: null, label: 'Workspace' },
  { scope: 'platform', key: 'onboarding', schema: onboardingSettingsSchema, minimumPlan: null, label: 'Onboarding' },
  {
    scope: 'platform',
    key: 'onboarding-funnel',
    schema: onboardingFunnelSchema,
    minimumPlan: null,
    label: 'Onboarding funnel',
  },
  { scope: 'platform', key: 'notifications', schema: notificationSettingsSchema, minimumPlan: null, label: 'Notifications' },
  { scope: 'platform', key: 'ai', schema: aiSettingsSchema, minimumPlan: null, label: 'AI' },
  { scope: 'platform', key: 'data-retention', schema: dataRetentionSettingsSchema, minimumPlan: null, label: 'Data & privacy' },
  { scope: 'platform', key: 'whatsapp', schema: whatsappSettingsSchema, minimumPlan: null, label: 'WhatsApp' },
  { scope: 'commerce', key: 'engine', schema: commerceEngineSettingsSchema, minimumPlan: null, label: 'Commerce connection' },
  { scope: 'commerce', key: 'payments', schema: paymentSettingsSchema, minimumPlan: null, label: 'Payments' },
  { scope: 'commerce', key: 'shipping', schema: shippingSettingsSchema, minimumPlan: null, label: 'Shipping' },
  { scope: 'commerce', key: 'taxes', schema: taxSettingsSchema, minimumPlan: null, label: 'Taxes' },
  { scope: 'commerce', key: 'checkout', schema: checkoutSettingsSchema, minimumPlan: null, label: 'Checkout' },
  { scope: 'commerce', key: 'inventory', schema: inventorySettingsSchema, minimumPlan: null, label: 'Inventory' },
  // Multi-currency is a Scale entitlement: the base currency is free, the
  // additional ones are not.
  { scope: 'commerce', key: 'currencies', schema: currencySettingsSchema, minimumPlan: 'scale', label: 'Currencies' },
  { scope: 'commerce', key: 'notifications', schema: storeNotificationSettingsSchema, minimumPlan: null, label: 'Store notifications' },
  { scope: 'commerce', key: 'feeds', schema: feedSettingsSchema, minimumPlan: null, label: 'Product feeds' },
])

export function settingsDefinition(scope: SettingsScope, key: string): SettingsDefinition | null {
  return SETTINGS_REGISTRY.find((entry) => entry.scope === scope && entry.key === key) ?? null
}

// endregion
