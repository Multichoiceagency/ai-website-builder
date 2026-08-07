<script setup lang="ts">
withDefaults(
  defineProps<{
    heading?: string
    items?: { title: string; description: string }[]
    /** Heading rank, so the section fits the page outline where it is placed. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  { heading: '', items: () => [], headingLevel: 'h2' },
)

/** Pointer-follow highlight. Touch devices never fire this, so they get the plain card. */
function onPointerMove(event: PointerEvent) {
  const card = event.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
  card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <component
      v-if="heading"
      :is="headingLevel"
      class="mb-12 max-w-2xl text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
      :style="{ fontFamily: 'var(--site-font-heading)' }"
    >{{ heading }}</component>

    <ul class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="item in items"
        :key="item.title"
        class="group/card relative overflow-hidden rounded-[calc(var(--site-radius)*1.5)] border border-[var(--site-line)] bg-[var(--site-surface)] p-7 transition-transform duration-200 hover:-translate-y-1"
        @pointermove="onPointerMove"
      >
        <span
          class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
          style="background: radial-gradient(220px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in oklab, var(--site-primary) 14%, transparent), transparent 70%)"
          aria-hidden="true"
        />
        <div class="relative">
          <h3 class="text-[1.0625rem] font-semibold tracking-[-0.015em] text-[var(--site-text)]">{{ item.title }}</h3>
          <p class="mt-2 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">{{ item.description }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
