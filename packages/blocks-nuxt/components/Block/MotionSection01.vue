<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * Sandboxed MotionSites React island.
 *
 * Loads `/motionsites/islands/{sectionId}/index.html` — first-party Vite build,
 * never third-party CDN source (ADR-0003 escape hatch).
 */
const props = withDefaults(
  defineProps<{
    sectionId?: string
    title?: string
    minHeight?: '100vh' | 'auto'
  }>(),
  {
    sectionId: 'velorah-hero',
    title: '',
    minHeight: '100vh',
  },
)

const loaded = ref(false)
const reportedHeight = ref<number | null>(null)

const src = computed(() => `/motionsites/islands/${encodeURIComponent(props.sectionId)}/index.html`)

const frameStyle = computed(() => {
  if (props.minHeight === '100vh') {
    return { height: '100vh', minHeight: '100vh' }
  }
  const height = reportedHeight.value ?? 640
  return { height: `${height}px`, minHeight: '20rem' }
})

function onMessage(event: MessageEvent) {
  const data = event.data
  if (!data || data.type !== 'motionsites-island-height') return
  if (data.sectionId !== props.sectionId) return
  if (typeof data.height === 'number' && data.height > 0) {
    reportedHeight.value = Math.ceil(data.height)
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
})

watch(
  () => props.sectionId,
  () => {
    loaded.value = false
    reportedHeight.value = null
  },
)
</script>

<template>
  <div class="relative w-full overflow-hidden bg-black" :style="frameStyle">
    <div
      v-if="!loaded"
      class="absolute inset-0 flex items-center justify-center bg-black"
      aria-hidden="true"
    >
      <span class="type-caption-12 text-white">Loading {{ title || sectionId }}…</span>
    </div>
    <iframe
      :src="src"
      :title="title || `MotionSites ${sectionId}`"
      class="absolute inset-0 h-full w-full border-0"
      sandbox="allow-scripts allow-same-origin"
      loading="lazy"
      @load="loaded = true"
    />
  </div>
</template>
