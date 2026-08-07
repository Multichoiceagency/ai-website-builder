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
    headingLevel: 'h1',
  },
)

/**
 * One mask per line. The mask is an `overflow: hidden` wrapper and the motion
 * is a `translate3d` on the line inside it — no clip-path recalculation, no
 * layout. With `prefers-reduced-motion` the animation never runs and each line
 * sits at its natural position, which is where the animation would have ended.
 */
const lines = computed(() =>
  props.headline
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean),
)
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-24 lg:px-10 lg:py-32">
    <p
      v-if="eyebrow"
      class="mb-6 text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-[var(--site-primary)] [animation:mask-fade_0.7s_ease-out_both] motion-reduce:animate-none"
    >
      {{ eyebrow }}
    </p>

    <component
      :is="headingLevel"
      class="text-[clamp(2.25rem,1.3rem+4vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[var(--site-text)]"
      :style="{ fontFamily: 'var(--site-font-heading)' }"
    >
      <span v-for="(line, index) in lines" :key="`${line}-${index}`" class="block overflow-hidden pb-[0.08em]">
        <span
          class="block [animation:mask-rise_0.95s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
          :style="{ animationDelay: `${index * 110}ms` }"
        >{{ line }}</span>
      </span>
    </component>

    <!-- The rule draws itself with scaleX, which the compositor handles; a
         width transition here would relayout the section on every frame. -->
    <span
      class="mt-9 block h-px w-full origin-left bg-[var(--site-line)] [animation:mask-rule_1.1s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
      :style="{ animationDelay: `${lines.length * 110 + 120}ms` }"
      aria-hidden="true"
    />

    <div class="mt-9 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
      <p
        v-if="subheadline"
        class="max-w-md text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text-muted)] [animation:mask-fade_0.9s_ease-out_both] motion-reduce:animate-none"
        :style="{ animationDelay: `${lines.length * 110 + 200}ms` }"
      >
        {{ subheadline }}
      </p>

      <div
        v-if="primaryLabel || secondaryLabel"
        class="flex flex-wrap items-center gap-3 [animation:mask-fade_0.9s_ease-out_both] motion-reduce:animate-none"
        :style="{ animationDelay: `${lines.length * 110 + 280}ms` }"
      >
        <a
          v-if="primaryLabel"
          :href="primaryHref"
          class="inline-flex items-center rounded-[var(--site-radius)] bg-[var(--site-text)] px-6 py-3.5 text-[0.9375rem] font-semibold text-[var(--site-surface)] no-underline transition-[transform,opacity] duration-150 hover:-translate-y-0.5 hover:opacity-90 focus-visible:-translate-y-0.5"
        >{{ primaryLabel }}</a>
        <a
          v-if="secondaryLabel"
          :href="secondaryHref"
          class="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-[var(--site-text)] underline decoration-[var(--site-line)] decoration-2 underline-offset-[6px] transition-[text-decoration-color] duration-150 hover:decoration-[var(--site-primary)]"
        >{{ secondaryLabel }}</a>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes mask-rise {
  from { transform: translate3d(0, 110%, 0); }
  to { transform: translate3d(0, 0, 0); }
}
@keyframes mask-rule {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes mask-fade {
  from { opacity: 0; transform: translate3d(0, 0.75rem, 0); }
  to { opacity: 1; transform: none; }
}
</style>
