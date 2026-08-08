/**
 * Same-origin proxy for published pages.
 *
 * The browser talks to the storefront host (`{slug}.localhost:3001`), not to
 * core-api directly — that avoids CORS breakage on tenant subdomains and keeps
 * the public API URL off the client.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig()
  const api = String(config.public.coreApiUrl ?? 'http://localhost:4000').replace(/\/+$/, '')

  return await $fetch(`${api}/public/v1/pages`, {
    query: {
      host: query.host,
      path: query.path ?? '/',
    },
  })
})
