import type { TrackingEventPayload } from './types.js'

/**
 * Getting the batch off the page.
 *
 * The hard case is not the happy path — it is the last batch, sent while the
 * page is being torn down. `fetch` is cancelled when the document unloads, so
 * `sendBeacon` goes first: the browser takes ownership of the request and
 * delivers it after the page is gone. `fetch(keepalive)` is the fallback for
 * browsers where the beacon is unavailable or refuses the payload.
 */

export interface TransportResult {
  ok: boolean
  /** Which path actually took the batch, for the debug log. */
  via: 'beacon' | 'fetch'
}

export function send(url: string, events: TrackingEventPayload[], preferBeacon: boolean): Promise<TransportResult> {
  const body = JSON.stringify({ events })

  if (preferBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    // A beacon cannot set headers, which is why the tenant travels in the
    // query string and the content type rides on the Blob.
    const accepted = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    if (accepted) return Promise.resolve({ ok: true, via: 'beacon' })
  }

  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    // Sessions are cookie-based, and the collector may be on another origin.
    credentials: 'include',
    keepalive: true,
  })
    .then((response) => ({ ok: response.ok, via: 'fetch' as const }))
    .catch(() => ({ ok: false, via: 'fetch' as const }))
}
