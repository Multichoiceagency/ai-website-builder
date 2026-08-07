/**
 * `@platform/app-sdk` — what a third-party app is given (§34).
 *
 * Note what this package deliberately does not export: a database client, a
 * session, a tenant resolver, or anything that could be handed a raw
 * connection. An app declares a manifest, receives signed webhooks, and calls
 * the App Gateway with a key. That is the entire surface, and it is the whole
 * reason an installed app cannot exceed the permissions its installer granted.
 */
export { defineApp, defineExtension, AppDefinitionError } from './define-app.js'
export type { AppDefinition, DefineAppInput } from './define-app.js'

export { createAppClient, AppApiError } from './client.js'
export type { AppClient, AppClientOptions } from './client.js'

export { verifyWebhookSignature, signPayload, currentTimestamp } from './signature.js'
export type { VerifyWebhookInput } from './signature.js'

export {
  APP_KEY_HEADER,
  APP_SIGNATURE_HEADER,
  APP_TENANT_HEADER,
  APP_TIMESTAMP_HEADER,
  SIGNATURE_TOLERANCE_SECONDS,
  WEBHOOK_DELIVERY_HEADER,
  WEBHOOK_EVENT_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from '@platform/schemas'
export type {
  AppCategory,
  AppExtension,
  AppExtensionPoint,
  AppManifest,
  AppType,
  DomainEvent,
  DomainEventName,
  Permission,
} from '@platform/schemas'
