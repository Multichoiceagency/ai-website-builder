import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOTIONSITES_CODEGEN_SYSTEM_PROMPT } from './motionsites-codegen-prompt.js'

/**
 * Lightweight agent memory for Motionsites codegen.
 *
 * Types (cognitive architecture):
 * - procedural — always-on rules (the codegen system prompt)
 * - semantic — durable facts (ready islands, package allowlist)
 * - episodic — past generation events (brief → deps → island id)
 * - working — assembled context for one request (token-budgeted)
 *
 * Retrieval first, storage second: failures look like intelligence failures
 * when the wrong memory is injected. We filter by type + keyword score before
 * budgeting tokens into the working set.
 */

export type MemoryKind = 'procedural' | 'semantic' | 'episodic' | 'working'

export interface MemoryRecord {
  id: string
  kind: MemoryKind
  key: string
  content: string
  tags: string[]
  createdAt: string
  /** Embedding model id when vectorized — tracked even for lexical stores. */
  embeddingModel: string
}

export interface WorkingMemoryBundle {
  procedural: string[]
  semantic: string[]
  episodic: string[]
  /** Rough token estimate for budgeting. */
  estimatedTokens: number
}

const EMBEDDING_MODEL = 'lexical-v1'

function memoryDir(): string {
  const override = process.env.AGENT_MEMORY_DIR?.trim()
  if (override) return resolve(override)
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../.agent-memory')
}

function storePath(): string {
  return join(memoryDir(), 'motionsites-memory.json')
}

async function loadStore(): Promise<MemoryRecord[]> {
  try {
    const raw = await readFile(storePath(), 'utf8')
    const parsed = JSON.parse(raw) as { records?: MemoryRecord[] }
    return Array.isArray(parsed.records) ? parsed.records : []
  } catch {
    return []
  }
}

async function saveStore(records: MemoryRecord[]): Promise<void> {
  await mkdir(memoryDir(), { recursive: true })
  await writeFile(storePath(), JSON.stringify({ version: 1, records }, null, 2), 'utf8')
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function scoreRecord(record: MemoryRecord, query: string): number {
  const q = query.toLowerCase()
  let score = 0
  if (record.key.toLowerCase().includes(q.slice(0, 32))) score += 3
  for (const tag of record.tags) {
    if (q.includes(tag.toLowerCase())) score += 2
  }
  const hay = record.content.toLowerCase()
  for (const token of q.split(/[^a-z0-9+-]+/i).filter((t) => t.length > 3).slice(0, 24)) {
    if (hay.includes(token.toLowerCase())) score += 1
  }
  // Temporal: prefer fresher episodic memories slightly.
  if (record.kind === 'episodic') {
    const ageMs = Date.now() - Date.parse(record.createdAt)
    if (Number.isFinite(ageMs) && ageMs < 1000 * 60 * 60 * 24 * 30) score += 1
  }
  return score
}

/** Seed procedural + semantic baseline if the store is empty. */
export async function ensureBaselineMemories(): Promise<void> {
  const records = await loadStore()
  const byKey = new Set(records.map((entry) => entry.key))
  const next = [...records]

  if (!byKey.has('procedural:motionsites-codegen-engine')) {
    next.push({
      id: crypto.randomUUID(),
      kind: 'procedural',
      key: 'procedural:motionsites-codegen-engine',
      content: MOTIONSITES_CODEGEN_SYSTEM_PROMPT,
      tags: ['codegen', 'react', 'motionsites', 'procedural'],
      createdAt: new Date().toISOString(),
      embeddingModel: EMBEDDING_MODEL,
    })
  }

  if (!byKey.has('semantic:allowed-packages')) {
    next.push({
      id: crypto.randomUUID(),
      kind: 'semantic',
      key: 'semantic:allowed-packages',
      content:
        'Allowed Motionsites codegen packages: react, lucide-react, framer-motion, gsap. No routing. No external CSS libraries. Output must start with /*DEPENDENCIES:{"packages":[...]} */.',
      tags: ['packages', 'allowlist', 'semantic'],
      createdAt: new Date().toISOString(),
      embeddingModel: EMBEDDING_MODEL,
    })
  }

  if (!byKey.has('semantic:adr-0003')) {
    next.push({
      id: crypto.randomUUID(),
      kind: 'semantic',
      key: 'semantic:adr-0003',
      content:
        'ADR-0003: generated React source is for Motionsites islands only. Never store component source, markup, or CDN URLs as CMS page content. Pages hold block ids + props.',
      tags: ['adr-0003', 'islands', 'semantic'],
      createdAt: new Date().toISOString(),
      embeddingModel: EMBEDDING_MODEL,
    })
  }

  if (next.length !== records.length) await saveStore(next)
}

export async function remember(input: {
  kind: Exclude<MemoryKind, 'working'>
  key: string
  content: string
  tags?: string[]
}): Promise<MemoryRecord> {
  await ensureBaselineMemories()
  const records = await loadStore()
  const existing = records.findIndex((entry) => entry.key === input.key)
  const record: MemoryRecord = {
    id: existing >= 0 ? records[existing]!.id : crypto.randomUUID(),
    kind: input.kind,
    key: input.key,
    content: input.content,
    tags: input.tags ?? [],
    createdAt: new Date().toISOString(),
    embeddingModel: EMBEDDING_MODEL,
  }
  if (existing >= 0) records[existing] = record
  else records.push(record)
  await saveStore(records)
  return record
}

/**
 * Assemble working memory: always inject procedural, then top semantic +
 * episodic hits under a token budget.
 */
export async function retrieveWorkingMemory(
  query: string,
  options: { maxTokens?: number; episodicLimit?: number; semanticLimit?: number } = {},
): Promise<WorkingMemoryBundle> {
  await ensureBaselineMemories()
  const maxTokens = options.maxTokens ?? 4_000
  const records = await loadStore()

  const procedural = records
    .filter((entry) => entry.kind === 'procedural')
    .map((entry) => entry.content)

  let budget = maxTokens - procedural.reduce((sum, text) => sum + estimateTokens(text), 0)

  const rankedSemantic = records
    .filter((entry) => entry.kind === 'semantic')
    .map((entry) => ({ entry, score: scoreRecord(entry, query) }))
    .sort((a, b) => b.score - a.score)

  const semantic: string[] = []
  for (const { entry } of rankedSemantic.slice(0, options.semanticLimit ?? 6)) {
    const cost = estimateTokens(entry.content)
    if (cost > budget) continue
    semantic.push(entry.content)
    budget -= cost
  }

  const rankedEpisodic = records
    .filter((entry) => entry.kind === 'episodic')
    .map((entry) => ({ entry, score: scoreRecord(entry, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)

  const episodic: string[] = []
  for (const { entry } of rankedEpisodic.slice(0, options.episodicLimit ?? 4)) {
    const cost = estimateTokens(entry.content)
    if (cost > budget) continue
    episodic.push(entry.content)
    budget -= cost
  }

  return {
    procedural,
    semantic,
    episodic,
    estimatedTokens: maxTokens - budget,
  }
}

export function formatWorkingMemoryForPrompt(bundle: WorkingMemoryBundle): string {
  const parts: string[] = []
  if (bundle.procedural.length) {
    parts.push('## Procedural (always on)\n' + bundle.procedural.join('\n\n'))
  }
  if (bundle.semantic.length) {
    parts.push('## Semantic\n' + bundle.semantic.map((text) => `- ${text}`).join('\n'))
  }
  if (bundle.episodic.length) {
    parts.push('## Episodic (similar past generations)\n' + bundle.episodic.map((text) => `- ${text}`).join('\n'))
  }
  return parts.join('\n\n')
}
