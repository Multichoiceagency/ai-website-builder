/**
 * AI Design generate — build a full layout-canvas artboard from a prompt.
 * Never emits Motionsites / registry block ids (ADR-0003 freeform).
 */
import {
  createDesignArtboardRoot,
  createLayoutNode,
  insertLayoutNode,
  layoutCanvasPropsSchema,
  newLayoutNodeId,
  setLayoutNodeFrame,
  type LayoutContainerNode,
  type LayoutNode,
} from '@platform/schemas'
import { DESIGN_SKILL_BRIEF, retrieveDesignKnowledge } from './design-skills.js'
import { geminiApiKey, generateGeminiContent, resolveGeminiModel } from './providers/gemini-client.js'

function stripToJson(raw: string): unknown {
  const text = raw.trim()
  try {
    return JSON.parse(text)
  } catch {
    /* continue */
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim())
    } catch {
      /* continue */
    }
  }
  const brace = text.match(/\{[\s\S]*\}/)
  if (brace?.[0]) {
    try {
      return JSON.parse(brace[0])
    } catch {
      /* continue */
    }
  }
  throw new Error('Model did not return JSON.')
}

/** Deterministic fallback when no LLM key is configured. */
function heuristicArtboard(prompt: string): LayoutContainerNode {
  let root: LayoutContainerNode = createDesignArtboardRoot()
  const title = createLayoutNode('text')
  if (title.type !== 'text') throw new Error('expected text')
  title.content = prompt.trim().slice(0, 80) || 'New design'
  title.tag = 'h1'
  title.styles = {
    fontSize: '3rem',
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: '-0.03em',
    lineHeight: '1.1',
  }
  const subtitle = createLayoutNode('text')
  if (subtitle.type !== 'text') throw new Error('expected text')
  subtitle.content = 'Generated layout — edit styles in the inspector or refine with AI.'
  subtitle.styles = { fontSize: '1.125rem', color: '#334155', lineHeight: '1.65' }
  const cta = createLayoutNode('button')
  if (cta.type !== 'button') throw new Error('expected button')
  cta.label = 'Get started'
  cta.href = '#'
  cta.styles = {
    background: '#0f172a',
    color: '#fff',
    paddingTop: '12px',
    paddingRight: '20px',
    paddingBottom: '12px',
    paddingLeft: '20px',
    minHeight: '44px',
    borderRadius: '0.5rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
  }
  cta.stylesHover = {
    background: '#1e293b',
    transform: 'translateY(-1px)',
    boxShadow: '0 8px 20px rgba(15,23,42,0.18)',
  }

  root = insertLayoutNode(root, root.id, title) as LayoutContainerNode
  root = insertLayoutNode(root, root.id, subtitle) as LayoutContainerNode
  root = insertLayoutNode(root, root.id, cta) as LayoutContainerNode

  const kids = root.children ?? []
  if (kids[0]) {
    root = setLayoutNodeFrame(root, kids[0].id, {
      left: '80px',
      top: '120px',
      width: '640px',
      height: '80px',
    }) as LayoutContainerNode
  }
  if (kids[1]) {
    root = setLayoutNodeFrame(root, kids[1].id, {
      left: '80px',
      top: '220px',
      width: '520px',
      height: '60px',
    }) as LayoutContainerNode
  }
  if (kids[2]) {
    root = setLayoutNodeFrame(root, kids[2].id, {
      left: '80px',
      top: '320px',
      width: '160px',
      height: '48px',
    }) as LayoutContainerNode
  }

  root = {
    ...root,
    styles: {
      ...(root.styles ?? {}),
      background: '#f8fafc',
      minHeight: '900px',
      width: '1440px',
      position: 'relative',
    },
  }

  return layoutCanvasPropsSchema.parse({ root }).root as LayoutContainerNode
}

const STYLE_VOCAB = `Style vocabulary (use freely):
- spacing: padding, paddingTop/Right/Bottom/Left, margin, marginTop/Right/Bottom/Left
- box: width, height, min/max Width/Height, background, opacity, borderRadius (+ per-corner),
  borderWidth, borderStyle (none|solid|dashed|dotted), borderColor, boxShadow,
  overflow/overflowX/Y, cursor, rotate (e.g. "8deg"), visibility, locked
- layout (containers): display flex|grid|block, flexDirection, flexWrap, justifyContent,
  alignItems, gap, rowGap, columnGap, gridTemplateColumns/Rows, flexGrow/Shrink, alignSelf
- position: position relative|absolute, left, top, right, bottom, zIndex
- typography (text/button): fontFamily, fontSize, fontWeight, lineHeight, letterSpacing,
  textAlign, textTransform, color
- image: objectFit
- hover: stylesHover { background, color, borderColor, borderWidth, boxShadow, opacity, transform }
Prefer absolute frames on artboard children (left/top/width/height + position:absolute).`

export async function generateDesignRoot(input: {
  prompt: string
  /** Optional existing artboard to replace; ids may be reused. */
  currentRoot?: LayoutNode
}): Promise<{ root: LayoutContainerNode; model: string }> {
  const prompt = input.prompt.trim().slice(0, 4_000)
  if (!prompt) {
    throw new Error('Provide a design prompt.')
  }

  if (!geminiApiKey()) {
    return { root: heuristicArtboard(prompt), model: 'design-heuristic' }
  }

  const model = resolveGeminiModel()
  const artboardId = input.currentRoot?.id ?? newLayoutNodeId()
  const knowledge = await retrieveDesignKnowledge(prompt)

  try {
    const result = await generateGeminiContent({
      model,
      systemInstruction: `You generate freeform website layout trees for a Design artboard.
Return ONLY JSON: {"root":{...}} where root.type is "container".
Node types ONLY: container | text | image | button.
Root id must be "${artboardId}". Generate fresh unique ids for children.
NEVER invent Motionsites, registry block ids, React, or HTML strings as nodes.
Build a polished single-viewport composition matching the prompt.
${DESIGN_SKILL_BRIEF}

${STYLE_VOCAB}
${knowledge ? `\n${knowledge}` : ''}`,
      userText: JSON.stringify({
        prompt,
        hint: input.currentRoot
          ? { previousRootId: input.currentRoot.id, childCount: (input.currentRoot as LayoutContainerNode).children?.length }
          : undefined,
      }).slice(0, 12_000),
      responseMimeType: 'application/json',
      maxOutputTokens: 8_192,
      thinking: 'off',
      timeoutMs: 28_000,
      maxAttempts: 1,
    })

    const parsed = stripToJson(result.text) as { root?: unknown }
    const validated = layoutCanvasPropsSchema.parse({ root: parsed.root ?? parsed })
    const root = { ...validated.root, id: artboardId } as LayoutContainerNode
    return { root: layoutCanvasPropsSchema.parse({ root }).root as LayoutContainerNode, model: `google:${model}` }
  } catch (error) {
    console.warn('design generate fell back to heuristic:', error)
    return { root: heuristicArtboard(prompt), model: 'design-heuristic' }
  }
}
