import type { Sql, Tx } from '../client.js'

/**
 * Persistence for `ai_knowledge_chunks` (platform + tenant RAG).
 *
 * Platform rows use `tenant_id IS NULL`. Embeddings are optional — when absent,
 * callers fall back to lexical scoring.
 */

export interface KnowledgeChunkRow {
  id: string
  tenantId: string | null
  source: string
  sourcePath: string
  title: string
  content: string
  tags: string[]
  embeddingModel: string
  hasEmbedding: boolean
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeHit extends KnowledgeChunkRow {
  score: number
}

export interface UpsertKnowledgeChunkInput {
  tenantId?: string | null
  source: string
  sourcePath: string
  title: string
  content: string
  tags?: string[]
  /** pgvector(768) as a JS number array, or null to leave / clear. */
  embedding?: number[] | null
  embeddingModel?: string
}

interface RawChunkRow {
  id: string
  tenant_id: string | null
  source: string
  source_path: string
  title: string
  content: string
  tags: string[] | null
  embedding_model: string
  has_embedding: boolean
  created_at: Date
  updated_at: Date
  score?: number | string
}

function toChunk(row: RawChunkRow): KnowledgeChunkRow {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    source: row.source,
    sourcePath: row.source_path,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    embeddingModel: row.embedding_model,
    hasEmbedding: Boolean(row.has_embedding),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toHit(row: RawChunkRow): KnowledgeHit {
  return {
    ...toChunk(row),
    score: Number(row.score ?? 0),
  }
}

function embeddingLiteral(values: number[]): string {
  return `[${values.map((n) => (Number.isFinite(n) ? n : 0)).join(',')}]`
}

type Db = Tx | Sql

export async function countKnowledgeChunks(
  db: Db,
  options: { tenantId?: string | null; source?: string; platformOnly?: boolean } = {},
): Promise<number> {
  const [row] = await db<{ count: string | number }[]>`
    SELECT COUNT(*)::int AS count
    FROM ai_knowledge_chunks
    WHERE 1=1
      ${options.platformOnly ? db`AND tenant_id IS NULL` : db``}
      ${options.tenantId ? db`AND (tenant_id IS NULL OR tenant_id = ${options.tenantId})` : db``}
      ${options.source ? db`AND source = ${options.source}` : db``}
  `
  return Number(row?.count ?? 0)
}

export async function countEmbeddedChunks(db: Db): Promise<number> {
  const [row] = await db<{ count: string | number }[]>`
    SELECT COUNT(*)::int AS count
    FROM ai_knowledge_chunks
    WHERE embedding IS NOT NULL
  `
  return Number(row?.count ?? 0)
}

/**
 * Upsert by (tenant_id, source, source_path). `tenant_id` null = platform.
 */
export async function upsertKnowledgeChunk(
  db: Db,
  input: UpsertKnowledgeChunkInput,
): Promise<string> {
  const tenantId = input.tenantId ?? null
  const tags = input.tags ?? []
  const embeddingModel = input.embeddingModel ?? 'lexical-v1'
  const embedding =
    input.embedding && input.embedding.length > 0
      ? embeddingLiteral(input.embedding)
      : null

  const [existing] = await db<{ id: string }[]>`
    SELECT id FROM ai_knowledge_chunks
    WHERE tenant_id IS NOT DISTINCT FROM ${tenantId}
      AND source = ${input.source}
      AND source_path = ${input.sourcePath}
    LIMIT 1
  `

  if (existing) {
    if (embedding) {
      await db`
        UPDATE ai_knowledge_chunks SET
          title = ${input.title},
          content = ${input.content},
          tags = ${tags}::text[],
          embedding = ${embedding}::vector,
          embedding_model = ${embeddingModel},
          updated_at = now()
        WHERE id = ${existing.id}
      `
    } else {
      await db`
        UPDATE ai_knowledge_chunks SET
          title = ${input.title},
          content = ${input.content},
          tags = ${tags}::text[],
          embedding_model = ${embeddingModel},
          updated_at = now()
        WHERE id = ${existing.id}
      `
    }
    return existing.id
  }

  if (embedding) {
    const [row] = await db<{ id: string }[]>`
      INSERT INTO ai_knowledge_chunks (
        tenant_id, source, source_path, title, content, tags, embedding, embedding_model
      ) VALUES (
        ${tenantId},
        ${input.source},
        ${input.sourcePath},
        ${input.title},
        ${input.content},
        ${tags}::text[],
        ${embedding}::vector,
        ${embeddingModel}
      )
      RETURNING id
    `
    return row!.id
  }

  const [row] = await db<{ id: string }[]>`
    INSERT INTO ai_knowledge_chunks (
      tenant_id, source, source_path, title, content, tags, embedding_model
    ) VALUES (
      ${tenantId},
      ${input.source},
      ${input.sourcePath},
      ${input.title},
      ${input.content},
      ${tags}::text[],
      ${embeddingModel}
    )
    RETURNING id
  `
  return row!.id
}

/**
 * Cosine distance via pgvector (`<=>`). Lower distance → higher score.
 */
export async function searchKnowledgeByEmbedding(
  db: Db,
  embedding: number[],
  options: { tenantId?: string | null; limit?: number } = {},
): Promise<KnowledgeHit[]> {
  const limit = Math.min(Math.max(options.limit ?? 6, 1), 24)
  const vector = embeddingLiteral(embedding)
  const rows = await db<RawChunkRow[]>`
    SELECT
      id, tenant_id, source, source_path, title, content, tags,
      embedding_model, (embedding IS NOT NULL) AS has_embedding,
      created_at, updated_at,
      (1 - (embedding <=> ${vector}::vector))::float8 AS score
    FROM ai_knowledge_chunks
    WHERE embedding IS NOT NULL
      AND (
        tenant_id IS NULL
        ${options.tenantId ? db`OR tenant_id = ${options.tenantId}` : db``}
      )
    ORDER BY embedding <=> ${vector}::vector ASC
    LIMIT ${limit}
  `
  return rows.map(toHit)
}

/**
 * Lexical search: ILIKE on title/content plus a simple keyword hit score.
 */
export async function searchKnowledgeLexical(
  db: Db,
  query: string,
  options: { tenantId?: string | null; limit?: number } = {},
): Promise<KnowledgeHit[]> {
  const limit = Math.min(Math.max(options.limit ?? 6, 1), 24)
  const trimmed = query.trim()
  if (!trimmed) return []

  const tokens = trimmed
    .toLowerCase()
    .split(/[^a-z0-9+-]+/i)
    .filter((t) => t.length > 2)
    .slice(0, 16)

  const like = `%${trimmed.slice(0, 120)}%`

  const rows = await db<RawChunkRow[]>`
    SELECT
      id, tenant_id, source, source_path, title, content, tags,
      embedding_model, (embedding IS NOT NULL) AS has_embedding,
      created_at, updated_at,
      (
        CASE WHEN title ILIKE ${like} THEN 4 ELSE 0 END
        + CASE WHEN content ILIKE ${like} THEN 2 ELSE 0 END
        + (
          SELECT COALESCE(SUM(
            CASE
              WHEN lower(title) LIKE '%' || tok || '%' THEN 2
              WHEN lower(content) LIKE '%' || tok || '%' THEN 1
              ELSE 0
            END
          ), 0)
          FROM unnest(${tokens}::text[]) AS tok
        )
      )::float8 AS score
    FROM ai_knowledge_chunks
    WHERE (
      tenant_id IS NULL
      ${options.tenantId ? db`OR tenant_id = ${options.tenantId}` : db``}
    )
    AND (
      title ILIKE ${like}
      OR content ILIKE ${like}
      OR EXISTS (
        SELECT 1 FROM unnest(${tokens}::text[]) AS tok
        WHERE lower(title) LIKE '%' || tok || '%'
           OR lower(content) LIKE '%' || tok || '%'
      )
    )
    ORDER BY score DESC, updated_at DESC
    LIMIT ${limit}
  `
  return rows.map(toHit).filter((hit) => hit.score > 0)
}
