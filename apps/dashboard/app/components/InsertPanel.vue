<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { createSection, listBlockMetadata } from '@platform/blocks'
import {
  BLOCK_CATEGORIES,
  type BlockCategory,
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

/**
 * The insert panel: a slide-over that adds sections without hiding the page.
 *
 * Layout mirrors a Shadcn Space block browser — sticky category rail on the
 * left, large variation cards on the right — so browsing by kind (hero,
 * features, …) is the primary path rather than by style collection.
 *
 * Three tabs, one action. *Sections* is the block registry (ADR-0003).
 * *Templates* expands a site-template recipe into several sections in one undo.
 * *Assets* is saved compositions plus free MIT library layout recipes (HyperUI,
 * Flowbite, Nuxt UI, …) — arrangement only, our blocks (ADR-0003 / UI-LIBRARIES).
 *
 * Cards are the insert hit target. Preview / Duplicate stop the card click.
 * Cards are also draggable onto the canvas (`insert-block` / `insert-template`).
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
    /** Canvas selection — enables “Save selection” on the Assets tab. */
    selection?: Section[]
    /** Mirrors `page:write`. Hides save / insert affordances when false. */
    canWrite?: boolean
  }>(),
  { maxPerformanceClass: 'D', theme: null, selection: () => [], canWrite: false },
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
    },
  ]
}>()

const api = useApi()

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

  previouslyFocused?.focus()
  previouslyFocused = null
})

onBeforeUnmount(() => {
  previouslyFocused = null
})

// endregion

// region Shared

const tab = ref<'sections' | 'templates' | 'assets' | 'backgrounds'>('sections')
/** Platform registry blocks vs MotionSites section recipes (same Dropbox library). */
const sectionSource = ref<'platform' | 'motionsites'>('platform')

function onAssetInsert(sections: Section[]) {
  if (!sections.length) return
  emit('insert-sections', sections)
  open.value = false
}

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

const blockSearch = ref('')
/** Empty string = All categories. */
const blockCategory = ref<'' | BlockCategory>('')

/** Everything the budget allows, before any facet narrows it further. */
const affordableBlocks = computed(() =>
  registry.filter((block) => CLASS_ORDER[block.performanceClass]! <= ceiling.value),
)

const searchedBlocks = computed(() => {
  const term = blockSearch.value.trim().toLowerCase()
  if (!term) return affordableBlocks.value
  return affordableBlocks.value.filter((block) =>
    `${block.name} ${block.description} ${block.capabilities.join(' ')} ${block.tags.join(' ')} ${block.category}`
      .toLowerCase()
      .includes(term),
  )
})

const categoryRail = computed(() => {
  const counts = new Map<string, number>()
  for (const block of searchedBlocks.value) {
    counts.set(block.category, (counts.get(block.category) ?? 0) + 1)
  }

  return [
    { value: '' as const, label: 'All', count: searchedBlocks.value.length },
    ...BLOCK_CATEGORIES.map((value) => ({
      value,
      label: titleCase(value),
      count: counts.get(value) ?? 0,
    })).filter((entry) => entry.count > 0 || !blockSearch.value.trim()),
  ]
})

const blockResults = computed<RegistryBlockMetadata[]>(() => {
  if (!blockCategory.value) return searchedBlocks.value
  return searchedBlocks.value.filter((block) => block.category === blockCategory.value)
})

/** How many sections the budget is hiding, stated rather than left as a gap. */
const hiddenByCeiling = computed(() => registry.length - affordableBlocks.value.length)

const activeCategoryLabel = computed(() =>
  blockCategory.value ? titleCase(blockCategory.value) : 'All sections',
)

function insertBlock(blockId: string) {
  emit('insert', { blockIds: [blockId], source: 'block' })
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
  emit('insert', {
    blockIds: target.blockIds,
    source: target.templateId ? 'template' : 'block',
    templateId: target.templateId,
    motionTypes: target.motionTypes,
  })
  previewOpen.value = false
}

function duplicateFromPreview() {
  insertFromPreview()
}

// endregion

// region Templates tab

const templateSearch = ref('')
/** Empty = all collections. */
const templateCollection = ref('')

// Lazy and unawaited: the panel mounts inside an already-hydrated editor, and
// an async `setup` there would re-suspend the page and blank the canvas.
const { data: templateCollections } = useAsyncData(
  'insert-panel:template-collections',
  () => api.get<TemplateCollection[]>('/api/v1/templates/collections'),
  { lazy: true, default: () => [] as TemplateCollection[] },
)

const { data: allTemplates, status: templateStatus, error: templateError } = useAsyncData(
  'insert-panel:templates',
  () => api.get<SiteTemplate[]>('/api/v1/templates', { limit: 300 }),
  { lazy: true, default: () => [] as SiteTemplate[] },
)

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
      const blocks = known.filter((block) => CLASS_ORDER[block.performanceClass]! <= ceiling.value)

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
 * One event, one undo. The ids are the already-filtered list the card showed,
 * so what gets inserted is exactly what was promised.
 */
function insertTemplate(entry: InsertableTemplate) {
  if (entry.template.islandReady) {
    emit('insert-sections', [
      createSection('motion-section-01', {
        sectionId: entry.template.id,
        title: entry.template.title,
        minHeight: '100vh',
      }),
    ])
    return
  }
  emit('insert', {
    blockIds: entry.blockIds,
    source: 'template',
    templateId: entry.template.id,
    motionTypes: motionTypesForTemplate(entry),
  })
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

const motionSectionResults = computed(() =>
  insertable.value.filter(
    (entry) => entry.template.pageType === 'section' || entry.blockIds.length === 1,
  ),
)

const motionSectionRail = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of motionSectionResults.value) {
    counts.set(entry.template.collection, (counts.get(entry.template.collection) ?? 0) + 1)
  }
  return [
    { value: '', label: 'All', count: motionSectionResults.value.length },
    ...(templateCollections.value ?? [])
      .map((entry) => ({
        value: entry.id,
        label: entry.label,
        count: counts.get(entry.id) ?? 0,
      }))
      .filter((entry) => entry.count > 0),
  ]
})

const motionSectionCollection = ref('')

const motionSectionFiltered = computed(() => {
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

function insertMotionSection(entry: InsertableTemplate) {
  if (suppressCardClick) {
    suppressCardClick = false
    return
  }
  if (entry.template.islandReady) {
    emit('insert-sections', [
      createSection('motion-section-01', {
        sectionId: entry.template.id,
        title: entry.template.title,
        minHeight: '100vh',
      }),
    ])
    return
  }
  emit('insert', {
    blockIds: entry.blockIds,
    source: 'template',
    templateId: entry.template.id,
    motionTypes: motionTypesForTemplate(entry),
  })
}

function rebuildMotionSection(entry: InsertableTemplate, event?: Event) {
  event?.stopPropagation()
  // Exact React islands are curated builds — do not feed the prompt into copy AI.
  if (entry.template.islandReady) {
    insertMotionSection(entry)
    open.value = false
    return
  }
  emit('rebuild-ai', {
    instruction:
      entry.template.sourcePrompt.trim() ||
      `Rebuild this section in the spirit of MotionSites “${entry.template.title}” — cinematic motion, theme colours only, no third-party assets.`,
    blockIds: entry.blockIds,
    motionTypes: motionTypesForTemplate(entry),
    templateId: entry.template.id,
    previewImage: entry.template.previewImage || undefined,
    previewVideo: entry.template.previewVideo || undefined,
  })
  open.value = false
}

// endregion

// region Backgrounds tab

const backgroundSearch = ref('')
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

function applyBackground(entry: MotionBackground) {
  if (suppressCardClick) {
    suppressCardClick = false
    return
  }
  emit('rebuild-ai', {
    instruction: entry.rebuildPrompt,
    blockIds: [entry.seedBlockId],
    motionTypes: ['entrance', 'scroll-reveal'],
    previewImage: entry.previewImage || undefined,
    previewVideo: entry.previewVideo || undefined,
  })
  open.value = false
}

function hasPreviewMedia(image?: string, video?: string) {
  return Boolean(image?.trim() || video?.trim())
}

// endregion
</script>

<template>
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
      class="editor-chrome absolute inset-y-0 left-0 z-[var(--z-editor-panel)] flex flex-col border-r border-line bg-raised shadow-float outline-none will-change-transform transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      :class="tab === 'templates' ? 'w-[min(72rem,calc(100%-1rem))]' : 'w-[min(44rem,calc(100%-3rem))]'"
      @keydown="onKeydown"
    >
      <!-- header ------------------------------------------------------- -->
      <header class="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5">
        <p class="type-button text-ink">Add a section</p>
        <button
          type="button"
          class="-mr-1 grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink"
          aria-label="Close the insert panel"
          @click="open = false"
        >&times;</button>
      </header>

      <!-- tabs --------------------------------------------------------- -->
      <div class="flex gap-1 border-b border-line px-2 py-1.5" role="tablist" aria-label="What to insert">
        <button
          v-for="entry in (['sections', 'templates', 'backgrounds', 'assets'] as const)"
          :key="entry"
          type="button"
          role="tab"
          :aria-selected="tab === entry"
          class="flex-1 rounded-md px-2 py-1.5 type-button-12 capitalize transition-colors"
          :class="tab === entry ? 'bg-sunken text-ink' : 'text-soft hover:text-ink'"
          @click="tab = entry"
        >{{ entry }}</button>
      </div>

      <!-- sections ------------------------------------------------------ -->
      <div v-if="tab === 'sections'" class="flex min-h-0 flex-1 flex-col">
        <div class="flex gap-1 border-b border-line px-2 py-1.5" role="tablist" aria-label="Section source">
          <button
            type="button"
            role="tab"
            :aria-selected="sectionSource === 'platform'"
            class="flex-1 rounded-md px-2 py-1 type-button-10 transition-colors"
            :class="sectionSource === 'platform' ? 'bg-sunken text-ink' : 'text-soft hover:text-ink'"
            @click="sectionSource = 'platform'"
          >Platform blocks</button>
          <button
            type="button"
            role="tab"
            :aria-selected="sectionSource === 'motionsites'"
            class="flex-1 rounded-md px-2 py-1 type-button-10 transition-colors"
            :class="sectionSource === 'motionsites' ? 'bg-sunken text-ink' : 'text-soft hover:text-ink'"
            @click="sectionSource = 'motionsites'"
          >MotionSites</button>
        </div>

        <div v-if="sectionSource === 'platform'" class="flex min-h-0 flex-1">
          <!-- Category rail -->
          <nav
            class="flex w-[11.5rem] shrink-0 flex-col border-r border-line bg-paper"
            aria-label="Section categories"
          >
            <div class="sticky top-0 z-10 border-b border-line bg-paper p-2.5">
              <UiInput v-model="blockSearch" placeholder="Search…" aria-label="Search sections" />
            </div>
            <ul class="min-h-0 flex-1 overflow-y-auto py-1.5">
              <li v-for="entry in categoryRail" :key="entry.value || 'all'">
                <button
                  type="button"
                  class="relative flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors"
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
                    class="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span class="type-button-12 truncate">{{ entry.label }}</span>
                  <span class="type-button-10 tabular-nums text-faint">{{ entry.count }}</span>
                </button>
              </li>
            </ul>
            <p v-if="hiddenByCeiling" class="border-t border-line px-2.5 py-2 type-caption-12 leading-snug text-faint">
              {{ hiddenByCeiling }} hidden by class {{ maxPerformanceClass }} budget.
            </p>
          </nav>

          <!-- Variations -->
          <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div
                class="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-raised/95 px-4 py-3 backdrop-blur-md"
              >
                <h2 class="type-caption uppercase tracking-[0.12em] text-soft">{{ activeCategoryLabel }}</h2>
                <span class="rounded-md bg-sunken px-1.5 py-0.5 type-button-10 tabular-nums text-faint">
                  {{ blockResults.length }} variation{{ blockResults.length === 1 ? '' : 's' }}
                </span>
              </div>

              <div class="px-4 py-4">
                <ul class="flex flex-col gap-4">
                  <li
                    v-for="block in blockResults"
                    :key="block.id"
                    class="relative cursor-grab overflow-hidden rounded-xl border border-line bg-paper transition-[border-color,box-shadow] duration-150 hover:border-brand hover:shadow-raised focus-within:border-brand active:cursor-grabbing"
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
                      <UiBadge :tone="toneFor(block.performanceClass)">{{ block.performanceClass }}</UiBadge>
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
                        class="type-button-10 rounded-md border border-line bg-raised px-2 py-1 text-soft transition-colors hover:border-brand hover:text-brand"
                        :aria-label="`Live preview ${block.name}`"
                        title="Fullscreen live preview"
                        @click.stop="openBlockPreview(block, $event)"
                      >Preview</button>
                      <button
                        type="button"
                        class="type-button-10 rounded-md border border-line bg-raised px-2 py-1 text-soft transition-colors hover:border-brand hover:text-brand"
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
            class="flex w-[11.5rem] shrink-0 flex-col border-r border-line bg-paper"
            aria-label="MotionSites collections"
          >
            <div class="sticky top-0 z-10 border-b border-line bg-paper p-2.5">
              <UiInput v-model="blockSearch" placeholder="Search…" aria-label="Search MotionSites sections" />
            </div>
            <ul class="min-h-0 flex-1 overflow-y-auto py-1.5">
              <li v-for="entry in motionSectionRail" :key="entry.value || 'all'">
                <button
                  type="button"
                  class="relative flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors"
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
                    class="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span class="type-button-12 truncate">{{ entry.label }}</span>
                  <span class="type-button-10 tabular-nums text-faint">{{ entry.count }}</span>
                </button>
              </li>
            </ul>
          </nav>

          <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div
                class="sticky top-0 z-10 space-y-0 border-b border-line bg-raised/95 backdrop-blur-md"
              >
                <div class="flex items-center gap-2 px-4 py-3">
                  <h2 class="type-caption uppercase tracking-[0.12em] text-soft">MotionSites</h2>
                  <span class="rounded-md bg-sunken px-1.5 py-0.5 type-button-10 tabular-nums text-faint">
                    {{ motionSectionFiltered.length }}
                  </span>
                </div>
                <p class="border-t border-line px-4 py-2 type-caption-12 leading-relaxed text-soft">
                  Exact React islands when ready; otherwise our block recipe + Rebuild with AI.
                  <span class="text-ink">Add</span> inserts the island or recipe directly.
                </p>
              </div>
              <div class="px-4 py-4">
              <p v-if="templateStatus === 'pending'" class="py-8 text-center type-caption-12 text-faint">
                Loading MotionSites…
              </p>
              <ul v-else class="flex flex-col gap-4">
                <li
                  v-for="(entry, index) in motionSectionFiltered"
                  :key="entry.template.id"
                  class="relative cursor-pointer overflow-hidden rounded-xl border border-line bg-paper transition-[border-color,box-shadow] duration-150 hover:border-brand hover:shadow-raised"
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
                      <UiBadge v-if="entry.template.islandReady" tone="positive">Exact island</UiBadge>
                      <UiBadge v-else tone="warning">Preview only</UiBadge>
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
                        class="type-button-10 rounded-md border border-brand/40 bg-brand-soft px-2 py-1 text-brand transition-colors hover:border-brand"
                        @click.stop="rebuildMotionSection(entry, $event)"
                      >{{ entry.template.islandReady ? 'Add exact island' : 'Rebuild with AI' }}</button>
                    </div>
                  </div>
                </li>
              </ul>
              <UiEmptyState
                v-if="templateStatus !== 'pending' && !motionSectionFiltered.length"
                title="No MotionSites sections"
                description="Import from Dropbox with pnpm --filter @platform/templates import:motionsites"
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
          @update:search="templateSearch = $event"
          @update:collection="templateCollection = $event"
          @insert="insertTemplate"
          @fullscreen="openTemplatePreview($event)"
          @dragstart="onTemplateDragStart"
        />
      </div>

      <!-- backgrounds (MotionSites) ------------------------------------- -->
      <div v-if="tab === 'backgrounds'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="space-y-2 border-b border-line px-3 py-2.5">
          <p class="type-caption-12 leading-relaxed text-soft">
            MotionSites backgrounds as rebuild prompts. Click one to seed a section and open AI —
            no gated videos or CDN images ship to the page.
          </p>
          <div class="flex items-center gap-2">
            <UiInput
              v-model="backgroundSearch"
              class="min-w-0 flex-1"
              placeholder="Search backgrounds…"
              aria-label="Search backgrounds"
            />
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
                  <span class="shrink-0 type-button-10 text-white/80 group-hover:text-white">Rebuild →</span>
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

      <!-- assets / free libraries --------------------------------------- -->
      <div v-if="tab === 'assets'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <p class="border-b border-line px-3 py-2 type-caption-12 leading-relaxed text-soft">
          Every cleared UI library is listed (HyperUI, Flowbite, Nuxt UI, shadcn-vue, …).
          Click a preset to add it — our blocks only. Use Copy on the install command
          (<code class="text-ink">npx …</code> / pull) to download free source into
          <code class="text-ink">reference/</code> for new layouts.
        </p>
        <AssetsPanel
          class="min-h-0 flex-1"
          :selection="selection"
          :max-performance-class="maxPerformanceClass"
          :can-write="canWrite"
          :theme="theme"
          @insert="onAssetInsert"
        />
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
</template>
