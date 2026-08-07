<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    kicker?: string
    heading?: string
    body?: string
    ctaLabel?: string
    ctaHref?: string
    tone?: 'light' | 'muted' | 'primary' | 'dark'
  }>(),
  { kicker: '', heading: '', body: '', ctaLabel: '', ctaHref: '', tone: 'primary' },
)

const surface = computed(
  () =>
    ({
      light: { backgroundColor: 'var(--site-surface)', color: 'var(--site-text)' },
      muted: { backgroundColor: 'var(--site-surface-alt)', color: 'var(--site-text)' },
      primary: { backgroundColor: 'var(--site-primary)', color: 'var(--site-primary-ink)' },
      dark: { backgroundColor: 'var(--site-text)', color: 'var(--site-surface)' },
    })[props.tone],
)

/** The button inverts the band, so it is always the highest-contrast thing on it. */
const button = computed(() =>
  props.tone === 'light' || props.tone === 'muted'
    ? { backgroundColor: 'var(--site-text)', color: 'var(--site-surface)' }
    : { backgroundColor: 'var(--site-surface)', color: 'var(--site-text)' },
)
</script>

<template>
  <div :style="surface">
    <div class="mx-auto grid w-full max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1.3fr_auto] lg:items-end lg:px-10 lg:py-24">
      <div>
        <p v-if="kicker" class="mb-5 text-[0.75rem] font-bold uppercase tracking-[0.2em] opacity-70">{{ kicker }}</p>
        <h2
          class="text-[clamp(2rem,1.2rem+3vw,4rem)] font-bold uppercase leading-[0.94] tracking-[-0.045em] text-balance"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >{{ heading }}</h2>
        <p v-if="body" class="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-pretty opacity-85">{{ body }}</p>
      </div>

      <a
        v-if="ctaLabel"
        :href="ctaHref"
        class="inline-flex items-center gap-3 self-start px-8 py-5 text-[1rem] font-bold uppercase tracking-[0.08em] no-underline transition-transform duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 lg:self-end"
        :style="button"
      >
        {{ ctaLabel }}
        <span aria-hidden="true">→</span>
      </a>
    </div>
  </div>
</template>
