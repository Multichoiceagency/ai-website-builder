import { createSection, listBlockMetadata } from '@platform/blocks'
import type { Section } from '@platform/schemas'
import { geminiApiKey, generateGeminiContent, resolveGeminiModel } from './providers/gemini-client.js'

/**
 * Turns a written brief into registry blocks.
 *
 * The freeform path used to force every page into one `layout-canvas-01` with a
 * hand-built tree of text nodes, so a brief asking for a video hero, a
 * scroll-driven statement and a streaming CTA band produced the same three
 * stacked paragraphs as any other brief. The registry it never touched already
 * holds eleven heroes, a video scrubber, a mask reveal and a marquee.
 *
 * ADR-0003 holds: the model picks ids from the catalogue and fills props, and
 * `createSection` validates both against the block's own schema. It cannot
 * invent a block, and it cannot emit markup.
 */

/** Enough of the catalogue to choose from, small enough to send. */
function catalogue(maxClass: 'A' | 'B' | 'C' | 'D' = 'B'): string {
  const order = { A: 0, B: 1, C: 2, D: 3 } as const
  return listBlockMetadata()
    .filter((block) => order[block.performanceClass] <= order[maxClass])
    // Capabilities rather than prop keys: the metadata does not carry the
    // schema, and `createSection` validates the props anyway.
    .map((block) => {
      const can = block.capabilities?.slice(0, 10).join(', ') ?? ''
      return `${block.id} [${block.category}] ${block.description || block.name}${can ? ` | can: ${can}` : ''}`
    })
    .join('\n')
    .slice(0, 24_000)
}

export interface BriefPage {
  path: string
  sections: Section[]
}

/**
 * Returns nothing rather than a guess: an empty result tells the caller to keep
 * its own composition, which is a working page. A half-built one is not.
 */
export async function sectionsFromBrief(input: {
  prompt: string
  brand: string
  locale: string
}): Promise<BriefPage[]> {
  if (!geminiApiKey()) return []

  try {
    const result = await generateGeminiContent({
      model: resolveGeminiModel(),
      systemInstruction: [
        'You lay out a website by choosing blocks from a fixed catalogue.',
        'Answer with JSON only: {"pages":[{"path":"/","sections":[{"block":"<id>","props":{}}]}]}.',
        'Use only ids from the catalogue. Never invent an id or a prop key.',
        'Fill props with copy written for this brief, in the brief\'s language.',
        'Order sections the way the brief orders them. 4 to 8 per page.',
        'Prefer blocks whose description matches what the brief asks for —',
        'a brief naming background video wants a video block, not a plain hero.',
        '',
        'CATALOGUE:',
        catalogue(),
      ].join('\n'),
      userText: `Locale: ${input.locale}. Brand: ${input.brand}.\nBrief:\n${input.prompt.slice(0, 8_000)}`,
      responseMimeType: 'application/json',
      maxOutputTokens: 4_000,
      thinking: 'off',
      timeoutMs: 45_000,
      maxAttempts: 1,
    })

    const parsed = JSON.parse(result.text) as {
      pages?: { path?: string; sections?: { block?: string; props?: Record<string, unknown> }[] }[]
    }

    const pages: BriefPage[] = []
    for (const page of parsed.pages ?? []) {
      const path = typeof page.path === 'string' && page.path.startsWith('/') ? page.path : '/'
      const sections: Section[] = []
      for (const entry of page.sections ?? []) {
        if (!entry?.block) continue
        try {
          sections.push(createSection(entry.block, entry.props ?? {}))
        } catch {
          // An unknown id or a prop the schema refuses drops that section and
          // keeps the rest; one bad choice must not cost the whole page.
        }
      }
      if (sections.length) pages.push({ path, sections })
    }
    return pages
  } catch {
    return []
  }
}
