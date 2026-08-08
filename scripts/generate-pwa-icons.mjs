#!/usr/bin/env node
/**
 * Writes minimal solid-color PNGs for PWA install icons (no sharp/ImageMagick).
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const targets = [
  join(root, 'apps/dashboard/public/pwa'),
  join(root, 'apps/storefront/public/pwa'),
]

/** Ink brand fill — matches dashboard charcoal chrome. */
const INK = [17, 24, 39, 255] // #111827
const PAPER = [250, 249, 246, 255] // near --paper

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function png(size, { maskable = false } = {}) {
  const rows = []
  const pad = maskable ? Math.floor(size * 0.12) : Math.floor(size * 0.18)
  const inner = size - pad * 2
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4)
    row[0] = 0
    for (let x = 0; x < size; x++) {
      const i = 1 + x * 4
      const inMark =
        x >= pad &&
        x < size - pad &&
        y >= pad &&
        y < size - pad &&
        // soft rounded square mark
        (() => {
          const nx = (x - pad) / inner
          const ny = (y - pad) / inner
          const r = 0.18
          const inX = nx > r && nx < 1 - r
          const inY = ny > r && ny < 1 - r
          const c1 = (nx - r) ** 2 + (ny - r) ** 2 <= r * r
          const c2 = (nx - (1 - r)) ** 2 + (ny - r) ** 2 <= r * r
          const c3 = (nx - r) ** 2 + (ny - (1 - r)) ** 2 <= r * r
          const c4 = (nx - (1 - r)) ** 2 + (ny - (1 - r)) ** 2 <= r * r
          return inX || inY || c1 || c2 || c3 || c4
        })()
      const [r, g, b, a] = inMark ? PAPER : INK
      row[i] = r
      row[i + 1] = g
      row[i + 2] = b
      row[i + 3] = a
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const files = [
  ['pwa-64x64.png', 64, false],
  ['pwa-192x192.png', 192, false],
  ['pwa-512x512.png', 512, false],
  ['maskable-icon-512x512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
  ['favicon-32x32.png', 32, false],
]

for (const dir of targets) {
  mkdirSync(dir, { recursive: true })
  for (const [name, size, maskable] of files) {
    writeFileSync(join(dir, name), png(size, { maskable }))
  }
  writeFileSync(
    join(dir, 'icon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Platform">
  <rect width="512" height="512" rx="96" fill="#111827"/>
  <rect x="118" y="118" width="276" height="276" rx="48" fill="#FAF9F6"/>
</svg>
`,
  )
  console.log(`wrote ${dir}`)
}
