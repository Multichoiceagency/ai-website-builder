import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDependenciesHeader } from './motionsites-codegen-prompt.js'

/**
 * Admin Motionsites template registry — TypeScript port of
 * `save_template_with_dependencies` / `system_registry.json`.
 *
 * Stores clean React source (DEPENDENCIES header stripped) under
 * `packages/motionsites-islands/templates/admin/{slug}.tsx` and upserts
 * metadata including `required_npm_packages`.
 */

export interface AdminTemplateMeta {
  id: string
  name: string
  category: string
  component_path: string
  required_npm_packages: string[]
  created_at: string
  is_admin_system_wide: boolean
  /** Optional generation model label for audit. */
  model?: string
}

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../')
}

export function adminTemplatesDir(): string {
  const override = process.env.ADMIN_TEMPLATES_DIR?.trim()
  if (override) return resolve(override)
  return join(repoRoot(), 'packages/motionsites-islands/templates/admin')
}

export function registryFilePath(): string {
  const override = process.env.ADMIN_TEMPLATE_REGISTRY?.trim()
  if (override) return resolve(override)
  return join(repoRoot(), 'packages/motionsites-islands/templates/system_registry.json')
}

function stripMarkdownFences(raw: string): string {
  let clean = raw.trim()
  clean = clean.replace(/^```[a-zA-Z]*\n/, '')
  clean = clean.replace(/\n```$/, '').trim()
  return clean
}

export async function loadAdminRegistry(): Promise<AdminTemplateMeta[]> {
  const file = registryFilePath()
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as AdminTemplateMeta[]) : []
  } catch {
    return []
  }
}

export async function saveAdminRegistry(entries: AdminTemplateMeta[]): Promise<void> {
  const file = registryFilePath()
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(entries, null, 4), 'utf8')
}

/**
 * Analyseert AI-output, extraheert npm dependencies, slaat schone code op
 * en registreert systeembreed (zoals de Python pipeline).
 */
export async function saveTemplateWithDependencies(input: {
  slug: string
  name: string
  category: string
  rawAiOutput: string
  model?: string
}): Promise<{
  meta: AdminTemplateMeta
  filePath: string
  detectedPackages: string[]
  cleanCode: string
}> {
  const slug = input.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!slug) throw new Error('slug is required')

  const cleanOutput = stripMarkdownFences(input.rawAiOutput)
  const { packages: detectedPackages, code: cleanCode } = parseDependenciesHeader(cleanOutput)

  const dir = adminTemplatesDir()
  await mkdir(dir, { recursive: true })
  const filename = `${slug}.jsx`
  const filePath = join(dir, filename)
  await writeFile(filePath, `${cleanCode.trim()}\n`, 'utf8')

  const meta: AdminTemplateMeta = {
    id: slug,
    name: input.name.trim() || slug,
    category: input.category.trim() || 'uncategorized',
    component_path: `@/templates/admin/${filename}`,
    required_npm_packages: detectedPackages,
    created_at: new Date().toISOString(),
    is_admin_system_wide: true,
    ...(input.model ? { model: input.model } : {}),
  }

  const registry = await loadAdminRegistry()
  const next = [...registry.filter((entry) => entry.id !== slug), meta]
  await saveAdminRegistry(next)

  return { meta, filePath, detectedPackages, cleanCode }
}
