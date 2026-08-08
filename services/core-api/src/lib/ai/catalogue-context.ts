import { listBlockMetadata } from '@platform/blocks'
import { listTemplates } from '@platform/templates'

/**
 * Compact catalogue summaries for assist / section AI.
 *
 * Full Motionsites briefs and React source stay out of this path (ADR-0003).
 * The model only gets ids, names, and categories so it can cite and recommend
 * inserts without inventing components that are not in the registry.
 */

export type CatalogueKind = 'block' | 'template'

export interface CatalogueEntrySummary {
  kind: CatalogueKind
  id: string
  name: string
  category: string
  /** Template collection (hero, landing, …) or block collection (core, motion, …). */
  collection: string
}

export interface CatalogueHit extends CatalogueEntrySummary {
  score: number
}

const STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'with',
  'from',
  'this',
  'that',
  'into',
  'onto',
  'page',
  'site',
  'website',
  'section',
  'please',
  'want',
  'need',
  'make',
  'add',
  'use',
  'can',
  'you',
  'me',
  'my',
  'we',
])

/** Tokenise a user message for lightweight catalogue retrieval. */
export function catalogueTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP.has(token))
}

function scoreEntry(entry: CatalogueEntrySummary, tokens: string[]): number {
  if (!tokens.length) return 0
  const haystack = `${entry.id} ${entry.name} ${entry.category} ${entry.collection}`.toLowerCase()
  let score = 0
  for (const token of tokens) {
    if (entry.id.toLowerCase() === token) score += 12
    else if (entry.id.toLowerCase().includes(token)) score += 6
    else if (haystack.includes(token)) score += 2
  }
  // Prefer the first-party scroll frame scrubber for interactive 3D / scrub briefs.
  const wantsScrollFrames = tokens.some((token) =>
    ['scroll', 'scrub', 'frames', 'frame', '3d', 'flythrough', 'product-video', 'cinematic'].includes(token),
  )
  if (wantsScrollFrames && entry.id === 'scroll-video-scrub-01') score += 14
  return score
}

/** All block + template rows as compact summaries (ids / names / categories). */
export function listCatalogueSummaries(): CatalogueEntrySummary[] {
  const blocks: CatalogueEntrySummary[] = listBlockMetadata().map((block) => ({
    kind: 'block',
    id: block.id,
    name: block.name,
    category: block.category,
    collection: block.collection,
  }))

  const templates: CatalogueEntrySummary[] = listTemplates().map((template) => ({
    kind: 'template',
    id: template.id,
    name: template.title,
    category: template.category,
    collection: template.collection,
  }))

  return [...blocks, ...templates]
}

/**
 * Ranked catalogue hits for a free-text query.
 *
 * Used by assist + section AI so the model cites real registry / Motionsites /
 * studio-layout ids instead of guessing names.
 */
export function retrieveCatalogueHits(query: string, limit = 24): CatalogueHit[] {
  const tokens = catalogueTokens(query)
  const scored = listCatalogueSummaries()
    .map((entry) => ({ ...entry, score: scoreEntry(entry, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))

  if (scored.length) return scored.slice(0, limit)

  // No lexical hits — still expose a short sample so the model knows the
  // catalogue exists (interactive builder / empty “what can I insert?”).
  return listCatalogueSummaries()
    .slice(0, Math.min(limit, 40))
    .map((entry) => ({ ...entry, score: 0 }))
}

/** One-line-per-entry digest for the system / user prompt. */
export function formatCatalogueDigest(entries: CatalogueEntrySummary[], maxChars = 12_000): string {
  const lines: string[] = []
  let used = 0
  for (const entry of entries) {
    const line = `${entry.kind}\t${entry.id}\t${entry.name}\t${entry.category}\t${entry.collection}`
    if (used + line.length + 1 > maxChars) break
    lines.push(line)
    used += line.length + 1
  }
  return lines.join('\n')
}

/**
 * Full assist context: complete block list + retrieved templates (or a capped
 * template sample when the query is empty / generic).
 */
export function buildAssistCatalogueContext(message: string): {
  digest: string
  hits: CatalogueHit[]
} {
  const blocks = listCatalogueSummaries().filter((entry) => entry.kind === 'block')
  const hits = retrieveCatalogueHits(message, 32)
  const templateHits = hits.filter((hit) => hit.kind === 'template')
  const templates =
    templateHits.length > 0
      ? templateHits
      : listCatalogueSummaries()
          .filter((entry) => entry.kind === 'template')
          .slice(0, 80)
          .map((entry) => ({ ...entry, score: 0 }))

  const digest = [
    '## Block catalogue (id · name · category · collection)',
    formatCatalogueDigest(blocks),
    '',
    '## Templates (Motionsites, studio layouts, and other recipes)',
    formatCatalogueDigest(templates),
  ].join('\n')

  return { digest, hits: hits.slice(0, 12) }
}
