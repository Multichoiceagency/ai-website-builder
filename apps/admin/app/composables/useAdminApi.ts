import type { Envelope, User } from '@platform/schemas'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const useAdminSession = () =>
  useState<{ isPlatformAdmin: boolean; user: User } | null>('admin-session', () => null)

/**
 * Reads the same session cookie the dashboard uses. Being signed in is not
 * enough — every admin route re-checks `platform_admins` membership server-side.
 */
export function useAdminApi() {
  const config = useRuntimeConfig()

  async function request<T>(
    method: 'GET' | 'PUT' | 'POST' | 'PATCH',
    path: string,
    options?: {
      query?: Record<string, string | number | undefined>
      body?: unknown
    },
  ): Promise<T> {
    try {
      const response = await $fetch<Envelope<T>>(`${config.public.coreApiUrl}/api/v1/admin${path}`, {
        method,
        query: options?.query,
        body: options?.body as Record<string, unknown> | undefined,
        credentials: 'include',
      })
      if (!response.success) throw new ApiError(400, response.error.code, response.error.message)
      return response.data
    } catch (error) {
      if (error instanceof ApiError) throw error
      const failure = error as { status?: number; statusCode?: number; data?: Envelope<never> }
      const envelope = failure.data
      const status = failure.status ?? failure.statusCode ?? 0
      if (envelope && !envelope.success) throw new ApiError(status, envelope.error.code, envelope.error.message)
      throw new ApiError(status, 'network_error', 'Could not reach the platform API.')
    }
  }

  return {
    get: <T>(path: string, query?: Record<string, string | number | undefined>) =>
      request<T>('GET', path, { query }),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, { body }),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, { body }),
  }
}

export async function loadAdminSession() {
  const session = useAdminSession()
  const api = useAdminApi()
  try {
    session.value = await api.get<{ isPlatformAdmin: boolean; user: User }>('/session')
  } catch {
    session.value = null
  }
  return session.value
}
