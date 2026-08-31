/**
 * The internal staff console.
 *
 * A separate application from the customer dashboard on purpose: a different
 * audience, a different privilege boundary, and a deployment that can be kept
 * off the public internet entirely. Sharing a codebase with the dashboard would
 * make "did this route check platform-admin?" a question you have to ask on
 * every page.
 */
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  extends: ['../../packages/ui'],
  ssr: false,
  runtimeConfig: {
    public: {
      coreApiUrl: process.env.CORE_API_URL ?? 'http://localhost:4000',
      dashboardUrl: process.env.DASHBOARD_URL ?? 'http://localhost:3000',
    },
  },
  app: { head: { title: 'MultichoiceCMS Admin', meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }] } },
  typescript: { strict: true },
})
