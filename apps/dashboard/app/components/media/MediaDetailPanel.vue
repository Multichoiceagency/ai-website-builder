<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MediaAsset, MediaUsage } from '@platform/schemas'

/**
 * Everything about one asset, and everything you can do to it.
 *
 * Alt text sits at the top rather than among the metadata, because it is the
 * one field a block will refuse to render well without and the one nobody fills
 * in unless asked. The usage list sits directly above the delete button on
 * purpose: the question "what breaks if this goes" should be answered before
 * the button is reached, not after it is pressed.
 */
const props = defineProps<{ asset: MediaAsset }>()

const emit = defineEmits<{
  updated: [asset: MediaAsset]
  deleted: [id: string]
  close: []
}>()

const api = useApi()
const can = useCan()
const config = useRuntimeConfig()

const alt = ref('')
const filename = ref('')
const folder = ref('')
const tags = ref('')

const usage = ref<MediaUsage | null>(null)
const busy = ref(false)
const error = ref('')
const copied = ref(false)
const replaceInput = ref<HTMLInputElement | null>(null)

const absoluteUrl = computed(() => `${config.public.coreApiUrl}${props.asset.url}`)
const downloadUrl = computed(() => `${config.public.coreApiUrl}${props.asset.url}?download=true`)

/**
 * There is no resizing pipeline, so a thumbnail is the original file scaled by
 * the browser. Said out loud rather than left for someone to discover from a
 * slow page — see the note in the report accompanying this work.
 */
const servedFullSize = computed(() => props.asset.sizeBytes > 400_000)

watch(
  () => props.asset,
  async (asset) => {
    // A derived alt is a placeholder, not an answer — the field starts empty so
    // nobody accepts `hero-final-v2` as a description by pressing save.
    alt.value = asset.altSource === 'human' ? asset.alt : ''
    filename.value = asset.filename
    folder.value = asset.folder
    tags.value = asset.tags.join(', ')
    error.value = ''
    copied.value = false

    usage.value = null
    usage.value = await api.get<MediaUsage>(`/api/v1/content/media/${asset.id}/usage`)
  },
  { immediate: true },
)

async function save() {
  busy.value = true
  error.value = ''
  try {
    const updated = await api.patch<MediaAsset>(`/api/v1/content/media/${props.asset.id}`, {
      alt: alt.value,
      filename: filename.value,
      folder: folder.value,
      tags: tags.value
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    })
    emit('updated', updated)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not save those details.'
  } finally {
    busy.value = false
  }
}

async function replace(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  busy.value = true
  error.value = ''
  try {
    const result = await api.request<{ asset: MediaAsset; sanitised: string[] }>(
      `/api/v1/content/media/${props.asset.id}/replace`,
      { method: 'POST', body: file, query: { filename: file.name } },
    )
    emit('updated', result.asset)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'That file could not replace this one.'
  } finally {
    busy.value = false
    if (replaceInput.value) replaceInput.value.value = ''
  }
}

async function remove() {
  busy.value = true
  error.value = ''
  try {
    await api.request(`/api/v1/content/media/${props.asset.id}`, {
      method: 'DELETE',
      query: usage.value?.total ? { force: 'true' } : undefined,
    })
    emit('deleted', props.asset.id)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not delete this asset.'
  } finally {
    busy.value = false
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(absoluteUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    error.value = 'The browser would not give access to the clipboard.'
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <MediaThumb
      :src="absoluteUrl"
      :mime="asset.mime"
      :alt="asset.alt"
      controls
      media-class="max-h-64 w-full rounded-lg border border-line bg-sunken object-contain"
    />

    <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <UiField
      v-slot="{ id, describedBy }"
      label="Alt text"
      help="Describe what the media shows. Leave it empty only when it is purely decorative."
      :error="asset.needsAlt ? 'No description written yet — blocks need one.' : ''"
    >
      <UiInput
        :id="id"
        v-model="alt"
        :described-by="describedBy"
        :placeholder="asset.altSource === 'derived' ? asset.alt : 'A blue sofa in a bright living room'"
      />
    </UiField>

    <div class="grid gap-4 sm:grid-cols-2">
      <UiField v-slot="{ id }" label="File name">
        <UiInput :id="id" v-model="filename" />
      </UiField>
      <UiField v-slot="{ id, describedBy }" label="Folder" help="Slash separated, e.g. blog/2026.">
        <UiInput :id="id" v-model="folder" :described-by="describedBy" placeholder="blog/2026" />
      </UiField>
    </div>

    <UiField v-slot="{ id, describedBy }" label="Tags" help="Comma separated.">
      <UiInput :id="id" v-model="tags" :described-by="describedBy" placeholder="hero, product" />
    </UiField>

    <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[0.75rem]">
      <div class="flex justify-between gap-2 border-b border-line pb-1.5">
        <dt class="text-faint">Type</dt>
        <dd class="text-soft">{{ asset.mime }}</dd>
      </div>
      <div class="flex justify-between gap-2 border-b border-line pb-1.5">
        <dt class="text-faint">Size</dt>
        <dd class="text-soft">{{ formatBytes(asset.sizeBytes) }}</dd>
      </div>
      <div class="flex justify-between gap-2 border-b border-line pb-1.5">
        <dt class="text-faint">Dimensions</dt>
        <dd class="text-soft">{{ asset.width && asset.height ? `${asset.width}×${asset.height}` : 'unknown' }}</dd>
      </div>
      <div class="flex justify-between gap-2 border-b border-line pb-1.5">
        <dt class="text-faint">Uploaded</dt>
        <dd class="text-soft">{{ new Date(asset.createdAt).toLocaleDateString('nl-NL') }}</dd>
      </div>
      <div class="flex justify-between gap-2 border-b border-line pb-1.5">
        <dt class="text-faint">By</dt>
        <dd class="truncate text-soft">{{ asset.createdBy || 'unknown' }}</dd>
      </div>
      <div class="flex justify-between gap-2 border-b border-line pb-1.5">
        <dt class="text-faint">Checksum</dt>
        <dd class="truncate font-mono text-soft">{{ asset.checksum.slice(0, 12) }}</dd>
      </div>
    </dl>

    <p v-if="servedFullSize" class="rounded-lg bg-warning-soft px-3 py-2 text-[0.75rem] text-warning">
      Served at its original size — this platform does not generate smaller versions yet, so a large file is a
      large download on every page that shows it.
    </p>

    <div class="flex flex-wrap gap-2">
      <UiButton size="sm" @click="copyUrl">{{ copied ? 'Copied' : 'Copy URL' }}</UiButton>
      <UiButton size="sm" :to="downloadUrl" target="_blank" rel="noopener">Download</UiButton>
      <UiButton v-if="can('media:write')" size="sm" :loading="busy" @click="replaceInput?.click()">
        Replace file
      </UiButton>
      <input
        ref="replaceInput"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,video/mp4,video/webm"
        class="hidden"
        @change="replace"
      />
    </div>

    <section>
      <h3 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Used by</h3>

      <p v-if="!usage" class="text-[0.8125rem] text-faint">Checking…</p>
      <p v-else-if="!usage.total" class="text-[0.8125rem] text-soft">
        Nothing references this file, so deleting it breaks nothing.
      </p>

      <ul v-else class="flex flex-col gap-1.5">
        <li
          v-for="reference in usage.references"
          :key="`${reference.kind}-${reference.id}-${reference.sectionId}`"
          class="rounded-lg border border-line bg-sunken/40 px-3 py-2 text-[0.8125rem]"
        >
          <p class="truncate text-ink">
            <UiBadge>{{ reference.kind }}</UiBadge>
            <span class="ml-2">{{ reference.title }}</span>
          </p>
          <p class="truncate text-[0.75rem] text-faint">
            {{ reference.path }}
            <template v-if="reference.block"> · {{ reference.block }}</template>
            <template v-if="reference.sectionId"> · {{ reference.sectionId }}</template>
          </p>
        </li>
      </ul>
    </section>

    <div class="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
      <UiButton
        v-if="can('media:write')"
        size="sm"
        variant="danger"
        :loading="busy"
        @click="remove"
      >
        {{ usage?.total ? `Delete anyway (${usage.total} would break)` : 'Delete' }}
      </UiButton>
      <UiButton size="sm" @click="emit('close')">Close</UiButton>
      <UiButton v-if="can('media:write')" size="sm" variant="primary" :loading="busy" @click="save">Save</UiButton>
    </div>
  </div>
</template>
