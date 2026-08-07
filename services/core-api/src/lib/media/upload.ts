import { createHash, randomUUID } from 'node:crypto'
import type { MediaAltSource, MediaMime } from '@platform/schemas'
import { AppError, BadRequestError } from '../errors.js'
import { readDimensions } from './dimensions.js'
import { EXTENSION_BY_MIME, sniffMime } from './sniff.js'
import { sanitiseSvg } from './svg.js'

/**
 * Everything that has to be true before bytes are allowed to become an asset.
 *
 * The uploader controls three things — the bytes, the filename and the
 * `content-type` header — and this module trusts exactly one of them.
 */

/** 8 MiB for stills / GIF. Override with MEDIA_MAX_BYTES. */
export const MEDIA_MAX_BYTES = Math.max(
  1024,
  Number(process.env.MEDIA_MAX_BYTES ?? 8 * 1024 * 1024) || 8 * 1024 * 1024,
)

/** 64 MiB for MP4 / WebM. Override with MEDIA_VIDEO_MAX_BYTES. */
export const MEDIA_VIDEO_MAX_BYTES = Math.max(
  MEDIA_MAX_BYTES,
  Number(process.env.MEDIA_VIDEO_MAX_BYTES ?? 64 * 1024 * 1024) || 64 * 1024 * 1024,
)

/** Claims that assert nothing, and so cannot contradict the bytes. */
const NEUTRAL_CONTENT_TYPES = new Set(['', 'application/octet-stream', 'binary/octet-stream'])

const MIME_ALIASES: Record<string, MediaMime> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/svg': 'image/svg+xml',
}

export interface PreparedUpload {
  bytes: Buffer
  mime: MediaMime
  storageKey: string
  filename: string
  sizeBytes: number
  checksum: string
  width: number | null
  height: number | null
  alt: string
  altSource: MediaAltSource
  /** Constructs stripped from an SVG. Empty for every other format. */
  sanitised: string[]
}

/**
 * Reduce a client filename to something safe to *display*.
 *
 * It never reaches the filesystem — the storage key is generated below — but a
 * name is still rendered in a browser and copied into alt text, so path
 * separators, control characters and angle brackets come out here.
 */
export function displayFilename(input: string): string {
  const base = input.split(/[\\/]/).pop() ?? ''
  const cleaned = base
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"|?*]+/g, '')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 300)

  return cleaned || 'upload'
}

/**
 * A first pass at alt text, from the filename.
 *
 * It is stored as `altSource: 'derived'`, which still counts as missing — a
 * filename describes a file, not a picture, and an accessibility report that
 * accepts `hero-final-v2` as a description is a report that lies.
 */
export function deriveAlt(filename: string): string {
  const withoutExtension = filename.replace(/\.[a-z0-9]{1,8}$/i, '')
  const words = withoutExtension
    .replace(/[-_.]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)

  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
}

/**
 * The storage key. Generated entirely here, from a UUID and the *detected*
 * extension — no part of it comes from the request, which is what makes
 * `../../etc/passwd` a display string rather than a write primitive.
 */
function buildStorageKey(mime: MediaMime): string {
  const now = new Date()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `media/${now.getUTCFullYear()}/${month}/${randomUUID()}.${EXTENSION_BY_MIME[mime]}`
}

export function prepareUpload(input: {
  body: Buffer
  claimedContentType: string
  filename: string
  alt?: string
}): PreparedUpload {
  if (input.body.length === 0) {
    throw new BadRequestError('The upload was empty.')
  }
  // Hard ceiling is the video limit — stills are checked again after sniff.
  if (input.body.length > MEDIA_VIDEO_MAX_BYTES) {
    throw new AppError(
      413,
      'file_too_large',
      `Files are limited to ${Math.floor(MEDIA_VIDEO_MAX_BYTES / 1024 / 1024)} MB.`,
    )
  }

  const sniffed = sniffMime(input.body)
  if (!sniffed) {
    throw new BadRequestError(
      'That file type is not supported. Upload a JPEG, PNG, WebP, AVIF, GIF, SVG, MP4 or WebM.',
    )
  }

  const limit = sniffed.startsWith('video/') ? MEDIA_VIDEO_MAX_BYTES : MEDIA_MAX_BYTES
  if (input.body.length > limit) {
    throw new AppError(
      413,
      'file_too_large',
      `${sniffed.startsWith('video/') ? 'Videos' : 'Images'} are limited to ${Math.floor(limit / 1024 / 1024)} MB.`,
    )
  }

  // The claim is only ever used to *contradict* the bytes. A mismatch is a
  // rejection rather than a correction: a caller that says PNG and sends
  // something else is either broken or probing, and neither deserves storage.
  const claimed = input.claimedContentType.split(';')[0]!.trim().toLowerCase()
  if (!NEUTRAL_CONTENT_TYPES.has(claimed)) {
    const normalised = MIME_ALIASES[claimed] ?? claimed
    if (normalised !== sniffed) {
      throw new AppError(
        400,
        'content_type_mismatch',
        `The file says it is ${claimed} but its contents are ${sniffed}.`,
      )
    }
  }

  let bytes = input.body
  let sanitised: string[] = []

  if (sniffed === 'image/svg+xml') {
    const result = sanitiseSvg(bytes)
    if (!result) throw new BadRequestError('That SVG could not be read.')
    bytes = result.svg
    sanitised = result.removed
  }

  const filename = displayFilename(input.filename)
  const trimmedAlt = input.alt?.trim() ?? ''
  const { width, height } = readDimensions(bytes, sniffed)

  return {
    bytes,
    mime: sniffed,
    storageKey: buildStorageKey(sniffed),
    filename,
    sizeBytes: bytes.length,
    checksum: createHash('sha256').update(bytes).digest('hex'),
    width,
    height,
    alt: trimmedAlt || deriveAlt(filename),
    altSource: trimmedAlt ? 'human' : 'derived',
    sanitised,
  }
}

/**
 * Headers for serving stored bytes.
 *
 * SVG is the reason this function exists. Even after sanitisation it is served
 * as a download with scripting denied and sniffing disabled, because two
 * independent defences are the only honest answer to "is our sanitiser
 * complete?" — an `<img src>` still renders it, and an `<img>`-embedded SVG
 * cannot execute anything anyway, so nothing legitimate is lost.
 */
export function responseHeadersFor(
  mime: MediaMime,
  filename: string,
  options: { download?: boolean } = {},
): Record<string, string> {
  const safeName = filename.replace(/["\\]/g, '')
  const headers: Record<string, string> = {
    'content-type': mime,
    'x-content-type-options': 'nosniff',
    'cache-control': 'public, max-age=31536000, immutable',
  }

  if (mime === 'image/svg+xml') {
    headers['content-disposition'] = `attachment; filename="${safeName}"`
    headers['content-security-policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox"
    headers['cache-control'] = 'public, max-age=3600'
    return headers
  }

  // An explicit "save this file" request. Note it can only ever *add* the
  // attachment disposition — the SVG branch above returns before this, so a
  // caller cannot ask for an SVG to be served inline.
  if (options.download) {
    headers['content-disposition'] = `attachment; filename="${safeName}"`
  }

  return headers
}
