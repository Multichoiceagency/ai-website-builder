/**
 * Same-origin proxy for storefront contact forms → CRM leads.
 * Tenant is resolved from `host` on the core-api, never from the body.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const config = useRuntimeConfig()
  const api = String(config.public.coreApiUrl ?? 'http://localhost:4000').replace(/\/+$/, '')
  const host = String(
    (body as { host?: string }).host || getRequestHost(event) || '',
  )

  return await $fetch(`${api}/api/v1/crm/leads/from-form`, {
    method: 'POST',
    body: { ...(typeof body === 'object' && body ? body : {}), host },
  })
})
