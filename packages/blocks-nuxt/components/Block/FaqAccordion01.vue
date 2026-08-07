<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    heading?: string
    items?: { question: string; answer: string }[]
    /** Heading rank, so the section fits the page outline where it is placed. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  { heading: '', items: () => [], headingLevel: 'h2' },
)

/**
 * `<details>` gives keyboard support, screen-reader semantics and
 * find-in-page expansion for free. A hand-rolled accordion gives none of it.
 */
const faqSchema = computed(() =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: props.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }),
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

    <div class="mt-8 divide-y divide-[var(--site-line)] border-y border-[var(--site-line)]">
      <details v-for="item in items" :key="item.question" class="group py-1">
        <summary
          class="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-[1.0625rem] font-semibold text-[var(--site-text)] [&::-webkit-details-marker]:hidden"
        >
          {{ item.question }}
          <span
            class="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--site-line)] text-[var(--site-text-muted)] transition-transform duration-200 group-open:rotate-45"
            aria-hidden="true"
          >+</span>
        </summary>
        <p class="pb-5 pr-12 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">{{ item.answer }}</p>
      </details>
    </div>

    <component :is="'script'" v-if="items.length" type="application/ld+json" v-html="faqSchema" />
  </div>
</template>
