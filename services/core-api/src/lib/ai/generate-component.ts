import { createSection, normalizeDocument } from '@platform/blocks'
import {
  COMPONENT_TARGET_LABELS,
  componentTargetAssignmentSchema,
  componentTargetsMapSchema,
  themeSchema,
  type ComponentTarget,
  type ComponentTargetAssignment,
  type GenerateComponentResult,
  type Section,
  type Theme,
} from '@platform/schemas'
import { MOTIONSITES_ISLAND_HEADER_BLOCK } from '@platform/templates'
import { withTenant } from '../../db/client.js'
import {
  findAssetByFingerprint,
  insertAsset,
} from '../../db/repositories/assets.js'
import { findPageById, updatePage } from '../../db/repositories/pages.js'
import { findSiteById, updateSite } from '../../db/repositories/sites.js'
import { derivePerformanceClass, fingerprintSections } from '../assets.js'
import { describeReferenceImage, type ReferenceMode } from './describe-reference-image.js'
import { generateLiveIsland, slugifyIslandId } from './generate-live-island.js'

/**
 * Full components generator — extends Motionsites generate-live + assets.
 *
 * Flow:
 * 1. Optional reference image → Gemini vision summary (or URL/path text fallback)
 * 2. Enrich brief for the system target (product card, header, …)
 * 3. `theme` target → merge suggested colours into site theme tokens
 * 4. Otherwise → generate-live island → ADR-0003 sections (`motion-section-01`)
 * 5. Persist assignment on `site.componentTargets`, optional workspace asset + page append
 */

export interface GenerateComponentParams {
  tenantId: string
  userEmail: string
  siteId: string
  brief: string
  target: ComponentTarget
  title?: string
  referenceImage?: string
  pageId?: string
  saveAsset?: boolean
  assign?: boolean
  /** Tests / dry-run. */
  skipBuild?: boolean
}

function targetBriefPreamble(target: ComponentTarget, title: string): string {
  const label = COMPONENT_TARGET_LABELS[target]
  switch (target) {
    case 'product-card':
      return [
        `Build a self-contained **product card** UX component titled “${title}”.`,
        'Single card (not a full page): image, title, price, optional compare-at, primary CTA.',
        'Use React + Tailwind + lucide-react; framer-motion for subtle hover/entrance only.',
        'Theme colours via Tailwind utilities; no third-party asset URLs.',
        'Default export a component that fills its container (not min-h-screen).',
      ].join('\n')
    case 'header':
      return [
        `Build a custom **site header / navigation** titled “${title}”.`,
        'Sticky or fixed chrome: brand/logo, nav links, one CTA; mobile menu via useState.',
        'Glass / liquid or solid treatments are fine; keep it production-ready.',
        'Default export fills width; height auto — not a full-viewport hero.',
      ].join('\n')
    case 'footer':
      return [
        `Build a **footer** section titled “${title}”.`,
        'Columns for links, brand blurb, legal line; responsive stack on mobile.',
      ].join('\n')
    case 'hero':
      return [
        `Build a cinematic **hero** section titled “${title}”.`,
        'Headline, supporting line, CTA(s), optional media stage; full-bleed composition.',
      ].join('\n')
    case 'theme':
      return `Extract a cohesive colour system for “${title}” from the brief and reference.`
    case 'section':
    case 'custom':
    default:
      return [
        `Build a Motionsites-style **${label.toLowerCase()}** titled “${title}”.`,
        'Single-file React + Tailwind + lucide-react; optional framer-motion/gsap.',
        'No third-party CDN assets; theme-friendly colours.',
      ].join('\n')
  }
}

function buildEnrichedBrief(input: {
  target: ComponentTarget
  title: string
  brief: string
  referenceSummary: string
}): string {
  const parts = [
    targetBriefPreamble(input.target, input.title),
    '',
    '## User brief',
    input.brief.trim(),
  ]
  if (input.referenceSummary.trim()) {
    parts.push('', '## Reference image analysis', input.referenceSummary.trim())
  }
  parts.push(
    '',
    '## Output contract',
    'Start with /*DEPENDENCIES:{"packages":[...]} */ then executable React with default export.',
  )
  return parts.join('\n')
}

function islandSections(sectionId: string, title: string, target: ComponentTarget): Section[] {
  const minHeight = target === 'product-card' || target === 'header' ? 'auto' : '100vh'
  const sections: Section[] = []

  if (target === 'header' || target === 'hero' || target === 'section') {
    // Brand chrome beside full sections; skip for compact product cards.
    if (target !== 'header') {
      sections.push(
        createSection(MOTIONSITES_ISLAND_HEADER_BLOCK, {
          brand: title,
          trademark: true,
        }),
      )
    }
  }

  sections.push(
    createSection('motion-section-01', {
      sectionId,
      title,
      minHeight,
    }),
  )
  return sections
}

function applyThemeSuggestions(
  theme: Theme,
  colors: Partial<{
    colorPrimary: string
    colorAccent: string
    colorSurface: string
    colorText: string
  }>,
): Theme {
  const patch: Record<string, string> = {}
  if (colors.colorPrimary) patch.colorPrimary = colors.colorPrimary
  if (colors.colorAccent) patch.colorAccent = colors.colorAccent
  if (colors.colorSurface) patch.colorSurface = colors.colorSurface
  if (colors.colorText) patch.colorText = colors.colorText
  return themeSchema.parse({ ...theme, ...patch })
}

export async function generateComponent(
  params: GenerateComponentParams,
): Promise<GenerateComponentResult> {
  const title =
    params.title?.trim() ||
    `${COMPONENT_TARGET_LABELS[params.target]} ${new Date().toISOString().slice(0, 10)}`
  const saveAsset = params.saveAsset !== false
  const assign = params.assign !== false
  const errors: string[] = []

  const site = await withTenant(params.tenantId, (tx) =>
    findSiteById(tx, params.tenantId, params.siteId),
  )
  if (!site) {
    return {
      ok: false,
      target: params.target,
      title,
      sectionId: null,
      sections: [],
      assignment: null,
      assetId: null,
      pageId: null,
      model: 'none',
      referenceMode: 'none',
      referenceSummary: '',
      themePatch: null,
      errors: ['Site not found'],
      note: 'Provide a valid siteId.',
    }
  }

  const reference = await describeReferenceImage(
    params.referenceImage,
    `${params.target}: ${params.brief.slice(0, 200)}`,
  )
  const referenceMode: ReferenceMode = reference.mode

  // Theme slot: design tokens only — no island codegen.
  if (params.target === 'theme') {
    const nextTheme = applyThemeSuggestions(site.theme, reference.suggestedColors)
    const themeChanged = JSON.stringify(nextTheme) !== JSON.stringify(site.theme)
    const assignment = componentTargetAssignmentSchema.parse({
      target: 'theme',
      block: 'theme-tokens',
      props: {
        colorPrimary: nextTheme.colorPrimary,
        colorAccent: nextTheme.colorAccent,
        colorSurface: nextTheme.colorSurface,
        colorText: nextTheme.colorText,
      },
      title,
      brief: params.brief.slice(0, 500),
      referenceImage: params.referenceImage?.slice(0, 2048),
      updatedAt: new Date().toISOString(),
    })

    if (assign) {
      const nextTargets = componentTargetsMapSchema.parse({
        ...site.componentTargets,
        theme: assignment,
      })
      await withTenant(params.tenantId, (tx) =>
        updateSite(tx, params.tenantId, site.id, {
          ...(themeChanged ? { theme: nextTheme } : {}),
          componentTargets: nextTargets,
        }),
      )
    }

    return {
      ok: true,
      target: 'theme',
      title,
      sectionId: null,
      sections: [],
      assignment: assign ? assignment : null,
      assetId: null,
      pageId: null,
      model: reference.mode === 'vision' ? 'google:vision' : 'theme-fallback',
      referenceMode,
      referenceSummary: reference.summary,
      themePatch: themeChanged
        ? {
            colorPrimary: nextTheme.colorPrimary,
            colorAccent: nextTheme.colorAccent,
            colorSurface: nextTheme.colorSurface,
            colorText: nextTheme.colorText,
          }
        : null,
      errors:
        themeChanged
          ? []
          : [
              reference.mode === 'none'
                ? 'No reference image or colours to apply — attach a screenshot or name hex colours in the brief.'
                : 'Could not extract colours; theme left unchanged.',
            ],
      note: 'Theme target updates design tokens only (ADR-0003) — no page sections.',
    }
  }

  const enrichedBrief = buildEnrichedBrief({
    target: params.target,
    title,
    brief: params.brief,
    referenceSummary: reference.summary,
  })

  const islandId = slugifyIslandId(
    `gen-${params.target}-${title}`.slice(0, 80),
  )

  const live = await generateLiveIsland({
    brief: enrichedBrief,
    templateId: islandId,
    title,
    previewImage: params.referenceImage?.startsWith('data:')
      ? undefined
      : params.referenceImage?.slice(0, 500),
    skipBuild: params.skipBuild,
  })

  if (!live.ok) {
    return {
      ok: false,
      target: params.target,
      title,
      sectionId: live.sectionId || null,
      sections: [],
      assignment: null,
      assetId: null,
      pageId: null,
      model: live.model,
      referenceMode,
      referenceSummary: reference.summary,
      themePatch: null,
      errors: live.errors,
      note: 'Codegen failed — fix the brief or configure GEMINI_API_KEY / ANTHROPIC_API_KEY.',
    }
  }

  const sections = islandSections(live.sectionId, title, params.target)
  const normalized = normalizeDocument(sections)

  let assetId: string | null = null
  if (saveAsset) {
    try {
      const fingerprint = fingerprintSections(normalized)
      assetId = await withTenant(params.tenantId, async (tx) => {
        const existing = await findAssetByFingerprint(tx, params.tenantId, fingerprint)
        if (existing) return existing.id
        const created = await insertAsset(tx, {
          tenantId: params.tenantId,
          name: title.slice(0, 120),
          description: `Generated ${COMPONENT_TARGET_LABELS[params.target]} — Motionsites island`,
          collection: params.target === 'product-card' ? 'conversion' : params.target === 'header' ? 'navigation' : params.target === 'footer' ? 'footer' : params.target === 'hero' ? 'hero' : 'utility',
          tags: ['generated', `target:${params.target}`, live.sectionId],
          sections: normalized,
          performanceClass: derivePerformanceClass(normalized),
          licence: 'platform-owned',
          attribution: '',
          source: { library: '', demo: '', url: '', derivation: 'none' },
          fingerprint,
          createdBy: params.userEmail,
        })
        return created.id
      })
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Could not save workspace asset')
    }
  }

  const assignment: ComponentTargetAssignment = componentTargetAssignmentSchema.parse({
    target: params.target,
    block: 'motion-section-01',
    props: {
      sectionId: live.sectionId,
      title,
      minHeight: params.target === 'product-card' || params.target === 'header' ? 'auto' : '100vh',
    },
    sectionId: live.sectionId,
    assetId: assetId ?? undefined,
    title,
    brief: params.brief.slice(0, 500),
    referenceImage: params.referenceImage?.startsWith('data:')
      ? undefined
      : params.referenceImage?.slice(0, 2048),
    updatedAt: new Date().toISOString(),
  })

  if (assign) {
    const nextTargets = componentTargetsMapSchema.parse({
      ...site.componentTargets,
      [params.target]: assignment,
    })
    await withTenant(params.tenantId, (tx) =>
      updateSite(tx, params.tenantId, site.id, { componentTargets: nextTargets }),
    )
  }

  let pageId: string | null = null
  if (params.pageId) {
    try {
      await withTenant(params.tenantId, async (tx) => {
        const page = await findPageById(tx, params.tenantId, params.pageId!)
        if (!page || page.siteId !== site.id) {
          errors.push('Page not found on this site')
          return
        }
        await updatePage(tx, params.tenantId, page.id, {
          sections: [...page.sections, ...normalized],
        })
        pageId = page.id
      })
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Could not append to page')
    }
  }

  return {
    ok: true,
    target: params.target,
    title,
    sectionId: live.sectionId,
    sections: normalized.map((section) => ({
      id: section.id,
      block: section.block,
      props: section.props as Record<string, unknown>,
      motion: section.motion as Record<string, unknown> | undefined,
    })),
    assignment: assign ? assignment : null,
    assetId,
    pageId,
    model: live.model,
    referenceMode,
    referenceSummary: reference.summary,
    themePatch: null,
    errors: [...errors, ...live.errors],
    note: 'Assigned as motion-section-01 + sectionId (ADR-0003). React source lives in the Motionsites island package, not page JSON.',
  }
}
