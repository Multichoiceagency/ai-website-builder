<script setup lang="ts">
import { computed } from 'vue'
import type { MediaAsset, MediaFolderSummary } from '@platform/schemas'
import { Folder } from '@lucide/vue'

/**
 * Browsing the library: breadcrumbs, sub-folders, and the assets themselves as
 * either a grid or a list.
 *
 * Grid and list are not two designs of the same thing. The grid answers "which
 * picture is it", so it gives space to the image and almost nothing to text.
 * The list answers "which file is it" — dimensions, weight, date, how many
 * pages depend on it — so it gives the image a thumbnail's worth of room and
 * the metadata a column each. Both share selection, so a bulk edit can start
 * in whichever one the person was already using.
 */
const props = withDefaults(
  defineProps<{
    assets: MediaAsset[]
    folders: MediaFolderSummary[]
    folder: string
    view?: 'grid' | 'list'
    /** Grid tile size. Ignored by the list. */
    density?: 'compact' | 'comfortable'
    selectable?: boolean
    selected?: string[]
    activeId?: string
    loading?: boolean
  }>(),
  { view: 'grid', density: 'comfortable', selectable: false, selected: () => [], activeId: '', loading: false },
)

const emit = defineEmits<{
  open: [asset: MediaAsset]
  'update:folder': [folder: string]
  'update:selected': [ids: string[]]
}>()

const config = useRuntimeConfig()

const src = (asset: MediaAsset) => `${config.public.coreApiUrl}${asset.url}`

/** Root, then one crumb per path segment of the folder currently open. */
const crumbs = computed(() => {
  const segments = props.folder ? props.folder.split('/') : []
  return [
    { label: 'All files', path: '' },
    ...segments.map((segment, index) => ({ label: segment, path: segments.slice(0, index + 1).join('/') })),
  ]
})

/**
 * The folders one level below the one that is open. Derived from the flat
 * folder list rather than stored as a tree: a folder here is a path an asset
 * carries, so the set of folders *is* the set of paths in use.
 */
const childFolders = computed(() => {
  const prefix = props.folder ? `${props.folder}/` : ''
  const children = new Map<string, number>()

  for (const entry of props.folders) {
    if (!entry.folder.startsWith(prefix) || entry.folder === props.folder) continue
    const child = entry.folder.slice(prefix.length).split('/')[0]
    if (!child) continue
    children.set(`${prefix}${child}`, (children.get(`${prefix}${child}`) ?? 0) + entry.assetCount)
  }

  return [...children.entries()].map(([path, count]) => ({ path, label: path.split('/').pop()!, count })).sort(
    (a, b) => a.label.localeCompare(b.label),
  )
})

const selectedSet = computed(() => new Set(props.selected))
const allSelected = computed(() => props.assets.length > 0 && props.assets.every((asset) => selectedSet.value.has(asset.id)))

function toggle(asset: MediaAsset) {
  const next = new Set(props.selected)
  if (next.has(asset.id)) next.delete(asset.id)
  else next.add(asset.id)
  emit('update:selected', [...next])
}

function toggleAll() {
  emit('update:selected', allSelected.value ? [] : props.assets.map((asset) => asset.id))
}

const tileClass = computed(() =>
  props.density === 'compact'
    ? 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9'
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
)

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function thumbClass(extra: string): string {
  const aspect = props.density === 'compact' ? 'aspect-square' : 'aspect-[4/3]'
  return `${extra} ${aspect}`
}
</script>

<template>
  <div>
    <nav class="mb-3 flex flex-wrap items-center gap-1 text-[0.8125rem]" aria-label="Folders">
      <template v-for="(crumb, index) in crumbs" :key="crumb.path">
        <span v-if="index > 0" class="text-faint" aria-hidden="true">/</span>
        <button
          type="button"
          class="rounded px-1.5 py-0.5 transition-colors"
          :class="index === crumbs.length - 1 ? 'font-medium text-ink' : 'text-soft hover:text-ink'"
          :aria-current="index === crumbs.length - 1 ? 'page' : undefined"
          @click="emit('update:folder', crumb.path)"
        >
          {{ crumb.label }}
        </button>
      </template>

      <label v-if="selectable && assets.length" class="ml-auto flex items-center gap-2 text-[0.8125rem] text-soft">
        <input type="checkbox" :checked="allSelected" class="h-4 w-4 accent-brand" @change="toggleAll" />
        Select all
      </label>
    </nav>

    <ul v-if="childFolders.length" class="mb-4 flex flex-wrap gap-2">
      <li v-for="child in childFolders" :key="child.path">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2 text-[0.8125rem] text-ink transition-colors hover:border-line-strong hover:bg-sunken"
          @click="emit('update:folder', child.path)"
        >
          <Folder class="h-4 w-4 text-faint" :stroke-width="ICON_STROKE" aria-hidden="true" />
          {{ child.label }}
          <span class="text-faint">{{ child.count }}</span>
        </button>
      </li>
    </ul>

    <p v-if="loading" class="py-10 text-center text-[0.8125rem] text-soft">Loading…</p>

    <slot v-else-if="!assets.length" name="empty" />

    <!-- Grid -->
    <ul v-else-if="view === 'grid'" class="grid gap-4" :class="tileClass">
      <li v-for="asset in assets" :key="asset.id" class="relative">
        <button
          type="button"
          class="group w-full overflow-hidden rounded-card border bg-raised text-left shadow-card transition-colors"
          :class="[
            activeId === asset.id ? 'border-brand' : 'border-line hover:border-line-strong',
            selectedSet.has(asset.id) ? 'ring-2 ring-brand' : '',
          ]"
          @click="emit('open', asset)"
        >
          <span class="relative block">
            <MediaThumb
              :src="src(asset)"
              :mime="asset.mime"
              :alt="asset.alt"
              :media-class="thumbClass('w-full bg-sunken object-contain')"
            />
            <UiBadge v-if="asset.mime === 'image/gif'" tone="neutral" class="absolute right-2 top-2">GIF</UiBadge>
            <UiBadge v-else-if="asset.mime.startsWith('video/')" tone="neutral" class="absolute right-2 top-2">Video</UiBadge>
            <UiBadge v-if="asset.needsAlt" tone="warning" class="absolute left-2 top-2">No alt</UiBadge>
          </span>
          <span class="block px-3 py-2">
            <span class="block truncate text-[0.8125rem] font-medium text-ink">{{ asset.filename }}</span>
            <span class="block truncate text-[0.75rem] text-faint">
              {{ asset.width && asset.height ? `${asset.width}×${asset.height} · ` : '' }}{{ formatBytes(asset.sizeBytes) }}
              <template v-if="!asset.usageCount"> · unused</template>
            </span>
          </span>
        </button>

        <label
          v-if="selectable"
          class="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-md border border-line bg-raised/90 shadow-sm"
          @click.stop
        >
          <input
            type="checkbox"
            class="h-4 w-4 accent-brand"
            :checked="selectedSet.has(asset.id)"
            :aria-label="`Select ${asset.filename}`"
            @change="toggle(asset)"
          />
        </label>
      </li>
    </ul>

    <!-- List -->
    <UiCard v-else :padded="false">
      <table class="w-full text-left text-[0.8125rem]">
        <thead class="border-b border-line text-[0.75rem] uppercase tracking-[0.06em] text-faint">
          <tr>
            <th v-if="selectable" scope="col" class="w-10 px-3 py-2.5"><span class="sr-only">Select</span></th>
            <th scope="col" class="px-3 py-2.5">File</th>
            <th scope="col" class="hidden px-3 py-2.5 sm:table-cell">Dimensions</th>
            <th scope="col" class="px-3 py-2.5">Size</th>
            <th scope="col" class="hidden px-3 py-2.5 md:table-cell">Uploaded</th>
            <th scope="col" class="px-3 py-2.5">Used by</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr
            v-for="asset in assets"
            :key="asset.id"
            class="cursor-pointer transition-colors hover:bg-sunken/60"
            :class="activeId === asset.id ? 'bg-sunken' : ''"
            @click="emit('open', asset)"
          >
            <td v-if="selectable" class="px-3 py-2" @click.stop>
              <input
                type="checkbox"
                class="h-4 w-4 accent-brand"
                :checked="selectedSet.has(asset.id)"
                :aria-label="`Select ${asset.filename}`"
                @change="toggle(asset)"
              />
            </td>
            <td class="px-3 py-2">
              <div class="flex items-center gap-3">
                <MediaThumb
                  :src="src(asset)"
                  :mime="asset.mime"
                  :alt="asset.alt"
                  media-class="h-9 w-12 shrink-0 rounded border border-line bg-sunken object-contain"
                />
                <div class="min-w-0">
                  <p class="truncate font-medium text-ink">{{ asset.filename }}</p>
                  <p class="truncate text-[0.75rem] text-faint">
                    {{ asset.folder || 'All files' }} · {{ asset.mime.replace('image/', '').replace('video/', '') }}
                  </p>
                </div>
                <UiBadge v-if="asset.needsAlt" tone="warning">No alt</UiBadge>
              </div>
            </td>
            <td class="hidden px-3 py-2 tabular-nums text-soft sm:table-cell">
              {{ asset.width && asset.height ? `${asset.width}×${asset.height}` : '—' }}
            </td>
            <td class="px-3 py-2 tabular-nums text-soft">{{ formatBytes(asset.sizeBytes) }}</td>
            <td class="hidden px-3 py-2 text-soft md:table-cell">{{ formatDate(asset.createdAt) }}</td>
            <td class="px-3 py-2">
              <span v-if="asset.usageCount" class="text-soft">{{ asset.usageCount }} place(s)</span>
              <span v-else class="text-faint">unused</span>
            </td>
          </tr>
        </tbody>
      </table>
    </UiCard>
  </div>
</template>
