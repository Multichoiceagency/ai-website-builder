import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  loadAdminRegistry,
  saveTemplateWithDependencies,
} from '../src/lib/ai/admin-template-registry.js'

describe('saveTemplateWithDependencies', () => {
  const previousTemplates = process.env.ADMIN_TEMPLATES_DIR
  const previousRegistry = process.env.ADMIN_TEMPLATE_REGISTRY

  afterEach(() => {
    if (previousTemplates === undefined) delete process.env.ADMIN_TEMPLATES_DIR
    else process.env.ADMIN_TEMPLATES_DIR = previousTemplates
    if (previousRegistry === undefined) delete process.env.ADMIN_TEMPLATE_REGISTRY
    else process.env.ADMIN_TEMPLATE_REGISTRY = previousRegistry
  })

  it('strips DEPENDENCIES, writes .tsx, and upserts system_registry.json', async () => {
    const root = await mkdtemp(join(tmpdir(), 'admin-templates-'))
    process.env.ADMIN_TEMPLATES_DIR = join(root, 'admin')
    process.env.ADMIN_TEMPLATE_REGISTRY = join(root, 'system_registry.json')

    const raw = `\`\`\`jsx
/*DEPENDENCIES:{"packages": ["framer-motion"]} */
import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'
export default function NexumHero() {
  return <motion.div><Menu /></motion.div>
}
\`\`\``

    const first = await saveTemplateWithDependencies({
      slug: 'nexum-hero',
      name: 'Nexum Hero',
      category: 'Hero',
      rawAiOutput: raw,
      model: 'google:gemini-2.5-pro',
    })

    expect(first.detectedPackages).toEqual(['framer-motion'])
    expect(first.cleanCode).toMatch(/^import/)
    expect(first.cleanCode).not.toMatch(/DEPENDENCIES/)
    expect(first.meta.component_path).toBe('@/templates/admin/nexum-hero.jsx')
    expect(first.meta.is_admin_system_wide).toBe(true)

    const disk = await readFile(first.filePath, 'utf8')
    expect(disk).toContain('export default function NexumHero')
    expect(disk).not.toContain('DEPENDENCIES')

    const updated = await saveTemplateWithDependencies({
      slug: 'nexum-hero',
      name: 'Nexum Hero v2',
      category: 'Hero',
      rawAiOutput: `/*DEPENDENCIES:{"packages": ["gsap"]} */
import gsap from 'gsap'
export default function NexumHero() { return null }
`,
    })

    const registry = await loadAdminRegistry()
    expect(registry).toHaveLength(1)
    expect(registry[0]?.name).toBe('Nexum Hero v2')
    expect(registry[0]?.required_npm_packages).toEqual(['gsap'])
    expect(updated.detectedPackages).toEqual(['gsap'])
  })
})
