import type { MediaMime } from '@platform/schemas'

export interface Dimensions {
  width: number | null
  height: number | null
}

const UNKNOWN: Dimensions = { width: null, height: null }

/**
 * Intrinsic pixel size, read from the file's own header.
 *
 * Blocks need `width`/`height` to reserve space before the image loads — that
 * reservation is the difference between a page that settles and a page that
 * jumps (CLS). Reading it here, once, at upload, is why no renderer has to
 * guess later.
 *
 * Header parsing only: no decoding, so a malformed or hostile file costs a few
 * bounds-checked reads and then returns `null`, which callers store as "not
 * known" rather than treating as a failure.
 */
export function readDimensions(bytes: Buffer, mime: MediaMime): Dimensions {
  try {
    switch (mime) {
      case 'image/png':
        return readPng(bytes)
      case 'image/jpeg':
        return readJpeg(bytes)
      case 'image/gif':
        return readGif(bytes)
      case 'image/webp':
        return readWebp(bytes)
      case 'image/avif':
        return readAvif(bytes)
      case 'image/svg+xml':
        return readSvg(bytes)
      default:
        return UNKNOWN
    }
  } catch {
    return UNKNOWN
  }
}

/** IHDR is always the first chunk, at a fixed offset. */
function readPng(bytes: Buffer): Dimensions {
  if (bytes.length < 24 || bytes.toString('latin1', 12, 16) !== 'IHDR') return UNKNOWN
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** Walk the marker chain to the first start-of-frame. */
function readJpeg(bytes: Buffer): Dimensions {
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = bytes[offset + 1]!
    // SOF0..SOF15, excluding the four that are not frame headers.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) }
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    offset += 2 + bytes.readUInt16BE(offset + 2)
  }
  return UNKNOWN
}

function readGif(bytes: Buffer): Dimensions {
  if (bytes.length < 10) return UNKNOWN
  return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) }
}

/** Three container flavours, three header layouts. */
function readWebp(bytes: Buffer): Dimensions {
  const format = bytes.toString('latin1', 12, 16)

  if (format === 'VP8X' && bytes.length >= 30) {
    return {
      width: 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16)),
      height: 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16)),
    }
  }
  if (format === 'VP8 ' && bytes.length >= 30) {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff }
  }
  if (format === 'VP8L' && bytes.length >= 25) {
    const bits = bytes.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  return UNKNOWN
}

/**
 * AVIF keeps the size in an `ispe` box somewhere in the metadata tree. Scanning
 * for the box type beats implementing the full ISO-BMFF walk for one field.
 */
function readAvif(bytes: Buffer): Dimensions {
  const marker = Buffer.from('ispe', 'latin1')
  const index = bytes.subarray(0, Math.min(bytes.length, 65_536)).indexOf(marker)
  if (index === -1 || index + 12 > bytes.length) return UNKNOWN
  return { width: bytes.readUInt32BE(index + 8), height: bytes.readUInt32BE(index + 12) }
}

/** `width`/`height` if they are plain pixels, otherwise the viewBox extent. */
function readSvg(bytes: Buffer): Dimensions {
  const head = bytes.subarray(0, 4096).toString('utf8')
  const open = head.match(/<svg\b[^>]*>/i)?.[0]
  if (!open) return UNKNOWN

  const attribute = (name: string): number | null => {
    const raw = open.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1]
    if (!raw) return null
    const value = Number.parseFloat(raw)
    return Number.isFinite(value) && /^[\d.]+(px)?$/i.test(raw.trim()) ? Math.round(value) : null
  }

  const width = attribute('width')
  const height = attribute('height')
  if (width !== null && height !== null) return { width, height }

  const viewBox = open.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1]
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      return { width: Math.round(parts[2]!), height: Math.round(parts[3]!) }
    }
  }
  return { width, height }
}
