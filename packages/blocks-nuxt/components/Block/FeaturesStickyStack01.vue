<script setup lang="ts">
import type { IconName } from '@platform/blocks'

withDefaults(
  defineProps<{
    heading?: string
    intro?: string
    items?: { icon: IconName; title: string; description: string }[]
  }>(),
  { heading: '', intro: '', items: () => [] },
)
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-20 lg:px-10 lg:py-28">
    <div class="max-w-2xl">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <!--
      The stack is `position: sticky`, not an animation: each card parks below
      the previous one and the next slides over it as the page scrolls. Sticky
      is handled off the main thread by the browser, which is why this reads as
      choreography without costing a scroll handler.

      On small screens the offsets collapse and it becomes an ordinary list, so
      a phone never has to hold five overlapping layers.
    -->
    <ol class="mt-12 lg:mt-16">
      <li
        v-for="(item, index) in items"
        :key="item.title"
        class="lg:sticky lg:pt-[var(--stack-offset)]"
        :style="{ '--stack-offset': `${index * 3.25}rem`, top: '6rem' }"
      >
        <article
          class="mb-5 flex gap-5 rounded-[calc(var(--site-radius)*1.75)] border border-[var(--site-line)] bg-[var(--site-surface)] p-7 shadow-[0_18px_50px_-32px_rgb(0_0_0/0.45)] transition-transform duration-300 lg:mb-0 lg:p-9"
        >
          <span
            class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--site-primary)]/10 text-[var(--site-primary)]"
          >
            <BlockIcon :name="item.icon" class="h-5 w-5" />
          </span>
          <div>
            <p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-text-muted)]">
              {{ String(index + 1).padStart(2, '0') }}
            </p>
            <h3 class="mt-1.5 text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--site-text)]">{{ item.title }}</h3>
            <p class="mt-2 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">{{ item.description }}</p>
          </div>
        </article>
      </li>
    </ol>

    <!-- Tail space so the last card can reach the top of the viewport before
         the section leaves it. Removed on mobile, where nothing sticks. -->
    <div class="hidden lg:block lg:h-[40vh]" aria-hidden="true" />
  </div>
</template>
