import { BadRequestError } from '../errors.js'
import { MEDIA_MAX_BYTES } from './upload.js'

/**
 * Allowlisted HTTPS image hosts for “import URL → library” (SSRF-safe).
 * Covers common CDNs used in freeform paste flows (Sanity, Pexels, Mixkit, Unsplash).
 */
const ALLOWED_IMAGE_HOSTS = new Set([
  'cdn.sanity.io',
  'images.pexels.com',
  'images.unsplash.com',
  'plus.unsplash.com',
  'assets.mixkit.co',
  'cdn.pixabay.com',
  'i.imgur.com',
])

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i

export function isAllowedRemoteImageUrl(raw: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return false
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false
  if (host.includes(':')) return false
  return ALLOWED_IMAGE_HOSTS.has(host) || host.endsWith('.cdn.sanity.io')
}

export async function fetchAllowlistedImage(url: string): Promise<{
  bytes: Buffer
  contentType: string
  filename: string
}> {
  if (!isAllowedRemoteImageUrl(url)) {
    throw new BadRequestError(
      'That image URL is not on the allowlist. Use HTTPS from Sanity CDN, Pexels, Unsplash, Mixkit, or Pixabay.',
    )
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': 'PlatformMediaImport/1.0 (+remote-image)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(45_000),
  })

  if (!response.ok) {
    throw new BadRequestError(`Could not download image (HTTP ${response.status}).`)
  }

  const lengthHeader = response.headers.get('content-length')
  if (lengthHeader && Number(lengthHeader) > MEDIA_MAX_BYTES) {
    throw new BadRequestError(
      `Image is larger than ${Math.floor(MEDIA_MAX_BYTES / 1024 / 1024)} MB.`,
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength > MEDIA_MAX_BYTES) {
    throw new BadRequestError(
      `Image is larger than ${Math.floor(MEDIA_MAX_BYTES / 1024 / 1024)} MB.`,
    )
  }

  const headerType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
  let contentType = headerType
  if (!contentType.startsWith('image/')) {
    const path = url.split('?')[0]!.toLowerCase()
    if (path.endsWith('.png')) contentType = 'image/png'
    else if (path.endsWith('.webp')) contentType = 'image/webp'
    else if (path.endsWith('.gif')) contentType = 'image/gif'
    else if (path.endsWith('.avif')) contentType = 'image/avif'
    else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) contentType = 'image/jpeg'
    else if (IMAGE_EXT.test(path)) contentType = 'image/jpeg'
    else {
      throw new BadRequestError('URL did not return an image.')
    }
  }

  const fromUrl = url.split('?')[0]?.split('/').pop() ?? 'remote-image.jpg'
  const filename = /\.(jpe?g|png|webp|gif|avif)$/i.test(fromUrl)
    ? fromUrl.slice(0, 300)
    : `remote-${Date.now()}.jpg`

  return {
    bytes: Buffer.from(arrayBuffer),
    contentType,
    filename,
  }
}
