import { PERMISSIONS, type Permission, type Role } from '@platform/schemas'

const ALL: readonly Permission[] = PERMISSIONS

const READ_ONLY: Permission[] = [
  'tenant:read',
  'member:read',
  'site:read',
  'page:read',
  'media:read',
  'domain:read',
  'seo:read',
  'ads:read',
  'email:read',
  'automation:read',
  'experiment:read',
  'commerce:read',
  'order:read',
  'customer:read',
  'crm:read',
  'analytics:read',
  'tracking:read',
  'app:read',
  'integration:read',
]

const CONTENT_EDITOR: Permission[] = [
  ...READ_ONLY,
  'page:write',
  'media:write',
  'seo:write',
  'ai:use',
]

const MARKETER: Permission[] = [
  ...CONTENT_EDITOR,
  'page:publish',
  'ads:write',
  'email:write',
  'automation:write',
  'experiment:write',
  'crm:write',
  'tracking:write',
]

const SEO_MANAGER: Permission[] = [...CONTENT_EDITOR, 'page:publish', 'domain:write']

const SALES: Permission[] = [...READ_ONLY, 'crm:write', 'customer:write', 'ai:use']

const SUPPORT: Permission[] = [...READ_ONLY, 'order:write', 'customer:write']

const DEVELOPER: Permission[] = [
  ...READ_ONLY,
  'site:write',
  'page:write',
  'page:publish',
  'media:write',
  'domain:write',
  'tracking:write',
  'developer:read',
  'developer:write',
  'integration:write',
  'app:install',
  'ai:use',
]

const ADMIN: Permission[] = ALL.filter(
  (permission) => permission !== 'billing:manage' && permission !== 'ai:autonomous',
)

/**
 * Role → permission set. Built-in roles are a convenience over the permission
 * model, never a replacement for it: no code branches on a role name, only on
 * a permission. Custom roles (Enterprise) will store an explicit set here.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = Object.freeze({
  owner: ALL,
  admin: ADMIN,
  developer: DEVELOPER,
  marketer: MARKETER,
  seo_manager: SEO_MANAGER,
  sales: SALES,
  content_editor: CONTENT_EDITOR,
  support: SUPPORT,
  viewer: READ_ONLY,
})

/** Deduplicated permission set for a role, as a Set for O(1) checks. */
export function permissionsForRole(role: Role): ReadonlySet<Permission> {
  return new Set(ROLE_PERMISSIONS[role])
}
