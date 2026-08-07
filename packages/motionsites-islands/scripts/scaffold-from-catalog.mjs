#!/usr/bin/env node
/**
 * Scaffold a MotionSites island folder from the templates catalogue.
 *
 * Usage:
 *   node scripts/scaffold-from-catalog.mjs --id asme-hero
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')
const catalogPath = resolve(pkgRoot, '../templates/src/catalog.generated.ts')

const args = process.argv.slice(2)
const idArg = args.indexOf('--id')
const sectionId = idArg >= 0 ? args[idArg + 1] : null
if (!sectionId) {
  console.error('Usage: scaffold-from-catalog.mjs --id <template-id>')
  process.exit(1)
}

const source = readFileSync(catalogPath, 'utf8')
const match = source.match(new RegExp(`"id":\\s*"${sectionId}"[\\s\\S]*?"sourcePrompt":\\s*"((?:\\\\.|[^"\\\\])*)"`))
if (!match) {
  console.error(`Template ${sectionId} not found in catalogue`)
  process.exit(1)
}

const prompt = JSON.parse(`"${match[1]}"`)
const previewVideo =
  source.match(new RegExp(`"id":\\s*"${sectionId}"[\\s\\S]*?"previewVideo":\\s*"([^"]*)"`))?.[1] ??
  '/motionsites/backgrounds/videos/005_Dark-flowers.mp4'

const dir = join(pkgRoot, 'src/sections', sectionId)
if (existsSync(join(dir, 'App.tsx'))) {
  console.error(`${sectionId} already has App.tsx — refusing to overwrite`)
  process.exit(1)
}

mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'PROMPT.md'), prompt)
writeFileSync(
  join(dir, 'index.html'),
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${sectionId}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
`,
)
writeFileSync(
  join(dir, 'main.tsx'),
  `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@shared/index.css'
import { reportIslandHeight } from '@shared/reportHeight'
import App from './App'

reportIslandHeight('${sectionId}')
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
)
writeFileSync(
  join(dir, 'App.tsx'),
  `/** Scaffold — replace with the exact MotionSites implementation for ${sectionId}. */
export default function App() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        src="${previewVideo || '/motionsites/backgrounds/videos/005_Dark-flowers.mp4'}"
        autoPlay
        muted
        loop
        playsInline
      />
      <p className="relative z-10 font-instrument text-4xl italic">Scaffold: ${sectionId}</p>
    </main>
  )
}
`,
)

console.log(`Scaffolded ${dir}`)
console.log('Add the id to ready.json when the island is complete, then pnpm build.')
