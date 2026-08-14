/**
 * Remote CMS adapters — Frappe REST v1 `/api/resource/{doctype}` and
 * WordPress REST `/wp-json/wp/v2/{type}`. Keys stay on the server.
 */
import type { CmsProvider } from '@platform/schemas'

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`
}

export async function fetchRemoteCmsEntry(input: {
  provider: CmsProvider
  baseUrl: string
  collection: string
  slug: string
  apiKey?: string
}): Promise<Record<string, unknown> | null> {
  const base = input.baseUrl.trim()
  if (!base.startsWith('https://') && !base.startsWith('http://127.0.0.1') && !base.startsWith('http://localhost')) {
    throw new Error('CMS base URL must be https:// (or localhost for development).')
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (input.apiKey) {
    headers.Authorization =
      input.provider === 'wordpress' ? `Basic ${input.apiKey}` : `token ${input.apiKey}`
  }

  if (input.provider === 'frappe') {
    const url = joinUrl(
      base,
      `/api/resource/${encodeURIComponent(input.collection)}/${encodeURIComponent(input.slug)}`,
    )
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) })
    if (!response.ok) return null
    const body = (await response.json()) as { data?: Record<string, unknown> }
    return body.data ?? null
  }

  if (input.provider === 'wordpress') {
    const type = encodeURIComponent(input.collection)
    const slug = encodeURIComponent(input.slug)
    const url = joinUrl(base, `/wp-json/wp/v2/${type}?slug=${slug}&_fields=id,slug,title,content,excerpt,link`)
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) })
    if (!response.ok) return null
    const list = (await response.json()) as unknown
    if (!Array.isArray(list) || !list[0] || typeof list[0] !== 'object') return null
    const post = list[0] as Record<string, unknown>
    const title = post.title
    const content = post.content
    return {
      ...post,
      title: title && typeof title === 'object' && 'rendered' in title ? String((title as { rendered: string }).rendered) : post.title,
      body: content && typeof content === 'object' && 'rendered' in content ? String((content as { rendered: string }).rendered) : '',
    }
  }

  return null
}
