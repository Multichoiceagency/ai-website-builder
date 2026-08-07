<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ heading?: string; intro?: string; items?: { question: string; answer: string }[] }>(),
  { heading: '', intro: '', items: () => [] },
)

/**
 * `<details>` again, on purpose: keyboard support, screen-reader semantics and
 * find-in-page expansion arrive for free, and the accordion works before any
 * JavaScript has run. The reveal is a CSS animation on the panel that plays
 * when the element is opened — opacity and transform only, never height.
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
    <h2
      v-if="heading"
      class="text-[clamp(1.625rem,1.2rem+1.6vw,2.25rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-balance text-[var(--site-text)]"
      :style="{ fontFamily: 'var(--site-font-heading)' }"
    >{{ heading }}</h2>
    <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>

    <div class="mt-9 space-y-3">
      <details
        v-for="item in items"
        :key="item.question"
        class="group overflow-hidden rounded-[calc(var(--site-radius)*1.5)] border border-[var(--site-line)] bg-[var(--site-surface)] transition-[border-color,box-shadow] duration-200 open:shadow-[0_16px_44px_-32px_rgb(0_0_0/0.45)] hover:border-[var(--site-text)]/25"
      >
        <summary
          class="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-[1.0625rem] font-semibold text-[var(--site-text)] [&::-webkit-details-marker]:hidden"
        >
          {{ item.question }}
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--site-line)] text-[var(--site-text-muted)] transition-transform duration-300 ease-out group-open:rotate-45 group-open:border-[var(--site-primary)] group-open:text-[var(--site-primary)] motion-reduce:transition-none"
            aria-hidden="true"
          >+</span>
        </summary>

        <p
          class="px-6 pb-6 text-[0.9375rem] leading-relaxed text-pretty text-[var(--site-text-muted)] [animation:faq-unfold_0.34s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
        >{{ item.answer }}</p>
      </details>
    </div>

    <component :is="'script'" v-if="items.length" type="application/ld+json" v-html="faqSchema" />
  </div>
</template>

<style>
@keyframes faq-unfold {
  from { opacity: 0; transform: translate3d(0, -0.5rem, 0); }
  to { opacity: 1; transform: none; }
}
</style>
