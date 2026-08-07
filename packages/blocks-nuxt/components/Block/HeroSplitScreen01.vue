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
  <!-- No gutter, no rounding: the split is the composition. On mobile the two
       halves stack, image last, so the message is read before it is decorated. -->
  <div class="grid lg:min-h-[86vh] lg:grid-cols-2">
    <div class="order-2 flex flex-col justify-center px-6 py-16 lg:order-1 lg:px-14 lg:py-20">
      <div class="mx-auto w-full max-w-xl">
        <p
          v-if="eyebrow"
          class="mb-6 inline-block border border-[var(--site-text)] px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[var(--site-text)]"
        >
          {{ eyebrow }}
        </p>

        <component
          :is="headingLevel"
          class="text-[clamp(2.25rem,1.2rem+3.6vw,4rem)] font-bold uppercase leading-[0.94] tracking-[-0.04em] text-balance text-[var(--site-text)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >
          {{ headline }}
        </component>

        <p v-if="subheadline" class="mt-7 text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text-muted)]">
          {{ subheadline }}
        </p>

        <div v-if="primaryLabel || secondaryLabel" class="mt-10 flex flex-wrap items-center gap-4">
          <a
            v-if="primaryLabel"
            :href="primaryHref"
            class="inline-flex items-center bg-[var(--site-text)] px-7 py-4 text-[0.9375rem] font-bold uppercase tracking-[0.08em] text-[var(--site-surface)] no-underline transition-transform duration-150 hover:-translate-y-1 focus-visible:-translate-y-1"
          >{{ primaryLabel }}</a>
          <a
            v-if="secondaryLabel"
            :href="secondaryHref"
            class="inline-flex items-center border-2 border-[var(--site-text)] px-7 py-[0.875rem] text-[0.9375rem] font-bold uppercase tracking-[0.08em] text-[var(--site-text)] no-underline transition-[transform,background-color,color] duration-150 hover:-translate-y-1 hover:bg-[var(--site-text)] hover:text-[var(--site-surface)]"
          >{{ secondaryLabel }}</a>
        </div>
      </div>
    </div>

    <div class="order-1 min-h-[18rem] overflow-hidden bg-[var(--site-text)] lg:order-2 lg:min-h-0">
      <img
        v-if="image"
        :src="image"
        :alt="imageAlt"
        class="h-full w-full object-cover"
        width="1000"
        height="1200"
        loading="eager"
        fetchpriority="high"
      />
      <div
        v-else
        class="h-full w-full bg-[radial-gradient(120%_100%_at_70%_10%,var(--site-primary)_0%,transparent_65%)] opacity-70"
        aria-hidden="true"
      />
    </div>
  </div>
</template>
