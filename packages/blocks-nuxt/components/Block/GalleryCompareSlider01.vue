<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    heading?: string
    intro?: string
    beforeImage?: string
    beforeAlt?: string
    beforeLabel?: string
    afterImage?: string
    afterAlt?: string
    afterLabel?: string
  }>(),
  {
    heading: '',
    intro: '',
    beforeImage: '',
    beforeAlt: '',
    beforeLabel: 'Before',
    afterImage: '',
    afterAlt: '',
    afterLabel: 'After',
  },
)

/**
 * The divider is a native `<input type="range">`.
 *
 * That is the whole accessibility story: arrow keys, Home/End, a value that
 * assistive technology can announce, and touch handling the platform already
 * got right. A `<div>` with pointer listeners would have needed all four
 * rebuilt, badly.
 */
const position = ref(50)

/** Clip, not width: clip-path is a compositor property, width is a relayout. */
const clip = computed(() => `inset(0 ${100 - position.value}% 0 0)`)
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="max-w-2xl">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <figure class="mt-10">
      <div class="relative aspect-[4/3] overflow-hidden rounded-[calc(var(--site-radius)*2)] bg-[var(--site-surface-alt)]">
        <img
          v-if="afterImage"
          :src="afterImage"
          :alt="afterAlt"
          class="absolute inset-0 h-full w-full object-cover"
          width="1000"
          height="750"
          loading="lazy"
        />
        <div v-else class="absolute inset-0 bg-[var(--site-surface-alt)]" aria-hidden="true" />

        <div class="absolute inset-0" :style="{ clipPath: clip }">
          <img
            v-if="beforeImage"
            :src="beforeImage"
            :alt="beforeAlt"
            class="h-full w-full object-cover"
            width="1000"
            height="750"
            loading="lazy"
          />
          <div
            v-else
            class="h-full w-full bg-[radial-gradient(100%_80%_at_30%_20%,var(--site-primary)_0%,transparent_70%)] opacity-25"
            aria-hidden="true"
          />
        </div>

        <span
          class="pointer-events-none absolute inset-y-0 w-px bg-white/90 shadow-[0_0_0_1px_rgb(0_0_0/0.15)]"
          :style="{ left: `${position}%` }"
          aria-hidden="true"
        />
        <span
          class="pointer-events-none absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[0.875rem] font-semibold text-neutral-900 shadow-lg"
          :style="{ left: `${position}%` }"
          aria-hidden="true"
        >⇄</span>

        <span class="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[0.75rem] font-semibold text-white">
          {{ beforeLabel }}
        </span>
        <span class="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[0.75rem] font-semibold text-white">
          {{ afterLabel }}
        </span>

        <input
          v-model.number="position"
          type="range"
          min="0"
          max="100"
          step="1"
          class="absolute inset-0 h-full w-full cursor-ew-resize appearance-none bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-primary)] [&::-moz-range-thumb]:h-12 [&::-moz-range-thumb]:w-12 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-12 [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
          :aria-label="`Reveal ${afterLabel.toLowerCase()} — drag or use the arrow keys`"
        />
      </div>

      <figcaption class="mt-3 text-[0.8125rem] text-[var(--site-text-muted)]">
        {{ beforeLabel }} / {{ afterLabel }} — drag the handle or use the arrow keys.
      </figcaption>
    </figure>
  </div>
</template>
