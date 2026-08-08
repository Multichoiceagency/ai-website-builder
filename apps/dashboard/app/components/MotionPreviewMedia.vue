<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * Catalogue chrome for MotionSites / backgrounds: local poster + muted video.
 * Paths are same-origin (`/motionsites/...`) only — never page content (ADR-0003).
 *
 * Poster stays on top until the video is actually playing so cards never flash
 * black. Videos play when visible in the panel (or when `play` is forced).
 */
const props = withDefaults(
  defineProps<{
    previewImage?: string
    previewVideo?: string
    alt?: string
    /** Force play (e.g. card hover). Otherwise plays when visible. */
    play?: boolean
  }>(),
  {
    previewImage: '',
    previewVideo: '',
    alt: '',
    play: false,
  },
)

const rootEl = ref<HTMLElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
const inView = ref(false)
const imageOk = ref(false)
const imageFailed = ref(false)
const videoPlaying = ref(false)

const image = computed(() => props.previewImage.trim())
const video = computed(() => props.previewVideo.trim())
const hasMedia = computed(() => Boolean(image.value || video.value))
const shouldPlay = computed(() => props.play || inView.value)
const showPoster = computed(() => Boolean(image.value) && !imageFailed.value)
const showVideo = computed(() => Boolean(video.value) && shouldPlay.value)

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
    // Panel scroll: use a low threshold so cards near the edge still count.
    { root: null, threshold: 0.15, rootMargin: '40px' },
  )
  observer.observe(rootEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

watch(image, () => {
  imageOk.value = false
  imageFailed.value = false
})

watch(
  () => [showVideo.value, video.value] as const,
  async ([play, src]) => {
    videoPlaying.value = false
    await nextTick()
    const el = videoEl.value
    if (!el || !src || !play) {
      el?.pause()
      return
    }
    try {
      el.muted = true
      el.defaultMuted = true
      el.setAttribute('muted', '')
      await el.play()
    } catch {
      /* autoplay can be blocked; poster still shows */
    }
  },
)

function onImageLoad() {
  imageOk.value = true
  imageFailed.value = false
}

function onImageError() {
  imageOk.value = false
  imageFailed.value = true
}

function onPlaying() {
  videoPlaying.value = true
}

function onPause() {
  const el = videoEl.value
  if (!el || el.ended || el.paused) videoPlaying.value = false
}
</script>

<template>
  <div ref="rootEl" class="absolute inset-0 overflow-hidden bg-[#121212]">
    <img
      v-if="showPoster"
      :src="image"
      :alt="alt"
      loading="lazy"
      decoding="async"
      class="absolute inset-0 z-[1] h-full w-full object-cover transition-opacity duration-200"
      :class="videoPlaying ? 'opacity-0' : 'opacity-100'"
      @load="onImageLoad"
      @error="onImageError"
    />
    <video
      v-if="showVideo"
      ref="videoEl"
      :src="video"
      :poster="showPoster ? image : undefined"
      class="absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-200"
      :class="videoPlaying ? 'opacity-100' : 'opacity-0'"
      muted
      loop
      playsinline
      preload="metadata"
      @playing="onPlaying"
      @pause="onPause"
      @ended="onPause"
    />
    <div
      v-if="!showPoster && !videoPlaying"
      class="absolute inset-0 z-0 bg-gradient-to-br from-[#1f1f1f] via-[#141414] to-[#0a0a0a]"
      aria-hidden="true"
    />
  </div>
</template>
