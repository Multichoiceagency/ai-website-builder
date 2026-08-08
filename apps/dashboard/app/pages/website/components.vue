<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue'
import { COLLECTIONS, createSection, listBlockMetadata } from '@platform/blocks'
import {
  BLOCK_CATEGORIES,
  COMPONENT_TARGET_LABELS,
  type ComponentTarget,
  type GenerateComponentResult,
  type RegistryBlockMetadata,
  type Section,
  type Site,
  type SiteTemplate,
  type TemplateCollection,
} from '@platform/schemas'
import {
  brandFromIslandId,
  detectExactIslandIntent,
  isMotionsitesCodegenBrief,
  MOTIONSITES_ISLAND_HEADER_BLOCK,
} from '@platform/templates'
import { resolveLightTokens, siteColorVariables, siteShapeVariables } from '@platform/theming'
import {
  CATALOG_SOURCE_LABELS,
  COMPONENT_CATALOG_TABS,
  type ComponentCatalogTab,
  emptyLayoutBlocks,
  isMotionsitesIsland,
  isShadcnSpaceId,
  isMagicUiId,
  isStudioId,
  isUiLibraryTemplate,
  motionToolBlocks,
  platformLabBlocks,
} from '../../utils/catalog-split'

/**
 * Component lab — Blocks · MotionSites · Motion tools · UI libraries · Empty/Manual layout.
 * Taxonomy mirrors InsertPanel (featured Motion tools = scroll-video-scrub-01).
 */
provide('platformBlockPreview', true)
const api = useApi()
const activeSiteId = useActiveSiteId()
const can = useCan()
const {
  pages,
  busy: appending,
  error: appendError,
  appendSections,
  appendBlockIds,
  appendToDefaultPage,
  defaultPageId,
} = useAppendBlocksToPage()

const registry = listBlockMetadata()
const catalog = ref<ComponentCatalogTab>('blocks')

const { data: site } = await useAsyncData(
  () => `website:components:site:${activeSiteId.value}`,
  () => (activeSiteId.value ? api.get<Site>(`/api/v1/sites/${activeSiteId.value}`) : Promise.resolve(null)),
  { watch: [activeSiteId] },
)

const { data: catalogTemplates, status: motionStatus } = useAsyncData(
  'website:components:motionsites',
  () => api.get<SiteTemplate[]>('/api/v1/templates', { limit: 500 }),
  { lazy: true, default: () => [] as SiteTemplate[] },
)

const { data: templateCollections } = useAsyncData(
  'website:components:template-collections',
  () => api.get<TemplateCollection[]>('/api/v1/templates/collections'),
  { lazy: true, default: () => [] as TemplateCollection[] },
)

const search = ref('')
const collection = ref('')
const category = ref('')
const style = ref('')
const industry = ref('')
const performanceClass = ref('')
const previewTheme = ref<'site' | 'light' | 'dark'>('site')
const pageTarget = ref('')
const motionCollection = ref('')
const uiLibraryFilter = ref<'all' | 'shadcnspace' | 'magicui' | 'studio'>('all')
const activeMotionId = ref('')

watch(
  pages,
  (list) => {
    if (!pageTarget.value && list?.length) pageTarget.value = defaultPageId() ?? list[0]!.id
  },
  { immediate: true },
)

watch(catalog, () => {
  search.value = ''
  category.value = ''
  motionCollection.value = ''
  uiLibraryFilter.value = 'all'
})

const SCORE_METRICS = [
  { key: 'performance', label: 'Perf' },
  { key: 'accessibility', label: 'A11y' },
  { key: 'mobile', label: 'Mobile' },
] as const

const platformBlocks = computed(() => platformLabBlocks(registry))
const motionToolList = computed(() => motionToolBlocks(registry))
const emptyBlockList = computed(() => emptyLayoutBlocks(registry))

function uniqueValues(blocks: RegistryBlockMetadata[], pick: (block: RegistryBlockMetadata) => string[]) {
  return [...new Set(blocks.flatMap(pick))].filter((value) => value !== '*').sort()
}

const COLLECTION_OPTIONS = [
  { label: 'All collections', value: '' },
  ...COLLECTIONS.map((entry) => ({ label: entry.name, value: entry.id })),
]
const STYLE_OPTIONS = computed(() => [
  { label: 'Any style', value: '' },
  ...uniqueValues(platformBlocks.value, (block) => block.style).map((value) => ({ label: value, value })),
])
const INDUSTRY_OPTIONS = computed(() => [
  { label: 'Any industry', value: '' },
  ...uniqueValues(platformBlocks.value, (block) => block.industries).map((value) => ({
    label: value.replace(/_/g, ' '),
    value,
  })),
])
const CLASS_OPTIONS = [
  { label: 'Any weight', value: '' },
  { label: 'A — static markup', value: 'A' },
  { label: 'B — light motion', value: 'B' },
  { label: 'C — scroll-linked', value: 'C' },
  { label: 'D — cinematic', value: 'D' },
]
const THEME_OPTIONS = [
  { label: 'This website’s theme', value: 'site' },
  { label: 'Light preview', value: 'light' },
  { label: 'Dark preview', value: 'dark' },
]
const UI_LIBRARY_OPTIONS = [
  { label: 'All libraries', value: 'all' },
  { label: CATALOG_SOURCE_LABELS.shadcnspace, value: 'shadcnspace' },
  { label: CATALOG_SOURCE_LABELS.magicui, value: 'magicui' },
  { label: CATALOG_SOURCE_LABELS.studio, value: 'studio' },
] as const

const PAGE_OPTIONS = computed(() =>
  (pages.value ?? []).map((page) => ({
    label: `${page.title} (${page.path})`,
    value: page.id,
  })),
)

function filterBlocks(blocks: RegistryBlockMetadata[]) {
  const term = search.value.trim().toLowerCase()
  return blocks.filter((block) => {
    if (collection.value && block.collection !== collection.value) return false
    if (category.value && block.category !== category.value) return false
    if (style.value && !block.style.includes(style.value)) return false
    if (industry.value && !block.industries.includes('*') && !block.industries.includes(industry.value)) {
      return false
    }
    if (performanceClass.value && block.performanceClass !== performanceClass.value) return false
    if (!term) return true
    return `${block.id} ${block.name} ${block.description} ${block.capabilities.join(' ')} ${block.tags.join(' ')}`
      .toLowerCase()
      .includes(term)
  })
}

const blockPool = computed(() => {
  if (catalog.value === 'motionTools') return motionToolList.value
  if (catalog.value === 'empty') return emptyBlockList.value
  return platformBlocks.value
})

const results = computed(() => filterBlocks(blockPool.value))

const categoryRail = computed(() => {
  const counts = new Map<string, number>()
  for (const block of results.value) {
    counts.set(block.category, (counts.get(block.category) ?? 0) + 1)
  }
  return [
    { value: '', label: 'All', count: results.value.length },
    ...BLOCK_CATEGORIES.map((value) => ({
      value,
      label: value[0]!.toUpperCase() + value.slice(1),
      count: counts.get(value) ?? 0,
    })).filter((entry) => entry.count > 0 || !search.value.trim()),
  ]
})

const visibleBlocks = computed(() => {
  if (!category.value) return results.value
  return results.value.filter((block) => block.category === category.value)
})

const groups = computed(() =>
  COLLECTIONS.map((entry) => ({
    ...entry,
    blocks: visibleBlocks.value.filter((block) => block.collection === entry.id),
  })).filter((group) => group.blocks.length),
)

/** MotionSites islands only — page recipes live under Templates. */
const motionTemplates = computed(() => (catalogTemplates.value ?? []).filter(isMotionsitesIsland))

const motionFiltered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return motionTemplates.value.filter((template) => {
    if (motionCollection.value && template.collection !== motionCollection.value) return false
    if (performanceClass.value && template.performanceClass !== performanceClass.value) return false
    if (!term) return true
    return `${template.title} ${template.category} ${template.sourcePrompt} ${template.id}`
      .toLowerCase()
      .includes(term)
  })
})

const motionRail = computed(() => {
  const counts = new Map<string, number>()
  for (const template of motionTemplates.value) {
    counts.set(template.collection, (counts.get(template.collection) ?? 0) + 1)
  }
  return [
    { value: '', label: 'All', count: motionTemplates.value.length },
    ...(templateCollections.value ?? [])
      .map((entry) => ({
        value: entry.id,
        label: entry.label,
        count: counts.get(entry.id) ?? 0,
      }))
      .filter((entry) => entry.count > 0),
  ]
})

const uiLibraryTemplates = computed(() => (catalogTemplates.value ?? []).filter(isUiLibraryTemplate))

const uiLibraryFiltered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return uiLibraryTemplates.value.filter((template) => {
    if (uiLibraryFilter.value === 'shadcnspace' && !isShadcnSpaceId(template.id)) return false
    if (uiLibraryFilter.value === 'magicui' && !isMagicUiId(template.id)) return false
    if (uiLibraryFilter.value === 'studio' && !isStudioId(template.id)) return false
    if (performanceClass.value && template.performanceClass !== performanceClass.value) return false
    if (!term) return true
    return `${template.title} ${template.category} ${template.sourcePrompt} ${template.id}`
      .toLowerCase()
      .includes(term)
  })
})

const tabCounts = computed(() => ({
  blocks: platformBlocks.value.length,
  motionsites: motionTemplates.value.length,
  motionTools: motionToolList.value.length,
  uiLibraries: uiLibraryTemplates.value.length,
  empty: emptyBlockList.value.length,
}))

const headerDescription = computed(() => {
  switch (catalog.value) {
    case 'motionsites':
      return `${motionTemplates.value.length} MotionSites islands — live when ready, otherwise Generate live. Full-page Motionsites recipes are under Templates.`
    case 'motionTools':
      return 'Featured Motion tools (same pins as Insert → Motion tools), including scroll video scrub.'
    case 'uiLibraries':
      return `${uiLibraryTemplates.value.length} Shadcn Space, Magic UI, and Studio section recipes.`
    case 'empty':
      return emptyBlockList.value.length
        ? 'Blank / freeform layout sections for building by hand.'
        : 'Empty layout canvas will appear here when layout-canvas-01 is in the registry.'
    default:
      return `${platformBlocks.value.length} installed blocks across ${COLLECTIONS.length} collections — live previews in your site theme.`
  }
})

const resultLabel = computed(() => {
  switch (catalog.value) {
    case 'motionsites':
      return `${motionFiltered.value.length} of ${motionTemplates.value.length} MotionSites`
    case 'uiLibraries':
      return `${uiLibraryFiltered.value.length} of ${uiLibraryTemplates.value.length} UI library recipes`
    case 'motionTools':
      return `${visibleBlocks.value.length} of ${motionToolList.value.length} Motion tools`
    case 'empty':
      return emptyBlockList.value.length
        ? `${visibleBlocks.value.length} of ${emptyBlockList.value.length} empty layouts`
        : 'No empty layout block yet'
    default:
      return `${visibleBlocks.value.length} of ${platformBlocks.value.length} components${
        site.value?.theme ? ` · preview uses ${site.value.name}` : ''
      }`
  }
})

const searchPlaceholder = computed(() => {
  switch (catalog.value) {
    case 'motionsites':
      return 'Search MotionSites…'
    case 'uiLibraries':
      return 'Search UI libraries…'
    case 'motionTools':
      return 'Search Motion tools…'
    case 'empty':
      return 'Search empty layouts…'
    default:
      return 'Search components…'
  }
})

function hasPreviewMedia(image?: string, video?: string) {
  return Boolean(image?.trim() || video?.trim())
}

function motionIslandSections(templateId: string, title: string): Section[] {
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

function seedTemplateSections(template: SiteTemplate): Section[] {
  const islandId = detectExactIslandIntent(template.sourcePrompt)
  if (template.islandReady || islandId) {
    return motionIslandSections(islandId || template.id, template.title)
  }

  const seedId =
    template.previewVideo?.trim()
      ? 'hero-cover-statement-01'
      : template.blockRecipe[0] || 'hero-cover-statement-01'
  const props: Record<string, unknown> = {}
  if (template.previewImage?.trim()) props.image = template.previewImage
  if (template.previewVideo?.trim()) props.video = template.previewVideo
  try {
    return [createSection(seedId, props)]
  } catch {
    return [createSection('hero-cover-statement-01', props)]
  }
}

const mounted = ref(new Set<string>())
const sections = new Map<string, Section>()
const observed = new Map<Element, string>()
let observer: IntersectionObserver | null = null

function sectionFor(blockId: string): Section {
  const existing = sections.get(blockId)
  if (existing) return existing
  const section = createSection(blockId)
  sections.set(blockId, section)
  return section
}

function ensureObserver() {
  if (observer || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const id = observed.get(entry.target)
        if (!id) continue
        mounted.value = new Set([...mounted.value, id])
        observer?.unobserve(entry.target)
        observed.delete(entry.target)
      }
    },
    { rootMargin: '400px 0px' },
  )
}

function watchFrame(element: unknown, blockId: string) {
  if (!(element instanceof HTMLElement)) return
  if (mounted.value.has(blockId)) return
  ensureObserver()
  if (!observer) {
    mounted.value = new Set([...mounted.value, blockId])
    return
  }
  observed.set(element, blockId)
  observer.observe(element)
}

watch(visibleBlocks, () => {
  observed.clear()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

const LIGHT_THEME: Record<string, string> = {
  '--site-primary': '#1d4ed8',
  '--site-accent': '#0f766e',
  '--site-surface': '#ffffff',
  '--site-surface-alt': '#f1f5f9',
  '--site-text': '#18181b',
  '--site-text-muted': '#52525b',
  '--site-line': '#e4e4e7',
  '--site-radius': '0.5rem',
  '--site-font-heading': 'ui-sans-serif, system-ui, sans-serif',
  '--site-font-body': 'ui-sans-serif, system-ui, sans-serif',
}

const DARK_THEME: Record<string, string> = {
  ...LIGHT_THEME,
  '--site-primary': '#818cf8',
  '--site-accent': '#5eead4',
  '--site-surface': '#0b0b0f',
  '--site-surface-alt': '#15151c',
  '--site-text': '#f4f4f5',
  '--site-text-muted': '#a1a1aa',
  '--site-line': '#27272a',
}

const siteThemeVars = computed(() => {
  const theme = site.value?.theme
  if (!theme) return null
  const tokens = resolveLightTokens(theme)
  return {
    ...siteColorVariables(tokens),
    ...siteShapeVariables(theme),
  }
})

const activeTheme = computed(() => {
  if (previewTheme.value === 'site' && siteThemeVars.value) return siteThemeVars.value
  if (previewTheme.value === 'dark') return DARK_THEME
  return LIGHT_THEME
})

const previewSurface = computed(() => activeTheme.value['--site-surface'] ?? '#ffffff')

const themeVars = computed(() => ({
  ...activeTheme.value,
  backgroundColor: previewSurface.value,
  color: activeTheme.value['--site-text'] ?? '#18181b',
  fontFamily: activeTheme.value['--site-font-body'] ?? 'inherit',
}))

const expanded = ref(new Set<string>())

function toggleExpanded(blockId: string) {
  const next = new Set(expanded.value)
  if (next.has(blockId)) next.delete(blockId)
  else next.add(blockId)
  expanded.value = next
}

function toneFor(value: string) {
  if (value === 'A') return 'positive'
  if (value === 'B') return 'neutral'
  return 'warning'
}

function scoreTone(score: number) {
  if (score >= 95) return 'positive'
  if (score >= 85) return 'neutral'
  return 'warning'
}

async function addToPage(blockId: string) {
  if (pageTarget.value) await appendBlockIds(pageTarget.value, [blockId])
  else await appendToDefaultPage([blockId])
}

const generatingMotionId = ref<string | null>(null)
const generateComponentOpen = ref(false)

const assignedTargets = computed(() => {
  const map = site.value?.componentTargets ?? {}
  return (Object.entries(map) as [ComponentTarget, NonNullable<(typeof map)[ComponentTarget]>][])
    .filter(([, assignment]) => Boolean(assignment))
    .map(([target, assignment]) => ({
      target,
      label: COMPONENT_TARGET_LABELS[target],
      assignment,
    }))
})

async function onComponentGenerated(result: GenerateComponentResult) {
  if (activeSiteId.value) {
    await refreshNuxtData(`website:components:site:${activeSiteId.value}`).catch(() => undefined)
  }
  if (result.pageId) await navigateTo(`/pages/${result.pageId}`)
}

async function addMotionToPage(template: SiteTemplate) {
  const pageId = pageTarget.value || defaultPageId()
  if (!pageId) {
    appendError.value = 'Create a page first under Website → Pages.'
    return
  }

  const islandId = detectExactIslandIntent(template.sourcePrompt)
  if (template.islandReady || islandId) {
    await appendSections(pageId, motionIslandSections(islandId || template.id, template.title))
    return
  }

  const brief = template.sourcePrompt.trim()
  if (brief && isMotionsitesCodegenBrief(brief)) {
    generatingMotionId.value = template.id
    appendError.value = ''
    try {
      const result = await api.post<{ sectionId: string }>('/api/v1/ai/motionsites-generate-live', {
        brief,
        templateId: template.id,
        title: template.title,
        previewImage: template.previewImage || undefined,
        previewVideo: template.previewVideo || undefined,
      })
      await appendSections(pageId, motionIslandSections(result.sectionId, template.title))
    } catch (error) {
      appendError.value =
        error instanceof Error ? error.message : 'Could not generate a live Motionsites island.'
    } finally {
      generatingMotionId.value = null
    }
    return
  }

  await appendSections(pageId, seedTemplateSections(template))
}

async function addUiLibraryToPage(template: SiteTemplate) {
  const pageId = pageTarget.value || defaultPageId()
  if (!pageId) {
    appendError.value = 'Create a page first under Website → Pages.'
    return
  }
  if (template.blockRecipe.length) {
    await appendBlockIds(pageId, template.blockRecipe)
    return
  }
  await appendSections(pageId, seedTemplateSections(template))
}

const showBlockFacets = computed(() => catalog.value === 'blocks')
const showPreviewTheme = computed(() => catalog.value === 'blocks' || catalog.value === 'motionTools')
const showBlockGrid = computed(
  () => catalog.value === 'blocks' || catalog.value === 'motionTools' || catalog.value === 'empty',
)
</script>

<template>
  <div>
    <UiPageHeader title="Components" :description="headerDescription">
      <template #actions>
        <UiButton
          v-if="activeSiteId && can('ai:use')"
          size="sm"
          variant="primary"
          @click="generateComponentOpen = true"
        >Generate component</UiButton>
        <UiButton size="sm" to="/website/theme">Theme</UiButton>
        <UiButton size="sm" to="/website/style-guide">Style Guide</UiButton>
        <UiButton size="sm" to="/website/templates">Templates</UiButton>
      </template>
    </UiPageHeader>

    <UiEmptyState
      v-if="!activeSiteId"
      title="No website selected"
      description="Pick a website in the sidebar, then browse components in that site’s colours."
    />

    <template v-else>
      <UiCard v-if="assignedTargets.length" class="mb-5">
        <h2 class="mb-2 text-sm font-semibold text-ink">Assigned system targets</h2>
        <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <li
            v-for="entry in assignedTargets"
            :key="entry.target"
            class="rounded-md border border-line bg-sunken px-3 py-2"
          >
            <p class="type-caption-12 font-semibold text-ink">{{ entry.label }}</p>
            <p class="truncate type-caption-12 text-soft">
              {{ entry.assignment.block }}
              <template v-if="entry.assignment.sectionId">
                · {{ entry.assignment.sectionId }}
              </template>
            </p>
            <p v-if="entry.assignment.title" class="truncate type-caption-12 text-faint">
              {{ entry.assignment.title }}
            </p>
          </li>
        </ul>
      </UiCard>

      <UiCard class="mb-5">
        <div class="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Component catalogue">
          <button
            v-for="option in COMPONENT_CATALOG_TABS"
            :key="option.value"
            type="button"
            role="tab"
            class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors"
            :class="
              catalog === option.value
                ? 'bg-brand-soft text-brand'
                : 'bg-sunken text-soft hover:text-ink'
            "
            :aria-selected="catalog === option.value"
            @click="catalog = option.value"
          >
            {{ option.label }}
            <span class="ml-1 tabular-nums text-faint">{{ tabCounts[option.value] }}</span>
          </button>
        </div>

        <CatalogFilterChrome
          :search="search"
          :search-placeholder="searchPlaceholder"
          :result-label="resultLabel"
          :show-page-target="PAGE_OPTIONS.length > 0 && can('page:write')"
          :page-target="pageTarget"
          :page-options="PAGE_OPTIONS"
          @update:search="search = $event"
          @update:page-target="pageTarget = $event"
        >
          <template #filters>
            <UiSelect
              v-if="showBlockFacets"
              v-model="collection"
              :options="COLLECTION_OPTIONS"
            />
            <UiSelect v-if="showBlockFacets" v-model="style" :options="STYLE_OPTIONS" />
            <UiSelect v-if="showBlockFacets" v-model="industry" :options="INDUSTRY_OPTIONS" />
            <UiSelect
              v-if="catalog === 'uiLibraries'"
              v-model="uiLibraryFilter"
              :options="[...UI_LIBRARY_OPTIONS]"
            />
            <UiSelect
              v-if="catalog !== 'empty' || emptyBlockList.length"
              v-model="performanceClass"
              :options="CLASS_OPTIONS"
            />
            <UiSelect v-if="showPreviewTheme" v-model="previewTheme" :options="THEME_OPTIONS" />
          </template>
        </CatalogFilterChrome>
        <p v-if="appendError" class="mt-2 text-[0.8125rem] text-danger" role="alert">{{ appendError }}</p>
      </UiCard>

      <!-- MotionSites islands -->
      <div
        v-if="catalog === 'motionsites'"
        class="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)]"
      >
        <nav class="lg:sticky lg:top-4 lg:self-start" aria-label="MotionSites collections">
          <ul class="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            <li v-for="entry in motionRail" :key="entry.value || 'all'">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[0.8125rem] font-medium transition-colors"
                :class="
                  motionCollection === entry.value
                    ? 'bg-brand-soft text-brand'
                    : 'text-soft hover:bg-sunken hover:text-ink'
                "
                @click="motionCollection = entry.value"
              >
                <span class="truncate">{{ entry.label }}</span>
                <span class="tabular-nums text-[0.75rem] text-faint">{{ entry.count }}</span>
              </button>
            </li>
          </ul>
        </nav>

        <div>
          <p v-if="motionStatus === 'pending'" class="py-12 text-center text-[0.8125rem] text-soft">
            Loading MotionSites…
          </p>
          <UiEmptyState
            v-else-if="!motionFiltered.length"
            title="No MotionSites islands"
            description="Page-length Motionsites recipes are under Templates. Import islands with pnpm --filter @platform/templates import:motionsites, or clear filters."
          />
          <ul v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <li
              v-for="template in motionFiltered"
              :key="template.id"
              class="overflow-hidden rounded-xl border border-line bg-raised shadow-card"
              @mouseenter="activeMotionId = template.id"
              @mouseleave="activeMotionId = ''"
            >
              <div class="flex items-start justify-between gap-2 border-b border-line px-3 py-2.5">
                <div class="min-w-0">
                  <h3 class="truncate text-[0.9375rem] font-semibold text-ink">{{ template.title }}</h3>
                  <p class="mt-0.5 font-mono text-[0.6875rem] text-faint">{{ template.id }}</p>
                </div>
                <div class="flex shrink-0 flex-wrap justify-end gap-1">
                  <UiBadge v-if="template.islandReady" tone="positive">Live</UiBadge>
                  <UiBadge v-else-if="generatingMotionId === template.id" tone="brand">Generating…</UiBadge>
                  <UiBadge v-else tone="warning">Generate live</UiBadge>
                  <UiBadge tone="neutral">{{ template.category }}</UiBadge>
                </div>
              </div>
              <div class="relative aspect-video w-full overflow-hidden bg-[#0a0a0a]">
                <MotionPreviewMedia
                  v-if="hasPreviewMedia(template.previewImage, template.previewVideo)"
                  :preview-image="template.previewImage"
                  :preview-video="template.previewVideo"
                  :alt="template.title"
                  :play="activeMotionId === template.id"
                />
                <TemplatePreview
                  v-else
                  :block-ids="
                    template.islandReady ? ['motion-section-01'] : template.blockRecipe.slice(0, 3)
                  "
                  :theme="site?.theme ?? null"
                  :play="activeMotionId === template.id"
                  ratio="16 / 9"
                />
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5">
                <p class="line-clamp-2 min-w-0 flex-1 text-[0.75rem] leading-relaxed text-soft">
                  {{ template.sourcePrompt || template.blockRecipe.join(' · ') || 'MotionSites design' }}
                </p>
                <UiButton
                  v-if="can('page:write') && PAGE_OPTIONS.length"
                  variant="primary"
                  size="sm"
                  :loading="appending || generatingMotionId === template.id"
                  :disabled="Boolean(generatingMotionId)"
                  @click="addMotionToPage(template)"
                >
                  {{
                    template.islandReady
                      ? 'Add live island'
                      : generatingMotionId === template.id
                        ? 'Generating…'
                        : 'Generate live'
                  }}
                </UiButton>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- UI libraries -->
      <div v-else-if="catalog === 'uiLibraries'">
        <p v-if="motionStatus === 'pending'" class="py-12 text-center text-[0.8125rem] text-soft">
          Loading UI libraries…
        </p>
        <UiEmptyState
          v-else-if="!uiLibraryFiltered.length"
          title="No UI library recipes"
          description="Import Shadcn Space, Magic UI, or Studio templates, or clear filters."
        />
        <ul v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <li
            v-for="template in uiLibraryFiltered"
            :key="template.id"
            class="overflow-hidden rounded-xl border border-line bg-raised shadow-card"
          >
            <div class="flex items-start justify-between gap-2 border-b border-line px-3 py-2.5">
              <div class="min-w-0">
                <h3 class="truncate text-[0.9375rem] font-semibold text-ink">{{ template.title }}</h3>
                <p class="mt-0.5 font-mono text-[0.6875rem] text-faint">{{ template.id }}</p>
              </div>
              <UiBadge tone="neutral">
                {{
                  isShadcnSpaceId(template.id)
                    ? 'Shadcn Space'
                    : isMagicUiId(template.id)
                      ? 'Magic UI'
                      : 'Studio'
                }}
              </UiBadge>
            </div>
            <div class="relative aspect-video w-full overflow-hidden bg-sunken">
              <TemplatePreview
                :block-ids="template.blockRecipe.slice(0, 3)"
                :theme="site?.theme ?? null"
                ratio="16 / 9"
              />
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5">
              <p class="line-clamp-2 min-w-0 flex-1 text-[0.75rem] leading-relaxed text-soft">
                {{ template.sourcePrompt || template.blockRecipe.join(' · ') || 'UI library recipe' }}
              </p>
              <UiButton
                v-if="can('page:write') && PAGE_OPTIONS.length"
                variant="primary"
                size="sm"
                :loading="appending"
                @click="addUiLibraryToPage(template)"
              >
                Add to page
              </UiButton>
            </div>
          </li>
        </ul>
      </div>

      <!-- Blocks / Motion tools / Empty -->
      <div
        v-else-if="showBlockGrid"
        class="grid gap-5"
        :class="catalog === 'blocks' ? 'lg:grid-cols-[11rem_minmax(0,1fr)]' : ''"
      >
        <nav
          v-if="catalog === 'blocks'"
          class="lg:sticky lg:top-4 lg:self-start"
          aria-label="Categories"
        >
          <ul class="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            <li v-for="entry in categoryRail" :key="entry.value || 'all'">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[0.8125rem] font-medium transition-colors"
                :class="
                  category === entry.value
                    ? 'bg-brand-soft text-brand'
                    : 'text-soft hover:bg-sunken hover:text-ink'
                "
                @click="category = entry.value"
              >
                <span class="truncate">{{ entry.label }}</span>
                <span class="tabular-nums text-[0.75rem] text-faint">{{ entry.count }}</span>
              </button>
            </li>
          </ul>
        </nav>

        <div>
          <UiEmptyState
            v-if="catalog === 'empty' && !emptyBlockList.length"
            title="Empty/Manual layout"
            description="layout-canvas-01 is not in the registry yet. When it ships, it will appear here for freeform / manual layouts."
          />
          <UiEmptyState
            v-else-if="!visibleBlocks.length"
            title="Nothing matches those filters"
            description="Try a broader style or industry, or clear the performance class."
          />

          <section v-for="group in groups" :key="group.id" class="mb-10">
            <header class="mb-4">
              <h2 class="text-heading font-semibold text-ink">{{ group.name }}</h2>
              <p class="mt-1 max-w-3xl text-[0.875rem] text-soft">{{ group.description }}</p>
            </header>

            <div class="space-y-4">
              <UiCard v-for="block in group.blocks" :key="block.id" class="overflow-hidden">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="text-[0.9375rem] font-semibold text-ink">{{ block.name }}</h3>
                      <UiBadge :tone="toneFor(block.performanceClass)">Class {{ block.performanceClass }}</UiBadge>
                      <UiBadge tone="neutral">{{ block.category }}</UiBadge>
                      <UiBadge v-if="block.id === 'scroll-video-scrub-01'" tone="brand">Frame scrub</UiBadge>
                      <UiBadge v-else-if="catalog === 'motionTools'" tone="brand">Motion tool</UiBadge>
                    </div>
                    <p class="mt-1 font-mono text-[0.75rem] text-faint">{{ block.id }}</p>
                    <p class="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-soft">{{ block.description }}</p>
                  </div>

                  <dl class="flex shrink-0 gap-4">
                    <div v-for="metric in SCORE_METRICS" :key="metric.key" class="text-right">
                      <dt class="text-[0.6875rem] uppercase tracking-[0.1em] text-faint">{{ metric.label }}</dt>
                      <dd class="mt-1">
                        <UiBadge :tone="scoreTone(block.scores[metric.key])">{{ block.scores[metric.key] }}</UiBadge>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div
                  :ref="(element) => watchFrame(element, block.id)"
                  class="relative mt-4 overflow-hidden rounded-lg border border-line"
                  :class="expanded.has(block.id) ? '' : 'max-h-[24rem]'"
                  :style="themeVars"
                >
                  <BlockRenderer v-if="mounted.has(block.id)" :sections="[sectionFor(block.id)]" />
                  <div v-else class="grid h-40 place-items-center text-[0.8125rem] text-soft">Loading preview…</div>

                  <span
                    v-if="!expanded.has(block.id)"
                    class="pointer-events-none absolute inset-x-0 bottom-0 h-16"
                    :style="{ background: `linear-gradient(to bottom, transparent, ${previewSurface})` }"
                    aria-hidden="true"
                  />
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-3">
                  <UiButton
                    v-if="can('page:write') && PAGE_OPTIONS.length"
                    variant="primary"
                    size="sm"
                    :loading="appending"
                    @click="addToPage(block.id)"
                  >
                    Add to page
                  </UiButton>
                  <UiButton variant="ghost" size="sm" @click="toggleExpanded(block.id)">
                    {{ expanded.has(block.id) ? 'Collapse' : 'Show full' }}
                  </UiButton>
                  <p class="text-[0.75rem] text-faint">
                    {{ block.fields.length }} fields · {{ block.industries.join(', ') }}
                  </p>
                </div>
              </UiCard>
            </div>
          </section>
        </div>
      </div>
    </template>

    <GenerateComponentDialog
      v-model:open="generateComponentOpen"
      :site-id="activeSiteId"
      :page-id="pageTarget || null"
      default-target="product-card"
      @generated="onComponentGenerated"
    />
  </div>
</template>
