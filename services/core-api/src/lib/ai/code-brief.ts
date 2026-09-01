import type { ComponentTarget } from '@platform/schemas'
import { detectExactIslandIntent } from '@platform/templates'
import { classifyBrief } from './motionsites-brief-agent.js'

/**
 * Decide whether a message is a build brief the block registry cannot answer.
 * Deterministic and offline so the chat can route before any model call.
 */

export interface CodeBrief {
  target: ComponentTarget
  title: string
}

const BUILD_VERB = /\b(build|create|make|implement|code|write|design|bouw|maak|ontwerp|schrijf)\b/i
const SURFACE = /\b(hero|header|nav(?:bar|igation)?|footer|section|sectie|component|landing|page|pagina|banner|card|carousel|slider|pricing|gallery|galerij)\b/i
const CODE_MARKER = /(<style|<script|@media|@keyframes|position\s*:\s*fixed|self-contained html|html file|dependencies\s*:)/i

/** Below this a build verb plus a noun is still a one-line edit, not a spec. */
const SPEC_MIN_LENGTH = 240

function inferTarget(text: string): ComponentTarget {
  const head = text.slice(0, 600)
  if (/\bproduct[- ]card\b/i.test(head)) return 'product-card'
  if (/\bfooter\b/i.test(head) && !/\bhero\b/i.test(head)) return 'footer'
  if (/\b(header|nav(?:bar|igation)?)\b/i.test(head) && !/\bhero\b/i.test(head)) return 'header'
  if (/\bhero\b/i.test(head)) return 'hero'
  return 'section'
}

function inferTitle(text: string): string {
  const named = text.match(/\b(?:site|brand|company|product)\s+(?:called|named)\s+["“']?([A-Za-z0-9][A-Za-z0-9 .&-]{1,40})["”']?/i)
  if (named?.[1]) return named[1].trim()
  const firstLine = text.split('\n').find((line) => line.trim())?.trim() ?? ''
  return firstLine.replace(/^[#\s*-]+/, '').slice(0, 60) || 'Custom section'
}

export function detectCodeBrief(message: string): CodeBrief | null {
  const text = message.trim()
  if (!text) return null
  // A curated island already answers this; inserting it beats generating.
  if (detectExactIslandIntent(text)) return null

  const isSpec =
    classifyBrief(text) === 'exact_island' ||
    CODE_MARKER.test(text) ||
    (text.length >= SPEC_MIN_LENGTH && BUILD_VERB.test(text) && SURFACE.test(text))

  if (!isSpec) return null
  return { target: inferTarget(text), title: inferTitle(text) }
}
