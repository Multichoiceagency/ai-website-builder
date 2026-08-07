import {
  appManifestSchema,
  DOMAIN_EVENT_NAMES,
  HIGH_PRIVILEGE_PERMISSIONS,
  MAX_REQUESTED_PERMISSIONS,
  PERMISSION_SET,
  type AppManifest,
  type AppReview,
  type AppReviewFlag,
  type Permission,
} from '@platform/schemas'
import { BadRequestError } from '../errors.js'

/**
 * Manifest validation and permission review (§37).
 *
 * This is the gate that decides what an app is *allowed to ask for*. It runs
 * before a human ever sees a submission, and it is deliberately mechanical: a
 * reviewer approving an app should be judging the product, not re-deriving
 * whether `app:*` is dangerous.
 *
 * A `blocking` flag refuses the submission outright. A `warning` flag lets it
 * through to `in_review` but never to `approved` without a person.
 */

const EVENT_NAME_SET: ReadonlySet<string> = new Set<string>(DOMAIN_EVENT_NAMES)
const HIGH_PRIVILEGE_SET: ReadonlySet<string> = new Set<string>(HIGH_PRIVILEGE_PERMISSIONS)

/**
 * Anything that is not an exact permission from the vocabulary. Catching this
 * as a *pattern* rather than as "not in the enum" is what lets the reviewer be
 * told `app:*` was a wildcard rather than merely unrecognised.
 */
function isWildcard(requested: string): boolean {
  return requested.includes('*') || requested.includes('%') || requested.trim() === 'all'
}

export function parseManifest(input: unknown): AppManifest {
  const result = appManifestSchema.safeParse(input)
  if (!result.success) {
    throw new BadRequestError('Invalid app manifest.', result.error.flatten())
  }
  return result.data
}

/**
 * Classify every permission and event a manifest asks for.
 *
 * Never throws: the caller needs the full list of problems to show a developer,
 * not the first one.
 */
export function reviewManifest(manifest: AppManifest): AppReview {
  const flags: AppReviewFlag[] = []
  const grantable: Permission[] = []

  const seen = new Set<string>()

  for (const requested of manifest.permissions) {
    const value = requested.trim()
    if (seen.has(value)) continue
    seen.add(value)

    if (isWildcard(value)) {
      flags.push({
        code: 'wildcard_permission',
        severity: 'blocking',
        subject: value,
        message:
          'Wildcard permission requests are never granted. List each `resource:action` the app actually needs.',
      })
      continue
    }

    if (!PERMISSION_SET.has(value)) {
      flags.push({
        code: 'unknown_permission',
        severity: 'blocking',
        subject: value,
        message: `\`${value}\` is not a platform permission.`,
      })
      continue
    }

    if (HIGH_PRIVILEGE_SET.has(value)) {
      flags.push({
        code: 'high_privilege_permission',
        severity: 'warning',
        subject: value,
        message: `\`${value}\` can change or destroy workspace-level state. Requires manual review.`,
      })
    }

    grantable.push(value as Permission)
  }

  if (grantable.length > MAX_REQUESTED_PERMISSIONS) {
    flags.push({
      code: 'excessive_permissions',
      severity: 'warning',
      subject: `${grantable.length} permissions`,
      message: `Asking for more than ${MAX_REQUESTED_PERMISSIONS} permissions reads as a role rather than a capability.`,
    })
  }

  if (grantable.length === 0 && flags.length === 0) {
    flags.push({
      code: 'no_permissions',
      severity: 'warning',
      subject: 'permissions',
      message: 'The app requests no permissions, so the gateway will refuse every call it makes.',
    })
  }

  for (const event of manifest.events) {
    if (!EVENT_NAME_SET.has(event)) {
      flags.push({
        code: 'unknown_event',
        severity: 'blocking',
        subject: event,
        message: `\`${event}\` is not a platform event. Subscribing to it would never fire.`,
      })
    }
  }

  for (const extension of manifest.extensions) {
    if (!extension.url) {
      flags.push({
        code: 'missing_extension_url',
        severity: 'blocking',
        subject: extension.id,
        message: `Extension \`${extension.id}\` declares no URL, so there is nothing to render.`,
      })
      continue
    }
    if (!isSecureUrl(extension.url)) {
      flags.push({
        code: 'insecure_url',
        severity: 'blocking',
        subject: extension.id,
        message: `Extension \`${extension.id}\` must be served over https.`,
      })
    }
  }

  if (manifest.webhookUrl && !isSecureUrl(manifest.webhookUrl)) {
    flags.push({
      code: 'insecure_url',
      severity: 'blocking',
      subject: 'webhookUrl',
      message: 'The webhook endpoint must be served over https.',
    })
  }

  const blocking = flags.filter((flag) => flag.severity === 'blocking')

  return {
    ok: blocking.length === 0,
    flags,
    grantablePermissions: blocking.length === 0 ? grantable : [],
    requiresManualReview: flags.length > 0,
  }
}

/** `localhost` stays allowed so an app can be developed without a tunnel. */
function isSecureUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}
