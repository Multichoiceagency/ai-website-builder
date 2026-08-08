import type { FeedSettings, Product } from '@platform/schemas'

/**
 * Marketplace product feeds (Google Shopping, Meta, Amazon, eBay, Marktplaats).
 *
 * Generates XML/CSV from real commerce products — no invented catalog rows.
 * Merchants can download a file or point Google/Meta at the live public URL.
 */

export type FeedChannel = 'google' | 'meta' | 'amazon' | 'ebay' | 'marktplaats'

/** How a merchant connects this channel — live URL paste vs file upload. */
export type FeedConnectMode = 'live_url' | 'file_upload'

export interface FeedChannelMeta {
  id: FeedChannel
  name: string
  description: string
  format: 'xml' | 'csv'
  contentType: string
  filename: string
  docsUrl: string
  connectMode: FeedConnectMode
  /** Short merchant-facing connect hint (no ads automation). */
  connectHint: string
}

export const FEED_CHANNELS: FeedChannelMeta[] = [
  {
    id: 'google',
    name: 'Google Shopping',
    description: 'Google Merchant Center product feed (RSS 2.0 + g: namespace).',
    format: 'xml',
    contentType: 'application/xml; charset=utf-8',
    filename: 'google-shopping.xml',
    docsUrl: 'https://support.google.com/merchants/answer/7052112',
    connectMode: 'live_url',
    connectHint: 'Paste the live URL into Google Merchant Center → Products → Feeds.',
  },
  {
    id: 'meta',
    name: 'Meta Catalog',
    description: 'Meta Commerce Manager catalog CSV (Facebook / Instagram shops).',
    format: 'csv',
    contentType: 'text/csv; charset=utf-8',
    filename: 'meta-catalog.csv',
    docsUrl: 'https://www.facebook.com/business/help/120325381881608',
    connectMode: 'live_url',
    connectHint: 'Paste the live URL into Meta Commerce Manager → Catalog → Data sources.',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    description: 'Flat-file style CSV for Amazon Seller inventory uploads.',
    format: 'csv',
    contentType: 'text/csv; charset=utf-8',
    filename: 'amazon-inventory.csv',
    docsUrl: 'https://sellercentral.amazon.com/help/hub/reference/G200332540',
    connectMode: 'file_upload',
    connectHint: 'Download the CSV and upload it in Amazon Seller Central inventory tools.',
  },
  {
    id: 'ebay',
    name: 'eBay',
    description: 'CSV listing file for eBay file-exchange / seller hub imports.',
    format: 'csv',
    contentType: 'text/csv; charset=utf-8',
    filename: 'ebay-listings.csv',
    docsUrl: 'https://www.ebay.com/help/selling/listings/creating-managing-listings',
    connectMode: 'file_upload',
    connectHint: 'Download the CSV and import it via eBay Seller Hub / file exchange.',
  },
  {
    id: 'marktplaats',
    name: 'Marktplaats',
    description: 'CSV export for Marktplaats / 2dehands merchant product uploads.',
    format: 'csv',
    contentType: 'text/csv; charset=utf-8',
    filename: 'marktplaats-products.csv',
    docsUrl: 'https://help.marktplaats.nl/',
    connectMode: 'file_upload',
    connectHint: 'Download the CSV and upload it in your Marktplaats merchant tools.',
  },
]

export function feedChannelMeta(id: string): FeedChannelMeta | undefined {
  return FEED_CHANNELS.find((entry) => entry.id === id)
}

export type FeedBuildOptions = {
  storefrontUrl: string
  shopName: string
  includeOutOfStock?: boolean
  currency?: string
  titleSuffix?: string
}

/** Defaults for callers that only pass storefront + shop name. */
export function feedOptionsFromSettings(
  base: { storefrontUrl: string; shopName: string },
  settings: FeedSettings,
): FeedBuildOptions {
  return {
    storefrontUrl: base.storefrontUrl,
    shopName: base.shopName,
    includeOutOfStock: settings.includeOutOfStock,
    currency: settings.currency || undefined,
    titleSuffix: settings.titleSuffix || undefined,
  }
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function moneyAmount(
  product: Product,
  currencyOverride?: string,
): { amount: number; currency: string } | null {
  const variant = product.variants.find((entry) => entry.price) ?? product.variants[0]
  const price = variant?.price ?? product.priceFrom
  if (!price) return null
  return { amount: price.amount, currency: currencyOverride || price.currency }
}

function formatMoney(product: Product, currencyOverride?: string): string {
  const money = moneyAmount(product, currencyOverride)
  if (!money) return ''
  return `${(money.amount / 100).toFixed(2)} ${money.currency}`
}

function availability(product: Product): string {
  if (product.status !== 'active') return 'out of stock'
  return product.inventoryQuantity > 0 ? 'in stock' : 'out of stock'
}

function primaryImage(product: Product): string {
  return product.image?.url || product.images[0]?.url || ''
}

function productLink(product: Product, storefrontBase: string): string {
  const base = storefrontBase.replace(/\/$/, '')
  return `${base}/shop/${product.handle}`
}

function description(product: Product): string {
  const raw = product.description?.trim() || product.title
  return raw.replace(/\s+/g, ' ').slice(0, 5000)
}

function sku(product: Product): string {
  return product.variants[0]?.sku || product.handle
}

function displayTitle(product: Product, suffix?: string): string {
  const extra = suffix?.trim()
  return extra ? `${product.title}${extra}` : product.title
}

function selectProducts(products: Product[], options: FeedBuildOptions): Product[] {
  const active = products.filter((product) => product.status === 'active')
  if (options.includeOutOfStock) return active
  return active.filter((product) => product.inventoryQuantity > 0)
}

export function buildFeed(channel: FeedChannel, products: Product[], options: FeedBuildOptions): string {
  const selected = selectProducts(products, options)
  switch (channel) {
    case 'google':
      return buildGoogleXml(selected, options)
    case 'meta':
      return buildMetaCsv(selected, options)
    case 'amazon':
      return buildAmazonCsv(selected, options)
    case 'ebay':
      return buildEbayCsv(selected, options)
    case 'marktplaats':
      return buildMarktplaatsCsv(selected, options)
  }
}

function buildGoogleXml(products: Product[], options: FeedBuildOptions): string {
  const items = products
    .map((product) => {
      const price = formatMoney(product, options.currency)
      if (!price) return ''
      return `    <item>
      <g:id>${xmlEscape(product.id)}</g:id>
      <g:title>${xmlEscape(displayTitle(product, options.titleSuffix))}</g:title>
      <g:description>${xmlEscape(description(product))}</g:description>
      <g:link>${xmlEscape(productLink(product, options.storefrontUrl))}</g:link>
      <g:image_link>${xmlEscape(primaryImage(product))}</g:image_link>
      <g:availability>${availability(product) === 'in stock' ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${xmlEscape(price)}</g:price>
      <g:brand>${xmlEscape(options.shopName)}</g:brand>
      <g:mpn>${xmlEscape(sku(product))}</g:mpn>
    </item>`
    })
    .filter(Boolean)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(options.shopName)} Google Shopping feed</title>
    <link>${xmlEscape(options.storefrontUrl)}</link>
    <description>Product feed for Google Merchant Center</description>
${items}
  </channel>
</rss>
`
}

function csvRows(headers: string[], rows: string[][]): string {
  return [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join(
    '\n',
  )
}

function buildMetaCsv(products: Product[], options: FeedBuildOptions): string {
  const headers = [
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'brand',
  ]
  const rows = products.map((product) => [
    product.id,
    displayTitle(product, options.titleSuffix),
    description(product),
    availability(product) === 'in stock' ? 'in stock' : 'out of stock',
    'new',
    formatMoney(product, options.currency),
    productLink(product, options.storefrontUrl),
    primaryImage(product),
    options.shopName,
  ])
  return csvRows(headers, rows)
}

function buildAmazonCsv(products: Product[], options: FeedBuildOptions): string {
  const headers = [
    'sku',
    'product-id',
    'product-id-type',
    'item-name',
    'item-description',
    'standard-price',
    'currency',
    'quantity',
    'main-image-url',
    'product-site-launch-date',
    'item-type',
    'brand',
  ]
  const rows = products.map((product) => {
    const money = moneyAmount(product, options.currency)
    return [
      sku(product),
      product.id,
      'ASIN',
      displayTitle(product, options.titleSuffix),
      description(product),
      money ? (money.amount / 100).toFixed(2) : '',
      money?.currency ?? options.currency ?? '',
      String(Math.max(0, product.inventoryQuantity)),
      primaryImage(product),
      '',
      'consumer-electronics',
      options.shopName,
    ]
  })
  return csvRows(headers, rows)
}

function buildEbayCsv(products: Product[], options: FeedBuildOptions): string {
  const headers = [
    'Action',
    'CustomLabel',
    'Title',
    'Description',
    'Format',
    'Duration',
    'StartPrice',
    'Quantity',
    'PicURL',
    'Location',
    'Category',
    'ConditionID',
  ]
  const rows = products.map((product) => {
    const money = moneyAmount(product, options.currency)
    return [
      'Add',
      sku(product),
      displayTitle(product, options.titleSuffix).slice(0, 80),
      description(product),
      'FixedPrice',
      'GTC',
      money ? (money.amount / 100).toFixed(2) : '',
      String(Math.max(1, product.inventoryQuantity)),
      primaryImage(product),
      '',
      '',
      '1000',
    ]
  })
  return csvRows(headers, rows)
}

function buildMarktplaatsCsv(products: Product[], options: FeedBuildOptions): string {
  const headers = [
    'title',
    'description',
    'price',
    'currency',
    'image_url',
    'url',
    'sku',
    'stock',
    'seller',
  ]
  const rows = products.map((product) => {
    const money = moneyAmount(product, options.currency)
    return [
      displayTitle(product, options.titleSuffix),
      description(product),
      money ? (money.amount / 100).toFixed(2) : '',
      money?.currency ?? options.currency ?? 'EUR',
      primaryImage(product),
      productLink(product, options.storefrontUrl),
      sku(product),
      String(Math.max(0, product.inventoryQuantity)),
      options.shopName,
    ]
  })
  return csvRows(headers, rows)
}
