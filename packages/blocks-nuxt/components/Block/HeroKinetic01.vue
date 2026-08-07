<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    eyebrow?: string; headline?: string; subheadline?: string
    primaryLabel?: string; primaryHref?: string
    intensity?: 'subtle' | 'pronounced'
    /** Heading rank, so a second hero on a page can be demoted from H1. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  {
    eyebrow: '', headline: '', subheadline: '', primaryLabel: '', primaryHref: '',
    intensity: 'subtle', headingLevel: 'h1',
  },
)

/** Split for per-word entrance. Non-breaking behaviour is preserved by the space in markup. */
const words = computed(() => props.headline.split(/\s+/).filter(Boolean))
const travel = computed(() => (props.intensity === 'pronounced' ? '1.4em' : '0.7em'))
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- Slow gradient field. Pure paint, no layout, no JS. -->
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.16] [animation:kinetic-drift_24s_ease-in-out_infinite_alternate] motion-reduce:animate-none"
      style="background: radial-gradient(60% 60% at 20% 10%, var(--site-primary) 0%, transparent 60%), radial-gradient(50% 50% at 85% 30%, var(--site-accent) 0%, transparent 65%)"
      aria-hidden="true"
    />

    <div class="relative mx-auto w-full max-w-4xl px-6 py-28 text-center lg:px-10 lg:py-36">
      <p v-if="eyebrow" class="mb-6 text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-[var(--site-primary)]">
        {{ eyebrow }}
      </p>

      <component
        :is="headingLevel"
        class="text-[clamp(2.5rem,1.4rem+4.4vw,4.5rem)] font-semibold leading-[1] tracking-[-0.04em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >
        <span
          v-for="(word, index) in words"
          :key="`${word}-${index}`"
          class="inline-block [animation:kinetic-word_0.9s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
          :style="{ animationDelay: `${index * 60}ms`, '--kinetic-travel': travel }"
        >{{ word }}&nbsp;</span>
      </component>

      <p
        v-if="subheadline"
        class="mx-auto mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text-muted)] [animation:kinetic-word_0.9s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
        :style="{ animationDelay: `${words.length * 60 + 120}ms`, '--kinetic-travel': '0.5em' }"
      >
        {{ subheadline }}
      </p>

      <a
        v-if="primaryLabel"
        :href="primaryHref"
        class="mt-10 inline-flex items-center rounded-[var(--site-radius)] bg-[var(--site-primary)] px-7 py-4 text-[0.9375rem] font-semibold text-[var(--site-primary-ink)] no-underline shadow-sm transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:bg-[var(--site-primary-hover)] [animation:kinetic-word_0.9s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
        :style="{ animationDelay: `${words.length * 60 + 220}ms`, '--kinetic-travel': '0.5em' }"
      >{{ primaryLabel }}</a>
    </div>
  </div>
</template>

<style>
@keyframes kinetic-word {
  from { opacity: 0; transform: translate3d(0, var(--kinetic-travel, 0.7em), 0); filter: blur(6px); }
  to { opacity: 1; transform: none; filter: none; }
}
@keyframes kinetic-drift {
  from { transform: translate3d(-3%, -2%, 0) scale(1.05); }
  to { transform: translate3d(3%, 2%, 0) scale(1.15); }
}
</style>
