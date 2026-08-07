import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * Guarded outbound HTTP for the crawler.
 *
 * A crawler that fetches a user-supplied URL is a server-side request forgery
 * primitive unless it is constrained. Every request here is checked against a
 * blocklist of private address space *after DNS resolution*, because
 * `http://internal.example.com` can resolve to 169.254.169.254 just as easily
 * as typing the address directly.
 */

const USER_AGENT =
  'PlatformBot/0.1 (+https://platform.local/bot; business profile discovery; respects robots.txt)'

const MAX_BYTES = 2 * 1024 * 1024
const TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 5

export class BlockedUrlError extends Error {
  readonly code = 'blocked_url'
  constructor(message: string) {
    super(message)
    this.name = 'BlockedUrlError'
  }
}

/** RFC1918, loopback, link-local, CGNAT, multicast and the IPv6 equivalents. */
function isPrivateAddress(address: string): boolean {
  const version = isIP(address)

  if (version === 4) {
    const parts = address.split('.').map(Number)
    const [a = 0, b = 0] = parts
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true // link-local, incl. cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    if (a >= 224) return true // multicast / reserved
    return false
  }

  if (version === 6) {
    const normalized = address.toLowerCase()
    if (normalized === '::1' || normalized === '::') return true
    if (normalized.startsWith('fe80') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true
    // IPv4-mapped addresses must be checked as IPv4.
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped?.[1]) return isPrivateAddress(mapped[1])
    return false
  }

  return true
}

export function normalizeUrl(input: string): URL {
  const trimmed = input.trim()
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    throw new BlockedUrlError(`"${input}" is not a valid address.`)
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedUrlError('Only http and https addresses can be read.')
  }

  url.hash = ''
  return url
}

/** Resolve the hostname and refuse anything that points inside our network. */
export async function assertPublicHost(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase()

  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) {
    throw new BlockedUrlError('That address points at a private host.')
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new BlockedUrlError('That address points at a private network.')
    return
  }

  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true })
  } catch {
    throw new BlockedUrlError(`Could not resolve ${hostname}.`)
  }

  if (addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new BlockedUrlError('That address resolves to a private network.')
  }
}

export interface FetchedPage {
  url: string
  status: number
  contentType: string
  body: string
}

/**
 * Fetch one document. Redirects are followed manually so that each hop is
 * re-checked — following them automatically would let a public URL redirect
 * into private address space.
 */
export async function fetchDocument(input: string | URL): Promise<FetchedPage | null> {
  let url = input instanceof URL ? input : normalizeUrl(input)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicHost(url)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,text/plain;q=0.8' },
      })
    } catch {
      clearTimeout(timer)
      return null
    }
    clearTimeout(timer)

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) return null
      url = new URL(location, url)
      continue
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      return { url: url.toString(), status: response.status, contentType, body: '' }
    }

    // Read with a hard cap rather than trusting content-length.
    const reader = response.body?.getReader()
    if (!reader) return { url: url.toString(), status: response.status, contentType, body: '' }

    const chunks: Uint8Array[] = []
    let total = 0
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        total += value.byteLength
      }
    }
    await reader.cancel().catch(() => {})

    const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8')
    return { url: url.toString(), status: response.status, contentType, body }
  }

  return null
}
