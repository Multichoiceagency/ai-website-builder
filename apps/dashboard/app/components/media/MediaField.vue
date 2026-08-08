<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MediaAsset } from '@platform/schemas'
import { Image } from '@lucide/vue'

/**
 * The editor control for a block's `image` field.
 *
 * It replaces a bare URL text box, but it does not *remove* one. A stored value
 * may predate the media library, or point at a CDN nobody wants to re-upload —
 * so the URL stays editable behind a disclosure, and it opens by itself when
 * the current value is not a library asset. Nothing here overwrites a value the
 * user did not choose to change: picking is explicit, clearing is explicit.
 *
 * The value written back is whatever the picker produced — a *relative* library
 * path, or the URL that was already there. Page documents are portable across
 * environments (ADR-0003), so an absolute `http://localhost:4000` must never be
 * baked into one by this control.
 */
const url = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    id?: string
    describedBy?: string
    placeholder?: string
    /** Folder new uploads land in, so editor uploads stay grouped. */
    folder?: string
    /** Restrict picker to videos with a ready scroll frame pack. */
    scrollReadyOnly?: boolean
  }>(),
  { id: undefined, describedBy: undefined, placeholder: 'https://…', folder: '', scrollReadyOnly: false },
)

const emit = defineEmits<{ select: [asset: MediaAsset] }>()

const config = useRuntimeConfig()

const pickerOpen = ref(false)
/** MIME of the last library pick — library URLs have no extension. */
const pickedMime = ref('')
/** Set when the picked asset has no human-written alt text. */
const altWarning = ref('')

const LIBRARY_PATH = /\/api\/v1\/content\/public\/media\/[0-9a-fA-F-]{36}$/

const isLibraryAsset = computed(() => LIBRARY_PATH.test(url.value))

/** Relative library paths need the API origin; anything else is already whole. */
const preview = computed(() => {
  if (!url.value) return ''
  return url.value.startsWith('/') ? `${config.public.coreApiUrl}${url.value}` : url.value
})

watch(url, () => {
  altWarning.value = ''
  if (!url.value) pickedMime.value = ''
})

function onSelect(asset: MediaAsset) {
  pickedMime.value = asset.mime
  // The one moment the warning is free — we already hold the asset, so no
  // extra request is made to tell someone their image cannot be described.
  altWarning.value = asset.needsAlt
    ? 'This image has no alt text yet. Add one in the media library so screen readers can describe it.'
    : ''
  emit('select', asset)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="url" class="flex items-start gap-3 rounded-lg border border-line bg-sunken/40 p-2.5">
      <MediaThumb
        :src="preview"
        :mime="pickedMime"
        alt=""
        media-class="h-16 w-24 shrink-0 rounded border border-line bg-raised object-contain"
      />

      <div class="min-w-0 flex-1">
        <p class="truncate font-mono text-[0.75rem] text-soft">{{ url }}</p>
        <p class="text-[0.75rem] text-faint">
          {{ isLibraryAsset ? 'From the media library' : 'External URL' }}
        </p>

        <div class="mt-1.5 flex flex-wrap gap-1.5">
          <UiButton size="sm" @click="pickerOpen = true">Replace</UiButton>
          <UiButton size="sm" variant="ghost" @click="url = ''">Remove</UiButton>
        </div>
      </div>
    </div>

    <button
      v-else
      :id="props.id"
      type="button"
      :aria-describedby="props.describedBy"
      class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-sunken/40 px-4 py-5 text-[0.8125rem] font-medium text-soft transition-colors hover:border-brand hover:text-ink"
      @click="pickerOpen = true"
    >
      <Image class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
      Choose media
    </button>

    <p v-if="altWarning" class="rounded-lg bg-warning-soft px-3 py-2 text-[0.75rem] text-warning" role="status">
      {{ altWarning }}
    </p>

    <!-- The escape hatch, open by default when the value is not a library asset. -->
    <details :open="Boolean(url) && !isLibraryAsset" class="group">
      <summary class="cursor-pointer list-none text-[0.75rem] text-faint transition-colors hover:text-soft">
        <span class="group-open:hidden">Use a URL instead</span>
        <span class="hidden group-open:inline">Media URL</span>
      </summary>
      <UiInput v-model="url" :placeholder="placeholder" class="mt-1.5 font-mono text-[0.75rem]" />
    </details>

    <MediaPicker
      v-model:open="pickerOpen"
      v-model:url="url"
      :folder="props.folder"
      :scroll-ready-only="props.scrollReadyOnly"
      :video-only="props.scrollReadyOnly"
      @select="onSelect"
    />
  </div>
</template>
