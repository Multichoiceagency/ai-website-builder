import {
  appManifestSchema,
  type AppCategory,
  type AppExtension,
  type AppManifest,
  type AppType,
  type DomainEventName,
  type Permission,
} from '@platform/schemas'

/**
 * `defineApp` — the entry point of the App SDK (§34).
 *
 * An app declares what it wants; it never assumes it. The manifest this
 * produces is the whole of an app's ambition: the permissions it will be
 * reviewed against, the events it will receive, and the surfaces it will be
 * rendered into. Nothing an app does at runtime can exceed it, because the
 * gateway checks against the *installation* that this manifest was reviewed
 * into — not against the manifest itself.
 */

export interface DefineAppInput {
  /** Globally unique, lowercase and dash-separated. Becomes the app's slug. */
  id: string
  name: string
  version?: string
  tagline?: string
  description?: string
  category?: AppCategory
  type?: AppType
  /**
   * Typed against the platform's permission vocabulary on purpose: a wildcard
   * is not merely refused at review, it does not compile.
   */
  permissions?: readonly Permission[]
  events?: readonly DomainEventName[]
  extensions?: readonly AppExtension[]
  webhookUrl?: string
  homepageUrl?: string
  supportEmail?: string
  iconUrl?: string
}

export interface AppDefinition {
  readonly manifest: AppManifest
  /** Serialised form, for `POST /api/v1/apps/developer/apps/:id/submit`. */
  toJSON(): AppManifest
}

export class AppDefinitionError extends Error {
  constructor(
    message: string,
    readonly issues: unknown,
  ) {
    super(message)
    this.name = 'AppDefinitionError'
  }
}

export function defineApp(input: DefineAppInput): AppDefinition {
  const result = appManifestSchema.safeParse({
    id: input.id,
    name: input.name,
    version: input.version ?? '1.0.0',
    tagline: input.tagline ?? '',
    description: input.description ?? '',
    category: input.category ?? 'other',
    type: input.type ?? 'public',
    permissions: [...(input.permissions ?? [])],
    events: [...(input.events ?? [])],
    extensions: [...(input.extensions ?? [])],
    webhookUrl: input.webhookUrl,
    homepageUrl: input.homepageUrl,
    supportEmail: input.supportEmail,
    iconUrl: input.iconUrl,
  })

  if (!result.success) {
    // Fail at definition time rather than at submission time: a developer
    // should learn about a malformed manifest from their own build.
    throw new AppDefinitionError(`Invalid app definition for \`${input.id}\`.`, result.error.flatten())
  }

  const manifest = Object.freeze(result.data)

  return Object.freeze({
    manifest,
    toJSON: () => manifest,
  })
}

/** Small helper so an extension keeps its literal types at the call site. */
export function defineExtension(extension: AppExtension): AppExtension {
  return Object.freeze({ ...extension })
}
