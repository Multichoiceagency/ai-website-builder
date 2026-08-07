import { z } from 'zod'
import { BadRequestError } from './errors.js'

/**
 * Validate at the boundary and fail with the field-level detail a form UI can
 * actually render. Every route body, query and param goes through here — see
 * ADR-0002.
 */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown, what = 'request'): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new BadRequestError(`Invalid ${what}.`, result.error.flatten())
  }
  return result.data
}
