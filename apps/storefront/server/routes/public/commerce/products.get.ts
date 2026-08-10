/**
 * Same-origin proxy for public commerce catalogue.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig()
  const api = String(config.public.coreApiUrl ?? 'http://localhost:4000').replace(/\/+$/, '')
  const host = String(query.host || getRequestHost(event) || '')

  return await $fetch(`${api}/public/v1/commerce/products`, {
    query: {
      host,
      search: query.search,
      collectionId: query.collectionId,
      page: query.page,
      limit: query.limit,
    },
  })
})
