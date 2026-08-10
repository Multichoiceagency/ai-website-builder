import { z } from 'zod'
import { currencyCodeSchema, moneySchema } from './commerce.js'
import { uuidSchema } from './common.js'

/**
 * One-prompt ecommerce store builder.
 *
 * Modelled after the merchant surfaces shared by Medusa (products / variants /
 * collections / shipping / payment regions), Shopify (Online Store collections
 * + Frontpage + theme tokens), and Payload ecommerce (products, variants,
 * carts, orders). Our platform shapes stay vendor-neutral (ADR-0006); this
 * agent only *writes* through CommerceProvider + CMS pages.
 */

export const STORE_BUILDER_THEME_PRESETS = [
  'editorial-ink',
  'fresh-teal',
  'charcoal-orange',
  'clean-sky',
] as const
export type StoreBuilderThemePreset = (typeof STORE_BUILDER_THEME_PRESETS)[number]

/**
 * Development chrome for Commerce → Store builder (dashboard), from
 * ui-ux-pro-max “OpenWA Store Builder” — light, trust teal + ink, not purple.
 */
export const STORE_BUILDER_DEV_THEME = {
  primary: '#0F766E',
  secondary: '#14B8A6',
  cta: '#0369A1',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#475569',
  line: '#E2E8F0',
  fontHeading: 'Rubik',
  fontBody: 'Nunito Sans',
  contentMax: '1120px',
  radius: '12px',
} as const

/** Published storefront theme seeds (ui-ux-pro-max ecommerce editorial). */
export const STORE_BUILDER_THEME_SEEDS: Record<
  StoreBuilderThemePreset,
  {
    colorPrimary: string
    colorAccent: string
    colorSurface: string
    colorSurfaceAlt: string
    colorText: string
    colorTextMuted: string
    fontHeading: string
    fontBody: string
    radius: 'none' | 'sm' | 'md' | 'lg' | 'full'
  }
> = {
  'editorial-ink': {
    colorPrimary: '#111827',
    colorAccent: '#0D9488',
    colorSurface: '#FFFFFF',
    colorSurfaceAlt: '#F8FAFC',
    colorText: '#0F172A',
    colorTextMuted: '#64748B',
    fontHeading: 'Rubik',
    fontBody: 'Nunito Sans',
    radius: 'sm',
  },
  'fresh-teal': {
    colorPrimary: '#0F766E',
    colorAccent: '#0369A1',
    colorSurface: '#FFFFFF',
    colorSurfaceAlt: '#F0FDFA',
    colorText: '#134E4A',
    colorTextMuted: '#5B7C78',
    fontHeading: 'Poppins',
    fontBody: 'Open Sans',
    radius: 'md',
  },
  'charcoal-orange': {
    colorPrimary: '#1A1A1A',
    colorAccent: '#EA580C',
    colorSurface: '#FFFFFF',
    colorSurfaceAlt: '#F4F4F5',
    colorText: '#18181B',
    colorTextMuted: '#71717A',
    fontHeading: 'Rubik',
    fontBody: 'Nunito Sans',
    radius: 'none',
  },
  'clean-sky': {
    colorPrimary: '#0E7490',
    colorAccent: '#16A34A',
    colorSurface: '#FFFFFF',
    colorSurfaceAlt: '#ECFEFF',
    colorText: '#164E63',
    colorTextMuted: '#57808F',
    fontHeading: 'Rubik',
    fontBody: 'Nunito Sans',
    radius: 'md',
  },
}

export const storeBuildInputSchema = z
  .object({
    /** Natural-language shop brief — optional when `sourceUrl` is set. */
    prompt: z.string().trim().max(4_000).default(''),
    /**
     * Amazon / AliExpress / any product URL. We extract title, images, price when
     * the page allows, then seed a full shop around that product.
     */
    sourceUrl: z.string().trim().url().max(2_048).optional(),
    siteId: uuidSchema,
    currency: currencyCodeSchema.default('EUR'),
    locale: z.string().min(2).max(12).default('en'),
    /** How many starter products to seed (Shopify/Medusa-style catalog bootstrap). */
    productCount: z.number().int().min(2).max(24).default(6),
    themePreset: z.enum(STORE_BUILDER_THEME_PRESETS).default('editorial-ink'),
    /** When true, rewrite home into a full ecommerce landing (not just an announcement bar). */
    updateHome: z.boolean().default(true),
    /** Publish shop + home pages after seed (still opt-in per ADR-0007 spirit for custom sites). */
    publish: z.boolean().default(true),
  })
  .refine((value) => Boolean(value.sourceUrl) || value.prompt.trim().length >= 12, {
    message: 'Provide a shop prompt (12+ characters) or a product URL (Amazon / AliExpress).',
  })
export type StoreBuildInput = z.infer<typeof storeBuildInputSchema>

export const storeBuildProductPlanSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5_000).default(''),
  collectionHandle: z.string().min(1).max(80).optional(),
  images: z
    .array(z.object({ url: z.string().max(2048), alt: z.string().max(200).default('') }))
    .max(8)
    .default([]),
  options: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        values: z.array(z.string().min(1).max(80)).min(1).max(12),
      }),
    )
    .max(3)
    .default([]),
  variants: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        price: moneySchema,
        compareAtPrice: moneySchema.nullable().optional(),
        optionValues: z.record(z.string().max(60), z.string().max(80)).optional(),
        sku: z.string().max(80).optional(),
        inventory: z.number().int().min(0).max(100_000).default(25),
      }),
    )
    .min(1)
    .max(40),
})
export type StoreBuildProductPlan = z.infer<typeof storeBuildProductPlanSchema>

export const storeBuildPlanSchema = z.object({
  shopName: z.string().min(1).max(120),
  tagline: z.string().max(240).default(''),
  industryHint: z.string().max(80).default('ecommerce'),
  announcement: z.string().max(400).default(''),
  collections: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        handle: z.string().min(1).max(80).optional(),
        description: z.string().max(2_000).default(''),
      }),
    )
    .min(1)
    .max(12),
  products: z.array(storeBuildProductPlanSchema).min(1).max(24),
  shipping: z.object({
    name: z.string().min(1).max(120),
    price: moneySchema,
    freeAboveSubtotal: moneySchema.nullable().optional(),
  }),
  welcomeDiscountCode: z.string().min(2).max(40).default('WELCOME10'),
  welcomeDiscountBps: z.number().int().min(100).max(50_000).default(1_000),
})
export type StoreBuildPlan = z.infer<typeof storeBuildPlanSchema>

export const storeBuildResultSchema = z.object({
  shopName: z.string(),
  themePreset: z.enum(STORE_BUILDER_THEME_PRESETS),
  collectionIds: z.array(uuidSchema),
  productIds: z.array(uuidSchema),
  shippingRateId: uuidSchema.nullable(),
  discountId: uuidSchema.nullable(),
  pageIds: z.array(uuidSchema),
  steps: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      status: z.enum(['done', 'skipped', 'failed']),
      detail: z.string().optional(),
    }),
  ),
  references: z.object({
    medusa: z.string(),
    shopify: z.string(),
    payload: z.string(),
  }),
})
export type StoreBuildResult = z.infer<typeof storeBuildResultSchema>
