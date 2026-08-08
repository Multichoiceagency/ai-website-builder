import type { ProductStatus } from '@platform/schemas'

/** Payload emitted by CommerceProductEditor on save. */
export type ProductFormPayload = {
  title: string
  handle: string
  description: string
  status: ProductStatus
  taxRateBps: number
  images: { url: string; alt: string }[]
  collectionIds: string[]
  variant: {
    id?: string
    title: string
    sku: string
    price: string
    compareAtPrice: string
    weightGrams: number
  }
}
