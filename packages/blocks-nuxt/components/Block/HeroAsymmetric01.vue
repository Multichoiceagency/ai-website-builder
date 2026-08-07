<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    headline?: string
    subheadline?: string
    primaryLabel?: string
    primaryHref?: string
    image?: string
    imageAlt?: string
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  {
    eyebrow: '',
    headline: '',
    subheadline: '',
    primaryLabel: '',
    primaryHref: '',
    image: '',
    imageAlt: '',
    headingLevel: 'h1',
  },
)
</script>

<template>
  <div class="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6 lg:px-10 lg:py-28">
    <div class="relative z-10 lg:pr-8">
      <p
        v-if="eyebrow"
        class="mb-5 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-primary)]"
      >{{ eyebrow }}</p>
      <component
        :is="headingLevel"
        class="text-[clamp(2.5rem,1.4rem+4.2vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ headline }}</component>
      <p
        v-if="subheadline"
        class="mt-6 max-w-md text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text-muted)]"
      >{{ subheadline }}</p>
      <a
        v-if="primaryLabel"
        :href="primaryHref"
        class="mt-9 inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-text)] px-6 py-3.5 text-[0.9375rem] font-semibold text-[var(--site-surface)] no-underline transition-[transform] duration-150 hover:-translate-y-0.5"
      >
        {{ primaryLabel }}
        <BlockIcon name="arrow-right" class="h-4 w-4" />
      </a>
    </div>

    <div class="relative lg:-ml-8 lg:mt-12">
      <div
        class="absolute -inset-3 -rotate-2 rounded-[calc(var(--site-radius)*2)] bg-[color-mix(in_oklab,var(--site-primary)_14%,transparent)]"
        aria-hidden="true"
      />
      <div class="relative aspect-[4/5] overflow-hidden rounded-[calc(var(--site-radius)*2)] bg-[var(--site-surface-alt)] shadow-[0_28px_60px_-24px_rgb(0_0_0/0.35)]">
        <img
          v-if="image"
          :src="image"
          :alt="imageAlt"
          class="h-full w-full object-cover"
          width="720"
          height="900"
          loading="eager"
        />
        <div
          v-else
          class="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--site-primary)_35%,var(--site-surface-alt))_0%,var(--site-surface-alt)_55%,color-mix(in_oklab,var(--site-accent)_25%,var(--site-surface))_100%)]"
          aria-hidden="true"
        />
      </div>
    </div>
  </div>
</template>
