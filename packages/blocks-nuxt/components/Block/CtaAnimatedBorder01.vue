<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    heading?: string
    body?: string
    ctaLabel?: string
    ctaHref?: string
    secondaryLabel?: string
    secondaryHref?: string
    tone?: 'light' | 'muted' | 'primary' | 'dark'
  }>(),
  { heading: '', body: '', ctaLabel: '', ctaHref: '', secondaryLabel: '', secondaryHref: '', tone: 'dark' },
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

const button = computed(() =>
  props.tone === 'light' || props.tone === 'muted'
    ? { backgroundColor: 'var(--site-primary)', color: 'var(--site-primary-ink)' }
    : { backgroundColor: 'var(--site-surface)', color: 'var(--site-text)' },
)
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-16 lg:px-10 lg:py-20">
    <!--
      One conic gradient rotating behind one solid panel, clipped by the
      container's own radius. That is the entire effect: no canvas, no
      per-frame JavaScript, one animated element for the whole section.
    -->
    <div class="relative isolate overflow-hidden rounded-[calc(var(--site-radius)*2.5)] p-px">
      <span
        class="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2 [animation:border-sweep_9s_linear_infinite] motion-reduce:animate-none"
        style="background: conic-gradient(from 0deg, transparent 0deg, var(--site-primary) 60deg, var(--site-accent) 110deg, transparent 180deg, transparent 360deg)"
        aria-hidden="true"
      />
      <!-- A static ring so the panel still has an edge when motion is off. -->
      <span class="pointer-events-none absolute inset-0 -z-10 rounded-[calc(var(--site-radius)*2.5)] bg-[var(--site-line)] opacity-60" aria-hidden="true" />

      <div
        class="relative grid gap-8 rounded-[calc(var(--site-radius)*2.5-1px)] px-8 py-14 text-center lg:px-14"
        :style="surface"
      >
        <div>
          <h2
            class="mx-auto max-w-2xl text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-balance"
            :style="{ fontFamily: 'var(--site-font-heading)' }"
          >{{ heading }}</h2>
          <p v-if="body" class="mx-auto mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-pretty opacity-80">{{ body }}</p>
        </div>

        <div v-if="ctaLabel || secondaryLabel" class="flex flex-wrap items-center justify-center gap-3">
          <a
            v-if="ctaLabel"
            :href="ctaHref"
            class="inline-flex items-center rounded-[var(--site-radius)] px-7 py-4 text-[0.9375rem] font-semibold no-underline transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:-translate-y-0.5"
            :style="button"
          >{{ ctaLabel }}</a>
          <a
            v-if="secondaryLabel"
            :href="secondaryHref"
            class="inline-flex items-center rounded-[var(--site-radius)] border border-current/25 px-7 py-4 text-[0.9375rem] font-semibold no-underline opacity-85 transition-[transform,opacity] duration-150 hover:-translate-y-0.5 hover:opacity-100"
          >{{ secondaryLabel }}</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes border-sweep {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
</style>
