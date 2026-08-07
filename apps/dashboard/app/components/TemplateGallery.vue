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
 * Featured live preview + sticky meta rail + side/bottom grids.
 * Fullscreen preview is intentionally separate (parent opens InsertLivePreview).
 * When `previewImage` / `previewVideo` exist (local `/motionsites/...`), those
 * show instead of the live block miniature; otherwise TemplatePreview.
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
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:collection': [value: string]
  insert: [entry: GalleryTemplateEntry]
  fullscreen: [entry: GalleryTemplateEntry]
  dragstart: [event: DragEvent, entry: GalleryTemplateEntry]
}>()

const featuredId = ref<string | null>(null)
const activeId = ref<string | null>(null)

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
const bottom = computed(() => rest.value.slice(6, 14))

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
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col bg-[#0a0a0a] text-white">
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
        <!--
          One scroll container: featured + bottom scroll together.
          Meta rail is sticky so it stays while the preview / bottom strip move.
        -->
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
                    Add to page
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    class="w-full justify-center"
                    @click="emit('fullscreen', featured)"
                  >Fullscreen</UiButton>
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
          {{ entries.length }} templates · click a card to feature · Fullscreen opens separately
        </p>
      </template>

      <UiEmptyState
        v-else-if="!loading"
        title="No templates fit"
        description="Nothing here matches, or this site's performance budget excludes them."
      />
    </div>
  </div>
</template>
