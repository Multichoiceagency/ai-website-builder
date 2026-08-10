/**
 * The admin dashboard.
 *
 * Rendered as an SPA: every page is behind authentication, so there is nothing
 * to index and no first-paint SEO cost to pay.
 *
 * Browser calls hit same-origin `/api/v1/*`, which Nitro proxies to core-api.
 * That keeps the session cookie first-party (required when the API host is a
 * different site, e.g. separate sslip.io / custom domains).
 */
import { platformPwaConfig } from '../../packages/ui/utils/pwa'

const coreApiOrigin = (process.env.CORE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  extends: ['../../packages/ui', '../../packages/motion', '../../packages/blocks-nuxt'],

  ssr: false,

  modules: ['@vite-pwa/nuxt'],

  runtimeConfig: {
    public: {
      /** Distinguishes admin chrome from the public renderer for block behaviour. */
      surface: 'dashboard',
      /** Empty = same origin; see `routeRules` proxy below. */
      coreApiUrl: '',
      storefrontUrl: process.env.STOREFRONT_URL ?? 'http://localhost:3001',
    },
  },

  routeRules: {
    '/api/v1/**': { proxy: `${coreApiOrigin}/api/v1/**` },
  },

  app: {
    head: {
      title: 'Platform',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#111827' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/pwa/favicon-32x32.png', sizes: '32x32' },
        { rel: 'apple-touch-icon', href: '/pwa/apple-touch-icon.png', sizes: '180x180' },
      ],
    },
  },

  pwa: platformPwaConfig({
    name: 'Platform',
    shortName: 'Platform',
    description: 'Build and manage websites, shops, and growth — installable and offline-ready.',
    themeColor: '#111827',
    backgroundColor: '#f3f1ec',
    useCredentials: true,
    navigateFallback: '/',
  }),

  typescript: { strict: true },
})
