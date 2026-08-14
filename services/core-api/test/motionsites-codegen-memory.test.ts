import { describe, expect, it } from 'vitest'
import {
  ensureBaselineMemories,
  remember,
  retrieveWorkingMemory,
} from '../src/lib/ai/agent-memory.js'
import {
  parseDependenciesHeader,
  validateCodegenOutput,
} from '../src/lib/ai/motionsites-codegen-prompt.js'

describe('motionsites codegen prompt contract', () => {
  it('parses the DEPENDENCIES header', () => {
    const source = `/*DEPENDENCIES:{"packages": ["gsap"]} */
import { useEffect } from 'react'
export default function App() { return null }
`
    const parsed = parseDependenciesHeader(source)
    expect(parsed.packages).toEqual(['gsap'])
    expect(parsed.code).toMatch(/^import/)
  })

  it('validates a legal empty-deps component', () => {
    const source = `/*DEPENDENCIES:{"packages": []} */
import { useState } from 'react'
import { Menu } from 'lucide-react'
export default function Hero() {
  const [open, setOpen] = useState(false)
  return <button onClick={() => setOpen(!open)}><Menu /></button>
}
`
    const result = validateCodegenOutput(source)
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('allows embla-carousel-react in DEPENDENCIES', () => {
    const source = `/*DEPENDENCIES:{"packages": ["embla-carousel-react"]} */
import useEmblaCarousel from 'embla-carousel-react'
export default function Slider() {
  const [ref] = useEmblaCarousel({ loop: true })
  return <div ref={ref} />
}
`
    const result = validateCodegenOutput(source)
    expect(result.ok).toBe(true)
    expect(result.packages).toEqual(['embla-carousel-react'])
    expect(result.errors).toEqual([])
  })

  it('rejects markdown fences and disallowed packages', () => {
    const source = `/*DEPENDENCIES:{"packages": ["react-router"]} */
\`\`\`jsx
export default function App() { return null }
\`\`\`
`
    const result = validateCodegenOutput(source)
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/Disallowed|Markdown|Routing/i)
  })
})

describe('agent memory retrieval', () => {
  it('always injects procedural Motionsites codegen rules into working memory', async () => {
    process.env.AGENT_MEMORY_DIR = `/tmp/platform-agent-memory-${Date.now()}`
    await ensureBaselineMemories()
    await remember({
      kind: 'episodic',
      key: 'episodic:test-nexum',
      content: 'Generated Nexum glass hero with gsap packages=["gsap"]',
      tags: ['nexum', 'gsap', 'codegen'],
    })

    const working = await retrieveWorkingMemory('Nexum glassmorphism React Tailwind lucide', {
      maxTokens: 4_000,
    })
    expect(working.procedural.join(' ')).toMatch(/DEPENDENCIES/)
    expect(working.procedural.join(' ')).toMatch(/single-file/)
    expect(working.semantic.length).toBeGreaterThan(0)
    expect(working.episodic.some((entry) => /Nexum/i.test(entry))).toBe(true)
  })

  it('overwrites a stale semantic:allowed-packages record', async () => {
    const dir = `/tmp/platform-agent-memory-stale-${Date.now()}`
    process.env.AGENT_MEMORY_DIR = dir
    const { mkdir, writeFile, readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, 'motionsites-memory.json'),
      JSON.stringify({
        version: 1,
        records: [
          {
            id: 'stale-packages',
            kind: 'semantic',
            key: 'semantic:allowed-packages',
            content: 'Allowed Motionsites codegen packages: react, lucide-react. No embla.',
            tags: ['packages', 'allowlist', 'semantic'],
            createdAt: '2020-01-01T00:00:00.000Z',
            embeddingModel: 'lexical-v1',
          },
        ],
      }),
    )
    await ensureBaselineMemories()
    const stored = JSON.parse(await readFile(join(dir, 'motionsites-memory.json'), 'utf8')) as {
      records: { key: string; content: string }[]
    }
    const packages = stored.records.find((entry) => entry.key === 'semantic:allowed-packages')
    expect(packages?.content).toMatch(/embla-carousel-react/)
    expect(packages?.content).not.toMatch(/No embla/)
  })
})
