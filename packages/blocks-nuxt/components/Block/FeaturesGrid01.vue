<script setup lang="ts">
import type { IconName } from '@platform/blocks'

withDefaults(
  defineProps<{
    eyebrow?: string
    heading?: string
    intro?: string
    items?: { icon: IconName; title: string; description: string }[]
    /** Heading rank, so the section fits the page outline where it is placed. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  { eyebrow: '', heading: '', intro: '', items: () => [], headingLevel: 'h2' },
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="max-w-2xl">
      <p v-if="eyebrow" class="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-primary)]">
        {{ eyebrow }}
      </p>
      <component
        v-if="heading"
        :is="headingLevel"
        class="text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >
        {{ heading }}
      </component>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <ul class="mt-12 grid gap-x-10 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="item in items" :key="item.title">
        <span
          class="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[var(--site-radius)] bg-[var(--site-primary)]/10 text-[var(--site-primary)]"
        >
          <BlockIcon :name="item.icon" class="h-5 w-5" />
        </span>
        <h3 class="text-[1.0625rem] font-semibold tracking-[-0.015em] text-[var(--site-text)]">{{ item.title }}</h3>
        <p class="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">{{ item.description }}</p>
      </li>
    </ul>
  </div>
</template>
