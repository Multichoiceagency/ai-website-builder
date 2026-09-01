import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'
import type { StorageProvider } from '../storage/types.js'
import { storage } from '../storage/index.js'

/**
 * Built islands leave the API container. The API is the only service with the
 * Vite toolchain, the dashboard and storefront are the only ones a browser
 * reaches, and none of them share a disk in production.
 */

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
}

export const ISLAND_ID = /^[a-z0-9][a-z0-9-]{0,79}$/

export function mimeForPath(path: string): string {
  return MIME[extname(path).toLowerCase()] ?? 'application/octet-stream'
}

/**
 * Storage keys allow only lowercase and a single dot; Vite emits mixed-case
 * hashes and dotted module names. Publish and serve fold the same way, so a
 * browser asking for the name in index.html still finds the object.
 */
export function islandArtifactKey(sectionId: string, relativePath: string): string {
  if (!ISLAND_ID.test(sectionId)) throw new Error(`Invalid island id: ${sectionId}`)
  const segments = relativePath.split('/').filter((part) => part && part !== '.' && part !== '..')
  if (!segments.length) throw new Error('Empty island path')
  const file = segments.pop()!.toLowerCase()
  const dot = file.lastIndexOf('.')
  const stem = (dot > 0 ? file.slice(0, dot) : file).replace(/[^a-z0-9_-]/g, '-')
  const ext = dot > 0 ? file.slice(dot + 1).replace(/[^a-z0-9]/g, '') : 'bin'
  const folders = segments.map((part) => part.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))
  return ['motionsites', 'islands', sectionId, ...folders, `${stem}.${ext}`].join('/')
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (entry.isFile()) files.push(full)
  }
  return files
}

export interface PublishIslandInput {
  sectionId: string
  distDir: string
  store?: Pick<StorageProvider, 'put'>
}

/** Resolves with the keys written; rejects on the first object that fails. */
export async function publishIslandArtifacts(input: PublishIslandInput): Promise<string[]> {
  const store = input.store ?? storage()
  const keys: string[] = []
  for (const file of await walk(input.distDir)) {
    const rel = relative(input.distDir, file).split(sep).join('/')
    const key = islandArtifactKey(input.sectionId, rel)
    await store.put(key, await readFile(file), mimeForPath(file))
    keys.push(key)
  }
  return keys
}
