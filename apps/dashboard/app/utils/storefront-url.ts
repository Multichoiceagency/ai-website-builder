/**
 * Build a storefront URL that works locally (`*.localhost:3001`) and on Coolify
 * (HTTPS public host / `{slug}.{edge}`), without hardcoding port 3001 in prod.
 */
export function buildStorefrontUrl(options: {
  storefrontBase: string
  primaryHostname?: string | null
  path?: string
}): string {
  const path = options.path?.startsWith('/') ? options.path : `/${options.path || ''}`
  const normalizedPath = path === '//' ? '/' : path || '/'

  try {
    const base = new URL(String(options.storefrontBase || 'http://localhost:3001'))
    const rawHost = (options.primaryHostname || '').trim().replace(/^https?:\/\//, '').split('/')[0]

    if (!rawHost) {
      base.pathname = normalizedPath
      base.search = ''
      base.hash = ''
      return base.toString()
    }

    const hostOnly = rawHost.split(':')[0]!.toLowerCase()
    const isLocal = hostOnly === 'localhost' || hostOnly.endsWith('.localhost')

    if (isLocal) {
      const port = rawHost.includes(':') ? rawHost.split(':')[1] : base.port || '3001'
      return `http://${hostOnly}${port ? `:${port}` : ''}${normalizedPath}`
    }

    // Production / sslip / custom domain: keep the storefront protocol (usually https).
    return `${base.protocol}//${hostOnly}${normalizedPath}`
  } catch {
    return String(options.storefrontBase || '/')
  }
}
