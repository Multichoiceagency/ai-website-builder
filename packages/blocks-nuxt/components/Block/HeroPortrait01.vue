<script setup lang="ts">
withDefaults(
  defineProps<{
    brandMark?: string
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
    brandMark: '',
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
  <div class="relative isolate min-h-[min(90vh,56rem)] overflow-hidden bg-neutral-950 text-white">
    <div class="absolute inset-0 lg:left-[28%]">
      <img
        v-if="image"
        :src="image"
        :alt="imageAlt"
        class="h-full w-full object-cover object-[center_20%]"
        width="1400"
        height="1600"
        loading="eager"
        fetchpriority="high"
      />
      <div
        v-else
        class="h-full w-full bg-[radial-gradient(60%_80%_at_60%_30%,#475569_0%,transparent_55%),linear-gradient(135deg,#0a0a0a_0%,#171717_45%,#262626_100%)]"
        aria-hidden="true"
      />
      <div
        class="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/70 to-transparent max-lg:bg-gradient-to-t max-lg:from-neutral-950 max-lg:via-neutral-950/50 max-lg:to-transparent"
        aria-hidden="true"
      />
    </div>

    <div class="relative mx-auto flex min-h-[min(90vh,56rem)] w-full max-w-6xl flex-col justify-between px-6 py-8 lg:px-10 lg:py-10">
      <div class="flex items-center justify-between gap-4">
        <p
          v-if="brandMark"
          class="text-[0.9375rem] font-semibold tracking-[-0.02em] text-white"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >{{ brandMark }}</p>
        <span
          class="grid h-10 w-10 place-items-center rounded-full border border-white/25 text-white/80"
          aria-hidden="true"
        >
          <BlockIcon name="arrow-up-right" class="h-4 w-4" />
        </span>
      </div>

      <div class="max-w-xl pb-8 pt-24 lg:pb-16 lg:pt-0">
        <p
          v-if="eyebrow"
          class="mb-4 text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-white/60"
        >{{ eyebrow }}</p>
        <component
          :is="headingLevel"
          class="text-[clamp(2.5rem,1.4rem+4.5vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-balance text-white"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >{{ headline }}</component>
        <p
          v-if="subheadline"
          class="mt-6 max-w-md text-[1.0625rem] leading-relaxed text-pretty text-white/70"
        >{{ subheadline }}</p>
        <a
          v-if="primaryLabel"
          :href="primaryHref"
          class="mt-9 inline-flex items-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-[0.9375rem] font-semibold text-white no-underline backdrop-blur-sm transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-white/20"
        >{{ primaryLabel }}</a>
      </div>
    </div>
  </div>
</template>
