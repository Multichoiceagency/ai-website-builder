import {
  ensurePlatformKnowledgeSeeded,
  formatKnowledgeForPrompt,
  searchKnowledge,
} from './knowledge-rag.js'

/**
 * Compact UX rules injected into every layout generate / optimize / assist
 * call so the model still has skills when RAG is empty or not yet seeded.
 */
export const DESIGN_SKILL_BRIEF = `Apply these design skills on every layout-canvas tree:
- Node types ONLY: container | text | image | button. Never Motionsites or registry ids.
- Type: one H1, subheads smaller, body 16–18px, line-height 1.5–1.7, tight tracking on large headlines.
- Spacing: 8px rhythm (8/16/24/32/48/64). Generous whitespace. Group related items.
- Hit targets: buttons min 44px height, padding 12–20px, cursor pointer.
- Contrast: dark on light or reverse; no grey-on-grey.
- Images: meaningful alt text.
- Hover: every button needs stylesHover (background, color, shadow, translateY).
- Artboard children: position absolute with left/top/width/height.
- Nested groups: flex or grid with gap.
- Motion: host already has Lenis + GSAP. Prefer CSS hover/transform. Do not invent Motionsites or Vanta block ids on freeform artboards.
- Composition: header strip + hero (headline, sub, CTA, optional image) + optional 3 feature cards unless asked otherwise.`

/** Retrieve product knowledge for a design prompt. Lexical only — skip embedding round-trips that compete with generation. */
export async function retrieveDesignKnowledge(
  query: string,
  tenantId?: string | null,
): Promise<string> {
  try {
    await ensurePlatformKnowledgeSeeded()
    const hits = await searchKnowledge(
      `${query} layout canvas typography spacing hover accessibility motion`,
      { tenantId, limit: 4, lexicalOnly: true },
    )
    return formatKnowledgeForPrompt(hits)
  } catch {
    return ''
  }
}
