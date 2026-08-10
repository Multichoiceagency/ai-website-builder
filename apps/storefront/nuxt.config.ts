/**
 * The public renderer.
 *
 * It holds no content of its own: it resolves a hostname to a site, fetches
 * the published document, and renders block ids through the registry.
 */
import { platformPwaConfig } from '../../packages/ui/utils/pwa'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  extends: ['../../packages/ui', '../../packages/motion', '../../packages/blocks-nuxt'],

  modules: ['@vite-pwa/nuxt'],

  runtimeConfig: {
    public: {
      surface: 'storefront',
      coreApiUrl: process.env.CORE_API_URL ?? 'http://localhost:4000',
      /** Optional: required together with tenantId for the tracking plugin. */
      siteId: process.env.STOREFRONT_SITE_ID ?? '',
      tenantId: process.env.STOREFRONT_TENANT_ID ?? '',
      motion: {
        enableLenis: true,
      },
    },
  },

  // Business sites must render on the server: SEO, Core Web Vitals and social
  // previews all depend on it.
  ssr: true,

  app: {
    head: {
      htmlAttrs: { 'data-theme': 'light' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#111827' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/pwa/favicon-32x32.png', sizes: '32x32' },
        { rel: 'apple-touch-icon', href: '/pwa/apple-touch-icon.png', sizes: '180x180' },
      ],
    },
  },

  pwa: platformPwaConfig({
    name: 'Store',
    shortName: 'Store',
    description: 'Installable storefront — browse cached pages when you’re offline.',
    themeColor: '#111827',
    backgroundColor: '#ffffff',
    // SSR pages are cached via NetworkFirst — no static navigateFallback HTML.
    navigateFallback: false,
  }),

  typescript: { strict: true },
})
