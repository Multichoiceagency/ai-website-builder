<script setup lang="ts">
import { ref, watch } from 'vue'
import type { MediaAsset, StockMediaItem, StockMediaKind, StockSearchResult } from '@platform/schemas'

/**
 * Live Mixkit stock search — talks only to core-api `/api/v1/stock/*`.
 *
 * Choosing an item imports it into the tenant media library, then emits the
 * resulting `MediaAsset` so pickers can select it like an upload.
 */
const props = withDefaults(
  defineProps<{
    /** Folder imports land in. Defaults to `stock` on the server when empty. */
    folder?: string
    /** Prefer video or art when the panel opens. */
    initialKind?: StockMediaKind
  }>(),
  { folder: '', initialKind: 'video' },
)

const emit = defineEmits<{ imported: [asset: MediaAsset] }>()

const api = useApi()
const can = useCan()

const kind = ref<StockMediaKind>(props.initialKind)
const search = ref('')
const page = ref(1)
const result = ref<StockSearchResult | null>(null)
const loading = ref(false)
const importingId = ref('')
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    result.value = await api.get<StockSearchResult>('/api/v1/stock/search', {
      q: search.value.trim() || undefined,
      kind: kind.value,
      provider: 'mixkit',
      page: page.value,
      limit: 24,
    })
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not search Mixkit.'
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
watch(kind, () => {
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
      tags: ['mixkit', item.kind],
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
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <UiInput v-model="search" placeholder="Search Mixkit (ocean, office, nature…)" class="min-w-48 flex-1" />
      <div class="flex rounded-lg border border-line bg-raised p-0.5" role="group" aria-label="Stock type">
        <button
          v-for="option in ([
            { value: 'video', label: 'Video' },
            { value: 'image', label: 'Art' },
          ] as const)"
          :key="option.value"
          type="button"
          class="rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors"
          :class="kind === option.value ? 'bg-sunken text-ink' : 'text-soft hover:text-ink'"
          :aria-pressed="kind === option.value"
          @click="kind = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <p class="text-[0.75rem] text-faint">
      Free stock from
      <a href="https://mixkit.co" target="_blank" rel="noopener noreferrer" class="underline hover:text-soft">
        Mixkit
      </a>
      — imported into your library (not hotlinked). Mixkit Free License applies.
    </p>

    <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <p v-if="loading" class="py-10 text-center text-[0.8125rem] text-soft">Searching Mixkit…</p>

    <UiEmptyState
      v-else-if="!result?.items.length"
      title="No stock matches"
      description="Try a broader term, or switch between Video and Art."
    />

    <ul v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <li v-for="item in result.items" :key="`${item.provider}-${item.externalId}`">
        <button
          type="button"
          class="group w-full overflow-hidden rounded-card border border-line bg-raised text-left shadow-card transition-colors hover:border-line-strong disabled:opacity-60"
          :disabled="Boolean(importingId) || !can('media:write')"
          :aria-label="`Import ${item.title}`"
          @click="importItem(item)"
        >
          <span class="relative block aspect-[4/3] bg-sunken">
            <img
              :src="item.thumbnailUrl"
              :alt="item.title"
              class="h-full w-full object-cover"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
            <UiBadge v-if="item.kind === 'video'" tone="neutral" class="absolute right-2 top-2">Video</UiBadge>
            <UiBadge v-else tone="neutral" class="absolute right-2 top-2">Art</UiBadge>
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
