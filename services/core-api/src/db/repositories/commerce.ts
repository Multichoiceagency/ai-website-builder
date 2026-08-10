import {
  collectionSchema,
  inventoryLevelSchema,
  inventoryLocationSchema,
  productSchema,
  productSummarySchema,
  productVariantSchema,
  shippingRateSchema,
  type Collection,
  type CreateProductVariantInput,
  type InventoryLevel,
  type InventoryLocation,
  type Product,
  type ProductImage,
  type ProductOption,
  type ProductQuery,
  type ProductStatus,
  type ProductSummary,
  type ProductVariant,
  type ShippingRate,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'
import { readAmount, readCount, readMoney, readOptionalMoney } from '../money.js'

/**
 * Commerce catalog, inventory and shipping-rate persistence (ADR-0005).
 *
 * SQL lives here and only here. Every function takes a transaction that is
 * already bound to a tenant, and still filters on `tenant_id` — the application
 * filter and the RLS policy are two independent layers on purpose (ADR-0004).
 */

// region Collections

interface CollectionRow {
  id: string
  title: string
  handle: string
  description: string
  product_count: number
  created_at: Date
}

function toCollection(row: CollectionRow): Collection {
  return collectionSchema.parse({
    id: row.id,
    title: row.title,
    handle: row.handle,
    description: row.description,
    productCount: readCount(row.product_count),
    createdAt: row.created_at,
  })
}

export async function listCollections(tx: Tx, tenantId: string): Promise<Collection[]> {
  const rows = await tx<CollectionRow[]>`
    SELECT c.id, c.title, c.handle, c.description, c.created_at,
           (SELECT count(*) FROM commerce_product_collections pc WHERE pc.collection_id = c.id) AS product_count
    FROM commerce_collections c
    WHERE c.tenant_id = ${tenantId}
    ORDER BY c.title ASC
  `
  return rows.map(toCollection)
}

export async function findCollectionByHandle(tx: Tx, tenantId: string, handle: string): Promise<Collection | null> {
  const [row] = await tx<CollectionRow[]>`
    SELECT id, title, handle, description, created_at, 0 AS product_count
    FROM commerce_collections
    WHERE tenant_id = ${tenantId} AND handle = ${handle}
    LIMIT 1
  `
  return row ? toCollection(row) : null
}

export async function insertCollection(
  tx: Tx,
  input: { tenantId: string; title: string; handle: string; description: string },
): Promise<Collection> {
  const [row] = await tx<CollectionRow[]>`
    INSERT INTO commerce_collections (tenant_id, title, handle, description)
    VALUES (${input.tenantId}, ${input.title}, ${input.handle}, ${input.description})
    RETURNING id, title, handle, description, created_at, 0 AS product_count
  `
  return toCollection(row!)
}

// endregion

// region Products

interface ProductRow {
  id: string
  title: string
  handle: string
  status: ProductStatus
  description: string
  tax_rate_bps: number
  options: unknown
  images: unknown
  created_at: Date
  updated_at: Date
  variant_count: number
  min_price: string | null
  price_currency: string | null
  inventory_quantity: string | null
}

interface VariantRow {
  id: string
  product_id: string
  title: string
  sku: string | null
  barcode: string | null
  price_amount: string
  compare_at_amount: string | null
  currency: string
  option_values: unknown
  weight_grams: number
  position: number
  inventory_quantity: string | null
}

function firstImage(value: unknown): ProductImage | null {
  const images = readJson<ProductImage[]>(value, [])
  return images.length > 0 ? images[0]! : null
}

function toSummary(row: ProductRow): ProductSummary {
  return productSummarySchema.parse({
    id: row.id,
    title: row.title,
    handle: row.handle,
    status: row.status,
    priceFrom: readOptionalMoney(row.min_price, row.price_currency),
    variantCount: readCount(row.variant_count),
    inventoryQuantity: readCount(row.inventory_quantity),
    image: firstImage(row.images),
    updatedAt: row.updated_at,
  })
}

function toVariant(row: VariantRow): ProductVariant {
  return productVariantSchema.parse({
    id: row.id,
    productId: row.product_id,
    title: row.title,
    sku: row.sku,
    barcode: row.barcode,
    price: readMoney(row.price_amount, row.currency),
    compareAtPrice: readOptionalMoney(row.compare_at_amount, row.currency),
    optionValues: readJson<Record<string, string>>(row.option_values, {}),
    weightGrams: row.weight_grams,
    inventoryQuantity: readCount(row.inventory_quantity),
    position: row.position,
  })
}

/**
 * Aggregates a product needs but does not store: the cheapest variant, how many
 * there are, and how many units exist across every location. Derived on read so
 * a stock movement can never leave a stale number behind.
 */
const PRODUCT_AGGREGATES = (tx: Tx) => tx`
  LEFT JOIN LATERAL (
    SELECT count(*) AS variant_count, min(v.price_amount) AS min_price, min(v.currency) AS price_currency
    FROM commerce_variants v WHERE v.product_id = p.id
  ) agg ON true
  LEFT JOIN LATERAL (
    SELECT sum(il.available) AS inventory_quantity
    FROM commerce_inventory_levels il
    JOIN commerce_variants v2 ON v2.id = il.variant_id
    WHERE v2.product_id = p.id
  ) inv ON true
`

function productFilters(tx: Tx, tenantId: string, query: ProductQuery) {
  const term = query.search ? `%${query.search}%` : null
  return tx`
    p.tenant_id = ${tenantId}
    ${query.status ? tx`AND p.status = ${query.status}` : tx``}
    ${term ? tx`AND (p.title ILIKE ${term} OR p.handle ILIKE ${term})` : tx``}
    ${
      query.collectionId
        ? tx`AND EXISTS (
            SELECT 1 FROM commerce_product_collections pc
            WHERE pc.product_id = p.id AND pc.collection_id = ${query.collectionId}
          )`
        : tx``
    }
  `
}

export async function listProducts(
  tx: Tx,
  tenantId: string,
  query: ProductQuery,
): Promise<{ items: ProductSummary[]; total: number }> {
  // The predicate is rebuilt for each statement rather than shared: a
  // postgres.js fragment belongs to the query it is interpolated into.
  const rows = await tx<ProductRow[]>`
    SELECT p.id, p.title, p.handle, p.status, p.description, p.tax_rate_bps, p.options, p.images,
           p.created_at, p.updated_at,
           agg.variant_count, agg.min_price, agg.price_currency, inv.inventory_quantity
    FROM commerce_products p
    ${PRODUCT_AGGREGATES(tx)}
    WHERE ${productFilters(tx, tenantId, query)}
    ORDER BY p.updated_at DESC
    LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}
  `

  const [counted] = await tx<{ total: string }[]>`
    SELECT count(*) AS total FROM commerce_products p WHERE ${productFilters(tx, tenantId, query)}
  `

  return { items: rows.map(toSummary), total: readCount(counted?.total) }
}

async function loadVariants(tx: Tx, tenantId: string, productId: string): Promise<ProductVariant[]> {
  const rows = await tx<VariantRow[]>`
    SELECT v.id, v.product_id, v.title, v.sku, v.barcode, v.price_amount, v.compare_at_amount,
           v.currency, v.option_values, v.weight_grams, v.position,
           (SELECT sum(il.available) FROM commerce_inventory_levels il WHERE il.variant_id = v.id)
             AS inventory_quantity
    FROM commerce_variants v
    WHERE v.tenant_id = ${tenantId} AND v.product_id = ${productId}
    ORDER BY v.position ASC, v.created_at ASC
  `
  return rows.map(toVariant)
}

async function loadCollectionIds(tx: Tx, tenantId: string, productId: string): Promise<string[]> {
  const rows = await tx<{ collection_id: string }[]>`
    SELECT collection_id FROM commerce_product_collections
    WHERE tenant_id = ${tenantId} AND product_id = ${productId}
  `
  return rows.map((row) => row.collection_id)
}

async function toProduct(tx: Tx, tenantId: string, row: ProductRow): Promise<Product> {
  const [variants, collectionIds] = await Promise.all([
    loadVariants(tx, tenantId, row.id),
    loadCollectionIds(tx, tenantId, row.id),
  ])

  return productSchema.parse({
    ...toSummary(row),
    description: row.description,
    taxRateBps: row.tax_rate_bps,
    options: readJson<ProductOption[]>(row.options, []),
    images: readJson<ProductImage[]>(row.images, []),
    variants,
    collectionIds,
    createdAt: row.created_at,
  })
}

export async function findProductById(tx: Tx, tenantId: string, productId: string): Promise<Product | null> {
  const [row] = await tx<ProductRow[]>`
    SELECT p.id, p.title, p.handle, p.status, p.description, p.tax_rate_bps, p.options, p.images,
           p.created_at, p.updated_at,
           agg.variant_count, agg.min_price, agg.price_currency, inv.inventory_quantity
    FROM commerce_products p
    ${PRODUCT_AGGREGATES(tx)}
    WHERE p.tenant_id = ${tenantId} AND p.id = ${productId}
    LIMIT 1
  `
  return row ? toProduct(tx, tenantId, row) : null
}

export async function findProductByHandle(tx: Tx, tenantId: string, handle: string): Promise<Product | null> {
  const [row] = await tx<ProductRow[]>`
    SELECT p.id, p.title, p.handle, p.status, p.description, p.tax_rate_bps, p.options, p.images,
           p.created_at, p.updated_at,
           agg.variant_count, agg.min_price, agg.price_currency, inv.inventory_quantity
    FROM commerce_products p
    ${PRODUCT_AGGREGATES(tx)}
    WHERE p.tenant_id = ${tenantId} AND p.handle = ${handle}
    LIMIT 1
  `
  return row ? toProduct(tx, tenantId, row) : null
}

export async function productHandleTaken(tx: Tx, tenantId: string, handle: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    SELECT id FROM commerce_products WHERE tenant_id = ${tenantId} AND handle = ${handle} LIMIT 1
  `
  return rows.length > 0
}

export interface InsertProductInput {
  tenantId: string
  title: string
  handle: string
  description: string
  status: ProductStatus
  taxRateBps: number
  options: ProductOption[]
  images: ProductImage[]
  variants: CreateProductVariantInput[]
  collectionIds: string[]
}

export async function insertProduct(tx: Tx, input: InsertProductInput): Promise<string> {
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO commerce_products (tenant_id, title, handle, description, status, tax_rate_bps, options, images)
    VALUES (
      ${input.tenantId}, ${input.title}, ${input.handle}, ${input.description}, ${input.status},
      ${input.taxRateBps}, ${jsonParam(tx, input.options)}, ${jsonParam(tx, input.images)}
    )
    RETURNING id
  `

  const productId = row!.id
  await insertVariants(tx, input.tenantId, productId, input.variants)
  await setProductCollections(tx, input.tenantId, productId, input.collectionIds)
  return productId
}

async function insertVariants(
  tx: Tx,
  tenantId: string,
  productId: string,
  variants: CreateProductVariantInput[],
  startPosition = 0,
): Promise<void> {
  let position = startPosition
  for (const variant of variants) {
    await tx`
      INSERT INTO commerce_variants (
        tenant_id, product_id, title, sku, barcode, price_amount, compare_at_amount,
        currency, option_values, weight_grams, position
      )
      VALUES (
        ${tenantId}, ${productId}, ${variant.title}, ${variant.sku ?? null}, ${variant.barcode ?? null},
        ${variant.price.amount}, ${variant.compareAtPrice?.amount ?? null}, ${variant.price.currency},
        ${jsonParam(tx, variant.optionValues ?? {})}, ${variant.weightGrams ?? 0}, ${position}
      )
    `
    position += 1
  }
}

export async function setProductCollections(
  tx: Tx,
  tenantId: string,
  productId: string,
  collectionIds: string[],
): Promise<void> {
  await tx`
    DELETE FROM commerce_product_collections WHERE tenant_id = ${tenantId} AND product_id = ${productId}
  `
  for (const collectionId of collectionIds) {
    await tx`
      INSERT INTO commerce_product_collections (tenant_id, product_id, collection_id)
      VALUES (${tenantId}, ${productId}, ${collectionId})
      ON CONFLICT DO NOTHING
    `
  }
}

export interface UpdateProductFields {
  title?: string
  handle?: string
  description?: string
  status?: ProductStatus
  taxRateBps?: number
  options?: ProductOption[]
  images?: ProductImage[]
}

export async function updateProductFields(
  tx: Tx,
  tenantId: string,
  productId: string,
  patch: UpdateProductFields,
): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE commerce_products SET
      title        = COALESCE(${patch.title ?? null}::text, title),
      handle       = COALESCE(${patch.handle ?? null}::text, handle),
      description  = COALESCE(${patch.description ?? null}::text, description),
      status       = COALESCE(${patch.status ?? null}::text, status),
      tax_rate_bps = COALESCE(${patch.taxRateBps ?? null}::int, tax_rate_bps),
      options      = COALESCE(${patch.options ? jsonParam(tx, patch.options) : null}::jsonb, options),
      images       = COALESCE(${patch.images ? jsonParam(tx, patch.images) : null}::jsonb, images)
    WHERE tenant_id = ${tenantId} AND id = ${productId}
    RETURNING id
  `
  return rows.length > 0
}

/**
 * Replace the variant set.
 *
 * Variants that keep their id are updated rather than recreated, so their
 * inventory levels survive an edit — deleting and re-inserting would silently
 * zero every warehouse.
 */
export async function replaceVariants(
  tx: Tx,
  tenantId: string,
  productId: string,
  variants: (CreateProductVariantInput & { id?: string })[],
): Promise<void> {
  const keptIds = variants.map((variant) => variant.id).filter((id): id is string => Boolean(id))

  if (keptIds.length > 0) {
    await tx`
      DELETE FROM commerce_variants
      WHERE tenant_id = ${tenantId} AND product_id = ${productId} AND id NOT IN ${tx(keptIds)}
    `
  } else {
    await tx`DELETE FROM commerce_variants WHERE tenant_id = ${tenantId} AND product_id = ${productId}`
  }

  let position = 0
  for (const variant of variants) {
    if (variant.id) {
      await tx`
        UPDATE commerce_variants SET
          title             = ${variant.title},
          sku               = ${variant.sku ?? null},
          barcode           = ${variant.barcode ?? null},
          price_amount      = ${variant.price.amount},
          compare_at_amount = ${variant.compareAtPrice?.amount ?? null},
          currency          = ${variant.price.currency},
          option_values     = ${jsonParam(tx, variant.optionValues ?? {})},
          weight_grams      = ${variant.weightGrams ?? 0},
          position          = ${position}
        WHERE tenant_id = ${tenantId} AND id = ${variant.id} AND product_id = ${productId}
      `
    } else {
      await insertVariants(tx, tenantId, productId, [variant], position)
    }
    position += 1
  }
}

export async function deleteProduct(tx: Tx, tenantId: string, productId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM commerce_products WHERE tenant_id = ${tenantId} AND id = ${productId} RETURNING id
  `
  return rows.length > 0
}

/** What a cart line needs, snapshotted at the moment the line is created. */
export interface VariantForCart {
  variantId: string
  productId: string
  productTitle: string
  variantTitle: string
  sku: string | null
  priceAmount: number
  currency: string
  taxRateBps: number
}

export async function findVariantForCart(
  tx: Tx,
  tenantId: string,
  variantId: string,
): Promise<VariantForCart | null> {
  const [row] = await tx<
    {
      id: string
      product_id: string
      product_title: string
      title: string
      sku: string | null
      price_amount: string
      currency: string
      tax_rate_bps: number
    }[]
  >`
    SELECT v.id, v.product_id, p.title AS product_title, v.title, v.sku, v.price_amount, v.currency,
           p.tax_rate_bps
    FROM commerce_variants v
    JOIN commerce_products p ON p.id = v.product_id
    WHERE v.tenant_id = ${tenantId} AND v.id = ${variantId}
    LIMIT 1
  `
  if (!row) return null

  return {
    variantId: row.id,
    productId: row.product_id,
    productTitle: row.product_title,
    variantTitle: row.title,
    sku: row.sku,
    priceAmount: readAmount(row.price_amount),
    currency: row.currency,
    taxRateBps: row.tax_rate_bps,
  }
}

// endregion

// region Locations and inventory

interface LocationRow {
  id: string
  name: string
  code: string
  is_default: boolean
  created_at: Date
}

function toLocation(row: LocationRow): InventoryLocation {
  return inventoryLocationSchema.parse({
    id: row.id,
    name: row.name,
    code: row.code,
    isDefault: row.is_default,
    createdAt: row.created_at,
  })
}

export async function listLocations(tx: Tx, tenantId: string): Promise<InventoryLocation[]> {
  const rows = await tx<LocationRow[]>`
    SELECT id, name, code, is_default, created_at FROM commerce_locations
    WHERE tenant_id = ${tenantId}
    ORDER BY is_default DESC, name ASC
  `
  return rows.map(toLocation)
}

export async function insertLocation(
  tx: Tx,
  input: { tenantId: string; name: string; code: string; isDefault: boolean },
): Promise<InventoryLocation> {
  // Only one default may exist, so an incoming default demotes the old one in
  // the same transaction as it is created.
  if (input.isDefault) {
    await tx`UPDATE commerce_locations SET is_default = false WHERE tenant_id = ${input.tenantId}`
  }

  const [row] = await tx<LocationRow[]>`
    INSERT INTO commerce_locations (tenant_id, name, code, is_default)
    VALUES (${input.tenantId}, ${input.name}, ${input.code}, ${input.isDefault})
    RETURNING id, name, code, is_default, created_at
  `
  return toLocation(row!)
}

/** The location stock moves through when nobody has said which one. */
export async function findDefaultLocationId(tx: Tx, tenantId: string): Promise<string | null> {
  const [row] = await tx<{ id: string }[]>`
    SELECT id FROM commerce_locations
    WHERE tenant_id = ${tenantId}
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1
  `
  return row?.id ?? null
}

export async function listInventory(tx: Tx, tenantId: string, variantId: string): Promise<InventoryLevel[]> {
  const rows = await tx<
    { variant_id: string; location_id: string; location_name: string; available: number; reserved: number }[]
  >`
    SELECT il.variant_id, il.location_id, l.name AS location_name, il.available, il.reserved
    FROM commerce_inventory_levels il
    JOIN commerce_locations l ON l.id = il.location_id
    WHERE il.tenant_id = ${tenantId} AND il.variant_id = ${variantId}
    ORDER BY l.name ASC
  `
  return rows.map((row) =>
    inventoryLevelSchema.parse({
      variantId: row.variant_id,
      locationId: row.location_id,
      locationName: row.location_name,
      available: row.available,
      reserved: row.reserved,
    }),
  )
}

export async function upsertInventoryLevel(
  tx: Tx,
  input: { tenantId: string; variantId: string; locationId: string; available: number },
): Promise<InventoryLevel> {
  const [row] = await tx<
    { variant_id: string; location_id: string; available: number; reserved: number }[]
  >`
    INSERT INTO commerce_inventory_levels (tenant_id, variant_id, location_id, available)
    VALUES (${input.tenantId}, ${input.variantId}, ${input.locationId}, ${input.available})
    ON CONFLICT (variant_id, location_id) DO UPDATE SET available = EXCLUDED.available
    RETURNING variant_id, location_id, available, reserved
  `

  const [location] = await tx<{ name: string }[]>`
    SELECT name FROM commerce_locations WHERE tenant_id = ${input.tenantId} AND id = ${input.locationId}
  `

  return inventoryLevelSchema.parse({
    variantId: row!.variant_id,
    locationId: row!.location_id,
    locationName: location?.name ?? '',
    available: row!.available,
    reserved: row!.reserved,
  })
}

/**
 * Move stock out when an order is placed.
 *
 * Takes from the default location first and lets the level go negative rather
 * than refusing: a shop that oversells has a fulfilment problem, and hiding it
 * behind a failed order helps nobody. The negative number is the signal.
 */
export async function decrementInventory(
  tx: Tx,
  tenantId: string,
  variantId: string,
  quantity: number,
): Promise<void> {
  const [level] = await tx<{ location_id: string }[]>`
    SELECT il.location_id
    FROM commerce_inventory_levels il
    JOIN commerce_locations l ON l.id = il.location_id
    WHERE il.tenant_id = ${tenantId} AND il.variant_id = ${variantId}
    ORDER BY (il.available >= ${quantity}) DESC, l.is_default DESC, il.available DESC
    LIMIT 1
  `
  if (!level) return

  await tx`
    UPDATE commerce_inventory_levels SET available = available - ${quantity}
    WHERE tenant_id = ${tenantId} AND variant_id = ${variantId} AND location_id = ${level.location_id}
  `
}

// endregion

// region Shipping rates

interface ShippingRateRow {
  id: string
  name: string
  description: string
  price_amount: string
  currency: string
  free_above_amount: string | null
  countries: string[]
  active: boolean
}

function toShippingRate(row: ShippingRateRow): ShippingRate {
  return shippingRateSchema.parse({
    id: row.id,
    name: row.name,
    description: row.description,
    price: readMoney(row.price_amount, row.currency),
    freeAboveSubtotal: readOptionalMoney(row.free_above_amount, row.currency),
    countries: row.countries,
    active: row.active,
  })
}

const SHIPPING_RATE_COLUMNS = [
  'id',
  'name',
  'description',
  'price_amount',
  'currency',
  'free_above_amount',
  'countries',
  'active',
]

export async function listShippingRates(tx: Tx, tenantId: string): Promise<ShippingRate[]> {
  const rows = await tx<ShippingRateRow[]>`
    SELECT ${tx(SHIPPING_RATE_COLUMNS)} FROM commerce_shipping_rates
    WHERE tenant_id = ${tenantId}
    ORDER BY price_amount ASC, name ASC
  `
  return rows.map(toShippingRate)
}

export async function findShippingRateById(
  tx: Tx,
  tenantId: string,
  rateId: string,
): Promise<ShippingRate | null> {
  const [row] = await tx<ShippingRateRow[]>`
    SELECT ${tx(SHIPPING_RATE_COLUMNS)} FROM commerce_shipping_rates
    WHERE tenant_id = ${tenantId} AND id = ${rateId}
    LIMIT 1
  `
  return row ? toShippingRate(row) : null
}

export async function insertShippingRate(
  tx: Tx,
  input: {
    tenantId: string
    name: string
    description: string
    priceAmount: number
    currency: string
    freeAboveAmount: number | null
    countries: string[]
    active: boolean
  },
): Promise<ShippingRate> {
  const [row] = await tx<ShippingRateRow[]>`
    INSERT INTO commerce_shipping_rates
      (tenant_id, name, description, price_amount, currency, free_above_amount, countries, active)
    VALUES (
      ${input.tenantId}, ${input.name}, ${input.description}, ${input.priceAmount}, ${input.currency},
      ${input.freeAboveAmount}, ${input.countries}, ${input.active}
    )
    RETURNING ${tx(SHIPPING_RATE_COLUMNS)}
  `
  return toShippingRate(row!)
}

export async function deleteShippingRate(tx: Tx, tenantId: string, rateId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM commerce_shipping_rates WHERE tenant_id = ${tenantId} AND id = ${rateId} RETURNING id
  `
  return rows.length > 0
}

// endregion
