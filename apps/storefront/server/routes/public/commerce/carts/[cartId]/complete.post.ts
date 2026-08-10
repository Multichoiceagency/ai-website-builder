export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const cartId = getRouterParam(event, 'cartId')
  const body = await readBody(event).catch(() => ({}))
  const config = useRuntimeConfig()
  const api = String(config.public.coreApiUrl ?? 'http://localhost:4000').replace(/\/+$/, '')
  const host = String(query.host || getRequestHost(event) || '')

  return await $fetch(
    `${api}/public/v1/commerce/carts/${encodeURIComponent(cartId || '')}/complete`,
    { method: 'POST', query: { host }, body },
  )
})
