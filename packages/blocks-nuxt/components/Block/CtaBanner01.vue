<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    heading?: string
    body?: string
    ctaLabel?: string
    ctaHref?: string
    tone?: 'light' | 'muted' | 'primary' | 'dark'
    /** Heading rank, so the section fits the page outline where it is placed. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  { heading: '', body: '', ctaLabel: '', ctaHref: '', tone: 'primary', headingLevel: 'h2' },
)

const onDark = computed(() => props.tone === 'primary' || props.tone === 'dark')

const surface = computed(() => {
  if (props.tone === 'primary') return 'var(--site-primary)'
  if (props.tone === 'dark') return 'var(--site-text)'
  if (props.tone === 'muted') return 'var(--site-surface-alt)'
  return 'var(--site-surface)'
})

/**
 * The label colour for whichever fill this banner is using. Previously `#fff`
 * for both dark tones, which is only readable if the theme's primary happens
 * to be dark — the theme now says what reads on it, so ask it.
 */
const ink = computed(() => {
  if (props.tone === 'primary') return 'var(--site-primary-ink)'
  if (props.tone === 'dark') return 'var(--site-surface)'
  return 'var(--site-text)'
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-14 lg:px-10">
    <div
      class="flex flex-col items-start gap-8 rounded-[calc(var(--site-radius)*2)] px-8 py-12 lg:flex-row lg:items-center lg:justify-between lg:px-14 lg:py-14"
      :style="{ backgroundColor: surface }"
    >
      <div class="max-w-2xl">
        <component
          :is="headingLevel"
          class="text-[clamp(1.5rem,1.1rem+1.5vw,2.125rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-balance"
          :style="{ fontFamily: 'var(--site-font-heading)', color: ink }"
        >
          {{ heading }}
        </component>
        <p
          v-if="body"
          class="mt-3 text-[1.0625rem] leading-relaxed"
          :style="{ color: onDark ? ink : 'var(--site-text-muted)', opacity: onDark ? 0.82 : 1 }"
        >
          {{ body }}
        </p>
      </div>

      <a
        v-if="ctaLabel"
        :href="ctaHref"
        class="inline-flex shrink-0 items-center rounded-[var(--site-radius)] px-6 py-3.5 text-[0.9375rem] font-semibold no-underline shadow-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
        :style="
          onDark
            ? { backgroundColor: 'var(--site-surface)', color: 'var(--site-text)' }
            : { backgroundColor: 'var(--site-primary)', color: 'var(--site-primary-ink)' }
        "
      >
        {{ ctaLabel }}
      </a>
    </div>
  </div>
</template>
