#!/usr/bin/env node
/**
 * Build every ready MotionSites island and copy into dashboard + storefront public.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')
const repoRoot = resolve(pkgRoot, '..', '..')
const ready = JSON.parse(readFileSync(join(pkgRoot, 'ready.json'), 'utf8'))

const targets = [
  join(repoRoot, 'apps/dashboard/public/motionsites/islands'),
  join(repoRoot, 'apps/storefront/public/motionsites/islands'),
]

async function buildSection(sectionId) {
  const sectionRoot = join(pkgRoot, 'src/sections', sectionId)
  const html = join(sectionRoot, 'index.html')
  if (!existsSync(html)) {
    throw new Error(`Missing island entry ${html}`)
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

  for (const targetRoot of targets) {
    mkdirSync(targetRoot, { recursive: true })
    const dest = join(targetRoot, sectionId)
    rmSync(dest, { recursive: true, force: true })
    cpSync(outDir, dest, { recursive: true })
  }

  console.log(`built ${sectionId}`)
}

async function main() {
  for (const id of ready) {
    await buildSection(id)
  }
  console.log(`Copied ${ready.length} island(s) → dashboard + storefront public/motionsites/islands`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
