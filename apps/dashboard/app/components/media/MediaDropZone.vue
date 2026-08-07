<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { MediaAsset } from '@platform/schemas'
import type { UploadItem } from '../../composables/useMediaUpload'

/**
 * A region that accepts files by drop, by paste and by file dialog.
 *
 * Three ways in because people reach for all three: dragging from a folder,
 * pasting a screenshot, and clicking a button. The drag counter is not
 * decoration — `dragleave` fires when the pointer crosses into a *child*
 * element, so a naive boolean makes the highlight flicker over its own contents.
 */
const props = withDefaults(defineProps<{ folder?: string; disabled?: boolean; compact?: boolean }>(), {
  folder: '',
  disabled: false,
  compact: false,
})

const emit = defineEmits<{ uploaded: [assets: MediaAsset[]] }>()

const { items, busy, upload, clearFinished, dismiss } = useMediaUpload()

const dragDepth = ref(0)
const dropping = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

defineExpose({ browse: () => fileInput.value?.click() })

async function accept(files: FileList | File[] | null) {
  const list = Array.from(files ?? []).filter((file) => file.size > 0)
  if (!list.length || props.disabled) return

  const uploaded = await upload(list, { folder: props.folder })
  if (uploaded.length) emit('uploaded', uploaded)

  // Successes clear themselves after a moment; failures stay until dismissed.
  setTimeout(clearFinished, 1500)
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragDepth.value = 0
  dropping.value = false
  void accept(event.dataTransfer?.files ?? null)
}

function onDragEnter(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return
  dragDepth.value += 1
  dropping.value = true
}

function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) dropping.value = false
}

/** Clears the input after reading it, so the same file can be picked twice. */
function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  void accept(input.files)
  input.value = ''
}

function onPaste(event: ClipboardEvent) {
  const files = Array.from(event.clipboardData?.files ?? [])
  if (!files.length) return
  event.preventDefault()
  void accept(files)
}

onMounted(() => window.addEventListener('paste', onPaste))
onBeforeUnmount(() => window.removeEventListener('paste', onPaste))

function statusTone(item: UploadItem): string {
  if (item.status === 'failed') return 'text-danger'
  if (item.status === 'done') return 'text-positive'
  return 'text-soft'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div
    class="relative rounded-card transition-colors"
    :class="dropping ? 'outline outline-2 outline-offset-4 outline-brand' : ''"
    @dragenter="onDragEnter"
    @dragover.prevent
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,video/mp4,video/webm"
      multiple
      class="hidden"
      @change="onPick"
    />

    <div
      v-if="dropping"
      class="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-card bg-brand-soft/85"
    >
      <p class="text-sm font-semibold text-brand">
        Drop to upload{{ folder ? ` into ${folder}` : '' }}
      </p>
    </div>

    <slot />

    <!-- One row per file: its own progress, its own failure. -->
    <ul v-if="items.length" class="mt-4 flex flex-col gap-1.5" :class="compact ? 'max-h-32 overflow-y-auto' : ''">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-3 rounded-lg border border-line bg-raised px-3 py-2"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-2">
            <p class="truncate text-[0.8125rem] font-medium text-ink">{{ item.name }}</p>
            <p class="shrink-0 text-[0.75rem]" :class="statusTone(item)">
              {{ item.status === 'failed' ? 'failed' : item.status === 'done' ? 'done' : `${Math.round(item.progress * 100)}%` }}
            </p>
          </div>

          <div
            v-if="item.status !== 'failed'"
            class="mt-1.5 h-1 overflow-hidden rounded-full bg-sunken"
            role="progressbar"
            :aria-valuenow="Math.round(item.progress * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`Uploading ${item.name}`"
          >
            <div
              class="h-full rounded-full bg-brand transition-[width] duration-200"
              :style="{ width: `${Math.max(2, item.progress * 100)}%` }"
            />
          </div>

          <p v-else class="mt-0.5 text-[0.75rem] text-danger">{{ item.error }}</p>

          <p v-if="item.sanitised.length" class="mt-0.5 text-[0.75rem] text-warning">
            Removed unsafe content: {{ item.sanitised.join(', ') }}
          </p>

          <p v-else-if="item.status === 'pending'" class="mt-0.5 text-[0.75rem] text-faint">
            Queued · {{ formatBytes(item.sizeBytes) }}
          </p>
        </div>

        <UiButton v-if="item.status === 'failed'" size="sm" variant="ghost" @click="dismiss(item.id)">
          Dismiss
        </UiButton>
      </li>
    </ul>

    <p v-if="busy" class="sr-only" role="status">Uploading files.</p>
  </div>
</template>
