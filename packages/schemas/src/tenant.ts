import { z } from 'zod'
import { isoTimestampSchema, slugSchema, uuidSchema } from './common.js'
import { roleSchema } from './rbac.js'

/**
 * Plans, cheapest first. Order matters: entitlement checks use the index, so a
 * feature gated at `scale` is available to `advanced` and `enterprise` too.
 */
export const PLANS = ['launch', 'grow', 'scale', 'advanced', 'enterprise'] as const
export const planSchema = z.enum(PLANS)
export type Plan = z.infer<typeof planSchema>

/** Hard limits per plan. Enforced server-side, never in the browser. */
export const planLimitsSchema = z.object({
  sites: z.number().int().min(1),
  users: z.number().int().min(1),
  domains: z.number().int().min(1),
  /** Relative AI usage multiplier against the Launch baseline. */
  aiUsageMultiplier: z.number().min(1),
  dedicatedRuntime: z.boolean(),
  autonomousOptimization: z.boolean(),
  privateApps: z.boolean(),
  whiteLabel: z.boolean(),
})
export type PlanLimits = z.infer<typeof planLimitsSchema>

export const organizationSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200),
  slug: slugSchema,
  createdAt: isoTimestampSchema,
})
export type Organization = z.infer<typeof organizationSchema>

export const tenantSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string().min(1).max(200),
  slug: slugSchema,
  plan: planSchema,
  createdAt: isoTimestampSchema,
})
export type Tenant = z.infer<typeof tenantSchema>

export const membershipSchema = z.object({
  tenantId: uuidSchema,
  tenantName: z.string(),
  tenantSlug: slugSchema,
  plan: planSchema,
  role: roleSchema,
})
export type Membership = z.infer<typeof membershipSchema>

export const createTenantInputSchema = z.object({
  name: z.string().min(1).max(200),
  slug: slugSchema,
  plan: planSchema.default('launch'),
})
export type CreateTenantInput = z.infer<typeof createTenantInputSchema>
