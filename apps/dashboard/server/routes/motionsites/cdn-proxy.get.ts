import { createError, getQuery, sendStream, setHeader } from 'h3'
import { Readable } from 'node:stream'

/**
 * Same-origin proxy for allowlisted Motionsites CDN hosts (CloudFront / Higgs).
 *
 * Islands must not hotlink gated CDNs from the browser (CORS / 403 / missing
 * Referer). The editor iframe is same-origin, so `/motionsites/cdn-proxy?url=`
 * streams the bytes with Range support while keeping ADR-0003 page JSON free
 * of remote URLs when possible (prefer local `/motionsites/sections/...`).
 */

const ALLOWED_HOST_SUFFIXES = ['.cloudfront.net', 'images.higgs.ai', 'higgs.ai'] as const

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'images.higgs.ai' || host === 'higgs.ai') return true
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const raw = typeof query.url === 'string' ? query.url.trim() : ''
  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url' })
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid url' })
  }

  if (parsed.protocol !== 'https:') {
    throw createError({ statusCode: 400, statusMessage: 'HTTPS only' })
  }
  if (!hostAllowed(parsed.hostname)) {
    throw createError({ statusCode: 403, statusMessage: 'Host not allowlisted' })
  }

  const range = event.node.req.headers.range
  const upstream = await fetch(parsed.toString(), {
    redirect: 'follow',
    headers: {
      accept: '*/*',
      ...(range ? { range: String(range) } : {}),
      'user-agent': 'Mozilla/5.0 (compatible; MotionsitesMediaProxy/1.0)',
      referer: 'https://www.motionsites.com/',
    },
  })

  if (!upstream.ok && upstream.status !== 206) {
    throw createError({
      statusCode: upstream.status === 404 ? 404 : 502,
      statusMessage: `Upstream ${upstream.status}`,
    })
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
  setHeader(event, 'content-type', contentType)
  setHeader(event, 'cache-control', 'public, max-age=86400')
  setHeader(event, 'access-control-allow-origin', '*')

  const acceptRanges = upstream.headers.get('accept-ranges')
  if (acceptRanges) setHeader(event, 'accept-ranges', acceptRanges)
  const contentRange = upstream.headers.get('content-range')
  if (contentRange) setHeader(event, 'content-range', contentRange)
  const contentLength = upstream.headers.get('content-length')
  if (contentLength) setHeader(event, 'content-length', contentLength)

  event.node.res.statusCode = upstream.status
  if (!upstream.body) {
    throw createError({ statusCode: 502, statusMessage: 'Empty upstream body' })
  }

  return sendStream(event, Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream))
})
