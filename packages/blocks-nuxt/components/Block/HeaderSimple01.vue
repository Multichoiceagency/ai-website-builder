<script setup lang="ts">
withDefaults(
  defineProps<{
    brand?: string
    logo?: string
    links?: { label: string; href: string }[]
    ctaLabel?: string
    ctaHref?: string
    sticky?: boolean
  }>(),
  { brand: '', logo: '', links: () => [], ctaLabel: '', ctaHref: '', sticky: true },
)
</script>

<template>
  <header
    class="z-40 border-b border-[var(--site-line)] bg-[var(--site-surface)]/85 backdrop-blur-md"
    :class="sticky ? 'sticky top-0' : 'relative'"
  >
    <div class="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-6 lg:px-10">
      <a href="/" class="flex shrink-0 items-center gap-2.5 no-underline">
        <img v-if="logo" :src="logo" :alt="brand" class="h-8 w-auto" width="32" height="32" />
        <span
          class="text-[1.0625rem] font-semibold tracking-[-0.02em] text-[var(--site-text)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >
          {{ brand }}
        </span>
      </a>

      <nav v-if="links.length" aria-label="Hoofdnavigatie" class="ml-auto hidden items-center gap-1 md:flex">
        <a
          v-for="link in links"
          :key="link.href + link.label"
          :href="link.href"
          class="rounded-md px-3 py-2 text-sm font-medium text-[var(--site-text-muted)] no-underline transition-colors duration-150 hover:bg-[var(--site-surface-alt)] hover:text-[var(--site-text)]"
        >
          {{ link.label }}
        </a>
      </nav>

      <a
        v-if="ctaLabel"
        :href="ctaHref"
        class="ml-auto inline-flex shrink-0 items-center rounded-[var(--site-radius)] bg-[var(--site-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--site-primary-ink)] no-underline shadow-sm transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-px hover:shadow-md hover:bg-[var(--site-primary-hover)] active:translate-y-0 md:ml-0"
      >
        {{ ctaLabel }}
      </a>
    </div>
  </header>
</template>
