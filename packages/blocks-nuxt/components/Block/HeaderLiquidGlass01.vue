<script setup lang="ts">
import { computed } from 'vue'

/**
 * Wanderful-style liquid-glass header — always outside the Motionsites design.
 *
 * Never overlays the hero: sticky in-flow chrome with a solid bar so the island
 * below starts cleanly underneath (dashboard + storefront).
 *
 * Logo is opt-in only (section prop). Empty logo keeps the Motionsites wordmark —
 * no site-brand fallback — so exact islands stay cinematic.
 */
const config = useRuntimeConfig()
const pinToViewport = computed(() => config.public.surface === 'storefront')

const props = withDefaults(
  defineProps<{
    brand?: string
    logo?: string
    logoHeight?: 'sm' | 'md' | 'lg' | 'xl'
    trademark?: boolean
    layout?: 'left' | 'center' | 'split'
    links?: { label: string; href: string }[]
    ctaLabel?: string
    ctaHref?: string
  }>(),
  {
    brand: 'Wanderful',
    logo: '',
    logoHeight: 'md',
    trademark: true,
    layout: 'split',
    links: () => [
      { label: 'JOURNEY', href: '#journey' },
      { label: 'BENEFITS', href: '#benefits' },
      { label: 'JOURNAL', href: '#journal' },
      { label: 'GUIDEBOOK', href: '#guidebook' },
    ],
    ctaLabel: 'GET ROAMING',
    ctaHref: '#plan',
  },
)

const logoSrc = computed(() => (props.logo ?? '').trim())

const logoClass = computed(() => {
  switch (props.logoHeight) {
    case 'sm':
      return 'h-5 w-auto'
    case 'lg':
      return 'h-10 w-auto'
    case 'xl':
      return 'h-14 w-auto'
    default:
      return 'h-7 w-auto'
  }
})

const headerClass = computed(() => {
  switch (props.layout) {
    case 'center':
      return 'flex-col items-center justify-center gap-4'
    case 'left':
      return 'items-center justify-start gap-6'
    default:
      return 'items-center justify-between'
  }
})

const navClass = computed(() => {
  if (props.layout === 'left') return 'ml-auto hidden md:flex'
  if (props.layout === 'center') return 'flex'
  return 'hidden md:flex'
})
</script>

<template>
  <div
    class="relative w-full bg-neutral-950"
    :class="pinToViewport ? 'sticky top-0 z-50' : 'z-0'"
  >
    <header
      class="pointer-events-none relative inset-x-0 top-0 flex px-6 py-6 text-white sm:px-10 sm:py-8"
      :class="headerClass"
    >
      <a
        href="/"
        class="pointer-events-auto flex shrink-0 items-center gap-2 text-[17px] font-semibold tracking-tight text-white no-underline"
      >
        <img
          v-if="logoSrc"
          :src="logoSrc"
          :alt="brand"
          :class="logoClass"
          width="28"
          height="28"
        />
        <template v-else>
          {{ brand }}<sup v-if="trademark" class="ml-0.5 text-[0.65em]">TM</sup>
        </template>
      </a>

      <nav
        v-if="links.length"
        aria-label="Primary"
        class="liquid-glass pointer-events-auto items-center gap-1 rounded-full px-2 py-2"
        :class="navClass"
      >
        <a
          v-for="link in links"
          :key="link.href + link.label"
          :href="link.href"
          class="relative z-[1] rounded-full px-4 py-1.5 text-[11px] font-medium tracking-[0.12em] text-white/95 no-underline transition-colors duration-200 hover:text-white"
        >
          {{ link.label }}
        </a>
      </nav>

      <a
        v-if="ctaLabel"
        :href="ctaHref"
        class="liquid-glass pointer-events-auto relative z-[1] shrink-0 rounded-full px-5 py-2.5 text-[11px] font-medium tracking-[0.12em] text-white/95 no-underline transition-colors duration-200 hover:text-white"
      >
        {{ ctaLabel }}
      </a>
    </header>
  </div>
</template>

<style scoped>
.liquid-glass {
  background: rgba(15, 15, 15, 0.55);
  background-blend-mode: normal;
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.14),
    0 8px 24px rgba(0, 0, 0, 0.18);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.45) 0%,
    rgba(255, 255, 255, 0.15) 20%,
    rgba(255, 255, 255, 0) 40%,
    rgba(255, 255, 255, 0) 60%,
    rgba(255, 255, 255, 0.15) 80%,
    rgba(255, 255, 255, 0.45) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
</style>
