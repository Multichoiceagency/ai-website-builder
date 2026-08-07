import {
  APP_KEY_HEADER,
  APP_SIGNATURE_HEADER,
  APP_TENANT_HEADER,
  APP_TIMESTAMP_HEADER,
  type Envelope,
} from '@platform/schemas'
import { currentTimestamp, signPayload } from './signature.js'

/**
 * The App Gateway client.
 *
 * This is the *only* way an app reaches platform data. There is no database
 * client in this package and there never will be: an app's authority is the
 * installation behind its key, and that authority is only enforceable if every
 * call crosses the gateway.
 */

export class AppApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppApiError'
  }
}

export interface AppClientOptions {
  /** `pak_…`, shown once when the key was created. */
  apiKey: string
  /** Paired with the key. Required for any write; unused for reads. */
  signingSecret?: string
  /** The workspace to act for. Refused unless the app is installed there. */
  tenantId: string
  baseUrl: string
  fetchImpl?: typeof fetch
}

export interface AppClient {
  get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  patch<T>(path: string, body?: unknown): Promise<T>
  del<T>(path: string): Promise<T>
}

export function createAppClient(options: AppClientOptions): AppClient {
  const doFetch = options.fetchImpl ?? fetch
  const root = options.baseUrl.replace(/\/+$/, '')

  async function request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    init: { body?: unknown; query?: Record<string, string | number | undefined> } = {},
  ): Promise<T> {
    const url = new URL(`${root}/api/v1/apps/gateway${path}`)
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }

    const headers: Record<string, string> = {
      [APP_KEY_HEADER]: options.apiKey,
      [APP_TENANT_HEADER]: options.tenantId,
    }

    // The signed material is the string we are about to send, not the object it
    // came from — re-serialising would produce a different body and a signature
    // the platform could not reproduce.
    let rawBody: string | undefined
    if (method !== 'GET') {
      rawBody = JSON.stringify(init.body ?? {})
      headers['content-type'] = 'application/json'

      if (!options.signingSecret) {
        throw new AppApiError(400, 'missing_signing_secret', 'A signing secret is required for writes.')
      }
      const timestamp = currentTimestamp()
      headers[APP_TIMESTAMP_HEADER] = timestamp
      headers[APP_SIGNATURE_HEADER] = signPayload(options.signingSecret, timestamp, rawBody)
    }

    const response = await doFetch(url.toString(), { method, headers, body: rawBody })
    const envelope = (await response.json()) as Envelope<T>

    if (!envelope.success) {
      throw new AppApiError(response.status, envelope.error.code, envelope.error.message, envelope.error.details)
    }
    return envelope.data
  }

  return {
    get: (path, query) => request('GET', path, query ? { query } : {}),
    post: (path, body) => request('POST', path, { body }),
    patch: (path, body) => request('PATCH', path, { body }),
    del: (path) => request('DELETE', path),
  }
}
