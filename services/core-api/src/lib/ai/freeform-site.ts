import { createSection } from '@platform/blocks'
import {
  LAYOUT_CANVAS_BLOCK_ID,
  createLayoutNode,
  insertLayoutNode,
  layoutCanvasPropsSchema,
  type LayoutContainerNode,
  type LayoutNode,
  type Section,
} from '@platform/schemas'
import { DESIGN_SKILL_BRIEF, retrieveDesignKnowledge } from './design-skills.js'
import { geminiApiKey, generateGeminiContent, resolveGeminiModel } from './providers/gemini-client.js'

/**
 * AI Freeform site builder — pages are only `layout-canvas-01` trees.
 * Never Motionsites / registry heroes (ADR-0003 data trees only).
 */

export interface FreeformPageDraft {
  path: string
  title: string
  description: string
  root: LayoutContainerNode
}

export interface FreeformSiteDraft {
  siteName: string
  locale: string
  pages: FreeformPageDraft[]
  navigation: { label: string; href: string }[]
  model: string
}

type TextTag = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'span'

function textNode(content: string, tag: TextTag = 'p'): LayoutNode {
  const node = createLayoutNode('text')
  if (node.type !== 'text') return node
  const styles =
    tag === 'h1'
      ? { fontSize: '3rem', fontWeight: '700', letterSpacing: '-0.03em', lineHeight: '1.1', color: '#0f172a' }
      : tag === 'h2'
        ? { fontSize: '1.75rem', fontWeight: '600', letterSpacing: '-0.02em', lineHeight: '1.25', color: '#0f172a' }
        : tag === 'h3'
          ? { fontSize: '1.125rem', fontWeight: '600', lineHeight: '1.35', color: '#0f172a' }
          : { fontSize: '1.125rem', lineHeight: '1.65', color: '#334155' }
  return { ...node, content, tag, styles }
}

function buttonNode(label: string, href: string): LayoutNode {
  const node = createLayoutNode('button')
  if (node.type !== 'button') return node
  return {
    ...node,
    label,
    href,
    styles: {
      background: '#0f172a',
      color: '#ffffff',
      paddingTop: '12px',
      paddingRight: '20px',
      paddingBottom: '12px',
      paddingLeft: '20px',
      minHeight: '44px',
      borderRadius: '0.5rem',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '1rem',
      alignSelf: 'flex-start',
    },
    stylesHover: {
      background: '#1e293b',
      transform: 'translateY(-1px)',
      boxShadow: '0 8px 20px rgba(15,23,42,0.18)',
    },
  }
}

function row(...children: LayoutNode[]): LayoutContainerNode {
  const node = createLayoutNode('container') as LayoutContainerNode
  return {
    ...node,
    styles: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: '1.5rem',
      alignItems: 'stretch',
      width: '100%',
    },
    children,
  }
}

function column(...children: LayoutNode[]): LayoutContainerNode {
  const node = createLayoutNode('container') as LayoutContainerNode
  return {
    ...node,
    styles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      width: '100%',
      padding: '1.5rem',
    },
    children,
  }
}

function card(title: string, body: string): LayoutContainerNode {
  return column(textNode(title, 'h3'), textNode(body, 'p'))
}

function buildHomeRoot(input: {
  brand: string
  headline: string
  subhead: string
  cta: string
  features: { title: string; body: string }[]
}): LayoutContainerNode {
  const root = column(
    textNode(input.brand, 'h1'),
    textNode(input.headline, 'h2'),
    textNode(input.subhead, 'p'),
    buttonNode(input.cta, '/contact'),
  )
  const styledRoot: LayoutContainerNode = {
    ...root,
    styles: {
      ...root.styles,
      gap: '1.25rem',
      padding: '2.5rem 1.5rem',
      minHeight: '16rem',
      background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 55%)',
    },
  }

  const featureCards = input.features.map((feature) => {
    const box = card(feature.title, feature.body)
    return {
      ...box,
      styles: {
        ...box.styles,
        flexGrow: 1,
        minWidth: '14rem',
        background: '#ffffff',
        borderRadius: '0.75rem',
        padding: '1.25rem',
      },
    }
  })

  return insertLayoutNode(styledRoot, styledRoot.id, row(...featureCards)) as LayoutContainerNode
}

function buildSimplePage(title: string, paragraphs: string[]): LayoutContainerNode {
  return column(textNode(title, 'h1'), ...paragraphs.map((p) => textNode(p, 'p')))
}

function inferBrand(prompt: string, siteName?: string): string {
  if (siteName?.trim()) return siteName.trim().slice(0, 80)
  const cleaned = prompt.replace(/\s+/g, ' ').trim()
  const match = cleaned.match(/(?:for|called|named)\s+([A-Z][\w\s&'-]{1,40})/)
  if (match?.[1]) return match[1].trim()
  return cleaned.split(/[.!?]/)[0]?.slice(0, 48).trim() || 'My Business'
}

function defaultFeatures(prompt: string): { title: string; body: string }[] {
  const lower = prompt.toLowerCase()
  if (lower.includes('fitness') || lower.includes('gym') || lower.includes('workout')) {
    return [
      { title: 'Personal coaching', body: 'Programs tailored to your goals and schedule.' },
      { title: 'Group classes', body: 'Energy, community, and results that stick.' },
      { title: 'Open late', body: 'Train when it suits you — early or after work.' },
    ]
  }
  if (lower.includes('bakery') || lower.includes('bakker') || lower.includes('bread')) {
    return [
      { title: 'Fresh daily', body: 'Baked every morning with local ingredients.' },
      { title: 'Custom cakes', body: 'Celebrate with something made for you.' },
      { title: 'Warm welcome', body: 'Coffee, pastry, and a seat by the window.' },
    ]
  }
  return [
    { title: 'What we do', body: 'Clear services you can book with confidence.' },
    { title: 'Why us', body: 'Friendly experts who keep things simple.' },
    { title: 'Get in touch', body: 'Tell us what you need — we reply quickly.' },
  ]
}

/**
 * Build a freeform multi-page draft from a brief. Uses Gemini for copy when
 * configured; otherwise deterministic copy from the prompt.
 */
export async function draftFreeformSite(input: {
  prompt: string
  locale?: string
  siteName?: string
}): Promise<FreeformSiteDraft> {
  const brand = inferBrand(input.prompt, input.siteName)
  const locale = input.locale === 'en' ? 'en' : 'nl'
  let model = 'freeform-template'
  let headline = locale === 'en' ? `Welcome to ${brand}` : `Welkom bij ${brand}`
  let subhead = input.prompt.replace(/\s+/g, ' ').trim().slice(0, 220)
  let cta = locale === 'en' ? 'Get started' : 'Aan de slag'
  let about =
    locale === 'en'
      ? `${brand} helps customers with exactly what you described.`
      : `${brand} helpt klanten met precies wat je beschreef.`
  let contact =
    locale === 'en'
      ? 'Call or message us — we are happy to help.'
      : 'Bel of mail ons — we helpen je graag.'

  if (geminiApiKey()) {
    try {
      const knowledge = await retrieveDesignKnowledge(input.prompt)
      const result = await generateGeminiContent({
        model: resolveGeminiModel(),
        systemInstruction: [
          'You write short website copy as JSON only. Keys: headline, subhead, cta, about, contact. No markdown.',
          DESIGN_SKILL_BRIEF,
          knowledge,
        ]
          .filter(Boolean)
          .join('\n\n')
          .slice(0, 6_000),
        userText: `Locale: ${locale}. Brand: ${brand}. Brief: ${input.prompt.slice(0, 1200)}`,
        responseMimeType: 'application/json',
        maxOutputTokens: 600,
        thinking: 'off',
        timeoutMs: 20_000,
        maxAttempts: 1,
      })
      const parsed = JSON.parse(result.text) as Record<string, string>
      if (parsed.headline) headline = String(parsed.headline).slice(0, 120)
      if (parsed.subhead) subhead = String(parsed.subhead).slice(0, 240)
      if (parsed.cta) cta = String(parsed.cta).slice(0, 40)
      if (parsed.about) about = String(parsed.about).slice(0, 400)
      if (parsed.contact) contact = String(parsed.contact).slice(0, 240)
      model = resolveGeminiModel()
    } catch {
      // Fall back to template copy.
    }
  }

  const features = defaultFeatures(input.prompt)
  const home = buildHomeRoot({ brand, headline, subhead, cta, features })
  const aboutPage = buildSimplePage(locale === 'en' ? 'About' : 'Over ons', [about])
  const contactPage = buildSimplePage('Contact', [contact, cta])

  for (const root of [home, aboutPage, contactPage]) {
    layoutCanvasPropsSchema.parse({ root })
  }

  return {
    siteName: brand,
    locale,
    model,
    navigation: [
      { label: 'Home', href: '/' },
      { label: locale === 'en' ? 'About' : 'Over ons', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
    pages: [
      {
        path: '/',
        title: 'Home',
        description: subhead.slice(0, 160),
        root: home,
      },
      {
        path: '/about',
        title: locale === 'en' ? 'About' : 'Over ons',
        description: about.slice(0, 160),
        root: aboutPage,
      },
      {
        path: '/contact',
        title: 'Contact',
        description: contact.slice(0, 160),
        root: contactPage,
      },
    ],
  }
}

export function sectionsFromFreeformRoot(root: LayoutContainerNode): Section[] {
  return [createSection(LAYOUT_CANVAS_BLOCK_ID, { root })]
}
