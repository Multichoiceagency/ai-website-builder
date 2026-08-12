/**
 * AI Design optimize — rewrite a layout-canvas root only (no registry blocks).
 */
import {
  layoutCanvasPropsSchema,
  type LayoutContainerNode,
  type LayoutNode,
} from '@platform/schemas'
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

function lightOptimize(root: LayoutNode, instruction: string): LayoutContainerNode {
  const lower = instruction.toLowerCase()
  const tweakGap = lower.includes('space') || lower.includes('gap') || lower.includes('air')
  const tweakPad = lower.includes('pad') || lower.includes('margin')

  function walk(node: LayoutNode): LayoutNode {
    if (node.type === 'container') {
      const styles = { ...(node.styles ?? {}) }
      if (tweakGap && !styles.gap) styles.gap = '1.25rem'
      if (tweakPad && !styles.padding) styles.padding = '1.5rem'
      return {
        ...node,
        styles,
        children: (node.children ?? []).map(walk),
      }
    }
    if (node.type === 'text') {
      const styles = { ...(node.styles ?? {}) }
      if (lower.includes('larger') || lower.includes('bigger')) {
        styles.fontSize = styles.fontSize || '1.125rem'
      }
      return { ...node, styles }
    }
    return node
  }

  const next = walk(root)
  return layoutCanvasPropsSchema.parse({ root: next }).root as LayoutContainerNode
}

export async function optimizeDesignRoot(input: {
  root: LayoutNode
  instruction: string
}): Promise<{ root: LayoutContainerNode; model: string }> {
  const instruction = input.instruction.trim().slice(0, 2000) || 'Improve spacing, hierarchy, and readability.'

  if (!geminiApiKey()) {
    return { root: lightOptimize(input.root, instruction), model: 'design-heuristic' }
  }

  const model = resolveGeminiModel()
  const result = await generateGeminiContent({
    model,
    systemInstruction: `You optimize freeform website layout trees for a design canvas.
Return ONLY JSON: {"root":{...}} matching the input shape.
Node types: container | text | image | button. Preserve all node ids when possible.
Allowed style keys include position, left, top, width, height, zIndex, flex, colors, typography,
borders, boxShadow, overflow, rotate, fontFamily, textTransform, stylesHover.
NEVER invent Motionsites, registry block ids, or React components.
Improve spacing, visual hierarchy, and accessibility (alt text) per the instruction.
Use rich styles when helpful: paddingTop/Right/Bottom/Left, margin*, borderWidth/Style/Color,
borderRadius, boxShadow, overflow, fontFamily, textTransform, letterSpacing, rotate, stylesHover.`,
    userText: JSON.stringify({
      instruction,
      root: input.root,
    }).slice(0, 28_000),
    responseMimeType: 'application/json',
    maxOutputTokens: 8_192,
    thinking: 'off',
    timeoutMs: 60_000,
  })

  const parsed = stripToJson(result.text) as { root?: unknown }
  const validated = layoutCanvasPropsSchema.parse({ root: parsed.root ?? parsed })
  return { root: validated.root as LayoutContainerNode, model: `google:${model}` }
}
