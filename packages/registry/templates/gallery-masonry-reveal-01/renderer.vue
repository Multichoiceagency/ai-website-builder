<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Tile {
  caption: string
  image: string
  imageAlt: string
}

withDefaults(
  defineProps<{ heading?: string; intro?: string; items?: Tile[] }>(),
  { heading: '', intro: '', items: () => [] },
)

const seen = ref<Set<number>>(new Set())
const tiles = ref<HTMLElement[]>([])
let observer: IntersectionObserver | null = null

/**
 * Entrance only: each tile is released once and then never touched again, so
 * the section stops costing anything the moment it has been read. The observer
 * disconnects itself when the last tile has arrived.
 */
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') {
    seen.value = new Set(tiles.value.map((_, index) => index))
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const index = tiles.value.indexOf(entry.target as HTMLElement)
        if (index < 0) continue
        seen.value = new Set([...seen.value, index])
        observer?.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  )

  for (const tile of tiles.value) observer.observe(tile)
})

onBeforeUnmount(() => observer?.disconnect())

function registerTile(element: unknown, index: number) {
  if (element instanceof HTMLElement) tiles.value[index] = element
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="max-w-2xl">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <!-- CSS columns, so the masonry is the browser's job rather than a
         measurement loop of ours. -->
    <ul class="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3">
      <li
        v-for="(item, index) in items"
        :ref="(element) => registerTile(element, index)"
        :key="`${item.caption}-${index}`"
        class="mb-5 break-inside-avoid transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none"
        :class="seen.has(index) ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'"
        :style="{ transitionDelay: `${(index % 3) * 80}ms` }"
      >
        <figure>
          <div class="overflow-hidden rounded-[calc(var(--site-radius)*1.5)] bg-[var(--site-surface-alt)]">
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.imageAlt"
              class="w-full object-cover"
              width="700"
              height="900"
              loading="lazy"
            />
            <div
              v-else
              class="aspect-[3/4] w-full bg-[radial-gradient(100%_80%_at_30%_20%,var(--site-primary)_0%,transparent_70%)] opacity-20"
              aria-hidden="true"
            />
          </div>
          <figcaption v-if="item.caption" class="mt-2.5 text-[0.875rem] text-[var(--site-text-muted)]">
            {{ item.caption }}
          </figcaption>
        </figure>
      </li>
    </ul>
  </div>
</template>
