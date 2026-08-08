import type {
  StockMediaItem,
  StockMediaKind,
  StockProviderId,
  StockSearchQuery,
  StockSearchResult,
} from '@platform/schemas'

/**
 * Stock media capability (ADR-0006).
 *
 * Callers depend only on this interface and on platform-owned types from
 * `@platform/schemas`. Vendor URLs, HTML shapes and CDN path conventions live
 * inside a single adapter file.
 */

export interface StockMediaProvider {
  readonly id: StockProviderId
  readonly label: string

  /** Kinds this provider can return. */
  supports(kind: StockMediaKind): boolean

  search(query: StockSearchQuery): Promise<StockSearchResult>

  /**
   * True when `url` is a download the provider is willing to fetch on behalf of
   * a tenant (allowlisted CDN host + path). Used by the import route before
   * bytes leave the network perimeter.
   */
  isAllowedDownloadUrl(url: string): boolean
}

export type { StockMediaItem, StockSearchQuery, StockSearchResult }
