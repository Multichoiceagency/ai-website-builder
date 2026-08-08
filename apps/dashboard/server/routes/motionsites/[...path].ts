import { createReadStream, existsSync, openSync, readSync, closeSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createError, getHeader, getRouterParam, sendStream, setHeader } from 'h3'

/**
 * Serve MotionSites catalogue media from disk.
 *
 * Nuxt's SPA fallback was returning HTML for `/motionsites/**` (especially
 * when the folder was added after the dev server started). This route always
 * reads from `public/motionsites`, sniffs MIME from magic bytes (Dropbox
 * sometimes ships WebP as `.png`), and supports Range for video scrubbing.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../../public/motionsites')

const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
}

function sniffMime(absolute: string, fallback: string): string {
  try {
    const fd = openSync(absolute, 'r')
    const buf = Buffer.alloc(16)
    readSync(fd, buf, 0, 16, 0)
    closeSync(fd)
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
    if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'image/png'
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      return 'image/webp'
    }
    if (buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif'
    if (buf.toString('ascii', 4, 8) === 'ftyp') return 'video/mp4'
  } catch {
    /* fall through */
  }
  return fallback
}

export default defineEventHandler((event) => {
  const raw = getRouterParam(event, 'path') ?? ''
  const segments = raw
    .split('/')
    .map((part) => decodeURIComponent(part.trim()))
    .filter(Boolean)

  if (!segments.length || segments.some((part) => part === '..' || part === '.')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  const absolute = normalize(join(ROOT, ...segments))
  if (!absolute.startsWith(ROOT + sep) && absolute !== ROOT) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const stats = statSync(absolute)
  const ext = extname(absolute).toLowerCase()
  const type = sniffMime(absolute, EXT_MIME[ext] ?? 'application/octet-stream')
  const size = stats.size

  setHeader(event, 'content-type', type)
  setHeader(event, 'accept-ranges', 'bytes')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  setHeader(event, 'content-length', String(size))

  const range = getHeader(event, 'range')
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim())
    if (match) {
      const start = match[1] ? Number(match[1]) : 0
      const end = match[2] ? Number(match[2]) : size - 1
      if (
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start >= 0 &&
        end >= start &&
        start < size
      ) {
        const safeEnd = Math.min(end, size - 1)
        const chunk = safeEnd - start + 1
        setHeader(event, 'content-range', `bytes ${start}-${safeEnd}/${size}`)
        setHeader(event, 'content-length', String(chunk))
        event.node.res.statusCode = 206
        return sendStream(event, createReadStream(absolute, { start, end: safeEnd }))
      }
    }
  }

  return sendStream(event, createReadStream(absolute))
})
