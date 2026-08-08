import { createTracker } from '@platform/tracking'

/**
 * First-party analytics (§23). Starts only when both site and tenant ids are
 * known — typically injected via runtimeConfig for a dedicated storefront
 * deploy. Without them the plugin is a no-op rather than guessing.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const siteId = String(config.public.siteId ?? '').trim()
  const tenantId = String(config.public.tenantId ?? '').trim()
  const coreApiUrl = String(config.public.coreApiUrl ?? '').replace(/\/+$/, '')

  if (!siteId || !tenantId || !coreApiUrl) return

  createTracker({
    siteId,
    tenantId,
    endpoint: `${coreApiUrl}/api/v1/tracking/collect`,
  })
})
