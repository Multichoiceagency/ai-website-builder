import { MOTIONSITES_CATALOG } from './catalog.generated.js'
import {
  MOTIONSITES_ISLAND_HEADER_BLOCK,
  MOTIONSITES_ISLAND_READY,
} from './island-ready.js'

/**
 * True when the text is a Motionsites React/Vite/Tailwind build brief that must
 * go through codegen → live island — never Ask AI / Vue prop rewrite.
 */
export function isMotionsitesCodegenBrief(instruction: string): boolean {
  const text = instruction.trim()
  if (!text) return false
  if (detectExactIslandIntent(text)) return true
  const lower = text.toLowerCase()
  if (lower.includes('higgs.ai') || lower.includes('images.higgs')) return true
  if (/\/\*\s*dependencies\s*:/i.test(text)) return true
  return (
    /react/i.test(text) &&
    /tailwind/i.test(text) &&
    /(vite|typescript|gsap|framer-motion|lucide-react)/i.test(text)
  )
}

/**
 * Detect when an Ask-AI / rebuild instruction is an exact MotionSites React
 * build brief — not a Vue prop rewrite. Returns the island id to insert.
 */
export function detectExactIslandIntent(instruction: string): string | null {
  const text = instruction.trim()
  if (!text) return null

  const ready = new Set<string>(MOTIONSITES_ISLAND_READY)
  const templates = MOTIONSITES_CATALOG.templates

  for (const id of MOTIONSITES_ISLAND_READY) {
    const template = templates.find((entry) => entry.id === id)
    if (!template) continue
    if (new RegExp(id.replace(/-/g, '[-\\s]?'), 'i').test(text)) return id
    if (template.title && text.toLowerCase().includes(template.title.toLowerCase())) return id
  }

  // Brand / copy cues — work even when the brief omits Vite/TypeScript.
  if (
    /Nexum/i.test(text) ||
    /Ship AI workers that grind while you rest/i.test(text) ||
    (/Silkscreen/i.test(text) && /42,?500\+?/.test(text))
  ) {
    return ready.has('nexum-hero') ? 'nexum-hero' : null
  }
  if (/Wanderful/i.test(text)) return ready.has('wanderful-hero') ? 'wanderful-hero' : null
  if (/Velorah/i.test(text)) return ready.has('velorah-hero') ? 'velorah-hero' : null
  if (/\bASME\b/i.test(text)) return ready.has('asme-hero') ? 'asme-hero' : null

  const wantsExactStack =
    /React/i.test(text) &&
    /Tailwind/i.test(text) &&
    /(GSAP|framer-motion|lucide-react|TypeScript|Vite)/i.test(text)

  if (!wantsExactStack) return null

  for (const template of templates) {
    if (!ready.has(template.id)) continue
    const tip = template.sourcePrompt.trim().slice(0, 48)
    if (tip && text.includes(tip)) return template.id
  }

  return null
}

export function brandFromIslandId(sectionId: string): string {
  const template = MOTIONSITES_CATALOG.templates.find((entry) => entry.id === sectionId)
  if (!template) return 'Brand'
  return template.title.replace(/\s+Hero$/i, '').trim() || template.title
}

export { MOTIONSITES_ISLAND_HEADER_BLOCK }
