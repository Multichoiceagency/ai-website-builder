<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { COLLECTIONS, createSection, listBlockMetadata } from '@platform/blocks'
import { BLOCK_CATEGORIES, type RegistryBlockMetadata, type Section, type Site } from '@platform/schemas'
import { resolveLightTokens, siteColorVariables, siteShapeVariables } from '@platform/theming'

/**
 * The component lab — every installed registry block, live at defaults, painted
 * in the active site's theme. Add-to-page appends a section and opens the editor.
 */
const api = useApi()
const activeSiteId = useActiveSiteId()
const can = useCan()
const {
  pages,
  busy: appending,
  error: appendError,
  appendBlockIds,
  appendToDefaultPage,
  defaultPageId,
} = useAppendBlocksToPage()

const all = listBlockMetadata()

const { data: site } = await useAsyncData(
  () => `website:components:site:${activeSiteId.value}`,
  () => (activeSiteId.value ? api.get<Site>(`/api/v1/sites/${activeSiteId.value}`) : Promise.resolve(null)),
  { watch: [activeSiteId] },
)

const search = ref('')
const collection = ref('')
const category = ref('')
const style = ref('')
const industry = ref('')
const performanceClass = ref('')
const previewTheme = ref<'site' | 'light' | 'dark'>('site')
const pageTarget = ref('')

watch(
  pages,
  (list) => {
    if (!pageTarget.value && list?.length) pageTarget.value = defaultPageId() ?? list[0]!.id
  },
  { immediate: true },
)

const SCORE_METRICS = [
  { key: 'performance', label: 'Perf' },
  { key: 'accessibility', label: 'A11y' },
  { key: 'mobile', label: 'Mobile' },
] as const

function uniqueValues(pick: (block: RegistryBlockMetadata) => string[]) {
  return [...new Set(all.flatMap(pick))].filter((value) => value !== '*').sort()
}

const COLLECTION_OPTIONS = [
  { label: 'All collections', value: '' },
  ...COLLECTIONS.map((entry) => ({ label: entry.name, value: entry.id })),
]
const STYLE_OPTIONS = [
  { label: 'Any style', value: '' },
  ...uniqueValues((block) => block.style).map((value) => ({ label: value, value })),
]
const INDUSTRY_OPTIONS = [
  { label: 'Any industry', value: '' },
  ...uniqueValues((block) => block.industries).map((value) => ({ label: value.replace(/_/g, ' '), value })),
]
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

const PAGE_OPTIONS = computed(() =>
  (pages.value ?? []).map((page) => ({
    label: `${page.title} (${page.path})`,
    value: page.id,
  })),
)

const results = computed<RegistryBlockMetadata[]>(() => {
  const term = search.value.trim().toLowerCase()

  return all.filter((block) => {
    if (collection.value && block.collection !== collection.value) return false
    if (category.value && block.category !== category.value) return false
    if (style.value && !block.style.includes(style.value)) return false
    if (industry.value && !block.industries.includes('*') && !block.industries.includes(industry.value)) return false
    if (performanceClass.value && block.performanceClass !== performanceClass.value) return false
    if (!term) return true
    return `${block.id} ${block.name} ${block.description} ${block.capabilities.join(' ')} ${block.tags.join(' ')}`
      .toLowerCase()
      .includes(term)
  })
})

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
</script>

<template>
  <div>
    <UiPageHeader
      title="Components"
      :description="`${all.length} installed blocks across ${COLLECTIONS.length} collections — live previews in your site theme. Add one to a page to edit it.`"
    >
      <template #actions>
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
      <UiCard class="mb-5">
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <UiInput v-model="search" placeholder="Search components…" />
          <UiSelect v-model="collection" :options="COLLECTION_OPTIONS" />
          <UiSelect v-model="style" :options="STYLE_OPTIONS" />
          <UiSelect v-model="industry" :options="INDUSTRY_OPTIONS" />
          <UiSelect v-model="performanceClass" :options="CLASS_OPTIONS" />
          <UiSelect v-model="previewTheme" :options="THEME_OPTIONS" />
        </div>

        <div class="mt-3 flex flex-wrap items-end justify-between gap-3">
          <p class="text-[0.8125rem] text-soft">
            {{ visibleBlocks.length }} of {{ all.length }} components
            <span v-if="site?.theme" class="text-faint"> · preview uses {{ site.name }}</span>
          </p>
          <div
            v-if="PAGE_OPTIONS.length && can('page:write')"
            class="flex min-w-[16rem] flex-1 flex-col gap-1 sm:max-w-xs"
          >
            <label class="text-[0.75rem] font-medium text-soft">Add sections to</label>
            <UiSelect v-model="pageTarget" :options="PAGE_OPTIONS" />
          </div>
        </div>
        <p v-if="appendError" class="mt-2 text-[0.8125rem] text-danger" role="alert">{{ appendError }}</p>
      </UiCard>

      <div class="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <nav class="lg:sticky lg:top-4 lg:self-start" aria-label="Categories">
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
            v-if="!visibleBlocks.length"
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
  </div>
</template>
