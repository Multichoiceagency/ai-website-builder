/**
 * Same-origin proxy for a public product by handle.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const handle = getRouterParam(event, 'handle')
  const config = useRuntimeConfig()
  const api = String(config.public.coreApiUrl ?? 'http://localhost:4000').replace(/\/+$/, '')
  const host = String(query.host || getRequestHost(event) || '')

  return await $fetch(`${api}/public/v1/commerce/products/${encodeURIComponent(handle || '')}`, {
    query: { host },
  })
})
