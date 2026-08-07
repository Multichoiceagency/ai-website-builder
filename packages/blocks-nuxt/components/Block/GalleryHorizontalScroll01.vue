<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Slide {
  title: string
  caption: string
  image: string
  imageAlt: string
}

withDefaults(defineProps<{ heading?: string; intro?: string; items?: Slide[] }>(), {
  heading: '',
  intro: '',
  items: () => [],
})

const root = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
/** Pixels the track is shifted left. Applied as a transform, never as `left`. */
const shift = ref(0)
/** Off until we know the viewport is wide enough and motion is welcome. */
const linked = ref(false)

let observer: IntersectionObserver | null = null
let frame = 0

function measure() {
  const section = root.value
  const rail = track.value
  if (!section || !rail) return

  const distance = Math.max(rail.scrollWidth - section.clientWidth, 0)
  const span = Math.max(section.offsetHeight - window.innerHeight, 1)
  const progress = Math.min(Math.max(-section.getBoundingClientRect().top / span, 0), 1)
  shift.value = distance * progress
  frame = requestAnimationFrame(measure)
}

function stop() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

/**
 * Scroll-linked horizontal travel — the expensive part of this block, and the
 * reason it is class C.
 *
 * It only ever sets a `translate3d`, it only measures while the section is on
 * screen, and it does not run at all on narrow viewports or for reduced-motion
 * users. Those cases fall back to a native horizontal scroll container, which
 * is the better interaction on a phone anyway.
 */
onMounted(() => {
  const wide = window.matchMedia('(min-width: 1024px)').matches
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!wide || reduced || !root.value || typeof IntersectionObserver === 'undefined') return

  linked.value = true
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !frame) frame = requestAnimationFrame(measure)
        else if (!entry.isIntersecting) stop()
      }
    },
    { threshold: 0 },
  )
  observer.observe(root.value)
})

onBeforeUnmount(() => {
  stop()
  observer?.disconnect()
})
</script>

<template>
  <div ref="root" :class="linked ? 'h-[280vh]' : ''">
    <div :class="linked ? 'sticky top-0 flex h-screen flex-col justify-center overflow-hidden' : 'py-20 lg:py-24'">
      <div class="mx-auto w-full max-w-6xl px-6 lg:px-10">
        <h2
          v-if="heading"
          class="text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance text-[var(--site-text)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >{{ heading }}</h2>
        <p v-if="intro" class="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
      </div>

      <ul
        ref="track"
        class="mt-10 flex gap-6 px-6 lg:px-10"
        :class="linked ? 'w-max will-change-transform' : 'snap-x snap-mandatory overflow-x-auto pb-4'"
        :style="linked ? { transform: `translate3d(${-shift}px, 0, 0)` } : undefined"
      >
        <li
          v-for="item in items"
          :key="item.title"
          class="w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-[34vw]"
        >
          <figure>
            <div class="aspect-[4/3] overflow-hidden rounded-[calc(var(--site-radius)*2)] bg-[var(--site-surface-alt)]">
              <img
                v-if="item.image"
                :src="item.image"
                :alt="item.imageAlt"
                class="h-full w-full object-cover"
                width="800"
                height="600"
                loading="lazy"
              />
              <div
                v-else
                class="h-full w-full bg-[radial-gradient(100%_80%_at_30%_20%,var(--site-primary)_0%,transparent_70%)] opacity-25"
                aria-hidden="true"
              />
            </div>
            <figcaption class="mt-4">
              <p class="text-[1.0625rem] font-semibold tracking-[-0.015em] text-[var(--site-text)]">{{ item.title }}</p>
              <p v-if="item.caption" class="mt-1 text-[0.875rem] text-[var(--site-text-muted)]">{{ item.caption }}</p>
            </figcaption>
          </figure>
        </li>
      </ul>
    </div>
  </div>
</template>
