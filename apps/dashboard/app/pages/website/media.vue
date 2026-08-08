<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MediaAsset, MediaLibrary, MediaSort } from '@platform/schemas'
import { PhotoIcon } from '@heroicons/vue/24/outline'

/**
 * The media library.
 *
 * Two things shape this screen. Alt text: every block that renders an image
 * needs one, so the number of images still without a human-written description
 * is a headline figure and a one-click filter, not a detail buried in a dialog.
 * And deletion: an asset is referenced by pages, posts and authors that will
 * break, so nothing here destroys anything before saying what depends on it.
 *
 * Uploading is deliberately three-ways-in — drop, paste, click — because
 * people reach for all three, and each file carries its own progress and its
 * own failure so one rejected screenshot cannot take a batch of twelve with it.
 */
const api = useApi()
const can = useCan()

const search = ref('')
const folder = ref('')
const tag = ref('')
const mime = ref('')
const sizeBand = ref('')
const dateBand = ref('')
const sort = ref<MediaSort>('newest')
const missingOnly = ref(false)
const unusedOnly = ref(false)

const view = ref<'grid' | 'list'>('grid')
const density = ref<'compact' | 'comfortable'>('comfortable')

const library = ref<MediaLibrary | null>(null)
const loading = ref(false)
const error = ref('')

const selected = ref<string[]>([])
const active = ref<MediaAsset | null>(null)
const dropZone = ref<{ browse: () => void } | null>(null)
const stockOpen = ref(false)

const bulkFolder = ref('')
const bulkTags = ref('')
const bulkBusy = ref(false)
const movingOpen = ref(false)
const taggingOpen = ref(false)

/** Byte thresholds behind the size filter, so the UI offers ranges not numbers. */
const SIZE_BANDS: Record<string, { minBytes?: number; maxBytes?: number }> = {
  small: { maxBytes: 100_000 },
  medium: { minBytes: 100_000, maxBytes: 1_000_000 },
  large: { minBytes: 1_000_000 },
}

const DATE_BANDS: Record<string, number> = { week: 7, month: 30, quarter: 90 }

async function load() {
  loading.value = true
  error.value = ''
  try {
    const band = SIZE_BANDS[sizeBand.value] ?? {}
    const days = DATE_BANDS[dateBand.value]

    library.value = await api.get<MediaLibrary>('/api/v1/content/media', {
      search: search.value.trim() || undefined,
      folder: folder.value || undefined,
      tag: tag.value || undefined,
      mime: mime.value || undefined,
      minBytes: band.minBytes,
      maxBytes: band.maxBytes,
      createdAfter: days ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined,
      missingAlt: missingOnly.value ? 'true' : undefined,
      unused: unusedOnly.value ? 'true' : undefined,
      sort: sort.value,
      limit: 200,
    })

    // A selection that survives a filter change would delete things nobody can
    // see. It does not survive.
    const visible = new Set(library.value.assets.map((asset) => asset.id))
    selected.value = selected.value.filter((id) => visible.has(id))

    // Keep the open detail panel in sync (e.g. pending → ready while polling).
    if (active.value) {
      active.value = library.value.assets.find((asset) => asset.id === active.value!.id) ?? active.value
    }  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not load the media library.'
  } finally {
    loading.value = false
  }
}

await load()

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void load(), 250)
})
watch([folder, tag, mime, sizeBand, dateBand, sort, missingOnly, unusedOnly], () => void load())

/** Refresh while any video is still extracting scroll frames. */
let framePoll: ReturnType<typeof setInterval> | undefined
watch(
  () => library.value?.assets.some((asset) => asset.frameStatus === 'pending') ?? false,
  (pending) => {
    clearInterval(framePoll)
    if (!pending) return
    framePoll = setInterval(() => void load(), 2500)
  },
  { immediate: true },
)

async function afterUpload(uploaded: MediaAsset[]) {
  await load()
  if (uploaded.length === 1) active.value = uploaded[0]!
}

async function afterStockImport(asset: MediaAsset) {
  stockOpen.value = false
  await load()
  active.value = asset
}

function onUpdated(asset: MediaAsset) {
  active.value = asset
  void load()
}

function onDeleted() {
  active.value = null
  void load()
}

// region Bulk

async function bulk(payload: Record<string, unknown>) {
  bulkBusy.value = true
  error.value = ''
  try {
    const result = await api.post<{ changed: number; blocked: { filename: string; uses: number }[] }>(
      '/api/v1/content/media/bulk',
      { ids: selected.value, ...payload },
    )

    if (result.blocked.length) {
      // Named, not counted: "3 were skipped" tells nobody which three.
      error.value = `Kept ${result.blocked
        .map((entry) => `${entry.filename} (${entry.uses} place(s))`)
        .join(', ')} — still in use. Delete again with the override to remove them anyway.`
    }

    selected.value = []
    await load()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'That bulk edit did not go through.'
  } finally {
    bulkBusy.value = false
    movingOpen.value = false
    taggingOpen.value = false
  }
}

const bulkTagList = computed(() =>
  bulkTags.value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
)

// endregion

const assets = computed(() => library.value?.assets ?? [])
const missingAltCount = computed(() => library.value?.missingAltCount ?? 0)
const unusedCount = computed(() => library.value?.unusedCount ?? 0)

const MIME_OPTIONS = [
  { label: 'Any type', value: '' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'WebP', value: 'image/webp' },
  { label: 'AVIF', value: 'image/avif' },
  { label: 'GIF', value: 'image/gif' },
  { label: 'SVG', value: 'image/svg+xml' },
  { label: 'MP4', value: 'video/mp4' },
  { label: 'WebM', value: 'video/webm' },
]

const SIZE_OPTIONS = [
  { label: 'Any size', value: '' },
  { label: 'Under 100 KB', value: 'small' },
  { label: '100 KB – 1 MB', value: 'medium' },
  { label: 'Over 1 MB', value: 'large' },
]

const DATE_OPTIONS = [
  { label: 'Any date', value: '' },
  { label: 'Last 7 days', value: 'week' },
  { label: 'Last 30 days', value: 'month' },
  { label: 'Last 90 days', value: 'quarter' },
]

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Largest first', value: 'largest' },
  { label: 'Smallest first', value: 'smallest' },
  { label: 'By name', value: 'name' },
]

const tagOptions = computed(() => [
  { label: 'Any tag', value: '' },
  ...(library.value?.tags ?? []).map((entry) => ({ label: entry, value: entry })),
])

const filtersActive = computed(
  () =>
    Boolean(search.value || tag.value || mime.value || sizeBand.value || dateBand.value) ||
    missingOnly.value ||
    unusedOnly.value,
)

function clearFilters() {
  search.value = ''
  tag.value = ''
  mime.value = ''
  sizeBand.value = ''
  dateBand.value = ''
  missingOnly.value = false
  unusedOnly.value = false
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Media"
      :description="`${library?.total ?? 0} file(s)${missingAltCount ? ` · ${missingAltCount} without alt text` : ''}${unusedCount ? ` · ${unusedCount} unused` : ''}`"
    >
      <template #actions>
        <div class="flex rounded-lg border border-line bg-raised p-0.5" role="group" aria-label="View">
          <button
            v-for="option in (['grid', 'list'] as const)"
            :key="option"
            type="button"
            class="rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium capitalize transition-colors"
            :class="view === option ? 'bg-sunken text-ink' : 'text-soft hover:text-ink'"
            :aria-pressed="view === option"
            @click="view = option"
          >
            {{ option }}
          </button>
        </div>

        <UiButton
          v-if="view === 'grid'"
          size="sm"
          :aria-label="density === 'compact' ? 'Show larger thumbnails' : 'Show smaller thumbnails'"
          @click="density = density === 'compact' ? 'comfortable' : 'compact'"
        >
          {{ density === 'compact' ? 'Larger' : 'Smaller' }}
        </UiButton>

        <UiButton v-if="can('media:write')" size="sm" @click="stockOpen = true">Mixkit stock</UiButton>
        <UiButton v-if="can('media:write')" size="sm" variant="primary" @click="dropZone?.browse()">Upload</UiButton>
      </template>
    </UiPageHeader>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <!-- Filters -->
    <div class="mb-5 flex flex-wrap items-center gap-2">
      <UiInput v-model="search" placeholder="Search name, alt text or tag" class="min-w-52 flex-1" />
      <UiSelect v-model="tag" :options="tagOptions" class="w-36" />
      <UiSelect v-model="mime" :options="MIME_OPTIONS" class="w-32" />
      <UiSelect v-model="sizeBand" :options="SIZE_OPTIONS" class="w-40" />
      <UiSelect v-model="dateBand" :options="DATE_OPTIONS" class="w-36" />
      <UiSelect v-model="sort" :options="SORT_OPTIONS" class="w-40" />

      <button
        type="button"
        class="h-10 rounded-lg border px-3 text-[0.8125rem] font-medium transition-colors"
        :class="missingOnly ? 'border-warning bg-warning-soft text-warning' : 'border-line bg-raised text-soft hover:border-line-strong'"
        :aria-pressed="missingOnly"
        @click="missingOnly = !missingOnly"
      >
        Needs alt{{ missingAltCount ? ` (${missingAltCount})` : '' }}
      </button>

      <button
        type="button"
        class="h-10 rounded-lg border px-3 text-[0.8125rem] font-medium transition-colors"
        :class="unusedOnly ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-raised text-soft hover:border-line-strong'"
        :aria-pressed="unusedOnly"
        @click="unusedOnly = !unusedOnly"
      >
        Unused{{ unusedCount ? ` (${unusedCount})` : '' }}
      </button>

      <UiButton v-if="filtersActive" size="sm" variant="ghost" @click="clearFilters">Clear</UiButton>
    </div>

    <!-- Bulk bar: only present when there is a selection to act on. -->
    <div
      v-if="selected.length"
      class="mb-4 flex flex-wrap items-center gap-2 rounded-card border border-brand/40 bg-brand-soft/50 px-4 py-3"
    >
      <p class="text-[0.8125rem] font-medium text-ink">{{ selected.length }} selected</p>
      <div class="ml-auto flex flex-wrap gap-2">
        <UiButton size="sm" @click="selected = []">Clear</UiButton>
        <UiButton v-if="can('media:write')" size="sm" @click="movingOpen = true">Move…</UiButton>
        <UiButton v-if="can('media:write')" size="sm" @click="taggingOpen = true">Tag…</UiButton>
        <UiButton
          v-if="can('media:write')"
          size="sm"
          variant="danger"
          :loading="bulkBusy"
          @click="bulk({ action: 'delete' })"
        >
          Delete
        </UiButton>
      </div>
    </div>

    <div class="grid gap-5" :class="active ? 'xl:grid-cols-[1fr_22rem] xl:items-start' : ''">
      <MediaDropZone ref="dropZone" :folder="folder" :disabled="!can('media:write')" @uploaded="afterUpload">
        <MediaBrowser
          :assets="assets"
          :folders="library?.folders ?? []"
          :folder="folder"
          :view="view"
          :density="density"
          :selectable="can('media:write')"
          :selected="selected"
          :active-id="active?.id ?? ''"
          :loading="loading"
          @update:folder="folder = $event"
          @update:selected="selected = $event"
          @open="active = $event"
        >
          <template #empty>
            <UiEmptyState
              :title="filtersActive ? 'Nothing matches those filters' : 'No files yet'"
              :description="
                filtersActive
                  ? 'Try widening the search, or clear the filters.'
                  : 'Drop images, GIFs or MP4/WebM videos here, paste a screenshot, or use the upload button. They become available to every block on every page.'
              "
            >
              <template #icon>
                <PhotoIcon class="h-10 w-10" aria-hidden="true" />
              </template>
              <UiButton v-if="filtersActive" @click="clearFilters">Clear filters</UiButton>
              <UiButton v-else-if="can('media:write')" variant="primary" @click="dropZone?.browse()">Upload</UiButton>
            </UiEmptyState>
          </template>
        </MediaBrowser>
      </MediaDropZone>

      <UiCard v-if="active" class="xl:sticky xl:top-6">
        <MediaDetailPanel
          :key="active.id"
          :asset="active"
          @updated="onUpdated"
          @deleted="onDeleted"
          @close="active = null"
        />
      </UiCard>
    </div>

    <UiDialog v-model:open="movingOpen" title="Move to folder">
      <UiField v-slot="{ id, describedBy }" label="Folder" help="Slash separated. Leave empty for the root.">
        <UiInput :id="id" v-model="bulkFolder" :described-by="describedBy" placeholder="blog/2026" />
      </UiField>
      <template #footer>
        <UiButton @click="movingOpen = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="bulkBusy" @click="bulk({ action: 'move', folder: bulkFolder })">
          Move {{ selected.length }} file(s)
        </UiButton>
      </template>
    </UiDialog>

    <UiDialog v-model:open="taggingOpen" title="Tag the selection">
      <UiField v-slot="{ id, describedBy }" label="Tags" help="Comma separated.">
        <UiInput :id="id" v-model="bulkTags" :described-by="describedBy" placeholder="campaign, summer" />
      </UiField>
      <template #footer>
        <UiButton @click="taggingOpen = false">Cancel</UiButton>
        <UiButton
          :loading="bulkBusy"
          :disabled="!bulkTagList.length"
          @click="bulk({ action: 'untag', tags: bulkTagList })"
        >
          Remove
        </UiButton>
        <UiButton
          variant="primary"
          :loading="bulkBusy"
          :disabled="!bulkTagList.length"
          @click="bulk({ action: 'tag', tags: bulkTagList })"
        >
          Add
        </UiButton>
      </template>
    </UiDialog>

    <UiDialog v-model:open="stockOpen" title="Mixkit stock" wide>
      <MediaStockPanel folder="stock" @imported="afterStockImport" />
      <template #footer>
        <UiButton @click="stockOpen = false">Close</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
