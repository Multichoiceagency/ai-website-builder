<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MediaAsset, MediaLibrary } from '@platform/schemas'
import { PhotoIcon } from '@heroicons/vue/24/outline'

/**
 * Choose an image from the library, Mixkit stock, or add one without leaving
 * the field.
 *
 * Built to drop into an image field. It owns its own dialog, so a caller needs
 * one tag and nothing else:
 *
 *   <MediaPicker v-model:url="props.image">
 *     <template #trigger="{ open }">
 *       <UiButton @click="open">Choose image</UiButton>
 *     </template>
 *   </MediaPicker>
 *
 * `url` is written back **relative** (`/api/v1/content/public/media/…`), never
 * absolute. A page document is portable across environments (ADR-0003), and a
 * baked-in `http://localhost:4000` is exactly the kind of thing that survives
 * into production. `@select` hands over the whole asset for callers that also
 * want the alt text and the intrinsic dimensions.
 */
const open = defineModel<boolean>('open', { default: false })
const url = defineModel<string>('url', { default: '' })

const props = withDefaults(
  defineProps<{
    title?: string
    /** Folder new uploads land in, and the folder the browser opens on. */
    folder?: string
    /** Only list videos whose scroll frame pack is ready. */
    scrollReadyOnly?: boolean
    /** Only list video MIME types. */
    videoOnly?: boolean
  }>(),
  { title: 'Choose media', folder: '', scrollReadyOnly: false, videoOnly: false },
)

const emit = defineEmits<{ select: [asset: MediaAsset] }>()

const api = useApi()
const can = useCan()

type PickerTab = 'library' | 'mixkit'
const tab = ref<PickerTab>('library')

const search = ref('')
const folder = ref(props.folder)
const missingOnly = ref(false)
const library = ref<MediaLibrary | null>(null)
const loading = ref(false)
const error = ref('')
const dropZone = ref<{ browse: () => void } | null>(null)

/** The asset the field currently points at, so the picker opens on it. */
const currentId = computed(() => url.value.split('/').pop() ?? '')

async function load() {
  loading.value = true
  error.value = ''
  try {
    library.value = await api.get<MediaLibrary>('/api/v1/content/media', {
      search: search.value.trim() || undefined,
      folder: folder.value || undefined,
      missingAlt: missingOnly.value ? 'true' : undefined,
      limit: 120,
    })
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not load the media library.'
  } finally {
    loading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    tab.value = 'library'
    void load()
  }
})

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void load(), 250)
})
watch([folder, missingOnly], () => void load())

function choose(asset: MediaAsset) {
  url.value = asset.url
  emit('select', asset)
  open.value = false
}

/** A fresh upload is almost always the one you wanted — take it straight. */
function afterUpload(uploaded: MediaAsset[]) {
  if (uploaded.length === 1) {
    choose(uploaded[0]!)
    return
  }
  void load()
}

function afterStockImport(asset: MediaAsset) {
  choose(asset)
}

const assets = computed(() => {
  let list = library.value?.assets ?? []
  if (props.videoOnly || props.scrollReadyOnly) {
    list = list.filter((asset) => asset.mime.startsWith('video/'))
  }
  if (props.scrollReadyOnly) {
    list = list.filter((asset) => asset.frameStatus === 'ready' && asset.frameCount > 0)
  }
  return list
})

/** Poll while a video in the open picker is still extracting frames. */
let framePoll: ReturnType<typeof setInterval> | undefined
watch(
  () => open.value && (library.value?.assets.some((asset) => asset.frameStatus === 'pending') ?? false),
  (pending) => {
    clearInterval(framePoll)
    if (!pending) return
    framePoll = setInterval(() => void load(), 2500)
  },
)
</script>

<template>
  <slot name="trigger" :open="() => (open = true)" />

  <UiDialog v-model:open="open" :title="title" wide>
    <div class="flex flex-col gap-4">
      <div class="flex gap-1 border-b border-line" role="tablist" aria-label="Media source">
        <button
          type="button"
          role="tab"
          class="border-b-2 px-3 py-2 text-[0.8125rem] font-medium transition-colors"
          :class="tab === 'library' ? 'border-brand text-ink' : 'border-transparent text-soft hover:text-ink'"
          :aria-selected="tab === 'library'"
          @click="tab = 'library'"
        >
          Library
        </button>
        <button
          type="button"
          role="tab"
          class="border-b-2 px-3 py-2 text-[0.8125rem] font-medium transition-colors"
          :class="tab === 'mixkit' ? 'border-brand text-ink' : 'border-transparent text-soft hover:text-ink'"
          :aria-selected="tab === 'mixkit'"
          @click="tab = 'mixkit'"
        >
          Mixkit stock
        </button>
      </div>

      <template v-if="tab === 'library'">
        <div class="flex flex-wrap items-center gap-2">
          <UiInput v-model="search" placeholder="Search name, alt text or tag" class="min-w-48 flex-1" />
          <button
            type="button"
            class="h-10 rounded-lg border px-3 text-[0.8125rem] font-medium transition-colors"
            :class="missingOnly ? 'border-warning bg-warning-soft text-warning' : 'border-line bg-raised text-soft hover:border-line-strong'"
            :aria-pressed="missingOnly"
            @click="missingOnly = !missingOnly"
          >
            Needs alt
          </button>
          <UiButton v-if="can('media:write')" size="sm" @click="dropZone?.browse()">Upload</UiButton>
        </div>

        <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
          {{ error }}
        </p>

        <MediaDropZone
          ref="dropZone"
          compact
          :folder="folder"
          :disabled="!can('media:write')"
          @uploaded="afterUpload"
        >
          <div class="max-h-[26rem] overflow-y-auto pr-1">
            <MediaBrowser
              :assets="assets"
              :folders="library?.folders ?? []"
              :folder="folder"
              view="grid"
              density="compact"
              :active-id="currentId"
              :loading="loading"
              @update:folder="folder = $event"
              @open="choose"
            >
              <template #empty>
                <UiEmptyState
                  title="Nothing here yet"
                  description="Drop an image, GIF or video, paste a screenshot, or upload one — it will be selected straight away. Or switch to Mixkit stock."
                >
                  <template #icon>
                    <PhotoIcon class="h-10 w-10" aria-hidden="true" />
                  </template>
                  <UiButton size="sm" @click="tab = 'mixkit'">Browse Mixkit</UiButton>
                </UiEmptyState>
              </template>
            </MediaBrowser>
          </div>
        </MediaDropZone>

        <p class="text-[0.75rem] text-faint">
          Images and GIFs need alt text before a block can render them accessibly. Anything marked
          <span class="font-medium text-warning">No alt</span> still needs a description in the media library.
        </p>
      </template>

      <div v-else class="max-h-[30rem] overflow-y-auto pr-1">
        <MediaStockPanel :folder="folder || 'stock'" @imported="afterStockImport" />
      </div>
    </div>

    <template #footer>
      <UiButton v-if="url" variant="ghost" @click="url = ''; open = false">Remove</UiButton>
      <UiButton @click="open = false">Cancel</UiButton>
    </template>
  </UiDialog>
</template>
