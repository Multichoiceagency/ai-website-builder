<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * Catalogue chrome for MotionSites / backgrounds: local poster + optional
 * muted hover video. Paths are same-origin (`/motionsites/...`) only — never
 * page content (ADR-0003).
 */
const props = withDefaults(
  defineProps<{
    previewImage?: string
    previewVideo?: string
    alt?: string
    /** When true, play the muted loop if a video src exists. */
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

const videoEl = ref<HTMLVideoElement | null>(null)

const image = computed(() => props.previewImage.trim())
const video = computed(() => props.previewVideo.trim())
const hasMedia = computed(() => Boolean(image.value || video.value))

defineExpose({ hasMedia })

watch(
  () => [props.play, video.value, videoEl.value] as const,
  async ([shouldPlay, src, el]) => {
    if (!el || !src) return
    if (shouldPlay) {
      try {
        await el.play()
      } catch {
        /* autoplay can be blocked; poster still shows */
      }
      return
    }
    el.pause()
    el.currentTime = 0
  },
)
</script>

<template>
  <video
    v-if="video"
    ref="videoEl"
    :src="video"
    :poster="image || undefined"
    muted
    loop
    playsinline
    preload="metadata"
    :class="mediaClass"
  />
  <img
    v-else-if="image"
    :src="image"
    :alt="alt"
    loading="lazy"
    decoding="async"
    :class="mediaClass"
  />
</template>
