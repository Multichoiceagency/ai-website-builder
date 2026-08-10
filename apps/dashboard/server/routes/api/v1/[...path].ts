/**
 * Same-origin reverse proxy to core-api.
 *
 * Nuxt `routeRules.proxy` follows upstream 302s, so Google OAuth callbacks
 * never reach the browser with `Location` + `Set-Cookie`. This handler uses
 * `redirect: 'manual'` and forwards those headers as-is.
 */
import {
  appendResponseHeader,
  createError,
  getRequestHeaders,
  getRequestURL,
  getResponseHeader,
  readRawBody,
  setResponseHeader,
  setResponseStatus,
} from 'h3'

const HOP_BY_HOP = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

function coreApiOrigin(): string {
  const runtime = useRuntimeConfig()
  const fromConfig = typeof runtime.coreApiOrigin === 'string' ? runtime.coreApiOrigin : ''
  const raw = (fromConfig || process.env.CORE_API_URL || 'http://localhost:4000').replace(/\/$/, '')
  return raw
}

export default defineEventHandler(async (event) => {
  const origin = coreApiOrigin()
  const params = event.context.params as { path?: string } | undefined
  const suffix = (params?.path ?? '').replace(/^\/+/, '')
  const incoming = getRequestURL(event)
  const target = new URL(`${origin}/api/v1/${suffix}`)
  target.search = incoming.search

  const headers = new Headers()
  const incomingHeaders = getRequestHeaders(event)
  for (const [key, value] of Object.entries(incomingHeaders)) {
    if (!value) continue
    if (HOP_BY_HOP.has(key.toLowerCase())) continue
    headers.set(key, Array.isArray(value) ? value.join(',') : value)
  }

  const method = event.method.toUpperCase()
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : await readRawBody(event, false)

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: 'manual',
    })
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Upstream API unreachable',
      data: { cause: error instanceof Error ? error.message : String(error) },
    })
  }

  setResponseStatus(event, upstream.status)

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) return
    if (lower === 'set-cookie') return
    setResponseHeader(event, key, value)
  })

  const getSetCookie = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie
  const cookies = typeof getSetCookie === 'function' ? getSetCookie.call(upstream.headers) : []
  if (cookies.length > 0) {
    for (const cookie of cookies) appendResponseHeader(event, 'set-cookie', cookie)
  } else {
    const single = upstream.headers.get('set-cookie')
    if (single) appendResponseHeader(event, 'set-cookie', single)
  }

  // Ensure Location survives for OAuth redirects.
  const location = upstream.headers.get('location')
  if (location && !getResponseHeader(event, 'location')) {
    setResponseHeader(event, 'location', location)
  }

  if (method === 'HEAD' || upstream.status === 204 || upstream.status === 304) {
    return null
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    return null
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  return buffer.length ? buffer : null
})
