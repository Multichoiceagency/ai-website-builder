import { z } from 'zod'

// region Primitives

export const uuidSchema = z.string().uuid()

/** Lowercase, dash-separated, no leading/trailing/double dashes. */
export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase dash-separated slug')

export const emailSchema = z.string().email().max(320).toLowerCase()

/**
 * A hostname such as `acme.nl`, `shop.acme.nl` — or a single label like
 * `localhost`, which is what local development actually resolves against.
 * Never includes a scheme or a port.
 */
export const hostnameSchema = z
  .string()
  .min(3)
  .max(253)
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/, 'must be a valid hostname')

/**
 * Accepts what Postgres hands back (a `Date`) or what JSON hands back (a
 * string) and always yields an ISO-8601 string, so a timestamp looks identical
 * whether it crossed the database boundary or the HTTP boundary.
 */
export const isoTimestampSchema = z
  .union([z.string(), z.date()])
  .transform((value) => new Date(value).toISOString())

/** A site-relative path: always leading slash, never trailing (except root). */
export const pathSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^\/(?:[a-z0-9\-._~%]+(?:\/[a-z0-9\-._~%]+)*)?$/, 'must be a lowercase site-relative path')

export const localeSchema = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'must be a BCP-47 language tag such as `nl` or `nl-NL`')

// endregion

// region API envelope

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})
export type ApiError = z.infer<typeof apiErrorSchema>

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export const paginationMetaSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
})
export type PaginationMeta = z.infer<typeof paginationMetaSchema>

/**
 * One envelope for every API response, per `common/patterns.md`:
 * a status flag, a nullable payload, a nullable error, optional meta.
 */
export function successEnvelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
    error: z.null(),
    meta: paginationMetaSchema.optional(),
  })
}

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  data: z.null(),
  error: apiErrorSchema,
})

export type SuccessEnvelope<T> = {
  success: true
  data: T
  error: null
  meta?: PaginationMeta
}
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>
export type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope

// endregion
