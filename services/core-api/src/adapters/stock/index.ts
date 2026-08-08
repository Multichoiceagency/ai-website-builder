import type { StockProviderId, StockSearchQuery } from '@platform/schemas'
import { mixkitStockProvider } from './mixkit.js'
import type { StockMediaProvider } from './types.js'

/**
 * Stock media provider registry (ADR-0006).
 *
 * Adding Pexels / Pixabay later is a new adapter file plus one line here —
 * routes and dashboard stay the same.
 */

const providers: StockMediaProvider[] = [mixkitStockProvider]

export function stockProvider(id: StockProviderId): StockMediaProvider {
  const found = providers.find((provider) => provider.id === id)
  if (!found) throw new Error(`Unknown stock provider: ${id}`)
  return found
}

export function defaultStockProvider(): StockMediaProvider {
  return mixkitStockProvider
}

export function resolveStockProvider(query: Pick<StockSearchQuery, 'provider'>): StockMediaProvider {
  return stockProvider(query.provider)
}

export type { StockMediaProvider } from './types.js'
export { mixkitStockProvider } from './mixkit.js'
