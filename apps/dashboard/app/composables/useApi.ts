import type { Envelope, Membership, SessionContext } from '@platform/schemas'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** The workspace the dashboard is currently acting in. */
export const useActiveTenantId = () => useState<string | null>('active-tenant', () => null)

export const useSession = () => useState<SessionContext | null>('session', () => null)

/**
 * The single door to the core API.
 *
 * Adds the session cookie and the active workspace to every call, unwraps the
 * response envelope, and turns an error envelope into a typed throw — so no
 * page ever writes `if (!response.success)`.
 */
export function useApi() {
  const config = useRuntimeConfig()
  const tenantId = useActiveTenantId()

  async function request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
      body?: unknown
      query?: Record<string, string | number | undefined>
    } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {}
    if (tenantId.value) headers['x-tenant-id'] = tenantId.value

    try {
      const response = await $fetch<Envelope<T>>(`${config.public.coreApiUrl}${path}`, {
        method: options.method ?? 'GET',
        body: options.body as Record<string, unknown> | undefined,
        query: options.query,
        headers,
        // The session lives in an httpOnly cookie; it is never readable here.
        credentials: 'include',
      })

      if (!response.success) {
        throw new ApiError(400, response.error.code, response.error.message, response.error.details)
      }
      return response.data
    } catch (error) {
      if (error instanceof ApiError) throw error

      const failure = error as { status?: number; statusCode?: number; data?: Envelope<never> }
      const envelope = failure.data
      const status = failure.status ?? failure.statusCode ?? 0

      if (envelope && !envelope.success) {
        throw new ApiError(status, envelope.error.code, envelope.error.message, envelope.error.details)
      }
      throw new ApiError(status, 'network_error', 'Could not reach the platform API.')
    }
  }

  return {
    request,
    get: <T>(path: string, query?: Record<string, string | number | undefined>) =>
      request<T>(path, { query }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
    del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}

/**
 * Load the session once per page load. Also picks the active workspace, which
 * the API then re-validates against membership on every request — the client's
 * choice is a preference, never an authorization.
 */
export async function loadSession(): Promise<SessionContext | null> {
  const session = useSession()
  const tenantId = useActiveTenantId()
  const api = useApi()

  try {
    const context = await api.get<SessionContext>('/api/v1/auth/session')
    session.value = context
    tenantId.value = context.activeTenantId
    return context
  } catch {
    // Register/login may have set the session while this probe was in flight.
    // Never clobber a session that already has a user.
    if (session.value?.user) return session.value
    session.value = null
    tenantId.value = null
    return null
  }
}

export function useActiveMembership(): ComputedRef<Membership | null> {
  const session = useSession()
  const tenantId = useActiveTenantId()
  return computed(
    () => session.value?.memberships.find((m) => m.tenantId === tenantId.value) ?? null,
  )
}

/** Permission check for hiding affordances. The server always re-checks. */
export function useCan() {
  const session = useSession()
  return (permission: string) => Boolean(session.value?.permissions.includes(permission as never))
}
