<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'

/**
 * Vanta.js WebGL atmosphere — Three is pinned to 0.134 for Vanta compatibility.
 */
const props = withDefaults(
  defineProps<{
    effect?: 'waves' | 'net' | 'fog' | 'birds' | 'halo'
    color?: string
    backgroundColor?: string
    eyebrow?: string
    headline?: string
    subheadline?: string
    ctaLabel?: string
    ctaHref?: string
    mouseControls?: boolean
  }>(),
  {
    effect: 'waves',
    color: '#14B8A6',
    backgroundColor: '#0B1220',
    eyebrow: '',
    headline: '',
    subheadline: '',
    ctaLabel: '',
    ctaHref: '#',
    mouseControls: true,
  },
)

const root = ref<HTMLElement | null>(null)
let effectInstance: { destroy: () => void } | null = null

function parseHex(value: string, fallback: number): number {
  const cleaned = value.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return fallback
  return Number.parseInt(cleaned, 16)
}

async function loadEffect() {
  effectInstance?.destroy()
  effectInstance = null
  const el = root.value
  if (!el || import.meta.server) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const color = parseHex(props.color, 0x14b8a6)
  const backgroundColor = parseHex(props.backgroundColor, 0x0b1220)
  const shared = {
    el,
    THREE,
    mouseControls: props.mouseControls,
    touchControls: props.mouseControls,
    gyroControls: false,
    minHeight: 200,
    minWidth: 200,
    color,
    backgroundColor,
  }

  switch (props.effect) {
    case 'net': {
      const NET = (await import('vanta/dist/vanta.net.min')).default
      effectInstance = NET({ ...shared, points: 12, maxDistance: 22, spacing: 16 })
      break
    }
    case 'fog': {
      const FOG = (await import('vanta/dist/vanta.fog.min')).default
      effectInstance = FOG({ ...shared, highlightColor: color, midtoneColor: color, lowlightColor: backgroundColor })
      break
    }
    case 'birds': {
      const BIRDS = (await import('vanta/dist/vanta.birds.min')).default
      effectInstance = BIRDS({ ...shared, color1: color, color2: backgroundColor, quantity: 3 })
      break
    }
    case 'halo': {
      const HALO = (await import('vanta/dist/vanta.halo.min')).default
      effectInstance = HALO({ ...shared, baseColor: backgroundColor, size: 1.2 })
      break
    }
    default: {
      const WAVES = (await import('vanta/dist/vanta.waves.min')).default
      effectInstance = WAVES({ ...shared, waveHeight: 18, waveSpeed: 0.7, shininess: 28 })
    }
  }
}

onMounted(() => {
  void loadEffect()
})

watch(
  () => [props.effect, props.color, props.backgroundColor, props.mouseControls] as const,
  () => {
    void loadEffect()
  },
)

onBeforeUnmount(() => {
  effectInstance?.destroy()
  effectInstance = null
})

const hasCopy = computed(
  () => Boolean(props.headline?.trim() || props.subheadline?.trim() || props.ctaLabel?.trim()),
)
</script>

<template>
  <section class="relative isolate min-h-[70vh] w-full overflow-hidden">
    <div ref="root" class="absolute inset-0 -z-10" aria-hidden="true" />
    <div
      v-if="hasCopy"
      class="relative z-10 mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center gap-4 px-6 py-20 text-center text-white"
    >
      <p v-if="eyebrow" class="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-white/70">
        {{ eyebrow }}
      </p>
      <h1
        v-if="headline"
        class="text-balance text-[clamp(2rem,5vw,3.75rem)] font-semibold tracking-tight"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >
        {{ headline }}
      </h1>
      <p v-if="subheadline" class="mx-auto max-w-2xl text-pretty text-[1.0625rem] leading-relaxed text-white/80">
        {{ subheadline }}
      </p>
      <div v-if="ctaLabel" class="mt-2 flex justify-center">
        <a
          :href="ctaHref || '#'"
          class="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-[0.875rem] font-semibold text-neutral-900 no-underline transition hover:bg-white/90"
        >
          {{ ctaLabel }}
        </a>
      </div>
    </div>
  </section>
</template>
