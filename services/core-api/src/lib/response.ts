import type { PaginationMeta, SuccessEnvelope } from '@platform/schemas'

/** One envelope for every response — see `common/patterns.md` and ADR-0002. */
export function ok<T>(data: T, meta?: PaginationMeta): SuccessEnvelope<T> {
  return meta ? { success: true, data, error: null, meta } : { success: true, data, error: null }
}
