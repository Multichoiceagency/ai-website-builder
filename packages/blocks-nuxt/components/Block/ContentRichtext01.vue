<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    heading?: string
    body?: string
    /** Heading rank, so the section fits the page outline where it is placed. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  { heading: '', body: '', headingLevel: 'h2' },
)

/** Blank lines separate paragraphs. Text is bound, never injected as HTML. */
const paragraphs = computed(() =>
  props.body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean),
)
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-20 lg:px-10 lg:py-24">
    <component
      v-if="heading"
      :is="headingLevel"
      class="text-[clamp(1.625rem,1.2rem+1.6vw,2.25rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-balance text-[var(--site-text)]"
      :style="{ fontFamily: 'var(--site-font-heading)' }"
    >
      {{ heading }}
    </component>
    <div class="mt-6 space-y-5">
      <p v-for="(paragraph, index) in paragraphs" :key="index" class="text-[1.0625rem] leading-[1.75] text-[var(--site-text-muted)]">
        {{ paragraph }}
      </p>
    </div>
  </div>
</template>
