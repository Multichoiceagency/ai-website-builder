<script setup lang="ts">
import type { IconName } from '@platform/blocks'

withDefaults(
  defineProps<{
    headline?: string
    primaryLabel?: string
    primaryHref?: string
    image?: string
    imageAlt?: string
    facts?: { icon: IconName; label: string; value: string }[]
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  {
    headline: '',
    primaryLabel: '',
    primaryHref: '',
    image: '',
    imageAlt: '',
    facts: () => [],
    headingLevel: 'h1',
  },
)
</script>

<template>
  <div class="relative isolate min-h-[min(85vh,52rem)] overflow-hidden bg-[var(--site-text)] text-white">
    <img
      v-if="image"
      :src="image"
      :alt="imageAlt"
      class="absolute inset-0 h-full w-full object-cover"
      width="1600"
      height="1000"
      loading="eager"
      fetchpriority="high"
    />
    <div
      v-else
      class="absolute inset-0 bg-[radial-gradient(80%_70%_at_70%_20%,color-mix(in_oklab,var(--site-primary)_55%,transparent),transparent_60%),linear-gradient(160deg,#0b1220_0%,#1e293b_55%,#0f172a_100%)]"
      aria-hidden="true"
    />
    <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/20" aria-hidden="true" />

    <div class="relative mx-auto flex min-h-[min(85vh,52rem)] w-full max-w-6xl flex-col justify-end px-6 pb-8 pt-28 lg:px-10 lg:pb-10">
      <component
        :is="headingLevel"
        class="max-w-3xl text-[clamp(2.75rem,1.5rem+5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-balance text-white"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ headline }}</component>

      <a
        v-if="primaryLabel"
        :href="primaryHref"
        class="mt-8 inline-flex w-fit items-center rounded-[var(--site-radius)] bg-white/95 px-5 py-2.5 text-[0.875rem] font-semibold text-neutral-950 no-underline backdrop-blur-sm transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-white"
      >{{ primaryLabel }}</a>

      <ul
        v-if="facts.length"
        class="mt-10 grid gap-4 rounded-2xl bg-white p-4 text-[var(--site-text)] shadow-[0_24px_60px_-24px_rgb(0_0_0/0.45)] sm:grid-cols-2 lg:grid-cols-4 lg:gap-2 lg:p-5"
      >
        <li
          v-for="(fact, index) in facts"
          :key="`${fact.label}-${index}`"
          class="flex items-center gap-3 px-2 py-1"
        >
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--site-surface-alt)] text-[var(--site-primary)]">
            <BlockIcon :name="fact.icon" class="h-5 w-5" />
          </span>
          <span class="min-w-0">
            <span class="block truncate text-[0.9375rem] font-semibold tabular-nums">{{ fact.value }}</span>
            <span class="block truncate text-[0.75rem] text-[var(--site-text-muted)]">{{ fact.label }}</span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
