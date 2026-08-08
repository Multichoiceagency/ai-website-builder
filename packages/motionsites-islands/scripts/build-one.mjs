#!/usr/bin/env node
/**
 * Build a single MotionSites island and copy to dashboard + storefront public.
 * Usage: node scripts/build-one.mjs <sectionId>
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const sectionId = process.argv[2]
if (!sectionId) {
  console.error('Usage: build-one.mjs <sectionId>')
  process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')
const repoRoot = resolve(pkgRoot, '..', '..')
const sectionRoot = join(pkgRoot, 'src/sections', sectionId)
const html = join(sectionRoot, 'index.html')

if (!existsSync(html)) {
  console.error(`Missing island entry ${html}`)
  process.exit(1)
}

const outDir = join(pkgRoot, 'dist', sectionId)
rmSync(outDir, { recursive: true, force: true })

await build({
  configFile: false,
  root: sectionRoot,
  base: `/motionsites/islands/${sectionId}/`,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': join(pkgRoot, 'src/shared'),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
    assetsDir: 'assets',
  },
})

const targets = [
  join(repoRoot, 'apps/dashboard/public/motionsites/islands'),
  join(repoRoot, 'apps/storefront/public/motionsites/islands'),
]

for (const targetRoot of targets) {
  mkdirSync(targetRoot, { recursive: true })
  const dest = join(targetRoot, sectionId)
  rmSync(dest, { recursive: true, force: true })
  cpSync(outDir, dest, { recursive: true })
}

console.log(`built ${sectionId}`)
