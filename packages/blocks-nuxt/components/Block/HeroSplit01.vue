<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    headline?: string
    subheadline?: string
    primaryLabel?: string
    primaryHref?: string
    secondaryLabel?: string
    secondaryHref?: string
    image?: string
    imageAlt?: string
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
    image: '',
    imageAlt: '',
    headingLevel: 'h1',
  },
)
</script>

<template>
  <div class="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-10 lg:py-28">
    <div>
      <p
        v-if="eyebrow"
        class="mb-5 inline-flex items-center rounded-full bg-[var(--site-primary)]/8 px-3 py-1 text-[0.8125rem] font-semibold tracking-[0.01em] text-[var(--site-primary)]"
      >
        {{ eyebrow }}
      </p>

      <component
        :is="headingLevel"
        class="text-[clamp(2.25rem,1.4rem+3.4vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >
        {{ headline }}
      </component>

      <p v-if="subheadline" class="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text-muted)]">
        {{ subheadline }}
      </p>

      <div v-if="primaryLabel || secondaryLabel" class="mt-9 flex flex-wrap items-center gap-3">
        <a
          v-if="primaryLabel"
          :href="primaryHref"
          class="inline-flex items-center rounded-[var(--site-radius)] bg-[var(--site-primary)] px-6 py-3.5 text-[0.9375rem] font-semibold text-[var(--site-primary-ink)] no-underline shadow-sm transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:bg-[var(--site-primary-hover)] active:translate-y-0"
        >
          {{ primaryLabel }}
        </a>
        <a
          v-if="secondaryLabel"
          :href="secondaryHref"
          class="inline-flex items-center rounded-[var(--site-radius)] border border-[var(--site-line-strong)] px-6 py-3.5 text-[0.9375rem] font-semibold text-[var(--site-text)] no-underline transition-colors duration-150 hover:border-[var(--site-text)]/30 hover:bg-[var(--site-surface-alt)]"
        >
          {{ secondaryLabel }}
        </a>
      </div>
    </div>

    <!-- The placeholder is a designed state, not a broken one: a business
         without a photo yet should still ship a hero that looks finished. -->
    <div
      class="relative aspect-[4/3] overflow-hidden rounded-[calc(var(--site-radius)*2)] bg-[var(--site-surface-alt)] shadow-[0_24px_60px_-24px_rgb(0_0_0/0.28)]"
    >
      <img
        v-if="image"
        :src="image"
        :alt="imageAlt"
        class="h-full w-full object-cover"
        width="800"
        height="600"
        loading="eager"
        fetchpriority="high"
      />
      <div
        v-else
        class="absolute inset-0 bg-[radial-gradient(120%_100%_at_20%_0%,var(--site-primary)_0%,transparent_60%)] opacity-[0.16]"
        aria-hidden="true"
      />
    </div>
  </div>
</template>
