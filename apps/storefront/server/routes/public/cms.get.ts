/**
 * Same-origin proxy for published CMS entries (platform / Frappe / WordPress).
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig()
  const api = String(config.public.coreApiUrl ?? 'http://localhost:4000').replace(/\/+$/, '')

  return await $fetch(`${api}/public/v1/cms`, {
    query: {
      host: query.host,
      provider: query.provider ?? 'platform',
      collection: query.collection,
      slug: query.slug,
    },
  })
})
