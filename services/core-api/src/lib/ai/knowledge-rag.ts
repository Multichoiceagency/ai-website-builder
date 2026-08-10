import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from '../../db/client.js'
import {
  countEmbeddedChunks,
  countKnowledgeChunks,
  searchKnowledgeByEmbedding,
  searchKnowledgeLexical,
  upsertKnowledgeChunk,
  type KnowledgeHit,
} from '../../db/repositories/knowledge.js'

/**
 * Platform knowledge RAG for the dashboard assistant.
 *
 * Seeds durable product docs into `ai_knowledge_chunks`. Retrieval prefers
 * pgvector cosine when embeddings exist; otherwise lexical ILIKE / keyword score.
 * Optional Obsidian vault sync via `OBSIDIAN_VAULT_PATH`.
 */

const SEED_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'knowledge-seeds')

const PLATFORM_SEEDS: { path: string; title: string; tags: string[] }[] = [
  {
    path: 'assist-actions.md',
    title: 'Assist actions',
    tags: ['assist', 'actions', 'layout', 'header', 'logo'],
  },
  {
    path: 'header-footer-chrome.md',
    title: 'Header and footer chrome',
    tags: ['header', 'footer', 'chrome', 'logo'],
  },
  {
    path: 'ecommerce-builder.md',
    title: 'Ecommerce builder',
    tags: ['ecommerce', 'shop', 'store', 'commerce'],
  },
  {
    path: 'motion-stack.md',
    title: 'Motion stack Lenis GSAP Vanta React Bits',
    tags: ['lenis', 'gsap', 'vanta', 'react-bits', 'motion', 'scroll'],
  },
]

export interface SearchKnowledgeOptions {
  tenantId?: string | null
  limit?: number
}

let seedPromise: Promise<void> | null = null

function titleFromPath(filePath: string): string {
  const base = filePath.split(/[/\\]/).pop() ?? filePath
  return base.replace(/\.md$/i, '').replace(/[-_]+/g, ' ')
}

/**
 * Upsert built-in platform chunks (assist actions, chrome, ecommerce, logo).
 * Optionally sync markdown from `OBSIDIAN_VAULT_PATH` when set.
 */
export async function seedPlatformKnowledge(): Promise<{ seeded: number; obsidian: number }> {
  let seeded = 0
  for (const seed of PLATFORM_SEEDS) {
    const absolute = join(SEED_DIR, seed.path)
    let content: string
    try {
      content = await readFile(absolute, 'utf8')
    } catch {
      continue
    }
    if (!content.trim()) continue
    await upsertKnowledgeChunk(sql, {
      tenantId: null,
      source: 'platform',
      sourcePath: seed.path,
      title: seed.title,
      content: content.trim(),
      tags: seed.tags,
      embeddingModel: 'lexical-v1',
    })
    seeded += 1
  }

  const obsidian = await syncObsidianVaultIfConfigured()
  return { seeded, obsidian }
}

/**
 * Lightweight ensure: seed once when no platform chunks exist.
 * Safe to call from assist and from API boot (deduped in-process).
 */
export async function ensurePlatformKnowledgeSeeded(): Promise<void> {
  if (seedPromise) return seedPromise
  seedPromise = (async () => {
    try {
      const count = await countKnowledgeChunks(sql, { platformOnly: true, source: 'platform' })
      if (count > 0) return
      await seedPlatformKnowledge()
    } catch {
      // DB may be mid-migrate on boot — assist will retry later.
      seedPromise = null
    }
  })()
  return seedPromise
}

async function syncObsidianVaultIfConfigured(): Promise<number> {
  const vault = process.env.OBSIDIAN_VAULT_PATH?.trim()
  if (!vault) return 0

  const root = resolve(vault)
  let written = 0
  try {
    const files = await collectMarkdownFiles(root, root, 0)
    for (const relative of files.slice(0, 200)) {
      const absolute = join(root, relative)
      let content: string
      try {
        content = await readFile(absolute, 'utf8')
      } catch {
        continue
      }
      const trimmed = content.trim()
      if (!trimmed || trimmed.length < 40) continue
      await upsertKnowledgeChunk(sql, {
        tenantId: null,
        source: 'obsidian',
        sourcePath: relative,
        title: titleFromPath(relative),
        content: trimmed.slice(0, 12_000),
        tags: ['obsidian'],
        embeddingModel: 'lexical-v1',
      })
      written += 1
    }
  } catch {
    return written
  }
  return written
}

async function collectMarkdownFiles(
  root: string,
  dir: string,
  depth: number,
): Promise<string[]> {
  if (depth > 6) return []
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return []
  }

  const out: string[] = []
  for (const name of names) {
    if (name.startsWith('.')) continue
    if (name === 'node_modules' || name === '.git') continue
    const absolute = join(dir, name)
    let isDirectory = false
    try {
      isDirectory = (await stat(absolute)).isDirectory()
    } catch {
      continue
    }
    if (isDirectory) {
      out.push(...(await collectMarkdownFiles(root, absolute, depth + 1)))
      continue
    }
    if (!name.toLowerCase().endsWith('.md')) continue
    out.push(absolute.slice(root.length).replace(/^[/\\]/, '').replace(/\\/g, '/'))
  }
  return out
}

/**
 * Retrieve top knowledge hits for a free-text assist query.
 * Uses cosine via pgvector when any embeddings exist and a query vector can be
 * built; otherwise lexical ILIKE / keyword score.
 */
export async function searchKnowledge(
  query: string,
  options: SearchKnowledgeOptions = {},
): Promise<KnowledgeHit[]> {
  const limit = options.limit ?? 6
  const trimmed = query.trim()
  if (!trimmed) return []

  const embeddedCount = await countEmbeddedChunks(sql)
  if (embeddedCount > 0) {
    const vector = await embedQuery(trimmed)
    if (vector) {
      const hits = await searchKnowledgeByEmbedding(sql, vector, {
        tenantId: options.tenantId,
        limit,
      })
      if (hits.length) return hits
    }
  }

  return searchKnowledgeLexical(sql, trimmed, {
    tenantId: options.tenantId,
    limit,
  })
}

/**
 * Optional Gemini embedding (768-d to match migration). Returns null when
 * unavailable so callers fall back to lexical search.
 */
async function embedQuery(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) return null

  try {
    const model = process.env.GEMINI_EMBEDDING_MODEL?.trim() || 'text-embedding-004'
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text: text.slice(0, 2_000) }] },
        }),
        signal: AbortSignal.timeout(8_000),
      },
    )
    if (!response.ok) return null
    const payload = (await response.json()) as {
      embedding?: { values?: number[] }
    }
    const values = payload.embedding?.values
    if (!Array.isArray(values) || values.length < 32) return null
    // Truncate / pad to 768 if the model differs slightly.
    if (values.length === 768) return values
    if (values.length > 768) return values.slice(0, 768)
    return [...values, ...Array.from({ length: 768 - values.length }, () => 0)]
  } catch {
    return null
  }
}

/** Format hits for injection into the assist system / user prompt. */
export function formatKnowledgeForPrompt(hits: KnowledgeHit[]): string {
  if (!hits.length) return ''
  const blocks = hits.map((hit, index) => {
    const body = hit.content.length > 900 ? `${hit.content.slice(0, 900)}…` : hit.content
    return `[${index + 1}] ${hit.title} (${hit.source}${hit.sourcePath ? `:${hit.sourcePath}` : ''})\n${body}`
  })
  return `Product knowledge (prefer these facts; emit structured actions when the user asks to change the site):\n\n${blocks.join('\n\n')}`
}
