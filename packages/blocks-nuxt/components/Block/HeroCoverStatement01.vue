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
    /** Same-origin looping background path (e.g. `/motionsites/…mp4`). */
    video?: string
    imageAlt?: string
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
    video: '',
    imageAlt: '',
    headingLevel: 'h1',
  },
)
</script>

<template>
  <div class="relative isolate overflow-hidden">
    <video
      v-if="video"
      :src="video"
      class="absolute inset-0 h-full w-full object-cover opacity-35"
      autoplay
      muted
      loop
      playsinline
      aria-hidden="true"
    />
    <img
      v-else-if="image"
      :src="image"
      :alt="imageAlt"
      class="absolute inset-0 h-full w-full object-cover opacity-35"
      width="1600"
      height="900"
      loading="eager"
    />
    <div
      class="absolute inset-0 bg-[radial-gradient(90%_80%_at_50%_-10%,color-mix(in_oklab,var(--site-primary)_20%,transparent),transparent_55%),linear-gradient(180deg,var(--site-surface)_0%,var(--site-surface-alt)_100%)]"
      aria-hidden="true"
    />

    <div class="relative mx-auto w-full max-w-3xl px-6 py-24 text-center lg:px-10 lg:py-32">
      <p
        v-if="eyebrow"
        class="mb-5 text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-[var(--site-primary)]"
      >{{ eyebrow }}</p>
      <component
        :is="headingLevel"
        class="text-[clamp(2.25rem,1.3rem+3.8vw,4rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ headline }}</component>
      <p
        v-if="subheadline"
        class="mx-auto mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text-muted)]"
      >{{ subheadline }}</p>
      <div v-if="primaryLabel || secondaryLabel" class="mt-10 flex flex-wrap items-center justify-center gap-3">
        <a
          v-if="primaryLabel"
          :href="primaryHref"
          class="inline-flex items-center rounded-[var(--site-radius)] bg-[var(--site-primary)] px-6 py-3.5 text-[0.9375rem] font-semibold text-[var(--site-primary-ink)] no-underline transition-[transform] duration-150 hover:-translate-y-0.5"
        >{{ primaryLabel }}</a>
        <a
          v-if="secondaryLabel"
          :href="secondaryHref"
          class="inline-flex items-center rounded-[var(--site-radius)] border border-[var(--site-line-strong)] px-6 py-3.5 text-[0.9375rem] font-semibold text-[var(--site-text)] no-underline transition-colors duration-150 hover:bg-[var(--site-surface)]"
        >{{ secondaryLabel }}</a>
      </div>
    </div>
  </div>
</template>
