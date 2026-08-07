/**
 * The public renderer.
 *
 * It holds no content of its own: it resolves a hostname to a site, fetches
 * the published document, and renders block ids through the registry.
 */
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  extends: ['../../packages/ui', '../../packages/motion', '../../packages/blocks-nuxt'],

  runtimeConfig: {
    public: {
      coreApiUrl: process.env.CORE_API_URL ?? 'http://localhost:4000',
    },
  },

  // Business sites must render on the server: SEO, Core Web Vitals and social
  // previews all depend on it.
  ssr: true,

  app: {
    head: {
      htmlAttrs: { 'data-theme': 'light' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },

  typescript: { strict: true },
})
