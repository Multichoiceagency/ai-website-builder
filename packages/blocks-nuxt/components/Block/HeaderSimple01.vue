<script setup lang="ts">
import { computed, inject, toRef, unref } from 'vue'

const props = withDefaults(
  defineProps<{
    brand?: string
    logo?: string
    layout?: 'left' | 'center' | 'split'
    links?: { label: string; href: string }[]
    ctaLabel?: string
    ctaHref?: string
    sticky?: boolean
  }>(),
  { brand: '', logo: '', layout: 'left', links: () => [], ctaLabel: '', ctaHref: '', sticky: true },
)

/** Site business / SEO logo from editor or storefront (empty string when unset). */
const siteBrandLogo = inject<string | { value: string }>('platformBrandLogo', '')

const resolvedLogo = computed(() => {
  const section = (props.logo ?? '').trim()
  if (section) return section
  return String(unref(siteBrandLogo) ?? '').trim()
})

const layout = toRef(props, 'layout')

const rowClass = computed(() => {
  switch (layout.value) {
    case 'center':
      return 'flex-col justify-center gap-3 py-3 md:flex-row md:items-center md:gap-6 md:py-0'
    case 'split':
      return 'justify-between gap-6'
    default:
      return 'gap-6'
  }
})

const brandClass = computed(() => (layout.value === 'center' ? 'justify-center' : 'shrink-0'))

const navClass = computed(() => {
  if (layout.value === 'center') return 'flex justify-center'
  if (layout.value === 'split') return 'absolute left-1/2 hidden -translate-x-1/2 md:flex'
  return 'ml-auto hidden md:flex'
})

const ctaClass = computed(() => {
  if (layout.value === 'center') return ''
  if (layout.value === 'split') return 'shrink-0'
  return 'ml-auto shrink-0 md:ml-0'
})
</script>

<template>
  <header
    class="z-40 border-b border-[var(--site-line)] bg-[var(--site-surface)]/85 backdrop-blur-md"
    :class="sticky ? 'sticky top-0' : 'relative'"
  >
    <div
      class="relative mx-auto flex h-auto min-h-16 w-full max-w-6xl items-center px-6 lg:px-10"
      :class="rowClass"
    >
      <a href="/" class="flex items-center gap-2.5 no-underline" :class="brandClass">
        <img
          v-if="resolvedLogo"
          :src="resolvedLogo"
          :alt="brand || 'Logo'"
          class="h-8 w-auto"
          width="32"
          height="32"
        />
        <span
          v-if="brand"
          class="text-[1.0625rem] font-semibold tracking-[-0.02em] text-[var(--site-text)]"
          :class="resolvedLogo ? 'sr-only' : ''"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >
          {{ brand }}
        </span>
      </a>

      <nav
        v-if="links.length"
        aria-label="Hoofdnavigatie"
        class="items-center gap-1"
        :class="navClass"
      >
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
        class="inline-flex items-center rounded-[var(--site-radius)] bg-[var(--site-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--site-primary-ink)] no-underline shadow-sm transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-px hover:shadow-md hover:bg-[var(--site-primary-hover)] active:translate-y-0"
        :class="ctaClass"
      >
        {{ ctaLabel }}
      </a>
    </div>
  </header>
</template>
