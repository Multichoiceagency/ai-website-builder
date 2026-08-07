<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    headline?: string
    subheadline?: string
    primaryLabel?: string
    primaryHref?: string
    secondaryLabel?: string
    secondaryHref?: string
    image?: string
    /** Same-origin looping background path (e.g. `/motionsites/…mp4`). */
    video?: string
    imageAlt?: string
    intensity?: 'subtle' | 'pronounced'
    /** Heading rank, so a second hero on a page can be demoted from H1. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  {
    eyebrow: '',
    headline: '',
    subheadline: '',
    primaryLabel: '',
    primaryHref: '',
    secondaryLabel: '',
    secondaryHref: '',
    image: '',
    video: '',
    imageAlt: '',
    intensity: 'subtle',
    headingLevel: 'h1',
  },
)

/**
 * The aurora is three blurred gradient sheets drifting on `transform`.
 *
 * The blur is applied once, statically; only the position moves. That matters:
 * animating `filter: blur()` re-renders the blur every frame and is the single
 * most expensive thing you can do to a hero. This is still the heaviest block
 * in the registry on a large display, which is why it is class C.
 */
const opacity = computed(() => (props.intensity === 'pronounced' ? 0.55 : 0.32))
</script>

<template>
  <div class="relative isolate overflow-hidden bg-[var(--site-text)]">
    <video
      v-if="video"
      :src="video"
      class="absolute inset-0 h-full w-full object-cover"
      autoplay
      muted
      loop
      playsinline
      aria-hidden="true"
    />
    <img
      v-else-if="image"
      :src="image"
      :alt="imageAlt"
      class="absolute inset-0 h-full w-full object-cover"
      width="1600"
      height="900"
      loading="eager"
    />

    <div class="pointer-events-none absolute inset-0" aria-hidden="true" :style="{ opacity }">
      <span
        class="absolute -left-[20%] -top-[30%] h-[70vh] w-[70vw] rounded-full blur-[90px] [animation:aurora-drift-a_26s_ease-in-out_infinite_alternate] motion-reduce:animate-none"
        style="background: radial-gradient(circle, var(--site-primary) 0%, transparent 70%)"
      />
      <span
        class="absolute -right-[15%] top-[10%] h-[60vh] w-[55vw] rounded-full blur-[90px] [animation:aurora-drift-b_32s_ease-in-out_infinite_alternate] motion-reduce:animate-none"
        style="background: radial-gradient(circle, var(--site-accent) 0%, transparent 70%)"
      />
      <span
        class="absolute bottom-[-25%] left-[20%] h-[55vh] w-[60vw] rounded-full blur-[100px] [animation:aurora-drift-c_38s_ease-in-out_infinite_alternate] motion-reduce:animate-none"
        style="background: radial-gradient(circle, var(--site-primary) 0%, transparent 70%)"
      />
    </div>

    <div class="relative mx-auto w-full max-w-4xl px-6 py-28 text-center lg:px-10 lg:py-36">
      <p
        v-if="eyebrow"
        class="mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[0.8125rem] font-medium text-white/80"
      >{{ eyebrow }}</p>

      <component
        :is="headingLevel"
        class="text-[clamp(2.5rem,1.4rem+4.4vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-balance text-white"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ headline }}</component>

      <p v-if="subheadline" class="mx-auto mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-pretty text-white/70">
        {{ subheadline }}
      </p>

      <div v-if="primaryLabel || secondaryLabel" class="mt-10 flex flex-wrap items-center justify-center gap-3">
        <a
          v-if="primaryLabel"
          :href="primaryHref"
          class="inline-flex items-center rounded-[var(--site-radius)] bg-white px-7 py-4 text-[0.9375rem] font-semibold text-neutral-950 no-underline transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgb(255_255_255/0.4)] focus-visible:-translate-y-0.5"
        >{{ primaryLabel }}</a>
        <a
          v-if="secondaryLabel"
          :href="secondaryHref"
          class="inline-flex items-center rounded-[var(--site-radius)] border border-white/20 px-7 py-4 text-[0.9375rem] font-semibold text-white no-underline transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-white/10"
        >{{ secondaryLabel }}</a>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes aurora-drift-a {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(12%, 8%, 0) scale(1.18); }
}
@keyframes aurora-drift-b {
  from { transform: translate3d(0, 0, 0) scale(1.1); }
  to { transform: translate3d(-14%, 10%, 0) scale(1); }
}
@keyframes aurora-drift-c {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(10%, -12%, 0) scale(1.22); }
}
</style>
