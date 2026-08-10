import { env } from '../config/env.js'

/**
 * Absolute public origins for webhooks, Connect URLs, and cross-service links.
 * Prefer explicit env; fall back to forwarded Host only when CORE_API_URL is unset (local).
 */

export function coreApiPublicOrigin(request?: {
  headers?: Record<string, unknown>
  protocol?: string
}): string {
  const fromEnv = env.CORE_API_URL?.trim() || process.env.CORE_API_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')

  if (request?.headers) {
    const forwardedProto = request.headers['x-forwarded-proto']
    const proto =
      (typeof forwardedProto === 'string' ? forwardedProto.split(',')[0]?.trim() : null) ||
      request.protocol ||
      'http'
    const forwardedHost = request.headers['x-forwarded-host']
    const hostHeader = request.headers.host
    const host =
      (typeof forwardedHost === 'string' ? forwardedHost.split(',')[0]?.trim() : null) ||
      (typeof hostHeader === 'string' ? hostHeader : null) ||
      `localhost:${env.CORE_API_PORT}`
    return `${proto}://${host}`
  }

  return `http://localhost:${env.CORE_API_PORT}`
}

export function dashboardPublicOrigin(): string {
  const fromEnv = env.DASHBOARD_URL?.trim() || process.env.DASHBOARD_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  return env.CORS_ORIGINS.find((origin) => !origin.includes('3001') && !origin.includes('3002')) ??
    env.CORS_ORIGINS[0] ??
    'http://localhost:3000'
}

export function storefrontPublicOrigin(): string {
  const fromEnv = env.STOREFRONT_URL?.trim() || process.env.STOREFRONT_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  return (
    env.CORS_ORIGINS.find((origin) => origin.includes('3001') || origin.includes('storefront')) ??
    env.CORS_ORIGINS[0] ??
    'http://localhost:3001'
  )
}

export function whatsappWebhookUrl(
  tenantId: string,
  request?: { headers?: Record<string, unknown>; protocol?: string },
): string {
  return `${coreApiPublicOrigin(request)}/api/v1/crm/whatsapp/webhook?tenantId=${encodeURIComponent(tenantId)}`
}

export function nangoWebhookUrl(
  request?: { headers?: Record<string, unknown>; protocol?: string },
): string {
  return `${coreApiPublicOrigin(request)}/api/v1/integrations/nango/webhook`
}

/** True when a URL still points at loopback — never use these in prod UI copy. */
export function isLoopbackUrl(value: string | null | undefined): boolean {
  if (!value) return false
  try {
    const host = new URL(value).hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')
  } catch {
    return /localhost|127\.0\.0\.1/i.test(value)
  }
}
