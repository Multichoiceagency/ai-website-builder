import { createSection } from '@platform/blocks'
import {
  STORE_BUILDER_THEME_SEEDS,
  storeBuildPlanSchema,
  themeSchema,
  type CreateProductInput,
  type Section,
  type StoreBuildInput,
  type StoreBuildPlan,
  type StoreBuildProductPlan,
  type StoreBuildResult,
  type Theme,
} from '@platform/schemas'
import { commerceProvider, type CommerceContext } from '../../adapters/commerce/index.js'
import { withTenant } from '../../db/client.js'
import { findPageByPath, insertPage, publishPage, updatePage } from '../../db/repositories/pages.js'
import { findSiteById, updateSite } from '../../db/repositories/sites.js'
import { generateGeminiContent, resolveGeminiModel } from './providers/gemini-client.js'
import { getPrompt } from './prompt-registry.js'

/**
 * Single ecommerce store-builder agent.
 *
 * One merchant prompt → theme + collections + variants + shipping + discount +
 * shop pages. Capability map mirrors Medusa / Shopify / Payload ecommerce
 * (catalog, collections, shipping, carts/checkout exist via CommerceProvider;
 * this agent seeds the merchant-ready starting state).
 */

function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'item'
  )
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount / 100)
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`
  }
}

function defaultPlan(input: StoreBuildInput): StoreBuildPlan {
  const dutch = input.locale.toLowerCase().startsWith('nl')
  const prompt = input.prompt.trim()
  const shopName =
    prompt.match(/(?:called|named|voor|voor\s+)"([^"]+)"/i)?.[1] ??
    prompt.match(/(?:shop|store|winkel|merk)\s+([A-Z][\w &'-]{1,40})/)?.[1]?.trim() ??
    (dutch ? 'Nieuwe winkel' : 'New shop')

  const base = Math.max(1_499, Math.round(2_900 + (prompt.length % 17) * 100))
  const collections = [
    {
      title: dutch ? 'Bestsellers' : 'Bestsellers',
      handle: 'bestsellers',
      description: dutch ? 'Meest gekozen producten.' : 'Customer favourites.',
    },
    {
      title: dutch ? 'Nieuw' : 'New arrivals',
      handle: 'new-arrivals',
      description: dutch ? 'Net binnen.' : 'Just landed.',
    },
    {
      title: dutch ? 'Essentials' : 'Essentials',
      handle: 'essentials',
      description: dutch ? 'Dagelijkse basis.' : 'Everyday basics.',
    },
  ]

  const products: StoreBuildProductPlan[] = []
  const count = input.productCount
  for (let i = 0; i < count; i += 1) {
    const collection = collections[i % collections.length]!
    const price = { amount: base + i * 400, currency: input.currency }
    products.push({
      title: dutch ? `Product ${i + 1}` : `Product ${i + 1}`,
      description: prompt.slice(0, 280),
      collectionHandle: collection.handle,
      options: [{ name: dutch ? 'Maat' : 'Size', values: ['S', 'M', 'L'] }],
      variants: [
        {
          title: 'M',
          price,
          optionValues: { [dutch ? 'Maat' : 'Size']: 'M' },
          sku: `SKU-${i + 1}-M`,
          inventory: 40,
        },
        {
          title: 'L',
          price: { amount: price.amount + 200, currency: input.currency },
          optionValues: { [dutch ? 'Maat' : 'Size']: 'L' },
          sku: `SKU-${i + 1}-L`,
          inventory: 30,
        },
      ],
    })
  }

  // Prefer readable titles from prompt nouns when present.
  const noun = prompt
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, count)
  for (let i = 0; i < products.length; i += 1) {
    const word = noun[i]
    if (word) {
      products[i]!.title = `${word[0]!.toUpperCase()}${word.slice(1)}`
    }
  }

  return storeBuildPlanSchema.parse({
    shopName,
    tagline: dutch
      ? 'Kwaliteit, eerlijk geprijsd, snel geleverd.'
      : 'Quality goods, fair prices, fast delivery.',
    industryHint: 'ecommerce',
    announcement: dutch
      ? 'GRATIS VERZENDING VANAF €75 · WELCOME10 VOOR 10% KORTING'
      : 'FREE SHIPPING OVER €75 · USE WELCOME10 FOR 10% OFF',
    collections,
    products,
    shipping: {
      name: dutch ? 'Standaard verzending' : 'Standard shipping',
      price: { amount: 495, currency: input.currency },
      freeAboveSubtotal: { amount: 7_500, currency: input.currency },
    },
    welcomeDiscountCode: 'WELCOME10',
    welcomeDiscountBps: 1_000,
  })
}

async function planWithModel(input: StoreBuildInput): Promise<StoreBuildPlan | null> {
  const system =
    getPrompt('store-builder.system')?.text ??
    `You are the ecommerce store-builder agent for a multi-tenant website builder.
Return ONLY JSON matching this shape:
{
  "shopName": string,
  "tagline": string,
  "industryHint": string,
  "announcement": string,
  "collections": [{"title":string,"handle":string,"description":string}],
  "products": [{
    "title": string,
    "description": string,
    "collectionHandle": string,
    "options": [{"name":string,"values":string[]}],
    "variants": [{
      "title": string,
      "price": {"amount": number, "currency": string},
      "compareAtPrice": {"amount": number, "currency": string} | null,
      "optionValues": Record<string,string>,
      "sku": string,
      "inventory": number
    }]
  }],
  "shipping": {
    "name": string,
    "price": {"amount": number, "currency": string},
    "freeAboveSubtotal": {"amount": number, "currency": string} | null
  },
  "welcomeDiscountCode": string,
  "welcomeDiscountBps": number
}
Rules:
- Money amounts are integer minor units (cents). Currency = ${input.currency}.
- ${input.productCount} products, 2–3 collections, variants with options (Medusa/Shopify/Payload style).
- No HTML/React. No invented payment provider IDs.
- Match the merchant brief language.`

  try {
    const result = await generateGeminiContent({
      model: resolveGeminiModel(),
      systemInstruction: system,
      userText: input.prompt,
      responseMimeType: 'application/json',
      maxOutputTokens: 4_096,
    })
    if (!result?.text) return null
    const parsed = JSON.parse(result.text) as unknown
    return storeBuildPlanSchema.parse(parsed)
  } catch {
    return null
  }
}

export async function planStoreBuild(input: StoreBuildInput): Promise<StoreBuildPlan> {
  const fromModel = await planWithModel(input)
  if (fromModel) return fromModel
  return defaultPlan(input)
}

function buildShopHomeSections(plan: StoreBuildPlan, currency: string): Section[] {
  const featured = plan.products[0]
  const price = featured?.variants[0]?.price
  const priceLine = price ? formatMoney(price.amount, currency) : ''

  return [
    createSection('header-shop-announce-01', {
      messages: plan.announcement,
      sticky: false,
    }),
    createSection('header-simple-01', {
      brand: plan.shopName,
      links: [
        { label: 'Shop', href: '/shop' },
        { label: 'Bestsellers', href: '/shop' },
        { label: 'Cart', href: '/checkout' },
      ],
      ctaLabel: 'Shop now',
      ctaHref: '/shop',
    }),
    createSection('hero-centered-01', {
      eyebrow: plan.shopName,
      headline: plan.tagline || plan.shopName,
      subheadline: plan.collections.map((entry) => entry.title).join(' · '),
      ctaLabel: 'Browse collection',
      ctaHref: '/shop',
      align: 'center',
    }),
    createSection('features-grid-01', {
      heading: 'Shop by collection',
      intro: 'Curated catalogue — collections, variants, and checkout ready.',
      items: plan.collections.slice(0, 3).map((collection) => ({
        title: collection.title,
        description: collection.description || collection.title,
        icon: 'package',
      })),
    }),
    ...(featured
      ? [
          createSection('product-detail-01', {
            eyebrow: 'Featured',
            title: featured.title,
            subtitle: featured.description.slice(0, 160),
            rating: '4.9',
            ratingCount: 'New shop',
            priceLine,
            ctaLabel: 'Add to cart',
            ctaHref: '/checkout',
            thickBorders: false,
          }),
        ]
      : []),
    createSection('cta-banner-01', {
      heading: plan.tagline || 'Ready when you are',
      body: `Use ${plan.welcomeDiscountCode} at checkout.`,
      ctaLabel: 'Go to checkout',
      ctaHref: '/checkout',
    }),
    createSection('footer-simple-01'),
  ]
}

function toCreateProduct(
  product: StoreBuildProductPlan,
  collectionIdByHandle: Map<string, string>,
): CreateProductInput {
  const collectionIds =
    product.collectionHandle && collectionIdByHandle.has(product.collectionHandle)
      ? [collectionIdByHandle.get(product.collectionHandle)!]
      : []

  return {
    title: product.title,
    handle: slugify(product.title),
    description: product.description,
    status: 'active',
    options: product.options,
    images: [],
    variants: product.variants.map((variant) => ({
      title: variant.title,
      sku: variant.sku,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      optionValues: variant.optionValues ?? {},
    })),
    collectionIds,
  }
}

export async function executeStoreBuild(
  ctx: CommerceContext,
  input: StoreBuildInput,
  plan: StoreBuildPlan,
): Promise<StoreBuildResult> {
  const steps: StoreBuildResult['steps'] = []
  const collectionIds: string[] = []
  const productIds: string[] = []
  const pageIds: string[] = []
  let shippingRateId: string | null = null
  let discountId: string | null = null

  const seed = STORE_BUILDER_THEME_SEEDS[input.themePreset]
  const themePatch = themeSchema.parse({
    ...seed,
    maxPerformanceClass: 'B',
    contentWidth: '1440',
    contentWidthPx: null,
  }) satisfies Theme

  try {
    await withTenant(ctx.tenantId, async (tx) => {
      const site = await findSiteById(tx, ctx.tenantId, input.siteId)
      if (!site) throw new Error('Site not found')
      await updateSite(tx, ctx.tenantId, input.siteId, {
        theme: { ...site.theme, ...themePatch },
        name: site.name.trim() ? site.name : plan.shopName,
      })
    })
    steps.push({ id: 'theme', label: 'Apply store theme', status: 'done', detail: input.themePreset })
  } catch (error) {
    steps.push({
      id: 'theme',
      label: 'Apply store theme',
      status: 'failed',
      detail: error instanceof Error ? error.message : 'theme failed',
    })
  }

  const collectionIdByHandle = new Map<string, string>()
  try {
    for (const collection of plan.collections) {
      const created = await commerceProvider.createCollection(ctx, {
        title: collection.title,
        handle: collection.handle ?? slugify(collection.title),
        description: collection.description,
      })
      collectionIds.push(created.id)
      collectionIdByHandle.set(created.handle, created.id)
      if (collection.handle) collectionIdByHandle.set(collection.handle, created.id)
    }
    steps.push({
      id: 'collections',
      label: 'Create collections',
      status: 'done',
      detail: `${collectionIds.length} collections`,
    })
  } catch (error) {
    steps.push({
      id: 'collections',
      label: 'Create collections',
      status: 'failed',
      detail: error instanceof Error ? error.message : 'collections failed',
    })
  }

  let locationId: string | null = null
  try {
    const locations = await commerceProvider.listLocations(ctx)
    locationId = locations.find((entry) => entry.isDefault)?.id ?? locations[0]?.id ?? null
    if (!locationId) {
      const created = await commerceProvider.createLocation(ctx, {
        name: 'Main warehouse',
        code: 'main',
        isDefault: true,
      })
      locationId = created.id
    }
    steps.push({ id: 'inventory', label: 'Inventory location', status: 'done' })
  } catch (error) {
    steps.push({
      id: 'inventory',
      label: 'Inventory location',
      status: 'failed',
      detail: error instanceof Error ? error.message : 'location failed',
    })
  }

  try {
    for (const product of plan.products) {
      const created = await commerceProvider.createProduct(ctx, toCreateProduct(product, collectionIdByHandle))
      productIds.push(created.id)
      if (locationId) {
        for (let index = 0; index < created.variants.length; index += 1) {
          const variant = created.variants[index]!
          const planned = product.variants[index]
          await commerceProvider.setInventory(ctx, variant.id, {
            locationId,
            available: planned?.inventory ?? 25,
          })
        }
      }
    }
    steps.push({
      id: 'products',
      label: 'Create products + variants',
      status: 'done',
      detail: `${productIds.length} products`,
    })
  } catch (error) {
    steps.push({
      id: 'products',
      label: 'Create products + variants',
      status: 'failed',
      detail: error instanceof Error ? error.message : 'products failed',
    })
  }

  try {
    const rate = await commerceProvider.createShippingRate(ctx, {
      name: plan.shipping.name,
      price: plan.shipping.price,
      freeAboveSubtotal: plan.shipping.freeAboveSubtotal ?? null,
      active: true,
    })
    shippingRateId = rate.id
    steps.push({ id: 'shipping', label: 'Shipping rate', status: 'done', detail: rate.name })
  } catch (error) {
    steps.push({
      id: 'shipping',
      label: 'Shipping rate',
      status: 'failed',
      detail: error instanceof Error ? error.message : 'shipping failed',
    })
  }

  try {
    const discount = await commerceProvider.createDiscount(ctx, {
      code: plan.welcomeDiscountCode,
      type: 'percentage',
      percentageBps: plan.welcomeDiscountBps,
      stackable: false,
      priority: 100,
      active: true,
    })
    discountId = discount.id
    steps.push({ id: 'discount', label: 'Welcome discount', status: 'done', detail: plan.welcomeDiscountCode })
  } catch (error) {
    steps.push({
      id: 'discount',
      label: 'Welcome discount',
      status: 'skipped',
      detail: error instanceof Error ? error.message : 'discount skipped',
    })
  }

  try {
    const sections = buildShopHomeSections(plan, input.currency)
    await withTenant(ctx.tenantId, async (tx) => {
      const existing = await findPageByPath(tx, ctx.tenantId, input.siteId, '/shop')
      let shopPageId: string | null = null
      if (existing) {
        const updated = await updatePage(tx, ctx.tenantId, existing.id, {
          title: plan.shopName,
          sections,
          seo: {
            title: `${plan.shopName} · Shop`,
            description: plan.tagline,
            noIndex: false,
          },
        })
        shopPageId = updated?.id ?? existing.id
      } else {
        const created = await insertPage(tx, {
          tenantId: ctx.tenantId,
          siteId: input.siteId,
          path: '/shop',
          title: plan.shopName,
          seo: {
            title: `${plan.shopName} · Shop`,
            description: plan.tagline,
            noIndex: false,
          },
          sections,
        })
        shopPageId = created.id
      }
      if (shopPageId) {
        await publishPage(tx, ctx.tenantId, shopPageId)
        pageIds.push(shopPageId)
      }

      if (input.updateHome) {
        const home = await findPageByPath(tx, ctx.tenantId, input.siteId, '/')
        if (home) {
          const merged = [
            createSection('header-shop-announce-01', { messages: plan.announcement }),
            ...home.sections.filter((section) => section.block !== 'header-shop-announce-01'),
          ]
          const updated = await updatePage(tx, ctx.tenantId, home.id, { sections: merged })
          const homeId = updated?.id ?? home.id
          await publishPage(tx, ctx.tenantId, homeId)
          pageIds.push(homeId)
        }
      }
    })
    steps.push({
      id: 'pages',
      label: 'Shop pages (published)',
      status: 'done',
      detail: `${pageIds.length} page(s)`,
    })
  } catch (error) {
    steps.push({
      id: 'pages',
      label: 'Shop pages',
      status: 'failed',
      detail: error instanceof Error ? error.message : 'pages failed',
    })
  }

  return {
    shopName: plan.shopName,
    themePreset: input.themePreset,
    collectionIds,
    productIds,
    shippingRateId,
    discountId,
    pageIds,
    steps,
    references: {
      medusa: 'Products + variants + collections + shipping rates (Medusa commerce modules)',
      shopify: 'Online Store collections + Frontpage-style /shop + theme tokens',
      payload: 'Products / variants / carts / orders plugin model via CommerceProvider',
    },
  }
}

export async function buildStoreFromPrompt(
  ctx: CommerceContext,
  input: StoreBuildInput,
): Promise<{ plan: StoreBuildPlan; result: StoreBuildResult }> {
  const plan = await planStoreBuild(input)
  const result = await executeStoreBuild(ctx, input, plan)
  return { plan, result }
}
