<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isVideoMime } from '@platform/schemas'

/**
 * Thumbnail for a library asset: `<img>` for stills/GIF, `<video>` for MP4/WebM.
 *
 * Library public URLs have no extension, so when `mime` is unknown an image
 * that fails to load falls through to a muted video preview before giving up.
 */
const props = withDefaults(
  defineProps<{
    src: string
    mime?: string
    alt?: string
    /** Extra classes on the media element. */
    mediaClass?: string
  }>(),
  { mime: '', alt: '', mediaClass: '' },
)

const broken = ref(false)
const forceVideo = ref(false)

watch(
  () => [props.src, props.mime] as const,
  () => {
    broken.value = false
    forceVideo.value = false
  },
)

const video = computed(
  () =>
    isVideoMime(props.mime) ||
    forceVideo.value ||
    /\.(mp4|webm)(\?|#|$)/i.test(props.src),
)

function onImageError() {
  if (!forceVideo.value && !isVideoMime(props.mime)) {
    forceVideo.value = true
    return
  }
  broken.value = true
}

function onVideoError() {
  broken.value = true
}
</script>

<template>
  <video
    v-if="video && !broken"
    :src="src"
    muted
    playsinline
    preload="metadata"
    :class="mediaClass"
    @error="onVideoError"
  />
  <img
    v-else-if="!broken"
    :src="src"
    :alt="alt"
    loading="lazy"
    decoding="async"
    :class="mediaClass"
    @error="onImageError"
  />
  <span
    v-else
    class="grid place-items-center bg-sunken text-[0.6875rem] text-faint"
    :class="mediaClass"
  >
    no preview
  </span>
</template>
