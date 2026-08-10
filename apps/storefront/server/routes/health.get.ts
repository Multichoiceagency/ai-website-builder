/**
 * Liveness for orchestrators (Coolify / Docker). Must not call core-api —
 * probing `/` SSR-fetches pages and fails health when the DB has no site yet.
 */
export default defineEventHandler(() => ({
  ok: true,
  service: 'storefront',
}))
