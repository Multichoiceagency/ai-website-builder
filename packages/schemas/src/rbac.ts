import { z } from 'zod'

/**
 * Permissions are `resource:action`. They are the only currency the permission
 * engine understands — roles, plans, API keys and app scopes all resolve down
 * to a set of these strings.
 *
 * Keep them granular. A coarse permission is a permission that eventually gets
 * granted to something that should not have had it.
 */
export const PERMISSIONS = [
  // tenant & people
  'tenant:read',
  'tenant:write',
  'member:read',
  'member:invite',
  'member:manage',
  'billing:read',
  'billing:manage',
  'audit:read',

  // websites & content
  'site:read',
  'site:write',
  'site:delete',
  'page:read',
  'page:write',
  'page:publish',
  'page:delete',
  'media:read',
  'media:write',
  'domain:read',
  'domain:write',

  // growth
  'seo:read',
  'seo:write',
  'ads:read',
  'ads:write',
  'email:read',
  'email:write',
  'automation:read',
  'automation:write',
  'experiment:read',
  'experiment:write',

  // commerce & crm
  'commerce:read',
  'commerce:write',
  'order:read',
  'order:write',
  'customer:read',
  'customer:write',
  'crm:read',
  'crm:write',

  // measurement
  'analytics:read',
  'tracking:read',
  'tracking:write',

  // platform extension
  'app:read',
  'app:install',
  'developer:read',
  'developer:write',
  'integration:read',
  'integration:write',

  // ai
  'ai:use',
  'ai:autonomous',
] as const

export const permissionSchema = z.enum(PERMISSIONS)
export type Permission = z.infer<typeof permissionSchema>

/**
 * Built-in roles. Custom roles (Enterprise) will be stored as an explicit
 * permission set, which is why nothing downstream may branch on the role name —
 * it must branch on permissions.
 */
export const ROLES = [
  'owner',
  'admin',
  'developer',
  'marketer',
  'seo_manager',
  'sales',
  'content_editor',
  'support',
  'viewer',
] as const

export const roleSchema = z.enum(ROLES)
export type Role = z.infer<typeof roleSchema>

/** Risk classification for AI-invocable tools — see ADR-0007. */
export const riskLevelSchema = z.enum(['low', 'medium', 'high'])
export type RiskLevel = z.infer<typeof riskLevelSchema>
