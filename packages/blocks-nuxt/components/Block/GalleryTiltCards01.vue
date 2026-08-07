<script setup lang="ts">
interface Card {
  title: string
  caption: string
  image: string
  imageAlt: string
  href: string
}

withDefaults(
  defineProps<{ heading?: string; intro?: string; items?: Card[] }>(),
  { heading: '', intro: '', items: () => [] },
)

/**
 * Tilt is a `rotate3d` written into two custom properties on pointer move, and
 * cleared on leave. Pointer events do not fire for touch scrolling, so a phone
 * gets a still, tidy grid rather than a card that lurches when you scroll past.
 */
function onPointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  const card = event.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width - 0.5
  const y = (event.clientY - rect.top) / rect.height - 0.5
  card.style.setProperty('--tilt-x', `${(-y * 9).toFixed(2)}deg`)
  card.style.setProperty('--tilt-y', `${(x * 9).toFixed(2)}deg`)
}

function onPointerLeave(event: PointerEvent) {
  const card = event.currentTarget as HTMLElement
  card.style.setProperty('--tilt-x', '0deg')
  card.style.setProperty('--tilt-y', '0deg')
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

    <ul class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" style="perspective: 1100px">
      <li
        v-for="item in items"
        :key="item.title"
        class="group/tilt transition-transform duration-300 ease-out motion-reduce:transition-none"
        style="transform: rotate3d(1, 0, 0, var(--tilt-x, 0deg)) rotate3d(0, 1, 0, var(--tilt-y, 0deg)); transform-style: preserve-3d"
        @pointermove="onPointerMove"
        @pointerleave="onPointerLeave"
      >
        <component :is="item.href ? 'a' : 'div'" :href="item.href || undefined" class="block no-underline">
          <div
            class="relative overflow-hidden rounded-[calc(var(--site-radius)*2)] bg-[var(--site-surface-alt)] shadow-[0_24px_60px_-40px_rgb(0_0_0/0.5)]"
          >
            <div class="aspect-[4/3]">
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

            <!-- Sheen: one translucent sweep that only appears on hover. -->
            <span
              class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
              style="background: linear-gradient(115deg, transparent 35%, rgb(255 255 255 / 0.18) 50%, transparent 65%)"
              aria-hidden="true"
            />
          </div>

          <div class="mt-4" style="transform: translateZ(28px)">
            <p class="text-[1.0625rem] font-semibold tracking-[-0.015em] text-[var(--site-text)]">{{ item.title }}</p>
            <p v-if="item.caption" class="mt-1 text-[0.875rem] text-[var(--site-text-muted)]">{{ item.caption }}</p>
          </div>
        </component>
      </li>
    </ul>
  </div>
</template>
