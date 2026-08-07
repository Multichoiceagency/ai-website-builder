<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    headline?: string
    subheadline?: string
    primaryLabel?: string
    primaryHref?: string
    meta?: string
    /** Heading rank, so a second hero on a page can be demoted from H1. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  {
    eyebrow: '', headline: '', subheadline: '', primaryLabel: '', primaryHref: '',
    meta: '', headingLevel: 'h1',
  },
)
</script>

<template>
  <div class="relative overflow-hidden border-b-2 border-[var(--site-text)]">
    <div class="mx-auto w-full max-w-[100rem] px-6 pb-14 pt-24 lg:px-10 lg:pb-20 lg:pt-32">
      <p
        v-if="eyebrow"
        class="mb-8 border-b border-[var(--site-text)] pb-3 text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[var(--site-text)]"
      >
        {{ eyebrow }}
      </p>

      <!--
        Type at this size is the entire design, and type costs the browser
        nothing to draw. The only motion is a single entrance transform, which
        is why a hero this loud is still class B.
      -->
      <component
        :is="headingLevel"
        class="text-[clamp(3rem,0.5rem+11vw,11rem)] font-bold uppercase leading-[0.86] tracking-[-0.05em] text-[var(--site-text)] [animation:oversized-in_0.9s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >
        {{ headline }}
      </component>

      <div class="mt-12 grid gap-8 border-t-2 border-[var(--site-text)] pt-6 sm:grid-cols-[1fr_auto] sm:items-start">
        <p v-if="subheadline" class="max-w-lg text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text-muted)]">
          {{ subheadline }}
        </p>

        <div class="flex flex-col items-start gap-4 sm:items-end">
          <a
            v-if="primaryLabel"
            :href="primaryHref"
            class="inline-flex items-center gap-3 bg-[var(--site-text)] px-7 py-4 text-[0.9375rem] font-bold uppercase tracking-[0.08em] text-[var(--site-surface)] no-underline transition-transform duration-150 hover:-translate-y-1 focus-visible:-translate-y-1"
          >
            {{ primaryLabel }}
            <span aria-hidden="true">→</span>
          </a>
          <p v-if="meta" class="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[var(--site-text-muted)]">
            {{ meta }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes oversized-in {
  from { opacity: 0; transform: translate3d(0, 2.5rem, 0); }
  to { opacity: 1; transform: none; }
}
</style>
