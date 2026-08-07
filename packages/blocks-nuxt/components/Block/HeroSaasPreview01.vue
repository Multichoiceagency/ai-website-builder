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
    previewImage?: string
    previewAlt?: string
    previewCaption?: string
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
    previewImage: '',
    previewAlt: '',
    previewCaption: '',
    headingLevel: 'h1',
  },
)
</script>

<template>
  <div class="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-10 lg:py-28">
    <div>
      <p
        v-if="eyebrow"
        class="mb-5 inline-flex items-center rounded-full border border-[var(--site-line-strong)] bg-[var(--site-surface-alt)] px-3 py-1 text-[0.8125rem] font-semibold text-[var(--site-text)]"
      >{{ eyebrow }}</p>

      <component
        :is="headingLevel"
        class="text-[clamp(2.25rem,1.3rem+3.6vw,3.85rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ headline }}</component>

      <p
        v-if="subheadline"
        class="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text-muted)]"
      >{{ subheadline }}</p>

      <div v-if="primaryLabel || secondaryLabel" class="mt-9 flex flex-wrap items-center gap-3">
        <a
          v-if="primaryLabel"
          :href="primaryHref"
          class="inline-flex items-center rounded-[var(--site-radius)] bg-[var(--site-primary)] px-6 py-3.5 text-[0.9375rem] font-semibold text-[var(--site-primary-ink)] no-underline shadow-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lg"
        >{{ primaryLabel }}</a>
        <a
          v-if="secondaryLabel"
          :href="secondaryHref"
          class="inline-flex items-center rounded-[var(--site-radius)] border border-[var(--site-line-strong)] px-6 py-3.5 text-[0.9375rem] font-semibold text-[var(--site-text)] no-underline transition-colors duration-150 hover:bg-[var(--site-surface-alt)]"
        >{{ secondaryLabel }}</a>
      </div>
    </div>

    <div class="relative">
      <div
        class="absolute -inset-4 rounded-[calc(var(--site-radius)*2.5)] bg-[radial-gradient(70%_70%_at_50%_0%,color-mix(in_oklab,var(--site-primary)_28%,transparent),transparent_70%)]"
        aria-hidden="true"
      />
      <figure class="relative overflow-hidden rounded-[calc(var(--site-radius)*2)] border border-[var(--site-line)] bg-[var(--site-surface)] shadow-[0_28px_70px_-28px_rgb(0_0_0/0.35)]">
        <div class="flex items-center gap-1.5 border-b border-[var(--site-line)] bg-[var(--site-surface-alt)] px-4 py-3">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--site-line-strong)]" />
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--site-line-strong)]" />
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--site-line-strong)]" />
          <span class="ml-3 truncate text-[0.6875rem] text-[var(--site-text-muted)]">{{ previewCaption || 'Preview' }}</span>
        </div>
        <div class="aspect-[4/3] bg-[var(--site-surface-alt)]">
          <img
            v-if="previewImage"
            :src="previewImage"
            :alt="previewAlt"
            class="h-full w-full object-cover"
            width="800"
            height="600"
            loading="eager"
          />
          <div
            v-else
            class="flex h-full flex-col gap-3 p-6"
            aria-hidden="true"
          >
            <span class="h-3 w-1/3 rounded bg-[var(--site-line)]" />
            <span class="h-3 w-2/3 rounded bg-[var(--site-line)]" />
            <span class="mt-2 h-24 rounded-lg bg-[color-mix(in_oklab,var(--site-primary)_18%,var(--site-surface))]" />
            <span class="h-3 w-1/2 rounded bg-[var(--site-line)]" />
            <span class="h-3 w-3/5 rounded bg-[var(--site-line)]" />
          </div>
        </div>
      </figure>
    </div>
  </div>
</template>
