<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  MIXKIT_ART_CATEGORIES,
  MIXKIT_VIDEO_CATEGORIES,
  PEXELS_PHOTO_CATEGORIES,
  type MediaAsset,
  type StockMediaItem,
  type StockMediaKind,
  type StockProviderId,
  type StockSearchResult,
} from '@platform/schemas'

/**
 * Live stock search — Mixkit video/illustrations + Pexels photos.
 * Talks only to core-api `/api/v1/stock/*` (ADR-0006).
 */
const props = withDefaults(
  defineProps<{
    folder?: string
    /**
     * Opening intent:
     * - `photos` → Pexels (default for image fields)
     * - `video` → Mixkit video
     * - `illustrations` → Mixkit art
     */
    initialPanel?: 'photos' | 'video' | 'illustrations'
  }>(),
  { folder: '', initialPanel: 'photos' },
)

const emit = defineEmits<{ imported: [asset: MediaAsset] }>()

const api = useApi()
const can = useCan()

type Panel = 'photos' | 'video' | 'illustrations'

const panel = ref<Panel>(props.initialPanel)
const search = ref('')
const category = ref('')
const page = ref(1)
const result = ref<StockSearchResult | null>(null)
const loading = ref(false)
const importingId = ref('')
const error = ref('')
const hoverId = ref('')
const reducedMotion = ref(false)

if (import.meta.client) {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const provider = computed<StockProviderId>(() => (panel.value === 'photos' ? 'pexels' : 'mixkit'))
const kind = computed<StockMediaKind>(() => (panel.value === 'video' ? 'video' : 'image'))

const categories = computed(() => {
  if (panel.value === 'photos') return [...PEXELS_PHOTO_CATEGORIES]
  if (panel.value === 'video') return [...MIXKIT_VIDEO_CATEGORIES]
  return [...MIXKIT_ART_CATEGORIES]
})

const panelOptions = [
  { value: 'photos' as const, label: 'Photos' },
  { value: 'video' as const, label: 'Video' },
  { value: 'illustrations' as const, label: 'Illustrations' },
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    result.value = await api.get<StockSearchResult>('/api/v1/stock/search', {
      q: search.value.trim() || undefined,
      kind: kind.value,
      provider: provider.value,
      category: category.value || undefined,
      page: page.value,
      limit: 24,
    })
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not search stock.'
    result.value = null
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void load()
  }, 300)
})
watch([panel, category], () => {
  page.value = 1
  void load()
})

void load()

async function importItem(item: StockMediaItem) {
  if (!can('media:write')) {
    error.value = 'You need media write permission to import stock.'
    return
  }

  importingId.value = item.externalId
  error.value = ''
  try {
    const response = await api.post<{ asset: MediaAsset }>('/api/v1/stock/import', {
      provider: item.provider,
      externalId: item.externalId,
      kind: item.kind,
      downloadUrl: item.downloadUrl,
      title: item.title,
      pageUrl: item.pageUrl,
      folder: props.folder || 'stock',
      alt: item.title,
      tags: [item.provider, item.kind, ...(category.value ? [category.value] : [])],
    })
    emit('imported', response.asset)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Import failed.'
  } finally {
    importingId.value = ''
  }
}

function nextPage() {
  if (!result.value?.hasMore) return
  page.value += 1
  void load()
}

function prevPage() {
  if (page.value <= 1) return
  page.value -= 1
  void load()
}

function onHoverEnter(item: StockMediaItem, event: MouseEvent) {
  if (item.kind !== 'video' || !item.previewUrl || reducedMotion.value) return
  hoverId.value = item.externalId
  const host = event.currentTarget as HTMLElement | null
  const video = host?.querySelector('video')
  if (video instanceof HTMLVideoElement) {
    void video.play().catch(() => undefined)
  }
}

function onHoverLeave(item: StockMediaItem, event: MouseEvent) {
  if (hoverId.value === item.externalId) hoverId.value = ''
  const host = event.currentTarget as HTMLElement | null
  const video = host?.querySelector('video')
  if (video instanceof HTMLVideoElement) {
    video.pause()
    video.currentTime = 0
  }
}

function badgeLabel(item: StockMediaItem): string {
  if (item.provider === 'pexels') return 'Photo'
  if (item.kind === 'video') return 'Video'
  return 'Illustration'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <UiInput
        v-model="search"
        placeholder="Search (ocean, office, fitness…)"
        class="min-w-48 flex-1"
      />
      <div class="flex rounded-lg border border-line bg-raised p-0.5" role="group" aria-label="Stock type">
        <button
          v-for="option in panelOptions"
          :key="option.value"
          type="button"
          class="cursor-pointer rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors duration-150"
          :class="panel === option.value ? 'bg-sunken text-ink' : 'text-soft hover:text-ink'"
          :aria-pressed="panel === option.value"
          @click="panel = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="flex flex-wrap gap-1.5" role="list" aria-label="Categories">
      <button
        type="button"
        class="cursor-pointer rounded-full px-2.5 py-1 text-[0.75rem] font-medium transition-colors duration-150"
        :class="!category ? 'bg-brand-soft text-brand' : 'bg-sunken text-soft hover:text-ink'"
        :aria-pressed="!category"
        @click="category = ''"
      >
        All
      </button>
      <button
        v-for="entry in categories"
        :key="entry"
        type="button"
        class="cursor-pointer rounded-full px-2.5 py-1 text-[0.75rem] font-medium capitalize transition-colors duration-150"
        :class="category === entry ? 'bg-brand-soft text-brand' : 'bg-sunken text-soft hover:text-ink'"
        :aria-pressed="category === entry"
        @click="category = entry"
      >
        {{ entry }}
      </button>
    </div>

    <p class="text-[0.75rem] text-faint">
      <template v-if="panel === 'photos'">
        Photos from
        <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" class="underline hover:text-soft">
          Pexels
        </a>
        — imported into your library (not hotlinked).
      </template>
      <template v-else>
        Free stock from
        <a href="https://mixkit.co" target="_blank" rel="noopener noreferrer" class="underline hover:text-soft">
          Mixkit
        </a>
        — imported into your library. Mixkit Free License applies.
      </template>
    </p>

    <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <p v-if="loading" class="py-10 text-center text-[0.8125rem] text-soft">Searching…</p>

    <UiEmptyState
      v-else-if="!result?.items.length"
      title="No stock matches"
      description="Try another category or a broader search term."
    />

    <ul v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <li v-for="item in result.items" :key="`${item.provider}-${item.externalId}`">
        <button
          type="button"
          class="group w-full cursor-pointer overflow-hidden rounded-card border border-line bg-raised text-left shadow-card transition-colors duration-150 hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-default disabled:opacity-60"
          :disabled="Boolean(importingId) || !can('media:write')"
          :aria-label="`Import ${item.title}`"
          @click="importItem(item)"
          @mouseenter="onHoverEnter(item, $event)"
          @mouseleave="onHoverLeave(item, $event)"
        >
          <span class="relative block aspect-[4/3] bg-sunken">
            <img
              v-if="item.kind !== 'video' || !item.previewUrl || reducedMotion"
              :src="item.thumbnailUrl"
              :alt="item.title"
              class="h-full w-full object-cover"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
            <template v-else>
              <img
                :src="item.thumbnailUrl"
                :alt="item.title"
                class="h-full w-full object-cover"
                :class="hoverId === item.externalId ? 'opacity-0' : 'opacity-100'"
                loading="lazy"
                referrerpolicy="no-referrer"
              />
              <video
                class="absolute inset-0 h-full w-full object-cover"
                :class="hoverId === item.externalId ? 'opacity-100' : 'opacity-0'"
                :src="item.previewUrl"
                muted
                loop
                playsinline
                preload="none"
                :poster="item.thumbnailUrl"
              />
            </template>
            <UiBadge tone="neutral" class="absolute right-2 top-2">{{ badgeLabel(item) }}</UiBadge>
            <span
              v-if="importingId === item.externalId"
              class="absolute inset-0 grid place-items-center bg-raised/80 text-[0.8125rem] font-medium text-ink"
            >
              Importing…
            </span>
          </span>
          <span class="block truncate px-2.5 py-2 text-[0.8125rem] font-medium text-ink">{{ item.title }}</span>
        </button>
      </li>
    </ul>

    <div v-if="result?.items.length" class="flex items-center justify-between gap-2">
      <UiButton size="sm" :disabled="page <= 1 || loading" @click="prevPage">Previous</UiButton>
      <p class="text-[0.75rem] text-faint">Page {{ page }}</p>
      <UiButton size="sm" :disabled="!result.hasMore || loading" @click="nextPage">Next</UiButton>
    </div>
  </div>
</template>
