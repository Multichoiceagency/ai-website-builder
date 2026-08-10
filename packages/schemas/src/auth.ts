import { z } from 'zod'
import { emailSchema, isoTimestampSchema, uuidSchema } from './common.js'
import { membershipSchema } from './tenant.js'
import { permissionSchema } from './rbac.js'

export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string().min(1).max(200),
  createdAt: isoTimestampSchema,
})
export type User = z.infer<typeof userSchema>

export const registerInputSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(200),
  /**
   * 12 characters minimum. Length beats composition rules — we do not impose
   * character-class requirements that push people toward `Passw0rd!`.
   */
  password: z.string().min(12).max(200),
  /** Optional — defaults to the user's name / e-mail local-part. Rename later in Settings. */
  organizationName: z.string().trim().min(1).max(200).optional(),
})
export type RegisterInput = z.infer<typeof registerInputSchema>

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
})
export type LoginInput = z.infer<typeof loginInputSchema>

/**
 * Everything the dashboard needs to render after a page load: who you are, which
 * tenants you can act in, and — for the active tenant — the resolved permission
 * set. The client uses permissions to hide affordances; the server re-checks
 * every one of them.
 */
export const sessionContextSchema = z.object({
  user: userSchema,
  memberships: z.array(membershipSchema),
  activeTenantId: uuidSchema.nullable(),
  permissions: z.array(permissionSchema),
  /** Set when a platform admin is viewing as this user. */
  impersonatorUserId: uuidSchema.nullable().optional(),
})
export type SessionContext = z.infer<typeof sessionContextSchema>
