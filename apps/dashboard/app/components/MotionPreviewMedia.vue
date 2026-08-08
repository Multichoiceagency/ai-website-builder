<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * Catalogue chrome for MotionSites / backgrounds: local poster + muted video.
 * Paths are same-origin (`/motionsites/...`) only — never page content (ADR-0003).
 *
 * Videos autoplay when the card is in view (or when `play` is forced on hover).
 */
const props = withDefaults(
  defineProps<{
    previewImage?: string
    previewVideo?: string
    alt?: string
    /** Force play (e.g. card hover). Otherwise plays when visible. */
    play?: boolean
    mediaClass?: string
  }>(),
  {
    previewImage: '',
    previewVideo: '',
    alt: '',
    play: false,
    mediaClass: 'absolute inset-0 h-full w-full object-cover',
  },
)

const rootEl = ref<HTMLElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
const inView = ref(false)

const image = computed(() => props.previewImage.trim())
const video = computed(() => props.previewVideo.trim())
const hasMedia = computed(() => Boolean(image.value || video.value))
const shouldPlay = computed(() => props.play || inView.value)

defineExpose({ hasMedia })

let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !rootEl.value) {
    inView.value = true
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      inView.value = entries.some((entry) => entry.isIntersecting)
    },
    { root: null, threshold: 0.35 },
  )
  observer.observe(rootEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

watch(
  () => [shouldPlay.value, video.value, videoEl.value] as const,
  async ([play, src, el]) => {
    if (!el || !src) return
    if (play) {
      try {
        el.muted = true
        await el.play()
      } catch {
        /* autoplay can be blocked; poster still shows */
      }
      return
    }
    el.pause()
  },
)
</script>

<template>
  <div ref="rootEl" class="absolute inset-0 overflow-hidden bg-black">
    <img
      v-if="image"
      :src="image"
      :alt="alt"
      loading="lazy"
      decoding="async"
      class="absolute inset-0 h-full w-full object-cover"
    />
    <video
      v-if="video"
      ref="videoEl"
      :src="video"
      :poster="image || undefined"
      muted
      loop
      playsinline
      autoplay
      preload="metadata"
      :class="mediaClass"
    />
  </div>
</template>
