import type { MediaMime } from '@platform/schemas'

/**
 * Format detection by content, never by name.
 *
 * The filename and the `content-type` header are both written by whoever is
 * uploading, so neither is evidence of anything. `image/png` on a PHP script is
 * a one-line lie; the first eight bytes of a PNG are not. Everything the media
 * library records about a file's type starts here.
 */

function startsWith(bytes: Buffer, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

function asciiAt(bytes: Buffer, offset: number, length: number): string {
  if (bytes.length < offset + length) return ''
  return bytes.toString('latin1', offset, offset + length)
}

/** ISO-BMFF brands that mean "this is an AVIF still or sequence". */
const AVIF_BRANDS = new Set(['avif', 'avis'])

/**
 * SVG has no magic number — it is XML, so detection is structural. We accept it
 * only when, after a BOM, whitespace, an XML declaration, comments and a
 * doctype, the first thing present is an `<svg` element. Anything looser lets
 * an HTML document with an `<svg>` somewhere in it pass as an image.
 */
function looksLikeSvg(bytes: Buffer): boolean {
  // 64 KiB of prologue is already far more than any real file has.
  let text = bytes.subarray(0, 65_536).toString('utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  let rest = text.trimStart()
  for (;;) {
    if (rest.startsWith('<?xml')) {
      const end = rest.indexOf('?>')
      if (end === -1) return false
      rest = rest.slice(end + 2).trimStart()
      continue
    }
    if (rest.startsWith('<!--')) {
      const end = rest.indexOf('-->')
      if (end === -1) return false
      rest = rest.slice(end + 3).trimStart()
      continue
    }
    if (/^<!doctype\s/i.test(rest)) {
      const end = rest.indexOf('>')
      if (end === -1) return false
      rest = rest.slice(end + 1).trimStart()
      continue
    }
    break
  }

  return /^<svg[\s>]/i.test(rest)
}

/**
 * The real media type of these bytes, or `null` when it is not one of the six
 * types the library accepts.
 *
 * `null` is the only other outcome — there is no "probably" branch, because an
 * upload we cannot positively identify is an upload we do not store.
 */
export function sniffMime(bytes: Buffer): MediaMime | null {
  if (bytes.length === 0) return null

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'

  const gif = asciiAt(bytes, 0, 6)
  if (gif === 'GIF87a' || gif === 'GIF89a') return 'image/gif'

  if (asciiAt(bytes, 0, 4) === 'RIFF' && asciiAt(bytes, 8, 4) === 'WEBP') return 'image/webp'

  if (asciiAt(bytes, 4, 4) === 'ftyp') {
    if (AVIF_BRANDS.has(asciiAt(bytes, 8, 4))) return 'image/avif'
    // The major brand can be generic (`mif1`); the compatible-brand list that
    // follows is then what says AVIF.
    const boxSize = bytes.readUInt32BE(0)
    const end = Math.min(bytes.length, Math.max(16, Math.min(boxSize, 512)))
    for (let offset = 16; offset + 4 <= end; offset += 4) {
      if (AVIF_BRANDS.has(asciiAt(bytes, offset, 4))) return 'image/avif'
    }
  }

  if (looksLikeSvg(bytes)) return 'image/svg+xml'

  // ISO-BMFF / ftyp brands used by MP4 (and the common QuickTime aliases).
  if (asciiAt(bytes, 4, 4) === 'ftyp') {
    const brand = asciiAt(bytes, 8, 4)
    if (['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V ', 'M4A '].includes(brand)) {
      return 'video/mp4'
    }
    const boxSize = bytes.readUInt32BE(0)
    const end = Math.min(bytes.length, Math.max(16, Math.min(boxSize, 512)))
    for (let offset = 16; offset + 4 <= end; offset += 4) {
      const compatible = asciiAt(bytes, offset, 4)
      if (['isom', 'iso2', 'mp41', 'mp42', 'avc1'].includes(compatible)) return 'video/mp4'
    }
  }

  // WebM / Matroska EBML header.
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm'

  return null
}

/** Extension for a *detected* type. Never derived from the uploaded name. */
export const EXTENSION_BY_MIME: Record<MediaMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}
