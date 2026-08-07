/**
 * The admin dashboard.
 *
 * Rendered as an SPA: every page is behind authentication, so there is nothing
 * to index and no first-paint SEO cost to pay. It also keeps the session
 * cookie a pure browser concern instead of something the Nuxt server has to
 * forward on every request.
 */
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  extends: ['../../packages/ui', '../../packages/motion', '../../packages/blocks-nuxt'],

  ssr: false,

  runtimeConfig: {
    public: {
      coreApiUrl: process.env.CORE_API_URL ?? 'http://localhost:4000',
      storefrontUrl: process.env.STOREFRONT_URL ?? 'http://localhost:3001',
    },
  },

  app: {
    head: {
      title: 'Platform',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },

  typescript: { strict: true },
})
