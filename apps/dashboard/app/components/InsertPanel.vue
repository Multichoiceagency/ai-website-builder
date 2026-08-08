<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { createSection, listBlockMetadata } from '@platform/blocks'
import {
  brandFromIslandId,
  detectExactIslandIntent,
  isMotionsitesCodegenBrief,
  MOTIONSITES_ISLAND_HEADER_BLOCK,
} from '@platform/templates'
import {
  BLOCK_CATEGORIES,
  type BlockCategory,
  type GenerateComponentResult,
  type MotionBackground,
  type RegistryBlockMetadata,
  type Section,
  type SiteTemplate,
  type TemplateCollection,
  type TemplateMotionType,
  type Theme,
} from '@platform/schemas'
import {
  LIBRARY_DRAG_MIME,
  type LibraryDragPayload,
} from '../utils/library-drag'
import { EMPTY_LAYOUT_BLOCK_IDS, MOTION_TOOL_BLOCK_IDS } from '../utils/catalog-split'

/**
 * The insert panel: a slide-over that adds sections without hiding the page.
 *
 * Layout mirrors a Shadcn Space block browser — sticky category rail on the
 * left, large variation cards on the right — so browsing by kind (hero,
 * features, …) is the primary path rather than by style collection.
 *
 * Three tabs, one action. *Sections* is the block registry (ADR-0003).
 * *Templates* expands a site-template recipe — or runs the exact Motionsites
 * source prompt when one exists. *Backgrounds* drop a seed hero with the
 * Motionsites preview media on the page (no Ask-AI detour).
 */
const props = withDefaults(
  defineProps<{
    /** The site's rendering budget. Nothing heavier can be inserted from here. */
    maxPerformanceClass?: 'A' | 'B' | 'C' | 'D'
    /**
     * The site's theme, so a template's miniature is painted in the customer's
     * own colours and type rather than in a generic default.
     */
    theme?: Theme | null
    /** Mirrors `page:write`. Hides save / insert affordances when false. */
    canWrite?: boolean
    /** Active site — required for the components generator assignment. */
    siteId?: string | null
    /** Current page — optional append target for generated sections. */
    pageId?: string | null
  }>(),
  { maxPerformanceClass: 'D', theme: null, canWrite: false, siteId: null, pageId: null },
)

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  insert: [
    payload: {
      blockIds: string[]
      source: 'block' | 'template'
      templateId?: string
      /** MotionSites motion character — applied as section entrance recipes. */
      motionTypes?: TemplateMotionType[]
    },
  ]
  /** Whole asset / library recipe — ids already fresh, props preserved. */
  'insert-sections': [sections: Section[]]
  /**
   * Close Add, stage Motionsites on the canvas with a generating animation,
   * then insert the exact island or finish live codegen.
   */
  'generate-motion': [
    payload: {
      mode: 'exact' | 'live'
      templateId: string
      title: string
      brief?: string
      previewImage?: string
      previewVideo?: string
    },
  ]
  /**
   * Insert a seed block (optional) then open section AI with a MotionSites
   * rebuild prompt — backgrounds / section briefs never ship third-party media.
   */
  'rebuild-ai': [
    payload: {
      instruction: string
      blockIds?: string[]
      motionTypes?: TemplateMotionType[]
      templateId?: string
      /** Same-origin `/motionsites/...` preview paths — applied as section media props. */
      previewImage?: string
      previewVideo?: string
      /**
       * When false, insert seed + media and stay on the canvas — do not open
       * Ask AI. Used for Motionsites backgrounds (atmosphere prompts are not
       * copy edits the section agent can apply).
       */
      openAi?: boolean
    },
  ]
}>()

const api = useApi()
const { asSiteTemplates: customTemplates, saveCustom } = useCustomTemplates()

/** Motionsites generate-live in flight (template id) — panel badge only. */
const generatingMotionId = ref<string | null>(null)
const motionGenerateError = ref('')
const generateComponentOpen = ref(false)

// region Focus and dismissal

/**
 * Focus handling is lifted verbatim from `UiDialog`: focus moves in on open,
 * Tab cycles inside the panel, Escape closes, and focus returns to whatever
 * opened it. The panel keeps `aria-modal` because a focus trap without it tells
 * assistive technology the page is reachable when the keyboard says otherwise.
 */
const panel = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Full-viewport browsing — search and scan without the side-panel width. */
const fullscreen = ref(false)

/** One search across sections, templates and backgrounds. */
const librarySearch = ref('')

function focusableElements(): HTMLElement[] {
  return panel.value ? [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)] : []
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (previewOpen.value) {
      previewOpen.value = false
      return
    }
    if (fullscreen.value) {
      fullscreen.value = false
      return
    }
    open.value = false
    return
  }

  if (event.key !== 'Tab') return

  const elements = focusableElements()
  if (elements.length === 0) {
    event.preventDefault()
    return
  }

  const first = elements[0]!
  const last = elements[elements.length - 1]!
  const active = document.activeElement

  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    previouslyFocused = document.activeElement as HTMLElement | null
    await nextTick()
    ;(focusableElements()[0] ?? panel.value)?.focus()
    return
  }

  fullscreen.value = false
  previouslyFocused?.focus()
  previouslyFocused = null
})

onBeforeUnmount(() => {
  previouslyFocused = null
})

// endregion

// region Shared

const tab = ref<'sections' | 'templates' | 'backgrounds'>('sections')
/** Platform registry blocks vs MotionSites / Shadcn Space / Magic UI / Studio recipes. */
const sectionSource = ref<'platform' | 'motionsites' | 'shadcnspace' | 'magicui' | 'studio'>('platform')

/**
 * The one card currently under the pointer or holding focus, across both tabs.
 * A single id rather than per-card state is the mechanism that guarantees only
 * one preview animates: forty timelines at once on a scrolling surface is how a
 * picker starts dropping frames.
 */
const activeCardId = ref<string | null>(null)

function activate(id: string) {
  activeCardId.value = id
}

function deactivate(id: string) {
  if (activeCardId.value === id) activeCardId.value = null
}

const CLASS_ORDER: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }
const ceiling = computed(() => CLASS_ORDER[props.maxPerformanceClass] ?? 3)

/** The registry, read once. Same source as the block picker and the lab. */
const registry = listBlockMetadata()
const byId = new Map(registry.map((block) => [block.id, block]))

/**
 * A stable one-element array per block, built once.
 *
 * `:block-ids="[block.id]"` in the template would hand the preview a fresh
 * array identity on every render and rebuild the miniature each time.
 */
const previewIds = new Map(registry.map((block) => [block.id, [block.id]]))

function toneFor(performanceClass: string) {
  if (performanceClass === 'A') return 'positive'
  if (performanceClass === 'B') return 'neutral'
  return 'warning'
}

function titleCase(value: string) {
  return value[0]!.toUpperCase() + value.slice(1)
}

/** Per-category ordinals, stable for titles like "Hero 01 — …". */
const categoryOrdinal = computed(() => {
  const map = new Map<string, number>()
  const counters = new Map<string, number>()
  for (const block of affordableBlocks.value) {
    const next = (counters.get(block.category) ?? 0) + 1
    counters.set(block.category, next)
    map.set(block.id, next)
  }
  return map
})

/** "Hero 01 — centred statement" — category ordinal + the block's short name. */
function variationTitle(block: RegistryBlockMetadata) {
  const ordinal = String(categoryOrdinal.value.get(block.id) ?? 1).padStart(2, '0')
  const dash = block.name.indexOf('—')
  const detail = dash >= 0 ? block.name.slice(dash + 1).trim() : block.name
  return `${titleCase(block.category)} ${ordinal} — ${detail}`
}

function setLibraryDrag(event: DragEvent, payload: LibraryDragPayload) {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData(LIBRARY_DRAG_MIME, JSON.stringify(payload))
  // Plain-text fallback helps some browsers show a drag ghost label.
  event.dataTransfer.setData('text/plain', payload.blockIds.join(', '))
  // A drag always ends in a click the browser still delivers — ignore that one.
  suppressCardClick = true
}

/** Set by dragstart; cleared by the synthetic click that follows a drag. */
let suppressCardClick = false

function onBlockCardClick(blockId: string) {
  if (suppressCardClick) {
    suppressCardClick = false
    return
  }
  insertBlock(blockId)
}

// endregion

// region Sections tab

const blockSearch = librarySearch
/** Pseudo-rail for always-available scroll / frame motion tools. */
const MOTION_TOOLS_RAIL = '__motion_tools__' as const
type SectionRailValue = '' | BlockCategory | typeof MOTION_TOOLS_RAIL
/** Empty string = All categories. */
const blockCategory = ref<SectionRailValue>('')

/**
 * Featured Motion tools (scrub) vs ceiling bypass pins.
 * `layout-canvas-01` (Empty section) is pinned so it stays insertable regardless of ceiling.
 */
const FEATURED_MOTION_TOOL_IDS = MOTION_TOOL_BLOCK_IDS
const PINNED_BLOCK_IDS = new Set<string>([...MOTION_TOOL_BLOCK_IDS, ...EMPTY_LAYOUT_BLOCK_IDS])
const FEATURED_MOTION_ID_SET = new Set<string>(MOTION_TOOL_BLOCK_IDS)

function blockSearchHaystack(block: RegistryBlockMetadata) {
  return `${block.id} ${block.name} ${block.description} ${block.capabilities.join(' ')} ${block.tags.join(' ')} ${block.category}`
}

/** Featured motion tools pinned at the top of the platform / Motionsites lists. */
const featuredMotionTools = computed(() =>
  FEATURED_MOTION_TOOL_IDS.map((id) => byId.get(id)).filter(
    (block): block is RegistryBlockMetadata => Boolean(block),
  ),
)

/** Everything the budget allows, plus pinned motion tools, before facets. */
const affordableBlocks = computed(() =>
  registry.filter(
    (block) =>
      PINNED_BLOCK_IDS.has(block.id) || CLASS_ORDER[block.performanceClass]! <= ceiling.value,
  ),
)

const searchedBlocks = computed(() => {
  const term = blockSearch.value.trim().toLowerCase()
  if (!term) return affordableBlocks.value
  return affordableBlocks.value.filter((block) =>
    blockSearchHaystack(block).toLowerCase().includes(term),
  )
})

const categoryRail = computed(() => {
  const counts = new Map<string, number>()
  for (const block of searchedBlocks.value) {
    counts.set(block.category, (counts.get(block.category) ?? 0) + 1)
  }

  const term = blockSearch.value.trim()
  const motionToolHits = term
    ? featuredMotionTools.value.filter((block) =>
        blockSearchHaystack(block).toLowerCase().includes(term.toLowerCase()),
      )
    : featuredMotionTools.value

  return [
    { value: '' as const, label: 'All', count: searchedBlocks.value.length },
    {
      value: MOTION_TOOLS_RAIL,
      label: 'Motion tools',
      count: motionToolHits.length,
    },
    ...BLOCK_CATEGORIES.map((value) => ({
      value,
      label: titleCase(value),
      count: counts.get(value) ?? 0,
    })).filter((entry) => entry.count > 0 || !term),
  ]
})

const blockResults = computed<RegistryBlockMetadata[]>(() => {
  if (blockCategory.value === MOTION_TOOLS_RAIL) {
    const term = blockSearch.value.trim().toLowerCase()
    const tools = featuredMotionTools.value
    if (!term) return tools
    return tools.filter((block) => blockSearchHaystack(block).toLowerCase().includes(term))
  }
  const results = !blockCategory.value
    ? searchedBlocks.value
    : searchedBlocks.value.filter((block) => block.category === blockCategory.value)
  // All + no search: featured strip above already shows Motion tools — avoid duplicates.
  if (!blockCategory.value && !blockSearch.value.trim()) {
    return results.filter((block) => !FEATURED_MOTION_ID_SET.has(block.id))
  }
  if (blockCategory.value) return results
  const featured = featuredMotionTools.value.filter((block) =>
    results.some((entry) => entry.id === block.id),
  )
  const rest = results.filter((block) => !FEATURED_MOTION_ID_SET.has(block.id))
  return [...featured, ...rest]
})

/** How many sections the budget is hiding (pinned tools are not “hidden”). */
const hiddenByCeiling = computed(
  () =>
    registry.filter(
      (block) =>
        !PINNED_BLOCK_IDS.has(block.id) && CLASS_ORDER[block.performanceClass]! > ceiling.value,
    ).length,
)

const activeCategoryLabel = computed(() => {
  if (!blockCategory.value) return 'All sections'
  if (blockCategory.value === MOTION_TOOLS_RAIL) return 'Motion tools'
  return titleCase(blockCategory.value)
})

function insertBlock(blockId: string) {
  emit('insert', { blockIds: [blockId], source: 'block' })
  // Fullscreen is a dedicated browse mode — insert should land you back on the canvas.
  if (fullscreen.value) {
    fullscreen.value = false
    open.value = false
  }
}

function onBlockDragStart(event: DragEvent, block: RegistryBlockMetadata) {
  setLibraryDrag(event, {
    kind: 'insert-block',
    blockIds: [block.id],
  })
}

// region Fullscreen live preview

interface PreviewTarget {
  title: string
  description: string
  blockIds: string[]
  performanceLabel: string
  metaLines: string[]
  /** When set, Add inserts a template recipe rather than a single block. */
  templateId?: string
  motionTypes?: TemplateMotionType[]
}

const previewOpen = ref(false)
const previewTarget = ref<PreviewTarget | null>(null)

function openBlockPreview(block: RegistryBlockMetadata, event?: Event) {
  event?.stopPropagation()
  previewTarget.value = {
    title: block.name,
    description: block.description,
    blockIds: [block.id],
    performanceLabel: `Performance class ${block.performanceClass}`,
    metaLines: [
      block.id,
      `${block.fields.length} editable fields`,
      block.tags.length ? `Tags: ${block.tags.join(', ')}` : '',
      block.capabilities.length ? `Capabilities: ${block.capabilities.join(', ')}` : '',
    ].filter(Boolean),
  }
  previewOpen.value = true
}

function openTemplatePreview(
  entry: {
    template: SiteTemplate
    blocks: RegistryBlockMetadata[]
    blockIds: string[]
    tooHeavy: number
    missing: number
  },
  event?: Event,
) {
  event?.stopPropagation()
  previewTarget.value = {
    title: entry.template.title,
    description: entry.blocks.map((block) => block.name).join(' → '),
    blockIds: entry.blockIds,
    performanceLabel: sectionCountLabel(entry),
    metaLines: [
      entry.template.category,
      entry.tooHeavy
        ? `${entry.tooHeavy} section(s) exceed class ${props.maxPerformanceClass} and will not be added`
        : '',
      entry.missing ? `${entry.missing} section(s) in this recipe no longer exist` : '',
    ].filter(Boolean),
    templateId: entry.template.id,
    motionTypes: motionTypesForTemplate(entry),
  }
  previewOpen.value = true
}

function insertFromPreview() {
  const target = previewTarget.value
  if (!target?.blockIds.length) return

  // Library briefs with a source prompt rebuild — never dump a bare Vue recipe.
  if (target.templateId) {
    const entry = insertable.value.find((item) => item.template.id === target.templateId)
    if (entry?.template.islandReady) {
      addExactMotionIsland(entry)
      return
    }
    if (entry && entry.template.sourcePrompt?.trim()) {
      if (entry.template.id.startsWith('shadcnspace-')) {
        rebuildShadcnSection(entry)
        return
      }
      if (entry.template.id.startsWith('magicui-')) {
        rebuildMagicUiSection(entry)
        return
      }
      if (entry.template.id.startsWith('studio-')) {
        rebuildStudioSection(entry)
        return
      }
      startMotionRebuild(entry)
      return
    }
  }

  emit('insert', {
    blockIds: target.blockIds,
    source: target.templateId ? 'template' : 'block',
    templateId: target.templateId,
    motionTypes: target.motionTypes,
  })
  closeAfterInsert()
}

function duplicateFromPreview() {
  insertFromPreview()
}

// endregion

// region Templates tab

const templateSearch = librarySearch
/** Empty = all collections. */
const templateCollection = ref('')

// Lazy and unawaited: the panel mounts inside an already-hydrated editor, and
// an async `setup` there would re-suspend the page and blank the canvas.
const { data: templateCollections } = useAsyncData(
  'insert-panel:template-collections',
  () => api.get<TemplateCollection[]>('/api/v1/templates/collections'),
  { lazy: true, default: () => [] as TemplateCollection[] },
)

const { data: catalogTemplates, status: templateStatus, error: templateError } = useAsyncData(
  'insert-panel:templates',
  () => api.get<SiteTemplate[]>('/api/v1/templates', { limit: 500 }),
  { lazy: true, default: () => [] as SiteTemplate[] },
)

/** Catalogue + browser-local custom prompts from fullscreen “Generate with AI”. */
const allTemplates = computed(() => [
  ...(customTemplates.value ?? []),
  ...(catalogTemplates.value ?? []),
])

interface InsertableTemplate {
  template: SiteTemplate
  /** Recipe entries that exist in the registry *and* fit the budget. */
  blocks: RegistryBlockMetadata[]
  /**
   * The same list as ids, computed once. The preview watches this by identity,
   * so deriving it in the template would rebuild every miniature on each render.
   */
  blockIds: string[]
  /** Recipe entries dropped because they are heavier than the site allows. */
  tooHeavy: number
  /** Recipe entries that no longer exist in the registry at all. */
  missing: number
}

/**
 * Resolve every recipe against the registry and the budget once, so the card,
 * its warning and the eventual insert all describe the same list. A template
 * left with nothing to add is not shown — an insert that inserts nothing is not
 * an action worth offering.
 */
const insertable = computed<InsertableTemplate[]>(() =>
  (allTemplates.value ?? [])
    .map((template) => {
      if (template.islandReady) {
        const island = byId.get('motion-section-01')
        // Class D islands are an explicit MotionSites insert — offer even when
        // the site budget is A–C (not AI-planned).
        const force = island ? [island] : []
        return {
          template,
          blocks: force,
          blockIds: force.map((block) => block.id),
          tooHeavy: 0,
          missing: island ? 0 : 1,
        }
      }

      const resolved = template.blockRecipe.map((id) => byId.get(id))
      const known = resolved.filter((block): block is RegistryBlockMetadata => Boolean(block))
      let blocks = known.filter((block) => CLASS_ORDER[block.performanceClass]! <= ceiling.value)

      // Dropbox entries without a mapped recipe still need a seed hero so
      // Rebuild with AI / insert remain available (same pattern as backgrounds).
      if (!blocks.length && template.sourcePrompt?.trim()) {
        const seed =
          byId.get('hero-cover-statement-01') ?? byId.get('hero-aurora-01') ?? null
        if (seed && CLASS_ORDER[seed.performanceClass]! <= ceiling.value) {
          blocks = [seed]
        }
      }

      // Motionsites / library previews often ship a looping video. Prefer a seed
      // that can display it — never leave a typography-only mask hero blank.
      if (template.previewVideo?.trim() && blocks.length) {
        const showsMedia = (block: RegistryBlockMetadata) =>
          block.capabilities.includes('image')
          || block.fields.some((field) => field.key === 'video' || field.key === 'image')
        if (!blocks.some(showsMedia)) {
          const mediaSeed = byId.get('hero-cover-statement-01')
          if (mediaSeed && CLASS_ORDER[mediaSeed.performanceClass]! <= ceiling.value) {
            blocks = [mediaSeed]
          }
        }
      }

      return {
        template,
        blocks,
        blockIds: blocks.map((block) => block.id),
        tooHeavy: known.length - blocks.length,
        missing: resolved.length - known.length,
      }
    })
    .filter((entry) => entry.blocks.length > 0),
)

const searchedTemplates = computed(() => {
  const term = templateSearch.value.trim().toLowerCase()
  if (!term) return insertable.value
  return insertable.value.filter((entry) =>
    `${entry.template.title} ${entry.template.category} ${entry.template.style.join(' ')} ${entry.template.motionType.join(' ')}`
      .toLowerCase()
      .includes(term),
  )
})

const templateRail = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of searchedTemplates.value) {
    const id = entry.template.collection
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  return [
    { value: '', label: 'All', count: searchedTemplates.value.length },
    ...(templateCollections.value ?? [])
      .map((entry) => ({
        value: entry.id,
        label: entry.label,
        count: counts.get(entry.id) ?? 0,
      }))
      .filter((entry) => entry.count > 0 || !templateSearch.value.trim()),
  ]
})

const templateResults = computed(() => {
  if (!templateCollection.value) return searchedTemplates.value
  return searchedTemplates.value.filter((entry) => entry.template.collection === templateCollection.value)
})

/**
 * MotionSites / Framer-style entrance for every template insert.
 * `static`-only recipes still get a fade-up so the canvas feels alive.
 */
function motionTypesForTemplate(entry: InsertableTemplate): TemplateMotionType[] {
  const types = [...entry.template.motionType]
  if (!types.length || (types.length === 1 && types[0] === 'static')) {
    return ['entrance', 'scroll-reveal']
  }
  if (!types.includes('entrance') && !types.includes('scroll-reveal')) {
    types.unshift('entrance')
  }
  return types
}

/**
 * Selecting a Motionsites / catalogue template builds from its **source prompt**:
 * close Add immediately, stage on canvas with a generating animation, then
 * exact island or generate-live — never a silent remap onto unrelated Vue blocks.
 */
function stageMotionIsland(entry: InsertableTemplate, mode: 'exact' | 'live') {
  closeAfterInsert()
  emit('generate-motion', {
    mode,
    templateId: entry.template.id,
    title: entry.template.title,
    brief: entry.template.sourcePrompt.trim() || undefined,
    previewImage: entry.template.previewImage || undefined,
    previewVideo: entry.template.previewVideo || undefined,
  })
}

async function insertTemplate(entry: InsertableTemplate) {
  if (entry.template.islandReady) {
    stageMotionIsland(entry, 'exact')
    return
  }

  const islandId = detectExactIslandIntent(entry.template.sourcePrompt)
  if (islandId) {
    closeAfterInsert()
    emit('generate-motion', {
      mode: 'exact',
      templateId: islandId,
      title: entry.template.title,
      brief: entry.template.sourcePrompt.trim() || undefined,
      previewImage: entry.template.previewImage || undefined,
      previewVideo: entry.template.previewVideo || undefined,
    })
    return
  }

  const prompt = entry.template.sourcePrompt.trim()
  if (prompt && isMotionsitesCodegenBrief(prompt)) {
    stageMotionIsland(entry, 'live')
    return
  }

  if (prompt) {
    emit('rebuild-ai', {
      instruction: prompt,
      blockIds: entry.blockIds,
      motionTypes: motionTypesForTemplate(entry),
      templateId: entry.template.id,
      previewImage: entry.template.previewImage || undefined,
      previewVideo: entry.template.previewVideo || undefined,
    })
    previewOpen.value = false
    fullscreen.value = false
    open.value = false
    return
  }

  emit('insert', {
    blockIds: entry.blockIds,
    source: 'template',
    templateId: entry.template.id,
    motionTypes: motionTypesForTemplate(entry),
  })
  previewOpen.value = false
  fullscreen.value = false
  open.value = false
}

/**
 * Fullscreen “Generate with AI”: Motionsites generate-live for React briefs,
 * otherwise Ask AI on a seed hero.
 */
async function generateCustomSection(payload: {
  title: string
  prompt: string
  saveToLibrary: boolean
}) {
  const prompt = payload.prompt.trim()
  if (!prompt) return

  let templateId: string | undefined
  if (payload.saveToLibrary) {
    const saved = saveCustom({
      title: payload.title,
      prompt,
      category: 'Custom',
    })
    templateId = saved.id
  }

  if (isMotionsitesCodegenBrief(prompt)) {
    closeAfterInsert()
    emit('generate-motion', {
      mode: 'live',
      templateId: templateId || payload.title || 'custom-island',
      title: payload.title || 'Custom island',
      brief: prompt,
    })
    return
  }

  const seed =
    byId.get('hero-cover-statement-01') ?? byId.get('hero-aurora-01') ?? null
  const blockIds = seed ? [seed.id] : ['hero-cover-statement-01']

  emit('rebuild-ai', {
    instruction: prompt,
    blockIds,
    motionTypes: ['entrance', 'scroll-reveal'],
    templateId,
  })
  previewOpen.value = false
  fullscreen.value = false
  open.value = false
}

function onTemplateDragStart(event: DragEvent, entry: InsertableTemplate) {
  // Exact islands insert via insert-sections on drop — keep drag on the recipe
  // ids for non-islands; island cards use click / "Add exact island" instead.
  if (entry.template.islandReady) {
    event.preventDefault()
    return
  }
  setLibraryDrag(event, {
    kind: 'insert-template',
    blockIds: entry.blockIds,
    templateId: entry.template.id,
    motionTypes: motionTypesForTemplate(entry),
  })
}

function sectionCountLabel(entry: InsertableTemplate): string {
  return `Adds ${entry.blocks.length} section${entry.blocks.length === 1 ? '' : 's'}`
}

function templateVariationTitle(entry: InsertableTemplate, index: number) {
  const ordinal = String(index + 1).padStart(2, '0')
  return `${ordinal} — ${entry.template.title}`
}

// endregion

// region MotionSites sections (inside Sections tab)

const motionSectionResults = computed(() => {
  // Full MotionSites Dropbox catalogue (section + landing recipes). Landing
  // pageTypes used to be Templates-only and looked "missing" here.
  // Shadcn Space free blocks live under their own section source.
  return insertable.value.filter(
    (entry) =>
      !entry.template.id.startsWith('shadcnspace-') &&
      !entry.template.id.startsWith('magicui-') &&
      !entry.template.id.startsWith('studio-') &&
      (Boolean(entry.template.sourcePrompt?.trim()) ||
        entry.template.pageType === 'section' ||
        entry.template.islandReady),
  )
})

const motionSectionCollection = ref('')

/** Motionsites rail: Motion tools (platform scrub) + Dropbox collections. */
const motionSectionRail = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of motionSectionResults.value) {
    counts.set(entry.template.collection, (counts.get(entry.template.collection) ?? 0) + 1)
  }
  const term = blockSearch.value.trim().toLowerCase()
  const motionToolHits = term
    ? featuredMotionTools.value.filter((block) =>
        blockSearchHaystack(block).toLowerCase().includes(term),
      )
    : featuredMotionTools.value
  return [
    {
      value: '',
      label: 'All',
      count: motionSectionResults.value.length + motionToolHits.length,
    },
    {
      value: MOTION_TOOLS_RAIL,
      label: 'Motion tools',
      count: motionToolHits.length,
    },
    ...(templateCollections.value ?? [])
      .map((entry) => ({
        value: entry.id,
        label: entry.label,
        count: counts.get(entry.id) ?? 0,
      }))
      .filter((entry) => entry.count > 0),
  ]
})

const motionsitesFeaturedTools = computed(() => {
  const term = blockSearch.value.trim().toLowerCase()
  if (!term) return featuredMotionTools.value
  return featuredMotionTools.value.filter((block) =>
    blockSearchHaystack(block).toLowerCase().includes(term),
  )
})

/** Show platform motion tools on Motionsites All / Motion tools / matching search. */
const showMotionsitesMotionTools = computed(() => {
  if (motionSectionCollection.value === MOTION_TOOLS_RAIL) return true
  if (motionSectionCollection.value) return false
  return motionsitesFeaturedTools.value.length > 0
})

const motionSectionFiltered = computed(() => {
  if (motionSectionCollection.value === MOTION_TOOLS_RAIL) return []
  const term = blockSearch.value.trim().toLowerCase()
  return motionSectionResults.value.filter((entry) => {
    if (motionSectionCollection.value && entry.template.collection !== motionSectionCollection.value) {
      return false
    }
    if (!term) return true
    return `${entry.template.title} ${entry.template.category} ${entry.template.sourcePrompt}`
      .toLowerCase()
      .includes(term)
  })
})

function motionIslandSections(templateId: string, title: string) {
  const brand = brandFromIslandId(templateId)
  return [
    createSection(MOTIONSITES_ISLAND_HEADER_BLOCK, {
      brand,
      trademark: true,
    }),
    createSection('motion-section-01', {
      sectionId: templateId,
      title,
      minHeight: '100vh',
    }),
  ]
}

function closeAfterInsert() {
  previewOpen.value = false
  fullscreen.value = false
  open.value = false
}

function onComponentGenerated(result: GenerateComponentResult) {
  if (!result.sections?.length) {
    generateComponentOpen.value = false
    return
  }
  emit(
    'insert-sections',
    result.sections.map((entry) => ({
      id: entry.id,
      block: entry.block,
      props: entry.props,
      motion: entry.motion,
    })) as Section[],
  )
  generateComponentOpen.value = false
  closeAfterInsert()
}

function addExactMotionIsland(entry: InsertableTemplate) {
  stageMotionIsland(entry, 'exact')
}

/**
 * Close Add and let the page editor stage a generating animation while
 * codegen runs — never keep the library open waiting on the network.
 */
async function generateLiveMotionIsland(entry: InsertableTemplate) {
  stageMotionIsland(entry, 'live')
}

/** Preview-only Motionsites: generate live island (or insert exact when known). */
async function startMotionRebuild(entry: InsertableTemplate) {
  const islandId = detectExactIslandIntent(entry.template.sourcePrompt)
  if (islandId) {
    closeAfterInsert()
    emit('generate-motion', {
      mode: 'exact',
      templateId: islandId,
      title: entry.template.title,
      brief: entry.template.sourcePrompt.trim() || undefined,
      previewImage: entry.template.previewImage || undefined,
      previewVideo: entry.template.previewVideo || undefined,
    })
    return
  }
  if (entry.template.islandReady) {
    stageMotionIsland(entry, 'exact')
    return
  }
  stageMotionIsland(entry, 'live')
}

async function insertMotionSection(entry: InsertableTemplate) {
  if (suppressCardClick) {
    suppressCardClick = false
    return
  }
  if (entry.template.islandReady) {
    addExactMotionIsland(entry)
    return
  }
  await startMotionRebuild(entry)
}

async function rebuildMotionSection(entry: InsertableTemplate, event?: Event) {
  event?.stopPropagation()
  if (entry.template.islandReady) {
    addExactMotionIsland(entry)
    return
  }
  await startMotionRebuild(entry)
}

// endregion

// region Shadcn Space sections (inside Sections tab)

const shadcnSectionResults = computed(() =>
  insertable.value.filter((entry) => entry.template.id.startsWith('shadcnspace-')),
)

const shadcnSectionRail = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of shadcnSectionResults.value) {
    counts.set(entry.template.collection, (counts.get(entry.template.collection) ?? 0) + 1)
  }
  return [
    { value: '', label: 'All', count: shadcnSectionResults.value.length },
    ...(templateCollections.value ?? [])
      .map((entry) => ({
        value: entry.id,
        label: entry.label,
        count: counts.get(entry.id) ?? 0,
      }))
      .filter((entry) => entry.count > 0),
  ]
})

const shadcnSectionCollection = ref('')

const shadcnSectionFiltered = computed(() => {
  const term = blockSearch.value.trim().toLowerCase()
  return shadcnSectionResults.value.filter((entry) => {
    if (shadcnSectionCollection.value && entry.template.collection !== shadcnSectionCollection.value) {
      return false
    }
    if (!term) return true
    return `${entry.template.title} ${entry.template.category} ${entry.template.sourcePrompt}`
      .toLowerCase()
      .includes(term)
  })
})

function insertShadcnSection(entry: InsertableTemplate) {
  if (suppressCardClick) {
    suppressCardClick = false
    return
  }
  // Same rule as Motionsites: library previews rebuild; they are not Vue recipes.
  if (entry.template.sourcePrompt?.trim()) {
    rebuildShadcnSection(entry)
    return
  }
  emit('insert', {
    blockIds: entry.blockIds,
    source: 'template',
    templateId: entry.template.id,
    motionTypes: motionTypesForTemplate(entry),
  })
  closeAfterInsert()
}

function rebuildShadcnSection(entry: InsertableTemplate, event?: Event) {
  event?.stopPropagation()
  emit('rebuild-ai', {
    instruction:
      entry.template.sourcePrompt.trim() ||
      `Rebuild this section in the spirit of Shadcn Space “${entry.template.title}” — theme colours only, no third-party assets.`,
    blockIds: entry.blockIds,
    motionTypes: motionTypesForTemplate(entry),
    templateId: entry.template.id,
    previewImage: entry.template.previewImage || undefined,
    previewVideo: entry.template.previewVideo || undefined,
  })
  closeAfterInsert()
}

// endregion

// region Magic UI sections (inside Sections tab)

const magicUiSectionResults = computed(() =>
  insertable.value.filter((entry) => entry.template.id.startsWith('magicui-')),
)

const magicUiSectionRail = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of magicUiSectionResults.value) {
    counts.set(entry.template.collection, (counts.get(entry.template.collection) ?? 0) + 1)
  }
  return [
    { value: '', label: 'All', count: magicUiSectionResults.value.length },
    ...(templateCollections.value ?? [])
      .map((entry) => ({
        value: entry.id,
        label: entry.label,
        count: counts.get(entry.id) ?? 0,
      }))
      .filter((entry) => entry.count > 0),
  ]
})

const magicUiSectionCollection = ref('')

const magicUiSectionFiltered = computed(() => {
  const term = blockSearch.value.trim().toLowerCase()
  return magicUiSectionResults.value.filter((entry) => {
    if (magicUiSectionCollection.value && entry.template.collection !== magicUiSectionCollection.value) {
      return false
    }
    if (!term) return true
    return `${entry.template.title} ${entry.template.category} ${entry.template.sourcePrompt}`
      .toLowerCase()
      .includes(term)
  })
})

function insertMagicUiSection(entry: InsertableTemplate) {
  if (suppressCardClick) {
    suppressCardClick = false
    return
  }
  if (entry.template.sourcePrompt?.trim()) {
    rebuildMagicUiSection(entry)
    return
  }
  emit('insert', {
    blockIds: entry.blockIds,
    source: 'template',
    templateId: entry.template.id,
    motionTypes: motionTypesForTemplate(entry),
  })
  closeAfterInsert()
}

function rebuildMagicUiSection(entry: InsertableTemplate, event?: Event) {
  event?.stopPropagation()
  emit('rebuild-ai', {
    instruction:
      entry.template.sourcePrompt.trim() ||
      `Rebuild this section in the spirit of Magic UI “${entry.template.title}” — theme colours only, no third-party assets.`,
    blockIds: entry.blockIds,
    motionTypes: motionTypesForTemplate(entry),
    templateId: entry.template.id,
    previewImage: entry.template.previewImage || undefined,
    previewVideo: entry.template.previewVideo || undefined,
  })
  closeAfterInsert()
}

// endregion

// region Studio layouts (inside Sections tab)

const studioSectionResults = computed(() =>
  insertable.value.filter((entry) => entry.template.id.startsWith('studio-')),
)

const studioSectionRail = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of studioSectionResults.value) {
    counts.set(entry.template.collection, (counts.get(entry.template.collection) ?? 0) + 1)
  }
  return [
    { value: '', label: 'All', count: studioSectionResults.value.length },
    ...(templateCollections.value ?? [])
      .map((entry) => ({
        value: entry.id,
        label: entry.label,
        count: counts.get(entry.id) ?? 0,
      }))
      .filter((entry) => entry.count > 0),
  ]
})

const studioSectionCollection = ref('')

const studioSectionFiltered = computed(() => {
  const term = blockSearch.value.trim().toLowerCase()
  return studioSectionResults.value.filter((entry) => {
    if (studioSectionCollection.value && entry.template.collection !== studioSectionCollection.value) {
      return false
    }
    if (!term) return true
    return `${entry.template.title} ${entry.template.category} ${entry.template.sourcePrompt}`
      .toLowerCase()
      .includes(term)
  })
})

function insertStudioSection(entry: InsertableTemplate) {
  if (suppressCardClick) {
    suppressCardClick = false
    return
  }
  if (entry.template.sourcePrompt?.trim()) {
    rebuildStudioSection(entry)
    return
  }
  emit('insert', {
    blockIds: entry.blockIds,
    source: 'template',
    templateId: entry.template.id,
    motionTypes: motionTypesForTemplate(entry),
  })
  closeAfterInsert()
}

function rebuildStudioSection(entry: InsertableTemplate, event?: Event) {
  event?.stopPropagation()
  emit('rebuild-ai', {
    instruction:
      entry.template.sourcePrompt.trim() ||
      `Rebuild this landing page in the spirit of Studio “${entry.template.title}” — layout hierarchy only, theme colours, no third-party assets.`,
    blockIds: entry.blockIds,
    motionTypes: motionTypesForTemplate(entry),
    templateId: entry.template.id,
    previewImage: entry.template.previewImage || undefined,
    previewVideo: entry.template.previewVideo || undefined,
  })
  closeAfterInsert()
}

// endregion

// region Backgrounds tab

const backgroundSearch = librarySearch
const backgroundsFreeOnly = ref(true)

const {
  data: backgrounds,
  status: backgroundStatus,
  error: backgroundError,
} = useAsyncData(
  'insert-panel:backgrounds',
  () => api.get<MotionBackground[]>('/api/v1/templates/backgrounds', { limit: 300 }),
  { lazy: true, default: () => [] as MotionBackground[] },
)

const backgroundResults = computed(() => {
  const term = backgroundSearch.value.trim().toLowerCase()
  return (backgrounds.value ?? []).filter((entry) => {
    if (backgroundsFreeOnly.value && !entry.isFree) return false
    if (!term) return true
    return `${entry.title} ${entry.tags.join(' ')}`.toLowerCase().includes(term)
  })
})

/**
 * When the global search has no hits on the active tab, jump to the first tab
 * that does — so typing never leaves you staring at an empty pane.
 */
watch(librarySearch, (raw) => {
  const term = raw.trim()
  if (term.length < 2) return

  const sectionHits =
    sectionSource.value === 'motionsites'
      ? motionSectionFiltered.value.length +
        (showMotionsitesMotionTools.value ? motionsitesFeaturedTools.value.length : 0)
      : sectionSource.value === 'shadcnspace'
        ? shadcnSectionFiltered.value.length
        : sectionSource.value === 'magicui'
          ? magicUiSectionFiltered.value.length
          : sectionSource.value === 'studio'
            ? studioSectionFiltered.value.length
            : blockResults.value.length
  const templateHits = templateResults.value.length
  const backgroundHits = backgroundResults.value.length

  if (tab.value === 'sections' && sectionHits > 0) return
  if (tab.value === 'templates' && templateHits > 0) return
  if (tab.value === 'backgrounds' && backgroundHits > 0) return

  if (sectionHits > 0) tab.value = 'sections'
  else if (templateHits > 0) tab.value = 'templates'
  else if (backgroundHits > 0) tab.value = 'backgrounds'
})

function applyBackground(entry: MotionBackground) {
  if (suppressCardClick) {
    suppressCardClick = false
    return
  }
  // Drop the seed + Motionsites media on the page immediately. The atmosphere
  // "rebuild prompt" is not a copy edit — opening Ask AI only produced
  // "Nothing to change" from the deterministic composer.
  emit('rebuild-ai', {
    instruction: entry.rebuildPrompt,
    blockIds: [entry.seedBlockId],
    motionTypes: ['entrance', 'scroll-reveal'],
    previewImage: entry.previewImage || undefined,
    previewVideo: entry.previewVideo || undefined,
    openAi: false,
  })
  fullscreen.value = false
  open.value = false
}

function hasPreviewMedia(image?: string, video?: string) {
  return Boolean(image?.trim() || video?.trim())
}

// endregion
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out"
    leave-active-class="transition-opacity duration-150 ease-in"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <!-- Click-outside scrim — closes the add panel when not full-screen. -->
    <div
      v-if="open && !fullscreen"
      class="absolute inset-0 z-[calc(var(--z-editor-panel)-1)] bg-ink/25"
      aria-hidden="true"
      @click="open = false"
    />
  </Transition>

  <Transition
    enter-active-class="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
    leave-active-class="transition-transform duration-200 ease-[cubic-bezier(0.4,0,1,1)]"
    enter-from-class="-translate-x-full"
    leave-to-class="-translate-x-full"
  >
    <aside
      v-if="open"
      ref="panel"
      role="dialog"
      aria-modal="true"
      aria-label="Add a section"
      tabindex="-1"
      class="editor-chrome z-[var(--z-editor-panel)] flex flex-col border-line bg-raised shadow-float outline-none will-change-transform transition-[width,inset] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      :class="
        fullscreen
          ? 'fixed inset-0 border-0'
          : [
              'absolute inset-y-0 left-0 border-r',
              tab === 'templates' ? 'w-[min(72rem,calc(100%-1rem))]' : 'w-[min(44rem,calc(100%-3rem))]',
            ]
      "
      @keydown="onKeydown"
    >
      <!-- header ------------------------------------------------------- -->
      <header
        class="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5"
        :class="fullscreen && tab === 'templates' ? 'border-white/10 bg-[#0a0a0a]' : 'border-line bg-raised/95 backdrop-blur-md'"
      >
        <div class="min-w-0">
          <p class="type-button" :class="fullscreen && tab === 'templates' ? 'text-white' : 'text-ink'">
            Add a section
          </p>
          <p
            v-if="fullscreen && tab !== 'templates'"
            class="type-caption-12 text-soft"
          >
            Browse the library — search, filter, insert
          </p>
        </div>
        <div class="flex min-w-0 flex-1 items-center justify-end gap-1 sm:max-w-md">
          <UiInput
            v-model="librarySearch"
            class="min-w-0 flex-1"
            :class="
              fullscreen && tab === 'templates'
                ? 'border-white/15 bg-[#171717] text-white placeholder:text-white/55'
                : ''
            "
            placeholder="Search sections, templates, backgrounds…"
            aria-label="Search the insert library"
          />
          <button
            type="button"
            class="cursor-pointer rounded-md px-2.5 py-1.5 type-button-10 uppercase tracking-[0.08em] transition-colors duration-200"
            :class="
              fullscreen && tab === 'templates'
                ? 'text-white/80 hover:bg-white/10 hover:text-white'
                : 'border border-line bg-sunken text-ink hover:border-brand hover:text-brand'
            "
            :aria-pressed="fullscreen"
            @click="fullscreen = !fullscreen"
          >{{ fullscreen ? 'Exit full screen' : 'Full screen' }}</button>
          <button
            type="button"
            class="-mr-1 grid h-8 w-8 cursor-pointer place-items-center rounded-md transition-colors duration-200"
            :class="
              fullscreen && tab === 'templates'
                ? 'text-white/60 hover:bg-white/10 hover:text-white'
                : 'text-soft hover:bg-sunken hover:text-ink'
            "
            aria-label="Close the insert panel"
            @click="open = false"
          >&times;</button>
        </div>
      </header>

      <!-- tabs --------------------------------------------------------- -->
      <div
        class="flex gap-1 border-b px-2 py-1.5"
        :class="fullscreen && tab === 'templates' ? 'border-white/10 bg-[#0a0a0a]' : 'border-line bg-paper'"
        role="tablist"
        aria-label="What to insert"
      >
        <button
          v-for="entry in (['sections', 'templates', 'backgrounds'] as const)"
          :key="entry"
          type="button"
          role="tab"
          :aria-selected="tab === entry"
          class="flex-1 cursor-pointer rounded-md px-2 py-1.5 type-button-12 capitalize transition-colors duration-200"
          :class="
            fullscreen && tab === 'templates'
              ? tab === entry
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:text-white'
              : tab === entry
                ? 'bg-sunken text-ink shadow-card'
                : 'text-soft hover:bg-sunken/60 hover:text-ink'
          "
          @click="tab = entry"
        >{{ entry }}</button>
      </div>

      <!-- sections ------------------------------------------------------ -->
      <div v-if="tab === 'sections'" class="flex min-h-0 flex-1 flex-col bg-paper">
        <div class="flex gap-1 border-b border-line bg-raised px-2 py-1.5" role="tablist" aria-label="Section source">
          <button
            type="button"
            role="tab"
            :aria-selected="sectionSource === 'platform'"
            class="flex-1 cursor-pointer rounded-md px-2 py-1.5 type-button-10 transition-colors duration-200"
            :class="sectionSource === 'platform' ? 'bg-sunken text-ink shadow-card' : 'text-soft hover:text-ink'"
            @click="sectionSource = 'platform'"
          >Platform blocks</button>
          <button
            type="button"
            role="tab"
            :aria-selected="sectionSource === 'motionsites'"
            class="flex-1 cursor-pointer rounded-md px-2 py-1.5 type-button-10 transition-colors duration-200"
            :class="sectionSource === 'motionsites' ? 'bg-sunken text-ink shadow-card' : 'text-soft hover:text-ink'"
            @click="sectionSource = 'motionsites'"
          >MotionSites</button>
          <button
            type="button"
            role="tab"
            :aria-selected="sectionSource === 'shadcnspace'"
            class="flex-1 cursor-pointer rounded-md px-1.5 py-1.5 type-button-10 transition-colors duration-200"
            :class="sectionSource === 'shadcnspace' ? 'bg-sunken text-ink shadow-card' : 'text-soft hover:text-ink'"
            @click="sectionSource = 'shadcnspace'"
          >Shadcn Space</button>
          <button
            type="button"
            role="tab"
            :aria-selected="sectionSource === 'magicui'"
            class="flex-1 cursor-pointer rounded-md px-1.5 py-1.5 type-button-10 transition-colors duration-200"
            :class="sectionSource === 'magicui' ? 'bg-sunken text-ink shadow-card' : 'text-soft hover:text-ink'"
            @click="sectionSource = 'magicui'"
          >Magic UI</button>
          <button
            type="button"
            role="tab"
            :aria-selected="sectionSource === 'studio'"
            class="flex-1 cursor-pointer rounded-md px-1.5 py-1.5 type-button-10 transition-colors duration-200"
            :class="sectionSource === 'studio' ? 'bg-sunken text-ink shadow-card' : 'text-soft hover:text-ink'"
            @click="sectionSource = 'studio'"
          >Studio</button>
        </div>

        <div v-if="sectionSource === 'platform'" class="flex min-h-0 flex-1">
          <!-- Category rail -->
          <nav
            class="flex shrink-0 flex-col border-r border-line bg-raised"
            :class="fullscreen ? 'w-56' : 'w-[11.5rem]'"
            aria-label="Section categories"
          >
            <div class="sticky top-0 z-10 border-b border-line bg-raised/95 p-2.5 backdrop-blur-md">
              <UiInput v-model="blockSearch" placeholder="Filter this list…" aria-label="Filter sections" />
            </div>
            <ul class="min-h-0 flex-1 overflow-y-auto py-1.5">
              <li v-for="entry in categoryRail" :key="entry.value || 'all'">
                <button
                  type="button"
                  class="relative flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-200"
                  :class="
                    blockCategory === entry.value
                      ? 'bg-sunken text-ink'
                      : 'text-soft hover:bg-sunken/60 hover:text-ink'
                  "
                  :aria-current="blockCategory === entry.value ? 'true' : undefined"
                  @click="blockCategory = entry.value"
                >
                  <span
                    v-if="blockCategory === entry.value"
                    class="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span class="type-button-12 truncate">{{ entry.label }}</span>
                  <span class="type-button-10 tabular-nums text-soft">{{ entry.count }}</span>
                </button>
              </li>
            </ul>
            <p v-if="hiddenByCeiling" class="border-t border-line px-2.5 py-2 type-caption-12 leading-snug text-soft">
              {{ hiddenByCeiling }} hidden by class {{ maxPerformanceClass }} budget.
            </p>
          </nav>

          <!-- Variations -->
          <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-paper">
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div
                class="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-raised/95 px-4 py-3 backdrop-blur-md"
              >
                <h2 class="type-button text-ink">{{ activeCategoryLabel }}</h2>
                <span class="rounded-md bg-sunken px-1.5 py-0.5 type-button-10 tabular-nums text-soft">
                  {{ blockResults.length }} variation{{ blockResults.length === 1 ? '' : 's' }}
                </span>
              </div>

              <div :class="fullscreen ? 'px-5 py-5' : 'px-4 py-4'">
                <div
                  v-if="!blockCategory && !blockSearch.trim() && featuredMotionTools.length"
                  class="mb-4 rounded-xl border border-brand/30 bg-brand-soft/40 p-3"
                >
                  <p class="type-button-10 uppercase tracking-[0.08em] text-brand">Motion tools</p>
                  <p class="mt-1 type-caption-12 text-soft">
                    Scroll-scrub video frames for interactive 3D-style sections.
                  </p>
                  <ul class="mt-3 flex flex-col gap-2">
                    <li v-for="block in featuredMotionTools" :key="`featured-${block.id}`">
                      <button
                        type="button"
                        class="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-raised px-3 py-2 text-left transition-colors hover:border-brand"
                        @click="onBlockCardClick(block.id)"
                      >
                        <span class="type-button-12 text-ink">{{ block.name }}</span>
                        <UiBadge tone="neutral">{{ block.performanceClass }}</UiBadge>
                      </button>
                    </li>
                  </ul>
                </div>
                <ul
                  class="gap-4"
                  :class="fullscreen ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col'"
                >
                  <li
                    v-for="block in blockResults"
                    :key="block.id"
                    class="relative cursor-pointer overflow-hidden rounded-xl border border-line bg-raised shadow-card transition-[border-color,box-shadow] duration-200 hover:border-brand hover:shadow-raised focus-within:border-brand active:cursor-grabbing"
                    draggable="true"
                    role="button"
                    tabindex="0"
                    :aria-label="`Add ${variationTitle(block)}`"
                    @mouseenter="activate(block.id)"
                    @mouseleave="deactivate(block.id)"
                    @focusin="activate(block.id)"
                    @focusout="deactivate(block.id)"
                    @dragstart="onBlockDragStart($event, block)"
                    @click="onBlockCardClick(block.id)"
                    @keydown.enter.prevent="insertBlock(block.id)"
                    @keydown.space.prevent="insertBlock(block.id)"
                  >
                    <div class="flex items-start justify-between gap-2 border-b border-line px-3 py-2.5">
                      <p class="min-w-0 type-button text-ink">{{ variationTitle(block) }}</p>
                      <div class="flex shrink-0 gap-1">
                        <UiBadge v-if="FEATURED_MOTION_ID_SET.has(block.id)" tone="brand">Motion</UiBadge>
                        <UiBadge :tone="toneFor(block.performanceClass)">{{ block.performanceClass }}</UiBadge>
                      </div>
                    </div>

                    <TemplatePreview
                      :block-ids="previewIds.get(block.id) ?? []"
                      :theme="theme"
                      :play="activeCardId === block.id"
                      ratio="16 / 9"
                    />

                    <div class="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
                      <button
                        type="button"
                        class="type-button-10 cursor-pointer rounded-md border border-line bg-paper px-2 py-1 text-soft transition-colors duration-200 hover:border-brand hover:text-brand"
                        :aria-label="`Live preview ${block.name}`"
                        title="Fullscreen live preview"
                        @click.stop="openBlockPreview(block, $event)"
                      >Preview</button>
                      <button
                        type="button"
                        class="type-button-10 cursor-pointer rounded-md border border-line bg-paper px-2 py-1 text-soft transition-colors duration-200 hover:border-brand hover:text-brand"
                        :aria-label="`Add another ${block.name}`"
                        title="Add (again)"
                        @click.stop="insertBlock(block.id)"
                      >Duplicate</button>
                    </div>
                  </li>
                </ul>

                <UiEmptyState
                  v-if="!blockResults.length"
                  title="Nothing matches"
                  description="Try a different word or category."
                />
              </div>
            </div>
          </div>
        </div>

        <!-- MotionSites section recipes from Dropbox library -->
        <div
          v-else-if="sectionSource === 'motionsites'"
          class="flex min-h-0 flex-1"
        >
          <nav
            class="flex shrink-0 flex-col border-r border-line bg-raised"
            :class="fullscreen ? 'w-56' : 'w-[11.5rem]'"
            aria-label="MotionSites collections"
          >
            <div class="sticky top-0 z-10 border-b border-line bg-raised/95 p-2.5 backdrop-blur-md">
              <UiInput v-model="blockSearch" placeholder="Search MotionSites…" aria-label="Search MotionSites sections" />
              <UiButton
                v-if="canWrite && siteId"
                class="mt-2 w-full"
                size="sm"
                variant="secondary"
                type="button"
                @click="generateComponentOpen = true"
              >Generate component</UiButton>
              <p v-if="motionGenerateError" class="mt-2 type-caption-12 text-danger" role="alert">
                {{ motionGenerateError }}
              </p>
            </div>
            <ul class="min-h-0 flex-1 overflow-y-auto py-1.5">
              <li v-for="entry in motionSectionRail" :key="entry.value || 'all'">
                <button
                  type="button"
                  class="relative flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-200"
                  :class="
                    motionSectionCollection === entry.value
                      ? 'bg-sunken text-ink'
                      : 'text-soft hover:bg-sunken/60 hover:text-ink'
                  "
                  :aria-current="motionSectionCollection === entry.value ? 'true' : undefined"
                  @click="motionSectionCollection = entry.value"
                >
                  <span
                    v-if="motionSectionCollection === entry.value"
                    class="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span class="type-button-12 truncate">{{ entry.label }}</span>
                  <span class="type-button-10 tabular-nums text-soft">{{ entry.count }}</span>
                </button>
              </li>
            </ul>
          </nav>

          <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-paper">
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div
                class="sticky top-0 z-10 space-y-0 border-b border-line bg-raised/95 backdrop-blur-md"
              >
                <div class="flex items-center gap-2 px-4 py-3">
                  <h2 class="type-button text-ink">
                    {{
                      motionSectionCollection === MOTION_TOOLS_RAIL
                        ? 'Motion tools'
                        : 'MotionSites'
                    }}
                  </h2>
                  <span class="rounded-md bg-sunken px-1.5 py-0.5 type-button-10 tabular-nums text-soft">
                    {{
                      motionSectionCollection === MOTION_TOOLS_RAIL
                        ? motionsitesFeaturedTools.length
                        : motionSectionFiltered.length +
                          (showMotionsitesMotionTools ? motionsitesFeaturedTools.length : 0)
                    }}
                  </span>
                </div>
                <p class="border-t border-line px-4 py-2 type-caption-12 leading-relaxed text-soft">
                  <template v-if="motionSectionCollection === MOTION_TOOLS_RAIL">
                    Platform scroll tools (always available). Pick a video with frames ready in Content
                    after insert.
                  </template>
                  <template v-else>
                    Exact React islands when ready. Preview-only cards seed the Motionsites video and open
                    Rebuild with AI — they never drop an unrelated Vue block onto the page.
                  </template>
                </p>
              </div>
              <div :class="fullscreen ? 'px-5 py-5' : 'px-4 py-4'">
              <p v-if="templateStatus === 'pending'" class="py-8 text-center type-caption-12 text-soft">
                Loading MotionSites…
              </p>
              <template v-else>
              <!-- Always-available platform motion tools (e.g. scroll video scrub). -->
              <div v-if="showMotionsitesMotionTools" class="mb-6">
                <div
                  v-if="motionSectionCollection !== MOTION_TOOLS_RAIL"
                  class="mb-3 flex items-center gap-2"
                >
                  <h3 class="type-button-12 text-ink">Motion tools</h3>
                  <span class="rounded-md bg-sunken px-1.5 py-0.5 type-button-10 tabular-nums text-soft">
                    Always available
                  </span>
                </div>
                <ul
                  class="gap-4"
                  :class="fullscreen ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col'"
                >
                  <li
                    v-for="block in motionsitesFeaturedTools"
                    :key="block.id"
                    class="relative cursor-pointer overflow-hidden rounded-xl border border-brand/30 bg-raised shadow-card transition-[border-color,box-shadow] duration-200 hover:border-brand hover:shadow-raised focus-within:border-brand active:cursor-grabbing"
                    draggable="true"
                    role="button"
                    tabindex="0"
                    :aria-label="`Add ${variationTitle(block)}`"
                    @mouseenter="activate(block.id)"
                    @mouseleave="deactivate(block.id)"
                    @focusin="activate(block.id)"
                    @focusout="deactivate(block.id)"
                    @dragstart="onBlockDragStart($event, block)"
                    @click="onBlockCardClick(block.id)"
                    @keydown.enter.prevent="insertBlock(block.id)"
                    @keydown.space.prevent="insertBlock(block.id)"
                  >
                    <div class="flex items-start justify-between gap-2 border-b border-line px-3 py-2.5">
                      <p class="min-w-0 type-button text-ink">{{ block.name }}</p>
                      <div class="flex shrink-0 gap-1">
                        <UiBadge tone="brand">Motion</UiBadge>
                        <UiBadge :tone="toneFor(block.performanceClass)">{{ block.performanceClass }}</UiBadge>
                      </div>
                    </div>
                    <TemplatePreview
                      :block-ids="previewIds.get(block.id) ?? []"
                      :theme="theme"
                      :play="activeCardId === block.id"
                      ratio="16 / 9"
                    />
                    <div class="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
                      <p class="line-clamp-2 flex-1 type-caption-12 leading-relaxed text-soft">
                        {{ block.description }}
                      </p>
                      <button
                        type="button"
                        class="type-button-10 cursor-pointer rounded-md border border-line bg-paper px-2 py-1 text-soft transition-colors duration-200 hover:border-brand hover:text-brand"
                        :aria-label="`Live preview ${block.name}`"
                        title="Fullscreen live preview"
                        @click.stop="openBlockPreview(block, $event)"
                      >Preview</button>
                    </div>
                  </li>
                </ul>
              </div>

              <ul
                v-if="motionSectionCollection !== MOTION_TOOLS_RAIL"
                class="gap-4"
                :class="fullscreen ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col'"
              >
                <li
                  v-for="(entry, index) in motionSectionFiltered"
                  :key="entry.template.id"
                  class="relative cursor-pointer overflow-hidden rounded-xl border border-line bg-raised shadow-card transition-[border-color,box-shadow] duration-200 hover:border-brand hover:shadow-raised"
                  role="button"
                  tabindex="0"
                  :aria-label="`Add ${entry.template.title}`"
                  @mouseenter="activate(entry.template.id)"
                  @mouseleave="deactivate(entry.template.id)"
                  @click="insertMotionSection(entry)"
                  @keydown.enter.prevent="insertMotionSection(entry)"
                >
                  <div class="flex items-start justify-between gap-2 border-b border-line px-3 py-2.5">
                    <p class="min-w-0 type-button text-ink">{{ templateVariationTitle(entry, index) }}</p>
                    <div class="flex shrink-0 flex-wrap justify-end gap-1">
                      <UiBadge v-if="entry.template.islandReady" tone="positive">Live</UiBadge>
                      <UiBadge v-else-if="generatingMotionId === entry.template.id" tone="brand">Generating…</UiBadge>
                      <UiBadge v-else tone="warning">Generate live</UiBadge>
                      <UiBadge tone="brand">{{ entry.template.category }}</UiBadge>
                    </div>
                  </div>
                  <div class="relative aspect-video w-full overflow-hidden bg-[#0a0a0a]">
                    <MotionPreviewMedia
                      v-if="hasPreviewMedia(entry.template.previewImage, entry.template.previewVideo)"
                      :preview-image="entry.template.previewImage"
                      :preview-video="entry.template.previewVideo"
                      :alt="entry.template.title"
                      :play="activeCardId === entry.template.id"
                    />
                    <TemplatePreview
                      v-else
                      :block-ids="entry.blockIds"
                      :theme="theme"
                      :play="activeCardId === entry.template.id"
                      ratio="16 / 9"
                    />
                  </div>
                  <div class="border-t border-line px-3 py-2">
                    <p class="line-clamp-2 type-caption-12 leading-relaxed text-soft">
                      {{ entry.template.sourcePrompt || entry.blocks.map((block) => block.name).join(' → ') }}
                    </p>
                    <div class="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        class="type-button-10 rounded-md border border-line bg-raised px-2 py-1 text-soft transition-colors hover:border-brand hover:text-brand"
                        @click.stop="openTemplatePreview(entry, $event)"
                      >Preview</button>
                      <button
                        type="button"
                        class="type-button-10 rounded-md border border-brand/40 bg-brand-soft px-2 py-1 text-brand transition-colors hover:border-brand disabled:opacity-50"
                        :disabled="generatingMotionId === entry.template.id"
                        @click.stop="rebuildMotionSection(entry, $event)"
                      >{{
                        entry.template.islandReady
                          ? 'Add live island'
                          : generatingMotionId === entry.template.id
                            ? 'Generating…'
                            : 'Generate live'
                      }}</button>
                    </div>
                  </div>
                </li>
              </ul>
              <UiEmptyState
                v-if="
                  templateStatus !== 'pending' &&
                  !motionSectionFiltered.length &&
                  !(showMotionsitesMotionTools && motionsitesFeaturedTools.length)
                "
                title="No MotionSites sections"
                description="Import from Dropbox with pnpm --filter @platform/templates import:motionsites"
              />
              </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Shadcn Space free block recipes -->
        <div
          v-else-if="sectionSource === 'shadcnspace'"
          class="flex min-h-0 flex-1"
        >
          <nav
            class="flex shrink-0 flex-col border-r border-line bg-raised"
            :class="fullscreen ? 'w-56' : 'w-[11.5rem]'"
            aria-label="Shadcn Space collections"
          >
            <div class="sticky top-0 z-10 border-b border-line bg-raised/95 p-2.5 backdrop-blur-md">
              <UiInput v-model="blockSearch" placeholder="Search Shadcn Space…" aria-label="Search Shadcn Space sections" />
            </div>
            <ul class="min-h-0 flex-1 overflow-y-auto py-1.5">
              <li v-for="entry in shadcnSectionRail" :key="entry.value || 'all'">
                <button
                  type="button"
                  class="relative flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-200"
                  :class="
                    shadcnSectionCollection === entry.value
                      ? 'bg-sunken text-ink'
                      : 'text-soft hover:bg-sunken/60 hover:text-ink'
                  "
                  :aria-current="shadcnSectionCollection === entry.value ? 'true' : undefined"
                  @click="shadcnSectionCollection = entry.value"
                >
                  <span
                    v-if="shadcnSectionCollection === entry.value"
                    class="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span class="type-button-12 truncate">{{ entry.label }}</span>
                  <span class="type-button-10 tabular-nums text-soft">{{ entry.count }}</span>
                </button>
              </li>
            </ul>
          </nav>

          <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-paper">
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div class="sticky top-0 z-10 space-y-0 border-b border-line bg-raised/95 backdrop-blur-md">
                <div class="flex items-center gap-2 px-4 py-3">
                  <h2 class="type-button text-ink">Shadcn Space</h2>
                  <span class="rounded-md bg-sunken px-1.5 py-0.5 type-button-10 tabular-nums text-soft">
                    {{ shadcnSectionFiltered.length }}
                  </span>
                </div>
                <p class="border-t border-line px-4 py-2 type-caption-12 leading-relaxed text-soft">
                  Free MIT blocks as platform recipes. <span class="text-ink">Add</span> inserts the mapped
                  section; Rebuild with AI uses the design brief (no React source).
                </p>
              </div>
              <div :class="fullscreen ? 'px-5 py-5' : 'px-4 py-4'">
                <p v-if="templateStatus === 'pending'" class="py-8 text-center type-caption-12 text-soft">
                  Loading Shadcn Space…
                </p>
                <ul
                  v-else
                  class="gap-4"
                  :class="fullscreen ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col'"
                >
                  <li
                    v-for="(entry, index) in shadcnSectionFiltered"
                    :key="entry.template.id"
                    class="relative cursor-pointer overflow-hidden rounded-xl border border-line bg-raised shadow-card transition-[border-color,box-shadow] duration-200 hover:border-brand hover:shadow-raised"
                    role="button"
                    tabindex="0"
                    :aria-label="`Add ${entry.template.title}`"
                    @mouseenter="activate(entry.template.id)"
                    @mouseleave="deactivate(entry.template.id)"
                    @click="insertShadcnSection(entry)"
                    @keydown.enter.prevent="insertShadcnSection(entry)"
                  >
                    <div class="flex items-start justify-between gap-2 border-b border-line px-3 py-2.5">
                      <p class="min-w-0 type-button text-ink">{{ templateVariationTitle(entry, index) }}</p>
                      <div class="flex shrink-0 flex-wrap justify-end gap-1">
                        <UiBadge tone="brand">{{ entry.template.category }}</UiBadge>
                      </div>
                    </div>
                    <div class="relative aspect-video w-full overflow-hidden bg-sunken">
                      <TemplatePreview
                        :block-ids="entry.blockIds"
                        :theme="theme"
                        ratio="16 / 9"
                        class="absolute inset-0"
                      />
                    </div>
                    <div class="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
                      <span class="truncate type-caption-12 text-soft">
                        {{ entry.blockIds.join(' · ') || 'AI seed' }}
                      </span>
                      <div class="flex shrink-0 gap-1">
                        <UiButton
                          size="sm"
                          variant="ghost"
                          @click.stop="rebuildShadcnSection(entry, $event)"
                        >Rebuild</UiButton>
                        <UiButton
                          size="sm"
                          @click.stop="openTemplatePreview(entry, $event)"
                        >Preview</UiButton>
                      </div>
                    </div>
                  </li>
                </ul>
                <UiEmptyState
                  v-if="templateStatus !== 'pending' && !shadcnSectionFiltered.length"
                  title="No Shadcn Space sections"
                  description="Run pnpm --filter @platform/templates import:shadcnspace against your local library checkout."
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Magic UI free registry recipes -->
        <div
          v-else-if="sectionSource === 'magicui'"
          class="flex min-h-0 flex-1"
        >
          <nav
            class="flex shrink-0 flex-col border-r border-line bg-raised"
            :class="fullscreen ? 'w-56' : 'w-[11.5rem]'"
            aria-label="Magic UI collections"
          >
            <div class="sticky top-0 z-10 border-b border-line bg-raised/95 p-2.5 backdrop-blur-md">
              <UiInput v-model="blockSearch" placeholder="Search Magic UI…" aria-label="Search Magic UI sections" />
            </div>
            <ul class="min-h-0 flex-1 overflow-y-auto py-1.5">
              <li v-for="entry in magicUiSectionRail" :key="entry.value || 'all'">
                <button
                  type="button"
                  class="relative flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-200"
                  :class="
                    magicUiSectionCollection === entry.value
                      ? 'bg-sunken text-ink'
                      : 'text-soft hover:bg-sunken/60 hover:text-ink'
                  "
                  :aria-current="magicUiSectionCollection === entry.value ? 'true' : undefined"
                  @click="magicUiSectionCollection = entry.value"
                >
                  <span
                    v-if="magicUiSectionCollection === entry.value"
                    class="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span class="type-button-12 truncate">{{ entry.label }}</span>
                  <span class="type-button-10 tabular-nums text-soft">{{ entry.count }}</span>
                </button>
              </li>
            </ul>
          </nav>

          <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-paper">
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div class="sticky top-0 z-10 space-y-0 border-b border-line bg-raised/95 backdrop-blur-md">
                <div class="flex items-center gap-2 px-4 py-3">
                  <h2 class="type-button text-ink">Magic UI</h2>
                  <span class="rounded-md bg-sunken px-1.5 py-0.5 type-button-10 tabular-nums text-soft">
                    {{ magicUiSectionFiltered.length }}
                  </span>
                </div>
                <p class="border-t border-line px-4 py-2 type-caption-12 leading-relaxed text-soft">
                  Free MIT effects as platform recipes. <span class="text-ink">Add</span> inserts the mapped
                  section; Rebuild with AI uses the design brief. Magic UI Pro is excluded.
                </p>
              </div>
              <div :class="fullscreen ? 'px-5 py-5' : 'px-4 py-4'">
                <p v-if="templateStatus === 'pending'" class="py-8 text-center type-caption-12 text-soft">
                  Loading Magic UI…
                </p>
                <ul
                  v-else
                  class="gap-4"
                  :class="fullscreen ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col'"
                >
                  <li
                    v-for="(entry, index) in magicUiSectionFiltered"
                    :key="entry.template.id"
                    class="relative cursor-pointer overflow-hidden rounded-xl border border-line bg-raised shadow-card transition-[border-color,box-shadow] duration-200 hover:border-brand hover:shadow-raised"
                    role="button"
                    tabindex="0"
                    :aria-label="`Add ${entry.template.title}`"
                    @mouseenter="activate(entry.template.id)"
                    @mouseleave="deactivate(entry.template.id)"
                    @click="insertMagicUiSection(entry)"
                    @keydown.enter.prevent="insertMagicUiSection(entry)"
                  >
                    <div class="flex items-start justify-between gap-2 border-b border-line px-3 py-2.5">
                      <p class="min-w-0 type-button text-ink">{{ templateVariationTitle(entry, index) }}</p>
                      <div class="flex shrink-0 flex-wrap justify-end gap-1">
                        <UiBadge tone="brand">{{ entry.template.category }}</UiBadge>
                      </div>
                    </div>
                    <div class="relative aspect-video w-full overflow-hidden bg-sunken">
                      <TemplatePreview
                        :block-ids="entry.blockIds"
                        :theme="theme"
                        ratio="16 / 9"
                        class="absolute inset-0"
                      />
                    </div>
                    <div class="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
                      <span class="truncate type-caption-12 text-soft">
                        {{ entry.blockIds.join(' · ') || 'AI seed' }}
                      </span>
                      <div class="flex shrink-0 gap-1">
                        <UiButton
                          size="sm"
                          variant="ghost"
                          @click.stop="rebuildMagicUiSection(entry, $event)"
                        >Rebuild</UiButton>
                        <UiButton
                          size="sm"
                          @click.stop="openTemplatePreview(entry, $event)"
                        >Preview</UiButton>
                      </div>
                    </div>
                  </li>
                </ul>
                <UiEmptyState
                  v-if="templateStatus !== 'pending' && !magicUiSectionFiltered.length"
                  title="No Magic UI sections"
                  description="Pull the free repo then run pnpm --filter @platform/templates import:magicui"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Studio layout recipes from allowlisted marketing repos -->
        <div
          v-else-if="sectionSource === 'studio'"
          class="flex min-h-0 flex-1"
        >
          <nav
            class="flex shrink-0 flex-col border-r border-line bg-raised"
            :class="fullscreen ? 'w-56' : 'w-[11.5rem]'"
            aria-label="Studio collections"
          >
            <div class="sticky top-0 z-10 border-b border-line bg-raised/95 p-2.5 backdrop-blur-md">
              <UiInput v-model="blockSearch" placeholder="Search Studio…" aria-label="Search Studio layouts" />
            </div>
            <ul class="min-h-0 flex-1 overflow-y-auto py-1.5">
              <li v-for="entry in studioSectionRail" :key="entry.value || 'all'">
                <button
                  type="button"
                  class="relative flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-200"
                  :class="
                    studioSectionCollection === entry.value
                      ? 'bg-sunken text-ink'
                      : 'text-soft hover:bg-sunken/60 hover:text-ink'
                  "
                  :aria-current="studioSectionCollection === entry.value ? 'true' : undefined"
                  @click="studioSectionCollection = entry.value"
                >
                  <span
                    v-if="studioSectionCollection === entry.value"
                    class="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span class="type-button-12 truncate">{{ entry.label }}</span>
                  <span class="type-button-10 tabular-nums text-soft">{{ entry.count }}</span>
                </button>
              </li>
            </ul>
          </nav>

          <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-paper">
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div class="sticky top-0 z-10 space-y-0 border-b border-line bg-raised/95 backdrop-blur-md">
                <div class="flex items-center gap-2 px-4 py-3">
                  <h2 class="type-button text-ink">Studio</h2>
                  <span class="rounded-md bg-sunken px-1.5 py-0.5 type-button-10 tabular-nums text-soft">
                    {{ studioSectionFiltered.length }}
                  </span>
                </div>
                <p class="border-t border-line px-4 py-2 type-caption-12 leading-relaxed text-soft">
                  Layout recipes from studio marketing sites. Rebuild with AI uses the layout brief —
                  never framework source (ADR-0003).
                </p>
              </div>
              <div :class="fullscreen ? 'px-5 py-5' : 'px-4 py-4'">
                <p v-if="templateStatus === 'pending'" class="py-8 text-center type-caption-12 text-soft">
                  Loading Studio…
                </p>
                <ul
                  v-else
                  class="gap-4"
                  :class="fullscreen ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col'"
                >
                  <li
                    v-for="(entry, index) in studioSectionFiltered"
                    :key="entry.template.id"
                    class="relative cursor-pointer overflow-hidden rounded-xl border border-line bg-raised shadow-card transition-[border-color,box-shadow] duration-200 hover:border-brand hover:shadow-raised"
                    role="button"
                    tabindex="0"
                    :aria-label="`Rebuild ${entry.template.title}`"
                    @mouseenter="activate(entry.template.id)"
                    @mouseleave="deactivate(entry.template.id)"
                    @click="insertStudioSection(entry)"
                    @keydown.enter.prevent="insertStudioSection(entry)"
                  >
                    <div class="flex items-start justify-between gap-2 border-b border-line px-3 py-2.5">
                      <p class="min-w-0 type-button text-ink">{{ templateVariationTitle(entry, index) }}</p>
                      <div class="flex shrink-0 flex-wrap justify-end gap-1">
                        <UiBadge tone="brand">{{ entry.template.category }}</UiBadge>
                      </div>
                    </div>
                    <div class="relative aspect-video w-full overflow-hidden bg-sunken">
                      <TemplatePreview
                        :block-ids="entry.blockIds"
                        :theme="theme"
                        ratio="16 / 9"
                        class="absolute inset-0"
                      />
                    </div>
                    <div class="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
                      <span class="truncate type-caption-12 text-soft">
                        {{ entry.blockIds.join(' · ') || 'AI seed' }}
                      </span>
                      <div class="flex shrink-0 gap-1">
                        <UiButton
                          size="sm"
                          variant="ghost"
                          @click.stop="rebuildStudioSection(entry, $event)"
                        >Rebuild</UiButton>
                        <UiButton
                          size="sm"
                          @click.stop="openTemplatePreview(entry, $event)"
                        >Preview</UiButton>
                      </div>
                    </div>
                  </li>
                </ul>
                <UiEmptyState
                  v-if="templateStatus !== 'pending' && !studioSectionFiltered.length"
                  title="No Studio layouts"
                  description="Run pnpm --filter @platform/templates import:studio-layouts against your Documents/GitHub allowlist."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- templates — dark gallery; fullscreen is InsertLivePreview -------- -->
      <div v-if="tab === 'templates'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TemplateGallery
          :entries="templateResults"
          :collections="templateRail"
          :theme="theme"
          :loading="templateStatus === 'pending'"
          :error="templateError ? 'Could not load the template catalogue.' : null"
          :search="templateSearch"
          :collection="templateCollection"
          :fullscreen="fullscreen"
          @update:search="templateSearch = $event"
          @update:collection="templateCollection = $event"
          @insert="insertTemplate"
          @fullscreen="openTemplatePreview($event)"
          @dragstart="onTemplateDragStart"
          @generate-ai="generateCustomSection"
        />
      </div>

      <!-- backgrounds (MotionSites) ------------------------------------- -->
      <div v-if="tab === 'backgrounds'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="space-y-2 border-b border-line px-3 py-2.5">
          <p class="type-caption-12 leading-relaxed text-soft">
            Click a Motionsites background to add it to the page with its preview
            media. Same-origin only — no gated CDN videos.
          </p>
          <div class="flex items-center gap-2">
            <label class="flex shrink-0 items-center gap-1.5 type-button-10 text-soft">
              <input v-model="backgroundsFreeOnly" type="checkbox" class="rounded border-line" />
              Free only
            </label>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <p v-if="backgroundStatus === 'pending'" class="py-8 text-center type-caption-12 text-faint">
            Loading backgrounds…
          </p>
          <p
            v-else-if="backgroundError"
            class="rounded-lg bg-danger-soft px-3 py-2 type-caption-12 text-danger"
            role="alert"
          >Could not load backgrounds.</p>
          <ul v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <li v-for="entry in backgroundResults" :key="entry.id">
              <button
                type="button"
                class="group relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#171717] text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-white/40 hover:shadow-raised"
                @mouseenter="activate(entry.id)"
                @mouseleave="deactivate(entry.id)"
                @click="applyBackground(entry)"
              >
                <div class="relative aspect-video w-full overflow-hidden bg-[#0a0a0a]">
                  <MotionPreviewMedia
                    v-if="hasPreviewMedia(entry.previewImage, entry.previewVideo)"
                    :preview-image="entry.previewImage"
                    :preview-video="entry.previewVideo"
                    :alt="entry.title"
                    :play="activeCardId === entry.id"
                  />
                  <div
                    v-else
                    class="absolute inset-0 bg-gradient-to-br from-[#1f1f1f] via-[#141414] to-[#0a0a0a]"
                    aria-hidden="true"
                  />
                  <div
                    class="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-2.5 pt-10"
                  >
                    <span class="min-w-0 truncate type-button-12 text-white">{{ entry.title }}</span>
                    <span
                      class="shrink-0 rounded-md px-1.5 py-0.5 type-button-10 font-semibold uppercase tracking-[0.04em]"
                      :class="entry.isFree ? 'bg-emerald-400/90 text-black' : 'bg-amber-300 text-black'"
                    >{{ entry.isFree ? 'Free' : 'Pro' }}</span>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-2 px-3 py-2">
                  <span class="truncate type-caption-12 text-white/80">
                    {{ entry.tags.length ? entry.tags.join(' · ') : 'MotionSites background' }}
                  </span>
                  <span class="shrink-0 type-button-10 text-white/80 group-hover:text-white">Add →</span>
                </div>
              </button>
            </li>
          </ul>
          <UiEmptyState
            v-if="backgroundStatus !== 'pending' && !backgroundResults.length"
            title="No backgrounds"
            description="Run pnpm --filter @platform/templates import:backgrounds against your MotionSites Dropbox folder."
          />
        </div>
      </div>
    </aside>
  </Transition>

  <InsertLivePreview
    v-model:open="previewOpen"
    :title="previewTarget?.title ?? ''"
    :description="previewTarget?.description ?? ''"
    :block-ids="previewTarget?.blockIds ?? []"
    :theme="theme"
    :performance-label="previewTarget?.performanceLabel ?? ''"
    :meta-lines="previewTarget?.metaLines ?? []"
    @insert="insertFromPreview"
    @duplicate="duplicateFromPreview"
  />

  <GenerateComponentDialog
    v-model:open="generateComponentOpen"
    :site-id="siteId"
    :page-id="pageId"
    default-target="section"
    @generated="onComponentGenerated"
  />
</template>
