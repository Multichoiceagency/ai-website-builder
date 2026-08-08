import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import { sendStream, setHeader, createError, getRouterParam } from 'h3'

/**
 * Serve MotionSites catalogue media from disk.
 *
 * Nuxt's SPA fallback was returning HTML for `/motionsites/**` (especially
 * when the folder was added after the dev server started). This route always
 * reads from `public/motionsites` so thumbs + videos load in the insert panel.
 */

const ROOT = join(process.cwd(), 'public', 'motionsites')

const MIME: Record<string, string> = {
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

export default defineEventHandler((event) => {
  const raw = getRouterParam(event, 'path') ?? ''
  const segments = raw
    .split('/')
    .map((part) => part.trim())
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

  const type = MIME[extname(absolute).toLowerCase()] ?? 'application/octet-stream'
  setHeader(event, 'content-type', type)
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return sendStream(event, createReadStream(absolute))
})
