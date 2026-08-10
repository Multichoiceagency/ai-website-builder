/**
 * Thin HTTP client for core-api using a session cookie + tenant header.
 * Env: CORE_API_URL, PLATFORM_MCP_SESSION_TOKEN, PLATFORM_MCP_TENANT_ID,
 * optional SESSION_COOKIE_NAME (default platform_session).
 */

export interface CoreApiClient {
  get<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  patch<T>(path: string, body?: unknown): Promise<T>
}

function env(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim()
}

export function createCoreApiClient(): CoreApiClient {
  const base = env('CORE_API_URL', 'http://localhost:4000').replace(/\/+$/, '')
  const token = env('PLATFORM_MCP_SESSION_TOKEN')
  const tenantId = env('PLATFORM_MCP_TENANT_ID')
  const cookieName = env('SESSION_COOKIE_NAME', 'platform_session')

  if (!token) {
    throw new Error('PLATFORM_MCP_SESSION_TOKEN is required (platform_session cookie value).')
  }
  if (!tenantId) {
    throw new Error('PLATFORM_MCP_TENANT_ID is required.')
  }

  async function request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    init: { body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {},
  ): Promise<T> {
    const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`)
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }

    const headers: Record<string, string> = {
      cookie: `${cookieName}=${token}`,
      'x-tenant-id': tenantId,
      accept: 'application/json',
    }

    let body: string | undefined
    if (method !== 'GET') {
      body = JSON.stringify(init.body ?? {})
      headers['content-type'] = 'application/json'
    }

    const response = await fetch(url, { method, headers, body })
    const json = (await response.json().catch(() => null)) as {
      success?: boolean
      data?: T
      error?: { message?: string; code?: string }
    } | null

    if (!response.ok || json?.success === false) {
      const message = json?.error?.message || `HTTP ${response.status}`
      throw new Error(message)
    }

    return (json && 'data' in json ? json.data : json) as T
  }

  return {
    get: (path, query) => request('GET', path, { query }),
    post: (path, body) => request('POST', path, { body }),
    patch: (path, body) => request('PATCH', path, { body }),
  }
}
