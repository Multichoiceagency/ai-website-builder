<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * Sandboxed MotionSites React island — stays fully animated (video / spotlight).
 *
 * Overlay copy and fonts arrive as CMS props and are pushed into the iframe via
 * postMessage so the React build never gets rewritten into page JSON (ADR-0003).
 */
const props = withDefaults(
  defineProps<{
    sectionId?: string
    title?: string
    minHeight?: '100vh' | 'auto'
    headline?: string
    headlineLine2?: string
    bodyLeft?: string
    bodyRight?: string
    ctaLabel?: string
    fontDisplay?: string
    fontBody?: string
  }>(),
  {
    sectionId: 'velorah-hero',
    title: '',
    minHeight: '100vh',
    headline: '',
    headlineLine2: '',
    bodyLeft: '',
    bodyRight: '',
    ctaLabel: '',
    fontDisplay: '',
    fontBody: '',
  },
)

const loaded = ref(false)
const reportedHeight = ref<number | null>(null)
const frameEl = ref<HTMLIFrameElement | null>(null)

const src = computed(() => `/motionsites/islands/${encodeURIComponent(props.sectionId)}/index.html`)

const hostContent = computed(() => ({
  headline: props.headline?.trim() || undefined,
  headlineLine2: props.headlineLine2?.trim() || undefined,
  bodyLeft: props.bodyLeft?.trim() || undefined,
  bodyRight: props.bodyRight?.trim() || undefined,
  ctaLabel: props.ctaLabel?.trim() || undefined,
  fontDisplay: props.fontDisplay?.trim() || undefined,
  fontBody: props.fontBody?.trim() || undefined,
}))

const frameStyle = computed(() => {
  if (props.minHeight === '100vh') {
    return { height: '100vh', minHeight: '100vh' }
  }
  const height = reportedHeight.value ?? 640
  return { height: `${height}px`, minHeight: '20rem' }
})

function pushHostProps() {
  const win = frameEl.value?.contentWindow
  if (!win || !loaded.value) return
  win.postMessage(
    {
      type: 'motionsites-island-props',
      sectionId: props.sectionId,
      props: hostContent.value,
    },
    '*',
  )
}

function onFrameLoad() {
  loaded.value = true
  pushHostProps()
}

function onMessage(event: MessageEvent) {
  const data = event.data
  if (!data || typeof data !== 'object') return
  if (data.type === 'motionsites-island-height') {
    if (data.sectionId !== props.sectionId) return
    if (typeof data.height === 'number' && data.height > 0) {
      reportedHeight.value = Math.ceil(data.height)
    }
    return
  }
  if (data.type === 'motionsites-island-ready' && data.sectionId === props.sectionId) {
    pushHostProps()
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

watch(hostContent, () => pushHostProps(), { deep: true })
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
      ref="frameEl"
      :src="src"
      :title="title || `MotionSites ${sectionId}`"
      class="absolute inset-0 h-full w-full border-0"
      sandbox="allow-scripts allow-same-origin"
      loading="lazy"
      @load="onFrameLoad"
    />
  </div>
</template>
