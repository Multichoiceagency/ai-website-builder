<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  RegistryBlockMetadata,
  SiteTemplate,
  Theme,
} from '@platform/schemas'

/**
 * Dark MotionSites-style template gallery.
 *
 * Panel mode: featured live preview + sticky meta + side/bottom grids.
 * Fullscreen mode: Motionsites marketplace — category pills + dense multi-column
 * cards + “Generate with AI” promo that can import into My templates.
 */
export interface GalleryTemplateEntry {
  template: SiteTemplate
  blockIds: string[]
  blocks: RegistryBlockMetadata[]
  tooHeavy: number
  missing: number
}

const props = defineProps<{
  entries: GalleryTemplateEntry[]
  collections: { value: string; label: string; count: number }[]
  theme?: Theme | null
  loading?: boolean
  error?: string | null
  search: string
  collection: string
  /** Motionsites marketplace layout (full viewport). */
  fullscreen?: boolean
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:collection': [value: string]
  insert: [entry: GalleryTemplateEntry]
  fullscreen: [entry: GalleryTemplateEntry]
  dragstart: [event: DragEvent, entry: GalleryTemplateEntry]
  /** Custom AI brief — parent opens rebuild-ai; optionally already saved locally. */
  'generate-ai': [payload: { title: string; prompt: string; saveToLibrary: boolean }]
}>()

const featuredId = ref<string | null>(null)
const activeId = ref<string | null>(null)
const categoryFilter = ref('')
const pricingFilter = ref<'all' | 'free' | 'pro'>('all')
const sortBy = ref<'featured' | 'az'>('featured')

const generateOpen = ref(false)
const generateTitle = ref('')
const generatePrompt = ref('')
const generateSave = ref(true)

watch(
  () => props.entries,
  (list) => {
    if (!list.length) {
      featuredId.value = null
      return
    }
    if (!list.some((entry) => entry.template.id === featuredId.value)) {
      featuredId.value = list[0]!.template.id
    }
  },
  { immediate: true },
)

const featured = computed(() => {
  const id = featuredId.value
  if (!id) return props.entries[0] ?? null
  return props.entries.find((entry) => entry.template.id === id) ?? props.entries[0] ?? null
})

const rest = computed(() =>
  props.entries.filter((entry) => entry.template.id !== featured.value?.template.id),
)
const side = computed(() => rest.value.slice(0, 6))
const bottom = computed(() => rest.value.slice(6))

/** Unique categories for Motionsites-style pills (fullscreen). */
const categoryPills = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of props.entries) {
    const key = entry.template.category.trim() || 'Other'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }))
})

const marketplaceEntries = computed(() => {
  let list = [...props.entries]
  if (categoryFilter.value) {
    list = list.filter(
      (entry) =>
        entry.template.category.trim().toLowerCase() === categoryFilter.value.toLowerCase(),
    )
  }
  if (pricingFilter.value === 'free') {
    list = list.filter((entry) => entry.template.isFree)
  } else if (pricingFilter.value === 'pro') {
    list = list.filter((entry) => !entry.template.isFree)
  }
  if (sortBy.value === 'az') {
    list.sort((a, b) => a.template.title.localeCompare(b.template.title))
  }
  return list
})

function feature(entry: GalleryTemplateEntry) {
  featuredId.value = entry.template.id
  activeId.value = entry.template.id
}

function sectionCount(entry: GalleryTemplateEntry) {
  return `Adds ${entry.blockIds.length} section${entry.blockIds.length === 1 ? '' : 's'}`
}

function hasPreviewMedia(entry: GalleryTemplateEntry) {
  return Boolean(
    entry.template.previewImage?.trim() || entry.template.previewVideo?.trim(),
  )
}

function submitGenerate() {
  const prompt = generatePrompt.value.trim()
  if (!prompt) return
  emit('generate-ai', {
    title: generateTitle.value.trim() || 'Custom section',
    prompt,
    saveToLibrary: generateSave.value,
  })
  generateOpen.value = false
  generateTitle.value = ''
  generatePrompt.value = ''
  generateSave.value = true
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col bg-[#0a0a0a] text-white">
    <!-- ── Fullscreen Motionsites marketplace ─────────────────────────── -->
    <template v-if="fullscreen">
      <div class="flex shrink-0 flex-col gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="sortBy"
            class="h-9 shrink-0 rounded-full border border-white/15 bg-[#171717] px-3 type-button-12 text-white"
            aria-label="Sort"
          >
            <option value="featured">Featured</option>
            <option value="az">A–Z</option>
          </select>
          <select
            v-model="pricingFilter"
            class="h-9 shrink-0 rounded-full border border-white/15 bg-[#171717] px-3 type-button-12 text-white"
            aria-label="Pricing"
          >
            <option value="all">Pricing</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
          <select
            :value="collection"
            class="h-9 max-w-[11rem] shrink-0 rounded-full border border-white/15 bg-[#171717] px-3 type-button-12 text-white"
            aria-label="Template collection"
            @change="emit('update:collection', ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="entry in collections"
              :key="entry.value || 'all'"
              :value="entry.value"
            >{{ entry.label }} ({{ entry.count }})</option>
          </select>
          <p class="type-caption-12 text-white/50 sm:ml-auto">
            Use the search above · click a template to add it
          </p>
        </div>

        <div
          class="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Categories"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="!categoryFilter"
            class="shrink-0 rounded-full px-3.5 py-1.5 type-button-12 transition-colors"
            :class="
              !categoryFilter
                ? 'bg-white text-black'
                : 'bg-[#171717] text-white/80 hover:bg-white/10 hover:text-white'
            "
            @click="categoryFilter = ''"
          >All</button>
          <button
            v-for="pill in categoryPills"
            :key="pill.label"
            type="button"
            role="tab"
            :aria-selected="categoryFilter === pill.label"
            class="shrink-0 rounded-full px-3.5 py-1.5 type-button-12 transition-colors"
            :class="
              categoryFilter === pill.label
                ? 'bg-white text-black'
                : 'bg-[#171717] text-white/80 hover:bg-white/10 hover:text-white'
            "
            @click="categoryFilter = pill.label"
          >{{ pill.label }}</button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
        <p v-if="loading" class="py-16 text-center type-caption-12 text-white/70">Loading templates…</p>
        <p
          v-else-if="error"
          class="rounded-lg bg-red-950 px-3 py-2 type-caption-12 text-white"
          role="alert"
        >{{ error }}</p>

        <template v-else>
          <ul
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          >
            <!-- Generate with AI — Motionsites “promo” card slot -->
            <li class="col-span-1">
              <div
                class="relative flex h-full min-h-[14rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1f3a] via-[#0c0c12] to-[#050508] p-4"
              >
                <div
                  class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-500/30 blur-3xl"
                  aria-hidden="true"
                />
                <p class="type-button-10 font-semibold uppercase tracking-[0.12em] text-sky-300/90">
                  Custom
                </p>
                <h3 class="mt-2 text-[1.05rem] font-semibold leading-snug text-white">
                  Generate a custom section with AI
                </h3>
                <p class="mt-1.5 flex-1 type-caption-12 leading-relaxed text-white/70">
                  Describe the section, rebuild it on the page, and optionally import the prompt into My templates.
                </p>
                <button
                  type="button"
                  class="mt-3 w-full rounded-full bg-white px-3 py-2 type-button-12 font-semibold text-black transition-opacity hover:opacity-90"
                  @click="generateOpen = true"
                >Start generating</button>
              </div>
            </li>

            <li v-for="entry in marketplaceEntries" :key="entry.template.id">
              <button
                type="button"
                class="group relative flex w-full flex-col overflow-hidden rounded-2xl text-left"
                draggable="true"
                @dragstart="emit('dragstart', $event, entry)"
                @mouseenter="activeId = entry.template.id"
                @mouseleave="activeId = null"
                @click="emit('insert', entry)"
              >
                <div
                  class="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#171717] ring-1 ring-white/10 transition-[ring-color,transform] group-hover:-translate-y-0.5 group-hover:ring-white/35"
                >
                  <MotionPreviewMedia
                    v-if="hasPreviewMedia(entry)"
                    :preview-image="entry.template.previewImage"
                    :preview-video="entry.template.previewVideo"
                    :alt="entry.template.title"
                    :play="activeId === entry.template.id"
                  />
                  <TemplatePreview
                    v-else
                    :block-ids="entry.blockIds"
                    :theme="theme"
                    :play="activeId === entry.template.id"
                    ratio="16 / 10"
                  />
                  <span
                    class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 type-button-12 font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >Add to page</span>
                </div>
                <div class="flex items-start justify-between gap-2 px-0.5 pb-1 pt-2">
                  <div class="min-w-0">
                    <p class="truncate text-[0.875rem] font-semibold text-white">{{ entry.template.title }}</p>
                    <p class="truncate type-caption-12 text-white/55">{{ entry.template.category }}</p>
                  </div>
                  <div class="mt-0.5 flex shrink-0 items-center gap-1">
                    <span
                      v-if="!entry.template.isFree"
                      class="text-[0.85rem] text-amber-300"
                      aria-label="Premium"
                    >♛</span>
                    <span
                      role="button"
                      tabindex="0"
                      class="rounded p-0.5 text-white/40 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                      aria-label="Open live preview"
                      @click.stop.prevent="emit('fullscreen', entry)"
                      @keydown.enter.stop.prevent="emit('fullscreen', entry)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </button>
            </li>
          </ul>

          <p
            v-if="!marketplaceEntries.length"
            class="py-16 text-center type-caption-12 text-white/60"
          >No templates match these filters.</p>
          <p v-else class="mt-6 text-center type-caption-12 text-white/45">
            {{ marketplaceEntries.length }} templates · click a card to add it to the page
          </p>
        </template>
      </div>

      <!-- Generate modal -->
      <Teleport to="body">
        <div
          v-if="generateOpen"
          class="fixed inset-0 z-[calc(var(--z-editor-panel)+20)] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          @click.self="generateOpen = false"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Generate a custom section"
            class="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl"
          >
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-white">Generate with AI</h2>
                <p class="mt-1 type-caption-12 text-white/60">
                  Write a section brief. We rebuild on the page from a seed block — no third-party UI source (ADR-0003).
                </p>
              </div>
              <button
                type="button"
                class="grid h-8 w-8 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Close"
                @click="generateOpen = false"
              >&times;</button>
            </div>

            <div class="flex flex-col gap-3">
              <UiField v-slot="{ id }" label="Title">
                <UiInput
                  :id="id"
                  v-model="generateTitle"
                  placeholder="e.g. Wanderful hero"
                  class="border-white/15 bg-[#1a1a1a] text-white"
                />
              </UiField>
              <UiField v-slot="{ id }" label="Section prompt" required>
                <UiTextarea
                  :id="id"
                  v-model="generatePrompt"
                  :rows="8"
                  placeholder="Describe layout, motion, typography, and content. Paste a Motionsites-style brief if you have one."
                  class="border-white/15 bg-[#1a1a1a] text-white"
                />
              </UiField>
              <label class="flex items-center gap-2 type-caption-12 text-white/80">
                <input v-model="generateSave" type="checkbox" class="rounded border-white/30" />
                Import into My templates (saved in this browser)
              </label>
            </div>

            <div class="mt-5 flex justify-end gap-2">
              <UiButton variant="secondary" @click="generateOpen = false">Cancel</UiButton>
              <UiButton
                variant="primary"
                :disabled="!generatePrompt.trim()"
                @click="submitGenerate"
              >Generate &amp; add</UiButton>
            </div>
          </div>
        </div>
      </Teleport>
    </template>

    <!-- ── Compact panel gallery (non-fullscreen) ─────────────────────── -->
    <template v-else>
      <div class="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <div class="min-w-0 flex-1">
          <UiInput
            :model-value="search"
            placeholder="Search templates…"
            aria-label="Search templates"
            class="border-white/15 bg-[#171717] text-white placeholder:text-white/55"
            @update:model-value="emit('update:search', String($event))"
          />
        </div>
        <select
          :value="collection"
          class="h-9 max-w-[10rem] shrink-0 rounded-md border border-white/15 bg-[#171717] px-2 type-button-12 text-white"
          aria-label="Template collection"
          @change="emit('update:collection', ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="entry in collections"
            :key="entry.value || 'all'"
            :value="entry.value"
          >{{ entry.label }} ({{ entry.count }})</option>
        </select>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <p v-if="loading" class="py-12 text-center type-caption-12 text-white/70">Loading templates…</p>
        <p
          v-else-if="error"
          class="rounded-lg bg-red-950 px-3 py-2 type-caption-12 text-white"
          role="alert"
        >{{ error }}</p>

        <template v-else-if="featured">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start">
            <div class="flex min-w-0 flex-1 flex-col gap-3">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div class="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
                  <div class="relative aspect-[16/10] w-full overflow-hidden bg-[#0a0a0a]">
                    <MotionPreviewMedia
                      v-if="hasPreviewMedia(featured)"
                      :preview-image="featured.template.previewImage"
                      :preview-video="featured.template.previewVideo"
                      :alt="featured.template.title"
                      :play="activeId === featured.template.id || featuredId === featured.template.id"
                    />
                    <TemplatePreview
                      v-else
                      :block-ids="featured.blockIds"
                      :theme="theme"
                      :play="activeId === featured.template.id || featuredId === featured.template.id"
                      :eager="true"
                      ratio="16 / 10"
                    />
                  </div>
                  <span
                    v-if="!featured.template.isFree"
                    class="absolute right-3 top-3 z-10 rounded-full bg-amber-300 px-2 py-0.5 type-button-10 font-semibold uppercase tracking-[0.06em] text-black"
                  >Pro</span>
                </div>

                <aside
                  class="flex w-full shrink-0 flex-col gap-3 rounded-2xl border border-white/10 bg-[#171717] p-4 sm:w-[13.5rem] sm:sticky sm:top-3 sm:self-start"
                >
                  <div>
                    <p class="type-button text-white">{{ featured.template.title }}</p>
                    <p class="mt-1 type-caption-12 text-white/80">{{ featured.template.category }}</p>
                  </div>
                  <p class="type-caption-12 leading-relaxed text-white/80">
                    {{ sectionCount(featured) }}
                    <span v-if="featured.template.motionType.length">
                      · {{ featured.template.motionType.slice(0, 2).join(' · ') }}
                    </span>
                  </p>
                  <p
                    v-if="featured.template.sourcePrompt"
                    class="line-clamp-4 type-caption-12 leading-relaxed text-white/75"
                  >{{ featured.template.sourcePrompt }}</p>

                  <div class="mt-auto flex flex-col gap-2 pt-2">
                    <UiButton variant="primary" class="w-full justify-center" @click="emit('insert', featured)">
                      Use this prompt
                    </UiButton>
                    <UiButton
                      variant="secondary"
                      class="w-full justify-center"
                      @click="emit('fullscreen', featured)"
                    >Preview</UiButton>
                  </div>
                </aside>
              </div>

              <ul v-if="bottom.length" class="grid grid-cols-2 gap-2 md:grid-cols-4">
                <li v-for="entry in bottom" :key="entry.template.id">
                  <button
                    type="button"
                    class="group relative flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#171717] text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-white/40"
                    draggable="true"
                    @dragstart="emit('dragstart', $event, entry)"
                    @mouseenter="activeId = entry.template.id"
                    @mouseleave="activeId = null"
                    @click="feature(entry)"
                  >
                    <div class="relative aspect-[16/10] w-full overflow-hidden bg-[#0a0a0a]">
                      <MotionPreviewMedia
                        v-if="hasPreviewMedia(entry)"
                        :preview-image="entry.template.previewImage"
                        :preview-video="entry.template.previewVideo"
                        :alt="entry.template.title"
                        :play="activeId === entry.template.id"
                      />
                      <TemplatePreview
                        v-else
                        :block-ids="entry.blockIds"
                        :theme="theme"
                        :play="activeId === entry.template.id"
                        ratio="16 / 10"
                      />
                      <span
                        v-if="!entry.template.isFree"
                        class="absolute right-1.5 top-1.5 text-[0.7rem] text-amber-200"
                        aria-label="Premium"
                      >♛</span>
                    </div>
                    <span class="truncate px-2 pb-0.5 pt-1.5 type-button-10 text-white">{{ entry.template.title }}</span>
                    <span class="truncate px-2 pb-2 type-caption-12 text-white/75">{{ entry.template.category }}</span>
                  </button>
                </li>
              </ul>
            </div>

            <ul class="grid shrink-0 grid-cols-2 gap-2 sm:w-[18rem] lg:sticky lg:top-3 lg:w-[17rem] lg:self-start">
              <li v-for="entry in side" :key="entry.template.id">
                <button
                  type="button"
                  class="group relative flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#171717] text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-white/40"
                  :aria-pressed="featuredId === entry.template.id"
                  :class="featuredId === entry.template.id ? 'border-white/50' : ''"
                  draggable="true"
                  @dragstart="emit('dragstart', $event, entry)"
                  @mouseenter="activeId = entry.template.id"
                  @mouseleave="activeId = null"
                  @click="feature(entry)"
                >
                  <div class="relative aspect-[4/3] w-full overflow-hidden bg-[#0a0a0a]">
                    <MotionPreviewMedia
                      v-if="hasPreviewMedia(entry)"
                      :preview-image="entry.template.previewImage"
                      :preview-video="entry.template.previewVideo"
                      :alt="entry.template.title"
                      :play="activeId === entry.template.id"
                    />
                    <TemplatePreview
                      v-else
                      :block-ids="entry.blockIds"
                      :theme="theme"
                      :play="activeId === entry.template.id"
                      ratio="4 / 3"
                    />
                    <span
                      v-if="!entry.template.isFree"
                      class="absolute right-1.5 top-1.5 text-[0.7rem] text-amber-200"
                      aria-label="Premium"
                    >♛</span>
                  </div>
                  <span class="truncate px-2 pb-0.5 pt-1.5 type-button-10 text-white">{{ entry.template.title }}</span>
                  <span class="truncate px-2 pb-2 type-caption-12 text-white/75">{{ entry.template.category }}</span>
                </button>
              </li>
            </ul>
          </div>

          <p class="mt-4 text-center type-caption-12 text-white/70">
            {{ entries.length }} templates · open Full screen for the Motionsites grid
          </p>
        </template>

        <UiEmptyState
          v-else-if="!loading"
          title="No templates fit"
          description="Nothing here matches, or this site's performance budget excludes them."
        />
      </div>
    </template>
  </div>
</template>
