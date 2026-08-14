import { z } from 'zod'

/**
 * Layout-node data binding — CMS entry fields, URL query params, or static copy.
 * Resolved at render time; page JSON never stores fetched CMS payloads (ADR-0003).
 */
export const CMS_PROVIDERS = ['platform', 'frappe', 'wordpress'] as const
export const cmsProviderSchema = z.enum(CMS_PROVIDERS)
export type CmsProvider = z.infer<typeof cmsProviderSchema>

export const LAYOUT_BIND_SOURCES = ['cms', 'url'] as const
export const layoutBindSourceSchema = z.enum(LAYOUT_BIND_SOURCES)
export type LayoutBindSource = z.infer<typeof layoutBindSourceSchema>

export const layoutBindSchema = z.object({
  source: layoutBindSourceSchema,
  /** CMS backend when source is `cms`. */
  provider: cmsProviderSchema.optional(),
  /** Platform collection slug, Frappe DocType, or WP post type. */
  collection: z.string().trim().min(1).max(80).optional(),
  /** Dotted path into the entry, e.g. `title` or `fields.hero`. */
  path: z.string().trim().min(1).max(160).optional(),
  /** Query-string key when source is `url`. */
  queryKey: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, 'must be a URL query key')
    .optional(),
  /** CMS entry slug. When omitted, `query.entry` / `query.slug` / `queryKey` is used. */
  slug: z.string().trim().min(1).max(120).optional(),
})
export type LayoutBind = z.infer<typeof layoutBindSchema>

export const layoutCustomScriptSchema = z.object({
  id: z.string().min(1).max(64),
  /** HTTPS-only script URL (no inline JS in page JSON). */
  src: z
    .string()
    .url()
    .max(2048)
    .refine((value) => value.startsWith('https://'), 'script src must be https://'),
})
export type LayoutCustomScript = z.infer<typeof layoutCustomScriptSchema>

export function readBindPath(record: unknown, path: string): string | undefined {
  if (!path || record == null || typeof record !== 'object') return undefined
  let current: unknown = record
  for (const segment of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  if (typeof current === 'string' || typeof current === 'number') return String(current)
  return undefined
}

export function resolveLayoutBind(
  bind: LayoutBind | undefined,
  context: { query?: Record<string, string | undefined>; cms?: unknown },
): string | undefined {
  if (!bind) return undefined
  if (bind.source === 'url' && bind.queryKey) {
    const value = context.query?.[bind.queryKey]
    return value?.trim() || undefined
  }
  if (bind.source === 'cms' && bind.path) {
    return readBindPath(context.cms, bind.path)
  }
  return undefined
}
