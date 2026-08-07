import type { Permission, Role } from '@platform/schemas'
import { permissionsForRole } from './roles.js'

export * from './roles.js'
export * from './plans.js'

/** Thrown when a caller lacks a permission. Services map this to HTTP 403. */
export class PermissionDeniedError extends Error {
  readonly code = 'permission_denied'

  constructor(readonly permission: Permission) {
    super(`Missing required permission: ${permission}`)
    this.name = 'PermissionDeniedError'
  }
}

/**
 * The permission engine. Every authorization question in the platform reduces
 * to this call — HTTP routes, AI tool invocations, app API calls and webhook
 * subscriptions all pass through it.
 */
export function can(granted: Iterable<Permission>, required: Permission): boolean {
  const set = granted instanceof Set ? granted : new Set(granted)
  return set.has(required)
}

export function canAll(granted: Iterable<Permission>, required: readonly Permission[]): boolean {
  const set = granted instanceof Set ? granted : new Set(granted)
  return required.every((permission) => set.has(permission))
}

export function assertCan(granted: Iterable<Permission>, required: Permission): void {
  if (!can(granted, required)) throw new PermissionDeniedError(required)
}

/** Resolve a role to its permission list. Kept as an array for JSON responses. */
export function resolvePermissions(role: Role): Permission[] {
  return [...permissionsForRole(role)]
}
