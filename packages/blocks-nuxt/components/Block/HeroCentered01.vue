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
    align?: 'left' | 'center'
    /**
     * Rank this hero's headline renders at. A page with two heroes demotes the
     * second one here rather than shipping two H1s — see the section SEO in
     * `@platform/schemas`.
     */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  {
    eyebrow: '', headline: '', subheadline: '',
    primaryLabel: '', primaryHref: '', secondaryLabel: '', secondaryHref: '',
    align: 'center',
    headingLevel: 'h1',
  },
)
</script>

<template>
  <div
    class="mx-auto w-full max-w-4xl px-6 py-20 lg:px-10 lg:py-28"
    :class="align === 'center' ? 'text-center' : 'text-left'"
  >
    <p
      v-if="eyebrow"
      class="mb-5 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-primary)]"
    >
      {{ eyebrow }}
    </p>

    <component
      :is="headingLevel"
      class="text-[clamp(2.125rem,1.3rem+3.2vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-balance text-[var(--site-text)]"
      :style="{ fontFamily: 'var(--site-font-heading)' }"
    >
      {{ headline }}
    </component>

    <p
      v-if="subheadline"
      class="mt-6 text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text-muted)]"
      :class="align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'"
    >
      {{ subheadline }}
    </p>

    <div
      v-if="primaryLabel || secondaryLabel"
      class="mt-9 flex flex-wrap items-center gap-3"
      :class="align === 'center' ? 'justify-center' : ''"
    >
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
        class="inline-flex items-center rounded-[var(--site-radius)] border border-[var(--site-line-strong)] px-6 py-3.5 text-[0.9375rem] font-semibold text-[var(--site-text)] no-underline transition-colors duration-150 hover:bg-[var(--site-surface-alt)]"
      >
        {{ secondaryLabel }}
      </a>
    </div>
  </div>
</template>
